import { fileURLToPath, URL } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // ChromaScope è un'app canvas/WebGL/Worker — SSR non è applicabile.
  // Disabilitato globalmente per evitare errori vite-node con moduli browser-only.
  ssr: false,

  // TypeScript strict — seguendo DOC_GUIDE.md
  typescript: {
    strict: true,
    typeCheck: false, // disabilitato in dev per velocità; abilitare in CI
  },

  // Alias per importare da src/ (types, utils, workers, data) nei componenti Vue.
  // NOTA: vite-node (SSR) richiede un path assoluto — i path relativi funzionano
  // solo per il client build. fileURLToPath + import.meta.url garantisce
  // che l'alias risolva correttamente sia in SSR che in client.
  // Uso: import type { HistoricalPigment } from '#src/types/pigment'
  alias: {
    '#src': fileURLToPath(new URL('./src', import.meta.url)),
  },

  vite: {
    // WORKER: configurazione per bundle dei Web Worker TypeScript con Vite
    // Senza questa config Vite non risolve gli import TypeScript dentro i worker
    worker: {
      format: 'es',
    },

    // WORKER: comlink usa Proxy e MessageChannel — non va ottimizzato da Vite
    optimizeDeps: {
      exclude: ['comlink'],
    },
  },
})
