const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const scripts = [
  'install.sh',
  'install_cn.sh',
  'install_beta.sh',
  'install_beta_cn.sh',
];

function withFunctionsOnly(scriptName, callback) {
  const source = fs.readFileSync(path.join(root, scriptName), 'utf8')
    .replace(/\nmain "\$@"\s*$/, '\n');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-install-test-'));
  const tempPath = path.join(tempDir, scriptName);
  fs.writeFileSync(tempPath, source, { mode: 0o700 });

  try {
    return callback(tempPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function callFunction(scriptName, functionCall, extraEnv = {}) {
  return withFunctionsOnly(scriptName, (scriptPath) => execFileSync(
    'bash',
    ['-c', '. "$SCRIPT_PATH"; ' + functionCall],
    {
      cwd: root,
      env: { ...process.env, ...extraEnv, SCRIPT_PATH: scriptPath },
      encoding: 'utf8',
    },
  ).trim());
}

test('all installer scripts pass bash syntax validation', () => {
  for (const script of scripts) {
    execFileSync('bash', ['-n', path.join(root, script)]);
  }
});

test('stable installers normalize and reject versions safely', () => {
  for (const script of ['install.sh', 'install_cn.sh']) {
    assert.equal(callFunction(script, 'normalize_version 1.2.6'), '1.2.6');
    assert.equal(callFunction(script, 'normalize_version v1.2.6'), '1.2.6');
    assert.throws(() => callFunction(script, 'normalize_version ../1.2.6'));
  }
});

test('beta installers normalize and reject versions safely', () => {
  for (const script of ['install_beta.sh', 'install_beta_cn.sh']) {
    assert.equal(callFunction(script, 'normalize_version 1.2.6'), 'beta-1.2.6');
    assert.equal(callFunction(script, 'normalize_version beta-1.2.6'), 'beta-1.2.6');
    assert.equal(callFunction(script, 'normalize_version vbeta-1.2.6'), 'beta-1.2.6');
    assert.throws(() => callFunction(script, 'normalize_version ../1.2.6'));
  }
});

test('installers accept the current single-binary archive and legacy Edge companion', () => {
  const currentEntries = [
    'msm',
    'THIRD_PARTY_NOTICES.md',
    'OSS_PROVENANCE.md',
    'licenses/CADDY-APACHE-2.0.txt',
  ].join('\n');

  for (const script of scripts) {
    assert.doesNotThrow(() => callFunction(
      script,
      'validate_archive_entries "$ARCHIVE_ENTRIES"',
      { ARCHIVE_ENTRIES: currentEntries },
    ));
    assert.doesNotThrow(() => callFunction(
      script,
      'validate_archive_entries "$ARCHIVE_ENTRIES"',
      { ARCHIVE_ENTRIES: 'msm-edge\nmsm' },
    ));
    assert.doesNotThrow(() => callFunction(
      script,
      'validate_archive_entries "$ARCHIVE_ENTRIES"',
      { ARCHIVE_ENTRIES: 'msm' },
    ));
    assert.throws(() => callFunction(
      script,
      'validate_archive_entries "$ARCHIVE_ENTRIES"',
      { ARCHIVE_ENTRIES: 'msm\nunauthorized-file' },
    ));
  }
});
