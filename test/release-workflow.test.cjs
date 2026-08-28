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

test('release workflows publish paired MSM and Edge runtimes', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')

    assert.match(source, /tar -czf "dist\/msm-\$\{VERSION\}-\$\{\{ matrix\.target \}\}\.tar\.gz" -C dist \\\n\s+msm \\\n\s+msm-edge/)
    assert.match(source, /cp "\$DIST_ROOT\/msm-edge" "\$SRC_TAURI_DIR\/msm-edge"/)
    assert.match(source, /BUNDLED_EDGE="\$APP_PATH\/Contents\/Resources\/msm-edge"/)
    assert.match(source, /DMG_BUNDLED_EDGE="\$APP_IN_DMG\/Contents\/Resources\/msm-edge"/)
  }
})
