const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Opt-in because this exercises the real apk-tools 3 package manager in Docker.
// Run: MSM_TEST_APK=1 node --test test/openwrt-package-apk.test.cjs
test('APK v3 can be installed, upgraded and removed without losing configuration or data', {
  skip: process.env.MSM_TEST_APK !== '1', timeout: 900_000,
}, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-apk-integration-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const root = path.resolve(__dirname, '..');
  const out = path.join(dir, 'out');
  fs.mkdirSync(out);
  function run(command, args, options = {}) {
    const result = spawnSync(command, args, { encoding: 'utf8', timeout: 420_000, ...options });
    assert.equal(result.status, 0, `${result.error || ''}\n${result.stdout}\n${result.stderr}`);
    return result.stdout;
  }
  const archive = path.join(dir, 'release.tar.gz');
  run(process.env.PYTHON || 'python3', ['-c', `import io, struct, tarfile, sys
b = bytearray(128)
b[:7] = b'\\x7fELF\\x02\\x01\\x01'
struct.pack_into('<H', b, 18, 62)
struct.pack_into('<Q', b, 32, 64)
struct.pack_into('<HH', b, 54, 56, 1)
struct.pack_into('<I', b, 64, 1)
with tarfile.open(sys.argv[1], 'w:gz') as tar:
 for name in ['msm', 'THIRD_PARTY_NOTICES.md', 'OSS_PROVENANCE.md', 'licenses/CADDY-APACHE-2.0.txt']:
  contents = bytes(b) if name == 'msm' else b'license fixture\\n'
  member = tarfile.TarInfo(name)
  member.size = len(contents)
  tar.addfile(member, io.BytesIO(contents))
`, archive]);
  const image = process.env.MSM_APK_IMAGE || 'alpine:3.23';
  for (const version of ['1.5.0', '1.5.1']) {
    run(process.env.PYTHON || 'python3', [path.join(root, '.github/openwrt/build-packages.py'), '--version', version,
      '--target', 'linux-amd64', '--input', archive, '--output-dir', out, '--format', 'apk', '--apk-image', image,
      '--luci-release', version === '1.5.0' ? '1' : '2']);
  }
  const originalCore = fs.readFileSync(path.join(out, 'msm-1.5.0-r1_x86_64.apk'));
  run(process.env.PYTHON || 'python3', [path.join(root, '.github/openwrt/build-packages.py'), '--version', '1.5.0',
    '--luci-only', '--output-dir', out, '--format', 'apk', '--apk-image', image]);
  assert.deepEqual(fs.readFileSync(path.join(out, 'msm-1.5.0-r1_x86_64.apk')), originalCore);
  const packages = fs.readdirSync(out).filter((name) => name.endsWith('.apk'));
  assert.equal(packages.length, 5);
  for (const file of packages) assert.equal(fs.readFileSync(path.join(out, file)).subarray(0, 3).toString(), 'ADB');
  // Package-manager file protection is tested with scripts disabled, so the
  // Alpine test root does not need OpenWrt procd/uci. Shell lifecycle hooks have
  // separate tests with an OpenWrt service harness in openwrt-package.test.cjs.
  const script = `set -eu
apk adbdump --allow-untrusted /work/luci-app-msm-1.5.0-r2_all.apk > /tmp/luci-metadata
grep -q 'arch: noarch' /tmp/luci-metadata
apk mkpkg --info name:openwrt-test-dependencies --info version:1-r1 --info arch:noarch --info license:MIT --info description:fixture --info 'provides:procd=1 uci=1 ca-bundle=1 luci-base=1 rpcd=1 ubus=1 jsonfilter=1 jshn=1' --output /tmp/dependencies.apk
mkdir -p /tmp/root/etc/apk/protected_paths.d
printf '+etc\\n' > /tmp/root/etc/apk/protected_paths.d/default.list
apk --root /tmp/root --arch x86_64 --initdb --no-scripts --no-network --allow-untrusted add /tmp/dependencies.apk /work/msm-1.5.0-r1_x86_64.apk /work/luci-app-msm-1.5.0-r1_all.apk
test "$(stat -c %u:%g /tmp/root/usr/bin/msm)" = 0:0
test -x /tmp/root/usr/bin/msm
test -x /tmp/root/etc/init.d/msm
test -f /tmp/root/usr/share/luci/menu.d/luci-app-msm.json
test -f /tmp/root/usr/share/doc/msm/licenses/CADDY-APACHE-2.0.txt
printf '\\n# keep upgraded configuration\\n' >> /tmp/root/etc/config/msm
mkdir -p /tmp/root/etc/msm/database
printf 'keep database\\n' > /tmp/root/etc/msm/database/sentinel
sha256sum /tmp/root/usr/bin/msm > /tmp/core.sha256
apk --root /tmp/root --arch x86_64 --no-scripts --no-network --allow-untrusted add /work/luci-app-msm-1.5.0-r2_all.apk
apk --root /tmp/root info -e luci-app-msm=1.5.0-r2
apk --root /tmp/root info -e msm=1.5.0-r1
sha256sum -c /tmp/core.sha256
grep -q 'keep upgraded configuration' /tmp/root/etc/config/msm
test "$(cat /tmp/root/etc/msm/database/sentinel)" = 'keep database'
test "$(stat -c %a /tmp/root/usr/libexec/rpcd/msm)" = 755
test "$(stat -c %u:%g /tmp/root/usr/libexec/rpcd/msm)" = 0:0
test ! -e /tmp/root/www/luci-static/resources/view/msm.js
for file in usr/share/luci/menu.d/luci-app-msm.json usr/share/rpcd/acl.d/luci-app-msm.json www/luci-static/resources/view/msm/dashboard.js www/luci-static/resources/msm/dashboard.js www/luci-static/resources/msm/dashboard.css; do
    test "$(stat -c %a /tmp/root/$file)" = 644
    test -s "/tmp/root/$file"
done
apk --root /tmp/root --arch x86_64 --no-scripts --no-network --allow-untrusted add /work/msm-1.5.1-r1_x86_64.apk /work/luci-app-msm-1.5.1-r2_all.apk
grep -q 'keep upgraded configuration' /tmp/root/etc/config/msm
test "$(cat /tmp/root/etc/msm/database/sentinel)" = 'keep database'
apk --root /tmp/root --arch x86_64 --no-scripts --no-network del luci-app-msm msm
test ! -e /tmp/root/usr/bin/msm
test ! -e /tmp/root/usr/libexec/rpcd/msm
test ! -e /tmp/root/www/luci-static/resources/msm/dashboard.js
test ! -e /tmp/root/www/luci-static/resources/msm/dashboard.css
grep -q 'keep upgraded configuration' /tmp/root/etc/config/msm
test "$(cat /tmp/root/etc/msm/database/sentinel)" = 'keep database'
printf 'APK v3 install/upgrade/remove preservation passed\\n'
`;
  fs.writeFileSync(path.join(out, 'test-apk.sh'), script);
  const output = run('docker', ['run', '--rm', '--network', 'none', '-v', out + ':/work:ro', image, 'sh', '/work/test-apk.sh']);
  assert.match(output, /APK v3 install\/upgrade\/remove preservation passed/);
});
