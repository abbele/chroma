# ChromaScope — Test manuale nel browser

Guida di test ibrida: descrizione narrativa di ogni azione + risultati attesi espliciti.
Segui i passaggi nell'ordine — ogni sezione si basa sulla precedente.

**Requisiti browser**: Chrome 80+ / Firefox 79+ / Safari 15+.
Verifica WebGL2: apri la console del browser e digita
`!!document.createElement('canvas').getContext('webgl2')` → deve restituire `true`.

```bash
pnpm dev   # poi apri http://localhost:3000
```

---

## 1. Caricamento viewer IIIF

Apri `http://localhost:3000`. Il layout si divide subito in due colonne: viewer a sinistra, pannello a destra.

Al centro del viewer compare uno spinner con "Caricamento Ronda di Notte…". Dopo qualche secondo l'immagine appare con un fade-in.

**Atteso**:
- [ ] Lo spinner scompare entro 10 secondi (dipende dalla connessione)
- [ ] L'immagine è navigabile: **scroll** per zoom, **drag** per pan
- [ ] Il pannello destro risponde ai click anche mentre navighi il viewer

**Se lo spinner non scompare**: F12 → Console → cerca errori relativi a `iiif.micr.io` o OSD.

---

## 2. Prima analisi pigmenti

Naviga sul dipinto e inquadra il **mantello rosso del capitano** (zona centrale-sinistra) — è un buon punto di partenza perché ha colori variati.

Nel pannello a destra, lascia i valori di default (K = 8, Anno = 1642) e clicca **"Analizza area visibile"**.

Il bottone passa a "Analisi in corso…" e appare una barra di progresso dorata. Dopo 3–10 secondi i risultati compaiono.

**Atteso**:
- [ ] La barra progresso avanza da 0% a 100% senza bloccarsi
- [ ] Compaiono 4–8 righe pigmento, ognuna con: swatch colorato, nome IT, formula chimica, % copertura, badge ΔE, barretta confidenza
- [ ] In fondo alla lista: "Pigmento dominante: [nome]"
- [ ] Badge ΔE verde (< 10) per i match diretti, arancio (10–25) per i match meno certi
- [ ] Le voci con badge "miscela" mostrano la formula, es. "Lacca di garanza 60% + Bianco di piombo 40%"

> Le percentuali di copertura non devono sommare esattamente a 100%: i cluster con ΔE > 25 vengono scartati perché nessun pigmento singolo li spiega in modo affidabile.

---

## 3. Cache tile

Senza muovere il viewer, clicca di nuovo **"Analizza area visibile"**.

**Atteso**:
- [ ] I risultati appaiono **istantaneamente**, senza barra di progresso
- [ ] La palette è identica alla prima analisi

Ora cambia K-means a **10** e rianalizza la stessa zona.

**Atteso**:
- [ ] Il Worker riparte (la cache usa la chiave: posizione × K)
- [ ] Compaiono più pigmenti rispetto a K=8

---

## 4. Overlay WebGL heatmap

Subito dopo l'analisi, guarda il viewer.

**Atteso**:
- [ ] Sopra il dipinto compaiono aree colorate semitrasparenti
- [ ] I colori dei layer corrispondono agli swatch dei pigmenti nel pannello (es. zona rossa = layer del colore del vermiglione o della lacca)
- [ ] Navigi liberamente e i layer rimangono visibili (si "spostano" insieme all'area analizzata, non all'immagine — è il comportamento corretto)

> Se l'overlay non appare: Console → cerca `[PigmentHeatmap]`. Potrebbe indicare che WebGL2 non è supportato.

### Toggle singolo layer

Clicca il **dot colorato** a sinistra dello swatch di un pigmento (es. Bianco di piombo).

**Atteso**:
- [ ] Il dot diventa semitrasparente
- [ ] La riga si scurisce (opacity 0.4)
- [ ] Il layer corrispondente sparisce dal viewer
- [ ] Cliccando di nuovo, il layer torna

### Mostra/Nascondi tutti

Clicca **"Nascondi tutti"** e poi **"Mostra tutti"**.

**Atteso**:
- [ ] Con "Nascondi tutti": nessun overlay sul viewer, il dipinto torna alla vista originale
- [ ] Con "Mostra tutti": tutti i layer tornano immediatamente

### Slider opacità

Usa lo slider "Overlay" sotto il viewer (visibile solo dopo un'analisi).

**Atteso**:
- [ ] A 0%: overlay completamente trasparente
- [ ] A 100%: overlay completamente opaco sulle zone ad alta concentrazione
- [ ] La modifica è in tempo reale, senza ritardo

---

## 5. PigmentCard — scheda dettaglio

Clicca sullo **swatch** (quadratino colorato) o sul **nome** di un pigmento.

Il drawer si apre da destra con un'animazione slide-in.

**Apri la scheda di "Bianco di piombo" e verifica che siano presenti**:
- [ ] Nome IT ("Bianco di piombo") + nome EN ("Lead White") nell'header
- [ ] Badge coerenza storica nell'header (dovrebbe essere **✓** per il 1642)
- [ ] Formula chimica: `2PbCO₃·Pb(OH)₂`
- [ ] Nome chimico: "Carbonato basico di piombo"
- [ ] **Timeline storica** — barra colorata che copre il periodo di disponibilità
- [ ] **Marcatore bianco** sulla timeline che indica il 1642
- [ ] Provenienza: menzione del processo "olandese" dello stack
- [ ] Badge costo: "Medio costo"
- [ ] Tag tecniche: olio, tempera, affresco
- [ ] Sezione "Usato da" con: Rembrandt, Vermeer, Frans Hals, Jan Steen, Pieter de Hooch
- [ ] Sezione "Note storiche" con la trivia
- [ ] Link "Scheda ColourLex / fonte accademica ↗" cliccabile
- [ ] Box disclaimer in fondo alla scheda

Clicca **✕** per chiudere — slide-out verso destra.

---

## 6. Coerenza storica

Con anno 1642 e la palette corrente, tutti i badge nella lista devono essere **✓** verde — il filtro storico nel Worker ha già escluso i pigmenti non disponibili.

### Simulare un anacronismo

1. Cambia "Anno opera" a **1600** nel campo del pannello
2. Analizza una zona che normalmente produce pigmenti variegati
3. Se nella palette compare un pigmento introdotto dopo il 1600 (raro con il database attuale, ma possibile con K alto), vedrai:

**Atteso**:
- [ ] Badge **✗** rosso sul pigmento anacronistico
- [ ] Alert in cima alla lista: "Pigmenti anacronistici rilevati per il 1600. Clicca su un pigmento per i dettagli."
- [ ] Aprendo la PigmentCard: badge ✗ nell'header + motivazione sotto la timeline ("È disponibile solo dal [anno]. L'opera è datata 1600.")

Per forzare un anacronismo certo: cambia l'anno a **1700** e analizza una zona azzurra — se il database produce un match con Blu di Prussia (introdotto 1704), il badge ✗ apparirà.

### Badge "possibile" (adozione precoce)

Un pigmento introdotto da meno di 20 anni rispetto all'anno dell'opera mostra **⚠** arancio invece di ✓.

**Atteso**:
- [ ] Badge ⚠ sul pigmento in questione
- [ ] Nessun alert globale (l'alert appare solo per gli anacronismi netti ✗)
- [ ] Motivazione in PigmentCard: "Fu introdotto nel [anno]. L'uso nell'anno [X] è documentato ma non ancora diffuso."

---

## 7. Grafico distribuzione e confronto artisti

Scorri il pannello verso il basso fino alla sezione **"Distribuzione e confronto"**.

### Tab "Copertura"

**Atteso**:
- [ ] Barre orizzontali colorate — ogni barra ha il colore del pigmento corrispondente
- [ ] La barra più lunga = il pigmento dominante (coerente con la voce "Pigmento dominante" sopra)
- [ ] I valori % a destra delle barre coincidono con quelli nella lista pigmenti

### Tab "Confronto artisti"

Clicca il tab **"Confronto artisti"**.

**Atteso**:
- [ ] Compaiono 5 artisti: Rembrandt, Vermeer, Frans Hals, Jan Steen, Pieter de Hooch
- [ ] **Rembrandt ha lo score più alto** analizzando la Ronda di Notte (è la sua opera)
- [ ] Ogni artista mostra una barra proporzionale allo score + swatches dei pigmenti in comune
- [ ] Score verde ≥ 50%, arancio 25–50%, grigio < 25%

Valori attesi approssimativi per la Ronda di Notte:
| Artista | Score atteso |
|---------|-------------|
| Rembrandt | > 50% |
| Frans Hals | 35–55% |
| Vermeer | 25–45% |
| Jan Steen | 20–40% |
| Pieter de Hooch | 20–40% |

> I range sono ampi perché dipendono dalla zona analizzata.

### Tab "Export" — JSON

Clicca il tab **"Export"** poi **"Esporta JSON"**.

**Atteso**:
- [ ] Il browser scarica `chromascope-palette.json`
- [ ] Il file contiene un array JSON con almeno i campi: `id`, `nameIT`, `coverage`, `deltaE`, `colorRGB`
- [ ] I valori di `coverage` corrispondono a quelli nella lista pigmenti

### Tab "Export" — SVG

Clicca **"Esporta SVG"**.

**Atteso**:
- [ ] Il browser scarica `chromascope-palette.svg`
- [ ] Aprendo il file nel browser: grid di swatches colorati su sfondo scuro con nomi pigmento

---

## 8. Zone diverse — verifica coerenza semantica

Analizza tre zone distinte e confronta le palette. Questo test verifica che l'analisi stia riconoscendo correttamente la materia dell'opera.

| Zona | Dove | Pigmenti attesi |
|------|------|-----------------|
| Mantello rosso del capitano | Centro-sinistra | Vermiglione, lacca di garanza, ocra rossa, biacca |
| Ombre pavimento | In basso | Nero avorio, terra d'ombra grezza/bruciata, biacca |
| Armatura e luce calda | Centro-destra | Ocra gialla, giallo di piombo-stagno, biacca |
| Sfondo scuro | A destra | Terra d'ombra, nero avorio, biacca in toni bassi |

**Atteso**:
- [ ] Le palette delle tre zone sono significativamente diverse tra loro
- [ ] I pigmenti trovati sono semanticamente plausibili per ogni zona

---

## 9. Responsive

Apri Chrome DevTools (F12) → Toggle device toolbar → seleziona **iPhone 12** (390×844) → ricarica la pagina.

**Atteso**:
- [ ] Layout verticale: viewer sopra (~55% schermo), pannello scrollabile sotto
- [ ] Il viewer risponde alle gesture touch simulate da DevTools
- [ ] Il drawer PigmentCard occupa tutta la larghezza su mobile
- [ ] La lista pigmenti e il grafico sono fruibili senza overflow orizzontale

---

## Riepilogo checklist

| Feature | Chiave | Esito |
|---------|--------|-------|
| Viewer IIIF si carica | T-01 | ☐ |
| Zoom e pan fluidi | T-02 | ☐ |
| Analisi K-means produce palette | T-03 | ☐ |
| Seconda analisi è istantanea (cache) | T-04 | ☐ |
| Overlay WebGL visibile dopo analisi | T-05 | ☐ |
| Toggle singolo layer funziona | T-06 | ☐ |
| Mostra/Nascondi tutti funzionano | T-07 | ☐ |
| Slider opacità in tempo reale | T-08 | ☐ |
| PigmentCard si apre e si chiude | T-09 | ☐ |
| Tutti i campi della scheda presenti | T-10 | ☐ |
| Timeline con marcatore anno opera | T-11 | ☐ |
| Badge coerenza ✓/⚠/✗ corretti | T-12 | ☐ |
| Alert anacronismo compare | T-13 | ☐ |
| Tab Copertura coerente con lista | T-14 | ☐ |
| Rembrandt primo nel confronto artisti | T-15 | ☐ |
| Export JSON valido | T-16 | ☐ |
| Export SVG apribile | T-17 | ☐ |
| Zone diverse → palette diverse | T-18 | ☐ |
| Layout responsive su mobile | T-19 | ☐ |

---

## Problemi noti

| Sintomo | Causa | Soluzione |
|---------|-------|-----------|
| Overlay non appare | Browser senza WebGL2 | Usare Chrome 80+ o Firefox 79+ |
| Analisi > 20 secondi | K alto su zona molto variegata | Ridurre K a 4–6 |
| Tutti i badge ΔE arancio/rosso | Zona uniforme o molto scura — pochi cluster distinti | Navigare su una zona più colorata |
| Drawer non si apre al click | Nessuna analisi eseguita — palette vuota | Eseguire prima un'analisi |
| Score confronto artisti tutti bassi | Zona quasi monocromatica (pochi pigmenti in comune) | Normale — provare una zona più variegata |
