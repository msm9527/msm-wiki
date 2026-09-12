const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ARCHES = ['x86_64', 'aarch64_generic', 'aarch64_cortex-a53', 'aarch64_cortex-a72', 'arm_cortex-a7_neon-vfpv4', 'arm_cortex-a9_vfpv3-d16', 'arm_cortex-a9_neon', 'arm_cortex-a15_neon-vfpv4', 'arm_arm1176jzf-s_vfp'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const assetKey = asset => ({ id: asset.id, name: asset.name, size: asset.size, digest: asset.digest });
const sameAsset = (a, b) => a && b && ['id', 'name', 'size', 'digest'].every(key => a[key] === b[key]);
const isLuci = name => name.startsWith('luci-app-msm');
const BACKUP_NAME = 'SHA256SUMS.luci-backup';
const isManifest = name => name === 'SHA256SUMS' || name === BACKUP_NAME;

function checksumLines(text) {
  check(typeof text === 'string' && text === `${text.trimEnd()}\n`, 'SHA256SUMS must have one final newline');
  const seen = new Set();
  return text.trimEnd().split('\n').map(line => {
    const match = /^([a-f0-9]{64})(\s+\*?)([A-Za-z0-9][A-Za-z0-9._+-]*)$/.exec(line);
    check(match && !seen.has(match[3]), 'Unsafe or duplicate checksum filename');
    seen.add(match[3]);
    return { hash: match[1], separator: match[2], name: match[3], line };
  });
}

function prepareLuciUpdate(release, checksums, packages, tag, revision = 2, backupChecksums = null) {
  check(/^beta-\d+\.\d+\.\d+$/.test(tag), 'Only numeric Beta tags are permitted');
  check(Number.isSafeInteger(revision) && revision >= 2, 'LuCI revision must be at least 2');
  check(release.tag_name === tag && !release.draft && release.prerelease, 'Expected the requested published prerelease');
  const version = `${tag.slice(5)}_beta`;
  const packageNames = [`luci-app-msm_${version}-r${revision}_all.ipk`, `luci-app-msm-${version}-r${revision}_all.apk`];
  check(packages.length === 2 && new Set(packages.map(item => item.name)).size === 2, 'Build exactly two LuCI packages');
  for (const item of packages) check(packageNames.includes(item.name) && /^[a-f0-9]{64}$/.test(item.hash) && item.size > 0, 'Unexpected new package name or hash');
  const assets = new Map(release.assets.map(asset => [asset.name, asset]));
  check(assets.size === release.assets.length, 'Duplicate release asset');
  const backupAsset = assets.get(BACKUP_NAME), manifestAsset = assets.get('SHA256SUMS');
  const recoverChecksums = !manifestAsset;
  if (backupAsset) check(backupChecksums !== null && backupAsset.state === 'uploaded' && backupAsset.digest === `sha256:${sha256(backupChecksums)}` && backupAsset.size === Buffer.byteLength(backupChecksums), 'Durable checksum backup digest mismatch');
  else check(backupChecksums === null, 'Unexpected checksum backup bytes');
  if (recoverChecksums) check(backupAsset && checksums === backupChecksums, 'Missing checksum manifest requires its verified durable backup');
  else check(manifestAsset.state === 'uploaded' && manifestAsset.digest === `sha256:${sha256(checksums)}`, 'Published checksum manifest digest mismatch');
  const lines = checksumLines(checksums);
  const sums = new Map(lines.map(item => [item.name, item]));
  for (const item of lines) {
    const asset = assets.get(item.name);
    check(asset && asset.state === 'uploaded' && asset.digest === `sha256:${item.hash}`, `Existing asset checksum mismatch: ${item.name}`);
  }
  const coreAssets = release.assets.filter(asset => /\.(ipk|apk)$/.test(asset.name) && !isLuci(asset.name));
  check(coreAssets.length === 18, 'Expected exactly the 18 canonical core packages');
  const coreRevisions = new Set(coreAssets.map(asset => {
    const match = /-r([1-9][0-9]*)_/.exec(asset.name);
    check(match && Number.isSafeInteger(Number(match[1])), 'Invalid core package revision');
    return match[1];
  }));
  check(coreRevisions.size === 1, 'Core package revisions must agree');
  const [coreRevision] = coreRevisions;
  const coreNames = ARCHES.flatMap(arch => [`msm_${version}-r${coreRevision}_${arch}.ipk`, `msm-${version}-r${coreRevision}_${arch}.apk`]);
  check(coreAssets.every(asset => coreNames.includes(asset.name)), 'Expected exactly the 18 canonical core packages');
  check(coreNames.every(name => sums.has(name)), 'Missing core package checksum');
  const luciLines = lines.filter(item => isLuci(item.name));
  check(luciLines.length === 2 && ['.ipk', '.apk'].every(ext => luciLines.filter(item => item.name.endsWith(ext)).length === 1), 'Expected two authoritative LuCI checksums');
  const candidates = {};
  const luciAssets = release.assets.filter(asset => isLuci(asset.name));
  for (const ext of ['ipk', 'apk']) {
    const prefix = ext === 'ipk' ? `luci-app-msm_${version}-r` : `luci-app-msm-${version}-r`;
    candidates[ext] = luciAssets.filter(asset => asset.name.startsWith(prefix) && asset.name.endsWith(`_all.${ext}`)).map(asset => {
      const rev = asset.name.slice(prefix.length, -(`_all.${ext}`).length);
      check(/^[1-9][0-9]*$/.test(rev) && Number(rev) <= revision, 'Unexpected existing LuCI revision');
      check(asset.state === 'uploaded' && /^sha256:[a-f0-9]{64}$/.test(asset.digest), 'Existing LuCI asset is not complete');
      return { ...assetKey(asset), revision: Number(rev), hash: asset.digest.slice(7) };
    });
    check(candidates[ext].length >= 1 && candidates[ext].filter(asset => asset.revision < revision).length <= 1, 'Unexpected legacy LuCI assets');
  }
  check(candidates.ipk.length + candidates.apk.length === luciAssets.length, 'Unexpected LuCI asset');
  const oldManifestRevisions = luciLines.map(item => [...candidates.ipk, ...candidates.apk].find(asset => asset.name === item.name)?.revision);
  check(oldManifestRevisions.every(Number.isSafeInteger) && oldManifestRevisions[0] === oldManifestRevisions[1], 'LuCI checksum revisions must agree');
  const newPackages = packageNames.map(name => {
    const item = packages.find(entry => entry.name === name);
    const existing = assets.get(name);
    if (existing) check(existing.digest === `sha256:${item.hash}` && existing.size === item.size, 'This LuCI revision already has different bytes; choose a new revision');
    return { ...item, digest: `sha256:${item.hash}` };
  });
  const durableChecksums = backupChecksums === null ? checksums : backupChecksums;
  const backupLines = checksumLines(durableChecksums);
  check(backupLines.length === lines.length, 'Durable checksum backup has a different inventory');
  check(backupLines.filter(item => isLuci(item.name)).length === 2, 'Durable checksum backup must contain two LuCI entries');
  for (const item of backupLines) {
    if (!isLuci(item.name)) check(sums.get(item.name)?.hash === item.hash, 'Durable checksum backup changed a protected entry');
    else {
      const next = newPackages.find(pkg => pkg.name.endsWith(path.extname(item.name)));
      const prefix = item.name.endsWith('.ipk') ? `luci-app-msm_${version}-r` : `luci-app-msm-${version}-r`;
      const suffix = `_all${path.extname(item.name)}`;
      const oldRevision = item.name.slice(prefix.length, -suffix.length);
      check(next && item.name.startsWith(prefix) && item.name.endsWith(suffix) && /^[1-9][0-9]*$/.test(oldRevision) && Number(oldRevision) <= revision, 'Invalid durable backup LuCI filename');
      const asset = assets.get(item.name);
      // Finalization can be interrupted after deleting one legacy package.
      // Only a valid authoritative new manifest permits such a missing backup entry.
      check(asset ? asset.state === 'uploaded' && asset.digest === `sha256:${item.hash}` : !recoverChecksums && sums.get(next.name)?.hash === next.hash, 'Durable checksum backup references an unverified LuCI asset');
    }
  }
  check(['.ipk', '.apk'].every(ext => backupLines.filter(item => isLuci(item.name) && item.name.endsWith(ext)).length === 1), 'Durable checksum backup formats must agree');
  let body = release.body || '';
  const updatedLines = lines.map(item => {
    if (!isLuci(item.name)) return item.line;
    const next = newPackages.find(pkg => pkg.name.endsWith(path.extname(item.name)));
    if (item.name !== next.name) {
      check(body.includes(item.name) || body.includes(next.name), 'Release body lacks the expected LuCI filename');
      body = body.split(item.name).join(next.name);
    }
    return `${next.hash}${item.separator}${next.name}`;
  });
  // A previous attempt may have published the new manifest but not its body.
  // Legacy assets are deliberately retained until all mirrors finish, so use
  // their names as well as the currently authoritative checksum entries.
  for (const old of [...candidates.ipk, ...candidates.apk].filter(asset => asset.revision < revision)) {
    const next = newPackages.find(item => item.name.endsWith(path.extname(old.name)));
    body = body.split(old.name).join(next.name);
  }
  const nextChecksums = `${updatedLines.join('\n')}\n`;
  // The legacy assets remain until all mirrors finish, so a rerun can still
  // authenticate a mirror that has not yet switched to the new manifest.
  const mirrorManifests = new Map();
  const choices = ext => {
    const next = newPackages.find(pkg => pkg.name.endsWith(`.${ext}`));
    return [...candidates[ext].filter(asset => asset.name !== next.name), { ...next, revision }];
  };
  for (const ipk of choices('ipk')) for (const apk of choices('apk')) {
    const text = `${lines.map(item => {
      if (!isLuci(item.name)) return item.line;
      const next = item.name.endsWith('.ipk') ? ipk : apk;
      return `${next.hash}${item.separator}${next.name}`;
    }).join('\n')}\n`;
    mirrorManifests.set(sha256(text), text);
  }
  return {
    schema: 1, tag, revision, releaseId: release.id,
    releaseFields: Object.fromEntries(['id', 'tag_name', 'name', 'draft', 'prerelease', 'target_commitish', 'published_at'].map(key => [key, release[key]])),
    protectedAssets: release.assets.filter(asset => !isLuci(asset.name) && !isManifest(asset.name)).map(assetKey),
    beforeBody: release.body || '', afterBody: body,
    beforeChecksums: checksums, afterChecksums: nextChecksums,
    beforeChecksumDigest: `sha256:${sha256(checksums)}`, afterChecksumDigest: `sha256:${sha256(nextChecksums)}`,
    backupChecksums: durableChecksums, backupDigest: `sha256:${sha256(durableChecksums)}`,
    backupAsset: backupAsset ? assetKey(backupAsset) : null, recoverChecksums,
    lines, newPackages, candidates,
    legacyAssets: [...candidates.ipk, ...candidates.apk].filter(asset => asset.revision < revision),
    allowedMirrorManifestHashes: [...mirrorManifests.keys()],
  };
}

function assertProtected(plan, release) {
  check(plan.schema === 1 && /^beta-\d+\.\d+\.\d+$/.test(plan.tag), 'Invalid Beta update plan');
  for (const [key, value] of Object.entries(plan.releaseFields)) check(release[key] === value, `Release metadata changed: ${key}`);
  const current = release.assets.filter(asset => !isLuci(asset.name) && !isManifest(asset.name));
  check(current.length === plan.protectedAssets.length && plan.protectedAssets.every(old => current.some(asset => sameAsset(asset, old))), 'Core, CLI, APX or desktop assets changed');
  check(release.body === plan.beforeBody || release.body === plan.afterBody, 'Unrelated release body changes detected');
  const permitted = new Set([...plan.legacyAssets, ...plan.newPackages].map(asset => asset.name));
  check(release.assets.filter(asset => isLuci(asset.name)).every(asset => permitted.has(asset.name)), 'Unplanned LuCI asset appeared');
}

function verifyNewAssets(plan, release) {
  for (const item of plan.newPackages) {
    const asset = release.assets.find(entry => entry.name === item.name);
    check(asset && asset.state === 'uploaded' && asset.digest === item.digest && asset.size === item.size, `New LuCI upload verification failed: ${item.name}`);
  }
}

function verifyBackup(plan, release) {
  const asset = release.assets.find(item => item.name === BACKUP_NAME);
  check(asset && asset.state === 'uploaded' && asset.digest === plan.backupDigest && asset.size === Buffer.byteLength(plan.backupChecksums), 'Durable checksum backup verification failed');
  if (plan.backupAsset) check(sameAsset(asset, plan.backupAsset), 'Durable checksum backup identity changed');
  return asset;
}

function recoverGithub(plan, api) {
  const release = api.getRelease();
  assertProtected(plan, release);
  check(plan.recoverChecksums && !release.assets.some(item => item.name === 'SHA256SUMS'), 'Checksum recovery is only allowed for a missing manifest');
  verifyBackup(plan, release);
  // The pure plan has already authenticated every backup entry against the
  // current release. Do not clobber if another writer restored it meanwhile.
  api.restoreChecksums();
  const recovered = api.getRelease();
  assertProtected(plan, recovered);
  check(recovered.assets.find(item => item.name === 'SHA256SUMS')?.digest === plan.beforeChecksumDigest, 'Recovered checksum manifest verification failed');
  return recovered;
}

function publishGithub(plan, api) {
  let release = api.getRelease();
  assertProtected(plan, release);
  const initial = release.assets.find(asset => asset.name === 'SHA256SUMS');
  check(initial && [plan.beforeChecksumDigest, plan.afterChecksumDigest].includes(initial.digest), 'Release checksum manifest changed');
  // GitHub has no atomic asset replacement. Keep a discoverable, verified
  // backup before --clobber, including across runner termination or outages.
  if (initial.digest !== plan.afterChecksumDigest || release.assets.some(item => item.name === BACKUP_NAME)) {
    if (!release.assets.some(item => item.name === BACKUP_NAME)) api.upload(BACKUP_NAME, false);
    release = api.getRelease();
    assertProtected(plan, release);
    plan.backupAsset = assetKey(verifyBackup(plan, release));
  }
  for (const item of plan.newPackages) {
    const existing = release.assets.find(asset => asset.name === item.name);
    if (existing) check(existing.digest === item.digest && existing.size === item.size, 'Existing new revision has different bytes');
    else api.upload(item.name, false);
    release = api.getRelease();
    assertProtected(plan, release);
    const uploaded = release.assets.find(asset => asset.name === item.name);
    check(uploaded && uploaded.state === 'uploaded' && uploaded.digest === item.digest && uploaded.size === item.size, 'New LuCI asset upload did not match its hash');
  }
  verifyNewAssets(plan, release);
  if (release.assets.find(asset => asset.name === 'SHA256SUMS')?.digest !== plan.afterChecksumDigest) {
    try { api.upload('SHA256SUMS', true); } catch (error) {
      const observed = api.getRelease().assets.find(asset => asset.name === 'SHA256SUMS');
      if (observed?.digest !== plan.afterChecksumDigest) {
        // gh --clobber deletes the previous manifest before uploading. Restore
        // it if the upload failed in that gap; all original metadata is saved.
        if (!observed) {
          api.restoreChecksums();
          check(api.getRelease().assets.find(asset => asset.name === 'SHA256SUMS')?.digest === plan.beforeChecksumDigest, 'Restored checksum manifest verification failed');
        }
        throw error;
      }
    }
  }
  release = api.getRelease();
  assertProtected(plan, release);
  verifyNewAssets(plan, release);
  check(release.assets.find(asset => asset.name === 'SHA256SUMS')?.digest === plan.afterChecksumDigest, 'New SHA256SUMS upload verification failed');
  if (release.body !== plan.afterBody) api.setBody(plan.afterBody);
  release = api.getRelease();
  assertProtected(plan, release);
  check(release.body === plan.afterBody, 'Release body update did not persist');
  return release;
}

function finalizeGithub(plan, api) {
  let release = api.getRelease();
  assertProtected(plan, release);
  verifyNewAssets(plan, release);
  check(release.body === plan.afterBody && release.assets.find(asset => asset.name === 'SHA256SUMS')?.digest === plan.afterChecksumDigest, 'New release metadata is not ready');
  if (release.assets.some(asset => asset.name === BACKUP_NAME)) verifyBackup(plan, release);
  for (const old of plan.legacyAssets) {
    const observed = api.getAsset(old.id);
    if (!observed) continue;
    check(sameAsset(observed, old), 'Refusing to delete a changed legacy asset');
    api.deleteAsset(old.id);
  }
  release = api.getRelease();
  assertProtected(plan, release);
  verifyNewAssets(plan, release);
  check(release.assets.filter(asset => isLuci(asset.name)).length === 2, 'Legacy LuCI assets remain');
  if (release.assets.some(asset => asset.name === BACKUP_NAME)) {
    const backup = verifyBackup(plan, release);
    const observed = api.getAsset(backup.id);
    check(sameAsset(observed, backup), 'Refusing to delete a changed checksum backup');
    api.deleteAsset(backup.id);
    release = api.getRelease();
    assertProtected(plan, release);
    verifyNewAssets(plan, release);
    check(!release.assets.some(asset => asset.name === BACKUP_NAME), 'Durable checksum backup cleanup failed');
  }
  return release;
}

function mirrorScript(plan, mode) {
  check(['preflight', 'commit'].includes(mode), 'Invalid mirror operation');
  const script = [
    '#!/usr/bin/env bash', 'set -euo pipefail', 'cd -- "$1"', 'stage="$2"',
    '[[ "$stage" =~ ^\\.msm-luci-stage-[0-9]+-[0-9]+\\.[A-Za-z0-9]+$ ]]',
    'if [ ! -d "$stage" ] || [ -L "$stage" ]; then echo "Invalid private stage" >&2; exit 1; fi',
    'chmod 0700 "$stage"',
    'check_file() {',
    '  if [ ! -f "$2" ] || [ -L "$2" ]; then echo "Invalid mirror file: $2" >&2; exit 1; fi',
    '  printf "%s  %s\\n" "$1" "$2" | sha256sum -c -',
    '}',
    'if [ ! -f SHA256SUMS ] || [ -L SHA256SUMS ]; then echo "Invalid existing mirror manifest" >&2; exit 1; fi',
    'manifest_hash="$(sha256sum SHA256SUMS)"', 'manifest_hash="${manifest_hash%% *}"',
    `case "$manifest_hash" in ${plan.allowedMirrorManifestHashes.join('|')}) ;; *) echo "Unrecognized mirror checksum manifest" >&2; exit 1 ;; esac`,
  ];
  for (const item of plan.lines.filter(item => !isLuci(item.name))) script.push(`check_file ${quote(item.hash)} ${quote(item.name)}`);
  for (const ext of ['ipk', 'apk']) {
    const next = plan.newPackages.find(item => item.name.endsWith(`.${ext}`));
    const candidates = [...plan.candidates[ext].filter(item => item.name !== next.name), next];
    script.push('found=0');
    for (const item of candidates) script.push(`if [ -e ${quote(item.name)} ] || [ -L ${quote(item.name)} ]; then`, `  check_file ${quote(item.hash)} ${quote(item.name)}`, '  found=1', 'fi');
    script.push('[ "$found" -eq 1 ]');
  }
  // The manifest is one of the exact authenticated candidates above.
  script.push('sha256sum -c SHA256SUMS');
  for (const item of plan.newPackages) script.push(`check_file ${quote(item.hash)} "$stage/${item.name}"`);
  script.push(`check_file ${quote(plan.afterChecksumDigest.slice(7))} "$stage/SHA256SUMS"`);
  if (mode === 'preflight') {
    script.push('cp -p -- SHA256SUMS "$stage/before-SHA256SUMS"', 'ls -ln -- SHA256SUMS > "$stage/before-files.txt"');
    for (const item of [...plan.legacyAssets, ...plan.newPackages]) script.push(`if [ -f ${quote(item.name)} ]; then ls -ln -- ${quote(item.name)} >> "$stage/before-files.txt"; fi`);
    script.push('echo "Mirror preflight verified; no published file changed"');
  } else {
    for (const item of plan.newPackages) script.push(
      `if [ ! -e ${quote(item.name)} ]; then`,
      `  cp -- "$stage/${item.name}" "$stage/pending-${item.name}"`,
      `  chmod 0644 "$stage/pending-${item.name}"`,
      `  check_file ${quote(item.hash)} "$stage/pending-${item.name}"`,
      `  mv -T -- "$stage/pending-${item.name}" ${quote(item.name)}`, 'fi',
      `chmod 0644 ${quote(item.name)}`,
    );
    script.push('cp -- "$stage/SHA256SUMS" "$stage/pending-SHA256SUMS"', 'chmod 0644 "$stage/pending-SHA256SUMS"', `check_file ${quote(plan.afterChecksumDigest.slice(7))} "$stage/pending-SHA256SUMS"`, 'mv -T -- "$stage/pending-SHA256SUMS" SHA256SUMS', 'sha256sum -c SHA256SUMS');
    for (const old of plan.legacyAssets) script.push(`if [ -e ${quote(old.name)} ] || [ -L ${quote(old.name)} ]; then`, `  check_file ${quote(old.hash)} ${quote(old.name)}`, `  rm -- ${quote(old.name)}`, 'fi');
    script.push('rm -rf -- "$stage"', 'echo "Two LuCI packages and complete mirror manifest verified; private stage removed"');
  }
  return `${script.join('\n')}\n`;
}

function parseMirrors(value, tag) {
  check(/^beta-\d+\.\d+\.\d+$/.test(tag), 'Invalid mirror Beta tag');
  const result = String(value || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const fields = line.split(',');
    check(fields.length === 4 || fields.length === 5, 'Invalid mirror configuration');
    const [host, user, password, target, port] = fields;
    check(host && user && password && target.startsWith('/') && !/[\r\n\0]/.test(target), 'Incomplete mirror configuration');
    check(!port || /^[0-9]+$/.test(port), 'Invalid mirror port');
    const directory = `${target.replace(/\/+$/, '')}/beta/${tag}`;
    return { host, user, password, port, directory, fingerprint: sha256(JSON.stringify([host, user, port || '', directory])) };
  });
  check(result.length > 0, 'DEPLOY_SERVERS is required before publishing');
  return result;
}

function command(binary, args, options = {}) {
  return execFileSync(binary, args, { maxBuffer: 32 * 1024 * 1024, ...options });
}
function gh(args, input) {
  return command('gh', args, { input, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }).toString();
}
function githubApi(plan, directory) {
  const repo = process.env.GITHUB_REPOSITORY;
  check(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || ''), 'GITHUB_REPOSITORY is required');
  const api = (suffix, payload, method) => JSON.parse(gh(['api', `repos/${repo}/${suffix}`, ...(method ? ['--method', method] : []), ...(payload ? ['--input', '-'] : [])], payload ? JSON.stringify(payload) : undefined) || 'null');
  return {
    getRelease: () => api(`releases/tags/${plan.tag}`),
    getAsset: id => {
      const release = api(`releases/tags/${plan.tag}`);
      return release.assets.find(asset => asset.id === id) || null;
    },
    upload: (name, replace) => gh(['release', 'upload', plan.tag, path.join(directory, name), '--repo', repo, ...(replace ? ['--clobber'] : [])]),
    restoreChecksums: () => gh(['release', 'upload', plan.tag, path.join(directory, 'before', 'SHA256SUMS'), '--repo', repo]),
    setBody: body => api(`releases/${plan.releaseId}`, { body }, 'PATCH'),
    deleteAsset: id => gh(['api', `repos/${repo}/releases/assets/${id}`, '--method', 'DELETE']),
  };
}
function ssh(mirror, remoteCommand, input) {
  const args = ['-e', 'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=20', ...(mirror.port ? ['-p', mirror.port] : []), `${mirror.user}@${mirror.host}`, remoteCommand];
  return command('sshpass', args, { input, env: { ...process.env, SSHPASS: mirror.password } });
}
function operateMirrors(plan, directory, commit) {
  const mirrors = parseMirrors(process.env.DEPLOY_SERVERS, plan.tag);
  const stageFile = path.join(directory, 'mirror-stages.json');
  const stages = commit ? JSON.parse(fs.readFileSync(stageFile, 'utf8')) : [];
  if (commit) check(stages.length === mirrors.length, 'Mirror configuration changed');
  for (let index = 0; index < mirrors.length; index++) {
    const mirror = mirrors[index];
    let stage;
    if (!commit) {
      const run = process.env.GITHUB_RUN_ID, attempt = process.env.GITHUB_RUN_ATTEMPT;
      check(/^[0-9]+$/.test(run || '') && /^[0-9]+$/.test(attempt || ''), 'GitHub run identity is required');
      stage = ssh(mirror, `bash -s -- ${quote(mirror.directory)}`, `set -euo pipefail\ncd -- "$1"\numask 077\nmktemp -d .msm-luci-stage-${run}-${attempt}.XXXXXX\n`).toString().trim();
      check(/^\.msm-luci-stage-[0-9]+-[0-9]+\.[A-Za-z0-9]+$/.test(stage), 'Invalid remote stage response');
      stages.push({ index, stage, fingerprint: mirror.fingerprint });
      fs.writeFileSync(stageFile, JSON.stringify(stages, null, 2));
      const files = [...plan.newPackages.map(item => item.name), 'SHA256SUMS'];
      const archive = command('tar', ['-C', directory, '-cf', '-', ...files]);
      ssh(mirror, `umask 077; tar -xf - -C ${quote(`${mirror.directory}/${stage}`)}`, archive);
    } else {
      check(stages[index].fingerprint === mirror.fingerprint, 'Mirror identity changed since preflight');
      stage = stages[index].stage;
    }
    const script = mirrorScript(plan, commit ? 'commit' : 'preflight');
    fs.writeFileSync(path.join(directory, `mirror-${index + 1}-${commit ? 'commit' : 'preflight'}.sh`), script);
    const output = ssh(mirror, `bash -s -- ${quote(mirror.directory)} ${quote(stage)}`, script);
    fs.writeFileSync(path.join(directory, `mirror-${index + 1}-${commit ? 'commit' : 'preflight'}.log`), output);
    if (!commit) {
      for (const name of ['before-SHA256SUMS', 'before-files.txt']) fs.writeFileSync(path.join(directory, `mirror-${index + 1}-${name}`), ssh(mirror, `cat -- ${quote(`${mirror.directory}/${stage}/${name}`)}`));
    }
    process.stdout.write(`Mirror ${index + 1}: ${commit ? 'committed and verified' : 'staged and preflight verified'}\n`);
  }
}

function main(args) {
  const [mode, first, revisionText, packagesDirectory, output] = args;
  if (mode === 'prepare') {
    const tag = first, revision = Number(revisionText), directory = path.resolve(output);
    check(/^beta-\d+\.\d+\.\d+$/.test(tag) && Number.isSafeInteger(revision) && revision >= 2, 'Invalid Beta tag or LuCI revision');
    parseMirrors(process.env.DEPLOY_SERVERS, tag);
    fs.mkdirSync(path.join(directory, 'before'), { recursive: true });
    const api = githubApi({ tag }, directory);
    let release = api.getRelease();
    fs.writeFileSync(path.join(directory, 'before', 'release.json'), JSON.stringify(release, null, 2));
    fs.writeFileSync(path.join(directory, 'before', 'body.md'), release.body || '');
    check(release.tag_name === tag && !release.draft && release.prerelease, 'Expected a published Beta release');
    let backupChecksums = null;
    if (release.assets.some(asset => asset.name === BACKUP_NAME)) {
      gh(['release', 'download', tag, '--repo', process.env.GITHUB_REPOSITORY, '--pattern', BACKUP_NAME, '--dir', path.join(directory, 'before')]);
      backupChecksums = fs.readFileSync(path.join(directory, 'before', BACKUP_NAME), 'utf8');
    }
    if (release.assets.some(asset => asset.name === 'SHA256SUMS')) gh(['release', 'download', tag, '--repo', process.env.GITHUB_REPOSITORY, '--pattern', 'SHA256SUMS', '--dir', path.join(directory, 'before')]);
    else {
      check(backupChecksums !== null, 'Missing SHA256SUMS and durable backup; restore the saved run artifact before retrying');
      fs.writeFileSync(path.join(directory, 'before', 'SHA256SUMS'), backupChecksums);
    }
    const checksums = fs.readFileSync(path.join(directory, 'before', 'SHA256SUMS'), 'utf8');
    const packages = fs.readdirSync(packagesDirectory).map(name => {
      const file = path.join(packagesDirectory, name);
      check(fs.lstatSync(file).isFile(), 'Expected regular LuCI package files');
      const bytes = fs.readFileSync(file);
      return { name, size: bytes.length, hash: sha256(bytes) };
    });
    let plan = prepareLuciUpdate(release, checksums, packages, tag, revision, backupChecksums);
    for (const item of packages) fs.copyFileSync(path.join(packagesDirectory, item.name), path.join(directory, item.name));
    for (const asset of release.assets.filter(item => isLuci(item.name))) {
      gh(['release', 'download', tag, '--repo', process.env.GITHUB_REPOSITORY, '--pattern', asset.name, '--dir', path.join(directory, 'before')]);
      check(`sha256:${sha256(fs.readFileSync(path.join(directory, 'before', asset.name)))}` === asset.digest, 'Original LuCI backup digest mismatch');
    }
    if (plan.recoverChecksums) {
      fs.writeFileSync(path.join(directory, 'recovery-plan.json'), JSON.stringify(plan, null, 2));
      release = recoverGithub(plan, api);
      fs.writeFileSync(path.join(directory, 'recovered-release.json'), JSON.stringify(release, null, 2));
      plan = prepareLuciUpdate(release, checksums, packages, tag, revision, backupChecksums);
    }
    fs.writeFileSync(path.join(directory, 'plan.json'), JSON.stringify(plan, null, 2));
    fs.writeFileSync(path.join(directory, BACKUP_NAME), plan.backupChecksums);
    fs.writeFileSync(path.join(directory, 'SHA256SUMS'), plan.afterChecksums);
    fs.writeFileSync(path.join(directory, 'body.md'), plan.afterBody);
    console.log(`Prepared ${tag} LuCI r${revision}; ${plan.protectedAssets.length} existing assets protected`);
    return;
  }
  const directory = path.resolve(first), plan = JSON.parse(fs.readFileSync(path.join(directory, 'plan.json'), 'utf8'));
  if (mode === 'stage-mirrors' || mode === 'commit-mirrors') return operateMirrors(plan, directory, mode === 'commit-mirrors');
  const api = githubApi(plan, directory);
  const release = mode === 'publish' ? publishGithub(plan, api) : mode === 'finalize' ? finalizeGithub(plan, api) : null;
  check(release, 'Unknown operation');
  fs.writeFileSync(path.join(directory, 'plan.json'), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(directory, `${mode}-release.json`), JSON.stringify(release, null, 2));
  console.log(`${mode}: ${plan.tag} verified`);
}

module.exports = { prepareLuciUpdate, mirrorScript, publishGithub, finalizeGithub, recoverGithub, parseMirrors, sha256, BACKUP_NAME };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
