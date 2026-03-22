/**
 * @description Web Worker per l'analisi colore dei tile gigapixel.
 *
 * WORKER: questo file gira in un thread separato dal browser.
 * Non ha accesso al DOM, alle variabili globali del thread principale,
 * o a qualsiasi stato Vue/Nuxt.
 *
 * Comunica con il thread principale tramite comlink (astrae postMessage/onmessage).
 * Il thread principale chiama analyzeTile() come se fosse una normale funzione async.
 *
 * Pipeline di analisi:
 *   1. ImageData → array di pixel in CIELab
 *   2. K-means clustering in Lab → K centroidi (colori dominanti)
 *   3. Match centroidi → pigmenti del database (Delta E CIE2000)
 *   4. Soft assignment → weight map Float32Array per ogni pigmento
 *   5. Restituisce TileAnalysis al thread principale
 *
 * @see src/utils/colorMath.ts — funzioni matematiche usate qui
 * @see src/types/analysis.ts — tipi di input/output
 */

import { expose } from 'comlink'
import {
  extractPixelsAsLab,
  kmeansLab,
  computeWeightMaps,
  deltaE2000,
  rgbToLab,
} from '../utils/colorMath'
import type { Lab } from '../utils/colorMath'
import type {
  ColorAnalyzerAPI,
  AnalysisConfig,
  TileAnalysis,
  PigmentMatch,
} from '../types/analysis'
import type { HistoricalPigment } from '../types/pigment'

// ─────────────────────────────────────────────────────────────────────────────
// STATO INTERNO DEL WORKER
// ─────────────────────────────────────────────────────────────────────────────

// WORKER: stato condiviso tra le chiamate (il Worker è un singleton per tab)
let _progress = 0
let _cancelled = false

// ─────────────────────────────────────────────────────────────────────────────
// SOGLIE DI MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * COLOR: soglie Delta E per il matching centroide → pigmento.
 * Basate sulla letteratura: Sharma et al. (2005) e uso pratico in analisi colore.
 */
const DELTA_E_DIRECT_MATCH = 10    // match diretto: pigmento singolo plausibile
const DELTA_E_MIXTURE_CANDIDATE = 25  // sopra questa soglia: sicuramente una miscela

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING CENTROIDI → PIGMENTI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Trova il pigmento del database più simile a un centroide Lab.
 *
 * COLOR: confronta il centroide con il colorLab di ogni pigmento del database
 * usando Delta E CIE2000. Restituisce il pigmento con ΔE minimo.
 *
 * @param centroid - Centroide K-means in CIELab
 * @param database - Lista di pigmenti con colorLab
 * @param artworkDate - Anno dell'opera (filtra pigmenti non disponibili all'epoca)
 * @returns Pigmento più vicino e il suo ΔE
 */
function findClosestPigment(
  centroid: Lab,
  database: HistoricalPigment[],
  artworkDate?: number,
): { pigment: HistoricalPigment; deltaE: number } | null {
  // HISTORY: filtra pigmenti non disponibili all'epoca dell'opera
  const available = artworkDate
    ? database.filter(p => {
        const from = p.availableFrom ?? -Infinity
        const to = p.availableTo ?? Infinity
        return artworkDate >= from && artworkDate <= to
      })
    : database

  if (available.length === 0) return null

  let bestPigment = available[0]
  let bestDeltaE = deltaE2000(centroid, available[0].colorLab)

  for (let i = 1; i < available.length; i++) {
    const dE = deltaE2000(centroid, available[i].colorLab)
    if (dE < bestDeltaE) {
      bestDeltaE = dE
      bestPigment = available[i]
    }
  }

  return { pigment: bestPigment, deltaE: bestDeltaE }
}

/**
 * @description Tenta di spiegare un centroide come miscela di due pigmenti.
 *
 * KM: usa Mixbox per simulare il colore di miscele a varie proporzioni.
 * Trova la coppia (pigmento A, pigmento B, ratio) che minimizza ΔE con il centroide.
 *
 * DISCLAIMER: questo è un'approssimazione. Il vero modello K-M richiederebbe
 * i parametri K/S spettrali dei pigmenti (non sempre disponibili nel database).
 * Mixbox usa un modello K-M semplificato che funziona bene per colori "pittorici"
 * ma può fare errori per miscele molto asimmetriche o pigmenti insoliti.
 *
 * @param centroid - Centroide in Lab da spiegare
 * @param database - Database pigmenti disponibili
 * @param artworkDate - Anno dell'opera (per filtro storico)
 * @returns Migliore miscela trovata con il suo ΔE
 */
async function findBestMixture(
  centroid: Lab,
  database: HistoricalPigment[],
  artworkDate?: number,
): Promise<{
  pigmentA: HistoricalPigment
  pigmentB: HistoricalPigment
  ratio: number
  deltaE: number
} | null> {
  // PERF: Mixbox è importato dinamicamente solo se necessario (miscele)
  // e solo se il ΔE del match singolo è > DELTA_E_DIRECT_MATCH
  // mixbox usa `export default` — il dynamic import restituisce { default: { lerp, ... } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mixbox: any
  try {
    const mod = await import('mixbox')
    mixbox = (mod as any).default ?? mod
  } catch {
    // DISCLAIMER: se Mixbox non è disponibile, non possiamo simulare miscele
    return null
  }

  const available = artworkDate
    ? database.filter(p => {
        const from = p.availableFrom ?? -Infinity
        const to = p.availableTo ?? Infinity
        return artworkDate >= from && artworkDate <= to
      })
    : database

  // Per limitare il tempo: testa solo i 10 pigmenti più vicini al centroide
  // PERF: testare tutte le combinazioni O(n²) è troppo lento per n > 20
  const topN = available
    .map(p => ({ p, dE: deltaE2000(centroid, p.colorLab) }))
    .sort((a, b) => a.dE - b.dE)
    .slice(0, 10)
    .map(x => x.p)

  let bestResult: { pigmentA: HistoricalPigment; pigmentB: HistoricalPigment; ratio: number; deltaE: number } | null = null
  let bestDeltaE = Infinity

  // Testa tutte le coppie tra i top-N pigmenti
  for (let i = 0; i < topN.length; i++) {
    for (let j = i + 1; j < topN.length; j++) {
      if (_cancelled) return null

      const pA = topN[i]
      const pB = topN[j]

      // Prova 5 proporzioni di miscela: 10%, 30%, 50%, 70%, 90%
      for (const ratio of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        // KM: Mixbox.lerp simula la miscelazione K-M tra due colori RGB
        const mixed = mixbox.lerp(
          [...pA.colorRGB, 255] as [number, number, number, number],
          [...pB.colorRGB, 255] as [number, number, number, number],
          ratio,
        )

        // COLOR: converte il colore miscelato da RGB a Lab per il confronto
        const mixedLab = rgbToLab([mixed[0], mixed[1], mixed[2]])
        const dE = deltaE2000(centroid, mixedLab)

        if (dE < bestDeltaE) {
          bestDeltaE = dE
          bestResult = { pigmentA: pA, pigmentB: pB, ratio, deltaE: dE }
        }
      }
    }
  }

  return bestResult
}

// ─────────────────────────────────────────────────────────────────────────────
// API PRINCIPALE DEL WORKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Analizza un tile dell'immagine gigapixel.
 *
 * Pipeline completa:
 *   1. Estrai pixel da ImageData e converti in Lab → 20% progress
 *   2. K-means clustering in Lab → 50% progress
 *   3. Match centroidi → pigmenti (ΔE) → 70% progress
 *   4. Miscele per centroidi con ΔE alto → 85% progress
 *   5. Calcola weight map con soft assignment → 100% progress
 *
 * @param imageData - Pixel del tile dal canvas (RGBA, 4 byte/pixel)
 * @param config - Configurazione: numero cluster, database, metodo, anno opera
 * @returns TileAnalysis con palette, weight map e statistiche
 */
async function analyzeTile(imageData: ImageData, config: AnalysisConfig): Promise<TileAnalysis> {
  _cancelled = false
  _progress = 0

  const { width, height } = imageData
  const { numClusters, pigmentDatabase, artworkDate } = config

  // Step 1: estrai pixel e converti in Lab
  // COLOR: convertiamo tutti i pixel RGB → Lab prima del clustering
  _progress = 5
  const pixelsLab = extractPixelsAsLab(imageData)
  _progress = 20

  if (_cancelled) return emptyAnalysis(width, height)

  // Step 2: K-means clustering in CIELab
  // COLOR: raggruppa i pixel per colore simile (in Lab, non RGB)
  // I centroidi risultanti sono i "colori dominanti" dell'opera
  const centroids = kmeansLab(pixelsLab, Math.min(numClusters, pixelsLab.length))
  _progress = 50

  if (_cancelled) return emptyAnalysis(width, height)

  // Step 3: match ogni centroide con il pigmento più vicino nel database
  const matches: PigmentMatch[] = []

  for (let i = 0; i < centroids.length; i++) {
    if (_cancelled) return emptyAnalysis(width, height)

    const centroid = centroids[i]
    const closest = findClosestPigment(centroid, pigmentDatabase, artworkDate)

    if (!closest) continue

    if (closest.deltaE <= DELTA_E_DIRECT_MATCH) {
      // Match diretto: un singolo pigmento spiega bene questo cluster
      matches.push({
        pigment: closest.pigment,
        confidence: Math.max(0, 1 - closest.deltaE / DELTA_E_DIRECT_MATCH),
        coverage: 0, // calcolato dopo con le weight map
        clusterCenter: centroid,
        deltaE: closest.deltaE,
        isMixture: false,
      })
    } else if (closest.deltaE <= DELTA_E_MIXTURE_CANDIDATE) {
      // Match possibile: potrebbe essere una miscela; prova
      const mixture = await findBestMixture(centroid, pigmentDatabase, artworkDate)

      if (mixture && mixture.deltaE < closest.deltaE) {
        // La miscela spiega meglio del singolo pigmento
        matches.push({
          pigment: mixture.pigmentA, // pigmento dominante della miscela
          confidence: Math.max(0, 1 - mixture.deltaE / DELTA_E_MIXTURE_CANDIDATE),
          coverage: 0,
          clusterCenter: centroid,
          deltaE: mixture.deltaE,
          isMixture: true,
          mixtureComponents: [
            { pigment: mixture.pigmentA, ratio: 1 - mixture.ratio },
            { pigment: mixture.pigmentB, ratio: mixture.ratio },
          ],
        })
      } else {
        // Il singolo pigmento è comunque il migliore disponibile
        matches.push({
          pigment: closest.pigment,
          confidence: Math.max(0, 1 - closest.deltaE / DELTA_E_MIXTURE_CANDIDATE) * 0.5,
          coverage: 0,
          clusterCenter: centroid,
          deltaE: closest.deltaE,
          isMixture: false,
        })
      }
    }
    // Se ΔE > 25: nessun match affidabile — ignoriamo questo cluster
    // DISCLAIMER: cluster con ΔE > 25 sono segnali di miscele complesse
    // o di pigmenti non presenti nel database corrente

    _progress = 50 + Math.round(35 * (i + 1) / centroids.length)
  }

  if (_cancelled) return emptyAnalysis(width, height)

  // Step 4: calcola weight map con soft assignment
  // Per ogni pixel, quanto è simile a ciascun centroide
  const matchedCentroids = matches.map(m => m.clusterCenter)
  const weightMaps = computeWeightMaps(pixelsLab, matchedCentroids, width, height)
  _progress = 90

  // Step 5: calcola copertura % da weight map
  for (let i = 0; i < matches.length; i++) {
    const map = weightMaps[i]
    // Copertura = % di pixel dove il peso supera 0.5 (pigmento dominante in quel pixel)
    let dominant = 0
    for (let j = 0; j < map.length; j++) {
      if (map[j] > 0.5) dominant++
    }
    matches[i].coverage = map.length > 0 ? (dominant / map.length) * 100 : 0
  }

  // Ordina per copertura decrescente
  matches.sort((a, b) => b.coverage - a.coverage)

  // Costruisci la mappa coverage per stats
  const coverage: Record<string, number> = {}
  for (const m of matches) coverage[m.pigment.id] = m.coverage

  _progress = 100

  return {
    palette: matches,
    weightMaps,
    stats: {
      dominantPigment: matches[0]?.pigment.id ?? '',
      coverage,
      tileWidth: width,
      tileHeight: height,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNZIONI DI STATO
// ─────────────────────────────────────────────────────────────────────────────

async function getProgress(): Promise<number> {
  return _progress
}

async function cancel(): Promise<void> {
  _cancelled = true
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÀ INTERNE
// ─────────────────────────────────────────────────────────────────────────────

function emptyAnalysis(width: number, height: number): TileAnalysis {
  return {
    palette: [],
    weightMaps: [],
    stats: { dominantPigment: '', coverage: {}, tileWidth: width, tileHeight: height },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPOSIZIONE TRAMITE COMLINK
// ─────────────────────────────────────────────────────────────────────────────

// WORKER: expose() registra l'API del Worker.
// Dal thread principale si usa wrap<ColorAnalyzerAPI>(worker) per chiamare queste funzioni.
const api: ColorAnalyzerAPI = { analyzeTile, getProgress, cancel }
expose(api)
