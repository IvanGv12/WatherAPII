import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// URL del backend
const backendUrl =
  process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],

  server: {
    host: '0.0.0.0',

    // Permitir Railway
    allowedHosts: true,

    proxy: {
      '/sanctum': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },

      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },

      '/login': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },

      '/register': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },

      '/logout': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})