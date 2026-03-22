/**
 * @description Interfaccia principale per un pigmento storico nel database ChromaScope.
 * Ogni campo è documentato con l'unità di misura e il range atteso.
 * I dati provengono da fonti accademiche (ColourLex, MOLART, Artists' Pigments NGA).
 */
export interface HistoricalPigment {
  /** Identificatore univoco in kebab-case, usato come chiave nel codice */
  id: string

  /** Nome storico in italiano (es. "Bianco di piombo") */
  nameIT: string

  /** Nome in inglese, usato per ricerche bibliografiche internazionali */
  nameEN: string

  /**
   * Nome chimico IUPAC o mineralogico.
   * Fondamentale per il matching con dati di analisi strumentale (XRF, Raman).
   */
  chemicalName: string

  /** Formula chimica compatta */
  chemicalFormula: string

  /**
   * Colore di riferimento in RGB [R, G, B], valori 0-255.
   * ATTENZIONE: questo è il colore visivo del pigmento puro in condizioni standard.
   * Il colore reale nell'opera dipende dal legante, dalla macinazione, dallo spessore.
   * COLOR: usato come punto di riferimento per il matching K-means in spazio Lab.
   */
  colorRGB: [number, number, number]

  /**
   * Colore di riferimento in CIELab [L, a, b].
   * COLOR: L = luminosità [0-100], a = rosso-verde [-128..127], b = giallo-blu [-128..127]
   * Calcolato da colorRGB con illuminante D65 (standard per display moderni).
   * Usato per calcolo Delta E CIE2000 nel motore di analisi.
   */
  colorLab: [number, number, number]

  /**
   * Anno di prima disponibilità documentata del pigmento.
   * null = disponibile dall'antichità (nessuna data di introduzione precisa).
   * HISTORY: usato dalla logica di coerenza storica per validare la datazione dell'opera.
   */
  availableFrom: number | null

  /**
   * Anno in cui il pigmento è caduto in disuso o è stato sostituito.
   * null = ancora usato oggi.
   * HISTORY: un'opera datata dopo availableTo che usa questo pigmento
   * non è necessariamente falsa — potrebbe essere un restauro.
   */
  availableTo: number | null

  /** Descrizione dell'origine geografica e chimica (es. "Minerale: lapislazzuli dall'Afghanistan") */
  origin: string

  /**
   * Costo storico relativo al periodo di massimo utilizzo.
   * 'precious' = riservato a committenze di altissimo livello (es. oltremare naturale).
   */
  cost: 'low' | 'medium' | 'high' | 'precious'

  /** Tecniche pittoriche in cui il pigmento è stato usato */
  techniques: ('olio' | 'tempera' | 'affresco' | 'acquerello' | 'guazzo' | 'encausto')[]

  /** Categoria cromatica principale */
  category: 'blue' | 'red' | 'yellow' | 'green' | 'white' | 'black' | 'brown' | 'orange' | 'violet' | 'gray'

  /**
   * Curiosità storica o tecnica significativa.
   * Usata nel componente <PigmentCard> per il contesto divulgativo.
   */
  trivia: string

  /** URL della fonte primaria (ColourLex, Kremer, paper peer-reviewed, NGA handbook) */
  source: string

  /**
   * Se true, uno o più campi hanno incertezza documentata.
   * Vedi commento DISCLAIMER accanto al campo incerto.
   */
  uncertain?: boolean

  /**
   * Pittori olandesi del '600 documentati che hanno usato questo pigmento.
   * Fonte: analisi tecnica pubblicata (XRF, Raman, sezioni stratigrafiche).
   */
  dutchMasters?: string[]

  /**
   * Note su degradazione o alterazione nel tempo.
   * Critico per l'interpretazione: un pigmento può apparire diverso dall'originale.
   * DISCLAIMER: il colore RGB registrato nell'immagine potrebbe essere il colore
   * del pigmento degradato, non dell'originale.
   */
  degradation?: string

  /**
   * Parametri Kubelka-Munk per 10 bande dello spettro visibile (400-700nm, passo 33nm).
   * KM: K = coefficiente di assorbimento [mm⁻¹], S = coefficiente di scattering [mm⁻¹]
   * Valori in olio di lino se non specificato diversamente.
   * Disponibili solo per un sottoinsieme di pigmenti dalla letteratura (PIGMENTO paper).
   */
  km?: {
    /** Coefficienti di assorbimento per 10 bande [400,433,467,500,533,567,600,633,667,700 nm] */
    K: number[]
    /** Coefficienti di scattering per 10 bande [400,433,467,500,533,567,600,633,667,700 nm] */
    S: number[]
    /** Fonte dei parametri K/S */
    source: string
  }
}
