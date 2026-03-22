# ChromaScope — AI Reasoning Chain (Fase 5)

## Filosofia dell'intervento AI

ChromaScope usa l'intelligenza artificiale come uno **storico dell'arte computazionale**, non come un oracolo. L'AI non "vede" il dipinto — ragiona su dati già elaborati (palette pigmenti, score ΔE, coerenza storica) e produce un'interpretazione critica di quei dati.

### Principi guida

**1. Ipotesi, non conclusioni**
Ogni output AI è formulato in termini di possibilità: "suggerisce", "è coerente con", "potrebbe indicare". L'analisi RGB non può superare il limite del metamerismo (due colori identici possono essere prodotti da pigmenti diversi). L'AI deve essere la prima a riconoscerlo.

**2. Ragionamento situato nel periodo storico**
L'AI assume il ruolo di uno storico specializzato in pittura olandese del XVII secolo. Conosce le prassi documentate (Rembrandt usava una base di biacca e ocra, poi velature di terra d'ombra), sa riconoscere una preparazione tipica da una zona di luce diretta, sa cosa significherebbe trovare un blu oltremare accanto a un Blu di Prussia (anacronismo).

**3. Trasparenza metodologica obbligatoria**
Ogni risposta AI include sempre una sezione "Nota metodologica" che ricorda i limiti del metodo computazionale e suggerisce le verifiche strumentali appropriate (spettroscopia Raman, XRF, imaging iperspettrale).

**4. No commenti estetici o di valore**
L'AI non giudica la qualità del dipinto, non usa aggettivi come "bellissimo" o "straordinario". Si occupa di materia, tecnica e storia.

---

## Architettura tecnica

### Multi-provider con endpoint OpenAI-compatible

ChromaScope supporta tre provider AI tramite un'architettura unificata:

```
AI_PROVIDER=groq     → openai SDK con baseURL https://api.groq.com/openai/v1
AI_PROVIDER=openai   → openai SDK con baseURL default
AI_PROVIDER=claude   → @anthropic-ai/sdk (Anthropic)
```

Il provider di default è **Groq** — gratuito, latenza bassa, modello `llama-3.3-70b-versatile` che eccelle nel ragionamento strutturato.

La variabile `AI_BASE_URL` consente di puntare a qualsiasi endpoint OpenAI-compatible (LM Studio, Ollama, Together AI, Perplexity) senza modificare il codice.

### Variabili d'ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `AI_PROVIDER` | `groq` | Provider: `groq` \| `openai` \| `claude` |
| `AI_API_KEY` | — | API key per Groq/OpenAI |
| `ANTHROPIC_API_KEY` | — | API key per Claude (solo se `AI_PROVIDER=claude`) |
| `AI_BASE_URL` | default provider | Override base URL (endpoint OpenAI-compatible) |
| `AI_MODEL` | default provider | Override modello |

### Streaming SSE

La risposta AI viene trasmessa progressivamente via **Server-Sent Events**:

```
server/api/reasoning.post.ts  →  event.node.res.write(`data: {...}\n\n`)
app/composables/useAiReasoning.ts  →  fetch() + ReadableStream reader
app/components/ReasoningChain.vue  →  rendering progressivo per sezione
```

Ogni evento SSE ha il formato:
```json
{ "type": "delta", "text": "..." }   // testo incrementale
{ "type": "done" }                    // fine streaming
{ "type": "error", "error": "..." }  // errore
```

### Prompt engineering

Il system prompt definisce il "personaggio" AI:
- Storico dell'arte specializzato in pittura olandese XVII sec.
- Regole esplicite: ipotesi, non conclusioni; citare sempre i limiti metodologici; no commenti estetici.
- Formato output obbligatorio: sezioni markdown `## Titolo` per il rendering progressivo.

Le sezioni standard dell'output:
1. **Lettura della palette** — analisi pigmenti, plausibilità storica, relazioni
2. **Tecnica e prassi** — tecnica pittorica suggerita dalla distribuzione
3. **Anomalie e ipotesi** — pigmenti inattesi, possibili spiegazioni
4. **Verifiche suggerite** — analisi strumentali o ricerche documentali
5. **Nota metodologica** — disclaimer obbligatorio

### Input strutturato

L'AI riceve un JSON con:
```typescript
{
  question?: string           // domanda opzionale dell'utente
  artworkDate: number         // anno opera
  artworkTitle: string        // titolo + artista
  palette: [{                 // pigmenti identificati
    nameIT, nameEN,
    coverage,                 // copertura % nell'area
    deltaE,                   // distanza percettiva dal pigmento di riferimento
    coherenceStatus,          // coherent | possible | anachronistic | unknown
    availableFrom,            // anno prima disponibilità
    isMixture,                // se è una miscela
    mixtureComponents         // componenti miscela
  }]
  zoneContext?: {             // zona selezionata (opzionale)
    x, y,                    // coordinate normalizzate (0–1)
    label,                   // descrizione testuale
    pigmentWeights           // pesi pigmenti nella zona specifica
  }
}
```

### "Chiedi al dipinto" — Opzione C

L'utente può:
1. **Scrivere** una domanda nel campo testuale
2. **Cliccare** sull'overlay WebGL per selezionare una zona specifica

Al click sull'overlay, il composable legge i `weightMaps` del `lastAnalysis`:
```typescript
const weight = lastAnalysis.weightMaps[i][py * W + px]
```
Questo restituisce il peso di ogni pigmento nel pixel cliccato — un campione puntuale della distribuzione materica dell'opera in quella zona.

### Parsing markdown progressivo

Durante lo streaming, il testo accumulato viene parsato in tempo reale cercando i pattern `## Titolo`:
```typescript
function parseMarkdownSections(markdown: string): AIReasoningSection[]
```
Ogni sezione appare nel UI non appena il modello la completa, senza attendere la risposta integrale.

---

## Modelli consigliati per provider

| Provider | Modello default | Note |
|----------|----------------|------|
| Groq | `llama-3.3-70b-versatile` | Gratuito, ottimo ragionamento, latenza ~2s |
| OpenAI | `gpt-4o-mini` | Economico, ottima qualità |
| Claude | `claude-haiku-4-5-20251001` | Veloce, conciso |

Per ragionamenti più approfonditi (analisi complesse, domande tecniche):
- Groq: `llama-3.1-70b-versatile` o `mixtral-8x7b-32768`
- OpenAI: `gpt-4o`
- Claude: `claude-sonnet-4-6`

---

## Limiti e avvertenze

- L'AI non "vede" il dipinto: ragiona solo sui dati numerici della palette
- Il metamerismo limita la certezza dell'identificazione pigmenti da RGB
- La qualità del ragionamento dipende dalla qualità dell'analisi a monte (K-means + matching)
- Zone con K alto possono produrre palette più frammentate → ragionamento meno coerente
- I risultati AI sono sempre ipotesi che richiedono verifica strumentale per essere confermati
