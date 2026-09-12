const fs = require('node:fs');
const crypto = require('node:crypto');
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

// A bounded recovery of the original 1.2.6 artifacts, not a new stable release.
function prepareStableRestore(record, release, checksums) {
  if (record.tag !== '1.2.6' || release.tag_name !== record.tag || release.draft || release.prerelease) {
    throw new Error('Expected the published stable 1.2.6 release');
  }
  const assets = new Map(release.assets.map(asset => [asset.name, asset]));
  if (assets.size !== release.assets.length || assets.size !== 15) throw new Error('Expected 14 original assets and SHA256SUMS');
  const validateEntries = entries => {
    for (const [name, hash] of Object.entries(entries)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Unsafe restore record');
    }
  };
  validateEntries(record.original);
  validateEntries(record.withdrawn);
  const original = Object.entries(record.original);
  const core = original.filter(([name]) => /\.(tar\.gz|apx)$/.test(name));
  const removed = Object.entries(record.withdrawn).filter(([name]) => /\.(ipk|apk)$/.test(name));
  if (original.length !== 14 || core.length !== 12 || removed.length !== 20) throw new Error('Incomplete restore record');
  for (const [name, hash] of [...original, ['SHA256SUMS', sha256(checksums)]]) {
    const asset = assets.get(name);
    if (!asset || asset.state !== 'uploaded' || asset.digest !== `sha256:${hash}`) throw new Error(`Published original asset mismatch: ${name}`);
  }
  const expectedSums = core.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, hash]) => `${hash}  ${name}\n`).join('');
  if (checksums !== expectedSums) throw new Error('Original checksum manifest mismatch');
  const script = [
    '#!/usr/bin/env bash', 'set -euo pipefail',
    '[ "$#" -eq 2 ]', 'cd -- "$1"', 'stage="$2"',
    '[ -d "$stage" ] && [ ! -L "$stage" ]',
    'regular() { if [ ! -f "$1" ] || [ -L "$1" ]; then echo "Invalid restore file: $1" >&2; exit 1; fi; }',
    'check() { regular "$2"; printf "%s  %s\\n" "$1" "$2" | sha256sum -c -; }',
    'regular SHA256SUMS',
  ];
  // Check every staged file, existing platform and removable package before changing anything.
  for (const [name, hash] of core) {
    const old = record.withdrawn[name];
    if (!old) throw new Error(`Missing replaced platform: ${name}`);
    script.push(`check ${quote(hash)} "$stage/${name}"`, `regular ${quote(name)}`,
      `current=$(sha256sum ${quote(name)}); current=${'${current%% *}'}`,
      `if [ "$current" != ${quote(hash)} ] && [ "$current" != ${quote(old)} ]; then echo 'Unexpected current stable artifact' >&2; exit 1; fi`);
  }
  script.push(`check ${quote(sha256(checksums))} "$stage/SHA256SUMS"`);
  for (const [name, hash] of removed) script.push(`if [ -e ${quote(name)} ] || [ -L ${quote(name)} ]; then check ${quote(hash)} ${quote(name)}; fi`);
  script.push('temporary=$(mktemp .msm-stable-restore.XXXXXX)', 'trap \'rm -f -- "$temporary"\' EXIT');
  for (const [name, hash] of [...core, ['SHA256SUMS', sha256(checksums)]]) {
    script.push(`cp -- "$stage/${name}" "$temporary"`, `check ${quote(hash)} "$temporary"`, 'chmod 0644 "$temporary"', `mv -T -- "$temporary" ${quote(name)}`);
  }
  for (const [name, hash] of removed) script.push(`if [ -e ${quote(name)} ] || [ -L ${quote(name)} ]; then check ${quote(hash)} ${quote(name)}; rm -- ${quote(name)}; fi`);
  script.push('sha256sum -c SHA256SUMS', 'echo "Original stable 1.2.6 mirror restored; 20 OpenWrt assets withdrawn"', '');
  return script.join('\n');
}

module.exports = { prepareStableRestore };
if (require.main === module) {
  const [, , recordFile, releaseFile, checksumsFile, scriptFile] = process.argv;
  fs.writeFileSync(scriptFile, prepareStableRestore(JSON.parse(fs.readFileSync(recordFile, 'utf8')), JSON.parse(fs.readFileSync(releaseFile, 'utf8')), fs.readFileSync(checksumsFile, 'utf8')));
}
