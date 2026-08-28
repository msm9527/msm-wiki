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
