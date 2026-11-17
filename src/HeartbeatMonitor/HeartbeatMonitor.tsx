'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_WAVEFORM, type EcgWave } from './ecgWaveform';
import { startHeartbeatTrace, type TraceConfig } from './trace';
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
  /** Background colour, including 'transparent'. Falls back to --hb-bg. */
  backgroundColor?: string;
  /** Height in px (or any CSS length). Falls back to --hb-height. */
  height?: number | string;
  /** Trace glow radius in px. Falls back to --hb-glow. */
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
  /** Shows the monitor border and readout divider. */
  showBorder?: boolean;
  /** Shows the frame halo and tinted background. */
  showBackgroundGlow?: boolean;
  /** Shows the screen flash and readout animations on each beat. */
  showBeatPulse?: boolean;
  /** Shows the scanline overlay and vignette. */
  showScanlines?: boolean;
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

const DEFAULT_SWEEP_SPEED = 150;
const DEFAULT_LINE_WIDTH = 2.25;
const DEFAULT_TRAIL_FADE = 0.85;

export function getHeartbeatStatus(bpm: number, thresholds: HeartbeatThresholds): HeartbeatStatus {
  if (!Number.isFinite(bpm) || bpm <= 0) return 'flatline';
  if (bpm < thresholds.low) return 'low';
  if (bpm > thresholds.high) return 'high';
  return 'normal';
}

export function HeartbeatMonitor({
  bpm = 72,
  color,
  warnColor,
  alarmColor,
  backgroundColor,
  height,
  glow,
  sweepSpeed = DEFAULT_SWEEP_SPEED,
  lineWidth = DEFAULT_LINE_WIDTH,
  amplitude = 0.42,
  baseline = 0.6,
  gap = 22,
  trailFade = DEFAULT_TRAIL_FADE,
  noise = 0.012,
  variability = 0.03,
  thresholds = DEFAULT_THRESHOLDS,
  label = 'HR',
  statusLabels,
  showBorder = true,
  showBackgroundGlow = true,
  showBeatPulse = true,
  showScanlines = true,
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
  const [measurement, setMeasurement] = useState<{ bpm: number; targetBpm: number } | null>(null);

  const status = getHeartbeatStatus(bpm, thresholds);
  const targetBpm = status === 'flatline' ? 0 : bpm;

  const trace: TraceConfig = {
    bpm: targetBpm,
    sweepSpeed: Number.isFinite(sweepSpeed) ? Math.max(1, sweepSpeed) : DEFAULT_SWEEP_SPEED,
    lineWidth: Number.isFinite(lineWidth) && lineWidth > 0 ? lineWidth : DEFAULT_LINE_WIDTH,
    trailFade: Number.isFinite(trailFade) ? trailFade : DEFAULT_TRAIL_FADE,
    variability: Number.isFinite(variability) ? Math.min(1 - Number.EPSILON, Math.max(0, variability)) : 0,
    amplitude,
    baseline,
    gap,
    noise,
    paused,
    waveform,
  };
  const config = { trace, onBeat, showReadout };
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    // Read current props without restarting the animation when they change.
    return startHeartbeatTrace(
      root,
      canvas,
      () => configRef.current.trace,
      (bpm, targetBpm) => {
        const current = configRef.current;
        if (current.showReadout) {
          setMeasurement((previous) => (
            previous?.bpm === bpm && previous.targetBpm === targetBpm ? previous : { bpm, targetBpm }
          ));
        }
        current.onBeat?.(bpm);
      },
    );
  }, []);

  // Only set CSS variables for props that were actually passed, so CSS overrides keep working.
  const cssVars: Record<string, string> = {};
  if (color) cssVars['--hb-accent'] = color;
  if (warnColor) cssVars['--hb-warn'] = warnColor;
  if (alarmColor) cssVars['--hb-alarm'] = alarmColor;
  if (backgroundColor) cssVars['--hb-bg'] = backgroundColor;
  if (glow !== undefined) cssVars['--hb-glow'] = `${glow}px`;
  if (height !== undefined) cssVars['--hb-height'] = typeof height === 'number' ? `${height}px` : height;

  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };
  const displayBpm = measurement?.targetBpm === targetBpm ? measurement.bpm : Math.round(targetBpm);
  const displayValue = status === 'flatline' ? '--' : displayBpm;

  return (
    <div
      ref={rootRef}
      className={className ? `hb ${className}` : 'hb'}
      data-status={status}
      data-border={showBorder ? undefined : 'off'}
      data-background-glow={showBackgroundGlow ? undefined : 'off'}
      data-beat-pulse={showBeatPulse ? undefined : 'off'}
      role="img"
      aria-label={`${label} ${Math.round(targetBpm)} bpm`}
      style={{ ...cssVars, ...style } as CSSProperties}
    >
      <div className="hb__screen">
        {showGrid && <div className="hb__grid" />}
        {showBeatPulse && <div className="hb__flash" />}
        <canvas ref={canvasRef} className="hb__trace" />
        {showScanlines && <div className="hb__scanlines" />}
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
