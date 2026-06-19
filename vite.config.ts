import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/uxtools/',
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'app.html'),
    },
  },
});