import { defineConfig } from 'vite'
import { resolve } from 'path'

// Builds the background service worker as an ES module.
// MV3 service workers support "type": "module" in manifest.json.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // don't wipe the content.js already built
    lib: {
      entry: resolve(__dirname, 'src/background.ts'),
      formats: ['es'],
      fileName: () => 'background.js',
    },
    minify: true,
  },
})
