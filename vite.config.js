
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // Tells Vite to output to 'build' folder instead of 'dist'
    chunkSizeWarningLimit: 1600, // Silences the file size warning
  },
  server: {
    // Proxy API requests to backend during local development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
