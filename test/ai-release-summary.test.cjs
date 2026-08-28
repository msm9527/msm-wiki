const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFallbackSummary,
  buildGitLogArgs,
  extractCommitShas,
  buildSummaryPrompt,
  requestModelScopeSummary,
  selectDiffFiles,
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

  const highlights = prompt.match(/正文要点:\n([\s\S]*?)\n  正文:/)?.[1] || '';

  assert.match(highlights, /荣誉勋章展示系统/);
  assert.match(highlights, /真 3D/);
  assert.doesNotMatch(highlights, /记忆池容量/);
  assert.doesNotMatch(highlights, /WebSocket 实时流/);
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
