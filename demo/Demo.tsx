import { MarkGithubIcon } from '@primer/octicons-react';
import { useId, useState, type CSSProperties } from 'react';
import { HeartbeatMonitor } from '../src/HeartbeatMonitor';
import './demo.css';

const COLOR_PRESETS = [
  { name: 'Green', value: '#2bff88' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Pink', value: '#ff4fd8' },
  { name: 'Yellow', value: '#ffd166' },
];

type FlatlineColorMode = 'default' | 'match' | 'custom';

const DEFAULT_SETTINGS = {
  bpm: 72,
  color: COLOR_PRESETS[0].value,
  flatlineColorMode: 'default' as FlatlineColorMode,
  customAlarmColor: '#ff3b5c',
  height: 200,
  sweepSpeed: 150,
  glow: 8,
  lineWidth: 2.25,
  trailFade: 0.85,
  variability: 0.03,
  showBorder: true,
  showBackgroundGlow: true,
  showBeatPulse: true,
  showScanlines: true,
  transparentBackground: false,
  showGrid: true,
  showReadout: true,
  readoutLabel: 'HR',
  paused: false,
};

type DemoSettings = typeof DEFAULT_SETTINGS;

const STATUS_EXAMPLES = [
  {
    title: 'Normal rate with a custom color',
    settings: { ...DEFAULT_SETTINGS, bpm: 64, color: '#22d3ee', readoutLabel: 'PULSE' },
  },
  {
    title: 'High rate uses the warning color',
    settings: { ...DEFAULT_SETTINGS, bpm: 148, sweepSpeed: 120 },
  },
  {
    title: 'Flatline uses the alarm color',
    settings: { ...DEFAULT_SETTINGS, bpm: 0 },
  },
];

const MINIMAL_EXAMPLE = {
  title: 'Load minimal preset',
  settings: {
    ...DEFAULT_SETTINGS,
    bpm: 84,
    color: '#ff4fd8',
    height: 90,
    sweepSpeed: 200,
    glow: 14,
    lineWidth: 1.75,
    trailFade: 1,
    showBorder: false,
    showBackgroundGlow: false,
    showBeatPulse: false,
    showScanlines: false,
    transparentBackground: true,
    showGrid: false,
    showReadout: false,
  },
};

const APPEARANCE_TOGGLES = [
  ['showBorder', 'Border'],
  ['showBackgroundGlow', 'Background glow'],
  ['showBeatPulse', 'Beat pulse'],
  ['showScanlines', 'Scanlines'],
  ['transparentBackground', 'Transparent background'],
] as const;

function getMonitorProps({ flatlineColorMode, customAlarmColor, readoutLabel, transparentBackground, ...settings }: DemoSettings) {
  return {
    ...settings,
    label: readoutLabel.trim() || DEFAULT_SETTINGS.readoutLabel,
    ...(flatlineColorMode !== 'default' && {
      alarmColor: flatlineColorMode === 'match' ? settings.color : customAlarmColor,
    }),
    ...(transparentBackground && { backgroundColor: 'transparent' }),
  };
}

function MonitorExample({ title, settings, height = settings.height, onLoad }: {
  title: string;
  settings: DemoSettings;
  height?: number;
  onLoad: (settings: DemoSettings) => void;
}) {
  return (
    <figure className="status-example">
      <HeartbeatMonitor {...getMonitorProps(settings)} height={height} />
      <figcaption>
        <button className="status-example__button" type="button" onClick={() => onLoad(settings)}>
          {title}
        </button>
      </figcaption>
    </figure>
  );
}

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

export function Demo() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const flatlineColorId = useId();
  const monitorProps = getMonitorProps(settings);
  const { readoutLabel, flatlineColorMode, customAlarmColor } = settings;
  const { bpm, color, alarmColor, sweepSpeed, glow, trailFade, variability, label, showGrid, showReadout, paused } = monitorProps;
  const { height, lineWidth, backgroundColor, showBorder, showBackgroundGlow, showBeatPulse, showScanlines } = monitorProps;

  function updateSetting<Key extends keyof DemoSettings>(key: Key, value: DemoSettings[Key]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  const controlHint = paused
    ? 'Rate, sweep speed, and variability take effect when you resume.'
    : bpm === 0 ? 'Raise BPM to see beat-to-beat variability.' : '';

  const snippet = [
    '<HeartbeatMonitor',
    `  bpm={${bpm}}`,
    `  color="${color}"`,
    alarmColor && `  alarmColor="${alarmColor}"`,
    `  height={${height}}`,
    `  sweepSpeed={${sweepSpeed}}`,
    `  glow={${glow}}`,
    lineWidth !== DEFAULT_SETTINGS.lineWidth && `  lineWidth={${lineWidth}}`,
    `  trailFade={${trailFade}}`,
    `  variability={${variability}}`,
    label !== DEFAULT_SETTINGS.readoutLabel && `  label={${JSON.stringify(label)}}`,
    backgroundColor && `  backgroundColor="${backgroundColor}"`,
    !showBorder && '  showBorder={false}',
    !showBackgroundGlow && '  showBackgroundGlow={false}',
    !showBeatPulse && '  showBeatPulse={false}',
    !showScanlines && '  showScanlines={false}',
    !showGrid && '  showGrid={false}',
    !showReadout && '  showReadout={false}',
    paused && '  paused',
    '/>',
  ].filter(Boolean).join('\n');

  return (
    <>
      <main className="demo">
        <header className="demo__header flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div>
            <h1>React Heartbeat Monitor</h1>
            <p>Try a simulated heart rate and see how each setting changes the trace.</p>
          </div>
          <a
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-(--demo-border) px-3 py-1.5 text-sm text-(--demo-text) no-underline hover:border-[#2bff88] hover:text-[#2bff88] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bff88]"
            href="https://github.com/phillippbertram/react-heartbeat-monitor"
          >
            <MarkGithubIcon size={16} aria-hidden="true" />
            View on GitHub
          </a>
        </header>

        <HeartbeatMonitor {...monitorProps} />

        <section className="panel">
          <div className="controls">
            <Slider label="BPM" value={bpm} min={0} max={200} onChange={(value) => updateSetting('bpm', value)} />
            <Slider label="Sweep speed" value={sweepSpeed} min={60} max={320} step={10} format={(v) => `${v} px/s`} onChange={(value) => updateSetting('sweepSpeed', value)} />
            <Slider label="Trace glow" value={glow} min={0} max={24} format={(v) => `${v} px`} onChange={(value) => updateSetting('glow', value)} />
            <Slider label="Trail fade" value={trailFade} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} onChange={(value) => updateSetting('trailFade', value)} />
            <Slider label="Variability" value={variability} min={0} max={0.2} step={0.01} format={(v) => `±${Math.round(v * 100)}%`} onChange={(value) => updateSetting('variability', value)} />

            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <div className="control">
                <span className="control__head">Normal color</span>
                <div className="swatches">
                  {COLOR_PRESETS.map(({ name, value }) => (
                    <button
                      key={value}
                      type="button"
                      className="swatch"
                      aria-label={name}
                      aria-pressed={value === color}
                      style={{ '--swatch': value } as CSSProperties}
                      onClick={() => updateSetting('color', value)}
                    />
                  ))}
                </div>
              </div>
              <label className="control min-w-0">
                <span className="control__head">Readout label</span>
                <input
                  className="control-input w-full"
                  type="text"
                  value={readoutLabel}
                  maxLength={8}
                  disabled={!showReadout}
                  onChange={(event) => updateSetting('readoutLabel', event.target.value)}
                />
              </label>
            </div>

            <div className="control">
              <label className="control__head" htmlFor={flatlineColorId}>Flatline color</label>
              <div className="flex items-center gap-2">
                <select
                  className="control-input min-w-0"
                  id={flatlineColorId}
                  value={flatlineColorMode}
                  onChange={(event) => updateSetting('flatlineColorMode', event.target.value as FlatlineColorMode)}
                >
                  <option value="default">Default red (unset)</option>
                  <option value="match">Match normal color</option>
                  <option value="custom">Custom color</option>
                </select>
                {flatlineColorMode === 'custom' && (
                  <input
                    className="control-input w-10 shrink-0 cursor-pointer"
                    type="color"
                    aria-label="Custom flatline color"
                    value={customAlarmColor}
                    onInput={(event) => updateSetting('customAlarmColor', event.currentTarget.value)}
                  />
                )}
              </div>
            </div>

            <details className="rounded-lg border border-(--demo-border) p-3 text-[13px]">
              <summary className="cursor-pointer font-medium">Appearance</summary>
              <div className="flex flex-col gap-3 pt-3">
                <Slider label="Height" value={height} min={70} max={240} step={10} format={(v) => `${v} px`} onChange={(value) => updateSetting('height', value)} />
                <Slider label="Line width" value={lineWidth} min={1} max={5} step={0.25} format={(v) => `${v} px`} onChange={(value) => updateSetting('lineWidth', value)} />
                <div className="toggles">
                  {APPEARANCE_TOGGLES.map(([setting, text]) => (
                    <button
                      key={setting}
                      type="button"
                      className="chip"
                      aria-pressed={settings[setting]}
                      onClick={() => updateSetting(setting, !settings[setting])}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            </details>

            <div className="toggles">
              <button type="button" className="chip" aria-pressed={showGrid} onClick={() => updateSetting('showGrid', !showGrid)}>
                Grid
              </button>
              <button type="button" className="chip" aria-pressed={showReadout} onClick={() => updateSetting('showReadout', !showReadout)}>
                Readout
              </button>
              <button type="button" className="chip" onClick={() => updateSetting('paused', !paused)}>
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className="chip chip--danger" onClick={() => updateSetting('bpm', 0)}>
                Flatline
              </button>
              <button type="button" className="chip" onClick={() => updateSetting('bpm', DEFAULT_SETTINGS.bpm)}>
                Reset BPM
              </button>
            </div>
            <p role="status" className="m-0 text-[13px] text-(--demo-muted) empty:hidden">{controlHint}</p>
          </div>

          <pre className="snippet">
            <code>{snippet}</code>
          </pre>
        </section>

        <h2 id="status-examples-heading">Status examples</h2>
        <section className="status-examples" aria-labelledby="status-examples-heading">
          {STATUS_EXAMPLES.map((example) => (
            <MonitorExample key={example.title} {...example} height={130} onLoad={setSettings} />
          ))}
          <div className="col-span-full">
            <MonitorExample {...MINIMAL_EXAMPLE} onLoad={setSettings} />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1080px] px-6 pb-8 text-center text-sm">
        <p className="m-0 border-t border-(--demo-border) pt-5 text-(--demo-muted)">
          © 2026{' '}
          <a
            className="text-(--demo-text) underline underline-offset-4 hover:text-[#2bff88]"
            href="https://www.phillippbertram.de/"
          >
            Phillipp Bertram
          </a>
          {' '}· Made with <span className="text-[#2bff88]" role="img" aria-label="love">♥</span>
        </p>
      </footer>
    </>
  );
}
