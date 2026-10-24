import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Reachable from a phone on the same Wi-Fi (camera and location still need HTTPS)
    host: true,
    // data/*.json (areas, emergency keywords) is bundled from the repo root
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
