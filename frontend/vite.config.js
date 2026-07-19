import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 백엔드는 병렬 개발 중. /api 요청을 로컬 Spring Boot(기본 8080)로 프록시한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
