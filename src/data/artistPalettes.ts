/**
 * @description Database delle palette tipiche di artisti storici per ChromaScope.
 *
 * Ogni palette è costruita dai pigmenti documentati tramite analisi tecnica
 * (XRF, Raman, stratigrafie) e dalla letteratura specialistica.
 * Le palette sono limitate ai pigmenti presenti nel database ChromaScope
 * (src/data/pigments.ts — focus sui Maestri Olandesi del XVII secolo).
 *
 * HISTORY: le palette vengono confrontate con i pigmenti identificati dall'analisi
 * K-means per calcolare un punteggio di similitudine (Jaccard similarity).
 *
 * DISCLAIMER: una palette "tipica" è una semplificazione statistica.
 * Un artista usava palette diverse nelle diverse fasi della carriera e
 * per diversi soggetti. Usare questi dati come indizi, non come prove.
 *
 * Fonti primarie:
 * - National Gallery Technical Bulletins (NGA) — analisi tecniche per ogni artista
 * - Karin Groen et al. — "Vermeer's Palette" (2010, Mauritshuis/Rijksmuseum)
 * - Ernst van Alphen — "Rembrandt's Material Practice"
 * - Eastaugh et al. — "Pigment Compendium" (2004)
 * - ColourLex artist pages: https://colourlex.com/paintings/
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Palette tipica documentata per un artista.
 */
export interface ArtistPalette {
  /** ID univoco in kebab-case */
  id: string
  /** Nome completo dell'artista */
  name: string
  /** Periodo di attività (es. "1606–1669") */
  period: string
  /** Nazionalità */
  nationality: string
  /**
   * IDs dei pigmenti tipicamente usati dall'artista.
   * Devono corrispondere agli id in src/data/pigments.ts.
   * Ordinati dal più usato al meno usato.
   */
  pigmentIds: string[]
  /** Breve descrizione della tecnica/stile pittorico */
  styleNote: string
  /** Fonte accademica primaria per questa palette */
  source: string
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────────────────────

export const artistPalettes: ArtistPalette[] = [

  {
    id: 'rembrandt',
    name: 'Rembrandt van Rijn',
    period: '1606–1669',
    nationality: 'Olandese',
    // HISTORY: tavolozza limitata e tonale. Rembrandt costruiva i suoi dipinti
    // con imprimiture scure e layer di glazing. Le ocre e le ombre fornivano
    // la base tonale; la biacca in impasto creava le luci scultoree nei ritratti.
    pigmentIds: [
      'lead-white',       // biacca — base luci, impasto nei ritratti
      'bone-black',       // nero avorio — fondamentale per i neri profondi
      'yellow-ochre',     // ocra gialla — base di quasi tutti i colori
      'red-ochre',        // ocra rossa — carnagioni, terra
      'raw-umber',        // terra d'ombra grezza — glazing, ombre trasparenti
      'burnt-umber',      // terra d'ombra bruciata — ombre calde
      'madder-lake',      // lacca di garanza — rossi trasparenti, glazing
      'natural-ultramarine', // oltremare naturale — blu cieli e mantelli
      'smalt',            // smaltino — blu aree secondarie (più economico dell'oltremare)
      'vermilion',        // vermiglione — rossi saturi nei costumi
      'chalk',            // gesso — imprimiture, strati preparatori
      'lead-tin-yellow',  // giallo di piombo-stagno — gialli luminosi
    ],
    styleNote: 'Tavolozza limitata e tonale. Imprimiture scure. Impasto spesso per le luci, glazing per le ombre. Caratteristico uso del bitume (non nel database) per i neri profondi.',
    source: 'https://colourlex.com/paintings/?artist=rembrandt',
  },

  {
    id: 'vermeer',
    name: 'Johannes Vermeer',
    period: '1632–1675',
    nationality: 'Olandese',
    // HISTORY: Vermeer usava una tavolozza più ricca di Rembrandt.
    // Il suo blu intenso era ottenuto dall'oltremare naturale (lapislazzuli afghano),
    // il più costoso dei pigmenti blu disponibili nel XVII secolo.
    // Analisi XRF (Mauritshuis, 2010) hanno confermato questa palette.
    pigmentIds: [
      'lead-white',          // biacca — base luci, fondamentale per gli interni illuminati
      'natural-ultramarine', // oltremare naturale — caratteristico dei suoi blu intensi
      'lead-tin-yellow',     // giallo di piombo-stagno — gialli luminosi, luci sugli oggetti
      'madder-lake',         // lacca di garanza — rossi nei tendaggi
      'yellow-ochre',        // ocra gialla — carnagioni, pavimenti
      'chalk',               // gesso — imprimiture
      'bone-black',          // nero avorio — ombre, profondità
      'smalt',               // smaltino — alcuni blu di sfondo
      'vermilion',           // vermiglione — accenti rossi
      'raw-umber',           // terra d'ombra — ombre calde
      'green-earth',         // terra verde — preparazione per carnagioni
    ],
    styleNote: 'Uso magistrale della luce diffusa. Lavorava su imprimiture chiare (a differenza di Rembrandt). L\'oltremare naturale è quasi onnipresente anche in piccole quantità.',
    source: 'https://colourlex.com/paintings/?artist=vermeer',
  },

  {
    id: 'frans-hals',
    name: 'Frans Hals',
    period: '1582–1666',
    nationality: 'Olandese',
    pigmentIds: [
      'lead-white',
      'bone-black',
      'yellow-ochre',
      'red-ochre',
      'raw-umber',
      'burnt-umber',
      'madder-lake',
      'smalt',
      'vermilion',
      'chalk',
      'lead-tin-yellow',
      'natural-ultramarine',
    ],
    styleNote: 'Pennellate rapide e visibili. Tavolozza simile a Rembrandt ma con maggiore enfasi sui neri e i contrasti. Eccezionale nella resa rapida delle carnagioni.',
    source: 'https://colourlex.com/paintings/?artist=hals',
  },

  {
    id: 'jan-steen',
    name: 'Jan Steen',
    period: '1626–1679',
    nationality: 'Olandese',
    pigmentIds: [
      'lead-white',
      'bone-black',
      'yellow-ochre',
      'red-ochre',
      'vermilion',
      'madder-lake',
      'lead-tin-yellow',
      'raw-umber',
      'burnt-umber',
      'smalt',
      'natural-ultramarine',
      'chalk',
    ],
    styleNote: 'Pittore di scene di genere. Palette vivace con uso frequente di rossi brillanti (vermiglione) e gialli. Tavolozza più ampia rispetto a Rembrandt.',
    source: 'https://colourlex.com/paintings/?artist=jan-steen',
  },

  {
    id: 'pieter-de-hooch',
    name: 'Pieter de Hooch',
    period: '1629–1684',
    nationality: 'Olandese',
    pigmentIds: [
      'lead-white',
      'natural-ultramarine',
      'lead-tin-yellow',
      'yellow-ochre',
      'red-ochre',
      'madder-lake',
      'bone-black',
      'smalt',
      'raw-umber',
      'chalk',
      'vermilion',
    ],
    styleNote: 'Interni luminosi con attenzione alle prospettive spaziali. Palette simile a Vermeer, con forte dipendenza dall\'oltremare per i blu dei cieli visti dalle finestre.',
    source: 'https://colourlex.com/paintings/?artist=pieter-de-hooch',
  },

]

// ─────────────────────────────────────────────────────────────────────────────
// FUNZIONI DI CONFRONTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Calcola la similitudine Jaccard tra una palette identificata
 * e la palette tipica di un artista.
 *
 * Jaccard = |intersect(A, B)| / |union(A, B)|
 * Range: 0.0 (nessun pigmento in comune) — 1.0 (palette identiche)
 *
 * DISCLAIMER: il confronto è basato solo sulla presenza/assenza dei pigmenti,
 * non sulle proporzioni. Due tavolozze con gli stessi pigmenti in proporzioni
 * molto diverse danno score = 1.0.
 *
 * @param foundPigmentIds  - ID pigmenti trovati nell'analisi
 * @param artistPigmentIds - ID pigmenti tipici dell'artista
 * @returns Score Jaccard [0.0–1.0]
 */
export function jaccardSimilarity(
  foundPigmentIds: string[],
  artistPigmentIds: string[],
): number {
  const setA = new Set(foundPigmentIds)
  const setB = new Set(artistPigmentIds)

  let intersect = 0
  for (const id of setA) {
    if (setB.has(id)) intersect++
  }

  const union = new Set([...setA, ...setB]).size
  if (union === 0) return 0

  return intersect / union
}

/**
 * @description Confronta una palette con tutti gli artisti nel database
 * e restituisce i risultati ordinati per similitudine decrescente.
 *
 * @param foundPigmentIds - ID pigmenti identificati dall'analisi
 * @returns Array di confronti ordinati, da più simile a meno simile
 */
export function compareWithAllArtists(foundPigmentIds: string[]): ArtistComparison[] {
  return artistPalettes
    .map(artist => ({
      artist,
      score:  jaccardSimilarity(foundPigmentIds, artist.pigmentIds),
      sharedPigmentIds: foundPigmentIds.filter(id => artist.pigmentIds.includes(id)),
      uniqueToPainting:  foundPigmentIds.filter(id => !artist.pigmentIds.includes(id)),
      uniqueToArtist:    artist.pigmentIds.filter(id => !foundPigmentIds.includes(id)),
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * @description Risultato del confronto tra una palette identificata e un artista.
 */
export interface ArtistComparison {
  artist: ArtistPalette
  /** Score Jaccard [0.0–1.0] */
  score: number
  /** Pigmenti in comune tra l'opera analizzata e l'artista */
  sharedPigmentIds: string[]
  /** Pigmenti trovati nell'opera ma non tipici dell'artista */
  uniqueToPainting: string[]
  /** Pigmenti tipici dell'artista ma non trovati nell'opera */
  uniqueToArtist: string[]
}
