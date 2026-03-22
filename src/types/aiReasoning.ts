/**
 * @description Tipi TypeScript per la catena di ragionamento AI (Fase 5).
 * L'AI ragiona come uno storico dell'arte — produce ipotesi, non conclusioni nette.
 * Ogni output include sempre un disclaimer metodologico.
 */

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Contesto della zona dell'opera analizzata.
 * Deriva dai weight maps del Worker: ogni entry = pigmento + peso medio nell'area.
 */
export interface ZoneContext {
  /** Coordinate normalizzate (0–1) della zona selezionata nel viewer */
  x: number
  y: number
  /** Descrizione testuale della zona (generata automaticamente o dall'utente) */
  label: string
  /**
   * Distribuzione pigmenti nell'area.
   * WORKER: ogni entry corrisponde a palette[i] + media del weightMap[i] nella zona.
   */
  pigmentWeights: { pigmentId: string; weight: number }[]
}

/**
 * @description Input completo per la route server /api/reasoning.
 * Combina la palette analizzata con la domanda testuale opzionale e il contesto zona.
 */
export interface AIReasoningInput {
  /** Domanda testuale dell'utente (opzionale — se assente l'AI analizza liberamente) */
  question?: string
  /** Anno dell'opera */
  artworkDate: number
  /** Titolo opera + artista (per contestualizzazione) */
  artworkTitle: string
  /** Lista pigmenti identificati con coverage e deltaE */
  palette: {
    pigmentId: string
    nameIT: string
    nameEN: string
    coverage: number
    deltaE: number
    isMixture: boolean
    mixtureComponents?: { nameIT: string; ratio: number }[]
    coherenceStatus: 'coherent' | 'possible' | 'anachronistic' | 'unknown'
    availableFrom: number | null
  }[]
  /** Contesto zona (opzionale — se l'utente ha cliccato sul viewer) */
  zoneContext?: ZoneContext
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT (streaming + parsed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Evento SSE inviato dal server durante lo streaming.
 */
export interface AIStreamEvent {
  type: 'delta' | 'done' | 'error'
  /** Testo incrementale (solo se type = 'delta') */
  text?: string
  /** Messaggio di errore (solo se type = 'error') */
  error?: string
}

/**
 * @description Sezione del ragionamento AI dopo il parsing del markdown.
 * Il modello emette sempre sezioni con intestazioni ## per facilitare il rendering progressivo.
 */
export interface AIReasoningSection {
  /** Titolo della sezione (testo dopo ##) */
  title: string
  /** Contenuto testuale della sezione */
  body: string
}

/**
 * @description Output AI completamente parsato.
 * Disponibile solo al termine dello streaming (type = 'done').
 */
export interface ParsedReasoning {
  sections: AIReasoningSection[]
  /** Testo grezzo completo (markdown) — per debug o export */
  rawMarkdown: string
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** Provider AI supportati */
export type AIProvider = 'groq' | 'openai' | 'claude'

/**
 * @description Configurazione provider letta dalle variabili d'ambiente.
 * Usata dalla route server per selezionare il client AI corretto.
 */
export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
  model: string
  /** Base URL custom per endpoint OpenAI-compatibili (es. Groq, LM Studio) */
  baseUrl?: string
}
