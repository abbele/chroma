/**
 * @description Database pigmenti storici per ChromaScope — Rijksmuseum edition.
 *
 * Questo database copre i 27 pigmenti principali documentati nelle opere del Rijksmuseum
 * (Maestri Olandesi del XVII secolo: Rembrandt, Vermeer, Frans Hals, Jan Steen,
 * Jacob van Ruisdael, Pieter de Hooch).
 *
 * Fonti primarie:
 * - ColourLex Database: https://colourlex.com/pigments/
 * - Progetto MOLART (NWO, Paesi Bassi, 1995–2002) — studio scientifico sui materiali
 *   pittorici olandesi del XVII secolo
 * - Karin Groen et al. — analisi pigmenti Vermeer (Mauritshuis/Rijksmuseum)
 * - Artists' Pigments: A Handbook of Their History and Characteristics, voll. 1–4 (NGA)
 * - Eastaugh, Walsh, Chaplin, Siddall — "Pigment Compendium" (2004)
 * - National Gallery Technical Bulletins: https://www.nationalgallery.org.uk/research
 *
 * COLOR: i valori colorLab sono calcolati dai colorRGB con illuminante D65.
 * Conversione: RGB [0-255] → sRGB linear → XYZ D65 → CIELab.
 * I valori Lab sono approssimativi — il pigmento reale varia per macinazione e legante.
 */

import type { HistoricalPigment } from '../types/pigment'

export const pigments: HistoricalPigment[] = [

  // ─────────────────────────────────────────────────────────────────────────────
  // BIANCHI
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'lead-white',
    nameIT: 'Bianco di piombo',
    nameEN: 'Lead White',
    chemicalName: 'Carbonato basico di piombo',
    chemicalFormula: '2PbCO₃·Pb(OH)₂',
    // COLOR: bianco caldo leggermente giallastro — l'olio di lino ingiallisce nel tempo
    colorRGB: [243, 240, 230],
    colorLab: [95.1, 0.3, 3.8],
    availableFrom: null, // antichità
    availableTo: null,   // ancora in uso, ma vietato in molti paesi per tossicità
    origin: 'Sintetico: piombo esposto a vapori di aceto (processo "olandese" dello stack)',
    cost: 'medium',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'white',
    trivia: 'Il pigmento bianco più usato dall\'antichità al XIX secolo. L\'indice di rifrazione molto alto (n≈2.0) lo rende opaco e coprente. Rembrandt lo usava in impasto spesso per le luci nei ritratti.',
    source: 'https://colourlex.com/project/lead-white/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen', 'Pieter de Hooch', 'Jacob van Ruisdael'],
    // KM: scattering S molto alto (~20 mm⁻¹ a 550nm in olio) — pigmento molto coprente
  },

  {
    id: 'chalk',
    nameIT: 'Gesso / Carbonato di calcio',
    nameEN: 'Chalk / Calcium Carbonate',
    chemicalName: 'Carbonato di calcio (calcite)',
    chemicalFormula: 'CaCO₃',
    // COLOR: bianco puro, quasi trasparente in olio (indice di rifrazione basso, n≈1.48)
    colorRGB: [250, 248, 242],
    colorLab: [97.8, -0.2, 2.1],
    availableFrom: null,
    availableTo: null,
    origin: 'Minerale: roccia sedimentaria (gesso di Bologna, gesso di Champagne)',
    cost: 'low',
    techniques: ['tempera', 'olio', 'affresco', 'guazzo'],
    category: 'white',
    trivia: 'Principale pigmento per le imprimiture (grounds) nelle tavole olandesi. Quasi invisibile in olio (è trasparente), ma usato massicciamente come strato preparatorio con colla animale.',
    source: 'https://colourlex.com/project/chalk/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen', 'Pieter de Hooch'],
    // DISCLAIMER: in olio l'indice di rifrazione del gesso (1.48) è troppo vicino a quello
    // dell'olio (1.47) per essere coprente. Appare bianco solo in tempera o a secco.
    uncertain: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NERI
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'bone-black',
    nameIT: 'Nero d\'ossa / Nero d\'avorio',
    nameEN: 'Bone Black / Ivory Black',
    chemicalName: 'Fosfato di calcio + carbonio amorfo (ossa calcinate)',
    chemicalFormula: 'Ca₃(PO₄)₂ + C',
    // COLOR: nero freddo con lieve tono blu — caratteristico del nero olandese
    colorRGB: [30, 28, 35],
    colorLab: [10.2, 1.1, -3.2],
    availableFrom: null,
    availableTo: null,
    origin: 'Organico: ossa o avorio calcinati in assenza di ossigeno',
    cost: 'low',
    techniques: ['olio', 'tempera', 'affresco', 'acquerello'],
    category: 'black',
    trivia: 'Rembrandt usava strati di imprimatura scura con nero d\'ossa + biacca + terra d\'ombra. Questo dark ground è la firma tecnica dei suoi ritratti. Il nero d\'avorio (da zanne) è chimicamente identico ma più puro.',
    source: 'https://colourlex.com/project/bone-black/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Pieter de Hooch', 'Jacob van Ruisdael'],
    degradation: 'Stabile nel tempo. Asciuga lentamente in olio — spesso aggiunto in strati intermedi, non nell\'ultimo strato.',
  },

  {
    id: 'vine-black',
    nameIT: 'Nero di vite / Nero di carbone',
    nameEN: 'Vine Black / Charcoal Black',
    chemicalName: 'Carbonio amorfo (vite o legno calcinati)',
    chemicalFormula: 'C',
    // COLOR: nero caldo, leggermente marrone — più caldo del nero d'ossa
    colorRGB: [25, 22, 22],
    colorLab: [8.1, 1.3, 0.8],
    availableFrom: null,
    availableTo: null,
    origin: 'Organico: tralci di vite o carbone di legna calcinati',
    cost: 'low',
    techniques: ['olio', 'tempera', 'acquerello'],
    category: 'black',
    trivia: "Frans Hals mescolava nero di vite con biacca per ottenere i suoi grigi caldi nei tessuti. Un grigio \"rotto\" — né freddo né neutro — tipico della pittura olandese del '600.",
    source: 'https://colourlex.com/project/vine-black/',
    dutchMasters: ['Frans Hals', 'Rembrandt van Rijn', 'Johannes Vermeer', 'Jan Steen'],
    degradation: 'Essiccazione lentissima in olio. Particelle grossolane rispetto al nero fumo.',
  },

  {
    id: 'lamp-black',
    nameIT: 'Nero fumo / Nero di lampada',
    nameEN: 'Lamp Black / Soot Black',
    chemicalName: 'Carbonio amorfo finissimo (fuliggine)',
    chemicalFormula: 'C',
    // COLOR: nero neutro, quasi senza tono cromatico
    colorRGB: [18, 18, 18],
    colorLab: [6.2, 0.1, 0.2],
    availableFrom: null,
    availableTo: null,
    origin: 'Organico: raccolta di fuliggine da lampade a olio o candele',
    cost: 'low',
    techniques: ['olio', 'tempera'],
    category: 'black',
    trivia: 'Particelle submicrometriche: il nero più fine e coprente. Essiccazione estremanente lenta in olio — spesso evitato come pigmento principale per questo motivo.',
    source: 'https://colourlex.com/project/lamp-black/',
    dutchMasters: ['Rembrandt van Rijn', 'Frans Hals'],
    // KM: K molto alto, S ≈ 0 in tutto lo spettro visibile — assorbe quasi tutta la luce
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ROSSI
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'vermilion',
    nameIT: 'Vermiglio / Cinabro artificiale',
    nameEN: 'Vermilion',
    chemicalName: 'Solfuro di mercurio (II) — forma alfa',
    chemicalFormula: 'HgS (α-cinnabar, esagonale)',
    // COLOR: rosso arancio intenso e brillante
    colorRGB: [210, 40, 30],
    colorLab: [39.8, 57.4, 40.2],
    availableFrom: 800,  // sintesi artificiale VIII secolo; il cinabro naturale dall'antichità
    availableTo: 1900,   // sostituito da cadmio rosso nel XIX secolo
    origin: 'Sintetico: sublimazione di mercurio e zolfo (metodo "olandese" dal XII sec.); o naturale da cinabro minerale',
    cost: 'high',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'red',
    trivia: 'Rembrandt lo usava per i manti rossi (es. "La Ronda di Notte") e miscelato con biacca nei toni di carnagione. Il cinabro minerale naturale (dal Perù e dalla Spagna) era usato fin dall\'antichità; la versione sintetica si diffuse nell\'VIII secolo.',
    source: 'https://colourlex.com/project/vermilion/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen'],
    degradation: 'Può annerire per foto-ossidazione: α-HgS (rosso) → β-HgS (metacinnabar, nero). Documentato in molte opere olandesi esposte alla luce.',
  },

  {
    id: 'red-ochre',
    nameIT: 'Ocra rossa / Terra rossa',
    nameEN: 'Red Ochre / Red Earth',
    chemicalName: 'Ossido di ferro (III) — ematite',
    chemicalFormula: 'Fe₂O₃',
    // COLOR: rosso mattone marrone
    colorRGB: [165, 65, 40],
    colorLab: [36.2, 36.8, 26.1],
    availableFrom: null,
    availableTo: null,
    origin: 'Minerale: terra ricca di ematite; anche calcinate da ocra gialla (goethite → ematite)',
    cost: 'low',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'red',
    trivia: 'Uno dei pigmenti più antichi e stabili. Usato da Rembrandt nelle imprimiture (spesso miscelato con ocra gialla e nero d\'ossa) e per i toni di carnagione nelle ombre.',
    source: 'https://colourlex.com/project/red-ochre/',
    dutchMasters: ['Rembrandt van Rijn', 'Frans Hals', 'Jan Steen', 'Pieter de Hooch'],
  },

  {
    id: 'red-lead',
    nameIT: 'Minio / Rosso di piombo',
    nameEN: 'Red Lead / Minium',
    chemicalName: 'Ossido di piombo (II,IV) — tetraossido di tripiombo',
    chemicalFormula: 'Pb₃O₄',
    // COLOR: arancio rosso brillante
    colorRGB: [215, 60, 30],
    colorLab: [43.1, 60.2, 46.8],
    availableFrom: null,
    availableTo: 1900,
    origin: 'Sintetico: calcinazione della biacca (carbonato di piombo)',
    cost: 'medium',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'orange',
    trivia: 'Usato anche come essiccante aggiunto ad altri pigmenti (il manganese nel minio catalizza la polimerizzazione dell\'olio). Rembrandt lo usava in piccole quantità per accelerare l\'asciugatura degli strati scuri.',
    source: 'https://colourlex.com/project/red-lead/',
    dutchMasters: ['Rembrandt van Rijn', 'Jan Steen', 'Frans Hals'],
    degradation: 'Si annerisce in atmosfere ricche di zolfo: Pb₃O₄ → PbS (nero). Identificato da Raman (picchi a 121, 152, 232 cm⁻¹).',
  },

  {
    id: 'madder-lake',
    nameIT: 'Lacca di robbia / Lacca rossa',
    nameEN: 'Madder Lake / Red Lake',
    chemicalName: 'Alizarina e purpurina su substrato di idrossido di alluminio',
    chemicalFormula: 'C₁₄H₈O₄ (alizarina) su Al(OH)₃',
    // COLOR: cremisi profondo — attenzione: degrada a rosa pallido
    colorRGB: [185, 40, 65],
    colorLab: [36.4, 52.1, 12.3],
    availableFrom: null,
    availableTo: null,
    origin: 'Organico: radici di Rubia tinctorum (robbia) precipitate su allumina',
    cost: 'medium',
    techniques: ['olio', 'tempera'],
    category: 'red',
    trivia: 'Rembrandt la usava in velature trasparenti su strati opachi di vermiglio (es. la fascia rossa in "La Ronda di Notte"). Estremamente fugace alla luce — molti rossi nelle opere olandesi si sono sbiaditi.',
    source: 'https://colourlex.com/project/madder-lake/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen'],
    degradation: 'Molto fugace: alizarina degrada per fotossidazione. Molti dipinti olandesi mostrano rossi molto più pallidi dell\'originale. Identificata per HPLC (alizarina + purpurina).',
    // KM: S ≈ 0 (pigmento trasparente); K alto nel verde e blu — rosso profondo
  },

  {
    id: 'cochineal-lake',
    nameIT: 'Lacca di cocciniglia / Carminio',
    nameEN: 'Cochineal Lake / Carmine',
    chemicalName: 'Acido carminico su substrato di idrossido di alluminio o stagno',
    chemicalFormula: 'C₂₂H₂₀O₁₃ (acido carminico) su Al(OH)₃',
    // COLOR: cremisi brillante freddo — più saturo della lacca di robbia
    colorRGB: [185, 30, 55],
    colorLab: [33.8, 57.2, 8.1],
    availableFrom: 1540, // HISTORY: arrivo dalla Nuova Spagna (Messico) ca. 1540
    availableTo: null,
    origin: 'Organico: cocciniglia (Dactylopius coccus) importata dal Messico dopo il 1540',
    cost: 'high',
    techniques: ['olio', 'tempera'],
    category: 'red',
    trivia: 'Più brillante e stabile della robbia, ma anch\'essa fugace. Rembrandt la usava per velature cremisi su vermiglio. Distinta dalla lacca di robbia per HPLC (acido carminico vs alizarina).',
    source: 'https://colourlex.com/project/cochineal-lake/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen'],
    degradation: 'Fugace alla luce come la lacca di robbia. Identificata per HPLC.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GIALLI
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'yellow-ochre',
    nameIT: 'Ocra gialla',
    nameEN: 'Yellow Ochre',
    chemicalName: 'Ossido di ferro (III) idrato — goethite',
    chemicalFormula: 'FeO(OH)',
    // COLOR: giallo caldo marrone
    colorRGB: [200, 160, 75],
    colorLab: [67.2, 12.3, 45.8],
    availableFrom: null,
    availableTo: null,
    origin: 'Minerale: terra ricca di goethite (depositi alluvionali)',
    cost: 'low',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'yellow',
    trivia: 'Il pigmento più diffuso in assoluto nella storia dell\'arte. Usato da tutti i pittori olandesi nelle imprimiture, nelle velature calde e nei toni di terra.',
    source: 'https://colourlex.com/project/yellow-ochre/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen', 'Pieter de Hooch', 'Jacob van Ruisdael'],
  },

  {
    id: 'lead-tin-yellow',
    nameIT: 'Giallo di piombo e stagno / Giallorino',
    nameEN: 'Lead-Tin Yellow',
    chemicalName: 'Ossido di piombo e stagno (IV)',
    chemicalFormula: 'Pb₂SnO₄ (Tipo I) o PbSn₁₋ₓSiₓO₃ (Tipo II)',
    // COLOR: giallo limone caldo brillante
    colorRGB: [230, 195, 60],
    colorLab: [79.2, 4.1, 66.3],
    availableFrom: 1300,
    availableTo: 1750, // HISTORY: misteriosamente abbandonato ca. 1750, riscoperto nel 1941
    origin: 'Sintetico: calcinazione di piombo e stagno (Tipo I) o piombo, stagno e silice (Tipo II)',
    cost: 'medium',
    techniques: ['olio', 'tempera'],
    category: 'yellow',
    trivia: 'Una delle scoperte più importanti della storia dell\'arte tecnica del XX secolo: riscoperto da Jacobi nel 1941. Rembrandt lo usava per i gialli brillanti ("La Sposa Ebrea"). Vermeer nella giacca gialla di "Donna in Blu che Legge una Lettera". Scomparso misteriosamente ca. 1750.',
    source: 'https://colourlex.com/project/lead-tin-yellow/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jan Steen'],
    // HISTORY: la data 1750 come fine utilizzo è approssimativa — causa sconosciuta
    uncertain: true,
  },

  {
    id: 'naples-yellow',
    nameIT: 'Giallo di Napoli / Giallo antimonato di piombo',
    nameEN: 'Naples Yellow / Lead Antimonate Yellow',
    chemicalName: 'Antimonato di piombo (II)',
    chemicalFormula: 'Pb₂Sb₂O₇ (Tipo I) o Pb(SbO₃)₂ (Tipo II)',
    // COLOR: giallo chiaro caldo pallido
    colorRGB: [230, 195, 100],
    colorLab: [80.1, 5.2, 52.1],
    availableFrom: 1600, // HISTORY: uso pittorico documentato dal XVII secolo
    availableTo: 1850,
    origin: 'Sintetico: calcinazione di ossido di piombo e antimonio',
    cost: 'medium',
    techniques: ['olio', 'tempera'],
    category: 'yellow',
    trivia: 'Identificato da XRF (Pb + Sb insieme). Il Tipo I (Pb₂Sb₂O₇) è tipico dei Vecchi Maestri; il Tipo II più diffuso nel XVIII-XIX secolo.',
    source: 'https://colourlex.com/project/naples-yellow/',
    dutchMasters: ['Rembrandt van Rijn', 'Frans Hals'],
  },

  {
    id: 'orpiment',
    nameIT: 'Orpimento',
    nameEN: 'Orpiment',
    chemicalName: 'Trisolfuro di arsenico',
    chemicalFormula: 'As₂S₃',
    // COLOR: giallo oro intenso e brillante
    colorRGB: [220, 185, 40],
    colorLab: [75.8, 5.2, 72.4],
    availableFrom: null,
    availableTo: 1800,
    origin: 'Minerale: depositi naturali (Turchia, Iran, Georgia); anche sintetico',
    cost: 'high',
    techniques: ['olio', 'tempera'],
    category: 'yellow',
    trivia: 'Incompatibile chimicamente con verderame e biacca (causa annerimento). La sua tossicità (arsenico) e l\'incompatibilità lo hanno fatto abbandonare nel XIX secolo.',
    source: 'https://colourlex.com/project/orpiment/',
    dutchMasters: ['Rembrandt van Rijn', 'Jan Steen'],
    degradation: 'Incompatibile con Cu e Pb — annerisce al contatto. Identificato per XRF (As) o Raman (picco a 284 cm⁻¹).',
  },

  {
    id: 'massicot',
    nameIT: 'Massicotto / Litargirio giallo',
    nameEN: 'Massicot',
    chemicalName: 'Ossido di piombo (II) — forma gialla tetragonale',
    chemicalFormula: 'PbO',
    // COLOR: giallo pallido caldo
    colorRGB: [215, 190, 70],
    colorLab: [77.3, 3.1, 58.2],
    availableFrom: null,
    availableTo: 1900,
    origin: 'Sintetico: calcinazione della biacca a temperatura moderata',
    cost: 'medium',
    techniques: ['olio', 'tempera'],
    category: 'yellow',
    trivia: 'Funziona anche come essiccante (siccativo) aggiunto ad altri pigmenti. Spesso confuso con il Giallo di piombo-stagno Tipo II in XRF (entrambi mostrano Pb). Distinguibile per Raman (massicotto ~144 cm⁻¹).',
    source: 'https://colourlex.com/project/massicot/',
    dutchMasters: ['Rembrandt van Rijn', 'Jan Steen'],
  },

  {
    id: 'weld',
    nameIT: 'Guada / Giallo di reseda',
    nameEN: 'Weld',
    chemicalName: 'Luteolina e apigenina su substrato di alluminio',
    chemicalFormula: 'C₁₅H₁₀O₆ (luteolina) su Al(OH)₃',
    // COLOR: giallo trasparente caldo (in realtà quasi incolore se degradato)
    colorRGB: [215, 185, 50],
    colorLab: [76.2, 4.8, 66.1],
    availableFrom: null,
    availableTo: 1800,
    origin: 'Organico: pianta Reseda luteola precipitata su allumina',
    cost: 'low',
    techniques: ['olio', 'tempera'],
    category: 'yellow',
    trivia: 'Usato in velature trasparenti su giallo di piombo-stagno per gialli brillanti luminosi. Estremamente fugace — molti gialli nelle opere olandesi sono oggi sbiaditi per degradazione della guada.',
    source: 'https://colourlex.com/project/weld/',
    dutchMasters: ['Jan Steen', 'Jacob van Ruisdael', 'Pieter de Hooch'],
    degradation: 'Molto fugace: degrada a quasi incolore. Identificata per HPLC (luteolina + apigenina).',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BLU
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'natural-ultramarine',
    nameIT: 'Oltremare naturale / Azzurro oltremarino',
    nameEN: 'Natural Ultramarine',
    chemicalName: 'Lazurite nella matrice di lapislazzuli',
    chemicalFormula: '(Na,Ca)₈[Al₆Si₆O₂₄](S,SO₄) — lazurite',
    // COLOR: blu violaceo profondo e saturo
    colorRGB: [30, 60, 180],
    colorLab: [27.8, 22.4, -56.8],
    availableFrom: 1200, // importazione dall'Afghanistan via Venezia dal XIII sec.
    availableTo: null,
    origin: 'Minerale: lapislazzuli dall\'Afghanistan (Badakhshan), raramente dal Cile',
    cost: 'precious',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'blue',
    trivia: 'Costava più dell\'oro — riservato al manto della Madonna o a committenze eccezionali. Vermeer è famoso per il suo uso straordinario: il turbante in "Ragazza con l\'orecchino di perla", l\'abito in "Donna che legge una lettera". Identificato da Karin Groen tramite SEM-EDX (Si + Al + Na + S).',
    source: 'https://colourlex.com/project/natural-ultramarine/',
    dutchMasters: ['Johannes Vermeer', 'Rembrandt van Rijn'],
    // KM: S basso (trasparente in olio); K alto nel rosso/giallo → blu puro e profondo
  },

  {
    id: 'smalt',
    nameIT: 'Smaltino',
    nameEN: 'Smalt',
    chemicalName: 'Vetro al cobalto e potassio macinato finemente',
    chemicalFormula: 'K₂O·CoO·nSiO₂ (variabile)',
    // COLOR: blu grigiastro medio — spesso appare grigio nelle opere per degradazione
    colorRGB: [90, 110, 160],
    colorLab: [46.2, 5.8, -32.1],
    availableFrom: 1500,
    availableTo: 1750, // HISTORY: decade dopo il 1700 per degradazione in olio
    origin: 'Sintetico: vetro di silice con ossido di cobalto e potassio, macinato',
    cost: 'medium',
    techniques: ['olio', 'tempera'],
    category: 'blue',
    trivia: 'Il blu più economico del XVII secolo olandese. Rembrandt lo usava per cieli e drappi blu. Problema: in olio di lino il vetro si degrada (la rete silicea assorbe il Co²⁺) e il pigmento tende al grigio nel tempo. Molti "cieli grigi" olandesi erano originariamente blu smaltino.',
    source: 'https://colourlex.com/project/smalt/',
    dutchMasters: ['Rembrandt van Rijn', 'Frans Hals', 'Jan Steen', 'Johannes Vermeer'],
    degradation: 'Notoria tendenza all\'incolore/grigio in olio di lino. La macinazione grossolana mantiene meglio il colore. Identificato per SEM-EDX (Co + K + Si).',
  },

  {
    id: 'azurite',
    nameIT: 'Azzurrite',
    nameEN: 'Azurite',
    chemicalName: 'Carbonato basico di rame',
    chemicalFormula: 'Cu₃(CO₃)₂(OH)₂',
    // COLOR: blu medio con lieve tono verde
    colorRGB: [55, 130, 185],
    colorLab: [52.1, -8.2, -37.4],
    availableFrom: null,
    availableTo: 1700, // sostituita da smalt e poi da Blu di Prussia
    origin: 'Minerale: azzurrite macinata (depositi in Ungheria, Sassonia, Spagna)',
    cost: 'medium',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'blue',
    trivia: 'Il principale blu per cieli e acqua prima dell\'affermazione dello smaltino. Spesso convertita in malachite verde in condizioni umide — molti "verdi" medievali erano originariamente azzurrite.',
    source: 'https://colourlex.com/project/azurite/',
    dutchMasters: ['Rembrandt van Rijn', 'Jacob van Ruisdael'],
    degradation: 'Può convertirsi in malachite (verde) per idratazione e in brochantite (CuSO₄·3Cu(OH)₂) in ambienti solforati.',
  },

  {
    id: 'indigo',
    nameIT: 'Indaco',
    nameEN: 'Indigo',
    chemicalName: 'Indacotina',
    chemicalFormula: 'C₁₆H₁₀N₂O₂',
    // COLOR: blu violaceo profondo e scuro
    colorRGB: [55, 45, 110],
    colorLab: [20.4, 14.2, -38.6],
    availableFrom: null,
    availableTo: null,
    origin: 'Organico: piante del genere Indigofera (Asia) o guado (Isatis tinctoria, Europa)',
    cost: 'medium',
    techniques: ['olio', 'tempera', 'affresco', 'acquerello'],
    category: 'blue',
    trivia: 'Spesso miscelato con smalt per blu più profondi. Vermeer lo usava in combinazione. In olio tende a sbiadire — molti blu scuri olandesi sono oggi più chiari dell\'originale.',
    source: 'https://colourlex.com/project/indigo/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jacob van Ruisdael'],
    degradation: 'Fugace in olio esposto alla luce. Identificato per HPLC o Raman.',
  },

  {
    id: 'prussian-blue',
    nameIT: 'Blu di Prussia / Blu di Berlino',
    nameEN: 'Prussian Blue',
    chemicalName: 'Esacianoferrato (II) di ferro (III)',
    chemicalFormula: 'Fe₄[Fe(CN)₆]₃',
    // COLOR: blu intenso e profondo
    colorRGB: [20, 50, 130],
    colorLab: [21.2, 12.8, -47.3],
    availableFrom: 1704, // HISTORY: sintetizzato accidentalmente da Diesbach a Berlino, ca. 1704
    availableTo: null,
    origin: 'Sintetico: scoperto accidentalmente da Johann Jacob Diesbach a Berlino ca. 1704',
    cost: 'low',
    techniques: ['olio', 'tempera', 'acquerello'],
    category: 'blue',
    // HISTORY: DATA CRITICA per coerenza storica
    // Nessun dipinto autentico precedente al 1704 può contenere Blu di Prussia.
    // La sua presenza in un'opera datata prima del 1704 è un forte indicatore di:
    // 1. Datazione errata, 2. Restauro successivo al 1704, 3. Errore nell'analisi K-M
    trivia: 'Primo pigmento sintetico della chimica moderna. Scoperto per caso da Heinrich Diesbach nel 1704 a Berlino. La sua presenza in un\'opera "antica" è un segnale d\'allarme che il motore AI deve segnalare esplicitamente. Identificato per FTIR (stretching CN a 2090 cm⁻¹) e XRF (Fe).',
    source: 'https://colourlex.com/project/prussian-blue/',
    dutchMasters: [], // non usato dai Maestri del '600 — introdotto dopo
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VERDI
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'verdigris',
    nameIT: 'Verderame',
    nameEN: 'Verdigris',
    chemicalName: 'Acetato di rame basico',
    chemicalFormula: 'Cu(CH₃COO)₂·Cu(OH)₂ (variabile)',
    // COLOR: verde brillante blu-verde
    colorRGB: [80, 155, 115],
    colorLab: [59.8, -30.2, 10.4],
    availableFrom: null,
    availableTo: 1800,
    origin: 'Sintetico: lamiere di rame esposte a vapori di aceto',
    cost: 'medium',
    techniques: ['olio', 'tempera'],
    category: 'green',
    trivia: 'In olio forma saponi di rame (saponificazione) che lo rendono trasparente e marrone nel tempo. Vermeer lo usava per i vestiti verdi. Molti verdi nelle opere olandesi sono oggi marroni per questo motivo.',
    source: 'https://colourlex.com/project/verdigris/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Jan Steen', 'Jacob van Ruisdael'],
    degradation: 'Tende alla saponificazione in olio: forma strati di sapone di rame trasparenti e marroni. Identificato per XRF (Cu) + FTIR (acetato).',
  },

  {
    id: 'copper-resinate',
    nameIT: 'Resinato di rame / Verde resina',
    nameEN: 'Copper Resinate',
    chemicalName: 'Sali di rame di acidi resinici (derivati dell\'acido abietico)',
    chemicalFormula: 'Cu(C₂₀H₂₉COO)₂ (approssimativo)',
    // COLOR: verde intenso trasparente (ora spesso marrone per degradazione)
    colorRGB: [40, 120, 65],
    colorLab: [46.2, -34.8, 18.6],
    availableFrom: 1400,
    availableTo: 1700,
    origin: 'Sintetico: verderame sciolto in resina naturale (trementina o resina copale)',
    cost: 'medium',
    techniques: ['olio'],
    category: 'green',
    trivia: 'Molti paesaggi olandesi con fogliame "marrone" erano originariamente di un vivace verde resinato. Il degrado è quasi inevitabile: il rame forma saponi con l\'olio e la resina si ossida. Rembrandt lo usava nelle velature verdi dei suoi primi lavori.',
    source: 'https://colourlex.com/project/copper-resinate/',
    dutchMasters: ['Rembrandt van Rijn', 'Jan Steen', 'Jacob van Ruisdael'],
    degradation: 'Degrada quasi sempre a marrone per ossidazione della resina e formazione di saponi di rame. Identificato per XRF (Cu) + GC-MS (acido abietico).',
    uncertain: true, // RGB è quello del pigmento originale, non del degradato
  },

  {
    id: 'malachite',
    nameIT: 'Malachite',
    nameEN: 'Malachite',
    chemicalName: 'Carbonato basico di rame (II)',
    chemicalFormula: 'Cu₂CO₃(OH)₂',
    // COLOR: verde medio
    colorRGB: [65, 150, 95],
    colorLab: [57.4, -32.1, 15.8],
    availableFrom: null,
    availableTo: 1800,
    origin: 'Minerale: malachite macinata (depositi in Russia, Congo, Australia)',
    cost: 'medium',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'green',
    trivia: 'Spesso prodotto di alterazione dell\'azzurrite. Identificato per XRF (Cu) + Raman (picchi a 220, 430, 1490 cm⁻¹). Usato nei fogliami dei paesaggi.',
    source: 'https://colourlex.com/project/malachite/',
    dutchMasters: ['Jan Steen', 'Jacob van Ruisdael', 'Pieter de Hooch'],
  },

  {
    id: 'green-earth',
    nameIT: 'Terra verde',
    nameEN: 'Green Earth / Terre Verte',
    chemicalName: 'Celadonite o glauconite (fillosilicati di ferro)',
    chemicalFormula: 'K(Mg,Fe²⁺)(Fe³⁺,Al)[Si₄O₁₀](OH)₂ (celadonite)',
    // COLOR: verde oliva opaco
    colorRGB: [105, 125, 85],
    colorLab: [50.2, -12.4, 18.6],
    availableFrom: null,
    availableTo: null,
    origin: 'Minerale: celadonite o glauconite (depositi in Verona, Boemia, Cipro)',
    cost: 'low',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'green',
    trivia: 'Molto trasparente in olio (indice di rifrazione simile all\'olio). Nell\'arte italiana medievale era usato come sottopittura verde per i toni carnacini (dava profondità alle ombre). Nella pittura olandese del XVII sec. era meno predominante.',
    source: 'https://colourlex.com/project/green-earth/',
    dutchMasters: ['Pieter de Hooch', 'Jan Steen', 'Jacob van Ruisdael'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MARRONI / TERRE
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'raw-umber',
    nameIT: 'Terra d\'ombra grezza',
    nameEN: 'Raw Umber',
    chemicalName: 'Ossidi di ferro e manganese in matrice argillosa',
    chemicalFormula: 'Fe₂O₃ + MnO₂ + SiO₂ (variabile)',
    // COLOR: marrone caldo scuro con tono giallastro
    colorRGB: [115, 80, 50],
    colorLab: [36.1, 12.8, 22.4],
    availableFrom: 1400, // uso pittorico documentato dal XV secolo
    availableTo: null,
    origin: 'Minerale: terra naturale di Umbria (Italia) o Cipro, ricca di Mn e Fe',
    cost: 'low',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'brown',
    trivia: 'Il manganese la rende un potente essiccante — Rembrandt la usava negli strati di imprimatura scura proprio per accelerare l\'asciugatura. La sua firma nei dark grounds di Rembrandt è documentata dal Rembrandt Research Project.',
    source: 'https://colourlex.com/project/raw-umber/',
    dutchMasters: ['Rembrandt van Rijn', 'Johannes Vermeer', 'Frans Hals', 'Jacob van Ruisdael'],
  },

  {
    id: 'burnt-umber',
    nameIT: 'Terra d\'ombra bruciata',
    nameEN: 'Burnt Umber',
    chemicalName: 'Ossidi di ferro e manganese calcinati',
    chemicalFormula: 'Fe₂O₃ + MnO₂ (calcinati)',
    // COLOR: marrone rosso scuro
    colorRGB: [140, 70, 35],
    colorLab: [35.8, 26.4, 28.1],
    availableFrom: 1400,
    availableTo: null,
    origin: 'Sintetico: terra d\'ombra grezza calcinata (goethite → ematite; MnO₂ → Mn₂O₃)',
    cost: 'low',
    techniques: ['olio', 'tempera', 'affresco'],
    category: 'brown',
    trivia: 'Più rossa e calda della grezza per la conversione della goethite in ematite durante la calcinazione. Usata nei ritratti di Rembrandt per le ombre calde nei volti.',
    source: 'https://colourlex.com/project/burnt-umber/',
    dutchMasters: ['Rembrandt van Rijn', 'Frans Hals', 'Jacob van Ruisdael'],
  },

  {
    id: 'realgar',
    nameIT: 'Realgar',
    nameEN: 'Realgar',
    chemicalName: 'Tetrasolfuro di tetraarsenico — forma alfa',
    chemicalFormula: 'As₄S₄ (α-realgar)',
    // COLOR: arancio rosso brillante
    colorRGB: [200, 80, 30],
    colorLab: [43.8, 48.2, 41.6],
    availableFrom: null,
    availableTo: 1800,
    origin: 'Minerale: depositi idrotermali (associato all\'orpimento)',
    cost: 'high',
    techniques: ['olio', 'tempera'],
    category: 'orange',
    trivia: 'Spesso trovato insieme all\'orpimento. Si converte in pararealgar (giallo) per esposizione alla luce — un\'alterazione documentata in molte opere. Identificato per Raman (stretching As-S caratteristici).',
    source: 'https://colourlex.com/project/realgar/',
    dutchMasters: ['Rembrandt van Rijn', 'Jan Steen'],
    degradation: 'Foto-conversione: α-realgar (arancio) → pararealgar As₄S₄ (giallo) alla luce. Irreversibile.',
  },
]

/**
 * @description Mappa id → pigmento per lookup O(1).
 * Usata nel motore di analisi per il matching rapido.
 */
export const pigmentById = new Map<string, HistoricalPigment>(
  pigments.map(p => [p.id, p])
)

/**
 * @description Pigmenti filtrati per periodo storico.
 * HISTORY: restituisce solo i pigmenti disponibili nell'anno specificato.
 * Usato dalla logica di coerenza storica (Fase 3).
 *
 * @param year - Anno dell'opera da analizzare
 * @returns Array di pigmenti disponibili in quell'anno
 * @example
 * const available1650 = getPigmentsAvailableIn(1650)
 * // include smalt, azzurrite, ma NON Blu di Prussia (1704)
 */
export function getPigmentsAvailableIn(year: number): HistoricalPigment[] {
  return pigments.filter(p => {
    const from = p.availableFrom ?? -Infinity
    const to = p.availableTo ?? Infinity
    return year >= from && year <= to
  })
}
