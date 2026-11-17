import { sampleEcg, type EcgWave } from './ecgWaveform';

/** Where the R peak sits within one beat cycle (0..1). */
const R_PEAK_PHASE = 0.5;
/** Caps the time step after a tab was in the background, so we don't draw a huge jump. */
const MAX_FRAME_DT = 0.1;
/** How often the trace colour is re-read from CSS, so theme changes from outside are picked up. */
const COLOR_REFRESH_MS = 500;

export interface TraceConfig {
  bpm: number;
  sweepSpeed: number;
  lineWidth: number;
  amplitude: number;
  baseline: number;
  gap: number;
  trailFade: number;
  noise: number;
  variability: number;
  paused: boolean;
  waveform: EcgWave[];
}

interface TraceState {
  /** One ECG sample per CSS pixel column. */
  samples: Float32Array;
  height: number;
  /** Column of the most recently written sample. */
  head: number;
  /** True once the sweep has wrapped around at least once. */
  wrapped: boolean;
  /** Sub-pixel progress not yet turned into a column. */
  pending: number;
  /** Position within the current beat, from 0 to 1. */
  phase: number;
  targetBpm: number;
  /** Current R-R interval in seconds (NaN while flatlined). */
  rr: number;
  /** Signal time in seconds, drives the baseline wander. */
  time: number;
}

function createTraceState(): TraceState {
  return {
    samples: new Float32Array(2),
    height: 0,
    head: 0,
    wrapped: false,
    pending: 0,
    phase: 0.1, // start a bit before the R peak so the first beat shows up quickly
    targetBpm: 0,
    rr: Number.NaN,
    time: 0,
  };
}

function resizeTrace(trace: TraceState, width: number, height: number) {
  trace.height = height;
  const columns = Math.max(2, width);
  if (columns === trace.samples.length) return;
  // Keep what's already drawn so resizing doesn't reset the trace.
  const next = new Float32Array(columns);
  next.set(trace.samples.subarray(0, Math.min(trace.samples.length, columns)));
  trace.samples = next;
  if (trace.head >= columns) {
    trace.head = 0;
    trace.wrapped = true;
  }
}

function nextInterval(bpm: number, variability: number): number {
  return (60 / bpm) * (1 + (Math.random() * 2 - 1) * variability);
}

function baselineNoise(time: number, noise: number): number {
  if (noise <= 0) return 0;
  const wander = Math.sin(time * 1.7) * 1.2 + Math.sin(time * 0.43) * 0.8;
  const jitter = (Math.random() - 0.5) * 1.2;
  return noise * (wander + jitter);
}

function advanceTrace(trace: TraceState, cfg: TraceConfig, dt: number, onBeat: (bpm: number) => void): boolean {
  const columns = trace.samples.length;
  // One full sweep per frame is the most the canvas can display.
  const distance = Math.min(cfg.sweepSpeed * dt, columns);
  trace.pending += distance;
  const steps = Math.floor(trace.pending);
  if (steps === 0) return false;

  const secondsPerColumn = dt / distance;
  trace.pending -= steps;

  // Apply the new rate to the current beat without resetting the sweep or phase.
  if (cfg.bpm !== trace.targetBpm) {
    trace.targetBpm = cfg.bpm;
    trace.rr = cfg.bpm > 0 ? nextInterval(cfg.bpm, cfg.variability) : Number.NaN;
  }

  for (let step = 0; step < steps; step++) {
    trace.time += secondsPerColumn;
    trace.head += 1;
    if (trace.head >= columns) {
      trace.head = 0;
      trace.wrapped = true;
    }

    let value = 0;
    if (cfg.bpm > 0) {
      const previous = trace.phase;
      const phase = (previous + secondsPerColumn / trace.rr) % 1;
      trace.phase = phase;

      if (phase < previous) {
        trace.rr = nextInterval(cfg.bpm, cfg.variability);
      } else if (previous < R_PEAK_PHASE && phase >= R_PEAK_PHASE) {
        onBeat(60 / trace.rr);
      }
      value = sampleEcg(cfg.waveform, phase, R_PEAK_PHASE, trace.rr);
    }

    trace.samples[trace.head] = value + baselineNoise(trace.time, cfg.noise);
  }
  return true;
}

function strokeRange(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  from: number,
  to: number,
  toY: (value: number) => number,
) {
  if (to - from < 1) return;
  ctx.beginPath();
  ctx.moveTo(from, toY(samples[from]));
  for (let x = from + 1; x <= to; x++) ctx.lineTo(x, toY(samples[x]));
  ctx.stroke();
}

/**
 * Fades the trace by age: newest pixels (right behind the head) stay opaque,
 * the oldest ones (right in front of the erase gap) get the most transparent.
 * Done as a single alpha mask, so the trace colour can be any CSS colour.
 */
function applyTrailFade(ctx: CanvasRenderingContext2D, width: number, height: number, head: number, fade: number) {
  if (fade <= 0) return;
  const alpha = (age: number) => `rgba(0,0,0,${Math.min(1, Math.max(0, 1 - fade * age))})`;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, alpha(head / width));
  gradient.addColorStop(head / width, alpha(0));
  gradient.addColorStop(Math.min(1, (head + 1) / width), alpha((width - 1) / width));
  gradient.addColorStop(1, alpha(head / width));

  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, lineWidth: number, color: string) {
  const dot = (radius: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.save();
  ctx.fillStyle = color;
  dot(lineWidth * 5, 0.12);
  dot(lineWidth * 2.6, 0.35);
  dot(lineWidth * 1.4, 1);
  ctx.fillStyle = '#fff'; // hot white core, like a phosphor dot
  dot(lineWidth * 0.75, 0.9);
  ctx.restore();
}

function drawTrace(ctx: CanvasRenderingContext2D, trace: TraceState, cfg: TraceConfig, color: string) {
  const width = trace.samples.length;
  const height = trace.height;
  ctx.clearRect(0, 0, width + 2, height + 2);
  if (height <= 0) return;

  const baseY = height * cfg.baseline;
  const scaleY = height * cfg.amplitude;
  const toY = (value: number) => baseY - value * scaleY;
  const head = trace.head;
  const gapEnd = head + Math.max(0, Math.round(cfg.gap)); // last erased column (may wrap)

  ctx.lineWidth = cfg.lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;

  // Current sweep: left edge up to the head. If the erase gap wraps around, it eats the start.
  strokeRange(ctx, trace.samples, gapEnd >= width ? gapEnd - width + 1 : 0, head, toY);
  // Previous sweep: everything to the right of the erase gap.
  if (trace.wrapped) strokeRange(ctx, trace.samples, gapEnd + 1, width - 1, toY);

  applyTrailFade(ctx, width, height, head, cfg.trailFade);
  drawHead(ctx, head, toY(trace.samples[head]), cfg.lineWidth, color);
}

export function startHeartbeatTrace(
  root: HTMLDivElement,
  canvas: HTMLCanvasElement,
  readConfig: () => TraceConfig,
  onBeat: (bpm: number, targetBpm: number) => void,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const trace = createTraceState();
  let resized = true;
  let lastDrawConfig: TraceConfig | undefined;
  let strokeColor = '#2bff88';
  let lastColorRead = -Infinity;
  let lastTime: number | null = null;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resizeTrace(trace, Math.floor(rect.width), rect.height);
    resized = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const handleBeat = (instantBpm: number) => {
    // Re-adding the attribute after a forced reflow restarts the CSS beat effects.
    root.style.setProperty('--hb-beat-x', `${trace.head}px`);
    root.removeAttribute('data-beat');
    void root.offsetWidth;
    root.setAttribute('data-beat', '');
    onBeat(Math.round(instantBpm), trace.targetBpm);
  };

  const frame = (now: number) => {
    frameId = requestAnimationFrame(frame);
    const cfg = readConfig();
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, MAX_FRAME_DT);
    lastTime = now;

    const previousColor = strokeColor;
    if (cfg !== lastDrawConfig || now - lastColorRead >= COLOR_REFRESH_MS) {
      strokeColor = getComputedStyle(root).getPropertyValue('--hb-color').trim() || strokeColor;
      lastColorRead = now;
    }

    const advanced = !cfg.paused && advanceTrace(trace, cfg, dt, handleBeat);
    if (advanced || resized || cfg !== lastDrawConfig || strokeColor !== previousColor) {
      drawTrace(ctx, trace, cfg, strokeColor);
      lastDrawConfig = cfg;
      resized = false;
    }
  };
  let frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    observer.disconnect();
  };
}
