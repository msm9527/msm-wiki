'use strict';

const { execFileSync } = require('child_process');

const UNIT_SEPARATOR = '\x1F';
const DEFAULT_MAX_FALLBACK_COMMITS = 100;
const DEFAULT_DETAIL_LIMIT = 30;
const DEFAULT_DIFF_FILE_LIMIT = 12;
const DEFAULT_DIFF_CHAR_LIMIT = 1800;
const DEFAULT_BODY_CHAR_LIMIT = 1400;
const DEFAULT_BODY_HIGHLIGHT_LIMIT = 80;
const DEFAULT_BODY_HIGHLIGHT_CHAR_LIMIT = 6000;
const DEFAULT_MODEL_CANDIDATES = [
  'Qwen/Qwen3-30B-A3B',
  'Qwen/Qwen3-14B',
  'Qwen/Qwen3-8B',
];
const DEFAULT_SUMMARY_ITEM_LIMIT = 8;
const DEFAULT_HIGHLIGHT_LIMIT = 5;

function normalizeText(value) {
  return String(value || '').replace(/\r/g, '').trim();
}

function truncateText(value, limit) {
  const text = normalizeText(value);
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit).trimEnd()}\n...（已截断）`;
}

function isValidCommitSha(value) {
  return /^[0-9a-f]{7,40}$/i.test(String(value || '').trim());
}

function hasValidTimeWindow(logSinceEpoch, logUntilEpoch) {
  const sinceNum = Number(logSinceEpoch);
  const untilNum = Number(logUntilEpoch);
  return (
    String(logSinceEpoch || '').trim() &&
    String(logUntilEpoch || '').trim() &&
    !Number.isNaN(sinceNum) &&
    !Number.isNaN(untilNum) &&
    sinceNum < untilNum
  );
}

function buildGitLogArgs({
  previousCommit,
  logSinceEpoch,
  logUntilEpoch,
  currentRef = 'HEAD',
  maxFallbackCommits = DEFAULT_MAX_FALLBACK_COMMITS,
} = {}) {
  const normalizedPreviousCommit = String(previousCommit || '').trim();
  const normalizedCurrentRef = String(currentRef || 'HEAD').trim();
  const normalizedUntil = String(logUntilEpoch || '').trim();

  if (isValidCommitSha(normalizedPreviousCommit)) {
    return [`${normalizedPreviousCommit}..${normalizedCurrentRef}`];
  }

  if (hasValidTimeWindow(logSinceEpoch, logUntilEpoch)) {
    return [`--since=@${String(logSinceEpoch).trim()}`, `--until=@${normalizedUntil}`];
  }

  const args = [`-${maxFallbackCommits}`];
  if (normalizedUntil) {
    args.push(`--until=@${normalizedUntil}`);
  }
  return args;
}

function defaultGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function safeGit(args, git = defaultGit) {
  try {
    return git(args);
  } catch {
    return '';
  }
}

function commitExists(commit, git = defaultGit) {
  if (!isValidCommitSha(commit)) {
    return false;
  }
  try {
    git(['cat-file', '-e', `${commit}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function isAncestorOfHead(commit, currentRef = 'HEAD', git = defaultGit) {
  if (!isValidCommitSha(commit)) {
    return false;
  }
  try {
    git(['merge-base', '--is-ancestor', commit, currentRef]);
    return true;
  } catch {
    return false;
  }
}

function parseGitLog(output) {
  return normalizeText(output)
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const parts = line.split(UNIT_SEPARATOR);
      if (parts.length < 5) {
        return null;
      }
      return {
        hash: parts[0],
        shortHash: parts[1],
        subject: parts[2],
        author: parts[3],
        date: parts[4],
      };
    })
    .filter(Boolean);
}

function parseNameStatus(output) {
  return normalizeText(output)
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const parts = line.split('\t');
      const status = parts[0] || '';
      const path = parts[parts.length - 1] || '';
      return path ? { status, path } : null;
    })
    .filter(Boolean);
}

function extractCommitShas(text) {
  const shas = [];
  const seen = new Set();
  const pattern = /github\.com\/[^/\s]+\/[^/\s]+\/commit\/([0-9a-f]{7,40})/gi;
  let match;

  while ((match = pattern.exec(String(text || ''))) !== null) {
    const sha = match[1].toLowerCase();
    if (!seen.has(sha)) {
      shas.push(sha);
      seen.add(sha);
    }
  }

  return shas;
}

function isNoisyDiffPath(filePath) {
  const path = String(filePath || '').toLowerCase();
  return (
    !path ||
    path.endsWith('package-lock.json') ||
    path.endsWith('pnpm-lock.yaml') ||
    path.endsWith('yarn.lock') ||
    path.endsWith('go.sum') ||
    path.includes('/vendor/') ||
    path.includes('/node_modules/') ||
    path.startsWith('dist/') ||
    path.startsWith('build/') ||
    path.startsWith('coverage/') ||
    /\.(apx|dmg|gz|zip|png|jpe?g|gif|webp|ico|pdf|woff2?)$/i.test(path)
  );
}

function selectDiffFiles(files, limit = DEFAULT_DIFF_FILE_LIMIT) {
  return (files || [])
    .map(file => (typeof file === 'string' ? file : file.path || file.filename))
    .filter(filePath => filePath && !isNoisyDiffPath(filePath))
    .slice(0, limit);
}

function cleanDiff(diff, limit = DEFAULT_DIFF_CHAR_LIMIT) {
  const cleaned = normalizeText(diff)
    .split('\n')
    .filter(line => !/^index [0-9a-f]+\.\.[0-9a-f]+/i.test(line))
    .map(line => (line.length > 260 ? `${line.slice(0, 260)}...` : line))
    .join('\n');

  return truncateText(cleaned, limit);
}

function isMeaningfulChangeLine(line) {
  const text = normalizeText(line)
    .replace(/^[-*]\s+/, '')
    .replace(/\s+/g, ' ');

  if (!text || text.length < 6) {
    return false;
  }
  if (/^(co-authored-by|signed-off-by|merge branch|---------)/i.test(text)) {
    return false;
  }
  if (/^(ignore|release|version|版本)?\s*\d+\.\d+(?:\.\d+)?(?:\s|$)/i.test(text)) {
    return false;
  }
  if (/^(tests?|testing|验证|测试)\s*[:/：]/i.test(text)) {
    return false;
  }

  return (
    /^(feat|fix|perf|refactor|security|docs|build|ci|chore)(?:\([^)]+\))?:/i.test(text) ||
    /^(新增|添加|支持|修复|优化|升级|统一|调整|改进|降低|移除|清理|增强|放宽|加固|同步|根治)/.test(text)
  );
}

function addTermWithSynonyms(terms, term) {
  const normalized = String(term || '').toLowerCase();
  if (!normalized || normalized.length < 2) {
    return;
  }

  const genericTerms = new Set([
    'api',
    'app',
    'assets',
    'backend',
    'cmd',
    'commands',
    'components',
    'config',
    'configs',
    'frontend',
    'handler',
    'handlers',
    'hook',
    'hooks',
    'internal',
    'json',
    'lib',
    'lock',
    'management',
    'package',
    'page',
    'pages',
    'pkg',
    'service',
    'setup',
    'src',
    'template',
    'templates',
    'test',
    'tests',
    'tsx',
    'typescript',
    'yaml',
    'yml',
  ]);
  const synonyms = {
    activation: ['activation', '激活', '授权', 'license', 'pro'],
    heartbeat: ['heartbeat', '心跳', '租约', 'license', 'pro'],
    connectivity: ['connectivity', '连接', '兜底', 'socks5', '223.5.5.5'],
    dashboard: ['dashboard', '仪表盘', '首页'],
    fakeip: ['fakeip', 'fake-ip', 'fake ip', 'dns', '路由'],
    license: ['license', '授权', '激活', '心跳', '租约', 'pro', '勋章', '奖章', 'medal'],
    medal: ['medal', 'medals', '勋章', '奖章', '3d', 'webgl', 'logo'],
    medals: ['medal', 'medals', '勋章', '奖章', '3d', 'webgl', 'logo'],
    mihomo: ['mihomo', '代理', '策略组', '规则', '订阅', '节点', '运行地址', 'http/https', 'tun'],
    mosdns: ['mosdns', 'dns', '记忆池', 'fakeip', 'fake-ip'],
    network: ['network', '网络', '路由', 'tun', 'nft', 'fakeip'],
    process: ['process', '进程', '服务', 'daemon', '安装', '更新'],
    processmanager: ['process', '进程', '服务', 'daemon', '安装', '更新'],
    proxies: ['proxy', 'proxies', '代理', '订阅', '节点'],
    proxy: ['proxy', 'proxies', '代理', '订阅', '节点'],
    rules: ['rule', 'rules', '规则', '规则集'],
    rule: ['rule', 'rules', '规则', '规则集'],
    runtime: ['runtime', '运行', '运行时', '地址', 'http/https', 'websocket'],
    update: ['update', 'download', 'install', '更新', '下载', '安装'],
    download: ['update', 'download', 'install', '更新', '下载', '安装'],
    install: ['update', 'download', 'install', '更新', '下载', '安装'],
    launchd: ['launchd', '服务', '进程', 'daemon'],
    log: ['log', 'logs', '日志'],
    logs: ['log', 'logs', '日志'],
    chunk: ['chunk', 'lazy', '懒加载', '首屏'],
    lazy: ['chunk', 'lazy', '懒加载', '首屏'],
    grid: ['grid', 'layout', '布局', 'react-grid-layout'],
    layout: ['grid', 'layout', '布局', 'react-grid-layout'],
    telemetry: ['telemetry', '上报', '遥测', 'license'],
  };

  if (!synonyms[normalized] && genericTerms.has(normalized)) {
    return;
  }

  if (!genericTerms.has(normalized)) {
    terms.add(normalized);
  }
  for (const synonym of synonyms[normalized] || []) {
    terms.add(synonym.toLowerCase());
  }
}

function buildChangedFileTerms(files) {
  const terms = new Set();
  for (const file of files || []) {
    const filePath = typeof file === 'string' ? file : file.path || file.filename;
    const expanded = String(filePath || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase();

    for (const rawTerm of expanded.split(/[^a-z0-9]+/)) {
      if (rawTerm.length >= 3 || rawTerm === '3d') {
        addTermWithSynonyms(terms, rawTerm);
      }
    }
  }

  return terms;
}

function scoreHighlightAgainstFiles(text, changedFileTerms) {
  if (!changedFileTerms || changedFileTerms.size === 0) {
    return 0;
  }

  const normalized = normalizeText(text).toLowerCase();
  let score = 0;
  for (const term of changedFileTerms) {
    if (term.length >= 2 && normalized.includes(term)) {
      score += term.length >= 4 ? 2 : 1;
    }
  }
  return score;
}

function extractChangeHighlights(body, {
  changedFiles = [],
  maxItems = DEFAULT_BODY_HIGHLIGHT_LIMIT,
  maxChars = DEFAULT_BODY_HIGHLIGHT_CHAR_LIMIT,
} = {}) {
  const candidates = [];
  const seen = new Set();
  const changedFileTerms = buildChangedFileTerms(changedFiles);

  for (const rawLine of normalizeText(body).split('\n')) {
    const match = rawLine.match(/^\s*([*-])\s+(.+)$/);
    if (!match) {
      continue;
    }

    const isTopLevelSquashBullet = match[1] === '*' && !/^\s/.test(rawLine);
    const text = match[2].trim().replace(/\s+/g, ' ');
    if (!isTopLevelSquashBullet && !isMeaningfulChangeLine(text)) {
      continue;
    }
    if (!isMeaningfulChangeLine(text)) {
      continue;
    }

    const normalizedKey = text.toLowerCase();
    if (seen.has(normalizedKey)) {
      continue;
    }

    candidates.push({
      text,
      score: scoreHighlightAgainstFiles(text, changedFileTerms),
      index: candidates.length,
    });
    seen.add(normalizedKey);

    if (candidates.length >= maxItems * 4) {
      break;
    }
  }

  const relatedCandidates = candidates.filter(candidate => candidate.score > 0);
  const selectedCandidates = relatedCandidates.length >= 2
    ? relatedCandidates.sort((left, right) => right.score - left.score || left.index - right.index)
    : candidates;

  const highlights = [];
  let chars = 0;
  for (const candidate of selectedCandidates) {
    if (chars + candidate.text.length > maxChars) {
      continue;
    }
    highlights.push(candidate.text);
    chars += candidate.text.length;

    if (highlights.length >= maxItems) {
      break;
    }
  }

  return highlights;
}

function hasBodyHighlights(commit) {
  return Array.isArray(commit.bodyHighlights);
}

function readCommitDetails(commit, { git = defaultGit, includeLinkedCommits = true } = {}) {
  const body = safeGit(['show', '-s', '--format=%b', commit.hash], git);
  const files = parseNameStatus(
    safeGit(['show', '--first-parent', '-m', '--name-status', '--format=', commit.hash], git),
  );
  const diffFiles = selectDiffFiles(files);
  const diff = diffFiles.length
    ? cleanDiff(
        safeGit(
          ['show', '--first-parent', '-m', '--format=', '--unified=1', '--no-ext-diff', commit.hash, '--', ...diffFiles],
          git,
        ),
      )
    : '';

  const linkedCommits = includeLinkedCommits
    ? extractCommitShas(`${commit.subject}\n${body}`)
        .filter(sha => sha !== commit.hash.toLowerCase())
        .filter(sha => commitExists(sha, git))
        .slice(0, 3)
        .map(sha => readLinkedCommit(sha, git))
        .filter(Boolean)
    : [];

  return {
    ...commit,
    body: truncateText(body, DEFAULT_BODY_CHAR_LIMIT),
    bodyHighlights: extractChangeHighlights(body, { changedFiles: files }),
    files,
    diff,
    linkedCommits,
  };
}

function readLinkedCommit(sha, git = defaultGit) {
  const line = normalizeText(safeGit(['show', '-s', `--format=%H${UNIT_SEPARATOR}%h${UNIT_SEPARATOR}%s`, sha], git));
  const parts = line.split(UNIT_SEPARATOR);
  if (parts.length < 3) {
    return null;
  }

  return {
    hash: parts[0],
    shortHash: parts[1],
    subject: parts[2],
    files: parseNameStatus(safeGit(['show', '--first-parent', '-m', '--name-status', '--format=', sha], git)).slice(0, 12),
  };
}

function collectReleaseCommits({
  previousCommit,
  logSinceEpoch,
  logUntilEpoch,
  currentRef = 'HEAD',
  maxFallbackCommits = DEFAULT_MAX_FALLBACK_COMMITS,
  detailLimit = DEFAULT_DETAIL_LIMIT,
  git = defaultGit,
} = {}) {
  const normalizedPreviousCommit = String(previousCommit || '').trim();
  const usablePreviousCommit =
    isValidCommitSha(normalizedPreviousCommit) &&
    commitExists(normalizedPreviousCommit, git) &&
    isAncestorOfHead(normalizedPreviousCommit, currentRef, git)
      ? normalizedPreviousCommit
      : '';

  const rangeArgs = buildGitLogArgs({
    previousCommit: usablePreviousCommit,
    logSinceEpoch,
    logUntilEpoch,
    currentRef,
    maxFallbackCommits,
  });
  const commits = parseGitLog(
    git(['log', ...rangeArgs, `--pretty=format:%H${UNIT_SEPARATOR}%h${UNIT_SEPARATOR}%s${UNIT_SEPARATOR}%an${UNIT_SEPARATOR}%ar`]),
  );
  const detailedCommits = commits.map((commit, index) =>
    index < detailLimit ? readCommitDetails(commit, { git }) : commit,
  );

  return {
    commits: detailedCommits,
    rangeArgs,
    source: usablePreviousCommit
      ? 'previous-source-commit'
      : hasValidTimeWindow(logSinceEpoch, logUntilEpoch)
        ? 'release-time-window'
        : 'fallback-recent-commits',
  };
}

function formatFiles(files, limit = 18) {
  const formatted = (files || [])
    .slice(0, limit)
    .map(file => `${file.status || '?'} ${file.path || file.filename}`)
    .join('; ');

  if (!formatted) {
    return '';
  }

  return (files || []).length > limit ? `${formatted}; ...` : formatted;
}

function indent(text, prefix = '    ') {
  return normalizeText(text)
    .split('\n')
    .map(line => `${prefix}${line}`)
    .join('\n');
}

function formatCommitForPrompt(commit) {
  const lines = [`- ${commit.shortHash || commit.hash} ${commit.subject} (${commit.author || 'unknown'}, ${commit.date || 'unknown'})`];
  const bodyHighlights = hasBodyHighlights(commit)
    ? commit.bodyHighlights
    : extractChangeHighlights(commit.body, { changedFiles: commit.files });
  const body = truncateText(commit.body, 700);
  const files = formatFiles(commit.files);
  const diff = truncateText(commit.diff, DEFAULT_DIFF_CHAR_LIMIT);

  if (bodyHighlights.length > 0) {
    lines.push(`  正文要点:\n${bodyHighlights.map(item => `    - ${item}`).join('\n')}`);
  }
  if (body) {
    lines.push(`  正文: ${body.replace(/\n+/g, ' / ')}`);
  }
  if (files) {
    lines.push(`  文件: ${files}`);
  }
  if (diff) {
    lines.push(`  Diff 摘要:\n${indent(diff)}`);
  }
  if (commit.linkedCommits && commit.linkedCommits.length > 0) {
    lines.push('  引用提交:');
    for (const linkedCommit of commit.linkedCommits) {
      const linkedFiles = formatFiles(linkedCommit.files, 8);
      lines.push(`    - ${linkedCommit.shortHash || linkedCommit.hash} ${linkedCommit.subject}`);
      if (linkedFiles) {
        lines.push(`      文件: ${linkedFiles}`);
      }
    }
  }

  return lines.join('\n');
}

function normalizeReleaseItem(value) {
  let text = normalizeText(value)
    .replace(/^[-*]\s+/u, '')
    .replace(/\s+\/\s+(?=[A-Za-z][^/]*$)[^/]+$/u, '')
    .replace(
      /^(?:feat|fix|perf|refactor|security|docs|build|ci|chore|merge)(?:\([^)]+\))?\s*:\s*/iu,
      '',
    )
    .replace(/^merge(?: pull request)?\s*[^:]*:\s*/iu, '')
    .replace(/\s*\(#\d+\)\s*$/u, '')
    .replace(/[。；;]+$/u, '')
    .replace(/\s+/gu, ' ')
    .trim();

  return text;
}

function isNoiseReleaseItem(value) {
  const text = normalizeText(value);
  return (
    !text ||
    text.length < 6 ||
    /^(?:dev|merge(?: branch| pull request)?|bump version|更新版本|升级版本|版本号升级|release\b)/iu.test(text) ||
    /^(?:chore|ci|build|docs)\b\s*(?:更新|升级)?$/iu.test(text)
  );
}

function classifyReleaseItem(text, commit = {}) {
  const subject = String(commit.subject || '').toLowerCase();
  const value = `${commit.subject || ''} ${text} ${(commit.files || [])
    .map(file => file.path || file.filename || '')
    .join(' ')}`.toLowerCase();

  if (/^\s*fix(?:\([^)]+\))?\s*:/u.test(subject)) return 'fixed';
  if (/^\s*feat(?:\([^)]+\))?\s*:/u.test(subject)) return 'added';
  if (/^\s*(?:perf|refactor|security|merge|chore)(?:\([^)]+\))?\s*:/u.test(subject)) {
    return 'changed';
  }

  if (
    /deprecated|废弃|不再支持|移除.*入口|删除.*功能/iu.test(value)
  ) {
    return 'deprecated';
  }
  if (
    /\bfix\b|bug|修复|解决|错误|异常|崩溃|竞态|冲突|阻止|清理失效|回退/iu.test(value)
  ) {
    return 'fixed';
  }
  if (
    /\bfeat\b|新增|添加|支持|引入|提供|允许|绑定|统一.*入口|重构.*界面/iu.test(value)
  ) {
    return 'added';
  }
  return 'changed';
}

function scoreReleaseItem(text, commit, source) {
  const value = `${commit.subject || ''} ${text}`.toLowerCase();
  let score = source === 'subject' ? 5 : 2;
  if (/\bfeat\b|新增|添加|支持|引入|提供|绑定/iu.test(value)) score += 4;
  if (/\bfix\b|修复|安全|权限|授权|校验|回退/iu.test(value)) score += 3;
  if (/\bperf\b|性能|优化|重构|统一/iu.test(value)) score += 2;
  if ((commit.files || []).length > 1) score += 1;
  return score;
}

function collectFallbackSummaryItems(commits, {
  categoryLimit = DEFAULT_SUMMARY_ITEM_LIMIT,
  highlightLimit = DEFAULT_HIGHLIGHT_LIMIT,
} = {}) {
  const buckets = {
    added: [],
    changed: [],
    fixed: [],
    deprecated: [],
    notes: [],
  };
  const seen = new Set();
  let index = 0;

  for (const commit of commits || []) {
    const bodyHighlights = hasBodyHighlights(commit)
      ? commit.bodyHighlights
      : extractChangeHighlights(commit.body, { changedFiles: commit.files });
    const candidates = [
      { text: commit.subject, source: 'subject' },
      ...bodyHighlights.slice(0, 5).map(text => ({ text, source: 'body' })),
    ];

    for (const candidate of candidates) {
      const item = normalizeReleaseItem(candidate.text);
      if (isNoiseReleaseItem(item)) continue;

      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const category = classifyReleaseItem(item, commit);
      buckets[category].push({
        item,
        score: scoreReleaseItem(item, commit, candidate.source),
        index: index++,
      });
    }
  }

  const sortItems = items =>
    items
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, categoryLimit)
      .map(entry => entry.item);
  const sortedBuckets = Object.fromEntries(
    Object.entries(buckets).map(([key, items]) => [key, sortItems(items)]),
  );
  const highlightCandidates = [
    ...buckets.added,
    ...buckets.changed,
    ...buckets.fixed,
  ]
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, highlightLimit)
    .map(entry => entry.item);

  return {
    ...sortedBuckets,
    highlights: highlightCandidates,
  };
}

function buildSummaryPrompt(commits) {
  const commitContexts = (commits || []).map(formatCommitForPrompt).join('\n\n');

  return `请分析以下 Git 提交上下文，生成结构化的版本发布文档。

提交上下文（共 ${(commits || []).length} 个）：
${commitContexts}

要求：
1. 用中文输出。
2. 按照以下格式分类输出：

### ⭐ 本次亮点（Highlights）
- 用 3-5 条总结用户最能感知的变化，写成“功能 + 价值”，不要写提交数量或内部文件名

### ✨ 新增（Added）
- 新增的功能或特性

### 🔧 变更（Changed）
- 行为调整、重构、配置变更等

### 🐛 修复（Fixed）
- Bug 修复、问题解决等

### ⚠️ 废弃（Deprecated）
- 即将废弃的功能（如果有）

### 📝 备注（Notes）
- 重要的使用注意事项或兼容性说明（如果有）

3. “本次亮点”必须输出 3-5 条；如果确实没有用户可感知的功能变化，才省略这一节。
4. 如果其他分类没有内容，完全省略该分类的标题和内容，不要输出“无”。
5. 每个要点写清“做了什么 + 对用户有什么影响”，尽量控制在 20-60 字。
6. 合并相似提交，忽略纯版本号、打包、CI、格式化、依赖锁文件等非功能性变更。
7. 如果提交标题很泛（例如 Dev、Merge、bump version），必须优先根据“正文要点”、正文、文件列表、Diff 摘要和引用提交判断真实功能变化。
8. 对 squash 合并提交，正文要点是高优先级输入；但正文要点可能混入历史提交，最终以本次文件列表和 Diff 摘要为准，明显无关的历史内容请忽略。
9. 必须覆盖所有有实际变化的模块；不要只总结最前面几条提交，也不要因为修复项多就遗漏新增功能、性能、授权、安全、DNS、Clash（内部标识 mihomo）/MosDNS、Docker、桌面端等内容。
10. 只输出 Markdown 分类和要点，不要输出解释性前后缀、代码围栏或“以下是总结”。`;
}

function buildFallbackSummary(commits, previousReleasePublishedAt) {
  if (!commits || commits.length === 0) {
    return '### 📝 备注（Notes）\n- 本次发布窗口内没有可归纳的新增提交';
  }

  const summary = collectFallbackSummaryItems(commits);
  const groups = [
    ['highlights', '### ⭐ 本次亮点（Highlights）'],
    ['added', '### ✨ 新增（Added）'],
    ['changed', '### 🔧 变更（Changed）'],
    ['fixed', '### 🐛 修复（Fixed）'],
    ['deprecated', '### ⚠️ 废弃（Deprecated）'],
  ];
  const lines = [];

  for (const [key, title] of groups) {
    if (summary[key].length === 0) continue;
    lines.push(title, ...summary[key].map(item => `- ${item}`), '');
  }

  if (lines.length === 0) {
    lines.push('### 📝 备注（Notes）', '- 本次发布仅包含内部构建或版本元数据调整');
  } else {
    const windowText = previousReleasePublishedAt
      ? `从 ${previousReleasePublishedAt} 之后的 ${commits.length} 个提交中整理`
      : `从本次 ${commits.length} 个提交中整理`;
    lines.push(
      '### 📝 备注（Notes）',
      `- ${windowText}；摘要同时参考提交正文、变更文件和 diff，完整细节以 GitHub Release 为准`,
    );
  }

  return normalizePublicTerminology(lines.join('\n').trim());
}

function normalizePublicTerminology(value) {
  return normalizeText(value).replace(/\bmihomo\b/giu, 'Clash');
}

async function requestModelScopeSummary({
  apiKey,
  prompt,
  fetchImpl = globalThis.fetch,
  modelCandidates = DEFAULT_MODEL_CANDIDATES,
  logger = console,
} = {}) {
  if (!apiKey) {
    throw new Error('未配置 MODELSCOPE_API_KEY');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('当前 Node.js 环境不支持 fetch');
  }

  let lastError = null;
  for (const modelName of modelCandidates) {
    try {
      logger.log(`尝试使用模型: ${modelName}`);
      const response = await fetchImpl('https://api-inference.modelscope.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的软件版本发布助手，擅长结合 Git 提交信息、文件列表和 diff 摘要生成准确的结构化版本发布文档。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 1200,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('API 响应格式异常');
      }

      const summary = normalizePublicTerminology(content)
        .replace(/<think>[\s\S]*?<\/think>/giu, '')
        .replace(/^```(?:markdown|md)?\s*/iu, '')
        .replace(/\s*```$/u, '')
        .replace(/^- - /gmu, '- ')
        .trim();
      if (!summary || !/(亮点|新增|变更|修复)/u.test(summary)) {
        throw new Error('模型输出缺少有效的版本分类或亮点');
      }

      return {
        modelName,
        summary,
        usage: data.usage,
      };
    } catch (error) {
      lastError = error;
      logger.error(`模型 ${modelName} 调用失败:`, error.message);
    }
  }

  throw lastError || new Error('所有候选模型均调用失败');
}

module.exports = {
  buildFallbackSummary,
  buildGitLogArgs,
  buildSummaryPrompt,
  collectFallbackSummaryItems,
  collectReleaseCommits,
  extractCommitShas,
  extractChangeHighlights,
  parseGitLog,
  parseNameStatus,
  normalizePublicTerminology,
  requestModelScopeSummary,
  selectDiffFiles,
};
