const { renderReleasePage, extractLatestSection } = require('./update-release-page.cjs');

const RELEASE_PATHS = {
  stable: 'docs/zh/guide/releases.md',
  beta: 'docs/zh/guide/releases-beta.md',
};

function versionParts(version, channel) {
  const pattern = channel === 'beta' ? /^beta-(\d+)\.(\d+)\.(\d+)$/u : /^v?(\d+)\.(\d+)\.(\d+)$/u;
  const match = String(version).match(pattern);
  if (!match) throw new Error('无效的发布版本或通道 / Invalid release version or channel');
  return match.slice(1).map(BigInt);
}

function isNewer(currentVersion, incomingVersion, channel) {
  const current = versionParts(currentVersion, channel);
  const incoming = versionParts(incomingVersion, channel);
  for (let index = 0; index < current.length; index += 1) {
    if (current[index] !== incoming[index]) return current[index] > incoming[index];
  }
  return false;
}

// A generated page is derived data: re-render it against the latest file on a
// conflict instead of rebasing an obsolete Markdown patch over human edits.
async function publishReleasePage({ github, owner, repo, options, branch = 'main', maxAttempts = 4 }) {
  if (!options || !Object.hasOwn(RELEASE_PATHS, options.channel) ||
      options.releasesPath !== RELEASE_PATHS[options.channel] || branch !== 'main') {
    throw new Error('只能更新 main 对应通道的发布页面 / Invalid release page target');
  }
  versionParts(options.version, options.channel);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new Error('无效的发布重试次数 / Invalid publish retry limit');
  }

  const target = { owner, repo, path: options.releasesPath };
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data: file } = await github.rest.repos.getContent({ ...target, ref: branch });
    if (Array.isArray(file) || file?.type !== 'file' || file.encoding !== 'base64' ||
        typeof file.content !== 'string' || !file.sha) {
      throw new Error('无法读取完整发布页面，停止更新 / Invalid release page response');
    }
    const current = Buffer.from(file.content, 'base64').toString('utf8');
    const latest = extractLatestSection(current, options.channel);
    if (latest.version && isNewer(latest.version, options.version, options.channel)) {
      return { status: 'superseded', version: latest.version, attempts: attempt };
    }
    const next = renderReleasePage(current, options);
    if (next === current) return { status: 'unchanged', attempts: attempt };

    try {
      const { data } = await github.rest.repos.createOrUpdateFileContents({
        ...target,
        branch,
        sha: file.sha,
        message: `docs: 自动更新发布日志 ${options.version} / update release notes ${options.version}`,
        content: Buffer.from(next, 'utf8').toString('base64'),
      });
      return { status: 'published', commitSha: data.commit.sha, attempts: attempt };
    } catch (error) {
      // Permission/validation/network failures are not content conflicts. Keep
      // their original failure signal; only 409 permits a new read/render/write.
      if (error.status !== 409) throw error;
      if (attempt === maxAttempts) {
        throw new Error(`发布页面并发更新冲突，${maxAttempts} 次重试已耗尽 / Release page conflict retries exhausted`, { cause: error });
      }
    }
  }
}

module.exports = { publishReleasePage };
