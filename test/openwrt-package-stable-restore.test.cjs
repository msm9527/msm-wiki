const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { prepareStableRestore } = require('../.github/openwrt/prepare-stable-restore.cjs');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function withFixture(action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-stable-restore-'));
  const mirror = path.join(root, 'mirror with spaces');
  const stage = path.join(root, 'staged files');
  const bin = path.join(root, 'bin');
  for (const dir of [mirror, stage, bin]) fs.mkdirSync(dir);
  if (spawnSync('sha256sum', ['--version']).error) fs.writeFileSync(path.join(bin, 'sha256sum'), '#!/bin/sh\nexec shasum -a 256 "$@"\n', { mode: 0o755 });
  if (spawnSync('mv', ['--version']).status !== 0) {
    const gmv = spawnSync('which', ['gmv'], { encoding: 'utf8' }).stdout.trim();
    assert.ok(gmv, 'GNU mv required (brew install coreutils)');
    fs.symlinkSync(gmv, path.join(bin, 'mv'));
  }
  const names = Array.from({ length: 12 }, (_, i) => `msm-1.2.6-platform-${i}.tar.gz`);
  names.push('msm-desktop-1.2.6-darwin-arm64.dmg', 'msm-desktop-1.2.6-darwin-amd64.dmg');
  const removed = Array.from({ length: 20 }, (_, i) => `msm-1.2.6-r1_arch-${i}.${i % 2 ? 'apk' : 'ipk'}`);
  const original = Object.fromEntries(names.map(name => [name, sha(`original:${name}`)]));
  const withdrawn = Object.fromEntries([...names, ...removed].map(name => [name, sha(`withdrawn:${name}`)]));
  const record = { tag: '1.2.6', original, withdrawn };
  const checksums = names.filter(name => name.endsWith('.tar.gz')).sort().map(name => `${original[name]}  ${name}\n`).join('');
  const release = { tag_name: '1.2.6', prerelease: false, draft: false, assets: [...Object.entries(original), ['SHA256SUMS', sha(checksums)]].map(([name, hash]) => ({ name, state: 'uploaded', digest: `sha256:${hash}` })) };
  for (const name of names.filter(name => name.endsWith('.tar.gz'))) {
    fs.writeFileSync(path.join(stage, name), `original:${name}`);
    fs.writeFileSync(path.join(mirror, name), `withdrawn:${name}`);
  }
  for (const name of removed) fs.writeFileSync(path.join(mirror, name), `withdrawn:${name}`);
  fs.writeFileSync(path.join(stage, 'SHA256SUMS'), checksums);
  fs.writeFileSync(path.join(mirror, 'SHA256SUMS'), 'old manifest');
  fs.writeFileSync(path.join(mirror, 'unrelated.txt'), 'keep');
  const snapshot = () => Object.fromEntries(fs.readdirSync(mirror).map(name => [name, fs.readFileSync(path.join(mirror, name), 'utf8')]));
  const run = () => spawnSync('bash', ['-s', '--', mirror, stage], { input: prepareStableRestore(record, release, checksums), encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  try { action({ record, release, checksums, mirror, stage, removed, run, snapshot }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('stable recovery restores original bytes, removes only verified OpenWrt packages and is idempotent', () => {
  withFixture(({ checksums, mirror, run, snapshot }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.readFileSync(path.join(mirror, 'SHA256SUMS'), 'utf8'), checksums);
    assert.equal(fs.readFileSync(path.join(mirror, 'unrelated.txt'), 'utf8'), 'keep');
    assert.equal(fs.readdirSync(mirror).length, 14);
    for (const name of fs.readdirSync(mirror).filter(name => name !== 'unrelated.txt')) assert.equal(fs.statSync(path.join(mirror, name)).mode & 0o777, 0o644);
    const before = snapshot();
    assert.equal(run().status, 0);
    assert.deepEqual(snapshot(), before);
  });
});

for (const location of ['existing core', 'staged core', 'withdrawn package']) {
  test(`stable recovery refuses a changed ${location} before any mutation`, () => {
    withFixture(({ stage, mirror, removed, snapshot, run }) => {
      const name = location === 'withdrawn package' ? removed[19] : 'msm-1.2.6-platform-11.tar.gz';
      fs.writeFileSync(path.join(location === 'staged core' ? stage : mirror, name), 'unexpected');
      const before = snapshot();
      assert.notEqual(run().status, 0);
      assert.deepEqual(snapshot(), before);
    });
  });
}

test('stable recovery refuses package symlinks and mismatched public releases', () => {
  withFixture(({ record, release, checksums, mirror, removed, run }) => {
    assert.throws(() => prepareStableRestore(record, { ...release, tag_name: 'beta-1.4.8' }, checksums));
    assert.throws(() => prepareStableRestore(record, { ...release, assets: release.assets.slice(1) }, checksums));
    assert.throws(() => prepareStableRestore(record, release, checksums + '\n'));
    fs.unlinkSync(path.join(mirror, removed[0]));
    fs.symlinkSync('unrelated.txt', path.join(mirror, removed[0]));
    assert.notEqual(run().status, 0);
    assert.equal(fs.readFileSync(path.join(mirror, 'unrelated.txt'), 'utf8'), 'keep');
  });
});
