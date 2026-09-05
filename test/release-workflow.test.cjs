const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const workflows = [
  '.github/workflows/daily-build-msm.yml',
  '.github/workflows/daily-build-msm-beta.yml',
]

test('release workflows pass SHA256SUMS to the custom upload job', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const checksumArtifact = source.indexOf('name: msm-${{ needs.prepare.outputs.version }}-checksums')
    const uploadJob = source.indexOf('\n  upload:\n')

    assert.notEqual(checksumArtifact, -1, `${workflow} must upload the checksum artifact`)
    assert.notEqual(uploadJob, -1, `${workflow} must define the custom upload job`)
    assert.ok(checksumArtifact < uploadJob, `${workflow} must publish checksums before the upload job`)
    assert.match(source, /name: 上传 SHA256 清单供后续任务使用[\s\S]*?path: dist\/SHA256SUMS/)
    assert.match(source, /upload:[\s\S]*?needs: \[prepare, release\][\s\S]*?find dist -type f -name SHA256SUMS/)
  }
})

test('release workflows publish the merged single MSM runtime', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')

    assert.match(source, /tar -czf "dist\/msm-\$\{VERSION\}-\$\{\{ matrix\.target \}\}\.tar\.gz" -C dist \\\n\s+msm \\\n\s+THIRD_PARTY_NOTICES\.md/)
    assert.match(source, /tar -tzf "dist\/msm-\$\{VERSION\}-\$\{\{ matrix\.target \}\}\.tar\.gz" \| grep -Fx msm/)
    assert.match(source, /新版发布包不应再包含 msm-edge 可执行文件/)
    assert.doesNotMatch(source, /dist\/msm-edge|BUNDLED_EDGE|EDGE_ARCHS/)
  }
})

test('release workflows update tags through the GitHub API', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')

    assert.match(source, /name: 创建\/更新版本 tag[\s\S]*?GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/)
    assert.match(source, /gh api --method PATCH "repos\/\$\{GITHUB_REPOSITORY\}\/git\/refs\/tags\/\$\{VERSION\}"[\s\S]*?-F force=true/)
    assert.match(source, /gh api --method POST "repos\/\$\{GITHUB_REPOSITORY\}\/git\/refs"[\s\S]*?-f ref="refs\/tags\/\$\{VERSION\}"/)
    assert.doesNotMatch(source, /git push (?:--force )?origin "refs\/tags\/\$\{VERSION\}"/)
  }
})

test('Panabit packaging uses the merged single MSM runtime', () => {
  const builder = fs.readFileSync(path.join(root, '.github/panabit/build-apx.sh'), 'utf8')
  const afterInstall = fs.readFileSync(path.join(root, '.github/panabit/template/afterinstall'), 'utf8')

  assert.match(builder, /if \[\[ ! -f "\$\{PKG_DIR\}\/msm" \]\]/)
  assert.match(builder, /install -m 0755 "\$\{PKG_DIR\}\/msm" "\$\{STAGE_DIR\}\/bin\/msm"/)
  assert.doesNotMatch(builder, /msm-edge/)
  assert.doesNotMatch(afterInstall, /msm-edge/)
})

test('custom server uploads keep the mirror installer scripts synchronized', () => {
  const expectedInstallers = new Map([
    ['.github/workflows/daily-build-msm.yml', 'install_cn.sh'],
    ['.github/workflows/daily-build-msm-beta.yml', 'install_beta_cn.sh'],
  ])

  for (const [workflow, installer] of expectedInstallers) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')

    assert.ok(
      source.includes(`cp ${installer} upload/install.sh`),
      `${workflow} must upload ${installer} as the mirror install.sh`,
    )
    assert.match(source, /chmod 0755 upload\/install\.sh/)
  }
})

test('all Pages workflows run Wiki regression tests before building', () => {
  for (const workflow of [...workflows, '.github/workflows/deploy.yml']) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const regressionTests = source.indexOf('name: Run Wiki regression tests')
    const docsBuild = source.indexOf('name: Build with VitePress')

    assert.notEqual(regressionTests, -1, `${workflow} must run Wiki regression tests`)
    assert.notEqual(docsBuild, -1, `${workflow} must build the Wiki`)
    assert.ok(regressionTests < docsBuild, `${workflow} must test before building`)
  }
})
