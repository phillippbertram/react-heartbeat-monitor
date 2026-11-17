import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const librarySource = new URL('../../packages/react-heartbeat-monitor/src/', import.meta.url);

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: command === 'serve' ? [
      { find: /^react-heartbeat-monitor$/, replacement: fileURLToPath(new URL('index.ts', librarySource)) },
      { find: /^react-heartbeat-monitor\/styles\.css$/, replacement: fileURLToPath(new URL('HeartbeatMonitor.css', librarySource)) },
    ] : [],
  },
  server: { watch: { usePolling: true } },
}));
