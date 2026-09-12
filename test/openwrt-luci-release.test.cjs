const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { prepareLuciUpdate, mirrorScript, publishGithub, finalizeGithub, recoverGithub, parseMirrors, sha256, BACKUP_NAME } = require('../.github/openwrt/prepare-luci-update.cjs');

function fixture() {
  const tag = 'beta-1.4.8', version = '1.4.8_beta';
  const arches = ['x86_64', 'aarch64_generic', 'aarch64_cortex-a53', 'aarch64_cortex-a72', 'arm_cortex-a7_neon-vfpv4', 'arm_cortex-a9_vfpv3-d16', 'arm_cortex-a9_neon', 'arm_cortex-a15_neon-vfpv4', 'arm_arm1176jzf-s_vfp'];
  const targets = ['darwin-amd64', 'darwin-arm64', 'linux-amd64', 'linux-amd64-v3', 'linux-amd64-musl', 'linux-amd64-musl-v3', 'linux-arm64', 'linux-arm64-musl', 'linux-armv7', 'linux-armv6'];
  const oldNames = [`luci-app-msm_${version}-r1_all.ipk`, `luci-app-msm-${version}-r1_all.apk`];
  const names = [...targets.map(target => `msm-${tag}-${target}.tar.gz`), 'msm-beta-1.4.8-linux-amd64-panabit.apx', 'msm-beta-1.4.8-linux-arm64-panabit.apx', ...oldNames, ...arches.flatMap(arch => [`msm_${version}-r1_${arch}.ipk`, `msm-${version}-r1_${arch}.apk`])];
  const files = new Map(names.map(name => [name, Buffer.from(`original package:${name}\n`)]));
  const checksums = [...files].map(([name, data]) => `${sha256(data)}  ${name}\n`).join('');
  const release = { id: 77, tag_name: tag, name: 'Existing Beta title', draft: false, prerelease: true, target_commitish: 'main', published_at: '2026-09-12T00:00:00Z', body: `Existing introduction\n${oldNames.map(name => `[${name}](https://example.test/${name})`).join('\n')}\nOther platform links and notes stay unchanged.`, assets: [...files].map(([name, bytes], index) => ({ id: index + 1, name, state: 'uploaded', size: bytes.length, digest: `sha256:${sha256(bytes)}` })) };
  release.assets.push({ id: 90, name: 'msm-desktop-beta-1.4.8-darwin-arm64.dmg', size: 1234, digest: `sha256:${'a'.repeat(64)}`, state: 'uploaded' });
  release.assets.push({ id: 91, name: 'msm-desktop-beta-1.4.8-darwin-amd64.dmg', size: 2345, digest: `sha256:${'b'.repeat(64)}`, state: 'uploaded' });
  release.assets.push({ id: 99, name: 'SHA256SUMS', size: Buffer.byteLength(checksums), digest: `sha256:${sha256(checksums)}`, state: 'uploaded' });
  const newFiles = new Map([`luci-app-msm_${version}-r2_all.ipk`, `luci-app-msm-${version}-r2_all.apk`].map(name => [name, Buffer.from(`new dashboard:${name}\n`)]));
  const packages = [...newFiles].map(([name, bytes]) => ({ name, hash: sha256(bytes), size: bytes.length }));
  return { tag, oldNames, files, newFiles, checksums, release, packages, plan: prepareLuciUpdate(release, checksums, packages, tag) };
}

function fakeApi(input) {
  let state = structuredClone(input.release), nextId = 100;
  const calls = [];
  const api = {
    getRelease: () => structuredClone(state),
    getAsset: id => structuredClone(state.assets.find(asset => asset.id === id) || null),
    upload(name, replace) {
      calls.push(['upload', name, replace]);
      const item = input.plan.newPackages.find(item => item.name === name);
      const manifest = name === BACKUP_NAME ? input.plan.backupChecksums : input.plan.afterChecksums;
      assert.equal(replace, name === 'SHA256SUMS');
      state.assets = state.assets.filter(asset => asset.name !== name);
      state.assets.push({ id: nextId++, name, state: 'uploaded', size: item?.size || Buffer.byteLength(manifest), digest: item?.digest || `sha256:${sha256(manifest)}` });
    },
    restoreChecksums() {
      calls.push(['restore']);
      state.assets = state.assets.filter(asset => asset.name !== 'SHA256SUMS');
      state.assets.push({ id: nextId++, name: 'SHA256SUMS', state: 'uploaded', size: Buffer.byteLength(input.plan.beforeChecksums), digest: input.plan.beforeChecksumDigest });
    },
    setBody(body) { calls.push(['body', body]); state.body = body; },
    deleteAsset(id) { calls.push(['delete', id]); state.assets = state.assets.filter(asset => asset.id !== id); },
  };
  return { api, calls, state: () => state, replace: value => { state = structuredClone(value); } };
}

test('LuCI plan changes only two manifest lines and the corresponding release filenames', () => {
  const input = fixture();
  assert.equal(input.plan.lines.length, 32);
  const untouched = text => text.split('\n').filter(line => !line.includes('luci-app-msm'));
  assert.deepEqual(untouched(input.checksums), untouched(input.plan.afterChecksums));
  assert.equal(input.plan.protectedAssets.length, 32);
  assert.equal(input.plan.legacyAssets.length, 2);
  let expected = input.release.body;
  for (const name of input.oldNames) expected = expected.split(name).join(name.replace('-r1_', '-r2_'));
  assert.equal(input.plan.afterBody, expected);
});

test('LuCI plan rejects stable tags, wrong release state, malformed hashes and same-revision replacement', () => {
  const input = fixture();
  assert.throws(() => prepareLuciUpdate(input.release, input.checksums, input.packages, '1.4.8'), /Only numeric Beta/);
  assert.throws(() => prepareLuciUpdate({ ...input.release, prerelease: false }, input.checksums, input.packages, input.tag), /published prerelease/);
  assert.throws(() => prepareLuciUpdate({ ...input.release, draft: true }, input.checksums, input.packages, input.tag), /published prerelease/);
  const bad = structuredClone(input.release);
  bad.assets[0].digest = `sha256:${'f'.repeat(64)}`;
  assert.throws(() => prepareLuciUpdate(bad, input.checksums, input.packages, input.tag), /Existing asset checksum mismatch/);
  const collision = structuredClone(input.release);
  collision.assets.push({ id: 150, ...input.packages[0], digest: `sha256:${'f'.repeat(64)}`, state: 'uploaded' });
  assert.throws(() => prepareLuciUpdate(collision, input.checksums, input.packages, input.tag), /different bytes/);
  const extraCore = structuredClone(input.release);
  extraCore.assets.push({ id: 160, name: 'msm_1.4.8_beta-r1_other.ipk' });
  assert.throws(() => prepareLuciUpdate(extraCore, input.checksums, input.packages, input.tag), /18 canonical/);
});

test('publishing retains legacy packages until finalize and preserves every other asset', () => {
  const input = fixture(), fake = fakeApi(input);
  const updated = publishGithub(input.plan, fake.api);
  assert.equal(updated.assets.filter(asset => asset.name.startsWith('luci-app-msm')).length, 4);
  assert.equal(fake.calls.filter(call => call[0] === 'delete').length, 0);
  const final = finalizeGithub(input.plan, fake.api);
  assert.equal(final.assets.filter(asset => asset.name.startsWith('luci-app-msm')).length, 2);
  assert.deepEqual(fake.calls.filter(call => call[0] === 'delete').map(call => call[1]).sort(), [...input.plan.legacyAssets.map(asset => asset.id), input.plan.backupAsset.id].sort());
  assert.ok(!final.assets.some(asset => asset.name === BACKUP_NAME));
  for (const old of input.plan.protectedAssets) assert.deepEqual(final.assets.find(asset => asset.id === old.id), input.release.assets.find(asset => asset.id === old.id));
  const count = fake.calls.length;
  publishGithub(input.plan, fake.api);
  finalizeGithub(input.plan, fake.api);
  assert.equal(fake.calls.length, count);
});

test('a partial LuCI upload can resume with identical package hashes', () => {
  const input = fixture(), fake = fakeApi(input), upload = fake.api.upload;
  fake.api.upload = (name, replace) => { if (name.endsWith('.apk')) throw new Error('interrupted APK upload'); return upload(name, replace); };
  assert.throws(() => publishGithub(input.plan, fake.api), /interrupted/);
  assert.equal(fake.state().body, input.release.body);
  assert.equal(fake.state().assets.find(asset => asset.name === 'SHA256SUMS').digest, input.plan.beforeChecksumDigest);
  const resume = prepareLuciUpdate(fake.state(), input.checksums, input.packages, input.tag, 2, input.plan.backupChecksums);
  fake.api.upload = upload;
  publishGithub(resume, fake.api);
  assert.equal(fake.calls.filter(call => call[0] === 'upload' && call[1].endsWith('.ipk')).length, 1);
});

test('a fresh plan repairs old body links when the new manifest was already uploaded', () => {
  const input = fixture(), fake = fakeApi(input), setBody = fake.api.setBody;
  fake.api.setBody = () => { throw new Error('body update interrupted'); };
  assert.throws(() => publishGithub(input.plan, fake.api), /body update interrupted/);
  assert.equal(fake.state().assets.find(asset => asset.name === 'SHA256SUMS').digest, input.plan.afterChecksumDigest);
  assert.equal(fake.state().body, input.release.body);
  const resumed = prepareLuciUpdate(fake.state(), input.plan.afterChecksums, input.packages, input.tag, 2, input.plan.backupChecksums);
  assert.equal(resumed.afterBody, input.plan.afterBody);
  fake.api.setBody = setBody;
  publishGithub(resumed, fake.api);
  const final = finalizeGithub(resumed, fake.api);
  for (const old of input.oldNames) assert.ok(!final.body.includes(old));
  for (const item of input.packages) assert.ok(final.body.includes(item.name));
});

test('a missing manifest after upload failure is restored and an uncertain successful upload is verified', () => {
  for (const uncertainSuccess of [false, true]) {
    const input = fixture(), fake = fakeApi(input), upload = fake.api.upload;
    fake.api.upload = (name, replace) => {
      if (name !== 'SHA256SUMS') return upload(name, replace);
      if (uncertainSuccess) upload(name, replace);
      else fake.state().assets = fake.state().assets.filter(asset => asset.name !== name);
      throw new Error('manifest connection lost');
    };
    if (uncertainSuccess) publishGithub(input.plan, fake.api);
    else assert.throws(() => publishGithub(input.plan, fake.api), /connection lost/);
    assert.equal(fake.state().assets.find(asset => asset.name === 'SHA256SUMS').digest, uncertainSuccess ? input.plan.afterChecksumDigest : input.plan.beforeChecksumDigest);
    assert.equal(fake.calls.filter(call => call[0] === 'restore').length, uncertainSuccess ? 0 : 1);
  }
});

test('protected asset changes, unrelated body edits and changed legacy IDs block publication or cleanup', () => {
  const input = fixture();
  for (const mutate of [state => { state.assets[0].digest = 'sha256:changed'; }, state => { state.body += '\nConcurrent edit'; }]) {
    const fake = fakeApi(input);
    mutate(fake.state());
    assert.throws(() => publishGithub(input.plan, fake.api), /assets changed|body changes/);
    assert.equal(fake.calls.length, 0);
  }
  const fake = fakeApi(input);
  publishGithub(input.plan, fake.api);
  fake.api.getAsset = id => ({ ...fake.state().assets.find(asset => asset.id === id), name: 'another-file.ipk' });
  assert.throws(() => finalizeGithub(input.plan, fake.api), /changed legacy asset/);
  assert.equal(fake.calls.filter(call => call[0] === 'delete').length, 0);
});

test('a hard interruption after manifest deletion recovers from the durable release backup on a fresh run', () => {
  const input = fixture(), fake = fakeApi(input), upload = fake.api.upload, getRelease = fake.api.getRelease;
  fake.api.upload = (name, replace) => {
    if (name !== 'SHA256SUMS') return upload(name, replace);
    assert.equal(fake.state().assets.find(asset => asset.name === BACKUP_NAME).digest, input.plan.backupDigest);
    fake.state().assets = fake.state().assets.filter(asset => asset.name !== 'SHA256SUMS');
    // Simulate loss of the runner/network before the catch path can restore.
    fake.api.getRelease = () => { throw new Error('runner lost'); };
    throw new Error('runner lost');
  };
  assert.throws(() => publishGithub(input.plan, fake.api), /runner lost/);
  assert.ok(!fake.state().assets.some(asset => asset.name === 'SHA256SUMS'));
  const recovery = prepareLuciUpdate(fake.state(), input.checksums, input.packages, input.tag, 2, input.checksums);
  assert.equal(recovery.recoverChecksums, true);
  fake.api.getRelease = getRelease;
  fake.api.upload = upload;
  const restored = recoverGithub(recovery, fake.api);
  const resumed = prepareLuciUpdate(restored, input.checksums, input.packages, input.tag, 2, input.checksums);
  publishGithub(resumed, fake.api);
  const final = finalizeGithub(resumed, fake.api);
  assert.equal(final.assets.find(asset => asset.name === 'SHA256SUMS').digest, input.plan.afterChecksumDigest);
  assert.ok(!final.assets.some(asset => asset.name === BACKUP_NAME));
  assert.equal(fake.calls.filter(call => call[0] === 'upload' && call[1] === BACKUP_NAME).length, 1);
});

test('recovery refuses tampered backups and unauthenticated missing assets before writing', () => {
  const input = fixture(), fake = fakeApi(input);
  fake.api.upload(BACKUP_NAME, false);
  fake.state().assets = fake.state().assets.filter(asset => asset.name !== 'SHA256SUMS');
  assert.throws(() => prepareLuciUpdate(fake.state(), `${input.checksums}changed`, input.packages, input.tag, 2, `${input.checksums}changed`), /backup digest mismatch/);
  const changed = structuredClone(fake.state());
  changed.assets[0].digest = `sha256:${'f'.repeat(64)}`;
  assert.throws(() => prepareLuciUpdate(changed, input.checksums, input.packages, input.tag, 2, input.checksums), /Existing asset checksum mismatch/);
  const missing = structuredClone(fake.state());
  missing.assets = missing.assets.filter(asset => asset.name !== input.oldNames[0]);
  assert.throws(() => prepareLuciUpdate(missing, input.checksums, input.packages, input.tag, 2, input.checksums), /Existing asset checksum mismatch/);
  const valid = prepareLuciUpdate(fake.state(), input.checksums, input.packages, input.tag, 2, input.checksums);
  fake.state().assets.find(asset => asset.name === BACKUP_NAME).id += 100;
  assert.throws(() => recoverGithub(valid, fake.api), /backup identity changed/);
  assert.equal(fake.calls.filter(call => call[0] === 'restore').length, 0);
});

test('finalization resumes after an old package was removed and deletes only the verified backup', () => {
  const input = fixture(), fake = fakeApi(input);
  publishGithub(input.plan, fake.api);
  fake.api.deleteAsset(input.plan.legacyAssets[0].id);
  const resumed = prepareLuciUpdate(fake.state(), input.plan.afterChecksums, input.packages, input.tag, 2, input.checksums);
  const final = finalizeGithub(resumed, fake.api);
  assert.equal(final.assets.filter(asset => asset.name.startsWith('luci-app-msm')).length, 2);
  assert.ok(!final.assets.some(asset => asset.name === BACKUP_NAME));
});

function withMirror(action) {
  const input = fixture(), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-luci-update-'));
  const directory = path.join(temporary, "mirror ' with spaces"), bin = path.join(temporary, 'bin');
  fs.mkdirSync(directory); fs.mkdirSync(bin);
  for (const [name, bytes] of input.files) fs.writeFileSync(path.join(directory, name), bytes, { mode: 0o644 });
  fs.writeFileSync(path.join(directory, 'SHA256SUMS'), input.checksums, { mode: 0o644 });
  for (const [name, alternative] of [['mv', 'gmv'], ['sha256sum', 'gsha256sum']]) {
    if (spawnSync(name, ['--version']).status !== 0) {
      const resolved = spawnSync('which', [alternative], { encoding: 'utf8' }).stdout.trim();
      assert.ok(resolved, 'GNU coreutils are required for mirror tests on macOS');
      fs.symlinkSync(resolved, path.join(bin, name));
    }
  }
  const stage = '.msm-luci-stage-123-1.fixture';
  const createStage = () => {
    fs.mkdirSync(path.join(directory, stage), { mode: 0o700 });
    for (const [name, bytes] of input.newFiles) fs.writeFileSync(path.join(directory, stage, name), bytes, { mode: 0o600 });
    fs.writeFileSync(path.join(directory, stage, 'SHA256SUMS'), input.plan.afterChecksums, { mode: 0o600 });
  };
  createStage();
  const run = (mode, customPlan = input.plan, stageName = stage) => spawnSync('bash', ['-s', '--', directory, stageName], { input: mirrorScript(customPlan, mode), encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  try { action({ ...input, directory, stage, createStage, run }); } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

test('mirror staging validates all 32 entries, commits only LuCI, preserves permissions and supports reruns', () => {
  withMirror(({ directory, stage, files, newFiles, oldNames, checksums, plan, createStage, run }) => {
    const preflight = run('preflight');
    assert.equal(preflight.status, 0, preflight.stderr || preflight.stdout);
    assert.equal(fs.readFileSync(path.join(directory, 'SHA256SUMS'), 'utf8'), checksums);
    for (const name of newFiles.keys()) assert.ok(!fs.existsSync(path.join(directory, name)));
    assert.equal(fs.readFileSync(path.join(directory, stage, 'before-SHA256SUMS'), 'utf8'), checksums);
    const result = run('commit');
    assert.equal(result.status, 0, result.stderr || result.stdout);
    for (const [name, bytes] of files) if (!oldNames.includes(name)) assert.deepEqual(fs.readFileSync(path.join(directory, name)), bytes);
    for (const [name, bytes] of newFiles) {
      assert.deepEqual(fs.readFileSync(path.join(directory, name)), bytes);
      assert.equal(fs.statSync(path.join(directory, name)).mode & 0o777, 0o644);
    }
    assert.ok(oldNames.every(name => !fs.existsSync(path.join(directory, name))));
    assert.ok(!fs.existsSync(path.join(directory, stage)));
    assert.equal(fs.readFileSync(path.join(directory, 'SHA256SUMS'), 'utf8'), plan.afterChecksums);
    assert.equal(fs.statSync(path.join(directory, 'SHA256SUMS')).mode & 0o777, 0o644);
    createStage();
    assert.equal(run('preflight').status, 0);
    assert.equal(run('commit').status, 0);
  });
});

test('a mirror still using r1 can recover after GitHub metadata switched to r2', () => {
  withMirror(input => {
    const fake = fakeApi(input);
    const updated = publishGithub(input.plan, fake.api);
    const resumed = prepareLuciUpdate(updated, input.plan.afterChecksums, input.packages, input.tag, 2, input.plan.backupChecksums);
    assert.equal(resumed.legacyAssets.length, 2);
    const result = input.run('preflight', resumed);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(input.run('commit', resumed).status, 0);
  });
});

test('mirror preflight rejects damaged core, changed old LuCI and unsafe manifests without publishing anything', () => {
  for (const kind of ['core', 'old-luci', 'manifest-symlink', 'stage-traversal']) {
    withMirror(input => {
      const { directory, oldNames, newFiles, run } = input;
      if (kind === 'core') fs.writeFileSync(path.join(directory, 'msm_1.4.8_beta-r1_x86_64.ipk'), 'changed');
      if (kind === 'old-luci') fs.writeFileSync(path.join(directory, oldNames[0]), 'changed');
      if (kind === 'manifest-symlink') { fs.renameSync(path.join(directory, 'SHA256SUMS'), path.join(directory, 'original-checksums')); fs.symlinkSync('original-checksums', path.join(directory, 'SHA256SUMS')); }
      const result = run('preflight', input.plan, kind === 'stage-traversal' ? '../outside' : input.stage);
      assert.notEqual(result.status, 0, kind);
      for (const name of newFiles.keys()) assert.ok(!fs.existsSync(path.join(directory, name)));
      assert.ok(oldNames.every(name => fs.existsSync(path.join(directory, name))));
    });
  }
});

test('mirror configuration is restricted to the Beta subdirectory and omits credentials from identity records', () => {
  const mirrors = parseMirrors('host.example,root,test-password,/srv/downloads,22', 'beta-1.4.8');
  assert.equal(mirrors[0].directory, '/srv/downloads/beta/beta-1.4.8');
  assert.equal(mirrors[0].fingerprint.length, 64);
  assert.throws(() => parseMirrors('', 'beta-1.4.8'), /DEPLOY_SERVERS/);
  assert.throws(() => parseMirrors('host,root,password,relative', 'beta-1.4.8'), /configuration/);
  assert.throws(() => parseMirrors('host,root,password,/srv', '1.4.8'), /Invalid mirror Beta/);
});

test('the manual workflow builds only LuCI and delays old asset deletion until mirror commit', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/openwrt-update-luci.yml'), 'utf8');
  assert.match(workflow, /--luci-only/);
  assert.match(workflow, /MSM_TEST_APK: '1'/);
  assert.match(workflow, /node --test test\/openwrt-\*\.test\.cjs/);
  assert.match(workflow, /group: daily-build-beta-refs\/heads\/main/);
  assert.match(workflow, /if: always\(\)/);
  assert.ok(workflow.indexOf('stage-mirrors luci-update') < workflow.indexOf('publish luci-update'));
  assert.ok(workflow.indexOf('publish luci-update') < workflow.indexOf('commit-mirrors luci-update'));
  assert.ok(workflow.indexOf('commit-mirrors luci-update') < workflow.indexOf('finalize luci-update'));
  assert.doesNotMatch(workflow, /docker\/build-push-action|daily-build-msm\.yml|releases\/tags\/1\./);
});
