// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  ssr: false,

  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    'nuxt-auth-utils',
    '@rstore/nuxt-drizzle',
    '@tresjs/nuxt',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false,
  },

  rstoreDrizzle: {
    drizzleConfigPath: 'drizzle.config.ts',
    drizzleImport: {
      name: 'useDrizzle',
      from: '~~/server/utils/drizzle',
    },
    apiPath: '/api/rstore',
    ws: true,
  },

  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 7, // 1 week
    } as any,
  },

  tres: {
    devtools: true,
  },

  vite: {
    $client: {
      build: {
        manifest: 'manifest.json',
      },
    },

    build: {
      minify: false,
    },
  },

  eslint: {
    config: {
      standalone: false,
    },
  },
})
