const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { prepareMirrorRepair } = require('../.github/openwrt/prepare-mirror-repair.cjs');

function fixture() {
  const tag = 'beta-1.4.8';
  const arches = ['x86_64', 'aarch64_generic', 'aarch64_cortex-a53', 'aarch64_cortex-a72', 'arm_cortex-a7_neon-vfpv4', 'arm_cortex-a9_vfpv3-d16', 'arm_cortex-a9_neon', 'arm_cortex-a15_neon-vfpv4', 'arm_arm1176jzf-s_vfp'];
  const names = arches.flatMap(arch => [`msm_1.4.8_beta-r1_${arch}.ipk`, `msm-1.4.8_beta-r1_${arch}.apk`]);
  names.push('luci-app-msm_1.4.8_beta-r1_all.ipk', 'luci-app-msm-1.4.8_beta-r1_all.apk', 'msm-beta-1.4.8-darwin-arm64.tar.gz');
  const files = new Map(names.map(name => [name, Buffer.from(`original:${name}\n`)]));
  const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
  const checksums = [...files].map(([name, data]) => `${sha256(data)}  ${name}\n`).join('');
  const release = { tag_name: tag, draft: false, prerelease: true, assets: [...files].map(([name, data]) => ({ name, state: 'uploaded', digest: `sha256:${sha256(data)}` })) };
  release.assets.push({ name: 'SHA256SUMS', state: 'uploaded', digest: `sha256:${sha256(checksums)}` });
  return { tag, files, checksums, release };
}

function withMirror(action) {
  const input = fixture();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-openwrt-mirror-'));
  const mirror = path.join(root, 'mirror with spaces');
  const bin = path.join(root, 'bin');
  fs.mkdirSync(mirror);
  fs.mkdirSync(bin);
  if (spawnSync('sha256sum', ['--version']).error) {
    fs.writeFileSync(path.join(bin, 'sha256sum'), '#!/bin/sh\nexec shasum -a 256 "$@"\n', { mode: 0o755 });
  }
  if (spawnSync('mv', ['--version']).status !== 0) {
    const gmv = spawnSync('which', ['gmv'], { encoding: 'utf8' }).stdout.trim();
    assert.ok(gmv, 'GNU mv is required for mirror repair tests (brew install coreutils on macOS)');
    fs.symlinkSync(gmv, path.join(bin, 'mv'));
  }
  let index = 0;
  for (const [name, data] of input.files) {
    const old = name.endsWith('.ipk') ? name.replace('_beta-', index++ % 2 ? '.beta-' : '~beta-') : name;
    fs.writeFileSync(path.join(mirror, old), data);
  }
  fs.writeFileSync(path.join(mirror, 'SHA256SUMS'), input.checksums.split('\n').map(line => line.endsWith('.ipk') ? line.replace('_beta-r1_', '~beta-r1_') : line).join('\n'));
  const run = () => spawnSync('bash', ['-s', '--', mirror], { input: prepareMirrorRepair(input.release, input.checksums, input.tag, input.checksums), encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  try { action({ ...input, mirror, run }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('mirror repair renames verified IPKs, preserves all package bytes and is idempotent', () => {
  withMirror(({ files, checksums, mirror, run }) => {
    const first = run();
    assert.equal(first.status, 0, first.stderr || first.stdout);
    for (const [name, data] of files) assert.deepEqual(fs.readFileSync(path.join(mirror, name)), data);
    assert.equal(fs.readFileSync(path.join(mirror, 'SHA256SUMS'), 'utf8'), checksums);
    for (const name of [...files.keys(), 'SHA256SUMS']) assert.equal(fs.statSync(path.join(mirror, name)).mode & 0o777, 0o644, name);
    assert.deepEqual(fs.readdirSync(mirror).sort(), [...files.keys(), 'SHA256SUMS'].sort());
    const second = run();
    assert.equal(second.status, 0, second.stderr || second.stdout);
    for (const name of [...files.keys(), 'SHA256SUMS']) assert.equal(fs.statSync(path.join(mirror, name)).mode & 0o777, 0o644, name);
    assert.deepEqual(fs.readdirSync(mirror).sort(), [...files.keys(), 'SHA256SUMS'].sort());
  });
});

test('mirror repair refuses damaged existing packages before replacing the checksum manifest', () => {
  withMirror(({ mirror, run }) => {
    const original = fs.readFileSync(path.join(mirror, 'SHA256SUMS'));
    const other = path.join(mirror, 'msm-beta-1.4.8-darwin-arm64.tar.gz');
    fs.writeFileSync(other, 'changed unrelated platform');
    const before = fs.readdirSync(mirror).sort();
    const result = run();
    assert.notEqual(result.status, 0);
    assert.deepEqual(fs.readdirSync(mirror).sort(), before);
    assert.deepEqual(fs.readFileSync(path.join(mirror, 'SHA256SUMS')), original);
    assert.equal(fs.readFileSync(other, 'utf8'), 'changed unrelated platform');
  });
});

test('mirror repair rejects incomplete releases, wrong hashes and unsafe checksum paths', () => {
  const input = fixture();
  assert.throws(() => prepareMirrorRepair(input.release, input.checksums, 'beta-1.4.8/../../'), /numeric beta tag/);
  assert.throws(() => prepareMirrorRepair({ ...input.release, assets: input.release.assets.slice(1) }, input.checksums, input.tag, input.checksums), /20 canonical/);
  assert.throws(() => prepareMirrorRepair(input.release, input.checksums + '\n', input.tag), /published digest/);
  assert.throws(() => prepareMirrorRepair(input.release, input.checksums, input.tag, input.checksums.replace('msm-beta-1.4.8-darwin-arm64.tar.gz', 'msm-beta-1.4.7-darwin-arm64.tar.gz')), /Original run tag\/content/);
  assert.throws(() => prepareMirrorRepair(input.release, input.checksums, input.tag), /Original run checksum artifact/);
  const source = input.checksums.split('\n').map(line => line.endsWith('.ipk') ? line.replace('_beta-r1_', '~beta-r1_') : line).join('\n');
  assert.match(prepareMirrorRepair(input.release, input.checksums, input.tag, source), /check_file/);
  const badRelease = structuredClone(input.release);
  badRelease.assets[0].digest = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => prepareMirrorRepair(badRelease, input.checksums, input.tag, input.checksums), /checksum mismatch/);
  const unsafe = input.checksums.replace('msm-beta-1.4.8-darwin-arm64.tar.gz', '../outside');
  const unsafeRelease = structuredClone(input.release);
  unsafeRelease.assets.find(asset => asset.name === 'SHA256SUMS').digest = `sha256:${crypto.createHash('sha256').update(unsafe).digest('hex')}`;
  assert.throws(() => prepareMirrorRepair(unsafeRelease, unsafe, input.tag, input.checksums), /Unsafe/);
});

test('mirror repair never follows a canonical package symlink', () => {
  withMirror(({ mirror, run }) => {
    fs.symlinkSync('msm-beta-1.4.8-darwin-arm64.tar.gz', path.join(mirror, 'msm_1.4.8_beta-r1_x86_64.ipk'));
    assert.notEqual(run().status, 0);
  });
});

for (const invalid of ['missing', 'directory', 'directory-symlink']) {
  test(`mirror repair rejects a ${invalid} checksum manifest without changing any packages`, () => {
    withMirror(({ mirror, run }) => {
      const manifest = path.join(mirror, 'SHA256SUMS');
      fs.rmSync(manifest);
      if (invalid === 'directory') fs.mkdirSync(manifest);
      if (invalid === 'directory-symlink') {
        fs.mkdirSync(path.join(mirror, 'outside'));
        fs.symlinkSync('outside', manifest);
      }
      const before = fs.readdirSync(mirror).sort();
      assert.notEqual(run().status, 0);
      assert.deepEqual(fs.readdirSync(mirror).sort(), before);
      if (invalid === 'directory-symlink') assert.deepEqual(fs.readdirSync(path.join(mirror, 'outside')), []);
    });
  });
}
