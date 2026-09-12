const fs = require('node:fs');
const crypto = require('node:crypto');

const ARCHES = ['x86_64', 'aarch64_generic', 'aarch64_cortex-a53', 'aarch64_cortex-a72', 'arm_cortex-a7_neon-vfpv4', 'arm_cortex-a9_vfpv3-d16', 'arm_cortex-a9_neon', 'arm_cortex-a15_neon-vfpv4', 'arm_arm1176jzf-s_vfp'];
const digest = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;

function prepareMirrorRepair(release, checksums, tag, sourceChecksums) {
  if (!/^beta-\d+\.\d+\.\d+$/.test(tag) || release.tag_name !== tag || release.draft || !release.prerelease) {
    throw new Error('Expected the requested published numeric beta tag');
  }
  const version = `${tag.slice(5)}_beta-r1`;
  const ipks = [...ARCHES.map(arch => `msm_${version}_${arch}.ipk`), `luci-app-msm_${version}_all.ipk`];
  const apks = [...ARCHES.map(arch => `msm-${version}_${arch}.apk`), `luci-app-msm-${version}_all.apk`];
  const expected = new Set([...ipks, ...apks]);
  const assets = new Map(release.assets.map(asset => [asset.name, asset]));
  if (assets.size !== release.assets.length) throw new Error('Duplicate release asset');
  const openwrt = release.assets.filter(asset => /\.(ipk|apk)$/.test(asset.name));
  if (openwrt.length !== 20 || openwrt.some(asset => !expected.has(asset.name))) {
    throw new Error('Release must contain exactly the 20 canonical OpenWrt assets');
  }
  if (assets.get('SHA256SUMS')?.digest !== digest(checksums)) throw new Error('SHA256SUMS does not match its published digest');
  if (checksums !== `${checksums.trimEnd()}\n`) throw new Error('Checksum manifest must use one final newline');
  const sums = new Map();
  for (const line of checksums.trimEnd().split('\n')) {
    const match = /^([a-f0-9]{64})\s+\*?([A-Za-z0-9][A-Za-z0-9._+-]*)$/.exec(line);
    if (!match || sums.has(match[2])) throw new Error('Unsafe or duplicate checksum filename');
    const [, hash, name] = match;
    const asset = assets.get(name);
    if (!asset || asset.state !== 'uploaded' || asset.digest !== `sha256:${hash}`) {
      throw new Error(`Published asset checksum mismatch: ${name}`);
    }
    sums.set(name, hash);
  }
  if ([...expected].some(name => !sums.has(name))) throw new Error('Missing OpenWrt checksum');
  if (typeof sourceChecksums !== 'string') throw new Error('Original run checksum artifact is required');
  const original = new Map();
  for (const line of sourceChecksums.trimEnd().split('\n')) {
    const match = /^([a-f0-9]{64})\s+\*?([A-Za-z0-9][A-Za-z0-9._+~-]*)$/.exec(line);
    if (!match) throw new Error('Invalid original run checksum');
    const name = match[2].endsWith('.ipk') ? match[2].replace(/(?:~|\.)beta-r1_/, '_beta-r1_') : match[2];
    if (original.has(name)) throw new Error('Duplicate original run checksum');
    original.set(name, match[1]);
  }
  if (original.size !== sums.size || [...sums].some(([name, hash]) => original.get(name) !== hash)) {
    throw new Error('Original run tag/content does not match the published release');
  }
  const script = [
    '#!/usr/bin/env bash', 'set -euo pipefail', 'cd -- "$1"',
    'if [ ! -f SHA256SUMS ] || [ -L SHA256SUMS ]; then echo "Invalid mirror SHA256SUMS" >&2; exit 1; fi',
    'check_file() {',
    '  if [ ! -f "$2" ] || [ -L "$2" ]; then echo "Invalid mirror file: $2" >&2; exit 1; fi',
    '  printf "%s  %s\\n" "$1" "$2" | sha256sum -c -',
    '}',
  ];
  // Validate the complete mirror and every legacy alias before any mutation.
  for (const name of ipks) {
    const hash = sums.get(name);
    const aliases = [name.replace('_beta-', '~beta-'), name.replace('_beta-', '.beta-')];
    script.push(`if [ -e ${quote(name)} ] || [ -L ${quote(name)} ]; then`,
      `  check_file ${quote(hash)} ${quote(name)}`, 'else',
      `  if [ -f ${quote(aliases[0])} ]; then source=${quote(aliases[0])}; else source=${quote(aliases[1])}; fi`,
      `  check_file ${quote(hash)} "$source"`, 'fi');
    for (const alias of aliases) script.push(`if [ -e ${quote(alias)} ] || [ -L ${quote(alias)} ]; then`, `  check_file ${quote(hash)} ${quote(alias)}`, 'fi');
  }
  for (const [name, hash] of sums) if (!ipks.includes(name)) script.push(`check_file ${quote(hash)} ${quote(name)}`);
  script.push('temporary="$(mktemp .msm-openwrt-repair.XXXXXX)"', 'trap \'rm -f -- "$temporary"\' EXIT');
  for (const name of ipks) {
    const hash = sums.get(name);
    const old = name.replace('_beta-', '~beta-');
    const normalized = name.replace('_beta-', '.beta-');
    script.push(
      `if [ -e ${quote(name)} ] || [ -L ${quote(name)} ]; then`,
      `  check_file ${quote(hash)} ${quote(name)}`,
      'else',
      `  if [ -f ${quote(old)} ]; then source=${quote(old)}; else source=${quote(normalized)}; fi`,
      `  check_file ${quote(hash)} "$source"`,
      '  cp -- "$source" "$temporary"',
      `  check_file ${quote(hash)} "$temporary"`,
      '  chmod 0644 "$temporary"',
      `  mv -T -- "$temporary" ${quote(name)}`,
      'fi',
      `chmod 0644 ${quote(name)}`,
    );
  }
  // Verify every existing platform against the complete, unchanged hash list
  // before atomically installing the renamed checksum manifest.
  for (const [name, hash] of sums) script.push(`check_file ${quote(hash)} ${quote(name)}`);
  script.push('cat > "$temporary" <<\'MSM_OPENWRT_CHECKSUMS\'', checksums.trimEnd(), 'MSM_OPENWRT_CHECKSUMS', `check_file ${quote(digest(checksums).slice(7))} "$temporary"`, 'chmod 0644 "$temporary"', 'mv -T -- "$temporary" SHA256SUMS');
  for (const name of ipks) {
    for (const old of [name.replace('_beta-', '~beta-'), name.replace('_beta-', '.beta-')]) {
      script.push(`if [ -e ${quote(old)} ] || [ -L ${quote(old)} ]; then`, `  check_file ${quote(sums.get(name))} ${quote(old)}`, `  rm -- ${quote(old)}`, 'fi');
    }
  }
  script.push('echo "OpenWrt mirror filenames and complete SHA256SUMS verified"', '');
  return script.join('\n');
}

module.exports = { prepareMirrorRepair };
if (require.main === module) {
  const [, , tag, releaseFile, checksumsFile, sourceChecksumsFile, outputFile] = process.argv;
  fs.writeFileSync(outputFile, prepareMirrorRepair(JSON.parse(fs.readFileSync(releaseFile, 'utf8')), fs.readFileSync(checksumsFile, 'utf8'), tag, fs.readFileSync(sourceChecksumsFile, 'utf8')));
}
