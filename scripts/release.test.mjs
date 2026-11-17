import assert from 'node:assert/strict';
import test from 'node:test';
import { publishNeeded, registryMetadata, releaseInfo } from './release.mjs';

test('stable and preview tags select their release channels', () => {
  assert.deepEqual(releaseInfo('v1.0.0', '1.0.0'), { version: '1.0.0', prerelease: false, channel: 'latest' });
  assert.equal(releaseInfo('v1.1.0-beta.1', '1.1.0-beta.1').channel, 'next');
  for (const tag of ['1.0.0', 'v01.0.0', 'v2.0.0', 'vgarbage']) {
    assert.throws(() => releaseInfo(tag, '1.0.0'));
  }
  assert.throws(() => releaseInfo('v1.0.0+build', '1.0.0+build'));
});

test('retries skip matching published archives and reject conflicting contents', () => {
  const metadata = { versions: { '1.0.0': { dist: { integrity: 'sha512-example' } } } };
  assert.equal(publishNeeded(metadata, '1.0.0', 'sha512-example'), false);
  assert.throws(() => publishNeeded(metadata, '1.0.0', 'sha512-other'));
  assert.equal(publishNeeded(null, '1.0.0', 'sha512-example'), true);
});

test('stable versions cannot move latest backwards', () => {
  const metadata = { 'dist-tags': { latest: '2.0.0' } };
  assert.throws(() => publishNeeded(metadata, '1.0.1', 'hash'));
  assert.equal(publishNeeded(metadata, '3.0.0-beta.1', 'hash'), true);
});

test('only registry 404 means missing package', async () => {
  assert.equal(await registryMetadata('example', async () => new Response('', { status: 404 })), null);
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(registryMetadata('example', async () => new Response('', { status })));
  }
  await assert.rejects(registryMetadata('example', async () => { throw new Error('network'); }));
});
