<template>
  <!-- DISCLAIMER: i risultati AI sono ipotesi computazionali, non analisi strumentali -->
  <div class="reasoning-chain">

    <!-- Header con pulsante chiudi -->
    <div class="rc-header">
      <span class="rc-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Ragionamento AI
      </span>
      <button class="rc-close" @click="$emit('close')" aria-label="Chiudi ragionamento">✕</button>
    </div>

    <!-- Input: domanda + zona -->
    <div class="rc-input-area">
      <div class="rc-question-row">
        <input
          v-model="localQuestion"
          class="rc-input"
          type="text"
          placeholder='Chiedi al dipinto… es. "Perché questa zona è così scura?"'
          :disabled="isStreaming"
          @keydown.enter="handleAsk"
        />
        <button
          class="rc-ask-btn"
          :disabled="isStreaming || !canAsk"
          @click="handleAsk"
        >
          {{ isStreaming ? 'Analisi…' : 'Chiedi' }}
        </button>
      </div>

      <!-- Zone context badge -->
      <div v-if="pendingZoneContext" class="rc-zone-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        Zona selezionata: {{ pendingZoneContext.label }}
        <button class="rc-zone-clear" @click="clearZone">✕</button>
      </div>
      <p v-else class="rc-zone-hint">
        Clicca sull'overlay del viewer per selezionare una zona specifica.
      </p>
    </div>

    <!-- Streaming / risultati -->
    <div v-if="isStreaming || sections.length > 0" class="rc-results">

      <!-- Loading skeleton durante lo streaming iniziale -->
      <div v-if="isStreaming && sections.length === 0" class="rc-loading">
        <span class="rc-dot"></span>
        <span class="rc-dot"></span>
        <span class="rc-dot"></span>
        <span class="rc-loading-text">Ragionamento in corso…</span>
      </div>

      <!-- Sezioni progressive -->
      <div
        v-for="section in sections"
        :key="section.title"
        class="rc-section"
        :class="sectionClass(section.title)"
      >
        <h3 class="rc-section-title">{{ section.title }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="rc-section-body" v-html="renderMarkdown(section.body)"></div>
      </div>

      <!-- Cursore streaming -->
      <span v-if="isStreaming && sections.length > 0" class="rc-cursor" aria-hidden="true">▋</span>
    </div>

    <!-- Errore -->
    <div v-if="error" class="rc-error">
      <strong>Errore:</strong> {{ error }}
    </div>

    <!-- Stato vuoto: nessuna analisi ancora -->
    <div v-else-if="!isStreaming && sections.length === 0 && !error" class="rc-empty">
      <p>Esegui un'analisi pigmenti, poi clicca <strong>Chiedi</strong> per ottenere un'interpretazione storica.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { AIReasoningSection, ZoneContext } from '#src/types/aiReasoning'

const props = defineProps<{
  isStreaming: boolean
  error: string | null
  sections: AIReasoningSection[]
  pendingZoneContext: ZoneContext | null
  canAsk: boolean
  modelQuestion: string
}>()

const emit = defineEmits<{
  close: []
  ask: []
  clearZone: []
  'update:modelQuestion': [value: string]
}>()

// v-model locale per l'input — sincronizza con il composable via emit
const localQuestion = computed({
  get: () => props.modelQuestion,
  set: (v) => emit('update:modelQuestion', v),
})

function handleAsk() {
  if (!props.isStreaming && props.canAsk) emit('ask')
}

function clearZone() {
  emit('clearZone')
}

/**
 * Renderizza il body markdown in HTML semplice (no librerie esterne).
 * Solo tag sicuri: <strong>, <em>, <br>, liste.
 */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

/**
 * CSS class aggiuntiva per sezione in base al titolo.
 * La "Nota metodologica" ha uno stile disclaimer distinto.
 */
function sectionClass(title: string): string {
  if (title.toLowerCase().includes('nota') || title.toLowerCase().includes('disclaimer')) {
    return 'rc-section--disclaimer'
  }
  if (title.toLowerCase().includes('anomal')) return 'rc-section--warning'
  return ''
}
</script>

<style scoped>
.reasoning-chain {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow: hidden;
}

/* Header */
.rc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.rc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffd700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.rc-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.rc-close:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }

/* Input area */
.rc-input-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rc-question-row {
  display: flex;
  gap: 8px;
}

.rc-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #f0e6d3;
  font-size: 0.8rem;
  padding: 7px 10px;
  outline: none;
  transition: border-color 0.2s;
}
.rc-input:focus { border-color: rgba(255, 215, 0, 0.5); }
.rc-input::placeholder { color: rgba(255, 255, 255, 0.3); }
.rc-input:disabled { opacity: 0.5; cursor: not-allowed; }

.rc-ask-btn {
  background: linear-gradient(135deg, #b8860b, #ffd700);
  border: none;
  border-radius: 6px;
  color: #1a1209;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 7px 14px;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.rc-ask-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rc-ask-btn:not(:disabled):hover { opacity: 0.9; }

/* Zone context */
.rc-zone-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 4px;
  color: #ffd700;
  font-size: 0.72rem;
  padding: 4px 8px;
}

.rc-zone-clear {
  background: none;
  border: none;
  color: rgba(255, 215, 0, 0.6);
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  margin-left: auto;
  padding: 0 2px;
}
.rc-zone-clear:hover { color: #ffd700; }

.rc-zone-hint {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.7rem;
  font-style: italic;
  margin: 0;
}

/* Results */
.rc-results {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

/* Loading dots */
.rc-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
}

.rc-loading-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  font-style: italic;
}

.rc-dot {
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
  animation: bounce 1.2s infinite ease-in-out;
}
.rc-dot:nth-child(2) { animation-delay: 0.2s; }
.rc-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* Sezioni */
.rc-section {
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 0 6px 6px 0;
  padding: 10px 12px;
}

.rc-section--disclaimer {
  border-left-color: rgba(255, 165, 0, 0.4);
  background: rgba(255, 165, 0, 0.05);
}

.rc-section--warning {
  border-left-color: rgba(255, 100, 100, 0.4);
  background: rgba(255, 100, 100, 0.05);
}

.rc-section-title {
  color: #ffd700;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.rc-section--disclaimer .rc-section-title {
  color: rgba(255, 165, 0, 0.8);
}

.rc-section-body {
  color: rgba(240, 230, 211, 0.85);
  font-size: 0.8rem;
  line-height: 1.6;
}

.rc-section-body :deep(ul) {
  margin: 4px 0;
  padding-left: 16px;
}

.rc-section-body :deep(li) {
  margin: 2px 0;
}

.rc-section-body :deep(strong) {
  color: #f0e6d3;
}

/* Cursore streaming */
.rc-cursor {
  color: #ffd700;
  animation: blink 1s step-start infinite;
  font-size: 0.9rem;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* Errore */
.rc-error {
  background: rgba(220, 50, 50, 0.1);
  border: 1px solid rgba(220, 50, 50, 0.3);
  border-radius: 6px;
  color: #ff8080;
  font-size: 0.8rem;
  padding: 10px 12px;
}

/* Stato vuoto */
.rc-empty {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.8rem;
  line-height: 1.5;
  text-align: center;
  padding: 20px 12px;
}

.rc-empty strong {
  color: rgba(255, 215, 0, 0.6);
}
</style>
