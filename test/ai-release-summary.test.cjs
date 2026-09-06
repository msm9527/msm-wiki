const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  buildFallbackSummary,
  DEFAULT_MODEL_CANDIDATES,
  buildGitLogArgs,
  collectFallbackSummaryItems,
  collectReleaseCommits,
  cleanDiff,
  classifyReleaseItem,
  extractChangeHighlights,
  normalizeModelSummary,
  normalizeReleaseMarkdown,
  extractCommitShas,
  buildSummaryPrompt,
  buildReviewPrompt,
  buildNetDiffEvidence,
  requestModelScopeSummary,
  readReleaseBaseline,
  resolveModelCandidates,
  selectDiffFiles,
  validateSummary,
} = require('../scripts/ai-release-summary.cjs');

test('buildGitLogArgs prefers previous source commit range over release time window', () => {
  const previousCommit = '71e809decc2fe751e76841fc127ed9ec873e1f5b';

  assert.deepEqual(
    buildGitLogArgs({
      previousCommit,
      logSinceEpoch: '200',
      logUntilEpoch: '300',
      currentRef: 'HEAD',
    }),
    [`${previousCommit}..HEAD`],
  );
});

test('extractCommitShas finds GitHub commit URLs in commit text', () => {
  assert.deepEqual(
    extractCommitShas(
      'see https://github.com/msm9527/msm/commit/cdf8bf4fbb302ca946196d0022266035f3eb468e for details',
    ),
    ['cdf8bf4fbb302ca946196d0022266035f3eb468e'],
  );
});

test('selectDiffFiles filters noisy generated files before collecting patches', () => {
  assert.deepEqual(
    selectDiffFiles([
      { path: 'package-lock.json' },
      { path: 'backend/internal/config/loader.go' },
      { path: 'frontend/src/pages/Settings.vue' },
      { filename: 'frontend/src/pages/license/Medal3D.tsx' },
      { path: 'dist/msm-linux-amd64.tar.gz' },
    ]),
    ['backend/internal/config/loader.go', 'frontend/src/pages/Settings.vue', 'frontend/src/pages/license/Medal3D.tsx'],
  );
});

test('buildSummaryPrompt includes body, files, diff, and linked commit context for vague commits', () => {
  const prompt = buildSummaryPrompt([
    {
      hash: 'cdf8bf4fbb302ca946196d0022266035f3eb468e',
      shortHash: 'cdf8bf4',
      subject: 'Dev (#58)',
      author: 'msm',
      date: '2 hours ago',
      body: 'Ref: https://github.com/msm9527/msm/commit/1111111111111111111111111111111111111111',
      files: [
        { status: 'M', path: 'backend/internal/config/loader.go' },
        { status: 'M', path: 'frontend/src/pages/Settings.vue' },
      ],
      diff: '@@ func LoadConfig @@\n+ restore missing config refs before startup',
      linkedCommits: [
        {
          shortHash: '1111111',
          subject: 'fix: restore missing config refs',
          files: [{ status: 'M', path: 'backend/internal/config/loader.go' }],
        },
      ],
    },
  ]);

  assert.match(prompt, /Dev \(#58\)/);
  assert.match(prompt, /backend\/internal\/config\/loader\.go/);
  assert.match(prompt, /restore missing config refs/);
  assert.match(prompt, /引用提交/);
});

test('buildSummaryPrompt keeps late feature bullets from long squash commit bodies', () => {
  const longBody = [
    '* fix: 修复 macOS Mihomo TUN 默认配置',
    '修复 setup 和初始化配置更新时 Mihomo 运行参数未回放的问题。',
    ...Array.from({ length: 30 }, (_, index) => `详细修复说明 ${index}: ${'网络状态自愈 '.repeat(8)}`),
    '* feat(mihomo): 连接页改用 WebSocket 实时流，解决显示/刷新不及时',
    '* perf(frontend): 优化首页 Dashboard resize 性能与交互细节',
    '* feat(license): 激活/心跳三层连接兜底（直连/223.5.5.5/本机SOCKS5）',
  ].join('\n\n');

  const prompt = buildSummaryPrompt([
    {
      hash: 'cdf8bf4fbb302ca946196d0022266035f3eb468e',
      shortHash: 'cdf8bf4',
      subject: 'Dev (#59)',
      author: 'msm',
      date: '2 hours ago',
      body: longBody,
      files: [{ status: 'M', path: 'frontend/src/pages/ConnectionsPage.tsx' }],
      diff: '',
      linkedCommits: [],
    },
  ]);

  assert.match(prompt, /正文要点/);
  assert.match(prompt, /连接页改用 WebSocket 实时流/);
  assert.match(prompt, /Dashboard resize 性能/);
  assert.match(prompt, /激活\/心跳三层连接兜底/);
});

test('buildSummaryPrompt prioritizes highlights related to changed files in long squash bodies', () => {
  const longBody = [
    '* feat(mosdns): 添加记忆池容量显示与清空功能',
    '* feat(mihomo): 连接页改用 WebSocket 实时流，解决显示/刷新不及时',
    ...Array.from({ length: 40 }, (_, index) => `历史说明 ${index}: ${'旧功能 '.repeat(8)}`),
    '* feat: 为 Pro 激活添加荣誉勋章展示系统',
    '* feat: 勋章炫耀展示升级为真 3D（WebGL / React Three Fiber）',
    '* fix: 修复背面 logo 闪烁（z-fighting）并降低浮雕厚度',
  ].join('\n\n');

  const prompt = buildSummaryPrompt([
    {
      hash: 'cdf8bf4fbb302ca946196d0022266035f3eb468e',
      shortHash: 'cdf8bf4',
      subject: 'Dev (#59)',
      author: 'msm',
      date: '2 hours ago',
      body: longBody,
      files: [
        { status: 'A', path: 'frontend/src/pages/license/Medal3D.tsx' },
        { status: 'A', path: 'frontend/src/components/NavbarMedals.tsx' },
      ],
      diff: '',
      linkedCommits: [],
    },
  ]);

  const highlights = prompt.match(/正文要点:\n([\s\S]*?)\n  待核验正文要点/)?.[1] || '';

  assert.match(highlights, /荣誉勋章展示系统/);
  assert.match(highlights, /真 3D/);
  assert.doesNotMatch(highlights, /记忆池容量/);
  assert.doesNotMatch(highlights, /WebSocket 实时流/);
  assert.match(prompt, /待核验正文要点[\s\S]*记忆池容量/);
  const fallback = buildFallbackSummary([{ subject: 'Dev (#59)', body: longBody, files: [
    { path: 'frontend/src/pages/license/Medal3D.tsx' },
    { path: 'frontend/src/components/NavbarMedals.tsx' },
  ] }]);
  assert.doesNotMatch(fallback, /记忆池容量|WebSocket 实时流/);
});

test('release summaries normalize the internal Mihomo name for public text', async () => {
  const fallback = buildFallbackSummary([
    {
      subject: '修复 Mihomo 配置校验',
      files: [],
    },
  ]);
  assert.match(fallback, /Clash 配置校验/);
  assert.doesNotMatch(fallback, /Mihomo/i);

  const result = await requestModelScopeSummary({
    apiKey: 'test-token',
    prompt: 'test prompt',
    modelCandidates: ['test-model'],
    logger: { log() {}, error() {} },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          choices: [{ message: { content: '### 🐛 修复（Fixed）\n- 修复 Mihomo 更新' } }],
        };
      },
    }),
  });

  assert.match(result.summary, /Clash 更新/);
  assert.doesNotMatch(result.summary, /Mihomo/i);
});

test('fallback release summaries keep highlights and multiple functional areas', () => {
  const commits = [
    {
      subject: 'chore: 升级版本至 1.4.1 / bump version to 1.4.1',
      files: [{ path: '.version' }],
    },
    {
      subject: 'refactor(docker): 统一 Docker 管理界面与 Compose 入口 / unify Docker UI',
      files: [{ path: 'frontend/src/pages/docker/DockerStacksPage.tsx' }],
    },
    {
      subject: 'fix: 绑定 API 令牌用户上下文 / bind API tokens to owner context',
      files: [{ path: 'backend/internal/middleware/auth.go' }],
    },
    {
      subject: 'Dev (#86)',
      bodyHighlights: [
        'feat: 增加容器 macvlan 校验，避免错误网络配置',
        'perf: 优化 Docker 资源工作台的加载体验',
      ],
      files: [{ path: 'frontend/src/pages/docker/DockerInventoryWorkbench.tsx' }],
    },
  ];

  const summary = buildFallbackSummary(commits, '2026-09-05T22:16:22Z');
  const items = collectFallbackSummaryItems(commits);

  assert.match(summary, /### 🎉 本次亮点（Highlights）/u);
  assert.match(summary, /Docker 管理界面与 Compose 入口/u);
  assert.match(summary, /API 令牌用户上下文/u);
  assert.match(summary, /容器 macvlan 校验/u);
  assert.doesNotMatch(summary, /升级版本至 1\.4\.1/u);
  assert.ok(items.highlights.length >= 2);
});

test('ModelScope defaults use catalog-verified instruction models and an 8000-token budget', async () => {
  let requestedModel = '';
  await requestModelScopeSummary({
    apiKey: 'test-token',
    prompt: 'test prompt',
    logger: { log() {}, error() {} },
    modelCandidates: DEFAULT_MODEL_CANDIDATES,
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      requestedModel = request.model;
      assert.equal(request.max_tokens, 8000);
      assert.match(request.messages[0].content, /完整/);
      assert.ok(options.signal instanceof AbortSignal);
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { content: '### ✨ 功能增强（Changed）\n- **Docker 入口统一**：容器与 Compose 使用一致的操作入口' } }],
          };
        },
      };
    },
  });

  assert.equal(requestedModel, 'Qwen/Qwen3.5-397B-A17B');
});

const silentLogger = { log() {}, error() {}, warn() {} };
const validSummary = '### 🐛 问题修复（Fixed）\n- **网络配置校验**：保存 macvlan 配置前检查网段，避免提交无效参数';
const modelResponse = (content = validSummary, finishReason = 'stop') => ({
  ok: true,
  async json() { return { choices: [{ message: { content }, finish_reason: finishReason }], usage: { completion_tokens: 80 } }; },
});

test('only Qwen3.5 models receive the top-level non-thinking request option', async () => {
  for (const model of [...DEFAULT_MODEL_CANDIDATES, 'Other/Qwen3.5-test', 'Qwen/Qwen3-Next-80B-A3B-Instruct']) {
    let body;
    await requestModelScopeSummary({
      apiKey: 'test-token', prompt: 'evidence', modelCandidates: [model], logger: silentLogger,
      fetchImpl: async (_url, options) => {
        body = JSON.parse(options.body);
        return modelResponse();
      },
    });
    assert.equal(Object.hasOwn(body, 'enable_thinking'), /^Qwen\/Qwen3\.5-/u.test(model), model);
    if (Object.hasOwn(body, 'enable_thinking')) assert.equal(body.enable_thinking, false);
    assert.equal(body.extra_body, undefined, 'the HTTP API receives the option at the top level');
  }
});

test('time-window and fallback log reads are pinned to the requested source ref', () => {
  assert.deepEqual(buildGitLogArgs({ currentRef: 'source-tag', logSinceEpoch: 10, logUntilEpoch: 20 }),
    ['--since=@10', '--until=@20', 'source-tag']);
  assert.deepEqual(buildGitLogArgs({ currentRef: 'source-tag', maxFallbackCommits: 45 }), ['-45', 'source-tag']);
});

test('all commits receive details and a fair diff share beyond the former 30-commit cutoff', () => {
  const shas = Array.from({ length: 42 }, (_, index) => (index + 1).toString(16).padStart(40, '0'));
  const requestedDiffs = [];
  const git = args => {
    if (args[0] === 'log') return shas.map((sha, index) => [sha, sha.slice(-7), `fix: 修复模块 ${index}`, 'dev', 'yesterday'].join('\x1f')).join('\n');
    if (args.includes('--format=%b')) return '* feat: 新增网络状态查看\n* fix: 修复容器日志跳动';
    if (args.includes('--name-status')) return 'M\tfrontend/src/network/Status.tsx';
    if (args.includes('--no-ext-diff')) {
      requestedDiffs.push(args);
      return 'diff --git a/frontend/src/network/Status.tsx b/frontend/src/network/Status.tsx\n@@ -1 +1 @@\n-old\n+new';
    }
    return '';
  };
  const result = collectReleaseCommits({ git });
  assert.equal(result.commits.length, 42);
  assert.match(result.commits[41].body, /网络状态/);
  assert.match(result.commits[41].diff, /\+new/);
  assert.equal(requestedDiffs.length, 42);
  assert.deepEqual(result.coverage, {
    totalCommits: 42, detailedCommits: 42, totalFiles: 42, sampledFiles: 42, commitsWithDiff: 42, incompleteDiffs: 0,
  });
  const limited = collectReleaseCommits({ git, detailLimit: 1 });
  assert.match(limited.commits[41].body, /网络状态/);
  assert.equal(limited.coverage.detailedCommits, 42);
  assert.equal(limited.coverage.commitsWithDiff, 1);
});

test('diff sampling covers later directories and excludes generated API specs', () => {
  const files = [
    '.version', 'backend/docs/openapi.json', 'vendor/generated.go',
    ...Array.from({ length: 35 }, (_, index) => `frontend/src/docker/File${index}.tsx`),
    'backend/auth/tokens.go', 'frontend/src/network/Settings.tsx',
  ];
  const selected = selectDiffFiles(files, 6);
  assert.ok(selected.includes('backend/auth/tokens.go'));
  assert.ok(selected.includes('frontend/src/network/Settings.tsx'));
  assert.ok(!selected.some(file => /openapi|version|vendor/u.test(file)));
});

test('patch excerpts retain later files and multiple hunks within the exact character budget', () => {
  const patch = ['a.ts', 'z.go', 'network.ts'].map(file =>
    `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ first ${file} @@\n+${'first '.repeat(200)}\n@@ last ${file} @@\n+${'last '.repeat(200)}`,
  ).join('\n');
  const diff = cleanDiff(patch, 2400);
  assert.ok(diff.length <= 2400);
  for (const file of ['a.ts', 'z.go', 'network.ts']) {
    assert.ok(diff.includes(`first ${file}`));
    assert.ok(diff.includes(`last ${file}`));
  }
});

test('body extraction retains over 80 meaningful bullets, numbered entries, and unscoped late features', () => {
  const body = Array.from({ length: 100 }, (_, index) => `- fix: 修复 Docker 展示问题 ${index}`).join('\n')
    + '\n101. 支持导出授权状态\n新增网络状态快捷入口';
  const result = extractChangeHighlights(body, { changedFiles: [{ path: 'frontend/Docker.tsx' }] });
  assert.equal(result.length, 102);
  assert.ok(result.includes('支持导出授权状态'));
  assert.ok(result.includes('新增网络状态快捷入口'));
});

test('fallback keeps every squash item and classifies by individual bullet rather than merge subject', () => {
  const items = collectFallbackSummaryItems([{
    subject: 'fix: 修复 Docker 展示',
    bodyHighlights: [
      ...Array.from({ length: 14 }, (_, index) => `feat: 新增管理功能 ${index}`),
      'perf: 减少列表重复请求',
      'security: 阻止跨用户读取令牌',
      '升级前需要手动迁移旧配置',
      'BREAKING CHANGE: 不再支持旧接口',
    ],
  }]);
  assert.equal(items.added.length, 14);
  assert.deepEqual(items.performance, ['减少列表重复请求']);
  assert.deepEqual(items.security, ['阻止跨用户读取令牌']);
  assert.deepEqual(items.notes, ['升级前需要手动迁移旧配置']);
  assert.equal(items.deprecated.length, 1);
  assert.deepEqual(items.fixed, ['修复 Docker 展示']);
  assert.equal(items.major.length, 0);
});

test('fallback preserves product pairs, avoids unsupported claims and does not claim diff or test verification', () => {
  const summary = buildFallbackSummary([
    { subject: 'feat: 支持 Clash / Sing-Box' },
    { subject: 'fix: 彻底解决 Docker 配置错误' },
    { subject: 'perf: 全面优化首页加载，耗时降低50%' },
  ]);
  assert.match(summary, /Clash \/ Sing-Box/);
  assert.doesNotMatch(summary, /彻底解决|全面|降低50%|参考.*diff/);
  assert.match(summary, /未经过 AI 语义归纳或运行验证/);
  assert.equal(validateSummary(summary).valid, true);
});

test('notes-only fallback does not lose required upgrade instructions', () => {
  const summary = buildFallbackSummary([{ subject: '升级前需要手动迁移旧配置' }]);
  assert.match(summary, /升级前需要手动迁移旧配置/);
  assert.doesNotMatch(summary, /仅包含内部构建/);
});

test('prompt reserves room for every commit and all body highlights before sharing optional context', () => {
  const commits = Array.from({ length: 60 }, (_, index) => ({
    shortHash: `commit-${index}`,
    subject: `fix: 修复问题 ${index}`,
    bodyHighlights: [`feat: 新增功能末项 ${index}`],
    body: '修复的详细上下文说明 '.repeat(1000),
    files: [{ path: `frontend/module${index}/Page.tsx` }],
    diff: `diff --git a/module${index} b/module${index}\n@@ region @@\n+${'patch '.repeat(1000)}`,
  }));
  const prompt = buildSummaryPrompt(commits, { maxPromptChars: 38000 });
  assert.ok(prompt.length <= 38000);
  for (let index = 0; index < 60; index++) {
    assert.ok(prompt.includes(`新增功能末项 ${index}`));
    assert.ok(prompt.includes(`frontend/module${index}/Page.tsx`));
  }
  assert.match(prompt, /没有证据就写具体修复条件/);
  assert.match(prompt, /🎉 重磅功能（Major）/);
  assert.match(prompt, /不能代替完整分类清单/);
});

test('a complete evidence index that exceeds budget is rejected instead of silently dropping later commits', () => {
  assert.throws(() => buildSummaryPrompt([{ subject: 'feat: 支持新功能', bodyHighlights: ['新增功能 '.repeat(40000)] }]), /不能静默丢弃提交/);
});

test('summary validator supports both current categories and old headings', () => {
  for (const title of ['🎉 重磅功能（Major）', '🆕 新增功能（Added）', '✨ 功能增强（Changed）', '⚡ 性能优化（Performance）',
    '🐛 问题修复（Fixed）', '🛡️ 安全加固（Security）', '⚠️ 兼容性变更（Deprecated）', '📌 升级提醒（Notes）',
    '✨ 新增（Added）', '🔧 变更（Changed）', '🐛 修复（Fixed）', '⚠️ 废弃（Deprecated）', '📝 备注（Notes）']) {
    assert.equal(validateSummary(`### ${title}\n- **具体功能**：说明功能行为发生了什么变化`).valid, true, title);
  }
  assert.equal(validateSummary('### 🎉 重磅功能\n- **新管理界面**：支持在同一页面操作容器').sections.major.length, 1);
  assert.equal(classifyReleaseItem('fix: 绑定 API 令牌用户上下文'), 'security');
  for (const title of ['⚠️ 兼容性变更（Deprecated）', '⚠️ 兼容性变更', '⚠️ 废弃（Deprecated）']) {
    const result = validateSummary(`### ${title}\n- **接口迁移**：不再支持旧版接口地址`);
    assert.equal(result.sections.deprecated.length, 1, title);
    assert.equal(result.sections.changed, undefined, title);
  }
});

test('large UI changes prioritize full behavior docs and implementation hunks ahead of CSS', () => {
  const behavior = '点击折叠的端口区域可展开全部映射；网络与磁盘分别显示双向累计量，不代表实时速率。';
  const docs = `diff --git a/docs/DOCKER.md b/docs/DOCKER.md\n@@ -16,4 +16,10 @@ Docker Center\n+### 页面与资源操作\n+${'容器页面与用户操作说明。'.repeat(40)}${behavior}\n+旧 /docker/compose 地址跳转到 /docker/stacks。`;
  const patches = [
    ...Array.from({ length: 80 }, (_, index) => `diff --git a/frontend/Style${index}.css b/frontend/Style${index}.css\n@@ -1 +1 @@\n+${'.new-style { display: grid; } '.repeat(100)}`),
    docs,
    'diff --git a/backend/docker/network.go b/backend/docker/network.go\n@@ -10 +10 @@ func validateNetwork\n+if driver == "macvlan" { return validateMacvlan(options) }',
    'diff --git a/backend/docker/network_test.go b/backend/docker/network_test.go\n@@ -20 +20 @@\n+func TestMacvlanRejectsInvalidSubnet(t *testing.T) { assertValidation(t) }',
  ].join('\n');
  const cleaned = cleanDiff(patches, 24000);
  assert.ok(cleaned.length <= 24000);
  assert.ok(cleaned.includes(behavior), 'long Markdown lines are preserved, not truncated at 260 characters');
  assert.match(cleaned, /validateMacvlan\(options\)/);
  assert.match(cleaned, /TestMacvlanRejectsInvalidSubnet/);
  assert.ok(cleaned.indexOf('docs/DOCKER.md') < cleaned.indexOf('Style0.css'));
  const prompt = buildSummaryPrompt([{ subject: 'refactor(docker): 统一 Docker 管理', body: '', diff: cleaned }]);
  assert.ok(prompt.includes(behavior));
});

test('summary validator rejects placeholders, empty categories, highlights-only and malformed output', () => {
  for (const output of [
    '### 🐛 修复\n- 无',
    '### 🐛 修复',
    '### 🎉 本次亮点\n- 测试可见功能发生变化',
    '以下是我的总结：\n' + validSummary,
    validSummary + '\n### 🐛 修复\n- 修复另一个网络展示问题',
    '### 🐛 修复\n- **未闭合标题：具体修复内容',
    '### 🐛 修复\n- 彻底解决所有网络错误',
    '### ⚡ 性能优化\n- 加载速度提升50%',
  ]) assert.equal(validateSummary(output).valid, false, output);
});

test('model fallback handles quota, unsupported model, truncated and invalid output before valid output', async () => {
  const names = ['quota-model', 'unsupported-model', 'truncated-model', 'invalid-model', 'working-model'];
  let attempt = 0;
  let observed;
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'test prompt', modelCandidates: names, logger: silentLogger,
    onResult: data => { observed = data; },
    fetchImpl: async () => {
      const current = attempt++;
      if (current < 2) return { ok: false, status: current === 0 ? 429 : 400,
        async text() { return JSON.stringify({ error: { message: current === 0 ? 'insufficient balance' : 'no provider supported' } }); } };
      if (current === 2) return modelResponse(validSummary, 'length');
      if (current === 3) return modelResponse('### 🐛 修复\n- 暂无');
      return modelResponse();
    },
  });
  assert.equal(result.modelName, 'invalid-model', 'a safe invalid output is corrected before changing model');
  assert.equal(observed.model, 'invalid-model');
  assert.equal(result.attempts.length, 5);
  assert.deepEqual(result.attempts.map(item => item.modelName), [...names.slice(0, 4), 'invalid-model']);
  assert.match(result.attempts[2].error, /截断/);
  assert.equal(result.validation.detailCount, 1);
});

test('model timeout aborts a hanging request and continues to the next candidate', async () => {
  let signal;
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'test prompt', modelCandidates: ['slow', 'fast'], logger: silentLogger, timeoutMs: 15,
    fetchImpl: async (_url, options) => {
      if (JSON.parse(options.body).model === 'slow') { signal = options.signal; return new Promise(() => {}); }
      return modelResponse();
    },
  });
  assert.equal(signal.aborted, true);
  assert.equal(result.modelName, 'fast');
  assert.match(result.attempts[0].error, /超时/);
});

test('response-body timeouts and malformed JSON fail over without exposing secrets', async () => {
  const key = 'private-test-credential';
  const logs = [];
  let request = 0;
  await assert.rejects(requestModelScopeSummary({
    apiKey: key, prompt: 'test prompt', modelCandidates: ['body-timeout', 'bad-json', 'echo-secret'], timeoutMs: 10,
    logger: { log() {}, error(...args) { logs.push(args.join(' ')); } },
    fetchImpl: async () => {
      request++;
      if (request === 1) return { ok: true, json() { return new Promise(() => {}); } };
      if (request === 2) return { ok: true, json() { throw new Error(`Invalid JSON Bearer ${key}`); } };
      return { ok: false, status: 429, async text() { return JSON.stringify({ error: { message: `invalid key ${key}` } }); } };
    },
  }), error => {
    assert.doesNotMatch(error.message, new RegExp(key));
    assert.equal(error.attempts.length, 3);
    assert.match(error.attempts[0].error, /超时/);
    return true;
  });
  assert.doesNotMatch(logs.join('\n'), new RegExp(key));
});

test('unclosed thinking, absent choices and exposed credentials are never published', async () => {
  const responses = ['<think>reasoning still going', undefined, `${validSummary}\n- private-secret-key`];
  for (const content of responses) {
    await assert.rejects(requestModelScopeSummary({
      apiKey: 'private-secret-key', prompt: 'test prompt', modelCandidates: ['model'], logger: silentLogger,
      fetchImpl: async () => content === undefined ? { ok: true, async json() { return {}; } } : modelResponse(content),
    }), /所有候选模型均调用失败/);
  }
});

test('complete reasoning blocks and Markdown fences are removed; callback failure does not call another model', async () => {
  let calls = 0;
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'test prompt', modelCandidates: ['first', 'second'], logger: silentLogger,
    onResult() { throw new Error('metrics unavailable'); },
    fetchImpl: async () => { calls++; return modelResponse(`<think>internal reasoning</think>\n\`\`\`markdown\n${validSummary}\n\`\`\``); },
  });
  assert.equal(calls, 1);
  assert.equal(result.summary, validSummary);
});

test('model overrides are trimmed and deduplicated with safe defaults and invalid IDs rejected', () => {
  assert.deepEqual(resolveModelCandidates(' org/strong,org/backup, org/strong '), ['org/strong', 'org/backup']);
  assert.deepEqual(resolveModelCandidates([]), [...DEFAULT_MODEL_CANDIDATES]);
  assert.throws(() => resolveModelCandidates(['model\nAuthorization: secret']), /无效模型标识/);
  assert.ok(!DEFAULT_MODEL_CANDIDATES.includes('ZhipuAI/GLM-5'));
  assert.ok(!DEFAULT_MODEL_CANDIDATES.includes('Qwen/Qwen3.5-35B-A3B'));
});

function withReleaseRepository(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-baseline-'));
  const git = args => execFileSync('git', [
    '-c', 'user.name=Release regression', '-c', 'user.email=release-test@example.invalid',
    '-c', 'commit.gpgsign=false', ...args,
  ], {
    cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
  });
  const write = (file, content) => {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const commit = message => { git(['add', '.']); git(['commit', '-m', message]); return git(['rev-parse', 'HEAD']).trim(); };
  try {
    git(['init', '--initial-branch=main']);
    write('backend/componentupdate/scheduler.go', 'package componentupdate\nconst retryDelaySeconds = 0\n');
    commit('initial release baseline');
    run({ git, write, commit, directory });
  } finally {
    // Only the isolated directory created by this test is removed.
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('real squash-to-merge history does not republish existing branch features', () => {
  withReleaseRepository(({ git, write, commit }) => {
    git(['checkout', '-b', 'dev']);
    write('frontend/license/Medal.tsx', 'export const existingMedalFeature = "already released";\n');
    commit('feat: 新增荣誉勋章展示系统');
    write('frontend/connections/WebSocket.tsx', 'export const existingWebSocketFeature = "already released";\n');
    commit('feat: 新增 WebSocket 实时连接页面');
    git(['checkout', 'main']);
    git(['merge', '--squash', 'dev']);
    const previousCommit = commit('release: 1.2.5 squash');
    git(['checkout', 'dev']);
    write('backend/componentupdate/scheduler.go', 'package componentupdate\nconst retryDelaySeconds = 30\n');
    commit('fix: 组件更新失败后退避重试');
    git(['checkout', 'main']);
    git(['merge', '--no-ff', 'dev', '-m', 'Merge dev for 1.2.6', '-m', 'feat: 新增荣誉勋章展示系统\nfeat: 新增 WebSocket 实时连接页面']);
    const currentRef = git(['rev-parse', 'HEAD']).trim();
    const context = collectReleaseCommits({ previousCommit, currentRef, git });
    assert.equal(context.rawCommitCount, 4, 'graph includes two previously squashed feature commits, new fix and merge');
    assert.equal(context.commits.length, 1, 'only the first-parent release merge is modeled');
    assert.equal(context.coverage.excludedHistoricalCommits, 3);
    assert.equal(context.coverage.netChangedFiles, 1);
    assert.deepEqual(context.releaseBaseline.files.map(file => file.path), ['backend/componentupdate/scheduler.go']);
    assert.equal(context.commits.releaseBaseline, context.releaseBaseline);
    assert.equal(Object.keys(context.commits).includes('releaseBaseline'), false);
    const prompt = buildSummaryPrompt(context.commits);
    assert.ok(prompt.indexOf('权威版本净差异（最高优先级）') < prompt.indexOf('提交上下文（共'));
    assert.match(prompt, /\+const retryDelaySeconds = 30/);
    assert.equal((prompt.match(/\+const retryDelaySeconds = 30/gu) || []).length, 1, 'net code is not repeated per commit');
    assert.doesNotMatch(prompt, /existingMedalFeature|existingWebSocketFeature|新增荣誉勋章|新增 WebSocket/);
    assert.match(prompt, /重新合并当功能首次上线/);
    const fallback = buildFallbackSummary(context.commits);
    assert.doesNotMatch(fallback, /勋章|WebSocket|仅包含内部构建/);
    assert.match(fallback, /存在净变化/);
    assert.equal(validateSummary(fallback).valid, true);
    const clonedPrompt = buildSummaryPrompt([...context.commits], { releaseBaseline: context.releaseBaseline });
    assert.match(clonedPrompt, /authoritative_release_baseline/);
  });
});

test('re-merging a previously squashed branch with no net diff reports no new changes', () => {
  withReleaseRepository(({ git, write, commit }) => {
    git(['checkout', '-b', 'dev']);
    write('frontend/medal.tsx', 'export const medal = true;\n');
    commit('feat: 新增勋章展示功能');
    git(['checkout', 'main']);
    git(['merge', '--squash', 'dev']);
    const previousCommit = commit('release: squash completed features');
    git(['merge', '--no-ff', 'dev', '-m', 'Merge the same dev history']);
    const context = collectReleaseCommits({ previousCommit, currentRef: 'HEAD', git });
    assert.ok(context.rawCommitCount > 0);
    assert.equal(context.commits.length, 0);
    assert.equal(context.releaseBaseline.files.length, 0);
    assert.doesNotMatch(buildSummaryPrompt(context.commits), /新增勋章/);
    assert.match(buildFallbackSummary(context.commits), /没有可归纳/);
  });
});

test('first-parent changes outside the final net diff are excluded from AI and rule fallback', () => {
  withReleaseRepository(({ git, write, commit, directory }) => {
    const previousCommit = git(['rev-parse', 'HEAD']).trim();
    write('frontend/temporary-feature.tsx', 'export const temporaryFeature = true;\n');
    commit('feat: 新增已撤回的临时功能');
    fs.unlinkSync(path.join(directory, 'frontend/temporary-feature.tsx'));
    commit('revert: 撤回临时功能');
    write('backend/componentupdate/scheduler.go', 'package componentupdate\nconst retryDelaySeconds = 30\n');
    commit('fix: 组件更新失败后退避重试');
    const context = collectReleaseCommits({ previousCommit, currentRef: 'HEAD', git });
    assert.equal(context.rawCommitCount, 3);
    assert.equal(context.coverage.releaseLineCommits, 3);
    assert.equal(context.commits.length, 1);
    assert.doesNotMatch(buildSummaryPrompt(context.commits), /临时功能|temporaryFeature/);
    assert.doesNotMatch(buildFallbackSummary(context.commits), /临时功能/);
    assert.match(buildFallbackSummary(context.commits), /组件更新失败后退避重试/);
  });
});

test('failure to read the authoritative net diff stops collection instead of using old graph history', () => {
  assert.throws(() => readReleaseBaseline('1'.repeat(40), '2'.repeat(40), {
    git() { throw new Error('private diff command output'); },
  }), error => {
    assert.match(error.message, /停止生成/);
    assert.doesNotMatch(error.message, /private diff/);
    return true;
  });
});

test('ordinary Markdown thematic breaks do not invalidate otherwise complete release notes', () => {
  for (const separator of ['---', '***', '___', '- - -', '* * *', '_ _ _', '  ---  ']) {
    const input = `${validSummary}\n\n${separator}\n\n### 📌 升级提醒（Notes）\n- **适用范围**：以上修复针对容器网络配置校验`;
    const normalized = normalizeModelSummary(input);
    assert.equal(validateSummary(input).valid, true, separator);
    assert.equal(validateSummary(normalized).detailCount, 2, separator);
    assert.ok(normalized.includes('以上修复针对容器网络配置校验'));
    assert.equal(normalizeReleaseMarkdown(normalized), normalized, 'normalization is idempotent');
  }
});

test('plain-text lazy continuations remain part of the same release item without losing content', async () => {
  const input = '### 🐛 问题修复（Fixed）\n- **连接恢复**：修复网络切换后状态不能及时更新的问题\n网络恢复后，页面状态会继续更新。\n  已有条目的操作入口保持不变。';
  const expected = '### 🐛 问题修复（Fixed）\n- **连接恢复**：修复网络切换后状态不能及时更新的问题 网络恢复后，页面状态会继续更新。 已有条目的操作入口保持不变。';
  assert.equal(normalizeModelSummary(input), expected);
  assert.equal(validateSummary(input).valid, true);
  assert.equal(validateSummary(input).detailCount, 1);
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'test prompt', modelCandidates: ['model'], logger: silentLogger,
    fetchImpl: async () => modelResponse(input),
  });
  assert.equal(result.summary, expected);
});

test('format normalization does not absorb independent prose or hide invalid structures and claims', () => {
  for (const input of [
    validSummary + '\n\n下面是列表之外的独立解释。',
    validSummary + '\n---\n下面是分隔线之后的独立解释。',
    validSummary + '\n### 自创未知分类\n- 无法确定该分类的含义',
    validSummary + '\n```javascript\nconst rawSource = true;\n```',
    validSummary + '\n<div>不能执行或展示未经认可的 HTML</div>',
    validSummary + '\n这一调整可以彻底解决所有网络故障。',
  ]) assert.equal(validateSummary(normalizeModelSummary(input)).valid, false, input);
  const tooManyHighlights = '### 🎉 本次亮点（Highlights）\n'
    + Array.from({ length: 7 }, (_, index) => `- **独立亮点 ${index}**：描述对应的用户行为变化\n该项说明在同一条目中继续。`).join('\n')
    + '\n\n---\n\n' + validSummary;
  assert.match(validateSummary(normalizeModelSummary(tooManyHighlights)).errors.join(';'), /亮点超过 6 条/);
});

test('normalization retains nested-list boundaries and intentional Markdown hard line breaks', () => {
  const nested = `${validSummary}\n  - 子项：仅检查 macvlan 场景\n  - 子项：保留网段校验结果`;
  assert.equal(normalizeReleaseMarkdown(nested), nested);
  assert.equal(validateSummary(nested).detailCount, 1);
  const hardBreak = `${validSummary}  \n此行应保留显式换行。`;
  assert.ok(normalizeReleaseMarkdown(hardBreak).includes('  \n  此行应保留显式换行。'));
});

test('net evidence covers every non-CSS file with code, late behavioral hunks and all test names', () => {
  const source = Array.from({ length: 24 }, (_, index) =>
    `diff --git a/src/module${index}.ts b/src/module${index}.ts\n@@ -1 +1 @@\n-oldValue${index}\n+newValue${index}\n${'+// cosmetic padding\n'.repeat(80)}@@ -100 +100 @@\n-if (!ready) return\n+if (!ready || !canOperate${index}) return`,
  );
  source.push(
    'diff --git a/src/imageDates.ts b/src/imageDates.ts\n@@ -1 +1 @@\n+export function formatImageCreated(value) { return formatDate(Date.parse(value)) }',
    "diff --git a/src/Stack.tsx b/src/Stack.tsx\n@@ -1 +1 @@\n+const STACK_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/\n@@ -20 +20 @@\n+setName(name); setValidationResult(null); setValidatedYaml('')",
    "diff --git a/src/Template.test.tsx b/src/Template.test.tsx\n@@ -0,0 +1,200 @@\n+import mocks from './mocks'\n" + '+// test setup\n'.repeat(100)
      + "+it('deploys without requiring admin access', async () => {})\n+it('uses the numeric Docker CLI offset regardless of zone name', () => {})",
  );
  const styles = Array.from({ length: 60 }, (_, index) => `diff --git a/styles/${index}.css b/styles/${index}.css\n@@ -1 +1 @@\n+${'.box { display: grid; } '.repeat(80)}`);
  const evidence = buildNetDiffEvidence([...styles, ...source].join('\n'), 18000);
  assert.ok(evidence.diff.length <= 18000);
  assert.equal(evidence.sourceFileCount, 27);
  for (let index = 0; index < 24; index++) {
    assert.ok(evidence.diff.includes(`+newValue${index}`));
    assert.ok(evidence.diff.includes(`+if (!ready || !canOperate${index}) return`));
  }
  assert.match(evidence.diff, /\+export function formatImageCreated/);
  assert.match(evidence.diff, /\+const STACK_NAME_PATTERN/);
  assert.match(evidence.diff, /setValidationResult\(null\); setValidatedYaml\(''\)/);
  assert.match(evidence.diff, /deploys without requiring admin access/);
  assert.match(evidence.diff, /uses the numeric Docker CLI offset/);
});

test('review prompt keeps the authoritative evidence and treats a draft as material to correct', () => {
  const commits = [{ subject: 'fix: 修复模板权限校验', files: [{ path: 'src/Template.tsx' }] }];
  const baseline = {
    previousCommit: '1'.repeat(40), currentRef: '2'.repeat(40), files: commits[0].files,
    diff: 'diff --git a/src/Template.tsx b/src/Template.tsx\n@@ -1 +1 @@\n-if (!ready) return\n+if (!ready || !canOperate) return',
  };
  Object.defineProperty(commits, 'releaseBaseline', { value: baseline });
  const draft = '### 🎉 重磅功能\n- **全新视图**：新增此前已经存在的卡片与列表切换';
  const prompt = buildReviewPrompt(commits, draft);
  assert.ok(prompt.includes(baseline.diff));
  assert.ok(prompt.includes(JSON.stringify(draft)));
  assert.match(prompt, /草稿是待纠错数据，不是证据/);
  assert.match(prompt, /文档段落.*不能证明功能首次/);
  assert.match(prompt, /indirect 转为 direct 不是移除依赖/);
  assert.match(prompt, /不硬套 Major 或 Security/);
  assert.match(prompt, /时间\/时区处理、权限与角色边界、输入校验/);
  assert.match(prompt, /删除同义重复/);
  assert.ok(prompt.length <= 180000);
  assert.throws(() => buildReviewPrompt(commits, 'x'.repeat(180000)), /超过输入预算/);
});

const overstatedDraft = '### 🐛 问题修复（Fixed）\n- **网络修复**：彻底解决所有网络问题，内部草稿标记不应进入错误日志';

test('unverified claims get exactly one correction on the same model with original evidence and draft', async () => {
  const requests = [];
  const logs = [];
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'ORIGINAL_NET_DIFF_EVIDENCE', modelCandidates: ['strong', 'backup'],
    logger: { log() {}, error(...values) { logs.push(values.join(' ')); } },
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      requests.push(request);
      return modelResponse(requests.length === 1 ? overstatedDraft : validSummary);
    },
  });
  assert.deepEqual(requests.map(request => request.model), ['strong', 'strong']);
  assert.equal(result.modelName, 'strong');
  assert.deepEqual(result.attempts.map(attempt => attempt.status), ['failed', 'success']);
  const retry = requests[1].messages[1].content;
  assert.match(retry, /ORIGINAL_NET_DIFF_EVIDENCE/);
  assert.ok(retry.includes(JSON.stringify(overstatedDraft)));
  assert.match(retry, /不能删除真实功能/);
  assert.doesNotMatch(JSON.stringify(result.attempts) + logs.join('\n'), /内部草稿标记/);
  assert.equal(validateSummary(result.summary).valid, true);
});

test('a failed claim correction changes model instead of retrying the same model indefinitely', async () => {
  const requested = [];
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'evidence', modelCandidates: ['strong', 'backup'], logger: silentLogger,
    fetchImpl: async (_url, options) => {
      const model = JSON.parse(options.body).model;
      requested.push(model);
      return modelResponse(model === 'strong' ? overstatedDraft : validSummary);
    },
  });
  assert.deepEqual(requested, ['strong', 'strong', 'backup']);
  assert.equal(result.modelName, 'backup');
  assert.equal(result.attempts.length, 3);
});

test('review callers can disable claim correction to guarantee one selected-model request', async () => {
  let calls = 0;
  await assert.rejects(requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'review evidence', modelCandidates: ['selected'], logger: silentLogger,
    allowClaimCorrection: false,
    fetchImpl: async () => { calls++; return modelResponse(overstatedDraft); },
  }), error => {
    assert.equal(error.attempts.length, 1);
    assert.doesNotMatch(JSON.stringify(error.attempts), /内部草稿标记/);
    return true;
  });
  assert.equal(calls, 1);
});

test('HTTP, truncated, malformed, incomplete-thinking and credential failures do not trigger same-model correction', async () => {
  for (const fail of [
    () => ({ ok: false, status: 429, async text() { return '{"error":{"message":"insufficient balance"}}'; } }),
    () => ({ ok: false, status: 400, async text() { return '{"error":{"message":"no provider supported"}}'; } }),
    () => modelResponse(overstatedDraft, 'length'),
    () => modelResponse(validSummary, 'content_filter'),
    () => ({ ok: true, async json() { return {}; } }),
    () => modelResponse('<think>incomplete reasoning'),
    () => modelResponse(`${validSummary}\n- test-token`),
  ]) {
    const requested = [];
    await requestModelScopeSummary({
      apiKey: 'test-token', prompt: 'evidence', modelCandidates: ['strong', 'backup'], logger: silentLogger,
      fetchImpl: async (_url, options) => {
        const model = JSON.parse(options.body).model;
        requested.push(model);
        return model === 'strong' ? fail() : modelResponse();
      },
    });
    assert.deepEqual(requested, ['strong', 'backup']);
  }
});

test('all safe validator failures get one same-model correction with fixed reasons and the complete draft', async () => {
  const drafts = [
    ['### 未知分类\n- 私有草稿标记：用户不能看到的调试内容', '未知发布分类'],
    [validSummary + '\n### 🐛 问题修复\n- 私有草稿标记：重复分类内的说明', '重复发布分类: fixed'],
    ['私有草稿标记：以下为更新日志\n' + validSummary, '分类之外出现非列表内容'],
    ['### 🐛 问题修复\n- 待补充', '发布条目为空、占位或缺少具体内容'],
    ['### 🐛 问题修复\n- **私有草稿标记：未闭合粗体', '发布条目的粗体标记未闭合'],
    ['', '模型返回空白内容'],
  ];
  for (const [draft, reason] of drafts) {
    const requests = [];
    const logs = [];
    const result = await requestModelScopeSummary({
      apiKey: 'test-token', prompt: 'ORIGINAL_NET_DIFF_EVIDENCE', modelCandidates: ['strong', 'backup'],
      logger: { log() {}, error(...args) { logs.push(args.join(' ')); } },
      fetchImpl: async (_url, options) => {
        const request = JSON.parse(options.body);
        requests.push(request);
        return modelResponse(requests.length === 1 ? draft : validSummary);
      },
    });
    assert.deepEqual(requests.map(request => request.model), ['strong', 'strong'], reason);
    assert.deepEqual(result.attempts.map(attempt => attempt.status), ['failed', 'success']);
    const correction = requests[1].messages[1].content;
    assert.ok(correction.includes('ORIGINAL_NET_DIFF_EVIDENCE'));
    assert.ok(correction.includes(JSON.stringify(draft)));
    assert.ok(correction.includes(reason));
    assert.match(correction, /重新输出完整成稿/);
    assert.doesNotMatch(JSON.stringify(result.attempts) + logs.join('\n'), /私有草稿标记/);
  }
});

test('an invalid format correction exhausts its single retry then changes model', async () => {
  const requested = [];
  const result = await requestModelScopeSummary({
    apiKey: 'test-token', prompt: 'evidence', modelCandidates: ['strong', 'backup'], logger: silentLogger,
    fetchImpl: async (_url, options) => {
      const model = JSON.parse(options.body).model;
      requested.push(model);
      return modelResponse(model === 'strong' ? '### 未知分类\n- 这是未通过校验的输出' : validSummary);
    },
  });
  assert.deepEqual(requested, ['strong', 'strong', 'backup']);
  assert.equal(result.modelName, 'backup');
});

test('output-correction option takes precedence while the legacy false option remains compatible', async () => {
  for (const [options, expectedCalls] of [
    [{ allowClaimCorrection: false }, 1],
    [{ allowOutputCorrection: false }, 1],
    [{ allowClaimCorrection: true, allowOutputCorrection: false }, 1],
    [{ allowClaimCorrection: false, allowOutputCorrection: true }, 2],
  ]) {
    let calls = 0;
    await assert.rejects(requestModelScopeSummary({
      apiKey: 'test-token', prompt: 'evidence', modelCandidates: ['selected'], logger: silentLogger, ...options,
      fetchImpl: async () => { calls++; return modelResponse('### 未知分类\n- 不能归类的详细说明'); },
    }), error => {
      assert.equal(error.attempts.length, expectedCalls);
      return true;
    });
    assert.equal(calls, expectedCalls);
  }
});

test('quantified performance claims require verification including byte sizes and throughput gains', () => {
  for (const [claim, verifiedClaim] of [
    ['每条日志减少2KB+堆栈开销', '2KB+'],
    ['日志不再输出2KB+', '2KB+'],
    ['移除每次失败时约 2 KB+ 的额外堆栈输出', '2 KB+'],
    ['内存占用降低64MB', '64MB'],
    ['节省1.5GB存储空间', '1.5GB'],
    ['吞吐提升2000QPS', '2000QPS'],
    ['吞吐增加500请求/秒', '500请求/秒'],
    ['每次响应耗时缩短20ms', '20ms'],
    ['日志输出减少3.5%', '减少3.5%'],
    ['每条日志输出约2KB+额外信息', '2KB+'],
  ]) {
    const draft = `### ⚡ 性能优化\n- **开销优化**：${claim}`;
    assert.ok(validateSummary(draft).errors.includes('包含未经单独验证的绝对化或量化宣传'), claim);
    assert.equal(validateSummary(draft, { verifiedClaims: [verifiedClaim] }).valid, true, claim);
    assert.equal(validateSummary(draft, { verifiedClaims: ['irrelevant claim'] }).valid, false, claim);
  }
});

test('display percentages and formatting boundaries are behavior, not quantified gains', () => {
  for (const section of ['✨ 功能增强', '⚡ 性能优化', '🐛 问题修复']) {
    for (const behavior of [
      '容器 CPU 没有采样时显示 —，不再显示 0%',
      '内存没有采样时不再显示 0%',
      'CPU 百分比显示格式调整为 0.0%',
      'CPU 不再限制在 0–100% 区间，按真实多核采样显示',
      '内存指标显示范围为 0–100%',
      '初始2分钟，最大1小时',
    ]) assert.equal(validateSummary(`### ${section}\n- **显示与行为修正**：${behavior}`).valid, true, behavior);
  }
  for (const behavior of ['日志不再输出2KB+', '性能面板显示内存占用减少64MB', 'CPU占用显示降低50%']) {
    assert.ok(validateSummary(`### 🐛 问题修复\n- **行为修正**：${behavior}`).errors.includes('包含未经单独验证的绝对化或量化宣传'), behavior);
  }
});

test('operational retry times, ports, versions and real behavior thresholds are not numeric promotion', () => {
  for (const behavior of [
    '组件更新失败后首次等待2分钟，指数退避最多1小时后重试',
    '将请求超时缩短为30秒，超时后返回明确错误',
    '默认监听端口改为8080，兼容1.4.1版本接口',
    'fd >= 1024时返回受控错误，避免访问越界',
    'Stack名称长度上限为63个字符，并校验首尾字符',
    'CPU告警阈值为80%，超过阈值时显示告警',
    '内存上限提高到512MB，超过限制时拒绝分配',
    '支持最大2GB文件，超过上限时提示重新选择',
  ]) {
    assert.equal(validateSummary(`### ✨ 功能增强\n- **行为调整**：${behavior}`).valid, true, behavior);
  }
});

test('side-branch explanations require every before/after file blob to exactly match the release net patch', () => {
  withReleaseRepository(({ git, write, commit }) => {
    write('backend/go.mod', 'module example\nreplace nftables => fork v1-old\n');
    commit('initial dependency baseline');
    git(['checkout', '-b', 'dev']);
    write('frontend/Medal.tsx', 'export const historicalMedal = true;\n');
    commit('feat: 新增旧版荣誉勋章');
    git(['checkout', 'main']);
    git(['merge', '--squash', 'dev']);
    const previousCommit = commit('release: previous squash');
    git(['checkout', 'dev']);
    write('backend/go.mod', 'module example\nreplace nftables => fork v2-fixed\n');
    const supportedCommit = commit('fix: 修复 nftables fd 越界崩溃\n\n升级 fork，修复 unix.FdSet.Set 越界写。\nfd >= 1024 时可能触发 nftables Flush panic。\n实测日志下降约 42%。\n吞吐改善 3.5%，未经核实应整行移除。');
    git(['checkout', 'main']);
    git(['merge', '--no-ff', 'dev', '-m', 'Merge dev']);
    const context = collectReleaseCommits({ previousCommit, currentRef: 'HEAD', git });
    assert.equal(context.commits.length, 1, 'side explanations do not expand the release-line count');
    assert.deepEqual(context.releaseBaseline.explanations.map(commit => commit.hash), [supportedCommit]);
    assert.equal(context.releaseBaseline.explanations[0].evidence, 'exact-release-net-file-states');
    const prompt = buildSummaryPrompt(context.commits);
    assert.match(prompt, /unix\.FdSet\.Set/);
    assert.match(prompt, /fd >= 1024/);
    assert.match(prompt, /nftables Flush panic/);
    assert.doesNotMatch(prompt, /historicalMedal|新增旧版荣誉勋章|42%|吞吐改善|3\.5|未经核实应整行移除/);
  });
});

test('path overlap and partially matching patches cannot reintroduce side-branch feature descriptions', () => {
  withReleaseRepository(({ git, write, commit }) => {
    git(['checkout', '-b', 'dev']);
    write('frontend/Medal.tsx', 'export const historicalMedal = true;\n');
    commit('feat: 新增旧版荣誉勋章');
    git(['checkout', 'main']);
    git(['merge', '--squash', 'dev']);
    const previousCommit = commit('release: previous squash');
    git(['checkout', 'dev']);
    write('backend/componentupdate/scheduler.go', 'package componentupdate\nconst retryDelaySeconds = 15\n');
    commit('feat: 不应直接采用的中间行为说明');
    write('backend/componentupdate/scheduler.go', 'package componentupdate\nconst retryDelaySeconds = 30\n');
    commit('fix: 路径相同但旧新 blob 不完全匹配的说明');
    git(['checkout', 'main']);
    git(['merge', '--no-ff', 'dev', '-m', 'Merge dev']);
    const context = collectReleaseCommits({ previousCommit, currentRef: 'HEAD', git });
    assert.equal(context.releaseBaseline.explanations.length, 0);
    const prompt = buildSummaryPrompt(context.commits);
    assert.match(prompt, /\+const retryDelaySeconds = 30/);
    assert.doesNotMatch(prompt, /中间行为说明|路径相同但旧新 blob|新增旧版荣誉勋章/);
  });
});
