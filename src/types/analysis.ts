/**
 * @description Tipi TypeScript per il motore di analisi colore (Fase 1).
 * Questi tipi attraversano tutto il pipeline:
 * ImageData (tile canvas) → Worker K-means/K-M → TileAnalysis → WebGL renderer
 */

import type { HistoricalPigment } from './pigment'

// ─────────────────────────────────────────────────────────────────────────────
// INPUT DEL WORKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Configurazione per l'analisi di un tile.
 * Passata al Worker tramite comlink.
 */
export interface AnalysisConfig {
  /**
   * Numero di cluster K-means.
   * Ogni cluster → potenziale pigmento identificato.
   * Valori consigliati: 6 (opera monocromatica) — 12 (opera molto colorata).
   */
  numClusters: number

  /** Database pigmenti da usare per il matching */
  pigmentDatabase: HistoricalPigment[]

  /**
   * Metodo di analisi:
   * - 'kmeans-lab': K-means in CIELab + matching per Delta E (più veloce)
   * - 'kubelka-munk': ottimizzazione K-M completa (più accurato, più lento)
   */
  method: 'kmeans-lab' | 'kubelka-munk'

  /**
   * Anno dell'opera (opzionale).
   * HISTORY: se fornito, filtra il database pigmenti escludendo quelli
   * non ancora disponibili all'epoca — riduce i falsi positivi.
   */
  artworkDate?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT DEL WORKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Risultato dell'analisi di un singolo tile.
 * Prodotto dal Worker, consumato dal renderer WebGL e dal pannello pigmenti.
 */
export interface TileAnalysis {
  /** Pigmenti identificati nel tile, ordinati per copertura % decrescente */
  palette: PigmentMatch[]

  /**
   * Weight map per ogni pigmento identificato.
   * WORKER: un Float32Array per pigmento, dimensione = tileWidth × tileHeight
   * Indice: weightMaps[i] corrisponde a palette[i]
   * Ogni valore (0.0–1.0): quanto quel pigmento è presente in quel pixel.
   * Esempio: weightMaps[0][y * width + x] = 0.85 → pigmento 0 presente all'85% nel pixel (x,y)
   */
  weightMaps: Float32Array[]

  stats: {
    /** ID del pigmento con la maggior copertura nell'area analizzata */
    dominantPigment: string
    /** Mappa pigmentId → percentuale dell'area del tile (0-100) */
    coverage: Record<string, number>
    /** Dimensioni del tile analizzato */
    tileWidth: number
    tileHeight: number
  }
}

/**
 * @description Singolo pigmento identificato nel tile, con confidenza e statistiche.
 */
export interface PigmentMatch {
  /** Pigmento dal database */
  pigment: HistoricalPigment

  /**
   * Confidenza del match (0–1).
   * Calcolata da: 1 − (deltaE / soglia_max).
   * 1.0 = colore identico al pigmento di riferimento
   * 0.0 = colore molto distante
   */
  confidence: number

  /** Percentuale dell'area del tile coperta da questo pigmento (0–100) */
  coverage: number

  /**
   * COLOR: centroide del cluster in CIELab [L, a, b]
   * L: 0-100, a: -128..127, b: -128..127
   */
  clusterCenter: [number, number, number]

  /**
   * COLOR: Delta E CIE2000 tra il centroide del cluster e il colorLab del pigmento.
   * < 10 = match diretto; 10-25 = match possibile; > 25 = miscela
   */
  deltaE: number

  /** Se true, il pixel è meglio spiegato da una miscela di due pigmenti */
  isMixture: boolean

  /**
   * Componenti della miscela (solo se isMixture = true).
   * KM: le proporzioni sono stime basate su Mixbox, non parametri K-M reali
   * a meno che il metodo non sia 'kubelka-munk'.
   */
  mixtureComponents?: {
    pigment: HistoricalPigment
    /** Proporzione della miscela (0–1), la somma dei ratio ≈ 1 */
    ratio: number
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// API DEL WORKER (esposta tramite comlink)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Interfaccia pubblica del Web Worker di analisi colore.
 * WORKER: esposta tramite comlink — ogni metodo è chiamabile dal thread principale
 * come una normale funzione async, senza gestire manualmente postMessage/onmessage.
 *
 * @example
 * // Nel thread principale:
 * import { wrap } from 'comlink'
 * const worker = new Worker(new URL('../workers/colorAnalyzer.ts', import.meta.url))
 * const analyzer = wrap<ColorAnalyzerAPI>(worker)
 * const result = await analyzer.analyzeTile(imageData, config)
 */
export interface ColorAnalyzerAPI {
  /**
   * @description Analizza un tile dell'immagine e restituisce i pigmenti identificati.
   * @param imageData - Dati pixel del tile (da canvas.getContext('2d').getImageData())
   * @param config - Configurazione dell'analisi
   * @returns Analisi completa con palette, weight map e statistiche
   */
  analyzeTile(imageData: ImageData, config: AnalysisConfig): Promise<TileAnalysis>

  /**
   * @description Progresso dell'analisi corrente (0–100).
   * Aggiornato durante K-means e matching.
   */
  getProgress(): Promise<number>

  /** @description Interrompe l'analisi in corso */
  cancel(): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// CHIAVE CACHE TILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Genera la chiave univoca per la cache dei tile analizzati.
 * PERF: evita di rianalizzare tile già processati al pan/zoom.
 * @param tileX - Coordinata X del tile nella griglia
 * @param tileY - Coordinata Y del tile nella griglia
 * @param zoomLevel - Livello di zoom corrente
 */
export function tileKey(tileX: number, tileY: number, zoomLevel: number): string {
  return `${tileX}_${tileY}_${zoomLevel}`
}
