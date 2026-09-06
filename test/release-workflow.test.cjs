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

test('macOS desktop workflows isolate and retry DMG creation', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')

    assert.match(source, /DMG_WORK="\$\(mktemp -d\)"[\s\S]*?DMG_TEMP="\$DMG_WORK\/msm-desktop\.dmg"/)
    assert.match(source, /for attempt in 1 2 3; do[\s\S]*?hdiutil create[\s\S]*?"\$DMG_TEMP"[\s\S]*?done/)
    assert.match(source, /rm -f "\$OUTPUT_DMG"\n\s+mv "\$DMG_TEMP" "\$OUTPUT_DMG"/)
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

test('release workflows share the summary runner and defer model defaults to the core', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const summaryStep = source.slice(source.indexOf('      - name: 使用 AI 生成版本总结'), source.indexOf('\n  build:\n'))

    assert.match(summaryStep, /MODELSCOPE_MODELS: \$\{\{ vars\.MODELSCOPE_MODELS \|\| '' \}\}/)
    assert.match(summaryStep, /require\('\.\/msm-wiki\/scripts\/generate-release-summary\.cjs'\)/)
    assert.match(summaryStep, /await generateReleaseSummary\(\{ core \}\)/)
    assert.match(summaryStep, /RELEASE_CURRENT_REF: \$\{\{ steps\.meta\.outputs\.commit_sha \}\}/)
    assert.match(summaryStep, /RELEASE_PREVIOUS_COMMIT: \$\{\{ steps\.meta\.outputs\.previous_version_commit \}\}/)
    assert.doesNotMatch(summaryStep, /Qwen\/|requestModelScopeSummary|buildFallbackSummary|console\.(?:log|error)/)
    assert.doesNotMatch(summaryStep.slice(summaryStep.indexOf('script: |')), /\$\{\{/)
  }
})

test('all MSM build checkouts use the exact source commit selected during prepare', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const checkouts = [...source.matchAll(/repository: msm9527\/msm\n\s+ref: ([^\n]+)/g)]

    assert.equal(checkouts.length, 3, `${workflow}: prepare, server build and desktop build`)
    assert.match(checkouts[0][1], /^(?:main|dev)$/)
    for (const checkout of checkouts.slice(1)) {
      assert.equal(checkout[1], '${{ needs.prepare.outputs.commit_sha }}')
    }
    assert.doesNotMatch(source, /ref: \$\{\{ needs\.prepare\.outputs\.branch \}\}/)
  }
})

test('summary preview validates inputs and uses the same runner without publishing', () => {
  const source = fs.readFileSync(path.join(root, '.github/workflows/release-summary-preview.yml'), 'utf8')

  assert.match(source, /source_ref:[\s\S]*?default: dev/)
  assert.match(source, /previous_commit:/)
  assert.match(source, /channel:[\s\S]*?type: choice[\s\S]*?- beta[\s\S]*?- stable/)
  assert.match(source, /permissions:\n\s+contents: read/)
  assert.match(source, /validateReleaseSummaryInputs\(\{/)
  assert.ok(source.indexOf('validateReleaseSummaryInputs') < source.indexOf('repository: msm9527/msm'))
  assert.match(source, /ref: \$\{\{ steps\.inputs\.outputs\.source_ref \}\}/)
  assert.match(source, /token: \$\{\{ secrets\.MSM_REPO_TOKEN \}\}/)
  assert.match(source, /fetch-depth: 0\n\s+persist-credentials: false/)
  assert.match(source, /MODELSCOPE_MODELS: \$\{\{ vars\.MODELSCOPE_MODELS \|\| '' \}\}/)
  assert.match(source, /RELEASE_REQUIRE_EXACT_RANGE: 'true'/)
  assert.match(source, /await generateReleaseSummary\(\{[\s\S]*?cwd: path\.resolve\('msm-source'\)/)
  assert.match(source, /path: \|\n\s+release-summary-preview\/summary\.md\n\s+release-summary-preview\/metadata\.json\n/)
  assert.doesNotMatch(source, /contents: write|pages:|id-token:|schedule:|workflow_run:|softprops\/|deploy-pages|gh release|git push|go build|npm run docs:build/)
  assert.equal((source.match(/uses: actions\/upload-artifact@/g) || []).length, 1)
})
