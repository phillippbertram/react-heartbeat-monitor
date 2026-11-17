import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const archive = resolve(process.argv[2]);
const react = process.env.REACT_VERSION || '19';
assert.ok(['18', '19'].includes(react));
const cwd = mkdtempSync(join(tmpdir(), `heartbeat-react-${react}-`));
const run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' });
writeFileSync(join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', archive,
  `react@${react}`, `react-dom@${react}`, `@types/react@${react}`, `@types/react-dom@${react}`,
  'typescript@7.0.2', 'vite@8.3.8']);
const pkg = join(cwd, 'node_modules/react-heartbeat-monitor');
const manifest = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
assert.equal(manifest.private, undefined);
assert.deepEqual(manifest.peerDependencies, { react: '^18.0.0 || ^19.0.0' });
assert.ok(readFileSync(join(pkg, 'dist/index.js'), 'utf8').startsWith('"use client"') ||
  readFileSync(join(pkg, 'dist/index.js'), 'utf8').startsWith("'use client'"));
assert.ok(readFileSync(join(pkg, 'dist/styles.css'), 'utf8').includes('.hb'));
assert.ok(readFileSync(join(pkg, 'LICENSE'), 'utf8').includes('MIT'));
assert.ok(!readdirSync(pkg).includes('src'));
writeFileSync(join(cwd, 'main.tsx'), `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { HeartbeatMonitor, DEFAULT_WAVEFORM, type HeartbeatMonitorProps } from 'react-heartbeat-monitor';
import 'react-heartbeat-monitor/styles.css';
const props: HeartbeatMonitorProps = {
  bpm: 72, waveform: DEFAULT_WAVEFORM, backgroundColor: 'transparent',
  showBorder: false, showBackgroundGlow: false, showBeatPulse: false, showScanlines: false,
};
createRoot(document.getElementById('root')!).render(createElement(HeartbeatMonitor, props));
`);
writeFileSync(join(cwd, 'index.html'), '<div id="root"></div><script type="module" src="/main.tsx"></script>');
writeFileSync(join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
  strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx',
}, include: ['main.tsx'] }));
writeFileSync(join(cwd, 'ssr.mjs'), `
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { HeartbeatMonitor, getHeartbeatStatus, DEFAULT_THRESHOLDS } from 'react-heartbeat-monitor';
assert.equal(getHeartbeatStatus(72, DEFAULT_THRESHOLDS), 'normal');
for (const bpm of [0, 72, 150]) {
  const html = renderToString(createElement(HeartbeatMonitor, { bpm, showBorder: false }));
  assert.ok(html.includes('<canvas'));
  assert.ok(html.includes('data-border="off"'));
}
`);
run('node', ['node_modules/typescript/bin/tsc']);
run('node', ['ssr.mjs']);
run('node', ['node_modules/vite/bin/vite.js', 'build']);
const assets = readdirSync(join(cwd, 'dist/assets'));
assert.ok(assets.some(file => file.endsWith('.css') && readFileSync(join(cwd, 'dist/assets', file), 'utf8').includes('.hb')));
console.log(`Package verified with React ${react}: ${cwd}`);
