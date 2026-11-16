# React Heartbeat Monitor

A React component that draws a simulated heartbeat on a canvas. Set the heart rate in BPM, change the colors, or pause the trace.

Turn off **Readout** and **Grid** in the demo to show just the trace. You can also change the label in the readout.

**[Try the interactive demo](https://phillippbertram.github.io/react-heartbeat-monitor/)**

![The demo with a green ECG trace, controls, and a live JSX example](docs/media/demo.png)

## Use it in your app

Copy [`src/HeartbeatMonitor`](src/HeartbeatMonitor) into a React 18+ project that supports TypeScript and CSS imports. Keep a copy of the [MIT license](LICENSE) with the files.

```tsx
import { HeartbeatMonitor } from './HeartbeatMonitor';

export function PulsePreview() {
  return <HeartbeatMonitor bpm={72} color="#22d3ee" />;
}
```

See the [component guide](src/HeartbeatMonitor/README.md) for props, CSS variables, and custom waveforms.

![A green ECG trace sweeps across the monitor as the readout and grid are hidden](docs/media/sweep.gif)

<details>
<summary>See the status examples</summary>

![Three monitors show a normal rate, a high rate, and a flatline](docs/media/status-examples.png)

![Changing the BPM switches the trace through normal, high, and flatline states](docs/media/status-changes.gif)

</details>

## Run the demo locally

With Node.js 24, run the commands below and open `dist/index.html` in your browser.

```sh
npm ci
npm run build
```

Run `npm run typecheck` to check the TypeScript code. The demo uses Tailwind CSS, and the component comes with its own stylesheet.

## License

[MIT](LICENSE)
