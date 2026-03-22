/**
 * @description Composable Vue per l'analisi colore dei tile gigapixel.
 *
 * WORKER: questo composable è il ponte tra il thread principale (Vue/Nuxt)
 * e il Web Worker di analisi (src/workers/colorAnalyzer.ts).
 * Usa comlink per chiamare le funzioni del worker come normali funzioni async.
 *
 * Gestisce:
 * - Istanziazione e distruzione del Worker (lifecycle Vue)
 * - Cache dei tile già analizzati (evita di rianalizzare al pan/zoom)
 * - Stato reattivo: progresso analisi, risultati, errori
 * - Cancellazione dell'analisi in corso
 *
 * @example
 * const { analyzeTile, tileCache, isAnalyzing, progress } = useColorAnalyzer()
 *
 * // Analizza un tile dal canvas OSD
 * const imageData = canvas.getContext('2d').getImageData(0, 0, 512, 512)
 * const result = await analyzeTile(imageData, {
 *   numClusters: 8,
 *   pigmentDatabase: pigments,
 *   method: 'kmeans-lab',
 *   artworkDate: 1642,  // HISTORY: La Ronda di Notte, 1642
 * })
 */

import { ref, shallowRef, onUnmounted } from 'vue'
import { wrap, type Remote } from 'comlink'
import type { ColorAnalyzerAPI, AnalysisConfig, TileAnalysis } from '~/src/types/analysis'
import { tileKey } from '~/src/types/analysis'

// ─────────────────────────────────────────────────────────────────────────────
// TIPI
// ─────────────────────────────────────────────────────────────────────────────

export interface UseColorAnalyzerReturn {
  /**
   * Analizza un tile e restituisce i pigmenti identificati.
   * PERF: controlla prima la cache — se il tile è già stato analizzato, restituisce
   * il risultato salvato senza avviare il worker.
   *
   * @param imageData - Pixel del tile (da canvas.getContext('2d').getImageData())
   * @param config - Configurazione analisi (cluster, database, metodo, anno opera)
   * @param cacheKey - Chiave cache del tile (usa tileKey(x, y, zoom) da types/analysis)
   * @returns TileAnalysis con palette, weight map e statistiche
   */
  analyzeTile: (
    imageData: ImageData,
    config: AnalysisConfig,
    cacheKey?: string,
  ) => Promise<TileAnalysis | null>

  /** Cancella l'analisi in corso (se presente) */
  cancelAnalysis: () => Promise<void>

  /**
   * Cache dei tile analizzati.
   * PERF: Map<tileKey, TileAnalysis> — evita di rianalizzare tile già processati.
   * Usata dal GigapixelViewer per il rendering overlay WebGL.
   */
  tileCache: ReturnType<typeof shallowRef<Map<string, TileAnalysis>>>

  /** True mentre il worker sta analizzando un tile */
  isAnalyzing: ReturnType<typeof ref<boolean>>

  /** Progresso dell'analisi corrente (0–100) */
  progress: ReturnType<typeof ref<number>>

  /** Errore dell'ultima analisi (null se nessun errore) */
  error: ReturnType<typeof ref<string | null>>

  /** Svuota la cache dei tile (utile quando cambia l'opera o la configurazione) */
  clearCache: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────

export function useColorAnalyzer(): UseColorAnalyzerReturn {
  // WORKER: stato reattivo esposto al template
  const isAnalyzing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  // PERF: shallowRef perché la Map non deve essere deeply reactive
  // (i TileAnalysis contengono Float32Array enormi — non vogliamo che Vue li osservi)
  const tileCache = shallowRef(new Map<string, TileAnalysis>())

  // WORKER: istanza del worker e wrapper comlink
  // Non reattivi — non devono essere osservati da Vue
  let worker: Worker | null = null
  let analyzer: Remote<ColorAnalyzerAPI> | null = null

  // WORKER: polling del progresso durante l'analisi
  let progressInterval: ReturnType<typeof setInterval> | null = null

  // ─────────────────────────────────────────────────────────────────────────
  // INIZIALIZZAZIONE LAZY DEL WORKER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @description Inizializza il Worker la prima volta che viene richiesta un'analisi.
   * WORKER: lazy init — il Worker non viene creato finché non serve,
   * per non sprecare memoria su pagine che non usano l'analisi colore.
   */
  function ensureWorker(): Remote<ColorAnalyzerAPI> {
    if (analyzer) return analyzer

    // WORKER: new URL + import.meta.url è il pattern Vite per i Web Worker TypeScript.
    // Vite lo riconosce a compile time e crea un bundle separato per il worker.
    worker = new Worker(
      new URL('../../src/workers/colorAnalyzer.ts', import.meta.url),
      { type: 'module' },
    )

    // WORKER: wrap() di comlink trasforma il worker in un oggetto con metodi async.
    // Invece di: worker.postMessage({ type: 'analyze', data: ... })
    // Scriviamo: await analyzer.analyzeTile(imageData, config)
    analyzer = wrap<ColorAnalyzerAPI>(worker)

    return analyzer
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POLLING PROGRESSO
  // ─────────────────────────────────────────────────────────────────────────

  function startProgressPolling(): void {
    progressInterval = setInterval(async () => {
      if (!analyzer) return
      try {
        progress.value = await analyzer.getProgress()
      } catch {
        // WORKER: il worker potrebbe essere stato distrutto durante il polling
        stopProgressPolling()
      }
    }, 150) // PERF: ogni 150ms è abbastanza fluido per una progress bar
  }

  function stopProgressPolling(): void {
    if (progressInterval !== null) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANALISI TILE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @description Analizza un tile, con controllo cache e gestione errori.
   */
  async function analyzeTile(
    imageData: ImageData,
    config: AnalysisConfig,
    cacheKey?: string,
  ): Promise<TileAnalysis | null> {
    // PERF: controlla la cache prima di avviare il worker
    if (cacheKey) {
      const cached = tileCache.value.get(cacheKey)
      if (cached) return cached
    }

    // IIIF: il worker richiede window — non eseguire in SSR
    if (!import.meta.client) return null

    error.value = null
    isAnalyzing.value = true
    progress.value = 0

    const a = ensureWorker()
    startProgressPolling()

    try {
      // WORKER: comlink serializza ImageData e AnalysisConfig tramite structured clone.
      // Float32Array nelle weight map vengono trasferiti per riferimento (Transferable)
      // — nessuna copia, zero overhead per i dati grandi.
      const result = await a.analyzeTile(imageData, config)

      // PERF: salva in cache per il tile corrente
      if (cacheKey) {
        tileCache.value.set(cacheKey, result)
        // Trigger reattività per shallowRef (la Map è mutata in-place)
        tileCache.value = tileCache.value
      }

      progress.value = 100
      return result
    } catch (err) {
      // DISCLAIMER: errore nel worker — segnala ma non crasha l'app
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto nel worker'
      error.value = `Analisi fallita: ${msg}`
      console.error('[useColorAnalyzer]', msg)
      return null
    } finally {
      stopProgressPolling()
      isAnalyzing.value = false
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CANCELLAZIONE
  // ─────────────────────────────────────────────────────────────────────────

  async function cancelAnalysis(): Promise<void> {
    if (!analyzer) return
    try {
      await analyzer.cancel()
    } catch {
      // ignora — il worker potrebbe già essere terminato
    } finally {
      stopProgressPolling()
      isAnalyzing.value = false
      progress.value = 0
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CACHE
  // ─────────────────────────────────────────────────────────────────────────

  function clearCache(): void {
    tileCache.value = new Map()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  onUnmounted(() => {
    stopProgressPolling()
    // WORKER: terminate() libera il thread del worker
    worker?.terminate()
    worker = null
    analyzer = null
  })

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    analyzeTile,
    cancelAnalysis,
    tileCache,
    isAnalyzing,
    progress,
    error,
    clearCache,
  }
}
