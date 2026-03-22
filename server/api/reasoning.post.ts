/**
 * @description Route server Nuxt per la catena di ragionamento AI (Fase 5).
 *
 * Architettura multi-provider:
 * - Groq (default, gratuito): openai SDK con baseURL https://api.groq.com/openai/v1
 * - OpenAI: openai SDK con baseURL default
 * - Claude: @anthropic-ai/sdk
 *
 * Variabili d'ambiente:
 * - AI_PROVIDER: 'groq' | 'openai' | 'claude'  (default: 'groq')
 * - AI_API_KEY: API key per Groq o OpenAI
 * - AI_BASE_URL: override base URL per endpoint OpenAI-compatibili
 * - AI_MODEL: override modello (altrimenti usa default per provider)
 * - ANTHROPIC_API_KEY: API key per Claude (solo se AI_PROVIDER=claude)
 *
 * Streaming: SSE via event.node.res.write() con formato { type, text }.
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { AIReasoningInput, AIProviderConfig, AIProvider } from '#src/types/aiReasoning'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; baseUrl?: string }> = {
  groq: { model: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1' },
  openai: { model: 'gpt-4o-mini' },
  claude: { model: 'claude-haiku-4-5-20251001' },
}

function getProviderConfig(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider | undefined) ?? 'groq'
  const defaults = PROVIDER_DEFAULTS[provider]

  const apiKey =
    provider === 'claude'
      ? (process.env.ANTHROPIC_API_KEY ?? '')
      : (process.env.AI_API_KEY ?? '')

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL ?? defaults.model,
    baseUrl: process.env.AI_BASE_URL ?? defaults.baseUrl,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT ENGINEERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Costruisce il system prompt per il ragionamento storico-artistico.
 * L'AI assume il ruolo di uno storico dell'arte che ragiona sulla materia del dipinto.
 * DISCLAIMER: sempre ipotesi, mai conclusioni definitive — lo richiede il contesto scientifico.
 */
function buildSystemPrompt(): string {
  return `Sei uno storico dell'arte specializzato in pittura olandese del XVII secolo e in tecniche materiali.
Ragioni sulla base di dati computazionali (K-means, Delta E, modello Kubelka-Munk applicato a immagini RGB).

REGOLE DI RAGIONAMENTO:
1. Formula sempre IPOTESI, non conclusioni definitive. Usa "suggerisce", "potrebbe indicare", "è coerente con", "merita verifica".
2. Cita sempre il limite metodologico: i dati derivano da analisi RGB, non da spettroscopia strumentale.
3. Quando un pigmento è anacronistico, ragiona sulle possibili spiegazioni (restauro, errore di datazione, incertezza modello).
4. Quando trovi miscele plausibili, collega alla tecnica del periodo e alla prassi documentata dell'artista.
5. Non fare mai commenti estetici o di valore sul dipinto.
6. Struttura SEMPRE la risposta con sezioni markdown ## (vedi formato).

FORMATO OUTPUT (obbligatorio):
## Lettura della palette
[Analisi dei pigmenti trovati, loro plausibilità storica, relazioni tra loro]

## Tecnica e prassi
[Considerazioni sulla tecnica pittorica suggerita dalla distribuzione pigmenti]

## Anomalie e ipotesi
[Pigmenti inattesi, possibili spiegazioni, cosa indicano per la ricerca]

## Verifiche suggerite
[Analisi strumentali o ricerche documentali che potrebbero confermare o smentire]

## Nota metodologica
[Disclaimer obbligatorio sui limiti del metodo computazionale]

Se l'utente fa una domanda specifica, rispondi a quella domanda prioritariamente mantenendo il formato.`
}

function buildUserPrompt(input: AIReasoningInput): string {
  const paletteLines = input.palette.map(p => {
    const status =
      p.coherenceStatus === 'anachronistic'
        ? '⚠ ANACRONISTICO'
        : p.coherenceStatus === 'possible'
          ? '~ adozione precoce'
          : '✓'
    const mixture = p.isMixture
      ? ` (miscela: ${p.mixtureComponents?.map(m => `${m.nameIT} ${Math.round(m.ratio * 100)}%`).join(' + ')})`
      : ''
    const avFrom = p.availableFrom ? ` [disponibile dal ${p.availableFrom}]` : ''
    return `- ${p.nameIT} (${p.nameEN}): copertura ${p.coverage.toFixed(1)}%, ΔE ${p.deltaE.toFixed(1)}, coerenza: ${status}${mixture}${avFrom}`
  }).join('\n')

  const zoneInfo = input.zoneContext
    ? `\nZona selezionata: "${input.zoneContext.label}" (x=${input.zoneContext.x.toFixed(2)}, y=${input.zoneContext.y.toFixed(2)})`
    : ''

  const question = input.question
    ? `\nDomanda dell'utente: "${input.question}"`
    : ''

  return `Opera: ${input.artworkTitle} (${input.artworkDate})
${zoneInfo}

Palette identificata computazionalmente:
${paletteLines}
${question}

Ragiona sulla palette secondo il format richiesto.`
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sseWrite(res: NodeJS.WritableStream, event: { type: string; text?: string; error?: string }) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody<AIReasoningInput>(event)
  const config = getProviderConfig()

  // Validazione base
  if (!config.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI API key non configurata. Imposta AI_API_KEY (o ANTHROPIC_API_KEY per Claude).',
    })
  }

  // Configura headers SSE
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const res = event.node.res
  res.flushHeaders?.()

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(body)

  try {
    if (config.provider === 'claude') {
      await streamClaude(res, config, systemPrompt, userPrompt)
    } else {
      await streamOpenAICompat(res, config, systemPrompt, userPrompt)
    }
    sseWrite(res, { type: 'done' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    sseWrite(res, { type: 'error', error: message })
  } finally {
    res.end()
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: Groq / OpenAI (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────────────────────

async function streamOpenAICompat(
  res: NodeJS.WritableStream,
  config: AIProviderConfig,
  system: string,
  user: string,
) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  })

  const stream = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: true,
    max_tokens: 1500,
    temperature: 0.4,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) {
      sseWrite(res, { type: 'delta', text })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: Claude (Anthropic SDK)
// ─────────────────────────────────────────────────────────────────────────────

async function streamClaude(
  res: NodeJS.WritableStream,
  config: AIProviderConfig,
  system: string,
  user: string,
) {
  const client = new Anthropic({ apiKey: config.apiKey })

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: user }],
    temperature: 0.4,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      sseWrite(res, { type: 'delta', text: event.delta.text })
    }
  }
}
