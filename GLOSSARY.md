# Glossario ChromaScope

Questo glossario spiega i termini tecnici usati nel codice e nella documentazione di ChromaScope.
È pensato per chi non ha background in teoria del colore, chimica dei pigmenti o computer grafica.
Ogni termine è scritto in modo da essere comprensibile sia da uno sviluppatore che da uno storico dell'arte.

---

## Teoria del colore e spazi colore

**RGB (Red, Green, Blue)**
Il modo in cui i monitor rappresentano i colori: tre valori numerici (rosso, verde, blu) da 0 a 255.
È uno spazio colore *additivo* — sommare i valori aggiunge luce. Non riflette come funzionano i pigmenti fisici.
Limite principale: la distanza numerica tra due colori RGB non corrisponde alla differenza percepita dall'occhio umano.

**CIELab (o L\*a\*b\*)**
Spazio colore tridimensionale progettato dalla Commissione Internazionale dell'Illuminazione (CIE) per essere *percettivamente uniforme*:
una differenza numerica di 1.0 corrisponde approssimativamente alla minima differenza percepibile dall'occhio umano.
- **L** = Luminosità (0 = nero puro, 100 = bianco puro)
- **a** = Asse rosso–verde (valori positivi = rosso, negativi = verde)
- **b** = Asse giallo–blu (valori positivi = giallo, negativi = blu)

Perché usiamo Lab invece di RGB: l'analisi dei pigmenti deve misurare quanto due colori sono *visivamente* simili,
non quanto sono simili numericamente. In RGB, due colori "lontani" numericamente possono sembrare quasi identici.
In Lab, la distanza euclidea riflette la percezione reale.

**Delta E (ΔE)**
Misura numerica della distanza percettiva tra due colori in CIELab.
Calcolata con la formula CIE2000 (più accurata della semplice distanza euclidea, specialmente per i grigi e i blu).
Valori di riferimento:
- ΔE < 1.0 → differenza impercettibile all'occhio umano (JND: Just Noticeable Difference)
- ΔE 1–3 → differenza piccola, percepibile solo da osservatori esperti
- ΔE 3–5 → differenza moderata, visibile con confronto diretto
- ΔE 5–10 → differenza grande, i due colori sembrano diversi
- ΔE > 25 → i due colori sono chiaramente in zone diverse dello spazio colore

In ChromaScope usiamo ΔE per decidere se un pixel "assomiglia" a un pigmento del database:
ΔE < 10 = match diretto; ΔE > 25 = il pixel è probabilmente una miscela di pigmenti.

**Illuminante D65**
La sorgente di luce di riferimento standard per i display moderni (simula la luce diurna a 6500K).
Tutte le conversioni RGB → Lab nel progetto usano D65 come riferimento.
Motivo: i dati di riflessione spettrale dei pigmenti sono misurati in condizioni D65.

**Miscelazione additiva**
Come si mescolano le *luci* colorate (monitor, proiettori, LED).
Rosso + Verde = Giallo. Rosso + Verde + Blu = Bianco.
Non si applica ai pigmenti fisici.

**Miscelazione sottrattiva**
Come si mescolano i *pigmenti* fisici. Ogni pigmento "sottrae" (assorbe) certe lunghezze d'onda dalla luce.
Il colore risultante è ciò che rimane dopo l'assorbimento.
Blu + Giallo = Verde (non bianco come in additivo).
Per questo non si può analizzare la materia pittorica lavorando solo in RGB.

---

## Modello Kubelka-Munk

**Kubelka-Munk (K-M)**
Modello fisico sviluppato da Paul Kubelka e Franz Munk nel 1931 per descrivere come uno strato di materiale
(pittura, carta, tessuto) interagisce con la luce. Ogni pigmento è descritto da due parametri:

- **K** (coefficiente di assorbimento): quanto il pigmento assorbe la luce a una data lunghezza d'onda.
  Alto K → il pigmento appare scuro/opaco a quella lunghezza d'onda.
- **S** (coefficiente di scattering): quanto il pigmento diffonde (riflette) la luce.
  Alto S → il pigmento è molto coprente.

La *riflettanza* di uno strato spesso di pigmento è: `R∞ = 1 + (K/S) − √((K/S)² + 2(K/S))`

Per una miscela di pigmenti, K e S si sommano in proporzione alla concentrazione:
`K_mix = Σ(cᵢ × Kᵢ)` e `S_mix = Σ(cᵢ × Sᵢ)`

ChromaScope usa K-M per fare il *problema inverso*: dato il colore osservato (RGB), trova la combinazione
di pigmenti dal database che produce quel colore.

**Mixbox**
Libreria open-source (SIGGRAPH 2021) che implementa una versione pratica del modello K-M per la miscelazione
di pigmenti. Converte i colori RGB nello "spazio latente dei pigmenti" prima di mescolarli, poi riconverte in RGB.
Usata in ChromaScope per simulare il colore di miscele di due o più pigmenti.

**Parametri K/S spettrali**
I coefficienti K e S sono definiti per ogni lunghezza d'onda della luce visibile (400–700nm).
Nel database pigmenti, quando disponibili, sono salvati come array di 10 valori per bande di 33nm.
Fonte principale: paper PIGMENTO (Tan et al., 2019) e letteratura tecnica.

---

## Algoritmi di analisi

**K-means clustering**
Algoritmo che divide un insieme di punti (i pixel dell'immagine) in K gruppi (cluster), cercando di minimizzare
la distanza media di ogni punto dal centro del suo gruppo.
In ChromaScope: ogni pixel è rappresentato come un punto in CIELab; K-means raggruppa i pixel per colore simile.
I K centroidi risultanti sono i "colori dominanti" dell'opera.
Perché K-means in Lab e non in RGB: la distanza euclidea in Lab corrisponde alla percezione visiva.

**Centroide**
Il punto centrale di un cluster K-means: la media di tutti i punti nel gruppo.
In ChromaScope: rappresenta il "colore tipico" di un gruppo di pixel con tonalità simile.
Viene poi confrontato con i pigmenti del database per trovare il match più vicino.

**Weight map (mappa di pesi)**
Matrice `Float32Array` della stessa dimensione del tile analizzato.
Ogni valore (0.0–1.0) indica la "presenza" di un pigmento in quel pixel:
- 0.0 = il pigmento è assente in quel pixel
- 1.0 = il pigmento è dominante in quel pixel
Una weight map per ogni pigmento identificato → visualizzata come heatmap sovrapposta all'opera.

**Soft assignment**
Metodo di assegnazione dei pixel ai cluster in cui ogni pixel ha una *probabilità* di appartenere a ciascun cluster
(non solo al più vicino). Usato per calcolare le weight map: la probabilità di appartenenza è proporzionale
alla distanza inversa dal centroide.

---

## Fisica e chimica dei pigmenti

**Pigmento**
Sostanza colorante insolubile (a differenza del colorante/dye, che è solubile) dispersa nel legante.
I pigmenti pittorici sono storicamente: terre minerali (ocre), minerali macinati (lapislazzuli),
composti chimici sintetici (biacca, vermiglio sintetico), lacche organiche (lacca di garanza).

**Legante**
La sostanza che tiene il pigmento in sospensione e lo fa aderire al supporto.
Nella pittura olandese del XVII secolo: principalmente olio di lino.
Influenza il colore finale: l'olio ingiallisce nel tempo, la biacca in olio appare più calda della stessa in tempera.

**Lacca (lake)**
Pigmento organico ottenuto precipitando un colorante solubile (estratto da piante o insetti) su un substrato
insolubile (di solito allumina Al(OH)₃ o stagno). Esempi: lacca di robbia (da Rubia tinctorum),
lacca di cocciniglia (da Dactylopius coccus), lacca di indaco.
Caratteristica comune: sono quasi sempre *trasparenti* (basso S) e tendono a *sbiadire* alla luce.

**Metamerismo**
Fenomeno per cui due colori con composizione chimica diversa (pigmenti diversi) appaiono identici
sotto una certa illuminazione, ma diversi sotto un'altra.
Esempio: il blu di smaltino degradato e il grigio di biacca + nero possono avere lo stesso RGB nell'immagine,
ma sono chimicamente completissimamente diversi.
È il principale limite dell'analisi computazionale da immagine RGB: non si possono distinguere metameri
senza dati spettrali reali. Per questo ogni risultato di ChromaScope include un disclaimer.

**Degradazione**
Molti pigmenti cambiano colore nel tempo per reazioni chimiche (ossidazione, fotoreazione, idratazione):
- Smaltino: perde il blu in olio → grigio
- Verderame e resinato di rame: forma saponi di rame → marrone
- Vermiglio: può annerire per fotossidazione → nero
- Lacche organiche (robbia, cocciniglia): sbiadiscono alla luce → rosa pallido/trasparente
Conseguenza: il colore RGB rilevato nell'immagine può essere quello del pigmento *degradato*,
non dell'originale. L'analisi K-M può identificare il pigmento degradato, non quello originale.

---

## Tecnologie web

**Web Worker**
Thread JavaScript separato dal thread principale del browser. Il thread principale gestisce l'interfaccia
utente (UI, eventi, rendering); i Worker eseguono calcoli pesanti in parallelo senza bloccare la UI.
In ChromaScope: il motore K-M e K-means girano in un Worker per non bloccare l'interfaccia durante l'analisi.
Comunicano con il thread principale tramite messaggi (`postMessage` / `onmessage`).

**Comlink**
Libreria che avvolge l'API dei Web Worker rendendola trasparente: invece di gestire messaggi grezzi,
si chiama una funzione del Worker come se fosse una normale funzione asincrona (`async/await`).

**WebGL2**
API browser per la grafica accelerata dalla GPU. In ChromaScope: usata per renderizzare le heatmap
delle weight map con performance elevata. La GPU processa tutti i pixel del tile in parallelo,
a differenza del Canvas 2D che li processa uno alla volta.

**GLSL (OpenGL Shading Language)**
Linguaggio di programmazione per shader (programmi che girano sulla GPU). In ChromaScope:
il fragment shader calcola il colore di ogni pixel della heatmap in parallelo sulla GPU.

**IIIF (International Image Interoperability Framework)**
Standard aperto per la pubblicazione e lo scambio di immagini ad alta risoluzione online.
Permette di accedere a un'immagine gigapixel tile per tile senza scaricarla interamente.
Il Rijksmuseum, la British Library, gli Uffizi e migliaia di istituzioni pubblicano le loro collezioni in IIIF.
OpenSeadragon capisce nativamente il formato IIIF.

**OpenSeadragon (OSD)**
Libreria JavaScript per visualizzare immagini gigapixel nel browser con zoom fluido.
Supporta sorgenti IIIF, DeepZoom (Microsoft), e immagini tiled custom.
In ChromaScope: il viewer principale su cui si sovrappongono le heatmap WebGL dei pigmenti.

**Tile**
Frammento rettangolare (tipicamente 256×256 o 512×512 pixel) in cui un'immagine gigapixel è suddivisa
per il caricamento progressivo. OpenSeadragon carica solo i tile visibili al livello di zoom corrente.
In ChromaScope: l'analisi K-M viene eseguita tile per tile, on-demand, solo sui tile visibili.

---

## Storia dell'arte e pigmenti storici

**Tavolozza / Palette**
L'insieme dei pigmenti usati da un artista per una specifica opera.
La tavolozza di Vermeer è molto diversa da quella di Caravaggio: meno pigmenti, più costosi,
usati in modo più preciso. Analizzare la tavolozza è uno strumento di studio della tecnica pittorica.

**Coerenza storica**
Verifica che i pigmenti identificati siano stati effettivamente disponibili nell'epoca dell'opera.
Esempio: il Blu di Prussia fu sintetizzato nel 1704. La sua presenza in un'opera "del 1530" è un'anomalia
che richiede spiegazione (datazione errata, restauro successivo, errore di analisi).
ChromaScope esegue questa verifica automaticamente, ma i risultati sono *indizi*, non prove.

**Anacronismo pigmentario**
Un pigmento "fuori tempo": presente in un'opera prima della data in cui fu inventato o reso disponibile.
Non implica necessariamente una falsificazione — può essere un restauro, una ridipintura, un errore di analisi.

**Imprimatura / Ground**
Strato preparatorio applicato sulla tela o sulla tavola prima di dipingere.
Nella pittura olandese del XVII secolo: spesso chalk + colla animale su tavola,
o chalk/piombo bianco + olio su tela. Rembrandt usava anche imprimature scure (dark ground)
con terre d'ombra e nero d'ossa che influenzavano la luminosità finale dell'opera.

**Velatura / Glazing**
Strato di pigmento trasparente (solitamente una lacca organica) sovrapposto a uno strato opaco.
La luce penetra nella velatura, raggiunge il layer opaco sottostante, viene riflessa e torna attraverso
la velatura: produce una profondità luminosa che la pittura opaca non può ottenere.
Rembrandt era maestro delle velature.

**Impasto**
Pittura applicata in strato spesso, in rilievo. Opposto della velatura.
Rembrandt usava biacca in impasto spesso per le luci nei ritratti (es. i punti di luce sulle collane).
L'impasto spesso e la velatura trasparente coesistono nello stesso dipinto per effetti diversi.

---

## Analisi strumentale (per confronto con ChromaScope)

**XRF (X-ray Fluorescence)**
Tecnica non invasiva che identifica gli *elementi chimici* presenti in un pigmento bombardando la superficie
con raggi X. Rileva: piombo (biacca, giallo di piombo-stagno, minio), mercurio (vermiglio),
rame (verderame, azzurrite, smaltino), ferro (ocre), ecc.
Non distingue tra pigmenti con lo stesso elemento (es. biacca e minio sono entrambi a base di piombo).

**Spettroscopia Raman**
Tecnica che identifica il *legame molecolare* del pigmento tramite luce laser. Distingue pigmenti
che XRF non può separare: es. azzurrite vs malachite (entrambi Cu, ma firma Raman diversa),
o lapislazzuli vs smaltino (entrambi blu, ma struttura chimica completamente diversa).
Può essere eseguita in situ, senza prelievo di campione.

**HPLC (High-Performance Liquid Chromatography)**
Tecnica che identifica i pigmenti organici (lacche, coloranti) separando le molecole per massa e polarità.
È l'unico metodo che distingue con certezza lacca di robbia (alizarina) da lacca di cocciniglia
(acido carminico) da lacca di guado (luteolina). Richiede un micro-campione del pigmento.

**Imaging iperspettrale**
Tecnica che acquisisce un'immagine con decine o centinaia di bande spettrali (invece delle 3 di una fotocamera RGB).
Fornisce la firma spettrale di ogni pixel, eliminando il problema del metamerismo.
È ciò che ChromaScope *non può fare* da un'immagine RGB: è il punto di arrivo dell'analisi strumentale.

**Sezione stratigrafica**
Micro-campione prelevato dall'opera, incluso in resina e tagliato. Al microscopio ottico mostra
la sequenza degli strati pittorici (imprimatura, strati di pittura, velature).
Metodo distruttivo (richiede un prelievo, per quanto minimo).

---

## AI e reasoning

**Reasoning chain**
Sequenza esplicita di passaggi di ragionamento prodotta dal modulo AI di ChromaScope.
Ogni step è etichettato per tipo (coerenza storica, analisi tecnica, confronto bottega, anomalia),
include la fonte del ragionamento e il livello di confidenza.
Il reasoning chain non produce conclusioni nette: formula *ipotesi* con probabilità diverse.

**Anomalia pigmentaria**
Pigmento identificato dal motore K-M che non è coerente con la datazione, la tecnica o la bottega dell'opera.
Il modulo AI non dice "l'opera è falsa": formula sempre almeno 3 ipotesi alternative ordinate per plausibilità.

**Suggerimento strumentale**
Raccomandazione del modulo AI su quale tecnica di analisi strumentale usare, su quale area dell'opera,
e perché. Non è generico ("fate un'analisi"): è specifico ("XRF sulla zona del cielo per verificare
se il blu è smaltino degradato o Blu di Prussia, che implicherebbe datazione post-1704").
