# React Heartbeat Monitor

A React component that draws a simulated heartbeat on a canvas. Set the heart rate in BPM, change the colors, or pause the trace.

Turn off **Readout** and **Grid** to show just the trace. Under **Flatline color**, keep the default red with `alarmColor` unset, match the normal color, or pick a custom color. Click a status example to load its settings into the interactive monitor.

Use **Appearance** to change the height, line width, border, background glow, beat pulse, scanlines, and background transparency. Under **Status examples**, **Load minimal preset** fills in those settings and updates the JSX example.

**[Try the interactive demo](https://phillippbertram.github.io/react-heartbeat-monitor/)**

![The demo with its GitHub link, a green ECG trace, controls, and a live JSX example](docs/media/demo.png)

## Use it in your app

Install the package in a React 18 or 19 project.

```sh
npm install react-heartbeat-monitor
```

```tsx
import { HeartbeatMonitor } from 'react-heartbeat-monitor';
import 'react-heartbeat-monitor/styles.css';

export function PulsePreview() {
  return <HeartbeatMonitor bpm={72} color="#22d3ee" />;
}
```

See the [component guide](packages/react-heartbeat-monitor/README.md) for props, CSS variables, and custom waveforms.

![A green ECG trace sweeps across the monitor as the readout and grid are hidden](docs/media/sweep.gif)

<details>
<summary>See the status examples</summary>

![The demo's three status examples, minimal monitor, and centered copyright footer](docs/media/status-examples.png)

![Changing the BPM switches the trace through normal, high, and flatline states](docs/media/status-changes.gif)

</details>

## Run the demo locally

With Node.js 24 and pnpm, install the dependencies and start the development server.

```sh
pnpm install
pnpm dev
```

Open the local URL printed in the terminal. React and CSS changes appear as you edit. Press `Ctrl+C` to stop the server.

Run `pnpm build` to build the library and create a standalone `apps/demo/dist/index.html` you can open directly in your browser. Run `pnpm build:lib` to build only the library, and `pnpm typecheck` to check both projects. The demo uses Tailwind CSS, and the component comes with its own stylesheet.

## Workspace

The public package lives in `packages/react-heartbeat-monitor`, and the private demo lives in `apps/demo`. The demo depends on the library through `workspace:*`. Development uses the library sources for hot reload. Production builds consume its published exports.

## Releases

The `Release` GitHub Actions workflow runs when a `v*` tag is pushed. The tag must exactly match the library's `package.json` version. Stable releases publish to npm's `latest` channel. Prereleases such as `v1.1.0-beta.1` publish to `next` and create a GitHub prerelease. Build metadata (`+...`) is rejected because npm versions do not preserve it.

### First release

1. Create a short-lived granular npm token with **Read and write (publish and stage)**, **Bypass 2FA**, and permission to create the package. For a new unscoped package, select **All Packages**. Save it as the repository Actions secret `NPM_BOOTSTRAP_TOKEN`.
2. Set the repository Actions variable `NPM_PUBLISH_AUTH` to `bootstrap`.
3. Commit the implementation and matching package version, then push the release tag. For the initial `1.0.0` version, use `git tag v1.0.0` and `git push origin v1.0.0`.
4. Once the package exists, configure an npm Trusted Publisher for owner `phillippbertram`, repository `react-heartbeat-monitor`, and workflow `release.yml`. Enable direct `npm publish`, and leave the environment field empty.
5. Set `NPM_PUBLISH_AUTH` to `oidc`, revoke the bootstrap token, and delete `NPM_BOOTSTRAP_TOKEN` from GitHub. Create the trusted publisher shortly before the next release because an unvalidated configuration expires after two days.

See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) and [npm access tokens](https://docs.npmjs.com/about-access-tokens/) for account setup. Direct publishing with bypass-2FA tokens is scheduled to end in January 2027, so complete the OIDC transition after bootstrapping.

### Subsequent releases

Update the version in `packages/react-heartbeat-monitor/package.json`, run `pnpm install --lockfile-only`, commit the changes, and push the corresponding `v` tag. The workflow builds and packs the library, verifies that archive with React 18 and 19, publishes it to npm, and then creates a GitHub Release with generated notes.

To check locally, run `pnpm test:release`, `pnpm typecheck`, and `pnpm build`. Then pack and test the archive:

```sh
mkdir -p artifacts
pnpm --filter react-heartbeat-monitor pack --out artifacts/package.tgz
REACT_VERSION=18 node scripts/test-package.mjs artifacts/package.tgz
REACT_VERSION=19 node scripts/test-package.mjs artifacts/package.tgz
npm publish ./artifacts/package.tgz --dry-run --access public
```

### Recovering a failed release

Fix missing credentials or service availability and rerun failed jobs in GitHub Actions. If npm already contains the version, its integrity must match the archive before the workflow continues to create the GitHub Release. A different archive requires a new version and tag. Existing GitHub Releases are retained. Older stable versions cannot move npm's `latest` backwards.

Releases share a concurrency group. GitHub keeps one running and one pending run, so push the next release tag after the previous run finishes to avoid replacing a pending release.

## License

[MIT](LICENSE)
