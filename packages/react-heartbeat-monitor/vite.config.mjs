import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'component-styles',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'styles.css.d.ts', source: 'export {};\n' });
      this.emitFile({
        type: 'asset',
        fileName: 'styles.css',
        source: readFileSync(new URL('./src/HeartbeatMonitor.css', import.meta.url)),
      });
    },
  }],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rolldownOptions: {
      external: (id) => id === 'react' || id.startsWith('react/'),
      output: { banner: "'use client';" },
    },
  },
});
