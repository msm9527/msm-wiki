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

    assert.match(source, /PACKAGE_FILES=\(msm\)/)
    assert.match(source, /tar -czf "dist\/msm-\$\{VERSION\}-\$\{\{ matrix\.target \}\}\.tar\.gz" -C dist "\$\{PACKAGE_FILES\[@\]\}"/)
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

test('release page publishing reads the latest renderer and uses conflict-safe single-file commits', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const publish = source.slice(source.indexOf('      - name: Checkout 最新 Wiki 发布脚本'), source.indexOf('\n  docker:'))
    assert.match(publish, /ref: main\n\s+path: wiki-publisher\n\s+persist-credentials: false/)
    assert.match(publish, /require\('\.\/wiki-publisher\/scripts\/publish-release-page\.cjs'\)/)
    assert.match(publish, /await publishReleasePage\(/)
    assert.match(publish, /releasesPath: '\$\{\{ needs\.prepare\.outputs\.release_notes_path \}\}'/)
    assert.match(publish, /result\.status === 'superseded'[\s\S]*?throw new Error/)
    assert.doesNotMatch(publish, /ANTHROPIC_API_KEY|continue-on-error/)
    assert.doesNotMatch(source, /git pull --rebase|git push;|git add "\$\{\{ needs\.prepare\.outputs\.release_notes_path/)
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

test('OpenWrt packaging is mandatory and reuses each selected static Linux build', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const openwrt = source.slice(source.indexOf('\n  openwrt:\n'), source.indexOf('\n  release:\n'))
    const release = source.slice(source.indexOf('\n  release:\n'), source.indexOf('\n  docker:\n'))

    assert.match(openwrt, /needs: \[prepare, build\]/)
    assert.match(openwrt, /target: \[linux-amd64, linux-arm64, linux-armv7, linux-armv6\]/)
    assert.match(openwrt, /name: msm-\$\{\{ needs\.prepare\.outputs\.version \}\}-\$\{\{ matrix\.target \}\}/)
    assert.match(openwrt, /python3 \.github\/openwrt\/build-packages\.py[\s\S]*?--format all/)
    assert.match(openwrt, /dist\/openwrt\/\*\.ipk\n\s+dist\/openwrt\/\*\.apk/)
    assert.match(openwrt, /if-no-files-found: error/)
    assert.doesNotMatch(openwrt, /continue-on-error|if-no-files-found: ignore/)
    assert.match(release, /needs: \[prepare, build, openwrt\]/)
    assert.match(release, /\$\{\{ steps\.release_assets\.outputs\.openwrt_section \}\}/)
    assert.match(source, /CGO_ENABLED: \$\{\{ matrix\.goos == 'darwin' && '1' \|\| '0' \}\}/)
    assert.match(source, /if \[ -f \.\.\/scripts\/prepare-embedded-frontend\.sh \]; then\n\s+bash \.\.\/scripts\/prepare-embedded-frontend\.sh\n\s+else/)
  }
})

function workflowShellStep(source, name) {
  const marker = `      - name: ${name}\n`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `missing step ${name}`)
  const remaining = source.slice(start + marker.length)
  const step = remaining.split(/\n      - name:|\n  [a-z]/, 1)[0]
  const run = step.split('        run: |\n')[1]
  assert.ok(run, `missing run script in ${name}`)
  return run.replace(/^          /gm, '')
}

function withReleaseFixture(workflow, callback) {
  const os = require('node:os')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-openwrt-'))
  const version = workflow.includes('-beta') ? 'beta-1.5.0' : '1.5.0'
  const apkVersion = workflow.includes('-beta') ? '1.5.0_beta' : '1.5.0'
  const ipkVersion = workflow.includes('-beta') ? '1.5.0_beta' : '1.5.0'
  const names = [
    `msm-${version}-linux-amd64.tar.gz`,
    `msm-${version}-linux-arm64.tar.gz`,
    `msm-${version}-linux-amd64-panabit.apx`,
    `msm_${ipkVersion}-r1_x86_64.ipk`,
    `msm-${apkVersion}-r1_x86_64.apk`,
    `msm_${ipkVersion}-r1_aarch64_generic.ipk`,
    `msm-${apkVersion}-r1_aarch64_generic.apk`,
    `luci-app-msm_${ipkVersion}-r1_all.ipk`,
    `luci-app-msm-${apkVersion}-r1_all.apk`,
  ]
  fs.mkdirSync(path.join(temp, 'dist', 'fixture'), { recursive: true })
  for (const name of names) fs.writeFileSync(path.join(temp, 'dist', 'fixture', name), `${name}\n`)
  fs.writeFileSync(path.join(temp, 'install_cn.sh'), '#!/bin/sh\n')
  fs.writeFileSync(path.join(temp, 'install_beta_cn.sh'), '#!/bin/sh\n')
  try {
    callback({ temp, version, names })
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
}

function runWorkflowScript(source, name, { temp, version, target = 'linux-amd64' }) {
  const { spawnSync } = require('node:child_process')
  // GitHub uses Bash 5 and GNU coreutils. Supply their small missing pieces on macOS.
  const compatibility = `
if [ "\${BASH_VERSINFO[0]}" -lt 4 ]; then
  mapfile() {
    local map_name="$2" map_value map_quoted map_index=0
    eval "$map_name=()"
    while IFS= read -r map_value; do
      printf -v map_quoted '%q' "$map_value"
      eval "$map_name[$map_index]=$map_quoted"
      map_index=$((map_index + 1))
    done
  }
fi
if ! command -v sha256sum >/dev/null 2>&1; then
  sha256sum() { shasum -a 256 "$@"; }
fi
`
  const script = workflowShellStep(source, name)
    .replaceAll('${{ needs.prepare.outputs.version }}', version)
    .replaceAll('${{ matrix.target }}', target)
  assert.doesNotMatch(script, /\$\{\{/)
  return spawnSync('bash', ['-c', compatibility + script], {
    cwd: temp,
    env: { ...process.env, GITHUB_OUTPUT: path.join(temp, 'step-output') },
    encoding: 'utf8',
  })
}

test('both release channels attach, checksum and mirror OpenWrt runtime and LuCI packages', () => {
  const { createHash } = require('node:crypto')
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    withReleaseFixture(workflow, (fixture) => {
      const collected = runWorkflowScript(source, '收集 Release 附件', fixture)
      assert.equal(collected.status, 0, collected.stderr)
      const outputs = fs.readFileSync(path.join(fixture.temp, 'step-output'), 'utf8')
      const checksums = fs.readFileSync(path.join(fixture.temp, 'dist', 'SHA256SUMS'), 'utf8')
      assert.match(outputs, /openwrt_section<<EOF/)
      assert.match(outputs, /OpenWrt IPK\/APK、LuCI 插件/)
      for (const name of fixture.names) {
        assert.ok(outputs.includes(`dist/fixture/${name}\n`), `missing attachment ${name}`)
        assert.ok(checksums.includes(`${createHash('sha256').update(`${name}\n`).digest('hex')}  ${name}\n`))
        if (/\.(?:ipk|apk)$/.test(name)) {
          assert.ok(outputs.includes(`/releases/download/${fixture.version}/${name}`), `missing download link ${name}`)
        }
      }
      const uploaded = runWorkflowScript(source, '准备上传文件', fixture)
      assert.equal(uploaded.status, 0, uploaded.stderr)
      assert.deepEqual(fs.readdirSync(path.join(fixture.temp, 'upload', fixture.version)).sort(),
        [...fixture.names, 'SHA256SUMS'].sort())
      assert.equal(fs.readFileSync(path.join(fixture.temp, 'upload', fixture.version, 'SHA256SUMS'), 'utf8'), checksums)
    })
  }
})

test('release refuses a missing OpenWrt artifact and still lists OpenWrt when optional Panabit is absent', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    withReleaseFixture(workflow, (fixture) => {
      for (const name of fixture.names.filter((name) => name.endsWith('.apx'))) {
        fs.unlinkSync(path.join(fixture.temp, 'dist', 'fixture', name))
      }
      const withoutPanabit = runWorkflowScript(source, '收集 Release 附件', fixture)
      assert.equal(withoutPanabit.status, 0, withoutPanabit.stderr)
      const outputs = fs.readFileSync(path.join(fixture.temp, 'step-output'), 'utf8')
      assert.match(outputs, /openwrt_section<<EOF/)
      assert.match(outputs, /download_note=.*OpenWrt IPK\/APK、LuCI 插件/)
      for (const name of fixture.names.filter((name) => /\.(?:ipk|apk)$/.test(name))) {
        fs.unlinkSync(path.join(fixture.temp, 'dist', 'fixture', name))
      }
      const missingOpenwrt = runWorkflowScript(source, '收集 Release 附件', fixture)
      assert.notEqual(missingOpenwrt.status, 0)
      assert.match(missingOpenwrt.stderr, /缺少 OpenWrt 安装包/)
    })
  }
})

test('OpenWrt builds reject source revisions without a successful runtime compatibility check', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const guard = source.indexOf('      - name: 验证 OpenWrt 运行时兼容性')
    assert.ok(guard > source.indexOf('\n  build:\n'))
    assert.ok(guard < source.indexOf('      - name: 编译 MSM（发布加固版）'))
    assert.match(source.slice(guard, source.indexOf('      - name: Checkout 当前仓库（msm-wiki）用于派网 APX 模板')),
      /if: matrix\.target == 'linux-amd64' \|\| matrix\.target == 'linux-arm64' \|\| matrix\.target == 'linux-armv7' \|\| matrix\.target == 'linux-armv6'/)
    withReleaseFixture(workflow, (fixture) => {
      const missing = runWorkflowScript(source, '验证 OpenWrt 运行时兼容性', fixture)
      assert.notEqual(missing.status, 0)
      assert.match(missing.stderr, /源码缺少 OpenWrt 兼容性检查/)
      fs.mkdirSync(path.join(fixture.temp, 'scripts'))
      const guardScript = path.join(fixture.temp, 'scripts', 'check-openwrt-compatibility.sh')
      fs.writeFileSync(guardScript, '#!/bin/sh\nexit 14\n')
      assert.equal(runWorkflowScript(source, '验证 OpenWrt 运行时兼容性', fixture).status, 14)
      fs.writeFileSync(guardScript, '#!/bin/sh\nexit 0\n')
      assert.equal(runWorkflowScript(source, '验证 OpenWrt 运行时兼容性', fixture).status, 0)
    })
  }
})

test('CLI packaging supports pre-Caddy sources and requires complete notices for Caddy builds', () => {
  const { execFileSync } = require('node:child_process')
  const notices = new Map([
    ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
    ['docs/OSS_PROVENANCE.md', 'OSS_PROVENANCE.md'],
    ['licenses/CADDY-APACHE-2.0.txt', 'licenses/CADDY-APACHE-2.0.txt'],
  ])
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    for (const scenario of ['legacy', 'optional notice', 'caddy', 'caddy single-line', ...notices.keys()]) {
      withReleaseFixture(workflow, (fixture) => {
        fs.mkdirSync(path.join(fixture.temp, 'scripts'))
        fs.mkdirSync(path.join(fixture.temp, 'backend'))
        fs.writeFileSync(path.join(fixture.temp, 'scripts', 'build-release-msm.sh'), '#!/bin/sh\nprintf "MSM fixture\\n" > "$1"\n')
        fs.writeFileSync(path.join(fixture.temp, 'scripts', 'embed-executable-sha256.sh'), '#!/bin/sh\nexit 0\n')
        fs.writeFileSync(path.join(fixture.temp, 'scripts', 'verify-executable-sha256.sh'), '#!/bin/sh\ntest -s "$1"\n')
        const hasCaddy = scenario !== 'legacy' && scenario !== 'optional notice'
        fs.writeFileSync(path.join(fixture.temp, 'backend', 'go.mod'),
          `module msm\n${hasCaddy ? (scenario === 'caddy single-line' ? 'require github.com/caddyserver/caddy/v2 v2.11.4\n' : 'require (\n\tgithub.com/caddyserver/caddy/v2 v2.11.4\n)\n') : ''}`)
        const included = []
        for (const [notice, destination] of notices) {
          if (scenario === 'legacy' || scenario === notice) continue
          if (scenario === 'optional notice' && notice !== 'THIRD_PARTY_NOTICES.md') continue
          fs.mkdirSync(path.dirname(path.join(fixture.temp, notice)), { recursive: true })
          fs.writeFileSync(path.join(fixture.temp, notice), `${notice} original contents\n`)
          included.push(destination)
        }
        const packaged = runWorkflowScript(source, '编译 MSM（发布加固版）', fixture)
        if (notices.has(scenario)) {
          assert.notEqual(packaged.status, 0, `Caddy build must reject missing ${scenario}`)
          assert.ok(packaged.stderr.includes(`含 Caddy 的发布版本缺少开源声明: ${scenario}`), packaged.stderr)
          return
        }
        assert.equal(packaged.status, 0, `${scenario}: ${packaged.stderr}`)
        const archive = path.join(fixture.temp, 'dist', `msm-${fixture.version}-linux-amd64.tar.gz`)
        const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n')
        assert.deepEqual(entries, ['msm', ...included], `${workflow}: ${scenario}`)
        for (const [notice, destination] of notices) {
          if (!included.includes(destination)) continue
          assert.equal(execFileSync('tar', ['-xOzf', archive, destination], { encoding: 'utf8' }), `${notice} original contents\n`)
        }
      })
    }
  }
})

test('both release channels require real APK lifecycle checks in the amd64 OpenWrt job', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const openwrt = source.slice(source.indexOf('\n  openwrt:\n'), source.indexOf('\n  release:\n'))
    assert.match(openwrt, /name: Setup Node\.js for OpenWrt checks\n\s+if: matrix\.target == 'linux-amd64'\n\s+uses: actions\/setup-node@v4\n\s+with:\n\s+node-version: '22'/)
    assert.match(openwrt, /name: 验证真实 APK 安装、升级和卸载\n\s+if: matrix\.target == 'linux-amd64'\n\s+env:\n\s+MSM_TEST_APK: '1'\n\s+run: node --test test\/openwrt-package\*\.test\.cjs/)
    assert.ok(openwrt.indexOf('name: 验证真实 APK 安装、升级和卸载') < openwrt.indexOf('name: 上传 OpenWrt IPK / APK 产物'))
    assert.doesNotMatch(openwrt, /continue-on-error/)
  }
})

test('OpenWrt pull request checks are path-scoped, read-only and exercise real APK packages', () => {
  const source = fs.readFileSync(path.join(root, '.github/workflows/openwrt-check.yml'), 'utf8')
  assert.match(source, /pull_request:\n\s+paths:/)
  assert.match(source, /push:\n\s+branches: \[codex\/openwrt-packages\]\n\s+paths:/)
  const triggers = source.slice(source.indexOf('\non:\n'), source.indexOf('\npermissions:\n'))
  for (const watchedPath of [
    '.github/openwrt/**',
    '.github/workflows/openwrt-check.yml',
    ...workflows,
    'test/openwrt-package*.test.cjs',
    'test/release-workflow.test.cjs',
  ]) {
    assert.equal(triggers.split(`'${watchedPath}'`).length - 1, 2, `${watchedPath} must trigger pull requests and branch pushes`)
  }
  assert.match(source, /permissions:\n\s+contents: read/)
  assert.match(source, /persist-credentials: false/)
  assert.match(source, /node-version: '22'/)
  assert.match(source, /actionlint_1\.7\.12_linux_amd64\.tar\.gz/)
  assert.match(source, /sha256sum -c -/)
  assert.match(source, /MSM_TEST_APK: '1'\n\s+run: node --test test\/openwrt-package\*\.test\.cjs test\/release-workflow\.test\.cjs/)
  assert.doesNotMatch(source, /pull_request_target|secrets\.|contents: write|npm ci|continue-on-error|git push|gh release|upload-artifact|deploy-pages/)
})


test('forced releases update existing assets and fail if any attachment cannot be published', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    assert.match(source, /if \[ "\$\{FORCE_UPDATE\}" != "true" \]; then[\s\S]*?echo "skip=true"/)
    assert.match(source, /uses: ncipollo\/release-action@v1[\s\S]*?allowUpdates: true\n\s+replacesArtifacts: true\n\s+artifactErrorsFailBuild: true\n\s+artifacts: \$\{\{ steps\.release_assets\.outputs\.paths \}\}/)
    assert.doesNotMatch(source, /removeArtifacts: true|skipIfReleaseExists: true|updateOnlyUnreleased: true/)
  }
})
