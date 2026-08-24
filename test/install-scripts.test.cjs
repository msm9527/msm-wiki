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

function callFunction(scriptName, functionCall) {
  return withFunctionsOnly(scriptName, (scriptPath) => execFileSync(
    'bash',
    ['-c', '. "$SCRIPT_PATH"; ' + functionCall],
    {
      cwd: root,
      env: { ...process.env, SCRIPT_PATH: scriptPath },
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
