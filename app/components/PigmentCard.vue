<template>
  <!-- UX: drawer laterale con transizione slide-in da destra -->
  <Transition name="drawer">
    <aside
      v-if="pigment"
      class="pigment-card"
      :class="{ 'pigment-card--open': !!pigment }"
      role="complementary"
      :aria-label="`Scheda pigmento: ${pigment.nameIT}`"
    >
      <!-- Header con swatch e nome -->
      <div class="pigment-card__header">
        <span
          class="pigment-card__swatch"
          :style="{ backgroundColor: swatchColor }"
          aria-hidden="true"
        />
        <div class="pigment-card__title-group">
          <h3 class="pigment-card__name">{{ pigment.nameIT }}</h3>
          <span class="pigment-card__name-en">{{ pigment.nameEN }}</span>
        </div>

        <!-- Badge coerenza storica -->
        <span
          v-if="coherenceResult"
          class="pigment-card__coherence"
          :class="`pigment-card__coherence--${coherenceResult.status}`"
          :title="coherenceResult.reason"
        >
          {{ statusIcon(coherenceResult.status) }}
          {{ statusLabel(coherenceResult.status) }}
        </span>

        <button
          class="pigment-card__close"
          @click="$emit('close')"
          aria-label="Chiudi scheda pigmento"
        >
          ✕
        </button>
      </div>

      <!-- Corpo della scheda -->
      <div class="pigment-card__body">

        <!-- Formula chimica -->
        <section class="pigment-card__section">
          <h4 class="pigment-card__section-title">Formula chimica</h4>
          <p class="pigment-card__chemical-name">{{ pigment.chemicalName }}</p>
          <code class="pigment-card__formula">{{ pigment.chemicalFormula }}</code>
        </section>

        <!-- Timeline disponibilità -->
        <section class="pigment-card__section">
          <h4 class="pigment-card__section-title">Periodo storico</h4>
          <div class="pigment-card__timeline">
            <span class="pigment-card__timeline-from">
              {{ pigment.availableFrom !== null ? pigment.availableFrom : 'Antichità' }}
            </span>
            <div class="pigment-card__timeline-bar">
              <div
                class="pigment-card__timeline-fill"
                :style="timelineStyle"
              />
              <!-- Indicatore anno opera -->
              <div
                v-if="artworkDate"
                class="pigment-card__timeline-marker"
                :style="markerStyle"
                :title="`Anno opera: ${artworkDate}`"
              />
            </div>
            <span class="pigment-card__timeline-to">
              {{ pigment.availableTo !== null ? pigment.availableTo : 'Oggi' }}
            </span>
          </div>

          <!-- Disclaimer coerenza storica — DOC_GUIDE.md -->
          <p v-if="coherenceResult" class="pigment-card__coherence-reason">
            {{ coherenceResult.reason }}
          </p>
        </section>

        <!-- Provenienza e costo -->
        <section class="pigment-card__section">
          <h4 class="pigment-card__section-title">Provenienza</h4>
          <p class="pigment-card__origin">{{ pigment.origin }}</p>
          <span class="pigment-card__cost" :class="`pigment-card__cost--${pigment.cost}`">
            {{ costLabel }}
          </span>
        </section>

        <!-- Tecniche pittoriche -->
        <section class="pigment-card__section">
          <h4 class="pigment-card__section-title">Tecniche</h4>
          <div class="pigment-card__tags">
            <span
              v-for="t in pigment.techniques"
              :key="t"
              class="pigment-card__tag"
            >
              {{ t }}
            </span>
          </div>
        </section>

        <!-- Pittori olandesi documentati (se disponibile) -->
        <section v-if="pigment.dutchMasters?.length" class="pigment-card__section">
          <h4 class="pigment-card__section-title">Usato da</h4>
          <div class="pigment-card__tags">
            <span
              v-for="master in pigment.dutchMasters"
              :key="master"
              class="pigment-card__tag pigment-card__tag--artist"
            >
              {{ master }}
            </span>
          </div>
        </section>

        <!-- Note di degrado (se presenti) -->
        <section v-if="pigment.degradation" class="pigment-card__section">
          <h4 class="pigment-card__section-title">Degrado nel tempo</h4>
          <!-- DISCLAIMER: il colore attuale potrebbe differire dall'originale -->
          <p class="pigment-card__degradation">{{ pigment.degradation }}</p>
        </section>

        <!-- Curiosità storica -->
        <section class="pigment-card__section pigment-card__section--trivia">
          <h4 class="pigment-card__section-title">Note storiche</h4>
          <p class="pigment-card__trivia">{{ pigment.trivia }}</p>
        </section>

        <!-- Link fonte -->
        <section class="pigment-card__section">
          <a
            :href="pigment.source"
            target="_blank"
            rel="noopener noreferrer"
            class="pigment-card__source-link"
          >
            Scheda ColourLex / fonte accademica ↗
          </a>
          <span v-if="pigment.uncertain" class="pigment-card__uncertain">
            ⚠ Alcuni dati su questo pigmento sono incerti — vedi fonte
          </span>
        </section>

        <!-- Disclaimer obbligatorio — DOC_GUIDE.md -->
        <div class="pigment-card__disclaimer" role="note">
          <span class="pigment-card__disclaimer-icon">ℹ</span>
          <p>
            La presenza di un pigmento anacronistico
            <strong>non prova la falsificazione</strong> dell'opera.
            Potrebbe indicare un restauro successivo, un errore nella datazione,
            o un caso di metamerismo nell'analisi computazionale.
          </p>
        </div>

      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
/**
 * @description Drawer laterale con la scheda informativa di un pigmento.
 *
 * Mostra: formula chimica, timeline storica, provenienza, costo, tecniche,
 * pittori olandesi documentati, note di degrado, curiosità storiche, fonte.
 *
 * HISTORY: integra il report di coerenza storica da useHistoricalCoherence.
 *
 * @example
 * <PigmentCard
 *   :pigment="selectedPigment"
 *   :coherence-result="coherenceReport.results.get(selectedPigment.id)"
 *   :artwork-date="1642"
 *   @close="selectedPigment = null"
 * />
 */

import { computed } from 'vue'
import type { HistoricalPigment } from '#src/types/pigment'
import type { CoherenceResult } from '../composables/useHistoricalCoherence'
import { useHistoricalCoherence } from '../composables/useHistoricalCoherence'

// ─────────────────────────────────────────────────────────────────────────────
// PROPS / EMITS
// ─────────────────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Pigmento da mostrare (null = drawer chiuso) */
  pigment: HistoricalPigment | null
  /** Risultato coerenza storica da useHistoricalCoherence */
  coherenceResult?: CoherenceResult
  /** Anno dell'opera per il marker sulla timeline */
  artworkDate?: number
}>()

defineEmits<{ close: [] }>()

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────

const { statusIcon, statusLabel } = useHistoricalCoherence()

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED
// ─────────────────────────────────────────────────────────────────────────────

/** COLOR: colore CSS per lo swatch grande */
const swatchColor = computed(() => {
  if (!props.pigment) return 'transparent'
  const [r, g, b] = props.pigment.colorRGB
  return `rgb(${r},${g},${b})`
})

/** Label del costo storico in italiano */
const costLabel = computed(() => {
  switch (props.pigment?.cost) {
    case 'low':      return 'Economico'
    case 'medium':   return 'Medio costo'
    case 'high':     return 'Costoso'
    case 'precious': return 'Preziosissimo'
    default:         return ''
  }
})

/**
 * HISTORY: stile della barra timeline.
 * Mostra il periodo di disponibilità del pigmento su una timeline normalizzata
 * da anno 1200 a 2024.
 */
const timelineStyle = computed(() => {
  if (!props.pigment) return {}
  const MIN_YEAR = 1200
  const MAX_YEAR = 2024
  const range = MAX_YEAR - MIN_YEAR

  const from = props.pigment.availableFrom ?? MIN_YEAR
  const to   = props.pigment.availableTo   ?? MAX_YEAR

  const left  = ((from - MIN_YEAR) / range) * 100
  const width = ((to - from) / range) * 100

  return {
    left:  `${Math.max(0, left)}%`,
    width: `${Math.min(100, width)}%`,
  }
})

/** Posizione del marker "anno opera" sulla timeline */
const markerStyle = computed(() => {
  if (!props.artworkDate) return {}
  const MIN_YEAR = 1200
  const MAX_YEAR = 2024
  const pos = ((props.artworkDate - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100
  return { left: `${Math.max(0, Math.min(100, pos))}%` }
})
</script>

<style scoped>
/* ── DRAWER ANIMATION ────────────────────────────────────────────────────── */

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.2s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* ── LAYOUT ──────────────────────────────────────────────────────────────── */

.pigment-card {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background: #161616;
  border-left: 1px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  z-index: 20;
  overflow: hidden;
}

/* ── HEADER ──────────────────────────────────────────────────────────────── */

.pigment-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0;
}

.pigment-card__swatch {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}

.pigment-card__title-group {
  flex: 1;
  min-width: 0;
}

.pigment-card__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e8e4dc;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pigment-card__name-en {
  font-size: 0.72rem;
  color: #666;
}

.pigment-card__coherence {
  font-size: 0.68rem;
  padding: 0.2rem 0.45rem;
  border-radius: 3px;
  flex-shrink: 0;
  font-weight: 600;
}

.pigment-card__coherence--coherent {
  background: rgba(106, 154, 106, 0.15);
  color: #6a9a6a;
  border: 1px solid rgba(106, 154, 106, 0.3);
}

.pigment-card__coherence--possible {
  background: rgba(160, 128, 64, 0.15);
  color: #c8a060;
  border: 1px solid rgba(160, 128, 64, 0.3);
}

.pigment-card__coherence--anachronistic {
  background: rgba(138, 64, 64, 0.15);
  color: #c87070;
  border: 1px solid rgba(138, 64, 64, 0.3);
}

.pigment-card__coherence--unknown {
  background: rgba(80, 80, 80, 0.2);
  color: #888;
  border: 1px solid rgba(80, 80, 80, 0.3);
}

.pigment-card__close {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s;
}

.pigment-card__close:hover {
  color: #aaa;
}

/* ── BODY ────────────────────────────────────────────────────────────────── */

.pigment-card__body {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 1rem;
  scrollbar-width: thin;
  scrollbar-color: #2a2a2a transparent;
}

/* ── SECTION ─────────────────────────────────────────────────────────────── */

.pigment-card__section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #1e1e1e;
}

.pigment-card__section-title {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #555;
  margin: 0 0 0.4rem;
}

/* ── FORMULA ─────────────────────────────────────────────────────────────── */

.pigment-card__chemical-name {
  font-size: 0.78rem;
  color: #aaa;
  margin: 0 0 0.3rem;
}

.pigment-card__formula {
  font-size: 0.75rem;
  color: #c8a96e;
  font-family: 'Courier New', monospace;
  background: #1a1a1a;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

/* ── TIMELINE ────────────────────────────────────────────────────────────── */

.pigment-card__timeline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.pigment-card__timeline-from,
.pigment-card__timeline-to {
  font-size: 0.65rem;
  color: #555;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  width: 3.5rem;
}

.pigment-card__timeline-to {
  text-align: right;
}

.pigment-card__timeline-bar {
  flex: 1;
  height: 6px;
  background: #2a2a2a;
  border-radius: 3px;
  position: relative;
}

.pigment-card__timeline-fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: #c8a96e;
  border-radius: 3px;
  opacity: 0.6;
}

.pigment-card__timeline-marker {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 14px;
  background: #e8e4dc;
  border-radius: 1px;
  transform: translateX(-50%);
}

.pigment-card__coherence-reason {
  font-size: 0.72rem;
  color: #777;
  margin: 0;
  line-height: 1.5;
  font-style: italic;
}

/* ── PROVENIENZA / COSTO ─────────────────────────────────────────────────── */

.pigment-card__origin {
  font-size: 0.78rem;
  color: #aaa;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.pigment-card__cost {
  font-size: 0.68rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;
}

.pigment-card__cost--low      { background: #1e2e1e; color: #6a9a6a; }
.pigment-card__cost--medium   { background: #2a2010; color: #a08040; }
.pigment-card__cost--high     { background: #2a1818; color: #c87070; }
.pigment-card__cost--precious { background: #2a1a2a; color: #b070c0; }

/* ── TAGS ────────────────────────────────────────────────────────────────── */

.pigment-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.pigment-card__tag {
  font-size: 0.68rem;
  padding: 0.15rem 0.4rem;
  background: #2a2a2a;
  color: #aaa;
  border-radius: 3px;
}

.pigment-card__tag--artist {
  background: #1e1e2a;
  color: #8090c0;
}

/* ── DEGRADO ─────────────────────────────────────────────────────────────── */

.pigment-card__degradation {
  font-size: 0.75rem;
  color: #c87070;
  margin: 0;
  line-height: 1.5;
}

/* ── TRIVIA ──────────────────────────────────────────────────────────────── */

.pigment-card__section--trivia {
  background: #121212;
}

.pigment-card__trivia {
  font-size: 0.78rem;
  color: #aaa;
  margin: 0;
  line-height: 1.6;
  font-style: italic;
}

/* ── SOURCE ──────────────────────────────────────────────────────────────── */

.pigment-card__source-link {
  font-size: 0.72rem;
  color: #6688aa;
  text-decoration: none;
  display: block;
  margin-bottom: 0.3rem;
}

.pigment-card__source-link:hover {
  color: #88aacc;
  text-decoration: underline;
}

.pigment-card__uncertain {
  font-size: 0.68rem;
  color: #a08040;
  display: block;
}

/* ── DISCLAIMER ──────────────────────────────────────────────────────────── */

.pigment-card__disclaimer {
  margin: 0.75rem 1rem 0;
  padding: 0.6rem 0.75rem;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #555;
  line-height: 1.5;
}

.pigment-card__disclaimer-icon {
  flex-shrink: 0;
  color: #444;
}

.pigment-card__disclaimer strong {
  color: #777;
}
</style>
