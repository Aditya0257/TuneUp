import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Proxy /api to Flask in development so the browser sees a single origin
    // and CORS never enters the picture locally.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      // Opt in to the modern Sass compiler API; the legacy one is deprecated.
      scss: { api: 'modern-compiler' },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
