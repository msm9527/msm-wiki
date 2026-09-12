const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const builder = path.join(root, '.github/openwrt/build-packages.py');
const templates = path.join(root, '.github/openwrt');
const python = process.env.PYTHON || 'python3';
const documents = ['THIRD_PARTY_NOTICES.md', 'OSS_PROVENANCE.md', 'licenses/CADDY-APACHE-2.0.txt'];

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', timeout: 60_000, ...options });
}
function successful(result) {
  assert.equal(result.status, 0, `${result.error || ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
function scratch(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-openwrt-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function elf(target = 'linux-amd64', interpreter = false) {
  const arch64 = !['linux-armv7', 'linux-armv6'].includes(target);
  const binary = Buffer.alloc(arch64 ? 128 : 96);
  binary.set([0x7f, 0x45, 0x4c, 0x46, arch64 ? 2 : 1, 1, 1]);
  binary.writeUInt16LE(target === 'linux-amd64' ? 62 : arch64 ? 183 : 40, 18);
  const offset = arch64 ? 64 : 52;
  if (arch64) binary.writeBigUInt64LE(BigInt(offset), 32);
  else binary.writeUInt32LE(offset, 28);
  binary.writeUInt16LE(arch64 ? 56 : 32, arch64 ? 54 : 42);
  binary.writeUInt16LE(1, arch64 ? 56 : 44);
  binary.writeUInt32LE(interpreter ? 3 : 1, offset);
  return binary;
}
function archive(dir, binary, options = {}) {
  const file = path.join(dir, 'release.tar.gz');
  const script = `import base64, io, json, tarfile, sys
data = json.loads(sys.stdin.read())
with tarfile.open(sys.argv[1], 'w:gz') as t:
 for name, encoded, kind in data:
  content = base64.b64decode(encoded)
  info = tarfile.TarInfo(name)
  info.size = len(content)
  info.mode = 0o755 if name == 'msm' else 0o644
  if kind == 'symlink':
   info.type = tarfile.SYMTYPE
   info.linkname = '/outside/msm'
   info.size = 0
  t.addfile(info, None if kind == 'symlink' else io.BytesIO(content))
`;
  const entries = [['msm', binary.toString('base64'), options.symlink ? 'symlink' : 'file']];
  for (const doc of documents) {
    if (!options.bare && doc !== options.missing) entries.push([doc, Buffer.from(`License fixture ${doc}\n`).toString('base64'), 'file']);
  }
  if (options.duplicate) entries.push(entries[0]);
  entries.push(['../../not-extracted', Buffer.from('ignored').toString('base64'), 'file']);
  successful(run(python, ['-c', script, file], { input: JSON.stringify(entries) }));
  return file;
}
function build(dir, input, extra = [], options = {}) {
  return run(python, [builder, '--version', 'v1.5.0', '--target', 'linux-amd64', '--input', input,
    '--output-dir', path.join(dir, 'out'), '--format', 'ipk', ...extra], options);
}
function inspectIpk(file) {
  const script = `import base64, io, json, tarfile, sys
def unpack(t):
 return {m.name.removeprefix('./'): {'mode': m.mode, 'uid': m.uid, 'gid': m.gid, 'data': base64.b64encode(t.extractfile(m).read()).decode() if m.isfile() else None} for m in t.getmembers()}
with tarfile.open(sys.argv[1], 'r:gz') as t:
 outer = unpack(t)
 output = {'outer': outer}
 for name in ['data', 'control']:
  with tarfile.open(fileobj=io.BytesIO(base64.b64decode(outer[name + '.tar.gz']['data'])), mode='r:gz') as inner:
   output[name] = unpack(inner)
 print(json.dumps(output))
`;
  return JSON.parse(successful(run(python, ['-c', script, file])));
}
function text(entry) { return Buffer.from(entry.data, 'base64').toString(); }

test('native IPK payload has correct metadata, original executable, notices and LuCI files', (t) => {
  const dir = scratch(t);
  const binary = elf();
  successful(build(dir, archive(dir, binary)));
  const msm = inspectIpk(path.join(dir, 'out/msm_1.5.0-r1_x86_64.ipk'));
  assert.equal(text(msm.outer['debian-binary']), '2.0\n');
  assert.deepEqual(Buffer.from(msm.data['usr/bin/msm'].data, 'base64'), binary);
  assert.equal(msm.data['usr/bin/msm'].mode, 0o755);
  assert.equal(msm.data['etc/init.d/msm'].mode, 0o755);
  for (const value of Object.values(msm.data)) assert.deepEqual([value.uid, value.gid], [0, 0]);
  assert.match(text(msm.control.control), /Package: msm\nVersion: 1.5.0-r1\nArchitecture: x86_64\n/);
  assert.match(text(msm.control.control), /Depends: procd, uci, ca-bundle/);
  assert.equal(text(msm.control.conffiles), '/etc/config/msm\n');
  for (const doc of documents) assert.equal(text(msm.data[`usr/share/doc/msm/${doc}`]), `License fixture ${doc}\n`);
  assert.match(text(msm.data['etc/config/msm']), /option enabled '0'/);
  assert.match(text(msm.data['lib/upgrade/keep.d/msm']), /\/etc\/msm\//);
  assert.ok(!Object.keys(msm.data).some((name) => name.startsWith('etc/msm/')));
  assert.ok(!Object.keys(msm.data).some((name) => name.includes('not-extracted')));
  const luci = inspectIpk(path.join(dir, 'out/luci-app-msm_1.5.0-r2_all.ipk'));
  const menu = JSON.parse(text(luci.data['usr/share/luci/menu.d/luci-app-msm.json']));
  assert.equal(menu['admin/services/msm'].action.path, 'msm/dashboard');
  assert.equal(luci.data['www/luci-static/resources/view/msm.js'], undefined, 'do not reuse the legacy browser-cached view URL');
  assert.match(text(luci.control.control), /Depends: msm, luci-base, rpcd, ubus, uci, jsonfilter, jshn/);
  const acl = JSON.parse(text(luci.data['usr/share/rpcd/acl.d/luci-app-msm.json']));
  assert.deepEqual(acl['luci-app-msm'].read, { uci: ['msm'], ubus: { msm: ['status', 'logs'] } });
  assert.deepEqual(acl['luci-app-msm'].write, { uci: ['msm'], ubus: { msm: ['action'], uci: ['commit'] } });
  const helper = 'usr/libexec/rpcd/msm';
  assert.equal(luci.data[helper].mode, 0o755);
  assert.equal(text(luci.data[helper]), fs.readFileSync(path.join(templates, 'files/luci-app-msm', helper), 'utf8'));
  for (const file of [
    'usr/share/luci/menu.d/luci-app-msm.json',
    'usr/share/rpcd/acl.d/luci-app-msm.json',
    'www/luci-static/resources/view/msm/dashboard.js',
    'www/luci-static/resources/msm/dashboard.js',
    'www/luci-static/resources/msm/dashboard.css',
  ]) {
    assert.equal(luci.data[file].mode, 0o644, `${file} must remain a static non-executable file`);
    assert.equal(text(luci.data[file]), fs.readFileSync(path.join(templates, 'files/luci-app-msm', file), 'utf8'));
  }
  for (const [name, value] of Object.entries(luci.data)) {
    assert.deepEqual([value.uid, value.gid], [0, 0]);
    if (value.data != null && name !== helper) assert.equal(value.mode, 0o644, `${name} must not inherit executable permissions`);
  }
});

test('LuCI revisions can advance without rebuilding the core package or reading a release archive', (t) => {
  const dir = scratch(t);
  const input = archive(dir, elf());
  successful(build(dir, input, ['--version', 'beta-1.5.0', '--luci-release', '1']));
  const core = path.join(dir, 'out/msm_1.5.0_beta-r1_x86_64.ipk');
  const originalCore = fs.readFileSync(core);
  successful(build(dir, input, ['--version', 'beta-1.5.0']));
  assert.deepEqual(fs.readFileSync(core), originalCore, 'updating LuCI revision must preserve core package bytes');

  const output = path.join(dir, 'luci-only');
  successful(run(python, [builder, '--version', 'beta-1.5.0', '--luci-only', '--format', 'ipk', '--output-dir', output]));
  assert.deepEqual(fs.readdirSync(output), ['luci-app-msm_1.5.0_beta-r2_all.ipk']);
  assert.deepEqual(fs.readFileSync(path.join(output, 'luci-app-msm_1.5.0_beta-r2_all.ipk')),
    fs.readFileSync(path.join(dir, 'out/luci-app-msm_1.5.0_beta-r2_all.ipk')));
  successful(build(dir, input, ['--release', '3', '--luci-release', '4']));
  assert.match(text(inspectIpk(path.join(dir, 'out/msm_1.5.0-r3_x86_64.ipk')).control.control), /Version: 1.5.0-r3/);
  assert.match(text(inspectIpk(path.join(dir, 'out/luci-app-msm_1.5.0-r4_all.ipk')).control.control), /Version: 1.5.0-r4/);
  for (const extra of [['--release', '0'], ['--luci-release', '0'], ['--luci-release', '-1'], ['--luci-only', '--arch', 'x86_64']]) {
    assert.notEqual(build(dir, input, extra).status, 0);
  }
  const noInput = run(python, [builder, '--version', 'beta-1.5.0', '--format', 'ipk', '--output-dir', output]);
  assert.notEqual(noInput.status, 0);
  assert.match(noInput.stderr, /--target and --input are required unless --luci-only is used/);
});

test('IPKs use release-safe filenames while preserving beta ordering metadata and reproducibility', (t) => {
  const dir = scratch(t);
  const input = archive(dir, elf());
  successful(build(dir, input, ['--version', 'beta-1.5.0']));
  const file = path.join(dir, 'out/msm_1.5.0_beta-r1_x86_64.ipk');
  const first = fs.readFileSync(file);
  successful(build(dir, input, ['--version', 'beta-1.5.0']));
  assert.deepEqual(fs.readFileSync(file), first);
  assert.match(text(inspectIpk(file).control.control), /Version: 1.5.0~beta-r1/);
  const filenames = fs.readdirSync(path.join(dir, 'out'));
  assert.deepEqual(filenames.sort(), ['luci-app-msm_1.5.0_beta-r2_all.ipk', 'msm_1.5.0_beta-r1_x86_64.ipk']);
  for (const filename of filenames) {
    assert.ok(!filename.includes('~'), 'release asset filenames must not need GitHub normalization');
    assert.match(filename, /^[A-Za-z0-9_.-]+$/);
    assert.match(text(inspectIpk(path.join(dir, 'out', filename)).control.control),
      filename.startsWith('luci-app-msm') ? /Version: 1.5.0~beta-r2/ : /Version: 1.5.0~beta-r1/);
  }
});

test('all supported ARM architectures receive the matching original ELF', (t) => {
  const dir = scratch(t);
  const targets = {
    'linux-arm64': ['aarch64_generic', 'aarch64_cortex-a53', 'aarch64_cortex-a72'],
    'linux-armv7': ['arm_cortex-a7_neon-vfpv4', 'arm_cortex-a9_vfpv3-d16', 'arm_cortex-a9_neon', 'arm_cortex-a15_neon-vfpv4'],
    'linux-armv6': ['arm_arm1176jzf-s_vfp'],
  };
  for (const [target, arches] of Object.entries(targets)) {
    const binary = elf(target);
    successful(build(dir, archive(dir, binary), ['--target', target]));
    for (const arch of arches) {
      const pkg = inspectIpk(path.join(dir, `out/msm_1.5.0-r1_${arch}.ipk`));
      assert.match(text(pkg.control.control), new RegExp(`Architecture: ${arch}\\n`));
      assert.deepEqual(Buffer.from(pkg.data['usr/bin/msm'].data, 'base64'), binary);
    }
  }
});

test('legacy stable archives without Caddy notices remain packageable', (t) => {
  const dir = scratch(t);
  const binary = elf();
  successful(build(dir, archive(dir, binary, { bare: true })));
  const pkg = inspectIpk(path.join(dir, 'out/msm_1.5.0-r1_x86_64.ipk'));
  assert.deepEqual(Buffer.from(pkg.data['usr/bin/msm'].data, 'base64'), binary);
  assert.ok(!Object.keys(pkg.data).some((name) => name.startsWith('usr/share/doc/msm/')));
});

test('builder rejects incompatible ELF, dynamic binaries, duplicate or linked payloads', (t) => {
  const dir = scratch(t);
  for (const [binary, options, expected] of [
    [elf('linux-arm64'), {}, /ELF machine/],
    [elf('linux-amd64', true), {}, /dynamically linked/],
    [Buffer.from('#!\/bin\/sh\n'), {}, /Linux ELF/],
    [elf(), { duplicate: true }, /one regular msm/],
    [elf(), { symlink: true }, /one regular msm/],
  ]) {
    const result = build(dir, archive(dir, binary, options));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  }
  assert.notEqual(build(dir, archive(dir, elf()), ['--version', '1.5;bad']).status, 0);
  assert.notEqual(build(dir, archive(dir, elf()), ['--arch', 'aarch64_generic']).status, 0);
});

function lifecycle(t, script, enabled, args = [], env = {}) {
  const dir = scratch(t);
  const log = path.join(dir, 'calls');
  const init = path.join(dir, 'msm-init');
  fs.writeFileSync(init, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALLS"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'uci'), '#!/bin/sh\nprintf "%s\\n" "$ENABLED"\n', { mode: 0o755 });
  const executable = fs.readFileSync(path.join(templates, 'scripts', script), 'utf8').replaceAll('/etc/init.d/msm', init);
  const result = run('sh', ['-s', '--', ...args], { input: executable, env: { ...process.env, PATH: dir + ':' + process.env.PATH, CALLS: log, ENABLED: enabled, ...env } });
  successful(result);
  return fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [];
}
test('install and upgrade register reload triggers even when disabled and respect image roots', (t) => {
  assert.deepEqual(lifecycle(t, 'msm-postinst', '0'), ['enable', 'reload']);
  assert.deepEqual(lifecycle(t, 'msm-postinst', '1'), ['enable', 'reload']);
  assert.deepEqual(lifecycle(t, 'msm-postinst', '1', [], { IPKG_INSTROOT: '/staging' }), []);
  assert.deepEqual(lifecycle(t, 'msm-postinst', '1', [], { IPKG_NO_SCRIPT: '1' }), []);
  assert.deepEqual(lifecycle(t, 'msm-prerm', '1', ['upgrade']), ['stop']);
  assert.deepEqual(lifecycle(t, 'msm-prerm', '1', ['remove']), ['stop', 'disable']);
  assert.deepEqual(lifecycle(t, 'msm-pre-upgrade', '1'), ['stop']);
});

test('packaged LuCI lifecycle refreshes owned web resources and clears menu caches before reloading rpcd', (t) => {
  const dir = scratch(t);
  successful(build(dir, archive(dir, elf())));
  const pkg = inspectIpk(path.join(dir, 'out/luci-app-msm_1.5.0-r2_all.ipk'));
  const caches = path.join(dir, 'cache');
  const rpcd = path.join(dir, 'rpcd');
  const calls = path.join(dir, 'calls');
  const web = path.join(dir, 'www');
  const resources = ['luci-static/resources/view/msm/dashboard.js', 'luci-static/resources/msm/dashboard.js', 'luci-static/resources/msm/dashboard.css'];
  const unrelated = ['luci-static/resources/luci.js', 'luci-static/resources/view/adguardhome.js', 'luci-static/resources/msm/keep.json'];
  fs.mkdirSync(caches);
  fs.writeFileSync(rpcd, '#!/bin/sh\n[ ! -e "$CACHES/luci-indexcache.829a004f.json" ] || exit 1\nprintf "%s\\n" "$*" >> "$CALLS"\n', { mode: 0o755 });
  const expected = ['luci-indexcache', 'luci-indexcache.829a004f.json', 'luci-indexcache.another.json', 'luci-modulecache'];
  for (const phase of ['postinst', 'postrm']) {
    for (const name of [...resources, ...unrelated]) {
      const file = path.join(web, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // Same-size upgraded content may still have the old archive's epoch mtime.
      fs.writeFileSync(file, 'new resource contents\n', { mode: 0o644 });
      fs.utimesSync(file, new Date(0), new Date(0));
    }
    const linked = path.join(web, 'luci-static/resources/msm/external.js');
    if (!fs.existsSync(linked)) fs.symlinkSync(path.join(web, unrelated[0]), linked);
    for (const name of expected.slice(0, -1)) fs.writeFileSync(path.join(caches, name), 'stale menu');
    fs.mkdirSync(path.join(caches, 'luci-modulecache'), { recursive: true });
    fs.writeFileSync(path.join(caches, 'luci-modulecache/old.lua'), 'stale module');
    fs.writeFileSync(path.join(caches, 'luci-indexcache-unrelated'), 'keep');
    fs.writeFileSync(path.join(caches, 'other-application-cache'), 'keep');
    const script = text(pkg.control[phase]).replaceAll('/tmp/', caches + '/').replaceAll('/etc/init.d/rpcd', rpcd).replaceAll('/www/', web + '/');
    const invoke = (extra = {}) => successful(run('sh', ['-s'], {
      input: script, env: { ...process.env, CACHES: caches, CALLS: calls, ...extra },
    }));
    invoke({ IPKG_INSTROOT: '/image-root' });
    invoke({ IPKG_NO_SCRIPT: '1' });
    for (const name of expected) assert.ok(fs.existsSync(path.join(caches, name)), `${name} must survive image-root/script-disabled installs`);
    for (const name of resources) assert.equal(fs.statSync(path.join(web, name)).mtimeMs, 0);
    invoke();
    for (const name of resources) {
      const file = path.join(web, name);
      assert.ok(fs.statSync(file).mtimeMs > 0, `${name} must invalidate the old If-Modified-Since validator`);
      assert.equal(fs.statSync(file).mode & 0o777, 0o644);
      assert.equal(fs.readFileSync(file, 'utf8'), 'new resource contents\n');
    }
    for (const name of unrelated) assert.equal(fs.statSync(path.join(web, name)).mtimeMs, 0, `${name} must not be touched`);
    for (const name of expected) assert.equal(fs.existsSync(path.join(caches, name)), false, `${name} must be invalidated`);
    assert.equal(fs.readFileSync(path.join(caches, 'luci-indexcache-unrelated'), 'utf8'), 'keep');
    assert.equal(fs.readFileSync(path.join(caches, 'other-application-cache'), 'utf8'), 'keep');
    for (const name of resources) fs.unlinkSync(path.join(web, name));
    invoke(); // Reinstall/removal must not recreate missing resources or caches.
    for (const name of resources) assert.equal(fs.existsSync(path.join(web, name)), false);
  }
  assert.equal(fs.readFileSync(calls, 'utf8'), 'reload\nreload\nreload\nreload\n');
});

test('procd receives quoted arguments, keeps existing data and uses volatile logs on first start', (t) => {
  const dir = scratch(t);
  const data = path.join(dir, 'data with spaces');
  const template = fs.readFileSync(path.join(templates, 'files/msm/etc/init.d/msm'), 'utf8').replaceAll('/tmp/msm', path.join(dir, 'tmp/msm'));
  function start(enabled = '1', config = data, port = '7777') {
    return run('sh', ['-s'], {
      env: { ...process.env, ENABLED: enabled, CONFIG: config, PORT: port },
      input: `config_load() { :; }
config_get_bool() { eval "$1=\\$ENABLED"; }
config_get() { case "$3" in config_dir) eval "$1=\\$CONFIG";; port) eval "$1=\\$PORT";; esac; }
logger() { :; }
procd_open_instance() { :; }
procd_close_instance() { :; }
procd_set_param() { printf '<%s>' "$@"; printf '\\n'; }
procd_add_reload_trigger() { printf '<trigger><%s>\\n' "$1"; }
${template}
start_service || exit $?
service_triggers
`,
    });
  }
  assert.equal(successful(start('0')), '<trigger><msm>\n', 'disabled reload must register its trigger without opening a process instance');
  assert.equal(fs.existsSync(data), false);
  const output = successful(start());
  assert.ok(output.includes(`<command></usr/bin/msm><serve><-c><${data}><-p><7777>`));
  assert.equal(fs.readlinkSync(path.join(data, 'logs')), path.join(dir, 'tmp/msm/logs'));
  fs.mkdirSync(path.join(data, 'database'));
  fs.writeFileSync(path.join(data, 'database/sentinel'), 'persistent');
  fs.unlinkSync(path.join(data, 'logs'));
  fs.mkdirSync(path.join(data, 'logs'));
  fs.writeFileSync(path.join(data, 'logs/existing'), 'keep me');
  successful(start());
  assert.equal(fs.readFileSync(path.join(data, 'logs/existing'), 'utf8'), 'keep me');
  assert.equal(fs.readFileSync(path.join(data, 'database/sentinel'), 'utf8'), 'persistent');
  for (const invalid of ['/', '//', 'relative', '/tmp/../root', '/../root']) assert.notEqual(start('1', invalid).status, 0);
  for (const invalid of ['0', '65536', '7777; true']) assert.notEqual(start('1', data, invalid).status, 0);
});
