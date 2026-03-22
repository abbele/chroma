<template>
  <!-- DISCLAIMER: sezione divulgativa — spiegazione semplificata del metodo scientifico -->
  <section class="science" aria-label="Come funziona ChromaScope">

    <button
      class="science__toggle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="science__toggle-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
        </svg>
        La scienza dietro ChromaScope
      </span>
      <span class="science__toggle-arrow" :class="{ 'science__toggle-arrow--open': open }">▾</span>
    </button>

    <Transition name="science-expand">
      <div v-if="open" class="science__body">

        <!-- ── Blocco 1: perché RGB non basta ─────────────────────────────── -->
        <div class="science__block">
          <h3 class="science__block-title">
            <span class="science__icon">🎨</span>
            Perché il colore che vedi non è il pigmento
          </h3>
          <p>
            Quando guardi un dipinto, il tuo occhio percepisce luce riflessa — non materia.
            Lo stesso identico colore arancio può essere prodotto da <strong>vermiglione</strong>
            (solfuro di mercurio, tossico, macinato da minerale), da <strong>ocra rossa</strong>
            (terra ferrosa, economica, usata dall'antichità) o da una miscela dei due.
            Per un telefono o una fotocamera, i tre aranci sono indistinguibili: stesso valore RGB.
          </p>
          <p>
            Questo fenomeno si chiama <strong>metamerismo</strong> ed è il motivo per cui analizzare
            i pigmenti di un dipinto da una fotografia è scientificamente difficile. ChromaScope lo affronta
            usando modelli fisici, non solo confronti di colore.
          </p>
          <div class="science__callout">
            <strong>In breve:</strong> RGB misura come la luce arriva al tuo occhio.
            I pigmenti sono materia fisica. Tra i due c'è un salto che nessun algoritmo RGB può colmare da solo.
          </div>
        </div>

        <!-- ── Blocco 2: Kubelka-Munk ──────────────────────────────────────── -->
        <div class="science__block">
          <h3 class="science__block-title">
            <span class="science__icon">🔬</span>
            Il modello Kubelka-Munk: la fisica della pittura
          </h3>
          <p>
            Nel 1931, i fisici Paul Kubelka e Franz Munk pubblicarono un modello matematico che descrive
            come uno strato di materiale (pittura, carta, tessuto) interagisce con la luce.
            Ogni pigmento è caratterizzato da due coefficienti misurabili in laboratorio:
          </p>
          <ul class="science__list">
            <li>
              <strong>K (assorbimento)</strong> — quanto il pigmento "mangia" la luce a ogni lunghezza d'onda.
              Un pigmento molto scuro ha K alto nel visibile.
            </li>
            <li>
              <strong>S (scattering)</strong> — quanto il pigmento "rimanda indietro" la luce.
              Un pigmento molto coprente (come il bianco di piombo) ha S alto.
            </li>
          </ul>
          <p>
            Conoscendo K e S di un set di pigmenti, si può calcolare il colore risultante
            da qualsiasi miscela. ChromaScope fa il <strong>processo inverso</strong>:
            dato il colore osservato nell'immagine, cerca la combinazione di pigmenti noti
            che produce quel colore.
          </p>
          <div class="science__callout science__callout--gold">
            <strong>Analogia:</strong> è come riconoscere gli ingredienti di un piatto dall'odore.
            Hai un database di odori noti (pigmenti con K e S), annusi il risultato (il colore RGB),
            e cerchi la ricetta più probabile. Non è certezza — è la migliore stima possibile.
          </div>
        </div>

        <!-- ── Blocco 3: K-means e Delta E ────────────────────────────────── -->
        <div class="science__block">
          <h3 class="science__block-title">
            <span class="science__icon">📊</span>
            K-means e Delta E: come si raggruppano i colori
          </h3>
          <p>
            Prima di applicare il modello fisico, ChromaScope deve ridurre i milioni di pixel
            dell'area analizzata a un insieme gestibile di "colori rappresentativi".
            Lo fa con l'algoritmo <strong>K-means</strong>:
          </p>
          <ol class="science__list science__list--ordered">
            <li>Parte da K centroidi casuali nello spazio colore</li>
            <li>Assegna ogni pixel al centroide più vicino</li>
            <li>Ricalcola i centroidi come media dei pixel assegnati</li>
            <li>Ripete fino a stabilizzazione — tipicamente 10–20 iterazioni</li>
          </ol>
          <p>
            Il risultato è una palette di K colori che rappresentano la zona analizzata.
            K=8 significa "cerca 8 colori dominanti" — un po' come ridurre una fotografia
            a una palette limitata.
          </p>
          <p>
            Ogni centroide viene poi confrontato con il database pigmenti usando il
            <strong>Delta E CIE2000</strong> — la misura scientifica della distanza percettiva
            tra due colori. ΔE &lt; 10 significa che il pigmento è un buon candidato;
            ΔE 10–25 indica un match possibile (potrebbe essere una miscela);
            ΔE &gt; 25 nessun singolo pigmento spiega bene quel colore.
          </p>
        </div>

        <!-- ── Blocco 4: limiti onesti ─────────────────────────────────────── -->
        <div class="science__block science__block--disclaimer">
          <h3 class="science__block-title">
            <span class="science__icon">⚠️</span>
            Cosa ChromaScope non può fare
          </h3>
          <ul class="science__list">
            <li>
              <strong>Non distingue strati pittorici</strong>: Rembrandt usava velature trasparenti sopra
              a basi coprenti. Il RGB finale è la somma ottica di tutti gli strati — ChromaScope
              non può disaggregarli.
            </li>
            <li>
              <strong>Non vede il degrado</strong>: molti pigmenti cambiano colore nel tempo.
              Lo smalto nella Ronda di Notte è virato al grigio dal suo blu originale.
              ChromaScope confronta il colore attuale con il pigmento fresco nel database.
            </li>
            <li>
              <strong>Non risolve il metamerismo</strong>: due pigmenti diversi possono dare
              lo stesso RGB sotto la luce della fotografia. Solo la spettroscopia Raman
              o l'XRF possono distinguerli in modo definitivo.
            </li>
          </ul>
          <p class="science__disclaimer-text">
            Per un'identificazione certa dei pigmenti è necessaria un'analisi strumentale in laboratorio.
            ChromaScope è uno strumento di <em>esplorazione</em> e <em>ipotesi</em>, non di diagnosi definitiva.
          </p>
        </div>

        <!-- Riferimenti -->
        <div class="science__refs">
          <p class="science__refs-title">Fonti e approfondimenti</p>
          <ul class="science__refs-list">
            <li>Kubelka &amp; Munk, <em>Ein Beitrag zur Optik der Farbanstriche</em>, 1931</li>
            <li>Tan et al., <em>Pigmento: Pigment-Based Image Analysis</em>, IEEE TVCG 2019</li>
            <li>Sochorová et al., <em>Practical Pigment Mixing for Digital Painting</em> (Mixbox), ACM SIGGRAPH 2021</li>
            <li>Rijksmuseum / Operation Night Watch — <em>Technical studies on Rembrandt's Night Watch</em>, 2019–2024</li>
          </ul>
        </div>

      </div>
    </Transition>

  </section>
</template>

<script setup lang="ts">
const open = ref(false)
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.science {
  border-top: 1px solid #1e1e1e;
  background: #0a0a0a;
}

/* ── Toggle ──────────────────────────────────────────────────────────────── */
.science__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.85rem 1.5rem;
  text-align: left;
  transition: color 0.2s, background 0.2s;
}
.science__toggle:hover {
  color: #bbb;
  background: rgba(255, 255, 255, 0.03);
}

.science__toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.science__toggle-arrow {
  font-size: 0.9rem;
  transition: transform 0.25s;
}
.science__toggle-arrow--open {
  transform: rotate(180deg);
}

/* ── Transition ──────────────────────────────────────────────────────────── */
.science-expand-enter-active,
.science-expand-leave-active {
  transition: max-height 0.35s ease, opacity 0.25s ease;
  max-height: 1200px;
  overflow: hidden;
}
.science-expand-enter-from,
.science-expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Body ────────────────────────────────────────────────────────────────── */
.science__body {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Blocchi ─────────────────────────────────────────────────────────────── */
.science__block {
  background: #111;
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.science__block--disclaimer {
  background: rgba(180, 120, 60, 0.06);
  border: 1px solid rgba(180, 120, 60, 0.15);
}

.science__block-title {
  color: #c8a96e;
  font-size: 0.82rem;
  font-weight: 600;
  margin: 0 0 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.science__block--disclaimer .science__block-title {
  color: #b87a40;
}

.science__icon {
  font-size: 1rem;
}

.science__block p {
  color: #999;
  font-size: 0.78rem;
  line-height: 1.65;
  margin: 0 0 0.6rem;
}
.science__block p:last-child { margin-bottom: 0; }

/* ── Liste ───────────────────────────────────────────────────────────────── */
.science__list {
  color: #888;
  font-size: 0.77rem;
  line-height: 1.6;
  margin: 0.5rem 0;
  padding-left: 1.2rem;
}

.science__list--ordered {
  list-style: decimal;
}

.science__list li {
  margin: 0.25rem 0;
}

.science__list strong { color: #bbb; }

/* ── Callout ─────────────────────────────────────────────────────────────── */
.science__callout {
  background: #1a1a1a;
  border-left: 2px solid #333;
  border-radius: 0 4px 4px 0;
  color: #888;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.55;
  margin-top: 0.75rem;
  padding: 0.6rem 0.85rem;
}

.science__callout--gold {
  border-left-color: rgba(200, 169, 110, 0.4);
}

.science__callout strong { color: #aaa; font-style: normal; }

/* ── Disclaimer text ─────────────────────────────────────────────────────── */
.science__disclaimer-text {
  color: #777 !important;
  font-size: 0.73rem !important;
  border-top: 1px solid rgba(180, 120, 60, 0.15);
  margin-top: 0.75rem !important;
  padding-top: 0.6rem;
}

/* ── Riferimenti ─────────────────────────────────────────────────────────── */
.science__refs {
  padding: 0.75rem 1rem;
  background: #0e0e0e;
  border-radius: 6px;
}

.science__refs-title {
  color: #555;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 0 0 0.4rem;
  text-transform: uppercase;
}

.science__refs-list {
  color: #555;
  font-size: 0.7rem;
  line-height: 1.6;
  list-style: none;
  margin: 0;
  padding: 0;
}

.science__refs-list li::before {
  content: "↗ ";
  opacity: 0.5;
}

.science__refs-list em { font-style: italic; }
</style>
