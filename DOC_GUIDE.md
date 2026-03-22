# Guida alla Documentazione

## Filosofia
ChromaScope vive tra tre mondi: scienza dei materiali, storia dell'arte, e computer science. La documentazione deve essere ponte tra tutti e tre. Un restauratore deve capire come funziona l'algoritmo. Uno sviluppatore deve capire cosa sono i pigmenti. Uno storico dell'arte deve capire i limiti del modello.

**Assunzione di partenza**: il lettore del codice non conosce la teoria del colore, gli spazi colore, né il modello Kubelka-Munk. Ogni scelta tecnica che riguarda il colore deve essere spiegata nel commento, non data per scontata.

---

## Regole per l'agente

### TypeScript
- Strict mode sempre attivo (`"strict": true` in `tsconfig.json`)
- Nessun `any` — se il tipo non è chiaro, definisci un'interfaccia
- Ogni interfaccia che rappresenta un concetto del dominio (pigmento, analisi, anomalia) va in `src/types/`
- I tipi dei dati scientifici (CIELab, DeltaE, WeightMap) devono avere un commento che spiega il range e l'unità

### JSDoc
- In italiano
- Usa `@description`, `@example`, `@see` (con link a paper o risorse se rilevante)
- Esempio:
  ```typescript
  /**
   * @description Calcola la distanza percettiva tra due colori usando Delta E CIE2000.
   * Una differenza di 1.0 corrisponde alla minima differenza percepibile dall'occhio umano
   * in condizioni di illuminazione standard (JND: Just Noticeable Difference).
   * Usiamo CIE2000 invece di CIE76 perché è più accurata nelle zone di bassa saturazione.
   * @see https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
   * @param lab1 Primo colore in formato CIELab [L, a, b]
   * @param lab2 Secondo colore in formato CIELab [L, a, b]
   * @returns Delta E nel range [0, ∞). Valori pratici: < 1 impercettibile, 1-3 piccola, > 5 grande
   * @example
   * const d = deltaE2000([50, 0, 0], [50, 5, 0]) // ≈ 3.0
   */
  ```

---

## Prefissi commenti nel codice

Ogni commento tecnico deve iniziare con un prefisso che ne indica il dominio:

| Prefisso | Quando usarlo |
|----------|---------------|
| `// KM:` | Tutto ciò che riguarda il modello Kubelka-Munk (assorbimento, scattering, mixing) |
| `// COLOR:` | Conversioni tra spazi colore, calcoli Delta E, clustering |
| `// HISTORY:` | Logica di coerenza storica (date pigmenti, anacronismi) |
| `// WORKER:` | Comunicazione con Web Worker, comlink, trasferimento dati |
| `// SHADER:` | Logica GLSL, uniform, texture, blend mode |
| `// UX:` | Decisioni di interfaccia, accessibilità, feedback visivo |
| `// PERF:` | Ottimizzazioni di performance (caching, batching, lazy loading) |
| `// TODO: @faseN` | Work in progress, rimandato a una fase specifica |
| `// DISCLAIMER:` | Punti in cui il modello ha limiti noti (metamerismo, approssimazioni) |

### Esempio di commento KM completo:
```typescript
// KM: Il modello Kubelka-Munk descrive come uno strato di pittura assorbe e diffonde la luce.
// K = coefficiente di assorbimento: quanto il pigmento "mangia" la luce a quella lunghezza d'onda
// S = coefficiente di scattering: quanto il pigmento "rimanda indietro" la luce
// La riflettanza R di uno strato infinitamente spesso è: R∞ = 1 + (K/S) - √((K/S)² + 2(K/S))
// Per miscele di pigmenti, K e S si sommano linearmente per concentrazione:
// K_mix = Σ(cᵢ × Kᵢ)  dove cᵢ è la concentrazione del pigmento i
// S_mix = Σ(cᵢ × Sᵢ)
// Fonte: Kubelka & Munk, 1931; implementazione pratica: Mixbox (SIGGRAPH 2021)
```

### Esempio di commento SHADER:
```glsl
// SHADER: Visualizzazione heatmap per singolo pigmento
// Input texture: weight map come R32F (float singolo per pixel, range 0.0-1.0)
// Dove 1.0 = il pigmento è dominante in quel pixel, 0.0 = assente
// Output: colore del pigmento con alpha proporzionale al peso
// Usiamo 'discard' sotto la soglia invece di alpha=0 per evitare z-fighting
// PERF: l'operazione è eseguita in parallelo su GPU per tutti i pixel del tile
```

---

## Documentazione degli spazi colore

Ogni funzione che opera su dati colore deve avere un commento che specifica:
1. In quale spazio colore opera l'input
2. In quale spazio colore opera l'output
3. Perché è stato scelto quello spazio (e non un altro)

Formato standard:
```typescript
// COLOR: input RGB [0-255] → output CIELab [L: 0-100, a: -128..127, b: -128..127]
// Usiamo D65 come illuminante di riferimento (standard per display moderni)
// La conversione passa per XYZ: RGB → linearRGB → XYZ D65 → Lab
```

---

## Disclaimer obbligatori

### In ogni vista che mostra risultati di analisi
Aggiungi il componente `<AnalysisDisclaimer />`:
```
ℹ️ Analisi computazionale basata su modelli fisici (Kubelka-Munk).
I risultati sono plausibili ma non definitivi.
Il metamerismo — il fenomeno per cui pigmenti diversi possono produrre lo stesso
colore RGB — limita la certezza dell'identificazione.
Per un'identificazione certa dei pigmenti è necessaria un'analisi strumentale
(spettroscopia Raman, fluorescenza X, imaging iperspettrale).
```

### In ogni vista che mostra coerenza storica
```
⚠️ La presenza di un pigmento anacronistico non prova la falsificazione dell'opera.
Potrebbe indicare: un restauro successivo, un errore nella datazione dell'opera,
o un errore nell'analisi computazionale (metamerismo).
Questo strumento fornisce indizi, non prove.
```

### Nel modulo AI reasoning
```
🤖 Il reasoning AI è generato da un modello linguistico addestrato su testi di storia
dell'arte. Le ipotesi formulate sono plausibili ma devono essere verificate da un
esperto qualificato. Non citare questi risultati in contesti accademici o legali
senza validazione strumentale.
```

---

## Database pigmenti

- Ogni pigmento in `src/data/pigments.ts` deve avere:
  - `source`: URL della fonte (preferire ColourLex, Kremer, Forbes Pigments, paper peer-reviewed)
  - `uncertain: true` se un dato è incerto, con commento `// DISCLAIMER: perché incerto`
- Esempio di entry ben documentata:
  ```typescript
  {
    id: 'prussian-blue',
    nameIT: 'Blu di Prussia',
    nameEN: 'Prussian Blue',
    chemicalName: 'Ferrocianuro ferrico Fe₄[Fe(CN)₆]₃',
    availableFrom: 1704,  // HISTORY: sintetizzato accidentalmente da Diesbach a Berlino
    availableTo: null,    // ancora usato oggi
    // HISTORY: data critica per coerenza storica — nessun dipinto precedente al 1704
    // può contenere Blu di Prussia autentico
    source: 'https://colourlex.com/project/prussian-blue/',
    trivia: 'Primo pigmento sintetico moderno. Scoperto per caso da Heinrich Diesbach nel 1704 a Berlino.'
  }
  ```

---

## GLOSSARY.md

Mantenere aggiornato il file `GLOSSARY.md` con tutti i termini tecnici:

- **Kubelka-Munk**: modello fisico che descrive come uno strato di materiale (pittura, carta) assorbe (K) e diffonde (S) la luce. Permette di calcolare il colore risultante dalla miscelazione di pigmenti in modo fisicamente corretto.
- **K (assorbimento)**: coefficiente che misura quanto un pigmento assorbe la luce a una data lunghezza d'onda. Alto K = pigmento molto scuro/opaco a quella lunghezza d'onda.
- **S (scattering)**: coefficiente che misura quanto un pigmento diffonde (riflette) la luce. Alto S = pigmento molto coprente/opaco.
- **CIELab**: spazio colore tridimensionale percettivamente uniforme. L = luminosità (0=nero, 100=bianco), a = asse rosso-verde, b = asse giallo-blu. La distanza euclidea in Lab corrisponde alla differenza percettiva tra colori.
- **Delta E (ΔE)**: misura numerica della distanza percettiva tra due colori in CIELab. ΔE < 1: impercettibile, 1-3: piccola, 3-5: moderata, > 5: grande. Usiamo la formula CIE2000, più accurata della semplice distanza euclidea.
- **K-means**: algoritmo di clustering che partiziona un insieme di punti (pixel) in K gruppi, minimizzando la distanza media dal centroide del gruppo.
- **Weight map**: matrice float (Float32Array) che indica, per ogni pixel dell'immagine, la proporzione stimata di un dato pigmento. Valore 0.0 = pigmento assente, 1.0 = pigmento dominante.
- **Metamerismo**: fenomeno per cui due colori con composizione fisica diversa (pigmenti diversi) appaiono identici sotto una certa illuminazione. È il principale limite dell'analisi computazionale da immagine RGB.
- **Tavolozza / Palette**: l'insieme dei pigmenti usati dall'artista per un'opera specifica.
- **Miscelazione additiva**: come si mescolano le luci colorate (RGB). Rosso + Verde = Giallo. Non applicabile ai pigmenti.
- **Miscelazione sottrattiva**: come si mescolano i pigmenti fisici. Ogni pigmento sottrae (assorbe) certe lunghezze d'onda dalla luce. Blu + Giallo = Verde.
- **IIIF (International Image Interoperability Framework)**: standard per la pubblicazione di immagini ad alta risoluzione online. Permette a OpenSeadragon di caricare immagini gigapixel tile per tile.
- **Web Worker**: thread JavaScript separato dal thread principale del browser. Usato per eseguire calcoli pesanti (K-means, K-M) senza bloccare l'interfaccia utente.
- **Reasoning chain**: sequenza di passaggi di ragionamento espliciti prodotti dal modulo AI. Ogni step cita la fonte del ragionamento e il livello di confidenza.

---

## Struttura file documentazione

```
/
├── README.md           — Overview progetto, stack, come iniziare
├── ROADMAP.md          — Fasi di sviluppo con criteri di completamento
├── DOC_GUIDE.md        — Questo file: regole per scrivere codice documentato
├── GLOSSARY.md         — Glossario termini tecnici e artistici
└── src/
    └── data/
        └── pigments.ts — Database pigmenti annotato con fonti
```
