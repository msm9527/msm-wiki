const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const script = path.resolve(__dirname, '../.github/scripts/prune-remote-versions.sh');

function withTempDirectory(prefix, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function createDirectories(root, names) {
  for (const name of names) {
    fs.mkdirSync(path.join(root, name), { recursive: true });
  }
}

function listDirectories(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test('stable retention keeps the latest three versions and ignores special directories', () => {
  withTempDirectory('msm-stable-retention-', (root) => {
    createDirectories(root, [
      '1.0.0',
      '1.1.0',
      '1.2.0',
      '1.3.0',
      '1.4.0',
      'beta',
      'custom-data',
    ]);
    fs.writeFileSync(path.join(root, '.version'), '1.4.0\n');

    execFileSync('bash', [script, root, 'stable', '3', '1.4.0']);

    assert.deepEqual(listDirectories(root), [
      '1.2.0',
      '1.3.0',
      '1.4.0',
      'beta',
      'custom-data',
    ]);
    assert.equal(fs.readFileSync(path.join(root, '.version'), 'utf8'), '1.4.0\n');
  });
});

test('beta retention always protects the version uploaded by the current run', () => {
  withTempDirectory('msm-beta-retention-', (root) => {
    createDirectories(root, [
      'beta-0.9.0',
      'beta-1.1.0',
      'beta-1.2.0',
      'beta-1.3.0',
      'beta-1.4.0',
      'logs',
    ]);

    execFileSync('bash', [script, root, 'beta', '3', 'beta-0.9.0']);

    assert.deepEqual(listDirectories(root), [
      'beta-0.9.0',
      'beta-1.3.0',
      'beta-1.4.0',
      'logs',
    ]);
  });
});

test('retention refuses to operate on the filesystem root', () => {
  const result = spawnSync('bash', [script, '/', 'stable', '3', '1.4.0'], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to prune the filesystem root/);
});
