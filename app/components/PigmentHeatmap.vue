<template>
  <!--
    SHADER: canvas WebGL2 per il rendering delle heatmap pigmenti.
    Posizionato absolute per coprire l'intera area del viewer OSD.
    pointer-events: none ereditato dallo slot #overlay di GigapixelViewer —
    l'utente può continuare a navigare l'opera senza che il canvas blocchi gli eventi.
  -->
  <canvas ref="canvasRef" class="pigment-heatmap" />
</template>

<script setup lang="ts">
/**
 * @description Componente WebGL2 per la visualizzazione delle weight map pigmento.
 *
 * Ogni pigmento identificato dall'analisi ha una Float32Array (weight map)
 * che indica, pixel per pixel, quanto quel pigmento è presente.
 * Questo componente rende ognuna di queste mappe come un layer colorato semitrasparente,
 * sovrapposto all'immagine gigapixel nel viewer OSD.
 *
 * Pipeline WebGL:
 *   1. Upload delle weight map come texture R32F (un canale float per pixel)
 *   2. Per ogni pigmento visibile: draw call con colore pigmento + alpha = peso
 *   3. Alpha blending accumulativo tra i layer
 *
 * SHADER: usa src/shaders/heatmap.vert e src/shaders/heatmap.frag
 * @see src/shaders/heatmap.vert — vertex shader (quad full-screen)
 * @see src/shaders/heatmap.frag — fragment shader (campionamento weight map)
 */

import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { PigmentMatch } from '#src/types/analysis'

// SHADER: sorgenti GLSL importati come stringa raw tramite Vite (?raw).
// Vite riconosce questo pattern a compile time e bundla i file GLSL come string.
import VERT_SRC from '#src/shaders/heatmap.vert?raw'
import FRAG_SRC from '#src/shaders/heatmap.frag?raw'

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  /**
   * Weight map per ogni pigmento nella palette.
   * Indice i corrisponde a palette[i].
   * WORKER: prodotte da computeWeightMaps() in src/utils/colorMath.ts
   */
  weightMaps: Float32Array[]

  /** Palette pigmenti identificati — usata per colorRGB e id */
  palette: PigmentMatch[]

  /**
   * ID dei pigmenti visibili (subset di palette[].pigment.id).
   * Rimpiazzato interamente ad ogni toggle per triggerare la reattività Vue.
   */
  visiblePigmentIds: string[]

  /** Opacità globale dell'overlay (0–1). Default 0.7. */
  opacity?: number

  /**
   * Dimensioni del tile analizzato (dimensioni delle weight map in pixel).
   * COLOR: default 512×512 — valore usato in index.vue per jpegToImageData.
   */
  tileWidth?: number
  tileHeight?: number
}>(), {
  opacity: 0.7,
  tileWidth: 512,
  tileHeight: 512,
})

// ─────────────────────────────────────────────────────────────────────────────
// REFS E STATO WebGL (non-reactive — gestito manualmente, non osservato da Vue)
// ─────────────────────────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)

// SHADER: stato WebGL — non reattivo per evitare overhead di Vue su oggetti GPU
let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let quadVao: WebGLVertexArrayObject | null = null
let quadBuffer: WebGLBuffer | null = null

// Uniform locations (cachati dopo la compilazione)
let uWeightMap: WebGLUniformLocation | null = null
let uColor: WebGLUniformLocation | null = null
let uOpacity: WebGLUniformLocation | null = null
let uThreshold: WebGLUniformLocation | null = null

// Texture per ogni pigmento (una R32F texture per weight map)
// PERF: le texture vengono riusate se il tile non è cambiato
let textures: (WebGLTexture | null)[] = []

// ResizeObserver: sincronizza canvas.width/height con le dimensioni CSS
let resizeObserver: ResizeObserver | null = null

// ─────────────────────────────────────────────────────────────────────────────
// COMPILAZIONE SHADER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Compila un singolo shader GLSL.
 * @param type - gl.VERTEX_SHADER o gl.FRAGMENT_SHADER
 * @param src  - Sorgente GLSL come stringa
 */
function compileShader(type: GLenum, src: string): WebGLShader | null {
  if (!gl) return null
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, src)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // SHADER: errore di compilazione — logga il messaggio GLSL per il debug
    console.error('[PigmentHeatmap] Errore compilazione shader:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * @description Inizializza il contesto WebGL2, compila gli shader,
 * crea il quad full-screen e ottiene le uniform locations.
 *
 * SHADER: il programma viene compilato una sola volta al mount.
 * Le texture vengono ricaricate ad ogni nuova analisi (watch su weightMaps).
 *
 * @returns true se l'inizializzazione è riuscita
 */
function initWebGL(): boolean {
  const canvas = canvasRef.value
  if (!canvas) return false

  // SHADER: WebGL2 richiesto per texture R32F (float singolo per canale)
  gl = canvas.getContext('webgl2', {
    alpha: true,          // canvas trasparente — l'opera OSD è visibile sotto
    premultipliedAlpha: false,
    antialias: false,     // PERF: non necessario per heatmap
    preserveDrawingBuffer: false,
  }) as WebGL2RenderingContext | null

  if (!gl) {
    console.warn('[PigmentHeatmap] WebGL2 non disponibile — heatmap disabilitata')
    return false
  }

  // Compila shader
  const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC)
  const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vert || !frag) return false

  // Linka il programma
  program = gl.createProgram()
  if (!program) return false
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[PigmentHeatmap] Errore link programma:', gl.getProgramInfoLog(program))
    return false
  }

  // Libera gli shader compilati (non servono più dopo il link)
  gl.deleteShader(vert)
  gl.deleteShader(frag)

  // ── Quad full-screen ────────────────────────────────────────────────────
  // SHADER: 6 vertici in NDC formano 2 triangoli che coprono l'intero canvas.
  // Ogni vertice: [x, y] in [-1,1] × [-1,1].
  // Triangolo 1: bottom-left, bottom-right, top-left
  // Triangolo 2: top-left, bottom-right, top-right
  const quadVerts = new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1,
  ])

  quadVao = gl.createVertexArray()
  gl.bindVertexArray(quadVao)

  quadBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW)

  const aPos = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(null)

  // ── Uniform locations ───────────────────────────────────────────────────
  gl.useProgram(program)
  uWeightMap = gl.getUniformLocation(program, 'u_weightMap')
  uColor     = gl.getUniformLocation(program, 'u_color')
  uOpacity   = gl.getUniformLocation(program, 'u_opacity')
  uThreshold = gl.getUniformLocation(program, 'u_threshold')

  // SHADER: alpha blending standard (SRC_ALPHA over DST)
  // Ogni pigmento layer si accumula sul precedente con il suo alpha.
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTURE UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Carica le weight map come texture R32F su GPU.
 * Chiamata ogni volta che arriva una nuova analisi (watch su weightMaps).
 *
 * SHADER: R32F = texture con un canale float a 32 bit per texel.
 * Ogni texel contiene il peso del pigmento per quel pixel (0.0–1.0).
 * WebGL2 supporta R32F natively — non richiede estensioni.
 */
function uploadTextures(): void {
  if (!gl) return

  // Libera le texture precedenti
  for (const t of textures) {
    if (t) gl.deleteTexture(t)
  }
  textures = []

  for (let i = 0; i < props.weightMaps.length; i++) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)

    // SHADER: gl.R32F = formato interno float a singolo canale
    // gl.RED = formato esterno (un solo canale)
    // gl.FLOAT = tipo dati (corrisponde a Float32Array)
    gl.texImage2D(
      gl.TEXTURE_2D, 0,
      gl.R32F,
      props.tileWidth, props.tileHeight, 0,
      gl.RED, gl.FLOAT,
      props.weightMaps[i],
    )

    // PERF: LINEAR per upscaling bilineare — l'heatmap appare smooth anche su schermi grandi
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    // Clamp: evita artefatti ai bordi del tile
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    textures.push(tex)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Renderizza tutti i pigmenti visibili come layer WebGL sovrapposti.
 * Una draw call per pigmento — ogni call campiona la texture e disegna il quad.
 *
 * SHADER: l'ordine di rendering segue l'ordine della palette (copertura decrescente).
 * Il pigmento con copertura maggiore viene renderizzato per primo (sotto).
 */
function render(): void {
  if (!gl || !program || !quadVao) return

  const canvas = canvasRef.value
  if (!canvas) return

  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)
  gl.bindVertexArray(quadVao)

  for (let i = 0; i < props.palette.length; i++) {
    const match = props.palette[i]

    // UX: skip pigmenti nascosti dall'utente nel pannello
    if (!props.visiblePigmentIds.includes(match.pigment.id)) continue
    if (!textures[i]) continue

    // Bind texture unit 0 per questa draw call
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, textures[i])
    gl.uniform1i(uWeightMap, 0)

    // COLOR: colore pigmento normalizzato da [0-255] a [0,1]
    const [r, g, b] = match.pigment.colorRGB
    gl.uniform3f(uColor, r / 255, g / 255, b / 255)

    gl.uniform1f(uOpacity, props.opacity)
    // DISCLAIMER: soglia 0.15 — scarta pixel con peso basso per ridurre rumore
    // Abbassarla mostra più dettaglio ma aumenta il rumore visivo
    gl.uniform1f(uThreshold, 0.15)

    // SHADER: 6 vertici = 2 triangoli = quad full-screen
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  gl.bindVertexArray(null)
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!initWebGL()) return

  // ResizeObserver: sincronizza i pixel del canvas con le dimensioni CSS del container.
  // PERF: necessario per rendering nitido su schermi HiDPI (devicePixelRatio > 1).
  resizeObserver = new ResizeObserver(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const newW = Math.round(canvas.clientWidth * dpr)
    const newH = Math.round(canvas.clientHeight * dpr)
    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width = newW
      canvas.height = newH
      if (textures.length > 0) render()
    }
  })
  if (canvasRef.value) resizeObserver.observe(canvasRef.value)

  // Carica le texture iniziali se già disponibili
  if (props.weightMaps.length > 0) {
    uploadTextures()
    render()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (gl) {
    for (const t of textures) { if (t) gl.deleteTexture(t) }
    if (quadBuffer) gl.deleteBuffer(quadBuffer)
    if (quadVao) gl.deleteVertexArray(quadVao)
    if (program) gl.deleteProgram(program)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// WATCHERS
// ─────────────────────────────────────────────────────────────────────────────

// Re-upload texture quando arriva una nuova analisi
watch(() => props.weightMaps, () => {
  if (!gl || props.weightMaps.length === 0) return
  uploadTextures()
  render()
})

// Re-render quando cambia visibilità pigmenti o opacità
watch([() => props.visiblePigmentIds, () => props.opacity], () => {
  if (textures.length > 0) render()
})
</script>

<style scoped>
/* SHADER: il canvas copre tutta l'area del viewer — pointer-events: none
   permette agli eventi mouse/touch di passare attraverso al viewer OSD */
.pigment-heatmap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
