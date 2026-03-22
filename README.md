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
1. **Carica** un'immagine gigapixel (IIIF URL o file locale)
2. **Analisi**: il tool decompone l'immagine nei pigmenti probabili
3. **Esplora le mappe**: per ogni pigmento, vedi dove è stato usato nell'opera
4. **Leggi il contesto**: scopri la storia, la provenienza e il costo di ogni pigmento
5. **Verifica la coerenza storica**: l'app ti dice se i pigmenti sono compatibili con la datazione dell'opera
6. **AI reasoning**: un modello AI analizza la palette come farebbe uno storico dell'arte — segnala anomalie, formula ipotesi, suggerisce cosa verificare strumentalmente

## La scienza dietro il tool

### Il modello Kubelka-Munk
Negli anni '30, Kubelka e Munk descrissero matematicamente come uno strato di materiale (pittura, carta, tessuto) assorbe e diffonde la luce. Il modello usa due parametri per ogni pigmento: **K** (assorbimento) e **S** (scattering), definiti per ogni lunghezza d'onda della luce visibile. Conoscendo K e S di un set di pigmenti, si può calcolare il colore risultante dalla loro miscelazione a diverse proporzioni.

ChromaScope fa il processo inverso: dato il colore osservato (RGB), cerca la combinazione di pigmenti noti (con K e S dal database) che produce quel colore.

### Riferimenti scientifici
- Tan et al., "Pigmento: Pigment-Based Image Analysis and Editing", IEEE TVCG 2019
- Kubelka & Munk, "Ein Beitrag zur Optik der Farbanstriche", 1931
- Mixbox: "Practical Pigment Mixing for Digital Painting", ACM SIGGRAPH 2021

## Tecnologie
- **Framework**: Nuxt 4 (Vue 3)
- **Linguaggio**: TypeScript (strict)
- **Package manager**: pnpm
- **Rendering mappe pigmento**: WebGL con shader custom (heatmap per pigmento)
- **Analisi colore**: Web Worker + comlink (pipeline K-M e K-means isolata dal thread principale)
- **Viewer gigapixel**: OpenSeadragon
- **Pigment mixing**: Mixbox (modello K-M applicato)
- **Spazi colore**: colorjs.io (RGB → CIELab, Delta E CIE2000)
- **Grafici**: D3
- **AI reasoning chain**: Claude API (Anthropic)
- **Deploy**: Vercel

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
| Fase 2 | Pigment Map Viewer WebGL | ⬜ Non iniziata |
| Fase 3 | Schede pigmenti + coerenza storica | ⬜ Non iniziata |
| Fase 4 | Confronto artista + narrazione | ⬜ Non iniziata |
| Fase 5 | AI Reasoning Chain | ⬜ Non iniziata |
| Fase 6 | Demo, validazione, deploy | ⬜ Non iniziata |

## Licenza
MIT
