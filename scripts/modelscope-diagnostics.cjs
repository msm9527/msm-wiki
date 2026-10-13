// Return fixed diagnostic labels only. Provider text can contain credentials or
// request echoes and must never be included in Actions logs or artifacts.
function providerFailureReason(value) {
  const message = String(value || '');
  if (/insufficient[_ -]?(?:balance|quota)|quota[_ -]?(?:exceeded|exhausted)|余额|配额|额度|daily.{0,20}limit|每日.{0,20}(?:上限|限制)/iu.test(message)) return 'quota-exhausted';
  if (/rate[_ -]?limit|too many requests|限流/iu.test(message)) return 'rate-limited';
  if (/invalid.{0,20}(?:token|key)|(?:token|key).{0,20}(?:invalid|expired)|authentication failed|无效.{0,12}(?:密钥|令牌)|(?:密钥|令牌).{0,12}过期/iu.test(message)) return 'invalid-token';
  if (/real.?name|实名认证|账号验证|account.{0,20}verif|verification.{0,20}required/iu.test(message)) return 'account-verification-required';
  if (/region.{0,20}(?:restrict|unavailable|unsupported)|地区.{0,12}(?:限制|不可用)|country.{0,20}(?:restrict|unsupported)/iu.test(message)) return 'regional-restriction';
  if (/no provider|model.{0,20}(?:not found|not supported)|unsupported.{0,20}model/iu.test(message)) return 'unsupported-model';
  if (/permission|access denied|not authorized|forbidden|未开通|无权限|没有权限|授权|用户协议|terms.{0,20}(?:accept|agree)/iu.test(message)) return 'access-denied';
  return 'unknown';
}

module.exports = { providerFailureReason };
