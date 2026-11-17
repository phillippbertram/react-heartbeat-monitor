import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import semver from 'semver';

export function releaseInfo(tag, version) {
  if (!tag?.startsWith('v') || !semver.valid(tag.slice(1)) || tag.slice(1) !== version) {
    throw new Error(`Tag ${tag} must equal v${version} and contain a valid SemVer version.`);
  }
  if (semver.parse(version).build.length) {
    throw new Error('npm releases must not contain SemVer build metadata.');
  }
  return { version, prerelease: Boolean(semver.prerelease(version)), channel: semver.prerelease(version) ? 'next' : 'latest' };
}

export function publishNeeded(metadata, version, integrity) {
  const existing = metadata?.versions?.[version];
  if (existing) {
    if (existing.dist?.integrity !== integrity) {
      throw new Error(`Published version ${version} has different contents.`);
    }
    return false;
  }
  const latest = metadata?.['dist-tags']?.latest;
  if (!semver.prerelease(version) && latest && semver.gt(latest, version)) {
    throw new Error(`Publishing ${version} would move latest backwards from ${latest}.`);
  }
  return true;
}

export async function registryMetadata(name, fetcher = fetch) {
  const response = await fetcher(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status}.`);
  return response.json();
}

function output(name, value) {
  console.log(`${name}=${value}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync('packages/react-heartbeat-monitor/package.json', 'utf8'));
  const info = releaseInfo(process.env.RELEASE_TAG, manifest.version);
  for (const [key, value] of Object.entries(info)) output(key, value);
  if (process.argv[2] === 'check-registry') {
    const archive = readFileSync(process.argv[3]);
    const integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`;
    output('publish', publishNeeded(await registryMetadata(manifest.name), info.version, integrity));
  }
}
