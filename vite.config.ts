import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Builds the content script as a self-contained IIFE (no external imports).
// Also copies everything in public/ → dist/ automatically.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/content/index.tsx'),
      name: 'SnapmarkContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    // Don't extract CSS — it's imported as a string via ?inline and bundled into content.js
    cssCodeSplit: false,
    minify: true,
  },
})
