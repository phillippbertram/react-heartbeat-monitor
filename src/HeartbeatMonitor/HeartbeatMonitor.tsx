'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_WAVEFORM, sampleEcg, type EcgWave } from './ecgWaveform';
import './HeartbeatMonitor.css';

export type HeartbeatStatus = 'normal' | 'low' | 'high' | 'flatline';

export interface HeartbeatThresholds {
  low: number;
  high: number;
}

export interface HeartbeatMonitorProps {
  /** Target heart rate. 0 = flatline. */
  bpm?: number;
  /** Trace colour in the normal range. Any CSS colour. Falls back to the CSS variable --hb-accent. */
  color?: string;
  /** Colour when bpm is outside `thresholds`. Falls back to --hb-warn. */
  warnColor?: string;
  /** Colour on flatline. Falls back to --hb-alarm. */
  alarmColor?: string;
  /** Height in px (or any CSS length). Falls back to --hb-height. */
  height?: number | string;
  /** Glow radius in px. Falls back to --hb-glow. */
  glow?: number;
  /** Sweep speed in px per second. Higher = beats are wider apart. */
  sweepSpeed?: number;
  /** Stroke width of the trace in px. */
  lineWidth?: number;
  /** Height of the R peak as a fraction of the monitor height. */
  amplitude?: number;
  /** Vertical position of the baseline, 0 = top, 1 = bottom. */
  baseline?: number;
  /** Width of the erase gap in front of the sweep head, in px. */
  gap?: number;
  /** 0 = old trace stays fully visible, 1 = fades out completely before it gets overwritten. */
  trailFade?: number;
  /** Baseline noise and wander, in ECG units (R peak = 1). */
  noise?: number;
  /** Beat-to-beat variability. 0.05 = ±5 % per beat. */
  variability?: number;
  /** bpm range considered normal. Outside of it the monitor switches to warn state. */
  thresholds?: HeartbeatThresholds;
  /** Small label above the value. */
  label?: string;
  /** Override the status texts shown in the readout. */
  statusLabels?: Partial<Record<HeartbeatStatus, string>>;
  showGrid?: boolean;
  showReadout?: boolean;
  /** Freezes the trace. */
  paused?: boolean;
  /** Custom beat shape, see ecgWaveform.ts. */
  waveform?: EcgWave[];
  /** Fired on every R peak with the instantaneous bpm. */
  onBeat?: (bpm: number) => void;
  className?: string;
  style?: CSSProperties;
}

export const DEFAULT_THRESHOLDS: HeartbeatThresholds = { low: 50, high: 120 };

export const DEFAULT_STATUS_LABELS: Record<HeartbeatStatus, string> = {
  normal: 'SINUS',
  low: 'BRADY',
  high: 'TACHY',
  flatline: 'ASYSTOLE',
};

export function getHeartbeatStatus(bpm: number, thresholds: HeartbeatThresholds): HeartbeatStatus {
  if (bpm <= 0) return 'flatline';
  if (bpm < thresholds.low) return 'low';
  if (bpm > thresholds.high) return 'high';
  return 'normal';
}

/* -------------------------------------------------------------------------- */
/*  Animation loop internals                                                   */
/* -------------------------------------------------------------------------- */

/** Where the R peak sits within one beat cycle (0..1). */
const R_PEAK_PHASE = 0.5;
/** Caps the time step after a tab was in the background, so we don't draw a huge jump. */
const MAX_FRAME_DT = 0.1;
/** How often the trace colour is re-read from CSS, so theme changes from outside are picked up. */
const COLOR_REFRESH_MS = 500;

interface LoopConfig {
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
  onBeat?: (bpm: number) => void;
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
  /** Continuous beat phase, fractional part = position within the current beat. */
  phase: number;
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

function advanceTrace(trace: TraceState, cfg: LoopConfig, dt: number, onBeat: (bpm: number) => void) {
  const speed = Math.max(1, cfg.sweepSpeed);
  const secondsPerColumn = 1 / speed;
  const columns = trace.samples.length;
  trace.pending += speed * dt;

  while (trace.pending >= 1) {
    trace.pending -= 1;
    trace.time += secondsPerColumn;
    trace.head += 1;
    if (trace.head >= columns) {
      trace.head = 0;
      trace.wrapped = true;
    }

    let value = 0;
    if (cfg.bpm > 0) {
      if (!Number.isFinite(trace.rr)) trace.rr = nextInterval(cfg.bpm, cfg.variability);
      const previous = trace.phase % 1;
      trace.phase += secondsPerColumn / trace.rr;
      const phase = trace.phase % 1;

      if (phase < previous) {
        // A new beat cycle starts: pick its length now, so bpm changes apply between beats.
        trace.rr = nextInterval(cfg.bpm, cfg.variability);
      } else if (previous < R_PEAK_PHASE && phase >= R_PEAK_PHASE) {
        onBeat(60 / trace.rr);
      }
      value = sampleEcg(cfg.waveform, phase, R_PEAK_PHASE, trace.rr);
    } else {
      trace.rr = Number.NaN;
    }

    trace.samples[trace.head] = value + baselineNoise(trace.time, cfg.noise);
  }
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

function drawTrace(ctx: CanvasRenderingContext2D, trace: TraceState, cfg: LoopConfig, color: string) {
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

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function HeartbeatMonitor({
  bpm = 72,
  color,
  warnColor,
  alarmColor,
  height,
  glow,
  sweepSpeed = 150,
  lineWidth = 2.25,
  amplitude = 0.42,
  baseline = 0.6,
  gap = 22,
  trailFade = 0.85,
  noise = 0.012,
  variability = 0.03,
  thresholds = DEFAULT_THRESHOLDS,
  label = 'HR',
  statusLabels,
  showGrid = true,
  showReadout = true,
  paused = false,
  waveform = DEFAULT_WAVEFORM,
  onBeat,
  className,
  style,
}: HeartbeatMonitorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [measuredBpm, setMeasuredBpm] = useState<number | null>(null);

  const status = getHeartbeatStatus(bpm, thresholds);

  // The loop reads its config from a ref, so prop changes never restart the animation.
  const config: LoopConfig = {
    bpm, sweepSpeed, lineWidth, amplitude, baseline, gap, trailFade, noise, variability, paused, waveform, onBeat,
  };
  const configRef = useRef(config);
  const colorDirtyRef = useRef(true);

  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    colorDirtyRef.current = true;
  }, [status, color, warnColor, alarmColor]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;

    const trace = createTraceState();
    let strokeColor = '#2bff88';
    let lastColorRead = -Infinity;
    let lastTime: number | null = null;
    let frameId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeTrace(trace, Math.floor(rect.width), rect.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const handleBeat = (instantBpm: number) => {
      const rounded = Math.round(instantBpm);
      // The beat flash in CSS originates from the sweep head.
      root.style.setProperty('--hb-beat-x', `${trace.head}px`);
      // Re-adding the attribute after a forced reflow restarts all CSS beat animations.
      root.removeAttribute('data-beat');
      void root.offsetWidth;
      root.setAttribute('data-beat', '');
      setMeasuredBpm(rounded);
      configRef.current.onBeat?.(rounded);
    };

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);
      const cfg = configRef.current;
      const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, MAX_FRAME_DT);
      lastTime = now;

      // The trace colour comes from CSS (--hb-color), so status/theme changes in CSS apply to the canvas too.
      if (colorDirtyRef.current || now - lastColorRead > COLOR_REFRESH_MS) {
        strokeColor = getComputedStyle(root).getPropertyValue('--hb-color').trim() || strokeColor;
        lastColorRead = now;
        colorDirtyRef.current = false;
      }

      if (!cfg.paused) advanceTrace(trace, cfg, dt, handleBeat);
      drawTrace(ctx, trace, cfg, strokeColor);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  // Only set CSS variables for props that were actually passed, so CSS overrides keep working.
  const cssVars: Record<string, string> = {};
  if (color) cssVars['--hb-accent'] = color;
  if (warnColor) cssVars['--hb-warn'] = warnColor;
  if (alarmColor) cssVars['--hb-alarm'] = alarmColor;
  if (glow !== undefined) cssVars['--hb-glow'] = `${glow}px`;
  if (height !== undefined) cssVars['--hb-height'] = typeof height === 'number' ? `${height}px` : height;

  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };
  const displayValue = status === 'flatline' ? '--' : String(measuredBpm ?? Math.round(bpm));

  return (
    <div
      ref={rootRef}
      className={className ? `hb ${className}` : 'hb'}
      data-status={status}
      role="img"
      aria-label={`${label} ${Math.max(0, Math.round(bpm))} bpm`}
      style={{ ...cssVars, ...style } as CSSProperties}
    >
      <div className="hb__screen">
        {showGrid && <div className="hb__grid" />}
        <div className="hb__flash" />
        <canvas ref={canvasRef} className="hb__trace" />
        <div className="hb__scanlines" />
      </div>

      {showReadout && (
        <div className="hb__readout">
          <div className="hb__row">
            <span className="hb__label">{label}</span>
            <HeartIcon />
          </div>
          <span className="hb__value">{displayValue}</span>
          <div className="hb__row">
            <span className="hb__unit">bpm</span>
            <span className="hb__status">{labels[status]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HeartIcon() {
  return (
    <svg className="hb__heart" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
}
