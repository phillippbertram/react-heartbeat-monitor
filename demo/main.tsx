import { StrictMode, useId, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { HeartbeatMonitor } from '../src/HeartbeatMonitor';
import './demo.css';

const COLOR_PRESETS = [
  { name: 'Green', value: '#2bff88' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Pink', value: '#ff4fd8' },
  { name: 'Yellow', value: '#ffd166' },
];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step = 1, format = String, onChange }: SliderProps) {
  const id = useId();

  return (
    <div className="control">
      <div className="control__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Demo() {
  const [bpm, setBpm] = useState(72);
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const [sweepSpeed, setSweepSpeed] = useState(150);
  const [glow, setGlow] = useState(8);
  const [trailFade, setTrailFade] = useState(0.85);
  const [variability, setVariability] = useState(0.03);
  const [showGrid, setShowGrid] = useState(true);
  const [showReadout, setShowReadout] = useState(true);
  const [readoutLabel, setReadoutLabel] = useState('HR');
  const [paused, setPaused] = useState(false);
  const label = readoutLabel.trim() || 'HR';

  const snippet = [
    '<HeartbeatMonitor',
    `  bpm={${bpm}}`,
    `  color="${color}"`,
    '  height={200}',
    `  sweepSpeed={${sweepSpeed}}`,
    `  glow={${glow}}`,
    `  trailFade={${trailFade}}`,
    `  variability={${variability}}`,
    label !== 'HR' && `  label={${JSON.stringify(label)}}`,
    !showGrid && '  showGrid={false}',
    !showReadout && '  showReadout={false}',
    paused && '  paused',
    '/>',
  ].filter(Boolean).join('\n');

  return (
    <main className="demo">
      <header className="demo__header">
        <h1>React Heartbeat Monitor</h1>
        <p>Try a simulated heart rate and see how each setting changes the trace.</p>
      </header>

      <HeartbeatMonitor
        bpm={bpm}
        color={color}
        height={200}
        sweepSpeed={sweepSpeed}
        glow={glow}
        trailFade={trailFade}
        variability={variability}
        label={label}
        showGrid={showGrid}
        showReadout={showReadout}
        paused={paused}
      />

      <section className="panel">
        <div className="controls">
          <Slider label="BPM" value={bpm} min={0} max={200} onChange={setBpm} />
          <Slider label="Sweep speed" value={sweepSpeed} min={60} max={320} step={10} format={(v) => `${v} px/s`} onChange={setSweepSpeed} />
          <Slider label="Glow" value={glow} min={0} max={24} format={(v) => `${v} px`} onChange={setGlow} />
          <Slider label="Trail fade" value={trailFade} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} onChange={setTrailFade} />
          <Slider label="Variability" value={variability} min={0} max={0.2} step={0.01} format={(v) => `±${Math.round(v * 100)}%`} onChange={setVariability} />

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="control">
              <span className="control__head">Color</span>
              <div className="swatches">
                {COLOR_PRESETS.map(({ name, value }) => (
                  <button
                    key={value}
                    type="button"
                    className="swatch"
                    aria-label={name}
                    aria-pressed={value === color}
                    style={{ '--swatch': value } as CSSProperties}
                    onClick={() => setColor(value)}
                  />
                ))}
              </div>
            </div>
            <label className="control min-w-0">
              <span className="control__head">Readout label</span>
              <input
                className="readout-label w-full"
                type="text"
                value={readoutLabel}
                maxLength={8}
                disabled={!showReadout}
                onChange={(event) => setReadoutLabel(event.target.value)}
              />
            </label>
          </div>

          <div className="toggles">
            <button type="button" className="chip" aria-pressed={showGrid} onClick={() => setShowGrid((v) => !v)}>
              Grid
            </button>
            <button type="button" className="chip" aria-pressed={showReadout} onClick={() => setShowReadout((v) => !v)}>
              Readout
            </button>
            <button type="button" className="chip" onClick={() => setPaused((v) => !v)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="chip chip--danger" onClick={() => setBpm(0)}>
              Flatline
            </button>
            <button type="button" className="chip" onClick={() => setBpm(72)}>
              Reset BPM
            </button>
          </div>
        </div>

        <pre className="snippet">
          <code>{snippet}</code>
        </pre>
      </section>

      <h2>Status examples</h2>
      <section className="status-examples">
        <figure>
          <HeartbeatMonitor bpm={64} color="#22d3ee" height={130} label="PULSE" />
          <figcaption>Normal rate with a custom color</figcaption>
        </figure>
        <figure>
          <HeartbeatMonitor bpm={148} height={130} sweepSpeed={120} />
          <figcaption>High rate uses the warning color</figcaption>
        </figure>
        <figure>
          <HeartbeatMonitor bpm={0} height={130} />
          <figcaption>Flatline uses the alarm color</figcaption>
        </figure>
      </section>

      <h2>Minimal monitor styled with CSS variables</h2>
      <HeartbeatMonitor
        bpm={84}
        showReadout={false}
        showGrid={false}
        className="demo-minimal"
        lineWidth={1.75}
        trailFade={1}
        sweepSpeed={200}
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
