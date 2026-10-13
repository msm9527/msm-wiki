const assert = require('node:assert/strict');
const test = require('node:test');
const { requestModelScopeSummary } = require('../scripts/ai-release-summary.cjs');
const { publicModelAttempts } = require('../scripts/generate-release-summary.cjs');

test('real request errors retain HTTP status while public diagnostics omit provider bodies and credentials', async () => {
  const apiKey = ' \nprivate-modelscope-key\r\n';
  let requests = 0;
  let failure;
  try {
    await requestModelScopeSummary({
      apiKey,
      prompt: 'Generate a release summary for the test fixture.',
      modelCandidates: ['Strong/Denied'],
      logger: { log() {}, error() {} },
      async fetchImpl(_url, options) {
        requests += 1;
        assert.equal(options.headers.Authorization, 'Bearer private-modelscope-key');
        return {
          ok: false,
          status: 401,
          async text() {
            return JSON.stringify({ error: { message: 'invalid API token private-modelscope-key PRIVATE_RESPONSE_BODY' } });
          },
        };
      },
    });
  } catch (error) {
    failure = error;
  }
  assert.equal(requests, 1);
  assert.ok(failure);
  assert.equal(failure.attempts[0].httpStatus, 401);
  const attempts = publicModelAttempts(failure.attempts, { MODELSCOPE_API_KEY: apiKey });
  assert.deepEqual(attempts, [{ model: 'Strong/Denied', status: 'failed', reasonCode: 'authentication-failed', httpStatus: 401 }]);
  assert.doesNotMatch(JSON.stringify(attempts), /private-modelscope-key|PRIVATE_RESPONSE_BODY|invalid API token/u);
});

test('public HTTP diagnostics reject strings, nonintegers, invalid ranges and credential-shaped model names', () => {
  const attempts = [401.5, 'PRIVATE_HTTP_STATUS', 0, -1, 399, 600, 999].map(httpStatus => ({
    model: 'Strong/private-key', status: 'failed', reasonCode: 'authentication-failed', httpStatus,
  }));
  for (const attempt of publicModelAttempts(attempts, { MODELSCOPE_API_KEY: ' \nprivate-key\n' })) {
    assert.deepEqual(attempt, { model: 'unknown-model', status: 'failed', reasonCode: 'authentication-failed' });
  }
});

test('whitespace-only credentials are rejected before sending an inference request', async () => {
  await assert.rejects(requestModelScopeSummary({
    apiKey: ' \r\n ',
    fetchImpl() { assert.fail('empty normalized credentials must not be sent'); },
  }), /未配置 MODELSCOPE_API_KEY/u);
});
