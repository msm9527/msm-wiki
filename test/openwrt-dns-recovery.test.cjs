const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '../.github/openwrt');

test('service_stopped passes the configured directory and propagates DNS recovery errors', () => {
  const template = fs.readFileSync(path.join(root, 'files/msm/etc/init.d/msm'), 'utf8').replaceAll('/usr/bin/msm', 'fake_msm');
  for (const code of [0, 7]) {
    const result = spawnSync('sh', ['-s'], {
      encoding: 'utf8',
      env: { ...process.env, DNS_RECOVERY_CODE: String(code) },
      input: `config_load() { :; }
fake_msm() { printf '<%s>' "$@"; return "$DNS_RECOVERY_CODE"; }
${template}
config_get() { config_dir='/tmp/msm data'; }
service_stopped
`,
    });
    assert.equal(result.status, code, result.stderr);
    assert.equal(result.stdout, '<service><recover-dns><-c></tmp/msm data><--wait><40s>');
  }
});

test('package hooks propagate DNS recovery errors', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-dns-recovery-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const init = path.join(dir, 'init');
  fs.writeFileSync(init, '#!/bin/sh\n[ "$1" != stop ] || exit 7\nexit 0\n', { mode: 0o755 });
  for (const script of ['msm-prerm', 'msm-pre-upgrade']) {
    const body = fs.readFileSync(path.join(root, 'scripts', script), 'utf8').replaceAll('/etc/init.d/msm', init);
    const result = spawnSync('sh', ['-s'], { input: body, encoding: 'utf8' });
    assert.equal(result.status, 7, `${script}: ${result.stderr}`);
  }
});
