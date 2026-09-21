import tailwindcss from '@tailwindcss/vite'

// Browser calls `/server/<path>`; Nitro forwards it to `<API_PROXY_TARGET>/api/v1/<path>`.
// The target is read when the config loads, so it is fixed at build time (see docs/development.md).
const apiProxyTarget = (process.env.API_PROXY_TARGET ?? 'http://localhost:8000').replace(/\/$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  ssr: false,
  devtools: { enabled: true },

  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    // Lazy routes pull these in late; without pre-bundling, Vite re-optimizes mid-session and
    // reloads the page, which makes the first navigation to /predict flaky in dev and in e2e.
    optimizeDeps: { include: ['vue3-chessboard', 'chess.js', 'vue-sonner', 'reka-ui'] },
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },

  fonts: {
    families: [{ name: 'Poppins', provider: 'google', weights: [400, 500, 600, 700] }],
  },

  nitro: {
    routeRules: {
      '/server/**': { proxy: `${apiProxyTarget}/api/v1/**` },
    },
  },

  app: {
    head: {
      title: 'My Chess Style',
      meta: [
        {
          name: 'description',
          content: 'Analyze your chess games and discover your playing style.',
        },
      ],
    },
  },
})
