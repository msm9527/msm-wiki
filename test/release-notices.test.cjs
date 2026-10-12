const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const documents = ['THIRD_PARTY_NOTICES.md', 'OSS_PROVENANCE.md',
  'licenses/CADDY-APACHE-2.0.txt', 'licenses/GORM-MIT.txt']

function fixture(t, notices) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-notices-'))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  const payload = path.join(temp, 'payload')
  fs.mkdirSync(payload)
  fs.writeFileSync(path.join(payload, 'msm'), '#!/bin/sh\nprintf "MSM fixture\\n"\n', { mode: 0o755 })
  if (notices) {
    for (const name of documents) {
      fs.mkdirSync(path.dirname(path.join(payload, name)), { recursive: true })
      fs.writeFileSync(path.join(payload, name), `Original notice ${name}\n`)
    }
  }
  return { temp, payload }
}

test('APX packages preserve upstream notices and remain compatible with old archives', (t) => {
  for (const notices of [true, false]) {
    const { temp, payload } = fixture(t, notices)
    const archive = path.join(temp, 'release.tar.gz')
    const output = path.join(temp, 'release.apx')
    execFileSync('tar', ['-czf', archive, '-C', payload, 'msm', ...(notices ? documents : [])])
    execFileSync('bash', [path.join(root, '.github/panabit/build-apx.sh'), 'beta-2.0.6', 'linux-amd64', archive, output])
    assert.equal(execFileSync('tar', ['-xOzf', output, './bin/msm'], { encoding: 'utf8' }),
      fs.readFileSync(path.join(payload, 'msm'), 'utf8'))
    if (notices) {
      for (const name of documents) {
        assert.equal(execFileSync('tar', ['-xOzf', output, `./share/doc/msm/${name}`], { encoding: 'utf8' }),
          fs.readFileSync(path.join(payload, name), 'utf8'))
      }
    }
  }
})

test('binary image installation preserves packaged notices and its executable', (t) => {
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile.binary'), 'utf8')
  assert.match(dockerfile, /COPY binaries\/\$\{TARGETPLATFORM\}\/ \/tmp\/msm-release\//)
  const install = dockerfile.match(/RUN set -eu; \\\n\s+install -m 0755 \/tmp\/msm-release\/msm [\s\S]*?(?=\n\n)/)[0]
    .replace(/^RUN /, '').replaceAll('\\\n', '\n')
  for (const notices of [true, false]) {
    const { temp, payload } = fixture(t, notices)
    const executable = path.join(temp, 'installed-msm')
    const docDir = path.join(temp, 'installed-documents')
    execFileSync('bash', ['-c', install.replaceAll('/tmp/msm-release', payload)
      .replaceAll('/usr/local/bin/msm', executable).replaceAll('/usr/share/doc/msm', docDir)])
    assert.equal(execFileSync(executable, { encoding: 'utf8' }), 'MSM fixture\n')
    if (notices) {
      for (const name of documents) {
        assert.equal(fs.readFileSync(path.join(docDir, name), 'utf8'), `Original notice ${name}\n`)
      }
    }
    assert.equal(fs.existsSync(payload), false)
  }
})
