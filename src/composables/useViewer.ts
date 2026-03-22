/**
 * @description Composable Vue per il controllo del viewer OpenSeadragon.
 * Inizializza OSD in modo dinamico (browser-only, no SSR) nel containerRef,
 * espone metodi per navigare, leggere e catturare il viewport corrente.
 *
 * Adattato da React useViewer hook per Vue 3 / Nuxt 4.
 * Differenze chiave rispetto alla versione React:
 * - useRef → ref() per il container, variabili plain per OSD (non reattivo — cambierebbe troppo)
 * - useEffect → onMounted + onUnmounted + watch per il cambio di sorgente IIIF
 * - useCallback → funzioni normali (Vue non ha re-render per funzione)
 * - 'use client' → non necessario: Nuxt gestisce SSR con import.meta.client
 *
 * @example
 * // In un componente Vue:
 * const { containerRef, isReady, goToViewport } = useViewer(iiifInfoUrl)
 * // <div ref="containerRef" class="viewer-container" />
 *
 * @see src/components/GigapixelViewer.vue
 */

import { ref, watch, onMounted, onUnmounted, toValue, type MaybeRef } from 'vue'
import type OpenSeadragon from 'openseadragon'

// ─────────────────────────────────────────────────────────────────────────────
// TIPI
// ─────────────────────────────────────────────────────────────────────────────

/** Coordinate del viewport nel sistema OSD (larghezza immagine = 1.0) */
export interface ViewerRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * IIIF: tipo di transizione per la navigazione tra waypoint.
 * - 'ease': animazione spring OSD (default, naturale)
 * - 'linear': immediato, senza animazione
 * - 'zoom': forza il percorso a 2 step (zoom out → zoom in)
 */
export type ViewerTransition = 'ease' | 'linear' | 'zoom'

export interface UseViewerReturn {
  /** Ref da assegnare al div container del viewer — `<div ref="containerRef">` */
  containerRef: ReturnType<typeof ref<HTMLDivElement | null>>
  /** True dopo che OSD ha caricato e reso l'immagine */
  isReady: ReturnType<typeof ref<boolean>>
  /** Naviga al rettangolo specificato con animazione OSD */
  goToViewport: (rect: ViewerRect, duration?: number, transition?: ViewerTransition) => void
  /** Restituisce il viewport corrente in coordinate OSD */
  getCurrentViewport: () => ViewerRect | null
  /** Cattura il canvas OSD come JPEG base64 (per thumbnail waypoint) */
  captureViewport: () => string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Inizializza e controlla un'istanza OpenSeadragon.
 *
 * L'import di OSD è dinamico (no SSR — OSD richiede window/document).
 * Il `containerRef` restituito deve essere assegnato al div container nel template.
 *
 * La navigazione supporta transizioni a due step se il rapporto di zoom
 * tra posizione corrente e destinazione supera 3x (evita disorientamento).
 *
 * @param iiifInfoUrl URL del file info.json IIIF (es. "https://www.rijksmuseum.nl/.../info.json")
 *                    Può essere una stringa plain o un Ref<string> — reagisce ai cambiamenti.
 *
 * @example
 * const { containerRef, isReady, goToViewport } = useViewer(
 *   'https://www.rijksmuseum.nl/iiif/SK-C-5/info.json' // La Ronda di Notte
 * )
 */
export function useViewer(iiifInfoUrl: MaybeRef<string>): UseViewerReturn {
  // IIIF: containerRef è reattivo — Vue lo lega al DOM tramite v-bind o ref="containerRef"
  const containerRef = ref<HTMLDivElement | null>(null)
  const isReady = ref(false)

  // IIIF: viewer e modulo OSD NON sono reattivi (ref plain, non Vue ref).
  // OSD gestisce il proprio stato interno — passarlo a Vue causerebbe proxy
  // e problemi con le classi OSD che non sono serializzabili.
  let viewer: OpenSeadragon.Viewer | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OSD: any = null

  // ─────────────────────────────────────────────────────────────────────────
  // INIZIALIZZAZIONE
  // ─────────────────────────────────────────────────────────────────────────

  async function initViewer(url: string): Promise<void> {
    // IIIF: OSD richiede window — non eseguire in SSR (Nuxt server-side)
    if (!import.meta.client || !containerRef.value) return

    // Distruggi eventuale istanza precedente prima di crearne una nuova
    destroyViewer()

    // IIIF: import dinamico — OSD non ha export ESM pulito, gestiamo entrambi i casi
    const mod = await import('openseadragon')
    OSD = (mod.default ?? mod) as typeof OpenSeadragon

    viewer = new OSD.Viewer({
      element: containerRef.value,
      tileSources: url,

      // IIIF: cross-origin necessario per Rijksmuseum, Wellcome, AIC, IIIF pubblici
      crossOriginPolicy: 'Anonymous',

      // UX: nessun controllo nativo — gestiamo navigazione programmatica
      showNavigationControl: false,
      showZoomControl: false,
      showHomeControl: false,
      showFullPageControl: false,
      showRotationControl: false,
      showSequenceControl: false,

      // PERF: molla morbida (6.5 vs default 12) — animazioni fluide senza rimbalzo
      springStiffness: 6.5,

      // PERF: 0.5s è reattivo senza essere brusco
      // blendTime ammorbidisce il fade-in dei tile al caricamento
      animationTime: 0.5,
      blendTime: 0.15,

      // UX: visibilityRatio basso = libertà totale di pan fino ai bordi dell'immagine
      visibilityRatio: 0.3,
      minZoomImageRatio: 0.5,
      maxZoomPixelRatio: 4,

      // UX: doppio click/tap per zoom; flick su touch per pan con inerzia
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      gestureSettingsTouch: { pinchRotate: false, flickEnabled: true, dblClickToZoom: true },
    })

    viewer.addHandler('open', () => {
      isReady.value = true
    })

    // UX: segnala errore di caricamento senza crash — mostreremo un feedback all'utente
    viewer.addHandler('open-failed', () => {
      console.error('[useViewer] Fallito il caricamento della sorgente IIIF:', url)
    })
  }

  function destroyViewer(): void {
    viewer?.destroy()
    viewer = null
    OSD = null
    isReady.value = false
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  // IIIF: onMounted garantisce che il containerRef sia nel DOM prima di inizializzare OSD
  onMounted(() => {
    initViewer(toValue(iiifInfoUrl))
  })

  onUnmounted(() => {
    destroyViewer()
  })

  // IIIF: reagisce al cambio di sorgente (es. utente sceglie un'opera diversa)
  watch(
    () => toValue(iiifInfoUrl),
    (newUrl) => {
      if (newUrl) initViewer(newUrl)
    },
  )

  // PERF: ResizeObserver — OSD risponde ai cambi dimensione del container
  // (es. toggle fullscreen, resize sidebar) senza gestire eventi window.resize
  onMounted(() => {
    if (!containerRef.value) return
    const resizeObserver = new ResizeObserver(() => {
      viewer?.forceRedraw()
    })
    resizeObserver.observe(containerRef.value)
    onUnmounted(() => resizeObserver.disconnect())
  })

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGAZIONE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @description Naviga al rettangolo specificato con animazione OSD.
   *
   * UX: supporta transizioni a due step se il rapporto di zoom tra posizione
   * corrente e destinazione supera 3x. Evita il disorientamento quando la distanza
   * o il cambio di scala è estremo (es. da overview a dettaglio minuto).
   *
   * @param rect - Rettangolo destinazione in coordinate OSD (image width = 1.0)
   * @param duration - Durata transizione in secondi (default 1.2s)
   * @param transition - Tipo di transizione (default 'ease')
   */
  function goToViewport(
    rect: ViewerRect,
    duration = 1.2,
    transition: ViewerTransition = 'ease',
  ): void {
    if (!viewer || !OSD) return

    // IIIF: le coordinate del waypoint sono già in sistema viewport OSD
    const target = new OSD.Rect(rect.x, rect.y, rect.width, rect.height)

    const currentZoom = viewer.viewport.getZoom(true)
    const currentBounds = viewer.viewport.getBounds(true)

    // UX: calcola zoom approssimativo della destinazione per decidere la strategia
    const viewportWidth = viewer.viewport.getBounds(true).width
    const targetZoom = viewportWidth / rect.width
    const zoomRatio =
      Math.max(currentZoom, targetZoom) / Math.min(currentZoom, targetZoom || 0.001)

    if (zoomRatio > 3 && transition !== 'linear') {
      // UX: transizione a 2 step — zoom out sull'unione dei due rect, poi zoom in sul target.
      // L'utente "capisce" dove sta andando vedendo prima il contesto, poi il dettaglio.
      const unionRect = new OSD.Rect(
        Math.min(currentBounds.x, rect.x),
        Math.min(currentBounds.y, rect.y),
        Math.max(currentBounds.x + currentBounds.width, rect.x + rect.width) -
          Math.min(currentBounds.x, rect.x),
        Math.max(currentBounds.y + currentBounds.height, rect.y + rect.height) -
          Math.min(currentBounds.y, rect.y),
      )
      viewer.viewport.fitBoundsWithConstraints(unionRect)

      // PERF: step 1 deve finire prima che OSD completi l'animazione (animationTime 0.5s)
      // minimo 650ms per lasciare la molla stabilizzarsi + buffer
      const step1Ms = Math.max(650, Math.min(duration * 0.5 * 1000, 900))
      setTimeout(() => {
        viewer?.viewport.fitBoundsWithConstraints(target)
      }, step1Ms)
    } else {
      // UX: 'linear' = immediato (secondo parametro true = no animazione)
      viewer.viewport.fitBoundsWithConstraints(target, transition === 'linear')
    }
  }

  /**
   * @description Restituisce il viewport corrente in coordinate OSD.
   * @returns ViewerRect o null se il viewer non è inizializzato
   */
  function getCurrentViewport(): ViewerRect | null {
    if (!viewer) return null
    const bounds = viewer.viewport.getBounds(true)
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  }

  /**
   * @description Cattura il canvas OSD come stringa base64 JPEG.
   * Usata per generare thumbnail dei waypoint.
   *
   * IIIF: OSD renderizza su canvas — JPEG 0.7 riduce da ~400KB a ~40KB vs PNG.
   * @returns stringa base64 "data:image/jpeg;base64,..." o null se non disponibile
   */
  function captureViewport(): string | null {
    if (!viewer) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = (viewer.drawer as any).canvas as HTMLCanvasElement | undefined
      return canvas?.toDataURL('image/jpeg', 0.7) ?? null
    } catch {
      return null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    containerRef,
    isReady,
    goToViewport,
    getCurrentViewport,
    captureViewport,
  }
}
