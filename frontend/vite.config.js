
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://109.94.211.36:4000',
      '/ai': 'http://109.94.211.36:8001'
    }
  }
})
