const assert = require('node:assert/strict');
const test = require('node:test');
const summaryModule = require('../scripts/ai-release-summary.cjs');
const { generateReleaseSummary } = require('../scripts/generate-release-summary.cjs');
const { DEFAULT_PROMPT_CHAR_LIMIT, LARGE_PROMPT_CHAR_LIMIT, PROMPT_BUDGET_EXCEEDED, withPromptBudget } = require('../scripts/release-prompt-budget.cjs');

const publicSummary = '### 🐛 问题修复（Fixed）\n- **网络反馈**：修复设置保存后的状态提示。';

function largeRelease() {
  return Array.from({ length: 100 }, (_, index) => ({
    shortHash: `change-${index}`,
    subject: `fix: 修复独立问题 ${index}`,
    bodyHighlights: [`完整变更-${index}: ${'x'.repeat(2000)} 末项-${index}`],
    files: [{ path: `backend/module-${index}/service.go` }],
  }));
}

test('a 100-commit evidence index can expand without dropping any commit or change bullet', () => {
  const commits = largeRelease();
  const prompt = summaryModule.buildSummaryPrompt(commits);
  assert.ok(prompt.length > DEFAULT_PROMPT_CHAR_LIMIT);
  assert.ok(prompt.length <= LARGE_PROMPT_CHAR_LIMIT);
  for (let index = 0; index < commits.length; index++) {
    assert.ok(prompt.includes(commits[index].subject));
    assert.ok(prompt.includes(commits[index].bodyHighlights[0]));
    assert.ok(prompt.includes(commits[index].files[0].path));
  }
});

test('review keeps the complete oversized evidence index and draft in the same bounded budget', () => {
  const commits = largeRelease();
  const prompt = summaryModule.buildReviewPrompt(commits, publicSummary);
  assert.ok(prompt.length > DEFAULT_PROMPT_CHAR_LIMIT);
  assert.ok(prompt.length <= LARGE_PROMPT_CHAR_LIMIT);
  assert.ok(prompt.includes(JSON.stringify(publicSummary)));
  for (const commit of commits) {
    assert.ok(prompt.includes(commit.subject));
    assert.ok(prompt.includes(commit.bodyHighlights[0]));
  }
});

test('review can expand when the draft alone pushes a normal-size index over budget', () => {
  const commits = largeRelease().slice(0, 75);
  const draft = publicSummary + '\n' + '待审材料'.repeat(8000);
  const original = summaryModule.buildSummaryPrompt(commits);
  assert.ok(original.length < DEFAULT_PROMPT_CHAR_LIMIT);
  const reviewed = summaryModule.buildReviewPrompt(commits, draft);
  assert.ok(reviewed.length > DEFAULT_PROMPT_CHAR_LIMIT);
  assert.ok(reviewed.length <= LARGE_PROMPT_CHAR_LIMIT);
  assert.ok(reviewed.includes(JSON.stringify(draft)));
});

test('explicit summary and review limits are never expanded', () => {
  const commits = largeRelease();
  for (const build of [
    () => summaryModule.buildSummaryPrompt(commits, { maxPromptChars: DEFAULT_PROMPT_CHAR_LIMIT }),
    () => summaryModule.buildReviewPrompt(commits, publicSummary, { maxPromptChars: DEFAULT_PROMPT_CHAR_LIMIT }),
  ]) {
    assert.throws(build, error => error.code === PROMPT_BUDGET_EXCEEDED
      && error.maxChars <= DEFAULT_PROMPT_CHAR_LIMIT && error.requiredChars > error.maxChars);
  }
});

test('an index beyond the hard ceiling stays an explicit failure', () => {
  const commits = [{ subject: 'fix: 修复独立问题', bodyHighlights: ['完整私有证据'.repeat(60000)] }];
  assert.throws(() => summaryModule.buildSummaryPrompt(commits), error =>
    error.code === PROMPT_BUDGET_EXCEEDED && error.maxChars === LARGE_PROMPT_CHAR_LIMIT
      && error.requiredChars > LARGE_PROMPT_CHAR_LIMIT);
});

test('non-budget errors do not cause a local rebuild or an inference retry', () => {
  let calls = 0;
  const failure = new Error('unrelated failure');
  assert.throws(() => withPromptBudget(() => { calls++; throw failure; }), error => error === failure);
  assert.equal(calls, 1);
});

test('a budget failure reports the local cause without blaming the model or exposing evidence', async () => {
  const secret = 'unit-only-token-never-publish';
  const privateEvidence = 'PRIVATE_INPUT_DO_NOT_PUBLISH'.repeat(15000);
  const diagnostics = [];
  let jobSummary = '';
  let requests = 0;
  const result = await generateReleaseSummary({
    env: { AI_API_KEY: secret, AI_BASE_URL: 'https://example.invalid', AI_MODEL: 'test-model' },
    summaryModule: {
      ...summaryModule,
      collectReleaseCommits: () => ({ commits: [{ subject: 'fix: 修复独立问题', bodyHighlights: [privateEvidence] }], source: 'fallback-recent-commits' }),
      buildFallbackSummary: () => publicSummary,
    },
    fetchImpl: async () => { requests++; throw new Error('must not reach inference'); },
    core: {
      setOutput() {},
      info: message => diagnostics.push(message),
      warning: message => diagnostics.push(message),
      summary: { addRaw(text) { jobSummary += text; return this; }, async write() {} },
    },
  });
  assert.equal(requests, 0);
  assert.equal(result.status, 'fallback');
  assert.equal(result.fallbackReason, 'prompt-too-large');
  assert.equal(result.attemptCount, 0);
  assert.match(jobSummary, /变更上下文超过输入预算，尚未调用模型/u);
  assert.match(jobSummary, /请缩小发布范围或分批生成/u);
  assert.doesNotMatch(jobSummary, /请检查模型配置或账户额度/u);
  assert.ok(![jobSummary, ...diagnostics].some(text => text.includes(secret) || text.includes('PRIVATE_INPUT_DO_NOT_PUBLISH')));
});
