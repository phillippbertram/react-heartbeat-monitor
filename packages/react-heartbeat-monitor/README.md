# HeartbeatMonitor component guide

`HeartbeatMonitor` draws a simulated ECG trace on a canvas, with a moving sweep, a fading trail, and a pulse effect on each beat.

## Use the component

Install with `npm install react-heartbeat-monitor` in a React 18 or 19 project. Import the stylesheet once in your application entry point.

```tsx
import { HeartbeatMonitor } from 'react-heartbeat-monitor';
import 'react-heartbeat-monitor/styles.css';

export function PulsePreview() {
  return <HeartbeatMonitor bpm={72} color="#22d3ee" height={120} />;
}
```

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `bpm` | `72` | Sets the target heart rate in beats per minute. Zero, negative values, and non-finite values produce a flatline. |
| `color` / `warnColor` / `alarmColor` | CSS variables | Set the colors for the normal, warning, and flatline states. |
| `backgroundColor` | `#050b0e` | Sets the background color. Use `"transparent"` to show the surface behind the monitor. |
| `height` | `160px` | Sets the monitor height as a number in pixels or a CSS length. |
| `glow` | `8` | Sets the glow radius of the trace in pixels. |
| `sweepSpeed` | `150` | Sets the sweep speed in pixels per second. Higher speeds space beats farther apart, up to one full sweep per frame. |
| `lineWidth` | `2.25` | Sets the stroke width in pixels. |
| `amplitude` | `0.42` | Sets the scale of the trace as a fraction of the monitor height. |
| `baseline` | `0.6` | Moves the baseline from the top (`0`) to the bottom (`1`). |
| `gap` | `22` | Sets the width of the gap in front of the sweep head in pixels. |
| `trailFade` | `0.85` | Controls how much the oldest part of the trace fades, from `0` to `1`. |
| `noise` | `0.012` | Sets the amount of baseline drift and noise. |
| `variability` | `0.03` | Varies the beat duration by a fraction from `0` up to `1` exclusive. The default is ±3%. |
| `thresholds` | `{ low: 50, high: 120 }` | Sets the normal range. Rates outside it use the warning color unless the monitor is flatlined. |
| `label` | `'HR'` | Sets the label above the BPM readout. |
| `statusLabels` | `SINUS`, `BRADY`, `TACHY`, `ASYSTOLE` | Replaces any displayed status label by its status key. |
| `showBorder` | `true` | Shows the monitor border and the readout divider. |
| `showBackgroundGlow` | `true` | Shows the frame halo and background tint. |
| `showBeatPulse` | `true` | Shows the screen flash and readout animations on each beat. |
| `showScanlines` | `true` | Shows the scanline overlay and vignette. |
| `showGrid` / `showReadout` | `true` | Shows the background grid and BPM readout. |
| `paused` | `false` | Freezes the trace. |
| `waveform` | `DEFAULT_WAVEFORM` | Sets a custom beat shape. |
| `onBeat` | — | Receives the rounded instantaneous BPM at each R peak. |
| `className` / `style` | — | Adds a CSS class or inline styles to the monitor. |

The readout shows the most recent instantaneous BPM recorded at the current target rate. It shows the target rate until a measurement is available.

## Style the monitor

Pass a class name, such as `className="my-monitor"`, to set CSS variables on an individual monitor. Props such as `color`, `height`, and `glow` take effect when supplied.

```css
.my-monitor {
  --hb-accent: #ff4fd8;
  --hb-bg: transparent;
  --hb-height: 90px;
  --hb-glow: 14px;
  --hb-grid-size: 10px;
  --hb-scanlines: 0;
  --hb-beat-duration: 300ms;
}
```

The canvas reads its trace color from `--hb-color`. The root exposes `data-status` with one of `normal`, `low`, `high`, or `flatline`. The `data-beat` attribute is reapplied on each beat to restart CSS animations.

## Change the waveform

The default waveform combines P, Q, R, S, and T waves. You can reuse their definitions and adjust individual waves, such as the T wave in this example.

```tsx
import { DEFAULT_WAVEFORM, HeartbeatMonitor } from 'react-heartbeat-monitor';

const peakedT = DEFAULT_WAVEFORM.map((wave, index) =>
  index === 4 ? { ...wave, amplitude: 0.6, width: 0.03 } : wave,
);

export function CustomPulse() {
  return <HeartbeatMonitor waveform={peakedT} />;
}
```

## Links

[Interactive demo](https://phillippbertram.github.io/react-heartbeat-monitor/) · [Source and release instructions](https://github.com/phillippbertram/react-heartbeat-monitor) · [MIT license](https://github.com/phillippbertram/react-heartbeat-monitor/blob/main/LICENSE)
