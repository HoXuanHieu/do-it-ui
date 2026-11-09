import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies /api to the ASP.NET Core backend so the refresh-token cookie stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:5194', changeOrigin: true },
      '/health': { target: process.env.VITE_API_PROXY ?? 'http://localhost:5194', changeOrigin: true },
    },
  },
})
