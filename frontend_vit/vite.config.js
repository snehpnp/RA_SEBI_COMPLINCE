import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/context': path.resolve(__dirname, './src/context'),
      '@/contexts': path.resolve(__dirname, './src/context'),
      'next/navigation': path.resolve(__dirname, './src/utils/nextCompat.jsx'),
      'next/dynamic': path.resolve(__dirname, './src/utils/nextCompat.jsx'),
      'next/link': path.resolve(__dirname, './src/utils/nextCompat.jsx'),
      'next/image': path.resolve(__dirname, './src/utils/nextCompat.jsx'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
