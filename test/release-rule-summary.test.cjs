const assert = require('node:assert/strict');
const test = require('node:test');
const { generateReleaseSummary } = require('../scripts/generate-release-summary.cjs');

test('rule mode publishes a marked summary without calling any model service even with credentials configured', async () => {
  const outputs = {};
  const warnings = [];
  let report = '';
  const core = {
    setOutput(name, value) { outputs[name] = value; },
    info() {},
    warning(value) { warnings.push(value); },
    summary: { addRaw(value) { report += value; return this; }, async write() {} },
  };
  const summary = '### 🐛 问题修复\n- 修复旧证书启动迁移。\n\n### 📌 升级提醒\n- 当前使用提交规则生成摘要，未经过 AI 归纳。';
  const result = await generateReleaseSummary({
    core,
    env: { RELEASE_SUMMARY_MODE: 'rules', MODELSCOPE_API_KEY: 'private-test-token' },
    fetchImpl() { assert.fail('rule mode must not make network requests'); },
    summaryModule: {
      collectReleaseCommits() { return { commits: [{}], source: 'previous-source-commit' }; },
      buildFallbackSummary() { return summary; },
      fetchModelScopeModels() { assert.fail('rule mode must not discover models'); },
      buildSummaryPrompt() { assert.fail('rule mode must not prepare AI prompts'); },
      requestModelScopeSummary() { assert.fail('rule mode must not request inference'); },
      buildReviewPrompt() { assert.fail('rule mode must not review with AI'); },
    },
  });
  assert.equal(result.status, 'rules');
  assert.equal(result.summary, summary);
  assert.equal(result.modelName, '');
  assert.equal(result.attemptCount, 0);
  assert.deepEqual(result.modelAttempts, []);
  assert.equal(result.fallbackReason, '');
  assert.deepEqual(warnings, []);
  assert.equal(outputs.status, 'rules');
  assert.match(report, /提交规则摘要（非 AI）/u);
  assert.doesNotMatch(report, /private-test-token/u);
});

test('a typo or conflicting AI gate stops before collecting data or making requests', async () => {
  for (const env of [
    { RELEASE_SUMMARY_MODE: 'typo' },
    { RELEASE_SUMMARY_MODE: 'rules', RELEASE_REQUIRE_AI: 'true' },
  ]) {
    await assert.rejects(generateReleaseSummary({
      env,
      summaryModule: { collectReleaseCommits() { assert.fail('invalid settings must stop first'); } },
    }), /RELEASE_SUMMARY_MODE|rules 模式/u);
  }
});

test('rule mode preserves the no-changes result when there are no new commits', async () => {
  const result = await generateReleaseSummary({
    env: { RELEASE_SUMMARY_MODE: 'rules' },
    summaryModule: {
      collectReleaseCommits() { return { commits: [], source: 'previous-source-commit' }; },
      buildFallbackSummary() { return '### 📌 升级提醒\n- 本次没有新增提交。'; },
    },
  });
  assert.equal(result.status, 'no-changes');
  assert.equal(result.attemptCount, 0);
});
