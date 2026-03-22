# ChromaScope — Pigment Explorer per opere d'arte

## Cos'è
ChromaScope è un tool web sperimentale che analizza un'immagine gigapixel di un dipinto per identificare computazionalmente i pigmenti che l'artista ha probabilmente usato e mostrare la loro distribuzione spaziale sull'opera. Non si limita a estrarre i "colori dominanti" (qualsiasi app lo fa): decompone l'immagine nella sua materia fisica — i pigmenti — usando un modello fisico di miscelazione della luce (Kubelka-Munk).

## Cosa NON è (disclaimer importante)

ChromaScope è uno strumento computazionale sperimentale basato su modelli fisici applicati a immagini RGB. **Non è e non sostituisce un'analisi strumentale** (spettroscopia Raman, fluorescenza X, imaging iperspettrale) che richiede hardware dedicato e personale specializzato.

I risultati sono **plausibili ma non definitivi**: lo stesso colore RGB può essere prodotto da pigmenti diversi (metamerismo), e il modello non può distinguere tra miscele ambigue senza dati spettrali. Per un'identificazione certa dei pigmenti, è necessaria un'analisi di laboratorio.

Questa onestà è il punto di forza di ChromaScope: offre una prima esplorazione accessibile a tutti, indicando dove e cosa approfondire con le tecniche professionali.

## A chi è rivolto

### Appassionati d'arte e divulgatori
- **Curiosi** che vogliono capire "di cosa è fatto" un dipinto, non solo come appare
- **Studenti** di storia dell'arte che studiano le tecniche pittoriche e i materiali storici
- **Divulgatori** che creano contenuti sulla materia dell'arte (video, blog, social)

### Professionisti e ricercatori
- **Storici dell'arte** che analizzano la tavolozza di un artista e la confrontano con il suo periodo
- **Restauratori** che vogliono una prima analisi computazionale rapida prima delle indagini strumentali
- **Curatori** che preparano materiali didattici sulla tecnica dei dipinti in collezione
- **Ricercatori in Digital Humanities** che studiano computazionalmente la materia dell'arte

## Perché esiste — il problema

Quando guardiamo un dipinto, vediamo colori. Ma quei colori sono il risultato di pigmenti fisici — polveri minerali, terre, composti chimici — mescolati e stesi sulla tela. I pigmenti non si mescolano come la luce: blu + giallo nel mondo dei pigmenti fa verde (miscelazione sottrattiva), non bianco (miscelazione additiva, come in RGB). Per questo i normali tool di analisi colore, che lavorano in RGB, non possono dire nulla di significativo sulla materia di un dipinto.

ChromaScope risolve questo problema usando il modello di **Kubelka-Munk**, un modello fisico che descrive come i pigmenti assorbono e diffondono la luce. Dato un'immagine RGB, il tool ricostruisce una decomposizione plausibile in pigmenti fisici e mostra dove ciascun pigmento è stato usato.

## Come funziona
1. **Carica** un'immagine gigapixel (IIIF URL)
2. **Naviga** l'opera con zoom e pan fino alla zona di interesse
3. **Analisi**: K-means in spazio CIELab → matching Delta E verso il database pigmenti → weight map per pixel
4. **Overlay heatmap**: per ogni pigmento identificato, un layer WebGL colorato mostra dove è presente (toggle visibilità, slider opacità). Hover su un pigmento → **Evidenzia selezionato** attenua gli altri layer; **Contorni** mostra solo il bordo della regione al posto del fill
5. **Scheda pigmento**: clicca su un pigmento per leggere formula chimica, timeline storica, provenienza, costo, pittori documentati
6. **Coerenza storica**: l'app segnala automaticamente pigmenti anacronistici rispetto alla datazione dell'opera
7. **Confronto artisti**: score Jaccard tra i pigmenti trovati e le palette tipiche documentate (Rembrandt, Vermeer, Frans Hals…)
8. **AI reasoning** *(Fase 5)*: premi "Analisi storica AI" (o poni una domanda libera, o clicca su una zona del viewer) — il modello ragiona come uno storico dell'arte: legge la palette, interpreta le anomalie, formula ipotesi, suggerisce verifiche strumentali. Risposta in streaming progressivo.

## La scienza dietro il tool

### Il modello Kubelka-Munk
Negli anni '30, Kubelka e Munk descrissero matematicamente come uno strato di materiale (pittura, carta, tessuto) assorbe e diffonde la luce. Il modello usa due parametri per ogni pigmento: **K** (assorbimento) e **S** (scattering), definiti per ogni lunghezza d'onda della luce visibile. Conoscendo K e S di un set di pigmenti, si può calcolare il colore risultante dalla loro miscelazione a diverse proporzioni.

ChromaScope fa il processo inverso: dato il colore osservato (RGB), cerca la combinazione di pigmenti noti (con K e S dal database) che produce quel colore.

### Riferimenti scientifici
- Tan et al., "Pigmento: Pigment-Based Image Analysis and Editing", IEEE TVCG 2019
- Kubelka & Munk, "Ein Beitrag zur Optik der Farbanstriche", 1931
- Mixbox: "Practical Pigment Mixing for Digital Painting", ACM SIGGRAPH 2021

## Tecnologie
- **Framework**: Nuxt 4 (Vue 3) · TypeScript strict · pnpm
- **Viewer gigapixel**: OpenSeadragon (IIIF)
- **Analisi colore**: Web Worker + comlink — K-means in CIELab, Delta E CIE2000, weight map Float32Array
- **Rendering mappe pigmento**: WebGL2 — shader GLSL R32F texture, alpha blending per-layer
- **Pigment mixing**: Mixbox (modello K-M per simulazione miscele)
- **Spazi colore**: colorjs.io (RGB → CIELab, Delta E CIE2000)
- **Coerenza storica**: logica custom su `availableFrom`/`availableTo` con finestre di adozione
- **Confronto artisti**: Jaccard similarity su palette documentate da fonti accademiche
- **Grafici + export**: CSS puro (barre) + export SVG/JSON
- **AI reasoning chain**: multi-provider (Groq default / OpenAI / Claude) · streaming SSE · `openai` SDK + `@anthropic-ai/sdk` · prompt engineering storico dell'arte
- **Deploy**: Vercel · Nitro auto-detect · Serverless Functions per API · `runtimeConfig` per chiavi server-side
- **Validazione**: tabella comparativa ChromaScope vs letteratura strumentale (La Ronda di Notte) — vedi `VALIDATION.md`

## Opera demo

**La Ronda di Notte** — Rembrandt van Rijn, 1642
- Olio su tela · 379.5 × 453.5 cm · Rijksmuseum, Amsterdam
- IIIF: `https://iiif.micr.io/PJEZO/info.json` (14.645 × 12.158 px, via Micrio/Q42)
- Anno usato per il filtro pigmenti: 1642 — esclude automaticamente pigmenti sintetizzati dopo (es. Blu di Prussia, 1704)

## Stato sviluppo

| Fase | Descrizione | Stato |
|------|-------------|-------|
| Fase 0 | Studio, setup, database pigmenti | ✅ Completata |
| Fase 1 | Color Analysis Engine (Worker K-means + K-M) | ✅ Completata |
| Fase 2 | Pigment Map Viewer WebGL | ✅ Completata |
| Fase 3 | Schede pigmenti + coerenza storica | ✅ Completata |
| Fase 4 | Confronto artista + narrazione | ✅ Completata |
| Fase 5 | AI Reasoning Chain | ✅ Completata |
| Fase 6 | Validazione, La scienza, deploy | ✅ Completata |

## Licenza
MIT
