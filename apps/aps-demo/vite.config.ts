import { defineConfig } from 'vite';
import { buildIdentity } from './scripts/build-identity.mjs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  define: { __APS_BUILD__: JSON.stringify(buildIdentity()) },
  base: './', plugins: [tailwindcss()], esbuild: { jsx: 'automatic' },
  build: {
    sourcemap: false,
    modulePreload: { polyfill: false },
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('/node_modules/@xyflow/')) return 'topology';
      if (id.includes('/node_modules/recharts/')) return 'charts';
      if (id.includes('/node_modules/')) return 'vendor';
    } } },
  },
});
