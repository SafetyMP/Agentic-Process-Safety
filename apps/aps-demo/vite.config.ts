import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/agentic-process-safety/', plugins: [tailwindcss()], esbuild: { jsx: 'automatic' },
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
