'use strict';

const DEFAULT_PROMPT_CHAR_LIMIT = 180000;
const LARGE_PROMPT_CHAR_LIMIT = 260000;
const PROMPT_BUDGET_EXCEEDED = 'RELEASE_PROMPT_BUDGET_EXCEEDED';

function promptBudgetError(message, requiredChars, maxChars) {
  const error = new Error(message);
  error.code = PROMPT_BUDGET_EXCEEDED;
  error.requiredChars = requiredChars;
  error.maxChars = maxChars;
  return error;
}

// Retry only local prompt construction. No inference, evidence removal or
// unbounded context expansion happens here. Explicit caller limits stay strict.
function withPromptBudget(build, { maxPromptChars, largeContext = false } = {}) {
  const budget = maxPromptChars ?? (largeContext ? LARGE_PROMPT_CHAR_LIMIT : DEFAULT_PROMPT_CHAR_LIMIT);
  try {
    return build(budget);
  } catch (error) {
    if (maxPromptChars != null || budget >= LARGE_PROMPT_CHAR_LIMIT || error?.code !== PROMPT_BUDGET_EXCEEDED) {
      throw error;
    }
    return build(LARGE_PROMPT_CHAR_LIMIT);
  }
}

module.exports = { DEFAULT_PROMPT_CHAR_LIMIT, LARGE_PROMPT_CHAR_LIMIT, PROMPT_BUDGET_EXCEEDED, promptBudgetError, withPromptBudget };
