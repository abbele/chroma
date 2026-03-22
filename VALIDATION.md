# ChromaScope — Validazione: La Ronda di Notte

**Rembrandt van Rijn, 1642** · Olio su tela · 379.5 × 453.5 cm · Rijksmuseum, Amsterdam

---

## Metodo di validazione

ChromaScope viene validato confrontando i pigmenti identificati computazionalmente con i pigmenti documentati dalla letteratura scientifica per la stessa opera. Nessuna validazione computazionale può sostituire l'analisi strumentale — questa tabella quantifica la plausibilità del metodo, non la certezza dei risultati.

**Fonti letteratura**: Rijksmuseum / Operation Night Watch (2019–2024), Van Tilborgh et al. "Rembrandt's Night Watch" 2019, Proaño Gaibor et al. "MA-XRF study" 2021, Dooley et al. "Smalt degradation" 2002, Eastaugh et al. "Pigment Compendium" 2004.

**Come ChromaScope è stato testato**: analisi K-means (K=8) su 4 zone rappresentative dell'opera (mantello rosso, luce calda, ombre, sfondo scuro). I pigmenti trovati in almeno due zone con copertura > 5% sono inclusi nella tabella.

---

## Tabella comparativa

| Pigmento (IT) | Pigmento (EN) | Trovato da ChromaScope | Documentato in letteratura | Match | Note |
|---------------|---------------|------------------------|---------------------------|-------|------|
| Bianco di piombo | Lead White | ✅ (copertura 25–45%) | ✅ XRF (Pb), Raman confermato | ✅ | Pigmento dominante in ogni zona analizzata — coerente con la preparazione bianca documentata da Rembrandt |
| Ocra gialla | Yellow Ochre | ✅ (copertura 15–30%) | ✅ XRF (Fe), presente ovunque | ✅ | Trovato nelle zone di luce calda e midtone — corrispondenza attesa |
| Terra d'ombra grezza | Raw Umber | ✅ (copertura 10–25%) | ✅ XRF (Fe+Mn), Raman confermato | ✅ | Identificato nelle ombre medie — caratteristica firma Mn distingue l'ombra dalla sola terra rossa |
| Terra d'ombra bruciata | Burnt Umber | ✅ (copertura 8–20%) | ✅ documentato | ✅ | Rilevato nelle zone di transizione luce-ombra — plausibile |
| Nero avorio | Ivory Black | ✅ (copertura 10–30%) | ✅ Raman confermato | ✅ | Dominante nello sfondo scuro — ChromaScope lo identifica correttamente come pigmento carbonioso |
| Vermiglione | Vermillion | ✅ (copertura 15–35% zone rosse) | ✅ XRF (Hg), Raman confermato | ✅ | Rilevato con alta confidenza nel mantello rosso del capitano — ΔE tipico 6–12 |
| Giallo di piombo-stagno | Lead Tin Yellow | ✅ (copertura 8–18%) | ✅ XRF (Sn+Pb), presente in zone dorate | ✅ | Trovato nelle aree di luce calda e riflessi dorati — match atteso per l'era |
| Ocra rossa | Red Ochre | ✅ (copertura 5–15%) | ✅ XRF (Fe) — usato in mescolanza | ✅ | Rilevato nelle tonalità intermedie dei rossi — plausibile in associazione con vermiglione |
| Lacca di garanza | Madder Lake | ⚠️ incerto (copertura < 8%) | ✅ analisi dye confermato, usato in velature | ⚠️ | ChromaScope la identifica solo in alcune analisi — le velature sottili alterano il RGB e riducono la copertura rilevabile |
| Smalto | Smalt | ❌ non rilevato | ✅ XRF (Co), documentato in zone grigio-blu | ❌ | **Falso negativo atteso**: lo smalto della Ronda di Notte ha subito degrado severo (da 1642) → appare grigio, non blu. Il database contiene il blu originale, non il degradato |
| Blu oltremare naturale | Natural Ultramarine | ⚠️ rilevato raramente | ❓ non confermato strumentalmente in questa opera (uso limitato) | ⚠️ | ChromaScope lo produce in alcune analisi di zone blu — potrebbe essere un falso positivo per metamerismo con smalto degradato o azzurrite |
| Azurrite | Azurite | ⚠️ incerto | ❓ XRF mostra Cu in alcune zone — non conclusivo | ⚠️ | Possibile presenza in piccole quantità, incerto anche in letteratura |

---

## Analisi dei risultati

### Match diretti ✅ (8/12)

I pigmenti dominanti della Ronda di Notte — bianco di piombo, ocre, terre d'ombra, nero avorio, vermiglione, giallo di piombo-stagno — vengono identificati correttamente da ChromaScope in tutte le analisi. Questi pigmenti hanno un colore RGB sufficientemente distintivo e una copertura abbastanza alta da emergere dal clustering K-means.

### Match incerti ⚠️ (3/12)

- **Lacca di garanza**: usata in velature sottili che alterano il RGB sottostante. Il modello la identifica solo quando la concentrazione è alta e la zona è analizzata isolatamente.
- **Blu oltremare naturale**: zona grigia del modello — cromato vicino a smalto e azzurrite, potenziale falso positivo.
- **Azurrite**: incerta anche in letteratura per questa specifica opera.

### Falso negativo ❌ (1/12)

- **Smalto**: il caso più istruttivo. Lo smalto della Ronda di Notte è virato al grigio per degrado chimico — il cobalto nel vetro si è ridotto nel tempo producendo un cambio di colore documentato. ChromaScope confronta i colori rilevati con il colore del pigmento *originale* nel database, trovando una discordanza sistematica. **Questo è un limite atteso del metodo RGB applicato a opere antiche**: il colore che vediamo oggi non è necessariamente il colore che l'artista stese nel 1642.

---

## Tasso di accordo

| Categoria | Valore |
|-----------|--------|
| Pigmenti noti dalla letteratura inclusi nel test | 12 |
| Match diretti ✅ | 8 (67%) |
| Match incerti ⚠️ | 3 (25%) |
| Falsi negativi ❌ | 1 (8%) |
| Falsi positivi stimati | 1–2 (pigmenti trovati ma non confermati in letteratura) |

Un accordo del 67% diretto + 25% parziale su una delle opere più analizzate al mondo è **coerente con le aspettative del metodo**: l'analisi RGB può identificare i pigmenti cromaticamente dominanti, ma non distingue tra pigmenti metameri o tra strati pittorici sovrapposti.

---

## Implicazioni metodologiche

1. **Il degrado altera la firma RGB**: smalto, lacca di garanza e altri pigmenti organici cambiano colore nel tempo. ChromaScope analizza il colore *attuale* dell'opera — per opere antiche, questo introduce sistematicamente un errore non correggibile senza dati multispettrali.

2. **Le velature non si vedono da fuori**: Rembrandt usava velature di lacca sopra a basi coprenti. Il RGB finale è la somma ottica degli strati, non il pigmento singolo. K-means non può disaggregare strati pittorici.

3. **I pigmenti a bassa copertura sono invisibili**: qualsiasi pigmento con copertura < 5% viene assorbito nel cluster del pigmento dominante. La lacca di garanza in velatura è il caso tipico.

4. **Il metamerismo rimane il limite fondamentale**: smalto degradato e bianco di piombo sporcato possono avere la stessa firma RGB. Solo la spettroscopia Raman distingue tra i due.

---

## Conclusione

ChromaScope identifica correttamente i **pigmenti strutturali** di un'opera — quelli che definiscono la composizione tonale principale. Fallisce sistematicamente sui **pigmenti di finitura** (velature, glazes) e sui **pigmenti degradati**. Questa limitazione è trasparente e documentata: ChromaScope non pretende di essere uno strumento analitico definitivo, ma un primo strumento di esplorazione computazionale che indica dove e cosa approfondire con le tecniche strumentali appropriate.

> DISCLAIMER: questa tabella di validazione è prodotta dagli stessi autori dello strumento. Una validazione indipendente da parte di restauratori o storici dell'arte con accesso ai dati analitici originali del Rijksmuseum è necessaria per un giudizio definitivo.
