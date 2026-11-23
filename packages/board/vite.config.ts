import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One ES module with the board, its styles and @paradigm/shared inside.
// React stays the host's.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: 'dist', emptyOutDir: true, sourcemap: true,
    lib: { entry: 'src/index.tsx', formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'] },
  },
});
