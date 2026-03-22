/**
 * @description Funzioni matematiche per la teoria del colore usate nel motore di analisi.
 *
 * Tutte le funzioni sono pure (nessun side effect) e usabili sia nel thread principale
 * che nei Web Worker.
 *
 * Pipeline colore usata in ChromaScope:
 *   RGB [0-255] → sRGB linear [0-1] → XYZ D65 → CIELab
 *
 * @see https://www.color.org/sRGB.xalter (spec sRGB)
 * @see https://en.wikipedia.org/wiki/CIELAB_color_space
 * @see https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPI LOCALI
// ─────────────────────────────────────────────────────────────────────────────

/** COLOR: tripla RGB con valori interi 0-255 */
export type RGB = [number, number, number]

/** COLOR: tripla CIELab [L: 0-100, a: -128..127, b: -128..127] con illuminante D65 */
export type Lab = [number, number, number]

// ─────────────────────────────────────────────────────────────────────────────
// RGB → CIELab
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Converte un colore da RGB a CIELab con illuminante D65.
 *
 * COLOR: pipeline in tre passi:
 *   1. RGB [0-255] → sRGB normalizzato [0-1]
 *   2. sRGB → sRGB lineare (rimozione gamma 2.2)
 *   3. sRGB lineare → XYZ D65 (matrice di trasformazione)
 *   4. XYZ → CIELab (trasformazione non lineare con funzione cubica a tratti)
 *
 * Perché usiamo D65: è l'illuminante standard per i display moderni (luce diurna a 6500K).
 * Tutti i dati dei pigmenti nel database sono misurati in condizioni D65.
 *
 * @param rgb - Colore in RGB [0-255]
 * @returns Colore in CIELab [L, a, b]
 *
 * @example
 * rgbToLab([255, 0, 0])   // → [53.23, 80.11, 67.22] (rosso puro)
 * rgbToLab([0, 0, 255])   // → [32.30, 79.19, -107.86] (blu puro)
 * rgbToLab([255, 255, 0]) // → [97.14, -21.56, 94.48] (giallo puro)
 */
export function rgbToLab([r, g, b]: RGB): Lab {
  // COLOR: Step 1 — normalizza RGB [0-255] → [0-1]
  let rn = r / 255
  let gn = g / 255
  let bn = b / 255

  // COLOR: Step 2 — rimozione gamma sRGB (linearizzazione)
  // La formula sRGB usa una soglia a 0.04045 per evitare discontinuità
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92

  // COLOR: Step 3 — sRGB lineare → XYZ D65
  // Matrice di trasformazione IEC 61966-2-1 per illuminante D65/2°
  const x = rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375
  const y = rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750
  const z = rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041

  // COLOR: Step 4 — XYZ → CIELab
  // Normalizzazione per il punto bianco D65: Xn=0.95047, Yn=1.00000, Zn=1.08883
  const fx = labF(x / 0.95047)
  const fy = labF(y / 1.00000)
  const fz = labF(z / 1.08883)

  const L = 116 * fy - 16
  const a = 500 * (fx - fy)
  const bLab = 200 * (fy - fz)

  return [L, a, bLab]
}

/**
 * @description Funzione ausiliaria per la conversione XYZ → Lab.
 * COLOR: funzione cubica a tratti che evita la discontinuità a zero.
 * Soglia: t > (6/29)³ ≈ 0.008856
 */
function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : (t / 0.128418) + 0.137931
}

// ─────────────────────────────────────────────────────────────────────────────
// DELTA E CIE2000
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Calcola la distanza percettiva tra due colori usando Delta E CIE2000.
 *
 * COLOR: usiamo CIE2000 (non CIE76 = distanza euclidea in Lab) perché:
 * - CIE76 sottostima le differenze nel neutro/grigio
 * - CIE76 sovrastima le differenze per i blu
 * - CIE2000 include correzioni per luminosità, croma e tonalità
 *
 * Una differenza di ΔE = 1.0 corrisponde alla minima differenza percepibile
 * dall'occhio umano (JND: Just Noticeable Difference) in condizioni standard.
 *
 * Soglie usate in ChromaScope:
 * - ΔE < 10  → match diretto (pigmento singolo plausibile)
 * - ΔE 10-25 → match possibile (potrebbe essere miscela)
 * - ΔE > 25  → nessun match singolo (sicuramente miscela)
 *
 * @see https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
 * @see Sharma et al., "The CIEDE2000 Color-Difference Formula", Color Research & Application, 2005
 *
 * @param lab1 - Primo colore in CIELab [L, a, b]
 * @param lab2 - Secondo colore in CIELab [L, a, b]
 * @returns Delta E nel range [0, ∞). Valori pratici: 0-50.
 *
 * @example
 * deltaE2000([50, 0, 0], [50, 0, 0])    // → 0 (identici)
 * deltaE2000([50, 25, 0], [50, 0, 0])   // → ~13
 * deltaE2000([0, 0, 0], [100, 0, 0])    // → ~100 (nero vs bianco)
 */
export function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  // Step 1: calcola C* (croma) per entrambi i colori
  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)

  // Step 2: calcola C_avg^7 per la correzione del croma
  const Cavg7 = Math.pow((C1 + C2) / 2, 7)
  const G = 0.5 * (1 - Math.sqrt(Cavg7 / (Cavg7 + 6103515625))) // 25^7 = 6103515625

  // Step 3: a' corretto
  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)

  // Step 4: C' e h'
  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI) % 360 + (Math.atan2(b1, a1p) < 0 ? 360 : 0)
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI) % 360 + (Math.atan2(b2, a2p) < 0 ? 360 : 0)

  // Step 5: differenze ΔL', ΔC', Δh'
  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp: number
  if (C1p * C2p === 0) {
    dhp = 0
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360
  } else {
    dhp = h2p - h1p + 360
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * (Math.PI / 180))

  // Step 6: medie L', C', H'
  const Lp_avg = (L1 + L2) / 2
  const Cp_avg = (C1p + C2p) / 2

  let hp_avg: number
  if (C1p * C2p === 0) {
    hp_avg = h1p + h2p
  } else if (Math.abs(h1p - h2p) <= 180) {
    hp_avg = (h1p + h2p) / 2
  } else if (h1p + h2p < 360) {
    hp_avg = (h1p + h2p + 360) / 2
  } else {
    hp_avg = (h1p + h2p - 360) / 2
  }

  // Step 7: pesi T, SL, SC, SH
  const T = 1
    - 0.17 * Math.cos((hp_avg - 30) * (Math.PI / 180))
    + 0.24 * Math.cos((2 * hp_avg) * (Math.PI / 180))
    + 0.32 * Math.cos((3 * hp_avg + 6) * (Math.PI / 180))
    - 0.20 * Math.cos((4 * hp_avg - 63) * (Math.PI / 180))

  const SL = 1 + (0.015 * Math.pow(Lp_avg - 50, 2)) / Math.sqrt(20 + Math.pow(Lp_avg - 50, 2))
  const SC = 1 + 0.045 * Cp_avg
  const SH = 1 + 0.015 * Cp_avg * T

  // Step 8: termine di rotazione RC
  const Cp_avg7 = Math.pow(Cp_avg, 7)
  const RC = 2 * Math.sqrt(Cp_avg7 / (Cp_avg7 + 6103515625))
  const dTheta = 30 * Math.exp(-Math.pow((hp_avg - 275) / 25, 2))
  const RT = -Math.sin(2 * dTheta * (Math.PI / 180)) * RC

  // Step 9: Delta E CIE2000 finale
  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// K-MEANS IN SPAZIO CIELAB
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Esegue K-means clustering su un array di colori in CIELab.
 *
 * COLOR: K-means in Lab (non RGB) perché la distanza euclidea in Lab
 * corrisponde alla differenza percettiva, mentre in RGB no.
 * Due pixel con lo stesso colore visivo ma RGB diverso (metamerismo di display)
 * finirebbero in cluster diversi se usassimo RGB.
 *
 * Implementazione: algoritmo Lloyd con inizializzazione K-means++
 * K-means++ garantisce centroidi iniziali ben distribuiti → convergenza più rapida.
 *
 * @param colors - Array di colori in CIELab
 * @param k - Numero di cluster (tipicamente 6-10 per un dipinto)
 * @param maxIterations - Numero massimo di iterazioni (default: 50)
 * @returns Array di centroidi in CIELab, uno per cluster
 *
 * @example
 * const pixels: Lab[] = [...] // pixel dell'immagine convertiti in Lab
 * const centroids = kmeansLab(pixels, 8) // 8 colori dominanti
 */
export function kmeansLab(colors: Lab[], k: number, maxIterations = 50): Lab[] {
  if (colors.length === 0 || k <= 0) return []
  if (k >= colors.length) return colors.slice()

  // COLOR: inizializzazione K-means++
  // Il primo centroide è scelto casualmente; i successivi sono scelti con
  // probabilità proporzionale alla distanza quadratica dal centroide più vicino.
  // Questo evita centroidi iniziali troppo vicini tra loro.
  let centroids: Lab[] = [colors[Math.floor(Math.random() * colors.length)]]

  for (let i = 1; i < k; i++) {
    // Calcola distanza^2 di ogni punto dal centroide più vicino
    const distances = colors.map(c => {
      const minD = Math.min(...centroids.map(cen => {
        const dL = c[0] - cen[0]
        const da = c[1] - cen[1]
        const db = c[2] - cen[2]
        // COLOR: distanza euclidea in Lab (approssimazione di Delta E)
        // usiamo la distanza euclidea semplice per K-means (più veloce),
        // Delta E CIE2000 completo solo per il matching finale con il database pigmenti
        return dL * dL + da * da + db * db
      }))
      return minD
    })

    // Campionamento proporzionale alla distanza^2
    const total = distances.reduce((s, d) => s + d, 0)
    let r = Math.random() * total
    let chosen = colors[colors.length - 1]
    for (let j = 0; j < colors.length; j++) {
      r -= distances[j]
      if (r <= 0) { chosen = colors[j]; break }
    }
    centroids.push([...chosen] as Lab)
  }

  // Iterazioni Lloyd
  let assignments = new Int32Array(colors.length)

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false

    // Assegna ogni punto al centroide più vicino
    for (let i = 0; i < colors.length; i++) {
      let bestCluster = 0
      let bestDist = Infinity

      for (let c = 0; c < centroids.length; c++) {
        const dL = colors[i][0] - centroids[c][0]
        const da = colors[i][1] - centroids[c][1]
        const db = colors[i][2] - centroids[c][2]
        const dist = dL * dL + da * da + db * db
        if (dist < bestDist) { bestDist = dist; bestCluster = c }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster
        changed = true
      }
    }

    // Convergenza: se nessun punto ha cambiato cluster, stop
    if (!changed) break

    // Ricalcola i centroidi come media dei punti assegnati
    const sums: [number, number, number][] = Array.from({ length: k }, () => [0, 0, 0])
    const counts = new Int32Array(k)

    for (let i = 0; i < colors.length; i++) {
      const c = assignments[i]
      sums[c][0] += colors[i][0]
      sums[c][1] += colors[i][1]
      sums[c][2] += colors[i][2]
      counts[c]++
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = [
          sums[c][0] / counts[c],
          sums[c][1] / counts[c],
          sums[c][2] / counts[c],
        ]
      }
    }
  }

  return centroids
}

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHT MAP (soft assignment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Calcola la weight map per ogni centroide su tutti i pixel del tile.
 *
 * Usa soft assignment: ogni pixel ha un peso per ogni centroide, proporzionale
 * alla distanza inversa (più il pixel è vicino al centroide, più alto il peso).
 *
 * COLOR: la somma dei pesi per ogni pixel è normalizzata a 1.0
 * (ogni pixel è "spiegato" al 100% dalla combinazione dei pigmenti).
 *
 * @param pixelsLab - Array di tutti i pixel del tile in CIELab
 * @param centroids - Centroidi K-means in CIELab
 * @param tileWidth - Larghezza del tile in pixel
 * @param tileHeight - Altezza del tile in pixel
 * @returns Array di Float32Array (una per centroide), ognuna di dimensione width×height
 */
export function computeWeightMaps(
  pixelsLab: Lab[],
  centroids: Lab[],
  tileWidth: number,
  tileHeight: number,
): Float32Array[] {
  const numPigments = centroids.length
  const numPixels = tileWidth * tileHeight
  const maps = Array.from({ length: numPigments }, () => new Float32Array(numPixels))

  // PERF: temperatura per il softmax — valori più bassi = assegnazioni più nette
  // 50.0 in spazio Lab corrisponde approssimativamente a ΔE ~5-7 come "raggio di influenza"
  const temperature = 50.0

  for (let i = 0; i < numPixels && i < pixelsLab.length; i++) {
    const px = pixelsLab[i]

    // Calcola distanza euclidea da ogni centroide
    const distances = centroids.map(c => {
      const dL = px[0] - c[0]
      const da = px[1] - c[1]
      const db = px[2] - c[2]
      return Math.sqrt(dL * dL + da * da + db * db)
    })

    // Softmax inverso: peso = exp(-dist / temperatura) → normalizzato
    const weights = distances.map(d => Math.exp(-d / temperature))
    const total = weights.reduce((s, w) => s + w, 0)

    for (let c = 0; c < numPigments; c++) {
      maps[c][i] = total > 0 ? weights[c] / total : 1 / numPigments
    }
  }

  return maps
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÀ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Estrae tutti i pixel da un ImageData e li converte in CIELab.
 * WORKER: chiamata nel Web Worker, non nel thread principale.
 *
 * @param imageData - Dati pixel da canvas (RGBA, 4 byte per pixel)
 * @returns Array di colori in CIELab (solo pixel non trasparenti)
 */
export function extractPixelsAsLab(imageData: ImageData): Lab[] {
  const { data, width, height } = imageData
  const result: Lab[] = []

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    const alpha = data[offset + 3]

    // Salta pixel trasparenti (alpha < 128)
    if (alpha < 128) continue

    result.push(rgbToLab([data[offset], data[offset + 1], data[offset + 2]]))
  }

  return result
}

/**
 * @description Calcola la copertura percentuale di ogni cluster nel tile.
 * @param assignments - Indice cluster per ogni pixel
 * @param k - Numero di cluster
 * @returns Array di percentuali (0-100), una per cluster
 */
export function computeCoverage(assignments: Int32Array, k: number): number[] {
  const counts = new Array(k).fill(0)
  for (let i = 0; i < assignments.length; i++) counts[assignments[i]]++
  const total = assignments.length
  return counts.map(c => total > 0 ? (c / total) * 100 : 0)
}
