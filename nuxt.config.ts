// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // TypeScript strict — seguendo DOC_GUIDE.md
  typescript: {
    strict: true,
    typeCheck: false, // disabilitato in dev per velocità; abilitare in CI
  },

  // Alias per importare da src/ (types, utils, workers, data) nei componenti Vue.
  // In Nuxt 4 '~' punta a srcDir (app/), quindi usiamo '#src' come prefisso custom.
  // Uso: import type { HistoricalPigment } from '#src/types/pigment'
  alias: {
    '#src': './src',
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
