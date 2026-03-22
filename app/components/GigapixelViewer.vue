<template>
  <!--
    UX: il container occupa tutto lo spazio disponibile del padre.
    Il padre deve avere height esplicita (es. h-screen o h-[600px]) —
    OSD non può calcolare l'altezza se il container è 0px.
  -->
  <div class="gigapixel-viewer">

    <!-- Stato: caricamento -->
    <div v-if="!isReady" class="gigapixel-viewer__loading" aria-live="polite">
      <slot name="loading">
        <div class="gigapixel-viewer__spinner" role="status">
          <span class="sr-only">Caricamento immagine in corso…</span>
        </div>
      </slot>
    </div>

    <!-- Container OSD — sempre presente nel DOM, OSD si inizializza qui -->
    <!--
      IIIF: il div deve essere nel DOM prima di onMounted (Nuxt lo garantisce).
      class="osd-container" è necessaria per nascondere i controlli OSD nativi
      tramite CSS (li abbiamo disabilitati ma OSD aggiunge comunque alcuni elementi).
    -->
    <div
      ref="containerRef"
      class="gigapixel-viewer__osd"
      :class="{ 'gigapixel-viewer__osd--ready': isReady }"
      aria-label="Viewer immagine gigapixel"
      role="img"
    />

    <!-- Overlay slot: heatmap WebGL, lente cromatica, annotazioni — Fase 2 -->
    <!-- UX: l'overlay è pointer-events: none di default per non bloccare OSD -->
    <div
      v-if="isReady"
      class="gigapixel-viewer__overlay"
      aria-hidden="true"
    >
      <slot name="overlay" :viewport="currentViewport" />
    </div>

    <!-- Controlli navigazione custom — slot per flessibilità -->
    <div v-if="isReady" class="gigapixel-viewer__controls">
      <slot name="controls" :go-to-viewport="goToViewport" :capture="captureViewport" />
    </div>

  </div>
</template>

<script setup lang="ts">
/**
 * @description Componente wrapper per il viewer OpenSeadragon gigapixel.
 *
 * Gestisce:
 * - Inizializzazione OSD tramite composable useViewer
 * - Slot per overlay WebGL (heatmap pigmenti — Fase 2)
 * - Slot per controlli navigazione custom
 * - Aggiornamento periodico del viewport corrente (per overlay e lente cromatica)
 *
 * @example
 * <GigapixelViewer
 *   iiif-info-url="https://www.rijksmuseum.nl/iiif/SK-C-5/info.json"
 *   @ready="onViewerReady"
 * >
 *   <template #overlay="{ viewport }">
 *     <PigmentOverlay :viewport="viewport" />
 *   </template>
 * </GigapixelViewer>
 */

import { ref, watch, onUnmounted } from 'vue'
import type { ViewerRect } from '../composables/useViewer'

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

const props = defineProps<{
  /**
   * URL del file info.json IIIF dell'opera.
   * Esempio Rijksmuseum: "https://www.rijksmuseum.nl/iiif/SK-C-5/info.json"
   * Cambiare questo prop ricarica il viewer con la nuova opera.
   */
  iiifInfoUrl: string
}>()

// ─────────────────────────────────────────────────────────────────────────────
// EMITS
// ─────────────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Emesso quando OSD ha caricato l'immagine ed è pronto per la navigazione */
  ready: []
  /** Emesso ad ogni cambiamento del viewport (zoom, pan) — usato dall'overlay */
  viewportChange: [rect: ViewerRect]
}>()

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────

// IIIF: useViewer è auto-importato da Nuxt (app/composables/)
const {
  containerRef,
  isReady,
  goToViewport,
  getCurrentViewport,
  captureViewport,
} = useViewer(() => props.iiifInfoUrl)

// ─────────────────────────────────────────────────────────────────────────────
// VIEWPORT TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Viewport corrente — aggiornato a ogni frame quando il viewer è attivo.
 * Passato allo slot #overlay per posizionare l'heatmap WebGL (Fase 2).
 */
const currentViewport = ref<ViewerRect | null>(null)

// PERF: polling con requestAnimationFrame invece di listener OSD viewport-change
// per evitare troppi eventi durante il pan/zoom fluido (OSD emette ~60 eventi/s)
let rafId: number | null = null

function startViewportTracking(): void {
  function tick(): void {
    const vp = getCurrentViewport()
    if (vp) {
      // Emetti solo se il viewport è effettivamente cambiato (evita re-render inutili)
      const prev = currentViewport.value
      if (
        !prev ||
        prev.x !== vp.x ||
        prev.y !== vp.y ||
        prev.width !== vp.width ||
        prev.height !== vp.height
      ) {
        currentViewport.value = vp
        emit('viewportChange', vp)
      }
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopViewportTracking(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// Avvia il tracking quando il viewer è pronto, ferma quando viene distrutto
watch(isReady, (ready) => {
  if (ready) {
    startViewportTracking()
    emit('ready')
  } else {
    stopViewportTracking()
  }
})

onUnmounted(stopViewportTracking)

// ─────────────────────────────────────────────────────────────────────────────
// EXPOSE — metodi chiamabili dal padre con templateRef
// ─────────────────────────────────────────────────────────────────────────────

defineExpose({
  goToViewport,
  getCurrentViewport,
  captureViewport,
})
</script>

<style scoped>
.gigapixel-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
}

/* OSD container — occupa tutto il padre */
.gigapixel-viewer__osd {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* UX: fade-in del viewer quando è pronto (evita flash di bianco durante il caricamento) */
.gigapixel-viewer__osd--ready {
  opacity: 1;
}

/* Overlay slot: pointer-events none per non bloccare OSD */
.gigapixel-viewer__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Controlli custom: sopra tutto, con pointer-events */
.gigapixel-viewer__controls {
  position: absolute;
  inset: 0;
  pointer-events: none; /* i figli abilitano pointer-events dove necessario */
}

/* Loading state: centrato nel viewer */
.gigapixel-viewer__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Spinner di default — sostituibile tramite slot #loading */
.gigapixel-viewer__spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Accessibilità: nasconde testo visivamente ma lascia disponibile per screen reader */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* UX: rimuove eventuali controlli OSD nativi rimasti nel DOM */
:deep(.openseadragon-container) {
  outline: none;
}
</style>
