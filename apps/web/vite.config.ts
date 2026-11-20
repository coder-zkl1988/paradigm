import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :8787 and is reached through this proxy, so
// the page and the API share one origin (file links and images work as is).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/v1': { target: 'http://127.0.0.1:8787', changeOrigin: false }, '/mcp': 'http://127.0.0.1:8787' } },
  build: { outDir: 'dist', sourcemap: true },
});
