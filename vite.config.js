import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 프론트의 /api 요청을 로컬 백엔드(3001)로 전달
      '/api': 'http://localhost:3001',
    },
  },
})
