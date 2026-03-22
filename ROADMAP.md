# Roadmap

## Fase 0 — Studio e setup (Settimane 1-2)

### Setup progetto
- [x] Configurazione TypeScript strict in `nuxt.config.ts`
- [x] Struttura cartelle:
  ```
  src/
    components/     # Componenti Vue
    composables/    # Logica riutilizzabile (useViewer, useAnalysis...)
    workers/        # Web Worker per analisi pesante
    data/           # Database pigmenti JSON
    shaders/        # GLSL shader per WebGL
    types/          # TypeScript interfaces
    utils/          # Funzioni pure (conversioni colore, K-M math)
  ```

### Studio obbligatorio — non si può iniziare senza questo
- [ ] Leggi il paper PIGMENTO (almeno abstract + sezioni 3-5): https://arxiv.org/abs/1707.08323
  - Capire il pipeline: estrazione palette → stima K/S → weight map
- [ ] Studia il repo PIGMENTO: https://github.com/JianchaoTan/Pigmento-PaintingAnalysis
- [ ] Studia Mixbox: https://github.com/scrtwpns/mixbox
  - Come converte RGB → latent pigment space → mixed RGB
  - Prova la demo interattiva sul sito
- [ ] Studia spazio colore CIELab:
  - Perché è percettivamente uniforme (a differenza di RGB)
  - Come si calcola Delta E (distanza percettiva tra due colori)
  - Libreria: `colorjs.io`
- [ ] Consulta ColourLex per i pigmenti storici: https://colourlex.com/
- [ ] Consulta Kremer Pigmente: https://www.kremer-pigmente.com/

> **Nota**: la documentazione di tutti i concetti (CIELab, Delta E, K-M, Web Worker, IIIF)
> è nel file [GLOSSARY.md](./GLOSSARY.md), scritto per chi non ha background in teoria del colore.

### Installazione dipendenze core
```bash
pnpm add openseadragon mixbox colorjs.io d3 comlink
pnpm add -D @types/openseadragon
```
> ✅ Installate: openseadragon 6.0.2, mixbox 2.0.0, colorjs.io 0.6.1, d3 7.9.0, comlink 4.4.2
- `openseadragon` — viewer per immagini gigapixel (IIIF, DeepZoom)
- `mixbox` — pigment mixing con modello K-M
- `colorjs.io` — conversioni colore avanzate, Delta E CIE2000
- `d3` — grafici e visualizzazioni
- `comlink` — wrapper ergonomico per Web Worker (fondamentale: rende i Worker usabili senza MessageEvent raw)

### Database pigmenti (`src/data/pigments.ts`)
- [x] Definire l'interfaccia TypeScript:
  ```typescript
  interface HistoricalPigment {
    id: string                              // "ultramarine-natural"
    nameIT: string                          // "Blu oltremare naturale"
    nameEN: string                          // "Natural ultramarine"
    chemicalName: string                    // "Lazurite (Na,Ca)₈(AlSiO₄)₆(SO₄,S,Cl)₂"
    colorRGB: [number, number, number]      // Colore di riferimento [0-255]
    colorLab: [number, number, number]      // In CIELab [L, a, b]
    availableFrom: number | null            // Anno di prima disponibilità (null = antichità)
    availableTo: number | null              // Anno di obsolescenza (null = ancora usato)
    origin: string                          // "Minerale: lapislazzuli dall'Afghanistan"
    cost: 'low' | 'medium' | 'high' | 'precious'
    techniques: string[]                    // ["olio", "tempera", "affresco"]
    category: 'blue' | 'red' | 'yellow' | 'green' | 'white' | 'black' | 'brown' | 'orange' | 'violet'
    trivia: string                          // "Costava più dell'oro. Riservato al manto della Madonna."
    source: string                          // URL fonte (ColourLex, Kremer, paper accademico)
    uncertain?: boolean                     // Se i dati sono incerti, documentare perché
    km?: { K: number[]; S: number[] }       // Parametri Kubelka-Munk (assorbimento e scattering)
  }
  ```
- [ ] Popolare con almeno 40-50 pigmenti fondamentali:
  - **Antichità e Medioevo**: ocra gialla, ocra rossa, terra verde, lapislazzuli naturale, cinabro, biacca (carbonato di piombo), nero carbone, minio
  - **Rinascimento**: verderame, giallo di Napoli (antimonato di piombo), smaltino (vetro al cobalto), lacca di garanza, giallo di piombo-stagno
  - **XVII-XVIII**: blu di Prussia (1704 — data critica per la coerenza storica), giallo di cromo, lacca di carminio
  - **XIX moderno**: blu cobalto, verde smeraldo (arseniato di rame), bianco di zinco, giallo di cadmio
  - **Sintetici XIX-XX**: oltremare sintetico (1826), rosso di cadmio, bianco di titanio (1916), blu di ftalocianina

> ✅ Database creato: 27 pigmenti documentati (Rijksmuseum / Maestri Olandesi XVII sec.)
> con interfaccia TypeScript, colorLab, date storiche, fonti ColourLex, note di degrado.
> Funzioni `getPigmentsAvailableIn(year)` e `pigmentById` già implementate.

**Criterio completamento fase 0**: database JSON con 40+ pigmenti, viewer OSD funzionante, Mixbox testato con un esempio di mixing.
> ⚠️ Parziale: 27/40 pigmenti (copertura Rijksmuseum completa). Viewer OSD e test Mixbox: da fare.

---

## Fase 1 — Color Analysis Engine (Settimane 3-4)

### Introduzione ai Web Worker (per chi non li conosce)
> Un Web Worker è un thread separato del browser. Il thread principale gestisce UI e interazioni; i Worker eseguono calcoli pesanti senza bloccare l'interfaccia. Comunicano tramite messaggi (`postMessage` / `onmessage`). `comlink` astrae questa comunicazione rendendola asincrona come una normale chiamata di funzione.

- [x] Implementare il pipeline di analisi in un Web Worker (`src/workers/colorAnalyzer.ts`):
  - Usa `comlink` per esporre l'API del worker:
    ```typescript
    // src/workers/colorAnalyzer.ts
    import { expose } from 'comlink'
    // WORKER: expose rende le funzioni chiamabili dal thread principale
    // come se fossero normali funzioni async
    expose({ analyzeTile, getProgress, cancel })
    ```
  - Il worker riceve `ImageData` (dati pixel di un tile del canvas) e restituisce l'analisi

### Step 1: Estrazione palette dominante in spazio CIELab
- [x] K-means clustering in spazio CIELab (NON in RGB):
  - Converti ogni pixel da RGB → Lab usando `colorjs.io`
  - Esegui K-means con K = 6-10 (configurabile dall'utente)
  - I centroidi dei cluster sono i "colori dominanti"
  - Libreria: `ml-kmeans` o implementazione custom
  ```
  // COLOR: perché Lab e non RGB?
  // In RGB la distanza euclidea non è percettivamente uniforme:
  // due colori con la stessa distanza numerica in RGB possono sembrare
  // molto diversi o quasi identici all'occhio umano.
  // In CIELab una differenza di 1.0 (Delta E) corrisponde alla minima
  // differenza percepibile dall'occhio umano in condizioni standard.
  ```

### Step 2: Mapping centroidi → pigmenti storici
- [x] Per ogni centroide Lab, trovare il pigmento più vicino nel database:
  - Calcola Delta E CIE2000 tra centroide e ogni pigmento nel database
  - Soglie decisionali:
    - Delta E < 10: match diretto (colore molto simile al pigmento puro)
    - 10 ≤ Delta E < 25: match possibile (potrebbe essere una miscela)
    - Delta E ≥ 25: nessun match singolo (è sicuramente una miscela di pigmenti)
  - Per le miscele: prova combinazioni di 2 pigmenti dal database
    - Usa Mixbox per simulare il colore della miscela a varie proporzioni
    - Trova la coppia che minimizza Delta E con il centroide

### Step 3: Per-pixel weight map
- [x] Per ogni pixel, calcola la "appartenenza" a ciascun pigmento:
  - Usa distanza inversa dal centroide del cluster (soft assignment)
  - Output: `Float32Array` per ogni pigmento con peso 0.0-1.0 per ogni pixel
  - Questa è la struttura dati che alimenta il WebGL renderer nella Fase 2

### Step avanzato (opzionale): Kubelka-Munk completo
- [ ] Se hai i parametri K/S per i pigmenti:
  - Per ogni pixel, risolvi il problema inverso: trova i pesi che riproducono il colore osservato
  - Problema di ottimizzazione non lineare (usa gradient descent)
  - Riferimento: sezione 4 del paper PIGMENTO
  - NOTA: computazionalmente pesante. Implementa prima l'approccio semplificato.

### API del Worker (con comlink)
```typescript
// src/types/analysis.ts
interface ColorAnalyzerAPI {
  analyzeTile(imageData: ImageData, config: AnalysisConfig): Promise<TileAnalysis>
  getProgress(): number
  cancel(): void
}

interface AnalysisConfig {
  numClusters: number              // K per K-means (default: 8)
  pigmentDatabase: HistoricalPigment[]
  method: 'kmeans-lab' | 'kubelka-munk'
  artworkDate?: number             // Per filtrare pigmenti disponibili all'epoca
}

interface TileAnalysis {
  palette: PigmentMatch[]          // Pigmenti identificati con confidenza
  weightMaps: Float32Array[]       // Una Float32Array per pigmento (width × height valori)
  stats: {
    dominantPigment: string
    coverage: Record<string, number>  // pigmentId → % area
  }
}

interface PigmentMatch {
  pigment: HistoricalPigment
  confidence: number               // 0-1
  coverage: number                 // % dell'area dell'opera
  clusterCenter: [number, number, number]  // Lab del centroide
  deltaE: number                   // Distanza percettiva dal pigmento di riferimento
  isMixture: boolean
  mixtureComponents?: { pigment: HistoricalPigment; ratio: number }[]
}
```

**Criterio completamento fase 1**: dato un tile 512×512, il worker restituisce 6-8 pigmenti con weight map in < 5 secondi.
> ✅ Completata:
> - `src/utils/colorMath.ts` — `rgbToLab`, `deltaE2000` (CIE2000), `kmeansLab` (K-means++), `computeWeightMaps`
> - `src/workers/colorAnalyzer.ts` — Worker con comlink: pipeline K-means → matching ΔE → miscele Mixbox → weight map
> - `app/composables/useColorAnalyzer.ts` — bridge Vue → Worker con cache tile, progresso, errori
> - `app/composables/useViewer.ts` — composable OSD con RAF viewport tracking
> - `app/components/GigapixelViewer.vue` — wrapper con slot overlay, loading, controls
> - `app/pages/index.vue` — pagina demo: La Ronda di Notte (iiif.micr.io/PJEZO), analisi pigmenti in-browser

---

## Fase 2 — Pigment Map Viewer con WebGL (Settimane 5-6)

### Integrazione OpenSeadragon
- [ ] Istanziare OSD in un composable `useViewer`:
  - Overlay canvas che copre l'area visibile del viewer
  - L'overlay si aggiorna ad ogni `viewport-change` (zoom, pan)
  - Analisi lazy: parte solo sui tile visibili, on-demand

### Rendering WebGL delle mappe pigmento
- [ ] Shader GLSL per heatmap pigmento (`src/shaders/pigmentHeatmap.glsl`):
  ```glsl
  // Fragment shader: visualizza la weight map di un pigmento
  // uniform: colore del pigmento (RGB), opacità globale, soglia minima
  // texture: weight map come float texture
  // Per ogni frammento:
  //   weight = texture2D(weightMap, vTexCoord).r
  //   if (weight > threshold) output = vec4(pigmentColor, weight * opacity)
  //   else discard
  ```
  - Usa `WebGL2RenderingContext` con `OES_texture_float` per le weight map
  - Ogni pigmento = un layer WebGL separato (blend mode: additive per sovrapposizioni)
  - Perché WebGL e non Canvas 2D: con Canvas 2D fillRect per-pixel è lento su tile grandi. WebGL processa tutti i pixel in parallelo sulla GPU.

### UI pannello pigmenti
- [ ] Componente `<PigmentPanel>`:
  - Lista pigmenti identificati (ordinati per % copertura)
  - Per ogni entry: swatch colore + nome + % copertura + toggle visibilità layer
  - Toggle "Mostra tutti" / "Nascondi tutti"
  - Click su pigmento: isola quel layer + apre `<PigmentCard>`

### Lente cromatica
- [ ] Cerchio che segue il mouse sull'opera:
  - Al `mousemove`: leggi i pesi dal tile corrente per il pixel sotto il cursore
  - Tooltip: "Blu oltremare naturale (68%) + Biacca (32%)"
  - Implementazione: `composable/useChromaticLens.ts`

### Caching tile
- [ ] `Map<string, TileAnalysis>` con chiave = `${tileX}_${tileY}_${zoomLevel}`
  - Controlla cache prima di avviare il worker su un tile

**Criterio completamento fase 2**: mappa pigmenti interattiva su immagine gigapixel, lente cromatica funzionante, performance > 30fps.

---

## Fase 3 — Schede pigmenti e contesto storico (Settimana 7)

### Componente `<PigmentCard>`
- [ ] Pannello laterale con:
  - Nome storico e chimico
  - Swatch colore grande
  - Timeline visuale: periodo di disponibilità del pigmento
  - Provenienza e costo storico
  - Tecniche pittoriche compatibili
  - Curiosità storica
  - Link a fonte esterna (ColourLex, Kremer)

### Coerenza storica (feature fondamentale)
- [ ] Composable `useHistoricalCoherence`:
  - Input: data dell'opera (dall'utente o dai metadati IIIF) + lista pigmenti trovati
  - Per ogni pigmento, calcola lo stato:
    ```typescript
    type CoherenceStatus =
      | 'coherent'      // Pigmento disponibile all'epoca ✅
      | 'possible'      // Introdotto poco prima, uso raro ⚠️
      | 'anachronistic' // Non ancora inventato all'epoca ❌
      | 'unknown'       // Data dell'opera non specificata
    ```
  - Esempio output: `{ pigment: 'prussian-blue', status: 'anachronistic', reason: 'Il Blu di Prussia è disponibile solo dal 1704. Opera datata 1530.' }`
  - DISCLAIMER obbligatorio in ogni vista: "Questo è un indizio computazionale, non una prova di autenticità o falsificazione."

### Palette dell'opera
- [ ] Pie chart con % di area per pigmento (d3)
- [ ] Bar chart orizzontale con swatch e percentuali
- [ ] Export come PNG o JSON

**Criterio completamento fase 3**: schede informative per tutti i pigmenti, coerenza storica funzionante con semaforo visivo.

---

## Fase 4 — Confronto e narrazione (Settimana 8)

### Confronta con artista
- [ ] Database palette tipiche per 10-15 artisti (da letteratura):
  - Caravaggio: palette scura, bitume, biacca, lacca di garanza, ocre
  - Botticelli: tempera, colori chiari, oltremare naturale, verderame, lacca
  - Vermeer: oltremare, giallo di piombo-stagno, lacca, biacca
  - Monet: pigmenti moderni, cadmio giallo/rosso, cobalto, bianco di zinco
  - Rembrandt: ocre, bitume, biacca, lacca di garanza, nero avorio
- [ ] Visualizzazione: due palette affiancate (opera analizzata vs palette tipica dell'artista)
- [ ] Score di similarità 0-100 basato su sovrapposizione dei pigmenti

### Distribuzione spaziale
- [ ] Seleziona pigmento → heatmap di densità sovrapposta all'opera
- [ ] Annotazioni manuali: "Il lapislazzuli è concentrato nel manto della Madonna"

### Color Journey
- [ ] Narrazione guidata automatica:
  - Ordina pigmenti per "interesse" (più raro o anomalo = più interessante)
  - Sequenza: zoom sul dettaglio → evidenzia pigmento → mostra scheda → prosegui

**Criterio completamento fase 4**: confronto con 5 artisti funzionante, distribuzione spaziale interattiva.

---

## Fase 5 — AI Reasoning Chain (Settimana 9)

### Filosofia del modulo AI
L'AI non fa commenti estetici. Riceve la lista dei pigmenti identificati dal motore K-M e produce un **reasoning chain strutturato** che simula il ragionamento di uno storico dell'arte esperto di materiali. Il modello non dice "i colori sono belli" — dice "il Blu di Prussia in un'opera del 1530 è anomalo: tre ipotesi possibili."

### Input → Output
```typescript
// src/types/aiReasoning.ts
interface AIReasoningInput {
  pigments: PigmentMatch[]         // Output del motore K-M (Fase 1)
  artworkDate?: number             // Anno dell'opera (se noto)
  artworkTitle?: string
  artistName?: string
  technique?: string               // "olio su tela", "tempera su tavola"...
  coherenceReport: CoherenceReport // Output della Fase 3
}

interface AIReasoningOutput {
  steps: ReasoningStep[]
  anomalies: Anomaly[]
  instrumentalSuggestions: InstrumentalSuggestion[]
  techniqueSummary: string         // Analisi della tecnica pittorica
  workshopComparison?: string      // Confronto con la bottega/periodo
}

interface ReasoningStep {
  type: 'historical_coherence' | 'technique_analysis' | 'workshop_comparison' | 'anomaly_detection'
  finding: string                  // "Il Blu di Prussia è presente in un'opera datata 1530."
  reasoning: string                // "Il Blu di Prussia fu sintetizzato per la prima volta nel 1704..."
  confidence: 'high' | 'medium' | 'low'
}

interface Anomaly {
  pigment: HistoricalPigment
  description: string              // Descrizione dell'anomalia
  hypotheses: string[]             // SEMPRE almeno 2-3 ipotesi alternative
  // Esempio:
  // description: "Blu di Prussia rilevato in opera del 1530"
  // hypotheses: [
  //   "1. Datazione dell'opera errata o imprecisa",
  //   "2. Restauro o ridipintura posteriore al 1704",
  //   "3. Errore nell'analisi K-M (metamerismo: altro pigmento blu con RGB simile)"
  // ]
  recommendedVerification: string  // "XRF sull'area del cielo per identificare l'elemento chimico"
}

interface InstrumentalSuggestion {
  technique: string                // "Spettroscopia Raman"
  reason: string                   // "Per distinguere lapislazzuli da smaltino (stesso blu, diversa firma Raman)"
  priority: 'high' | 'medium' | 'low'
  targetArea?: string              // "Zona del manto, pixel (340, 210)-(680, 450)"
}
```

### Implementazione con Claude API
- [ ] Server route Nuxt (`server/api/reasoning.post.ts`):
  - Riceve `AIReasoningInput` serializzato
  - Costruisce un system prompt che inquadra il modello come "storico dell'arte specializzato in materiali pittorici e analisi tecnica"
  - Il prompt include: lista pigmenti trovati, date, report coerenza storica, palette artista (se disponibile)
  - Richiede output JSON strutturato seguendo `AIReasoningOutput`
  - Usa streaming per mostrare il reasoning chain progressivamente all'utente
- [ ] Componente `<ReasoningChain>`:
  - Mostra i `ReasoningStep` uno alla volta mentre arrivano (streaming)
  - Ogni step ha un'icona per il tipo (⚠️ anomalia, 🔬 suggerimento strumentale, 📚 confronto storico)
  - Le `Anomaly` sono espanse con le ipotesi in un accordion
  - Le `InstrumentalSuggestion` sono ordinate per priorità

### Prompt engineering
- [ ] Il system prompt deve istruire il modello a:
  - NON fare valutazioni estetiche ("il dipinto è bello", "i colori sono armoniosi")
  - Formulare SEMPRE ipotesi alternative per ogni anomalia (mai conclusioni nette)
  - Citare sempre la fonte della datazione del pigmento (es: "il Blu di Prussia fu sintetizzato da Diesbach a Berlino nel 1704")
  - Segnalare esplicitamente i limiti del metodo computazionale
  - Suggerire la tecnica strumentale specifica (non generica) per ogni verifica
  - Usare terminologia tecnica corretta (non "colore blu" ma "pigmento blu, probabilmente lapislazzuli")

### "Chiedi al dipinto" (prompt box)
- [ ] Input testuale: "Di cosa è fatto il cielo in questa zona?"
- [ ] Il tool identifica l'area di interesse (click + drag sull'opera) + legge i pigmenti dominanti in quella zona dalle weight map
- [ ] Risposta AI: "L'area selezionata mostra Blu oltremare naturale (45%) come pigmento dominante, con Biacca (35%) come agente schiarente e tracce di Nero carbone (10%) probabilmente per abbassare la luminosità. Questa combinazione è coerente con la tecnica veneziana del XVI secolo."

**Criterio completamento fase 5**: reasoning chain strutturato su 2+ opere, "chiedi al dipinto" funzionante, almeno un'anomalia con 3 ipotesi su ogni opera di test.

---

## Fase 6 — Demo e documentazione (Settimana 10)

### Demo con 3 opere
- [ ] Opera rinascimentale: Botticelli (palette storica ben documentata in letteratura)
- [ ] Opera barocca: Caravaggio (palette scura, bitume controverso)
- [ ] Opera impressionista: Monet (pigmenti moderni, buon caso di test coerenza storica)

### Validazione risultati
- [ ] Per ogni opera demo: tabella comparativa
  | Pigmento trovato da ChromaScope | Pigmento noto da letteratura | Match | Note |
  | --- | --- | --- | --- |
  | Blu oltremare naturale | Blu oltremare (confermato XRF) | ✅ | Delta E 4.2 |
  | Verderame | Verderame (confermato) | ✅ | Miscela con lacca |
  | Bianco di titanio | Biacca (piombo) | ❌ | Errore K-M: metamerismo |

### Sezione "La scienza" nell'app
- [ ] Spiegazione accessibile (non tecnica) di:
  - Kubelka-Munk in parole semplici
  - Cosa sono K-means e Delta E
  - Perché RGB non basta per analizzare i pigmenti

### Deploy
- [ ] Configurazione Vercel (nuxt.config.ts + vercel.json)
- [ ] Variabili d'ambiente: `ANTHROPIC_API_KEY` su Vercel Dashboard
- [ ] GitHub repository pubblico con LICENSE MIT

### Documento "Contesto culturale" (3 pagine)
- [ ] Cos'è l'analisi dei pigmenti nella storia dell'arte
- [ ] Il modello K-M in parole semplici
- [ ] Differenza tra analisi computazionale (ChromaScope) e strumentale
- [ ] Possibili evoluzioni: integrazione con dati multispettrali reali

**Criterio completamento fase 6**: 3 demo validate, deploy live su Vercel, README con disclaimer e tabella di validazione.
