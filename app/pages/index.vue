<template>
  <main class="chromascope">

    <!-- ─── HEADER ──────────────────────────────────────────────────────────── -->
    <header class="chromascope__header">
      <h1 class="chromascope__title">ChromaScope</h1>
      <p class="chromascope__subtitle">Pigment Explorer — Rijksmuseum</p>
    </header>

    <!-- ─── LAYOUT PRINCIPALE ───────────────────────────────────────────────── -->
    <div class="chromascope__body">

      <!-- ── VIEWER ─────────────────────────────────────────────────────── -->
      <section class="chromascope__viewer-section" aria-label="Viewer opera">
        <div class="chromascope__artwork-meta">
          <span class="chromascope__artwork-title">De Nachtwacht — Rembrandt van Rijn, 1642</span>
          <span class="chromascope__artwork-medium">Olio su tela · 379.5 × 453.5 cm</span>
        </div>

        <!--
          IIIF: la Ronda di Notte su iiif.micr.io (ID: PJEZO).
          Risoluzione: 14.645 × 12.158 px.
          @see https://data.rijksmuseum.nl/docs/iiif/image
        -->
        <GigapixelViewer
          ref="viewerRef"
          :iiif-info-url="NIGHT_WATCH_IIIF"
          class="chromascope__viewer"
          @ready="onViewerReady"
        >
          <!-- Slot overlay: heatmap WebGL pigmenti (Fase 2) -->
          <template #overlay>
            <PigmentHeatmap
              v-if="lastAnalysis && lastAnalysis.weightMaps.length > 0"
              :weight-maps="lastAnalysis.weightMaps"
              :palette="lastAnalysis.palette"
              :visible-pigment-ids="visiblePigmentIds"
              :opacity="heatmapOpacity"
              :tile-width="lastAnalysis.stats.tileWidth"
              :tile-height="lastAnalysis.stats.tileHeight"
              @click.native="onOverlayClick"
            />
            <!-- Zona AI selezionata: marker visivo -->
            <div
              v-if="aiZoneMarker"
              class="chromascope__ai-zone-marker"
              :style="{ left: `${aiZoneMarker.x * 100}%`, top: `${aiZoneMarker.y * 100}%` }"
              title="Zona selezionata per analisi AI"
            />
          </template>

          <template #loading>
            <div class="chromascope__viewer-loading">
              <div class="chromascope__spinner" />
              <p>Caricamento Ronda di Notte…</p>
            </div>
          </template>
        </GigapixelViewer>

        <!-- Controllo opacità overlay (visibile solo se c'è un'analisi) -->
        <div v-if="lastAnalysis" class="chromascope__overlay-controls">
          <label class="chromascope__overlay-label">
            Overlay
            <input
              v-model.number="heatmapOpacity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="chromascope__range"
            />
            <span class="chromascope__range-value">{{ Math.round(heatmapOpacity * 100) }}%</span>
          </label>
        </div>
      </section>

      <!-- ── PANNELLO ANALISI ────────────────────────────────────────────── -->
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

          <p v-if="error" class="chromascope__error" role="alert">{{ error }}</p>
        </div>

        <!-- Disclaimer obbligatorio — DOC_GUIDE.md -->
        <div class="chromascope__disclaimer" role="note">
          <span class="chromascope__disclaimer-icon">ℹ</span>
          <p>
            Analisi computazionale basata su modelli fisici (Kubelka-Munk).
            I risultati sono <strong>plausibili ma non definitivi</strong>.
            Il <em>metamerismo</em> limita la certezza dell'identificazione da RGB.
          </p>
        </div>

        <!-- ── Avviso anacronismi ─────────────────────────────────────── -->
        <div
          v-if="coherenceReport?.hasAnachronisms"
          class="chromascope__anachronism-alert"
          role="alert"
        >
          <span>⚠</span>
          <span>
            Pigmenti anacronistici rilevati per il {{ artworkDate }}.
            Clicca su un pigmento per i dettagli.
          </span>
        </div>

        <!-- ── Lista pigmenti identificati ───────────────────────────── -->
        <div v-if="palette.length > 0" class="chromascope__panel-section">
          <h2 class="chromascope__panel-title">
            Pigmenti identificati
            <span class="chromascope__panel-count">{{ palette.length }}</span>
          </h2>

          <!-- Toggle tutti i layer -->
          <div class="chromascope__layer-controls">
            <button class="chromascope__layer-btn" @click="showAllLayers">Mostra tutti</button>
            <button class="chromascope__layer-btn" @click="hideAllLayers">Nascondi tutti</button>
          </div>

          <ul class="chromascope__palette" aria-label="Lista pigmenti">
            <li
              v-for="match in palette"
              :key="match.pigment.id"
              class="chromascope__pigment-row"
              :class="{
                'chromascope__pigment-row--mixture': match.isMixture,
                'chromascope__pigment-row--hidden': !visiblePigmentIds.includes(match.pigment.id),
              }"
            >
              <!-- Toggle visibilità layer -->
              <button
                class="chromascope__layer-toggle"
                :class="{ 'chromascope__layer-toggle--active': visiblePigmentIds.includes(match.pigment.id) }"
                :title="visiblePigmentIds.includes(match.pigment.id) ? 'Nascondi layer' : 'Mostra layer'"
                @click="toggleLayer(match.pigment.id)"
                aria-hidden="true"
              >
                <span class="chromascope__layer-dot" :style="{ backgroundColor: rgbToCss(match.pigment.colorRGB) }" />
              </button>

              <!-- Swatch colore — click apre PigmentCard -->
              <button
                class="chromascope__swatch-btn"
                :style="{ backgroundColor: rgbToCss(match.pigment.colorRGB) }"
                :title="`${match.pigment.nameIT} — ${match.pigment.chemicalName}`"
                @click="openPigmentCard(match)"
                aria-label="Apri scheda pigmento"
              />

              <!-- Info pigmento -->
              <div class="chromascope__pigment-info">
                <button
                  class="chromascope__pigment-name-btn"
                  @click="openPigmentCard(match)"
                >
                  {{ match.pigment.nameIT }}
                </button>
                <span class="chromascope__pigment-formula">{{ match.pigment.chemicalFormula }}</span>

                <span v-if="match.isMixture" class="chromascope__badge chromascope__badge--mix">
                  miscela
                </span>
                <span v-if="match.isMixture && match.mixtureComponents" class="chromascope__mixture-detail">
                  {{ match.mixtureComponents.map(c => `${c.pigment.nameIT} ${Math.round(c.ratio * 100)}%`).join(' + ') }}
                </span>
              </div>

              <!-- Metriche + badge coerenza storica -->
              <div class="chromascope__pigment-metrics">
                <!-- Badge coerenza — Fase 3 -->
                <span
                  v-if="coherenceReport"
                  class="chromascope__coherence-badge"
                  :class="`chromascope__coherence-badge--${coherenceReport.results.get(match.pigment.id)?.status ?? 'unknown'}`"
                  :title="coherenceReport.results.get(match.pigment.id)?.reason"
                >
                  {{ statusIcon(coherenceReport.results.get(match.pigment.id)?.status ?? 'unknown') }}
                </span>

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

          <p class="chromascope__dominant">
            Pigmento dominante: <strong>{{ dominantPigmentName }}</strong>
          </p>
        </div>

        <!-- ── Grafico e confronto artisti (Fase 4) ─────────────────────── -->
        <div v-if="palette.length > 0" class="chromascope__panel-section">
          <h2 class="chromascope__panel-title">Distribuzione e confronto</h2>
          <PaletteChart :palette="palette" />
        </div>

        <!-- ── Ragionamento AI (Fase 5) ──────────────────────────────────── -->
        <div v-if="palette.length > 0" class="chromascope__panel-section">
          <div v-if="!showAiReasoning" class="chromascope__ai-entry">
            <button class="chromascope__btn chromascope__btn--ai" @click="showAiReasoning = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              Analisi storica AI
            </button>
            <p class="chromascope__ai-hint">
              L'AI ragiona sulla palette come uno storico dell'arte — ipotesi, non conclusioni.
            </p>
          </div>

          <ReasoningChain
            v-else
            :is-streaming="aiReasoning.isStreaming.value"
            :error="aiReasoning.error.value"
            :sections="aiReasoning.sections.value"
            :pending-zone-context="aiReasoning.pendingZoneContext.value"
            :can-ask="palette.length > 0"
            :model-question="aiReasoning.question.value"
            @update:model-question="aiReasoning.question.value = $event"
            @ask="triggerAiReasoning"
            @clear-zone="aiReasoning.pendingZoneContext.value = null"
            @close="showAiReasoning = false; aiReasoning.reset()"
          />
        </div>

        <!-- Stato vuoto -->
        <div v-else-if="!isAnalyzing && viewerReady" class="chromascope__empty">
          <p>Naviga sull'opera e premi <strong>Analizza area visibile</strong><br>per identificare i pigmenti nella zona corrente.</p>
        </div>

      </aside>
    </div>

    <!-- ── PigmentCard drawer (Fase 3) ──────────────────────────────────── -->
    <!--
      UX: il drawer è renderizzato fuori dal pannello per non influire sul layout.
      È posizionato absolute rispetto al corpo principale.
    -->
    <div class="chromascope__drawer-host">
      <PigmentCard
        :pigment="selectedPigment?.pigment ?? null"
        :coherence-result="selectedPigment
          ? coherenceReport?.results.get(selectedPigment.pigment.id)
          : undefined"
        :artwork-date="artworkDate"
        @close="selectedPigment = null"
      />
    </div>

  </main>
</template>

<script setup lang="ts">
/**
 * @description Pagina principale ChromaScope — demo con La Ronda di Notte.
 *
 * Integra Fase 1-2-3-4:
 *   1. GigapixelViewer carica l'immagine IIIF
 *   2. "Analizza area visibile" → Worker K-means + matching pigmenti
 *   3. PigmentHeatmap → overlay WebGL con weight map per pigmento (Fase 2)
 *   4. PigmentCard → drawer con scheda dettaglio pigmento (Fase 3)
 *   5. PaletteChart → grafico copertura + confronto artisti (Fase 4)
 *
 * HISTORY: anno opera 1642 — filtra pigmenti non ancora disponibili.
 * Es: Blu di Prussia (1704) viene escluso dall'analisi della Ronda di Notte.
 */

// UX: SSR disabilitato — usa canvas, WebGL e Web Worker (browser-only)
definePageMeta({ ssr: false })

import { ref, computed } from 'vue'
import type { PigmentMatch, TileAnalysis } from '#src/types/analysis'
import { tileKey } from '#src/types/analysis'
import { pigments } from '#src/data/pigments'
import type { ViewerRect } from '../composables/useViewer'
import { useHistoricalCoherence } from '../composables/useHistoricalCoherence'
import { useAiReasoning } from '../composables/useAiReasoning'

// Interfaccia minima esposta da GigapixelViewer tramite defineExpose.
// Evita il dynamic import in type position che causa errori SSR.
interface ViewerInstance {
  goToViewport: (rect: ViewerRect, duration?: number) => void
  getCurrentViewport: () => ViewerRect | null
  captureViewport: () => string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IIIF: URL della Ronda di Notte su iiif.micr.io.
 * ID Micrio: PJEZO — identificatore interno Rijksmuseum.
 * Risoluzione: 14.645 × 12.158 px.
 * @see https://data.rijksmuseum.nl/docs/iiif/image
 */
const NIGHT_WATCH_IIIF = 'https://iiif.micr.io/PJEZO/info.json'

// ─────────────────────────────────────────────────────────────────────────────
// STATO
// ─────────────────────────────────────────────────────────────────────────────

const viewerRef = ref<ViewerInstance | null>(null)
const viewerReady = ref(false)

// Configurazione analisi
const numClusters = ref(8)
// HISTORY: 1642 = anno della Ronda di Notte. Filtra pigmenti anacronistici.
const artworkDate = ref(1642)

// Risultati analisi
const palette = ref<PigmentMatch[]>([])
/** Ultima TileAnalysis completa — include le weight map per l'overlay WebGL */
const lastAnalysis = ref<TileAnalysis | null>(null)

// Stato overlay WebGL (Fase 2)
const heatmapOpacity = ref(0.7)
/** IDs dei pigmenti visibili nell'overlay. Rimpiazzato interamente ad ogni toggle. */
const visiblePigmentIds = ref<string[]>([])

// Stato PigmentCard (Fase 3)
const selectedPigment = ref<PigmentMatch | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSABLES
// ─────────────────────────────────────────────────────────────────────────────

const { analyzeTile, isAnalyzing, progress, error } = useColorAnalyzer()
const { reportFromPalette, statusIcon } = useHistoricalCoherence()

// Fase 5: AI Reasoning
const aiReasoning = useAiReasoning()
const showAiReasoning = ref(false)
/** Posizione normalizzata (0–1) del marker zona AI sull'overlay */
const aiZoneMarker = ref<{ x: number; y: number } | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED
// ─────────────────────────────────────────────────────────────────────────────

/** Report di coerenza storica — ricalcolato quando cambia la palette o l'anno */
const coherenceReport = computed(() => {
  if (palette.value.length === 0) return null
  return reportFromPalette(palette.value, artworkDate.value)
})

const dominantPigmentName = computed(() =>
  palette.value[0]?.pigment.nameIT ?? '—'
)

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

function onViewerReady(): void {
  viewerReady.value = true
}

/**
 * @description Cattura il canvas OSD e avvia l'analisi pigmenti nel Worker.
 *
 * Flusso:
 *   1. captureViewport() → base64 JPEG del canvas OSD visibile
 *   2. Converte JPEG → ImageData (canvas temporaneo 512×512)
 *   3. Invia al Worker tramite useColorAnalyzer
 *   4. Aggiorna palette, lastAnalysis, visiblePigmentIds, coherenceReport
 *
 * DISCLAIMER: la cattura è JPEG (lossy) — introduce lieve imprecisione nei colori.
 * Per alta precisione si dovrebbero accedere ai tile originali non compressi.
 */
async function runAnalysis(): Promise<void> {
  if (!viewerRef.value || !viewerReady.value) return

  const jpeg = viewerRef.value.captureViewport()
  if (!jpeg) {
    console.warn('[index] captureViewport() ha restituito null')
    return
  }

  const imageData = await jpegToImageData(jpeg, 512, 512)
  if (!imageData) return

  // PERF: chiave cache basata sul viewport corrente
  const viewport = viewerRef.value.getCurrentViewport()
  const key = viewport
    ? tileKey(Math.round(viewport.x * 1000), Math.round(viewport.y * 1000), Math.round(viewport.width * 1000))
    : undefined

  const result = await analyzeTile(imageData, {
    numClusters: numClusters.value,
    pigmentDatabase: pigments,
    method: 'kmeans-lab',
    artworkDate: artworkDate.value,
  }, key)

  if (result) {
    palette.value = result.palette
    lastAnalysis.value = result
    // UX: tutti i pigmenti visibili per default dopo una nuova analisi
    visiblePigmentIds.value = result.palette.map(m => m.pigment.id)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER VISIBILITY (Fase 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Attiva/disattiva il layer WebGL di un pigmento specifico.
 * UX: rimpiazza l'array per triggerare la reattività Vue nel PigmentHeatmap.
 */
function toggleLayer(pigmentId: string): void {
  const current = visiblePigmentIds.value
  if (current.includes(pigmentId)) {
    visiblePigmentIds.value = current.filter(id => id !== pigmentId)
  } else {
    visiblePigmentIds.value = [...current, pigmentId]
  }
}

function showAllLayers(): void {
  visiblePigmentIds.value = palette.value.map(m => m.pigment.id)
}

function hideAllLayers(): void {
  visiblePigmentIds.value = []
}

// ─────────────────────────────────────────────────────────────────────────────
// PIGMENT CARD (Fase 3)
// ─────────────────────────────────────────────────────────────────────────────

function openPigmentCard(match: PigmentMatch): void {
  selectedPigment.value = match
}

// ─────────────────────────────────────────────────────────────────────────────
// AI REASONING (Fase 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Avvia il ragionamento AI con la palette corrente.
 * Se c'è un contesto zona da click sull'overlay, lo include nell'input.
 */
async function triggerAiReasoning(): Promise<void> {
  if (!coherenceReport.value) return
  await aiReasoning.startReasoning(
    palette.value,
    coherenceReport.value,
    artworkDate.value,
    'De Nachtwacht — Rembrandt van Rijn',
  )
}

/**
 * @description Gestisce il click sull'overlay per selezionare una zona AI.
 * Calcola le coordinate normalizzate e le pigment weights nella zona.
 *
 * WORKER: legge i weightMaps del lastAnalysis per la zona cliccata.
 * Ogni weightMap[i][wy*W+wx] = peso del pigmento i nel pixel (wx, wy).
 */
function onOverlayClick(e: MouseEvent): void {
  if (!lastAnalysis.value || !showAiReasoning.value) return

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const nx = (e.clientX - rect.left) / rect.width
  const ny = (e.clientY - rect.top) / rect.height

  aiZoneMarker.value = { x: nx, y: ny }

  // Campiona i weight maps nel pixel cliccato
  const W = lastAnalysis.value.stats.tileWidth
  const H = lastAnalysis.value.stats.tileHeight
  const px = Math.floor(nx * W)
  const py = Math.floor(ny * H)
  const idx = py * W + px

  const pigmentWeights = lastAnalysis.value.palette.map((m, i) => ({
    pigmentId: m.pigment.id,
    weight: lastAnalysis.value!.weightMaps[i]?.[idx] ?? 0,
  })).filter(pw => pw.weight > 0.05)

  aiReasoning.setZoneContext({
    x: nx,
    y: ny,
    label: `zona ${Math.round(nx * 100)}%, ${Math.round(ny * 100)}%`,
    pigmentWeights,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Converte una stringa JPEG base64 in ImageData.
 * Disegna l'immagine su un canvas temporaneo e legge i pixel RGBA.
 *
 * @param jpeg      - Stringa base64 "data:image/jpeg;base64,..."
 * @param maxWidth  - Larghezza massima del canvas
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

/** COLOR: converte [R,G,B] in stringa CSS rgb() */
function rgbToCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r},${g},${b})`
}

/**
 * Classe CSS per il badge ΔE.
 * COLOR: ΔE < 10 ottimo (verde), 10-25 accettabile (arancio), > 25 scarso (rosso)
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
  position: relative;
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
  position: relative;
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

/* Controllo opacità overlay */
.chromascope__overlay-controls {
  padding: 0.4rem 1rem;
  background: rgba(0,0,0,0.6);
  border-top: 1px solid #1a1a1a;
  flex-shrink: 0;
}

.chromascope__overlay-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #666;
}

/* ─── PANNELLO ──────────────────────────────────────────────────────────── */

.chromascope__panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #141414;
  scrollbar-width: thin;
  scrollbar-color: #2a2a2a transparent;
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
  width: 2rem;
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

.chromascope__input:disabled { opacity: 0.5; }

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

.chromascope__btn:hover:not(:disabled) { background: #d4bb84; }
.chromascope__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.chromascope__btn--loading { background: #3a3a3a; color: #888; }

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
}

.chromascope__disclaimer strong { color: #888; }
.chromascope__disclaimer em { font-style: italic; }

/* ─── AVVISO ANACRONISMI ─────────────────────────────────────────────────── */

.chromascope__anachronism-alert {
  padding: 0.6rem 1rem;
  background: rgba(138, 64, 64, 0.12);
  border-bottom: 1px solid rgba(138, 64, 64, 0.25);
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #c87070;
  line-height: 1.4;
}

/* ─── LAYER CONTROLS ────────────────────────────────────────────────────── */

.chromascope__layer-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.chromascope__layer-btn {
  flex: 1;
  padding: 0.25rem 0.5rem;
  background: #2a2a2a;
  color: #888;
  border: none;
  border-radius: 4px;
  font-size: 0.68rem;
  cursor: pointer;
  transition: background 0.15s;
}

.chromascope__layer-btn:hover { background: #333; color: #aaa; }

/* ─── PALETTE ───────────────────────────────────────────────────────────── */

.chromascope__palette {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chromascope__pigment-row {
  display: grid;
  grid-template-columns: 20px 22px 1fr auto;
  gap: 0.4rem;
  align-items: start;
  padding: 0.4rem;
  border-radius: 6px;
  background: #1a1a1a;
  transition: opacity 0.2s;
}

.chromascope__pigment-row--mixture {
  border-left: 2px solid #555;
}

.chromascope__pigment-row--hidden {
  opacity: 0.4;
}

/* Toggle layer */
.chromascope__layer-toggle {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
}

.chromascope__layer-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  opacity: 0.3;
  transition: opacity 0.15s;
  border: 1px solid rgba(255,255,255,0.15);
}

.chromascope__layer-toggle--active .chromascope__layer-dot {
  opacity: 1;
}

/* Swatch — clickable */
.chromascope__swatch-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
  margin-top: 1px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.chromascope__swatch-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 2px rgba(200,169,110,0.4);
}

/* Info */
.chromascope__pigment-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.chromascope__pigment-name-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.82rem;
  color: #d8d0c4;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}

.chromascope__pigment-name-btn:hover { color: #c8a96e; }

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

.chromascope__badge--mix { background: #2a2a2a; color: #888; }

.chromascope__mixture-detail { font-size: 0.68rem; color: #666; }

/* Metriche */
.chromascope__pigment-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  flex-shrink: 0;
}

/* Badge coerenza storica nella lista pigmenti */
.chromascope__coherence-badge {
  font-size: 0.65rem;
  font-weight: 700;
  width: 1.2rem;
  text-align: center;
}

.chromascope__coherence-badge--coherent      { color: #6a9a6a; }
.chromascope__coherence-badge--possible      { color: #c8a060; }
.chromascope__coherence-badge--anachronistic { color: #c87070; }
.chromascope__coherence-badge--unknown       { color: #555; }

.chromascope__metric {
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.chromascope__metric--coverage { color: #aaa; font-weight: 600; }
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

.chromascope__dominant strong { color: #c8a96e; }

/* ─── EMPTY / ERROR ─────────────────────────────────────────────────────── */

.chromascope__empty {
  padding: 1.5rem 1rem;
  text-align: center;
  color: #555;
  font-size: 0.8rem;
  line-height: 1.6;
}

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

@keyframes spin { to { transform: rotate(360deg); } }

/* ─── DRAWER HOST ───────────────────────────────────────────────────────── */

/* Il drawer di PigmentCard è posizionato sopra il pannello destro */
.chromascope__drawer-host {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 340px;
  pointer-events: none;
  z-index: 30;
}

/* UX: abilita pointer-events solo se il drawer è aperto */
.chromascope__drawer-host :deep(.pigment-card) {
  pointer-events: auto;
}

/* ─── AI REASONING (Fase 5) ─────────────────────────────────────────────── */

.chromascope__ai-entry {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chromascope__btn--ai {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.2), rgba(255, 215, 0, 0.15));
  border: 1px solid rgba(255, 215, 0, 0.3);
  color: #ffd700;
}
.chromascope__btn--ai:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.35), rgba(255, 215, 0, 0.25));
  border-color: rgba(255, 215, 0, 0.5);
}

.chromascope__ai-hint {
  color: #555;
  font-size: 0.68rem;
  font-style: italic;
  line-height: 1.4;
  margin: 0;
}

/* Marker visivo zona AI sull'overlay viewer */
.chromascope__ai-zone-marker {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #ffd700;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
  animation: pulse-zone 1.5s ease-in-out infinite;
}

@keyframes pulse-zone {
  0%, 100% { box-shadow: 0 0 6px rgba(255, 215, 0, 0.6); }
  50% { box-shadow: 0 0 14px rgba(255, 215, 0, 0.9); }
}

/* ─── RESPONSIVE ────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .chromascope__body {
    grid-template-columns: 1fr;
    grid-template-rows: 55vh 1fr;
  }

  .chromascope__viewer-section {
    border-right: none;
    border-bottom: 1px solid #2a2a2a;
  }

  .chromascope__drawer-host {
    width: 100%;
  }
}
</style>
