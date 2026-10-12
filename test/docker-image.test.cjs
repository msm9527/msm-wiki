const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const workflows = [
  '.github/workflows/daily-build-msm.yml',
  '.github/workflows/daily-build-msm-beta.yml',
]

test('binary image contains the managed networking runtime', () => {
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile.binary'), 'utf8')

  assert.match(dockerfile, /apt-get install -y --no-install-recommends/)
  for (const dependency of [
    'bash',
    'iproute2',
    'iptables',
    'nftables',
    'procps',
    'wireguard-go',
    'wireguard-tools',
    'openresolv',
  ]) {
    assert.match(dockerfile, new RegExp(`\\n\\s+${dependency} \\\\`), `${dependency} must be installed`)
  }
  assert.match(dockerfile, /for command in bash ip sysctl iptables nft wg wg-quick wireguard-go/)
  assert.match(dockerfile, /MSM_DOCKER="1"/)
})

test('release image jobs enable QEMU before Buildx', () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const qemu = source.indexOf('uses: docker/setup-qemu-action@v3')
    const buildx = source.indexOf('uses: docker/setup-buildx-action@v3')

    assert.notEqual(qemu, -1, `${workflow} must configure QEMU`)
    assert.notEqual(buildx, -1, `${workflow} must configure Buildx`)
    assert.ok(qemu < buildx, `${workflow} must configure QEMU before Buildx`)
    assert.match(source, /file: \.\/Dockerfile\.binary/)
    assert.match(source, /platforms: linux\/amd64,linux\/arm64,linux\/arm\/v7/)
    assert.doesNotMatch(source, /platforms: [^\n]*linux\/arm\/v6/)
  }
})

// Compose and container exec use the Docker CLI inside the manager image.
test('release images include executable Docker CLI and Compose from the source pin', () => {
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile.binary'), 'utf8')
  assert.match(dockerfile, /FROM \$\{MSM_DOCKER_CLI_IMAGE\} AS docker-cli/)
  assert.match(dockerfile, /COPY --from=docker-cli \/usr\/local\/bin\/docker \/usr\/local\/bin\/docker/)
  assert.match(dockerfile, /COPY --from=docker-cli [^\n]*cli-plugins\/docker-compose/)
  assert.match(dockerfile, /RUN docker --version && docker compose version/)
  for (const workflow of workflows) {
    const source = fs.readFileSync(path.join(root, workflow), 'utf8')
    const docker = source.slice(source.indexOf('\n  docker:\n'), source.indexOf('\n  upload:\n'))
    assert.match(docker, /name: Checkout 镜像运行依赖的源版本[\s\S]*?ref: \$\{\{ needs\.prepare\.outputs\.commit_sha \}\}/)
    assert.match(docker, /MSM_DOCKER_CLI_IMAGE=\$\{\{ steps\.docker_cli\.outputs\.image/)
    assert.match(docker, /docker --version\n\s+docker compose version/)
  }
})
