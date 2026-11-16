const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { validateSummary, requestAiSummary } = require('../scripts/ai-release-summary.cjs');
const { loadReleaseBrief, publicModelAttempts } = require('../scripts/generate-release-summary.cjs');

test('known theme signatures reject renamed duplicates across different categories', () => {
  const summary = `### 🆕 新增功能
- **透明代理回包**：支持 UDP 经主路由回程。
### 🐛 问题修复
- **续传连接**：修复 UDP 空闲后回程失效。`;
  const result = validateSummary(summary, {
    requiredTopics: [{ name: 'UDP 对称回程', terms: ['udp', '回程'], unique: true }],
  });
  assert.match(result.errors.join(';'), /重复发布主题: UDP 对称回程/u);
  assert.equal(result.topicCoverage.covered, 1);
});

test('changing only the title cannot publish identical explanations twice', () => {
  const result = validateSummary(`### ✨ 功能增强
- **启动管理**：重启失败后自动重试反代启动，恢复原有转发服务。
### 🐛 问题修复
- **反代恢复**：重启失败后自动重试反代启动，恢复原有转发服务。`);
  assert.match(result.errors.join(';'), /重复说明/u);
});

test('similar but independent changes remain separate and multiline evidence counts', () => {
  const result = validateSummary(`### 🐛 问题修复
- **IPv4 路由**：修复客户端 IPv4 网段配置后没有及时更新路由的问题。
- **IPv6 路由**：修复客户端 IPv6 网段配置后没有及时更新路由的问题。
- **设备归并**：客户端按 MAC 识别。
  合并 IPv4 与 IPv6 地址，保留来源。`, {
    requiredTopics: [{ name: '双栈归并', terms: ['mac', 'ipv6', '合并'], unique: true }],
  });
  assert.equal(result.valid, true, result.errors.join(';'));
  assert.deepEqual(result.topicCoverage, { required: 1, covered: 1 });
});

test('new AI notes omit repeated highlights while historical notes stay readable', () => {
  const summary = `### 🎉 本次亮点
- **网关回程**：支持双栈回程并保护用户规则。
### 🆕 新增功能
- **主路由回程**：支持双栈回程并保护用户规则。`;
  assert.equal(validateSummary(summary).valid, true);
  assert.match(validateSummary(summary, { omitHighlights: true }).errors.join(';'), /重复概览/u);
});

test('2.2.2 stable brief covers earlier stable-to-stable changes, not only the latest beta', () => {
  const brief = loadReleaseBrief('fb9b5b375dd9f1ff8cf3c83ae96942e0049b11aa', 'HEAD',
    () => 'f7590789cbd495e7b76a5ded5a9d17b5b99da3b1');
  for (const topic of ['客户端双栈地址与详情', '精确与泛域名 DDNS', 'Hysteria2 端口跳跃',
    '三种仪表盘风格', 'macOS 私有组网安装', '经主路由对称回程']) {
    assert.ok(brief.requiredTopics.some(item => item.name === topic), topic);
  }
  assert.equal(new Set(brief.requiredTopics.map(topic => topic.name)).size, brief.requiredTopics.length);
  assert.equal(brief.evidence.length, brief.requiredTopics.length);
  for (const topic of brief.requiredTopics) {
    assert.equal(topic.unique, true);
    assert.equal(brief.topics.filter(item => item.includes(`**${topic.name}**`)).length, 1);
    const evidence = brief.evidence.find(item => item.topic === topic.name);
    assert.ok(evidence?.commits.length);
    assert.ok(evidence.commits.every(commit => /^[0-9a-f]{8}$/u.test(commit)));
  }
  assert.equal(validateSummary('### 🆕 新增功能\n- **本机回程规则**：只管理本机回程，不会自动修改主路由。', {
    forbiddenClaims: brief.forbiddenClaims,
  }).valid, true);
  const recentOnly = validateSummary('### 🆕 新增功能\n- **经主路由对称回程**：加入双栈回程。', {
    requiredTopics: brief.requiredTopics,
  });
  assert.match(recentOnly.errors.join(';'), /缺少重点主题: 精确与泛域名 DDNS/u);
  assert.match(recentOnly.errors.join(';'), /缺少重点主题: 客户端双栈地址与详情/u);
});

test('AI correction preserves evidence and repairs missing and repeated themes together', async () => {
  const drafts = [
    `### 🆕 新增功能
- **路由增强**：支持 UDP 对称回程。
### 🐛 问题修复
- **续传修复**：修复 UDP 对称回程超时。`,
    `### 🆕 新增功能
- **对称回程**：支持 UDP 回程，包含连接跟踪超时后的续传。
### 🐛 问题修复
- **客户端地址**：按 MAC 合并双栈地址。`,
  ];
  const requests = [];
  const result = await requestAiSummary({
    apiKey: 'test-key', baseUrl: 'https://example.invalid', wireApi: 'responses',
    prompt: 'IMMUTABLE_RELEASE_EVIDENCE', modelCandidates: ['selected'],
    omitHighlights: true,
    requiredTopics: [
      { name: '对称回程', terms: ['udp', '回程'], unique: true },
      { name: '双栈归并', terms: ['mac', '合并'], unique: true },
    ],
    logger: { log() {}, error() {} },
    fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ status: 'completed', output_text: drafts[requests.length - 1] }) };
    },
  });
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.model === 'selected' && request.input.includes('IMMUTABLE_RELEASE_EVIDENCE')));
  assert.match(requests[1].input, /重复发布主题: 对称回程/u);
  assert.match(requests[1].input, /缺少重点主题: 双栈归并/u);
  assert.equal(result.summary, drafts[1]);
  assert.deepEqual(publicModelAttempts(result.attempts, {})[0].checks, ['missing-topic', 'duplicate-topic']);
});

test('release history lookup authenticates, paginates and does not turn API errors into an empty history', () => {
  for (const file of ['daily-build-msm.yml', 'daily-build-msm-beta.yml']) {
    const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows', file), 'utf8');
    assert.match(workflow, /id: meta[\s\S]*?GH_TOKEN: \$\{\{ github.token \}\}/u);
    assert.match(workflow, /RELEASES_JSON="\$\(gh api --paginate/u);
    assert.doesNotMatch(workflow, /RELEASES_JSON=.*\|\| echo/u);
  }
});


test('stable fallback cannot silently substitute the shorter Beta update window', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/daily-build-msm.yml'), 'utf8');
  assert.doesNotMatch(workflow, /RELEASE_FALLBACK_SUMMARY_FILE|STABLE_FALLBACK_SUMMARY_FILE|BETA_BODY/u);
  assert.match(workflow, /RELEASE_PREVIOUS_COMMIT: \$\{\{ steps.meta.outputs.previous_version_commit \}\}/u);
});
