const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const repoRoot = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const purchaseUrl = 'https://ifdian.net/item/1a36bba4913411f19a295254001e7c00'

test('Pro documentation uses the same official purchase URL as the MSM client', () => {
  const commercial = read('docs/zh/legal/pro-and-support.md')
  const licenseGuide = read('docs/zh/guide/license.md')
  const siteConfig = read('docs/.vitepress/config.mts')
  const escapedPurchaseUrl = new RegExp(purchaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  assert.match(commercial, escapedPurchaseUrl)
  assert.match(licenseGuide, escapedPurchaseUrl)
  assert.match(siteConfig, escapedPurchaseUrl)
})

test('Pro purchase page stays concise and avoids unnecessary legal citations', () => {
  const commercial = read('docs/zh/legal/pro-and-support.md')

  assert.match(commercial, /购买 Pro/)
  assert.match(commercial, /激活授权/)
  assert.doesNotMatch(commercial, /电子商务法|网络交易监督管理办法|消费者权益保护法/)
  assert.doesNotMatch(commercial, /购买 Pro.*赞助.*不是一回事/)
})

test('public product boundaries state closed source and exclude network access sales', () => {
  const targets = [
    'docs/zh/index.md',
    'docs/zh/introduction/what-is-msm.md',
    'docs/zh/legal/index.md',
    'docs/zh/legal/pro-and-support.md',
  ].map(read).join('\n')

  assert.match(targets, /闭源/)
  assert.match(targets, /不提供节点、订阅|不包含代理节点、订阅/)
})

test('privacy documentation discloses current license telemetry categories', () => {
  const privacy = read('docs/zh/legal/privacy-security.md')

  assert.match(privacy, /默认心跳间隔为约 30 分钟/)
  assert.match(privacy, /机器码、硬件指纹、CPU 与 MAC 派生信息/)
  assert.match(privacy, /授权码、License Key/)
  assert.match(privacy, /风险等级、风险分值、原因、挑战和限制状态/)
})
