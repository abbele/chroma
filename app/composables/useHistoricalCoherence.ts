/**
 * @description Composable per la valutazione della coerenza storica dei pigmenti.
 *
 * Confronta la data dell'opera con le finestre di disponibilità storica di ogni pigmento.
 * Produce un report strutturato che indica se i pigmenti trovati erano disponibili
 * all'epoca della realizzazione dell'opera.
 *
 * HISTORY: questa logica è fondamentale per ChromaScope — un pigmento anacronistico
 * non prova la falsificazione dell'opera, ma è un segnale che merita verifica strumentale.
 *
 * DISCLAIMER: vedi DOC_GUIDE.md per i disclaimer obbligatori in ogni vista che
 * mostra risultati di coerenza storica.
 *
 * @see src/data/pigments.ts — database con availableFrom / availableTo per ogni pigmento
 * @see src/types/pigment.ts — interfaccia HistoricalPigment
 */

import type { HistoricalPigment } from '#src/types/pigment'
import type { PigmentMatch } from '#src/types/analysis'

// ─────────────────────────────────────────────────────────────────────────────
// TIPI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Stato di coerenza storica di un pigmento rispetto alla data dell'opera.
 *
 * - 'coherent':      il pigmento era ampiamente disponibile all'epoca ✅
 * - 'possible':      uso possibile ma non comune (introdotto da poco, o quasi obsoleto) ⚠️
 * - 'anachronistic': il pigmento non era ancora stato sintetizzato/scoperto ❌
 * - 'unknown':       data dell'opera non specificata — impossibile valutare
 */
export type CoherenceStatus = 'coherent' | 'possible' | 'anachronistic' | 'unknown'

/**
 * @description Risultato della valutazione per un singolo pigmento.
 */
export interface CoherenceResult {
  status: CoherenceStatus
  /** Motivazione in italiano — mostrata nella UI e nel modulo AI (Fase 5) */
  reason: string
}

/**
 * @description Report completo di coerenza storica per tutti i pigmenti di un'opera.
 */
export interface CoherenceReport {
  /** Mappa pigmentId → risultato della valutazione */
  results: Map<string, CoherenceResult>
  /** True se almeno un pigmento è anacronistico rispetto alla data dell'opera */
  hasAnachronisms: boolean
  /** True se almeno un pigmento ha status 'possible' */
  hasPossible: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// SOGLIE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HISTORY: finestra di "adozione precoce" in anni dopo l'introduzione di un pigmento.
 * Un pigmento introdotto nel 1704 e usato in un'opera del 1715 è "possibile"
 * (era disponibile, ma l'adozione diffusa richiedeva anni).
 * Basato su letteratura: i nuovi pigmenti impiegavano tipicamente 15-25 anni
 * per diventare di uso corrente tra i pittori europei.
 */
const EARLY_ADOPTION_WINDOW = 20

/**
 * HISTORY: finestra di "uso residuo" in anni dopo che un pigmento è caduto in disuso.
 * Pittori potevano ancora usare scorte di pigmenti non più prodotti.
 */
const RESIDUAL_USE_WINDOW = 15

// ─────────────────────────────────────────────────────────────────────────────
// FUNZIONE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Valuta la coerenza storica di un singolo pigmento.
 *
 * Logica:
 * 1. Se artworkDate non è noto → 'unknown'
 * 2. Se artworkDate < availableFrom → 'anachronistic' (il pigmento non esisteva ancora)
 * 3. Se artworkDate è dentro la finestra di adozione precoce → 'possible'
 * 4. Se artworkDate > availableTo + RESIDUAL_USE_WINDOW → 'possible' (uso residuo improbabile)
 * 5. Altrimenti → 'coherent'
 *
 * HISTORY: i valori null in availableFrom/availableTo significano:
 * - availableFrom = null → pigmento dell'antichità, sempre disponibile
 * - availableTo   = null → pigmento ancora usato oggi
 *
 * @param pigment    - Pigmento da valutare
 * @param artworkDate - Anno dell'opera (undefined = non noto)
 * @returns Risultato con status e motivazione leggibile
 */
export function evaluatePigmentCoherence(
  pigment: HistoricalPigment,
  artworkDate: number | undefined,
): CoherenceResult {
  if (artworkDate === undefined || artworkDate === null) {
    return {
      status: 'unknown',
      reason: 'Data dell\'opera non specificata: impossibile valutare la coerenza storica.',
    }
  }

  const from = pigment.availableFrom ?? -Infinity
  const to   = pigment.availableTo   ?? Infinity

  // HISTORY: caso anacronistico — il pigmento non era ancora stato scoperto/sintetizzato
  if (artworkDate < from) {
    return {
      status: 'anachronistic',
      reason: `${pigment.nameIT} è disponibile solo dal ${pigment.availableFrom}. `
        + `L'opera è datata ${artworkDate}: il pigmento non poteva esistere in essa.`,
    }
  }

  // HISTORY: adozione precoce — il pigmento fu introdotto di recente rispetto alla data
  if (
    artworkDate >= from &&
    artworkDate <= from + EARLY_ADOPTION_WINDOW &&
    pigment.availableFrom !== null
  ) {
    return {
      status: 'possible',
      reason: `${pigment.nameIT} fu introdotto nel ${pigment.availableFrom}. `
        + `L'uso nell'anno ${artworkDate} è documentato ma non ancora diffuso.`,
    }
  }

  // HISTORY: uso residuo oltre il periodo di utilizzo principale
  if (artworkDate > to) {
    const yearsAfter = artworkDate - (pigment.availableTo ?? artworkDate)
    if (yearsAfter > RESIDUAL_USE_WINDOW) {
      return {
        status: 'possible',
        reason: `${pigment.nameIT} era già in disuso dal ${pigment.availableTo}. `
          + `L'uso nell'anno ${artworkDate} è possibile solo tramite scorte residue.`,
      }
    }
    return {
      status: 'possible',
      reason: `${pigment.nameIT} stava uscendo dall'uso in questo periodo. `
        + `Ancora possibile ma meno comune dopo il ${pigment.availableTo}.`,
    }
  }

  // Caso normale: pigmento pienamente disponibile all'epoca
  return {
    status: 'coherent',
    reason: `${pigment.nameIT} era ampiamente disponibile e usato nel ${artworkDate}.`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Composable Vue per l'analisi di coerenza storica di una palette pigmenti.
 *
 * @example
 * const { buildReport, statusIcon, statusLabel } = useHistoricalCoherence()
 * const report = buildReport(palette.map(m => m.pigment), 1642)
 * // report.hasAnachronisms === false per la Ronda di Notte
 */
export function useHistoricalCoherence() {
  /**
   * @description Costruisce il report di coerenza storica per tutti i pigmenti di un'opera.
   *
   * @param pigments    - Lista pigmenti da valutare
   * @param artworkDate - Anno dell'opera (undefined = non noto)
   * @returns Report con mappa dei risultati e flag aggregati
   */
  function buildReport(
    pigments: HistoricalPigment[],
    artworkDate: number | undefined,
  ): CoherenceReport {
    const results = new Map<string, CoherenceResult>()

    for (const pigment of pigments) {
      results.set(pigment.id, evaluatePigmentCoherence(pigment, artworkDate))
    }

    const statuses = [...results.values()].map(r => r.status)
    return {
      results,
      hasAnachronisms: statuses.includes('anachronistic'),
      hasPossible: statuses.includes('possible'),
    }
  }

  /**
   * @description Icona emoji per lo status di coerenza.
   * UX: usata nella lista pigmenti e nella PigmentCard.
   */
  function statusIcon(status: CoherenceStatus): string {
    switch (status) {
      case 'coherent':      return '✓'
      case 'possible':      return '⚠'
      case 'anachronistic': return '✗'
      case 'unknown':       return '?'
    }
  }

  /**
   * @description Label leggibile per lo status.
   */
  function statusLabel(status: CoherenceStatus): string {
    switch (status) {
      case 'coherent':      return 'Coerente'
      case 'possible':      return 'Possibile'
      case 'anachronistic': return 'Anacronistico'
      case 'unknown':       return 'Sconosciuto'
    }
  }

  /**
   * @description Converti una palette di PigmentMatch in pigmenti per buildReport.
   */
  function reportFromPalette(
    palette: PigmentMatch[],
    artworkDate: number | undefined,
  ): CoherenceReport {
    return buildReport(palette.map(m => m.pigment), artworkDate)
  }

  return { buildReport, reportFromPalette, statusIcon, statusLabel }
}
