const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

function shellStep(source, name) {
  const marker = `      - name: ${name}\n`
  assert.ok(source.includes(marker), `missing step ${name}`)
  const step = source.split(marker)[1].split(/\n      - name:|\n  [a-z]/, 1)[0]
  const script = step.split('        run: |\n')[1]
  assert.ok(script, `missing script for ${name}`)
  return script.replace(/^          /gm, '')
}

for (const [workflow, channel, installer] of [
  ['daily-build-msm.yml', 'stable', 'install_cn.sh'],
  ['daily-build-msm-beta.yml', 'beta', 'install_beta_cn.sh'],
]) {
  test(`${channel} mirror publishes the current domestic installer at the channel root`, () => {
    const source = fs.readFileSync(path.join(root, '.github/workflows', workflow), 'utf8')
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-installer-publish-'))
    const version = channel === 'beta' ? 'beta-2.0.7' : '2.0.7'
    const replacements = {
      'needs.prepare.outputs.version': version,
      'needs.prepare.outputs.channel': channel,
      'needs.prepare.outputs.docker_channel_tag': channel,
      'env.REMOTE_VERSION_RETENTION': '3',
    }
    function run(script) {
      script = script.replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
        assert.ok(Object.hasOwn(replacements, expression), `unexpected expression ${expression}`)
        return replacements[expression]
      })
      const result = spawnSync('bash', ['-c', script], {
        cwd: temp,
        env: { ...process.env, EXTRA_SERVERS: 'mirror.example,tester,fixture-password,/srv/downloads/,2222' },
        encoding: 'utf8',
      })
      assert.equal(result.status, 0, result.stderr)
    }
    try {
      fs.mkdirSync(path.join(temp, 'dist'))
      fs.writeFileSync(path.join(temp, 'dist', 'SHA256SUMS'), 'fixture checksum\n')
      for (const name of ['install_cn.sh', 'install_beta_cn.sh']) {
        fs.copyFileSync(path.join(root, name), path.join(temp, name))
      }
      run(shellStep(source, '准备上传文件'))
      assert.equal(fs.readFileSync(path.join(temp, 'upload/install.sh'), 'utf8'),
        fs.readFileSync(path.join(root, installer), 'utf8'))
      assert.equal(fs.statSync(path.join(temp, 'upload/install.sh')).mode & 0o777, 0o755)
      assert.equal(fs.readFileSync(path.join(temp, 'upload/.version'), 'utf8'), `${version}\n`)

      fs.mkdirSync(path.join(temp, '.github/scripts'), { recursive: true })
      fs.writeFileSync(path.join(temp, '.github/scripts/prune-remote-versions.sh'), '# mock remote pruning\n')
      run(`
set -euo pipefail
sshpass() {
  shift 2
  if [ "$1" = rsync ]; then
    shift
    printf '%s\\0' "$@" >> rsync-args
    printf '\\n' >> rsync-args
  fi
}
${shellStep(source, '传输到目标服务器')}`)
      const calls = fs.readFileSync(path.join(temp, 'rsync-args'), 'utf8').trimEnd().split('\n')
        .map((line) => line.split('\0').filter(Boolean))
      const target = `/srv/downloads${channel === 'beta' ? '/beta' : ''}`
      assert.equal(calls.length, 2)
      assert.deepEqual(calls[0].slice(-3), [
        'upload/.version', 'upload/install.sh', `tester@mirror.example:${target}/`,
      ])
      assert.deepEqual(calls[1].slice(-2), [
        `upload/${version}/`, `tester@mirror.example:${target}/${version}/`,
      ])
    } finally {
      fs.rmSync(temp, { recursive: true, force: true })
    }
  })
}
