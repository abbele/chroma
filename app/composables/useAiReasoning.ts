/**
 * @description Composable Vue per la catena di ragionamento AI (Fase 5).
 * Gestisce la chiamata SSE verso /api/reasoning, il parsing progressivo
 * del markdown in sezioni, e lo stato dell'interazione utente.
 *
 * DISCLAIMER: i risultati AI sono ipotesi computazionali, non analisi strumentali.
 */

import type {
  AIReasoningInput,
  AIStreamEvent,
  AIReasoningSection,
  ParsedReasoning,
  ZoneContext,
} from '#src/types/aiReasoning'
import type { PigmentMatch } from '#src/types/analysis'
import type { CoherenceReport } from '~/composables/useHistoricalCoherence'

// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN PARSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsa progressivamente il markdown accumulato in sezioni ##.
 * Usato sia per il rendering live (streaming) sia per il parsing finale.
 */
function parseMarkdownSections(markdown: string): AIReasoningSection[] {
  const sections: AIReasoningSection[] = []
  const lines = markdown.split('\n')
  let currentTitle = ''
  let currentBody: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: currentBody.join('\n').trim() })
      }
      currentTitle = line.replace('## ', '').trim()
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, body: currentBody.join('\n').trim() })
  }

  return sections
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────

export function useAiReasoning() {
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const rawMarkdown = ref('')
  const sections = ref<AIReasoningSection[]>([])
  const isDone = ref(false)
  const question = ref('')
  const pendingZoneContext = ref<ZoneContext | null>(null)

  /** Risultato completamente parsato (disponibile solo dopo isDone = true) */
  const parsedReasoning = computed<ParsedReasoning | null>(() => {
    if (!isDone.value || !rawMarkdown.value) return null
    return {
      sections: sections.value,
      rawMarkdown: rawMarkdown.value,
    }
  })

  /**
   * Avvia il ragionamento AI sull'analisi corrente.
   * @param palette - Palette identificata dal Worker
   * @param coherenceReport - Report coerenza storica
   * @param artworkDate - Anno dell'opera
   * @param artworkTitle - Titolo + artista
   * @param zoneCtx - Contesto zona (opzionale, da click sul viewer)
   */
  async function startReasoning(
    palette: PigmentMatch[],
    coherenceReport: CoherenceReport,
    artworkDate: number,
    artworkTitle: string,
    zoneCtx?: ZoneContext,
  ) {
    if (isStreaming.value) return

    // Reset stato
    isStreaming.value = true
    error.value = null
    rawMarkdown.value = ''
    sections.value = []
    isDone.value = false

    const input: AIReasoningInput = {
      question: question.value.trim() || undefined,
      artworkDate,
      artworkTitle,
      zoneContext: zoneCtx ?? pendingZoneContext.value ?? undefined,
      palette: palette.map(m => {
        const status = coherenceReport.results.get(m.pigment.id)?.status ?? 'unknown'
        return {
          pigmentId: m.pigment.id,
          nameIT: m.pigment.nameIT,
          nameEN: m.pigment.nameEN,
          coverage: m.coverage,
          deltaE: m.deltaE,
          isMixture: m.isMixture,
          mixtureComponents: m.mixtureComponents?.map(c => ({
            nameIT: c.pigment.nameIT,
            ratio: c.ratio,
          })),
          coherenceStatus: status,
          availableFrom: m.pigment.availableFrom,
        }
      }),
    }

    try {
      const response = await fetch('/api/reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('ReadableStream non disponibile')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt: AIStreamEvent = JSON.parse(line.slice(6))
            if (evt.type === 'delta' && evt.text) {
              rawMarkdown.value += evt.text
              // Aggiorna sezioni progressivamente
              sections.value = parseMarkdownSections(rawMarkdown.value)
            } else if (evt.type === 'done') {
              isDone.value = true
            } else if (evt.type === 'error') {
              error.value = evt.error ?? 'Errore sconosciuto'
            }
          } catch {
            // Riga SSE malformata — ignora
          }
        }
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Errore di rete'
    } finally {
      isStreaming.value = false
      pendingZoneContext.value = null
    }
  }

  function reset() {
    isStreaming.value = false
    error.value = null
    rawMarkdown.value = ''
    sections.value = []
    isDone.value = false
  }

  /** Registra il contesto di zona da click sul viewer (opzione C) */
  function setZoneContext(ctx: ZoneContext) {
    pendingZoneContext.value = ctx
  }

  return {
    isStreaming,
    error,
    rawMarkdown,
    sections,
    isDone,
    parsedReasoning,
    question,
    pendingZoneContext,
    startReasoning,
    reset,
    setZoneContext,
  }
}
