<template>
  <div class="palette-chart">

    <!-- ── Tabs ─────────────────────────────────────────────────────────── -->
    <div class="palette-chart__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="palette-chart__tab"
        :class="{ 'palette-chart__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── Vista: Distribuzione copertura ────────────────────────────────── -->
    <div v-if="activeTab === 'coverage'" class="palette-chart__view">
      <div class="palette-chart__bars" role="list">
        <div
          v-for="match in sortedPalette"
          :key="match.pigment.id"
          class="palette-chart__bar-row"
          role="listitem"
        >
          <span class="palette-chart__bar-label">
            <span
              class="palette-chart__bar-swatch"
              :style="{ backgroundColor: rgbToCss(match.pigment.colorRGB) }"
              aria-hidden="true"
            />
            {{ match.pigment.nameIT }}
          </span>
          <div class="palette-chart__bar-track" :title="`${match.coverage.toFixed(1)}% copertura`">
            <div
              class="palette-chart__bar-fill"
              :style="{
                width: `${match.coverage}%`,
                backgroundColor: rgbToCss(match.pigment.colorRGB),
              }"
            />
          </div>
          <span class="palette-chart__bar-value">{{ match.coverage.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- ── Vista: Confronto artisti ──────────────────────────────────────── -->
    <div v-else-if="activeTab === 'artists'" class="palette-chart__view">

      <!-- Disclaimer -->
      <p class="palette-chart__artists-note">
        Similitudine Jaccard tra i pigmenti identificati e le palette tipiche documentate.
      </p>

      <div class="palette-chart__artists" role="list">
        <div
          v-for="cmp in artistComparisons"
          :key="cmp.artist.id"
          class="palette-chart__artist-row"
          role="listitem"
        >
          <div class="palette-chart__artist-header">
            <span class="palette-chart__artist-name">{{ cmp.artist.name }}</span>
            <span class="palette-chart__artist-period">{{ cmp.artist.period }}</span>
            <span
              class="palette-chart__artist-score"
              :class="scoreClass(cmp.score)"
            >
              {{ Math.round(cmp.score * 100) }}%
            </span>
          </div>

          <!-- Barra score -->
          <div class="palette-chart__artist-bar-track">
            <div
              class="palette-chart__artist-bar-fill"
              :class="scoreClass(cmp.score)"
              :style="{ width: `${cmp.score * 100}%` }"
            />
          </div>

          <!-- Pigmenti in comune -->
          <div v-if="cmp.sharedPigmentIds.length" class="palette-chart__shared">
            <span class="palette-chart__shared-label">In comune:</span>
            <div class="palette-chart__shared-swatches">
              <span
                v-for="id in cmp.sharedPigmentIds.slice(0, 8)"
                :key="id"
                class="palette-chart__shared-swatch"
                :style="{ backgroundColor: getSwatchColor(id) }"
                :title="id"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Vista: Export ──────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'export'" class="palette-chart__view">
      <div class="palette-chart__export-actions">
        <button class="palette-chart__export-btn" @click="exportJSON">
          Esporta JSON
        </button>
        <button class="palette-chart__export-btn" @click="exportSVG">
          Esporta SVG
        </button>
      </div>

      <!-- Preview palette come swatches -->
      <div class="palette-chart__swatches-preview" role="list">
        <div
          v-for="match in sortedPalette"
          :key="match.pigment.id"
          class="palette-chart__swatch-item"
          role="listitem"
        >
          <div
            class="palette-chart__swatch-block"
            :style="{ backgroundColor: rgbToCss(match.pigment.colorRGB) }"
          />
          <span class="palette-chart__swatch-name">{{ match.pigment.nameIT }}</span>
          <span class="palette-chart__swatch-pct">{{ match.coverage.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
/**
 * @description Componente per la visualizzazione della palette pigmenti identificata.
 *
 * Tre viste:
 * 1. "Copertura" — barre orizzontali per ogni pigmento (% area)
 * 2. "Confronto artisti" — score Jaccard rispetto alle palette tipiche documentate
 * 3. "Export" — export JSON / SVG della palette
 *
 * Non usa D3 per le barre (CSS è sufficiente e più leggero).
 * D3 è disponibile come dipendenza per visualizzazioni future più complesse.
 */

import { ref, computed } from 'vue'
import type { PigmentMatch } from '#src/types/analysis'
import { artistPalettes, compareWithAllArtists } from '#src/data/artistPalettes'

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Palette pigmenti identificati dall'analisi */
  palette: PigmentMatch[]
}>()

// ─────────────────────────────────────────────────────────────────────────────
// STATO UI
// ─────────────────────────────────────────────────────────────────────────────

const activeTab = ref<'coverage' | 'artists' | 'export'>('coverage')

const tabs = [
  { id: 'coverage' as const, label: 'Copertura' },
  { id: 'artists'  as const, label: 'Confronto artisti' },
  { id: 'export'   as const, label: 'Export' },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED
// ─────────────────────────────────────────────────────────────────────────────

/** Palette ordinata per copertura decrescente */
const sortedPalette = computed(() =>
  [...props.palette].sort((a, b) => b.coverage - a.coverage)
)

/**
 * Confronto con tutti gli artisti, ordinato per score Jaccard decrescente.
 * HISTORY: usa i pigmentIds dalla palette identificata.
 */
const artistComparisons = computed(() => {
  const foundIds = props.palette.map(m => m.pigment.id)
  return compareWithAllArtists(foundIds)
})

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/** COLOR: converte [R,G,B] in stringa CSS rgb() */
function rgbToCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r},${g},${b})`
}

/** Ottieni il colore swatch per un pigment ID dalla palette corrente */
function getSwatchColor(pigmentId: string): string {
  const match = props.palette.find(m => m.pigment.id === pigmentId)
  if (!match) return '#333'
  return rgbToCss(match.pigment.colorRGB)
}

/** Classe CSS per lo score di similitudine */
function scoreClass(score: number): string {
  if (score >= 0.5) return 'palette-chart--score-high'
  if (score >= 0.25) return 'palette-chart--score-mid'
  return 'palette-chart--score-low'
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Esporta la palette come file JSON.
 * Formato: array di oggetti con id, nome, copertura, ΔE, colorRGB.
 */
function exportJSON(): void {
  const data = sortedPalette.value.map(m => ({
    id:       m.pigment.id,
    nameIT:   m.pigment.nameIT,
    nameEN:   m.pigment.nameEN,
    coverage: parseFloat(m.coverage.toFixed(2)),
    deltaE:   parseFloat(m.deltaE.toFixed(2)),
    confidence: parseFloat(m.confidence.toFixed(3)),
    colorRGB: m.pigment.colorRGB,
    isMixture: m.isMixture,
  }))

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, 'chromascope-palette.json')
}

/**
 * @description Esporta la palette come file SVG con swatches e etichette.
 */
function exportSVG(): void {
  const sw = 60   // swatch width
  const sh = 60   // swatch height
  const pad = 10
  const labelH = 16
  const cols = 4
  const rows = Math.ceil(sortedPalette.value.length / cols)
  const W = cols * (sw + pad) + pad
  const H = rows * (sh + labelH + pad) + pad

  let svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="#0f0f0f"/>`,
  ]

  sortedPalette.value.forEach((m, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = pad + col * (sw + pad)
    const y = pad + row * (sh + labelH + pad)
    const [r, g, b] = m.pigment.colorRGB
    const name = m.pigment.nameIT.length > 12
      ? m.pigment.nameIT.slice(0, 11) + '…'
      : m.pigment.nameIT

    svgParts.push(
      `<rect x="${x}" y="${y}" width="${sw}" height="${sh}" fill="rgb(${r},${g},${b})" rx="4"/>`,
      `<text x="${x + sw / 2}" y="${y + sh + labelH - 4}" text-anchor="middle"`,
      `  font-size="9" font-family="system-ui,sans-serif" fill="#aaa">${name}</text>`,
    )
  })

  svgParts.push('</svg>')
  const blob = new Blob([svgParts.join('\n')], { type: 'image/svg+xml' })
  downloadBlob(blob, 'chromascope-palette.svg')
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.palette-chart {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── TABS ────────────────────────────────────────────────────────────────── */

.palette-chart__tabs {
  display: flex;
  border-bottom: 1px solid #222;
}

.palette-chart__tab {
  flex: 1;
  padding: 0.5rem 0.25rem;
  background: none;
  border: none;
  color: #555;
  font-size: 0.72rem;
  cursor: pointer;
  transition: color 0.15s, border-bottom 0.15s;
  border-bottom: 2px solid transparent;
}

.palette-chart__tab--active {
  color: #c8a96e;
  border-bottom-color: #c8a96e;
}

.palette-chart__tab:hover:not(.palette-chart__tab--active) {
  color: #888;
}

/* ── VIEW ────────────────────────────────────────────────────────────────── */

.palette-chart__view {
  padding: 0.75rem 0;
}

/* ── BARRE COPERTURA ─────────────────────────────────────────────────────── */

.palette-chart__bars {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.palette-chart__bar-row {
  display: grid;
  grid-template-columns: 110px 1fr 36px;
  align-items: center;
  gap: 0.5rem;
}

.palette-chart__bar-label {
  font-size: 0.72rem;
  color: #aaa;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-chart__bar-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.1);
}

.palette-chart__bar-track {
  height: 8px;
  background: #222;
  border-radius: 4px;
  overflow: hidden;
}

.palette-chart__bar-fill {
  height: 100%;
  border-radius: 4px;
  opacity: 0.8;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
}

.palette-chart__bar-value {
  font-size: 0.68rem;
  color: #666;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── CONFRONTO ARTISTI ───────────────────────────────────────────────────── */

.palette-chart__artists-note {
  font-size: 0.68rem;
  color: #555;
  margin: 0 0 0.75rem;
  line-height: 1.4;
  font-style: italic;
}

.palette-chart__artists {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.palette-chart__artist-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.palette-chart__artist-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.palette-chart__artist-name {
  font-size: 0.78rem;
  color: #c8c0b0;
  flex: 1;
}

.palette-chart__artist-period {
  font-size: 0.65rem;
  color: #555;
}

.palette-chart__artist-score {
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.palette-chart--score-high { color: #6a9a6a; }
.palette-chart--score-mid  { color: #a08040; }
.palette-chart--score-low  { color: #666; }

.palette-chart__artist-bar-track {
  height: 4px;
  background: #222;
  border-radius: 2px;
  overflow: hidden;
}

.palette-chart__artist-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.palette-chart__artist-bar-fill.palette-chart--score-high { background: #6a9a6a; }
.palette-chart__artist-bar-fill.palette-chart--score-mid  { background: #a08040; }
.palette-chart__artist-bar-fill.palette-chart--score-low  { background: #444; }

.palette-chart__shared {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.palette-chart__shared-label {
  font-size: 0.65rem;
  color: #555;
  flex-shrink: 0;
}

.palette-chart__shared-swatches {
  display: flex;
  gap: 0.2rem;
}

.palette-chart__shared-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.08);
}

/* ── EXPORT ──────────────────────────────────────────────────────────────── */

.palette-chart__export-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.palette-chart__export-btn {
  flex: 1;
  padding: 0.45rem 0.75rem;
  background: #2a2a2a;
  color: #aaa;
  border: 1px solid #333;
  border-radius: 5px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.palette-chart__export-btn:hover {
  background: #333;
  color: #e8e4dc;
}

.palette-chart__swatches-preview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.palette-chart__swatch-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.palette-chart__swatch-block {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.08);
}

.palette-chart__swatch-name {
  font-size: 0.62rem;
  color: #777;
  text-align: center;
  line-height: 1.2;
}

.palette-chart__swatch-pct {
  font-size: 0.6rem;
  color: #555;
  font-variant-numeric: tabular-nums;
}
</style>
