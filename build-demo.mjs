// Bundles the demo into a single self-contained HTML file.
import { build } from 'esbuild';
import tailwindcss from '@tailwindcss/postcss';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import postcss from 'postcss';

const result = await build({
  entryPoints: ['demo/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  outdir: 'dist',
  jsx: 'automatic',
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'demo-tailwind',
    setup({ onLoad }) {
      const processor = postcss([tailwindcss({ optimize: false })]);
      onLoad({ filter: /[/\\]demo[/\\]demo\.css$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8');
        const { css } = await processor.process(source, { from: path });
        return { contents: css, loader: 'css', resolveDir: dirname(path) };
      });
    },
  }],
});

const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = result.outputFiles.find((f) => f.path.endsWith('.css')).text;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>React Heartbeat Monitor</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/g, '<\\/script')}</script>
</body>
</html>
`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log(`dist/index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
