const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const script = path.join(root, '.github/scripts/sync-installers.sh')

function fixture(callback) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-sync-installers-'))
  const target = path.join(temp, 'mirror')
  const bin = path.join(temp, 'bin')
  fs.mkdirSync(bin)
  for (const directory of [target, path.join(target, 'beta')]) {
    fs.mkdirSync(path.join(directory, '2.0.7'), { recursive: true })
    fs.writeFileSync(path.join(directory, '.version'), '2.0.7\n')
    fs.writeFileSync(path.join(directory, '2.0.7/msm.tar.gz'), 'existing binary\n')
    fs.writeFileSync(path.join(directory, 'install.sh'), 'old installer\n')
  }
  fs.writeFileSync(path.join(bin, 'sshpass'), `#!${process.execPath}
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const args = process.argv.slice(2)
if (args.shift() !== '-e' || !process.env.SSHPASS) process.exit(91)
const command = args.shift()
fs.appendFileSync(process.env.SYNC_TEST_LOG, JSON.stringify({ command, args }) + '\\n')
if (command === 'rsync') {
  const [source, remote] = args.slice(-2)
  const destination = remote.slice(remote.indexOf(':') + 1)
  fs.copyFileSync(source, destination)
  if (process.env.SYNC_TEST_CORRUPT) fs.appendFileSync(destination, 'corrupted')
} else if (command === 'ssh') {
  const result = spawnSync('bash', ['-c', args.at(-1)], {
    input: fs.readFileSync(0), encoding: 'utf8', env: process.env,
  })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exit(result.status ?? 92)
} else process.exit(93)
`, { mode: 0o755 })
  function run(channel, overrides = {}) {
    return spawnSync('bash', [script, ...(channel ? [channel] : [])], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        EXTRA_SERVERS: `mirror.example,tester,fixture-password,${target}/,2222`,
        SYNC_TEST_LOG: path.join(temp, 'calls'),
        ...overrides,
      },
      encoding: 'utf8',
    })
  }
  try { callback({ temp, target, run }) } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
}

for (const channel of [undefined, 'all', 'stable', 'beta']) {
  test(`independent installer sync maps ${channel || 'default all'} to the published channel paths`, () => {
    fixture(({ temp, target, run }) => {
      const result = run(channel)
      assert.equal(result.status, 0, result.stderr)
      for (const [name, relative, installer] of [
        ['stable', '', 'install_cn.sh'],
        ['beta', 'beta', 'install_beta_cn.sh'],
      ]) {
        const directory = path.join(target, relative)
        const selected = !channel || channel === 'all' || channel === name
        assert.equal(fs.readFileSync(path.join(directory, 'install.sh'), 'utf8'), selected
          ? fs.readFileSync(path.join(root, installer), 'utf8') : 'old installer\n')
        if (selected) assert.equal(fs.statSync(path.join(directory, 'install.sh')).mode & 0o777, 0o755)
        assert.equal(fs.readFileSync(path.join(directory, '.version'), 'utf8'), '2.0.7\n')
        assert.equal(fs.readFileSync(path.join(directory, '2.0.7/msm.tar.gz'), 'utf8'), 'existing binary\n')
        assert.deepEqual(fs.readdirSync(directory).sort(), ['.version', '2.0.7', ...(name === 'stable' ? ['beta'] : []), 'install.sh'])
      }
      const log = fs.readFileSync(path.join(temp, 'calls'), 'utf8')
      const copies = log.trim().split('\n').map(JSON.parse).filter((call) => call.command === 'rsync')
      assert.equal(copies.length, !channel || channel === 'all' ? 2 : 1)
      for (const copy of copies) {
        const [source, destination] = copy.args.slice(-2)
        const beta = path.basename(source) === 'install_beta_cn.sh'
        assert.equal(source, path.join(root, beta ? 'install_beta_cn.sh' : 'install_cn.sh'))
        const directory = beta ? path.join(target, 'beta') : target
        assert.ok(destination.startsWith(`tester@mirror.example:${directory}/.install.sh.sync-`))
        assert.ok(destination.endsWith(beta ? '-beta' : '-stable'))
        assert.ok(copy.args.includes('--protect-args'))
        assert.match(copy.args[copy.args.indexOf('-e') + 1], / -p 2222$/)
      }
      assert.doesNotMatch(log + result.stdout + result.stderr, /fixture-password/)
    })
  })
}

test('installer sync refuses an uninitialized mirror without modifying existing files', () => {
  fixture(({ target, run }) => {
    fs.unlinkSync(path.join(target, '.version'))
    const result = run('stable')
    assert.notEqual(result.status, 0)
    assert.equal(fs.readFileSync(path.join(target, 'install.sh'), 'utf8'), 'old installer\n')
  })
})


test('installer checksum failures retain the old installer and remove staged data', () => {
  fixture(({ target, run }) => {
    const result = run('stable', { SYNC_TEST_CORRUPT: '1' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /SHA256 mismatch/)
    assert.equal(fs.readFileSync(path.join(target, 'install.sh'), 'utf8'), 'old installer\n')
    assert.ok(fs.readdirSync(target).every((name) => !name.startsWith('.install.sh.sync-')))
  })
})

for (const [name, servers] of [
  ['missing deployment configuration', ''],
  ['filesystem root', 'mirror.example,tester,fixture-password,/,2222'],
  ['root with repeated separators', 'mirror.example,tester,fixture-password,////,2222'],
]) {
  test(`installer sync rejects ${name} before making remote calls`, () => {
    fixture(({ temp, target, run }) => {
      const result = run('stable', { EXTRA_SERVERS: servers })
      assert.notEqual(result.status, 0)
      assert.equal(fs.existsSync(path.join(temp, 'calls')), false)
      assert.equal(fs.readFileSync(path.join(target, 'install.sh'), 'utf8'), 'old installer\n')
      assert.doesNotMatch(result.stdout + result.stderr, /fixture-password/)
    })
  })
}
