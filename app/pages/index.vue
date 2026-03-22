<template>
  <main class="chromascope">

    <!-- ─── HEADER ──────────────────────────────────────────────────── -->
    <header class="chromascope__header">
      <h1 class="chromascope__title">ChromaScope</h1>
      <p class="chromascope__subtitle">Pigment Explorer — Rijksmuseum</p>
    </header>

    <!-- ─── LAYOUT PRINCIPALE ───────────────────────────────────────── -->
    <div class="chromascope__body">

      <!-- ── VIEWER ───────────────────────────────────────────────── -->
      <section class="chromascope__viewer-section" aria-label="Viewer opera">
        <div class="chromascope__artwork-meta">
          <span class="chromascope__artwork-title">De Nachtwacht — Rembrandt van Rijn, 1642</span>
          <span class="chromascope__artwork-medium">Olio su tela · 379.5 × 453.5 cm</span>
        </div>

        <!-- GigapixelViewer: IIIF Night Watch da iiif.micr.io (ID: PJEZO) -->
        <!--
          IIIF: l'ID PJEZO è l'identificatore Micrio interno per la Ronda di Notte.
          Fonte: https://data.rijksmuseum.nl/docs/iiif/image
          Risoluzione originale: 14.645 × 12.158 px
        -->
        <GigapixelViewer
          ref="viewerRef"
          :iiif-info-url="NIGHT_WATCH_IIIF"
          class="chromascope__viewer"
          @ready="onViewerReady"
        >
          <template #loading>
            <div class="chromascope__viewer-loading">
              <div class="chromascope__spinner" />
              <p>Caricamento Ronda di Notte…</p>
            </div>
          </template>
        </GigapixelViewer>
      </section>

      <!-- ── PANNELLO ANALISI ──────────────────────────────────────── -->
      <aside class="chromascope__panel" aria-label="Analisi pigmenti">

        <!-- Controlli analisi -->
        <div class="chromascope__panel-section">
          <h2 class="chromascope__panel-title">Analisi pigmenti</h2>

          <div class="chromascope__controls">
            <label class="chromascope__label">
              Cluster K-means
              <input
                v-model.number="numClusters"
                type="range"
                min="4"
                max="12"
                step="1"
                class="chromascope__range"
                :disabled="isAnalyzing"
              />
              <span class="chromascope__range-value">{{ numClusters }}</span>
            </label>

            <label class="chromascope__label">
              Anno opera
              <input
                v-model.number="artworkDate"
                type="number"
                min="1400"
                max="1750"
                class="chromascope__input"
                :disabled="isAnalyzing"
              />
            </label>
          </div>

          <button
            class="chromascope__btn"
            :class="{ 'chromascope__btn--loading': isAnalyzing }"
            :disabled="!viewerReady || isAnalyzing"
            @click="runAnalysis"
          >
            {{ isAnalyzing ? 'Analisi in corso…' : 'Analizza area visibile' }}
          </button>

          <!-- Progress bar -->
          <div v-if="isAnalyzing" class="chromascope__progress" role="progressbar" :aria-valuenow="progress">
            <div class="chromascope__progress-bar" :style="{ width: `${progress}%` }" />
            <span class="chromascope__progress-label">{{ progress }}%</span>
          </div>

          <!-- Errore -->
          <p v-if="error" class="chromascope__error" role="alert">{{ error }}</p>
        </div>

        <!-- Disclaimer obbligatorio — DOC_GUIDE.md -->
        <div class="chromascope__disclaimer" role="note">
          <span class="chromascope__disclaimer-icon">ℹ</span>
          <p>
            Analisi computazionale basata su modelli fisici (Kubelka-Munk).
            I risultati sono <strong>plausibili ma non definitivi</strong>.
            Il <em>metamerismo</em> limita la certezza dell'identificazione da immagine RGB.
            Per identificazione certa: analisi strumentale (XRF, Raman, HPLC).
          </p>
        </div>

        <!-- Risultati palette -->
        <div v-if="palette.length > 0" class="chromascope__panel-section">
          <h2 class="chromascope__panel-title">
            Pigmenti identificati
            <span class="chromascope__panel-count">{{ palette.length }}</span>
          </h2>

          <ul class="chromascope__palette" aria-label="Lista pigmenti">
            <li
              v-for="match in palette"
              :key="match.pigment.id"
              class="chromascope__pigment-row"
              :class="{ 'chromascope__pigment-row--mixture': match.isMixture }"
            >
              <!-- Swatch colore -->
              <span
                class="chromascope__swatch"
                :style="{
                  backgroundColor: `rgb(${match.pigment.colorRGB[0]},${match.pigment.colorRGB[1]},${match.pigment.colorRGB[2]})`
                }"
                :title="match.pigment.chemicalName"
                aria-hidden="true"
              />

              <!-- Info pigmento -->
              <div class="chromascope__pigment-info">
                <span class="chromascope__pigment-name">{{ match.pigment.nameIT }}</span>
                <span class="chromascope__pigment-formula">{{ match.pigment.chemicalFormula }}</span>

                <!-- Badge miscela -->
                <span v-if="match.isMixture" class="chromascope__badge chromascope__badge--mix">
                  miscela
                </span>

                <!-- Componenti miscela -->
                <span v-if="match.isMixture && match.mixtureComponents" class="chromascope__mixture-detail">
                  {{ match.mixtureComponents.map(c => `${c.pigment.nameIT} ${Math.round(c.ratio * 100)}%`).join(' + ') }}
                </span>
              </div>

              <!-- Metriche -->
              <div class="chromascope__pigment-metrics">
                <span
                  class="chromascope__metric chromascope__metric--coverage"
                  :title="`Copertura area: ${match.coverage.toFixed(1)}%`"
                >
                  {{ match.coverage.toFixed(1) }}%
                </span>
                <span
                  class="chromascope__metric chromascope__metric--delta"
                  :class="deltaEClass(match.deltaE)"
                  :title="`ΔE CIE2000: ${match.deltaE.toFixed(1)} — distanza percettiva dal pigmento di riferimento`"
                >
                  ΔE {{ match.deltaE.toFixed(1) }}
                </span>

                <!-- Barra confidenza -->
                <div class="chromascope__confidence" :title="`Confidenza: ${Math.round(match.confidence * 100)}%`">
                  <div
                    class="chromascope__confidence-fill"
                    :style="{ width: `${match.confidence * 100}%` }"
                    :class="confidenceClass(match.confidence)"
                  />
                </div>
              </div>
            </li>
          </ul>

          <!-- Pigmento dominante -->
          <p class="chromascope__dominant">
            Pigmento dominante:
            <strong>{{ dominantPigmentName }}</strong>
          </p>
        </div>

        <!-- Stato vuoto -->
        <div v-else-if="!isAnalyzing && viewerReady" class="chromascope__empty">
          <p>Naviga sull'opera e premi <strong>Analizza area visibile</strong><br>per identificare i pigmenti nella zona corrente.</p>
        </div>

      </aside>
    </div>

  </main>
</template>

<script setup lang="ts">
/**
 * @description Pagina principale ChromaScope — demo con La Ronda di Notte.
 *
 * Flusso:
 *   1. GigapixelViewer carica l'immagine IIIF (iiif.micr.io/PJEZO)
 *   2. L'utente naviga sull'opera (zoom, pan)
 *   3. "Analizza area visibile" → cattura il canvas OSD come ImageData
 *   4. ImageData → useColorAnalyzer → Worker K-means + matching pigmenti
 *   5. Risultati mostrati nel pannello: palette, copertura, ΔE, confidenza
 *
 * HISTORY: anno opera 1642 — usato per filtrare i pigmenti non ancora disponibili.
 * Es: Blu di Prussia (1704) viene escluso dall'analisi della Ronda di Notte.
 */

import { ref, computed, type ComponentInstance } from 'vue'
import type { PigmentMatch } from '~/src/types/analysis'
import { tileKey } from '~/src/types/analysis'
import { pigments } from '~/src/data/pigments'

// ─────────────────────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IIIF: URL della Ronda di Notte su iiif.micr.io.
 * ID Micrio: PJEZO — identificatore interno del Rijksmuseum per questa opera.
 * Risoluzione: 14.645 × 12.158 px.
 * @see https://data.rijksmuseum.nl/docs/iiif/image
 */
const NIGHT_WATCH_IIIF = 'https://iiif.micr.io/PJEZO/info.json'

// ─────────────────────────────────────────────────────────────────────────────
// STATO
// ─────────────────────────────────────────────────────────────────────────────

const viewerRef = ref<ComponentInstance<typeof import('../components/GigapixelViewer.vue').default> | null>(null)
const viewerReady = ref(false)

// Configurazione analisi
const numClusters = ref(8)
// HISTORY: 1642 = anno della Ronda di Notte. Filtra pigmenti non ancora disponibili.
const artworkDate = ref(1642)

// Risultati
const palette = ref<PigmentMatch[]>([])

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLE WORKER
// ─────────────────────────────────────────────────────────────────────────────

const { analyzeTile, isAnalyzing, progress, error } = useColorAnalyzer()

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

function onViewerReady(): void {
  viewerReady.value = true
}

/**
 * @description Cattura il canvas OSD corrente e avvia l'analisi pigmenti.
 *
 * Flusso tecnico:
 *   1. captureViewport() → base64 JPEG del canvas OSD
 *   2. Disegna su canvas temporaneo → getImageData() → pixel RGBA grezzi
 *   3. Invia ImageData al Worker tramite useColorAnalyzer
 *
 * DISCLAIMER: la cattura è JPEG (lossy) — introduce lieve imprecisione nei colori.
 * Per analisi di alta precisione si dovrebbe catturare i tile originali non compressi.
 * Questo è accettabile per la demo; da migliorare in Fase 2 con accesso diretto ai tile.
 */
async function runAnalysis(): Promise<void> {
  if (!viewerRef.value || !viewerReady.value) return

  // Step 1: cattura il canvas OSD come JPEG base64
  const jpeg = viewerRef.value.captureViewport()
  if (!jpeg) {
    console.warn('[index] captureViewport() ha restituito null')
    return
  }

  // Step 2: converti JPEG base64 → ImageData tramite canvas temporaneo
  const imageData = await jpegToImageData(jpeg, 512, 512)
  if (!imageData) return

  // PERF: genera chiave cache basata sul viewport corrente
  const viewport = viewerRef.value.getCurrentViewport()
  const key = viewport
    ? tileKey(Math.round(viewport.x * 1000), Math.round(viewport.y * 1000), Math.round(viewport.width * 1000))
    : undefined

  // Step 3: analisi nel Worker
  const result = await analyzeTile(imageData, {
    numClusters: numClusters.value,
    pigmentDatabase: pigments,
    method: 'kmeans-lab',
    artworkDate: artworkDate.value,
  }, key)

  if (result) {
    palette.value = result.palette
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Converte una stringa JPEG base64 in ImageData.
 * Disegna l'immagine su un canvas temporaneo e legge i pixel RGBA.
 *
 * @param jpeg - Stringa base64 "data:image/jpeg;base64,..."
 * @param maxWidth - Larghezza massima del canvas (ricampiona se necessario)
 * @param maxHeight - Altezza massima del canvas
 */
function jpegToImageData(jpeg: string, maxWidth: number, maxHeight: number): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.min(img.width, maxWidth)
      canvas.height = Math.min(img.height, maxHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => resolve(null)
    img.src = jpeg
  })
}

/**
 * Classe CSS per il badge ΔE in base alla distanza percettiva.
 * COLOR: ΔE < 10 buono (verde), 10-25 accettabile (arancio), > 25 scarso (rosso)
 */
function deltaEClass(dE: number): string {
  if (dE < 10) return 'chromascope__metric--good'
  if (dE < 25) return 'chromascope__metric--warn'
  return 'chromascope__metric--poor'
}

function confidenceClass(confidence: number): string {
  if (confidence > 0.7) return 'chromascope__confidence-fill--high'
  if (confidence > 0.4) return 'chromascope__confidence-fill--mid'
  return 'chromascope__confidence-fill--low'
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED
// ─────────────────────────────────────────────────────────────────────────────

const dominantPigmentName = computed(() =>
  palette.value[0]?.pigment.nameIT ?? '—'
)
</script>

<style scoped>
/* ─── LAYOUT ────────────────────────────────────────────────────────────── */

.chromascope {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: #0f0f0f;
  color: #e8e4dc;
  font-family: system-ui, -apple-system, sans-serif;
}

.chromascope__header {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-shrink: 0;
}

.chromascope__title {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #f0ede6;
  margin: 0;
}

.chromascope__subtitle {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
}

.chromascope__body {
  display: grid;
  grid-template-columns: 1fr 340px;
  flex: 1;
  overflow: hidden;
}

/* ─── VIEWER ────────────────────────────────────────────────────────────── */

.chromascope__viewer-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #2a2a2a;
}

.chromascope__artwork-meta {
  padding: 0.5rem 1rem;
  background: #161616;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  gap: 1.5rem;
  align-items: baseline;
  flex-shrink: 0;
}

.chromascope__artwork-title {
  font-size: 0.85rem;
  color: #c8c0b0;
}

.chromascope__artwork-medium {
  font-size: 0.75rem;
  color: #555;
}

.chromascope__viewer {
  flex: 1;
}

.chromascope__viewer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #888;
  font-size: 0.85rem;
}

/* ─── PANNELLO ──────────────────────────────────────────────────────────── */

.chromascope__panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #141414;
}

.chromascope__panel-section {
  padding: 1rem;
  border-bottom: 1px solid #222;
}

.chromascope__panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chromascope__panel-count {
  background: #2a2a2a;
  border-radius: 10px;
  padding: 0 0.4rem;
  font-size: 0.7rem;
  color: #aaa;
}

/* ─── CONTROLLI ─────────────────────────────────────────────────────────── */

.chromascope__controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.chromascope__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #aaa;
}

.chromascope__range {
  flex: 1;
  accent-color: #c8a96e;
}

.chromascope__range-value {
  width: 1.5rem;
  text-align: right;
  color: #c8a96e;
  font-variant-numeric: tabular-nums;
}

.chromascope__input {
  width: 5rem;
  padding: 0.25rem 0.4rem;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e8e4dc;
  font-size: 0.8rem;
}

.chromascope__input:disabled {
  opacity: 0.5;
}

.chromascope__btn {
  width: 100%;
  padding: 0.6rem 1rem;
  background: #c8a96e;
  color: #0f0f0f;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.chromascope__btn:hover:not(:disabled) {
  background: #d4bb84;
}

.chromascope__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chromascope__btn--loading {
  background: #3a3a3a;
  color: #888;
}

/* ─── PROGRESS ──────────────────────────────────────────────────────────── */

.chromascope__progress {
  margin-top: 0.5rem;
  position: relative;
  height: 4px;
  background: #2a2a2a;
  border-radius: 2px;
  overflow: hidden;
}

.chromascope__progress-bar {
  height: 100%;
  background: #c8a96e;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.chromascope__progress-label {
  position: absolute;
  right: 0;
  top: -1.2rem;
  font-size: 0.7rem;
  color: #666;
}

/* ─── DISCLAIMER ────────────────────────────────────────────────────────── */

.chromascope__disclaimer {
  padding: 0.75rem 1rem;
  background: #1a1a1a;
  border-bottom: 1px solid #222;
  display: flex;
  gap: 0.6rem;
  font-size: 0.72rem;
  color: #666;
  line-height: 1.5;
}

.chromascope__disclaimer-icon {
  flex-shrink: 0;
  color: #555;
  font-style: normal;
}

.chromascope__disclaimer strong {
  color: #888;
}

.chromascope__disclaimer em {
  font-style: italic;
}

/* ─── PALETTE ───────────────────────────────────────────────────────────── */

.chromascope__palette {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.chromascope__pigment-row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 0.5rem;
  align-items: start;
  padding: 0.4rem;
  border-radius: 6px;
  background: #1a1a1a;
}

.chromascope__pigment-row--mixture {
  border-left: 2px solid #555;
}

.chromascope__swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
  margin-top: 1px;
}

.chromascope__pigment-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.chromascope__pigment-name {
  font-size: 0.82rem;
  color: #d8d0c4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chromascope__pigment-formula {
  font-size: 0.68rem;
  color: #555;
  font-family: monospace;
}

.chromascope__badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  width: fit-content;
}

.chromascope__badge--mix {
  background: #2a2a2a;
  color: #888;
}

.chromascope__mixture-detail {
  font-size: 0.68rem;
  color: #666;
}

.chromascope__pigment-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.chromascope__metric {
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.chromascope__metric--coverage {
  color: #aaa;
  font-weight: 600;
}

.chromascope__metric--good  { color: #6a9a6a; }
.chromascope__metric--warn  { color: #a08040; }
.chromascope__metric--poor  { color: #8a4040; }

.chromascope__confidence {
  width: 60px;
  height: 3px;
  background: #2a2a2a;
  border-radius: 2px;
  overflow: hidden;
}

.chromascope__confidence-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.chromascope__confidence-fill--high { background: #6a9a6a; }
.chromascope__confidence-fill--mid  { background: #a08040; }
.chromascope__confidence-fill--low  { background: #8a4040; }

/* ─── DOMINANT ──────────────────────────────────────────────────────────── */

.chromascope__dominant {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #666;
}

.chromascope__dominant strong {
  color: #c8a96e;
}

/* ─── EMPTY STATE ───────────────────────────────────────────────────────── */

.chromascope__empty {
  padding: 1.5rem 1rem;
  text-align: center;
  color: #555;
  font-size: 0.8rem;
  line-height: 1.6;
}

/* ─── ERROR ─────────────────────────────────────────────────────────────── */

.chromascope__error {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #a04040;
  padding: 0.4rem 0.6rem;
  background: #1a1010;
  border-radius: 4px;
  border-left: 2px solid #6a2020;
}

/* ─── SPINNER ───────────────────────────────────────────────────────────── */

.chromascope__spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid rgba(200, 169, 110, 0.2);
  border-top-color: #c8a96e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── RESPONSIVE ────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .chromascope__body {
    grid-template-columns: 1fr;
    grid-template-rows: 60vh 1fr;
  }

  .chromascope__viewer-section {
    border-right: none;
    border-bottom: 1px solid #2a2a2a;
  }
}
</style>
