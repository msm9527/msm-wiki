# Docker 安装

MSM 提供多架构 Docker 镜像（`msmbox/msm`）。默认推荐 **Bridge + 显式端口映射**；确实需要直接接管宿主机网络或旁路由透明代理时，也可以使用 Linux Host 网络模式。

## 部署前准备

- Linux 主机和 Docker Engine / Compose v2
- 可用的 `/dev/net/tun`（需要透明代理或受管隧道时）
- 持久化数据目录（挂载至容器内 `/opt/msm`）
- 至少 32 个随机字符的 `JWT_SECRET`
- 仅开放实际需要的端口

```bash
openssl rand -base64 48
```

不要把生成结果提交到 Compose 文件或公开仓库，建议写入权限为 `0600` 的 `.env` 文件。

## Docker Compose（推荐）

以下为可直接使用的 `docker-compose.yml`（默认 Bridge 网络）：

```yaml
services:
  msm:
    image: ${MSM_IMAGE:-msmbox/msm:latest}
    container_name: msm
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - NET_RAW
    devices:
      - /dev/net/tun:/dev/net/tun
    sysctls:
      net.ipv4.ip_forward: "1"
      net.ipv6.conf.all.forwarding: "1"
      net.ipv6.conf.all.accept_ra: "2"
    ports:
      - "${MSM_WEB_PORT:-7777}:7777"
      - "53:53/udp"
      - "53:53/tcp"
      - "7890:7890"
      - "7891:7891"
      - "7892:7892"
    environment:
      JWT_SECRET: ${JWT_SECRET:?请先在 .env 中设置至少 32 位随机 JWT_SECRET}
      MSM_CONFIG_DIR: /opt/msm
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - ${MSM_DATA_DIR:-./data}:/opt/msm
      # 如需通过本机 Docker 管理宿主机容器，按需取消下方注释（仅在可信环境使用）：
      # - /var/run/docker.sock:/var/run/docker.sock
```

创建 `.env`（生产环境推荐固定不可变版本标签，如 `msmbox/msm:2.2.8`）：

```dotenv
MSM_IMAGE=msmbox/msm:2.2.8
JWT_SECRET=替换为至少32个随机字符
MSM_DATA_DIR=./data
MSM_WEB_PORT=7777
TZ=Asia/Shanghai
```

启动并确认状态：

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 msm
```

访问 `http://<宿主机地址>:7777`。Beta 测试可使用 `msmbox/msm:beta-latest` 或 `msmbox/msm:beta-<版本>`，生产环境建议固定版本号或镜像摘要。

### 最小 Docker Run 示例

```bash
docker run -d \
  --name msm \
  --restart unless-stopped \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --device /dev/net/tun:/dev/net/tun \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  --sysctl net.ipv6.conf.all.accept_ra=2 \
  -p 7777:7777 \
  -p 53:53/udp \
  -p 53:53/tcp \
  -p 7890:7890 \
  -p 7891:7891 \
  -p 7892:7892 \
  -e JWT_SECRET='替换为至少32个随机字符' \
  -e MSM_CONFIG_DIR=/opt/msm \
  -e TZ=Asia/Shanghai \
  -v /opt/msm:/opt/msm \
  msmbox/msm:latest
```

`NET_ADMIN`、`NET_RAW` 与 `/dev/net/tun` 用于透明代理、网络诊断和受管隧道，仅作用于容器网络命名空间。不要为了省事默认授予 `--privileged`；只有明确知道某项宿主网络能力需要更高权限时再单独评估。

::: tip 远程纳管多台 Docker 主机
如果需要把其他服务器或 NAS 上的 Docker 接入 MSM 统一管理，目标主机无需安装完整 MSM，只需部署轻量独立镜像 **`msmbox/msm-agent`**。详见 [Docker 管理 → 独立 Agent 子节点](/zh/guide/docker-center#独立-agent-子节点)。
:::

## Bridge 与 Host 网络

### Bridge（默认）

Bridge 适合大多数部署，端口暴露清晰，也便于限制访问来源。需要注意：

- 容器中的 `127.0.0.1` 只指向容器自身。
- Edge 反向代理或 Cloudflare Tunnel 发布宿主机 / LAN 服务时，应填写容器实际可达的宿主机地址、LAN IP 或同网络服务名。
- MSM 无法自动读取宿主机 LAN 接口时，可用 `MSM_HOST_LAN_HINTS`、`MSM_HOST_LAN_CIDRS` 和 `MSM_HOST_PUBLIC_IP` 提供只读提示。
- 需要 DNS、代理、远程回家、Edge 反向代理或 L4 端口转发时，必须映射对应 TCP / UDP 端口。

### Host（可选，仅 Linux）

Host 模式直接使用宿主机网络命名空间，适合旁路由 DNS + 透明代理或必须管理宿主机网络的场景：

```yaml
services:
  msm:
    image: ${MSM_IMAGE:-msmbox/msm:latest}
    container_name: msm
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    devices:
      - /dev/net/tun:/dev/net/tun
    environment:
      JWT_SECRET: ${JWT_SECRET:?请先在 .env 中设置至少 32 位随机 JWT_SECRET}
      MSM_CONFIG_DIR: /opt/msm
      MSM_NETWORK_SCOPE: host
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - ${MSM_DATA_DIR:-./data}:/opt/msm
```

启用 `network_mode: host` 时必须删除 `ports:` 字段，并在宿主机防火墙中限制 `7777` 等管理端口的访问来源。

## 端口与监听

| 默认端口 | 协议 | 用途 |
|---------|------|------|
| `7777` | TCP | Web 管理界面（HTTP / 启用 HTTPS 时同时用于 HTTPS） |
| `7778` | TCP | HTTP 跳转 HTTPS 辅助端口（仅在开启 HTTPS 重定向时监听） |
| `53` | UDP / TCP | MosDNS（按实际配置映射） |
| `1053` | UDP / TCP | DNS 备用监听端口 |
| `7890` / `7891` / `7892` | TCP | HTTP / SOCKS5 / 混合代理端口 |
| `80` / `443` 或自定义 | TCP | Edge 反向代理与 ACME 验证（仅在启用对应路由后监听） |
| `31303` 起 | TCP / UDP | 远程回家监听器（按所选协议与端口映射） |

映射端口不会让 MSM 自动监听。Edge 默认不主动占用 `80` / `443`；只有创建并启用使用该端口的反向代理路由后，内置网关引擎才监听对应端口。

## 数据持久化

至少持久化 `/opt/msm`，其中包含 SQLite 数据库、核心配置、已安装组件、证书和运行状态：

```bash
-v /path/on/host:/opt/msm
```

不要把 `JWT_SECRET`、DNS 凭据、Cloudflare Token、证书私钥或代理订阅直接写入镜像层。备份前确认后台任务已结束，恢复时使用相同或兼容版本。

## 更新镜像

Docker 部署不支持在 Web 页面内自更新 MSM 主二进制，请通过拉取新镜像并重建容器完成升级：

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 msm
```

如使用固定版本号，先更新 `.env` 中的 `MSM_IMAGE`，再执行上述命令。数据卷已持久化时重建不会丢失配置；MosDNS、Clash、Sing-Box 等组件仍可在 Web 端按需管理。

## 常见问题

### 53 端口被占用

先查明宿主机上的占用者（常见为 `systemd-resolved` 或 `dnsmasq`），不要盲目停用系统 DNS：

```bash
ss -lntup | grep ':53 '
```

可将宿主端口映射为其他值，或确认网络恢复方案后再调整占用服务。

### 容器能启动，但透明代理或 TUN 不工作

确认 `/dev/net/tun` 存在、容器具有 `NET_ADMIN` / `NET_RAW`，并检查内核 IPv4/IPv6 转发参数与容器日志。部分受限虚拟化环境（如无特权 LXC）需要在宿主机放行 TUN 与 nftables 能力。

### 反向代理或 Cloudflare 访问不到宿主机服务

在容器内直接测试源站连通性。Bridge 模式不要使用 `127.0.0.1` 指代宿主机，应使用宿主机局域网 IP、Docker 网桥网关或同网络容器名。

### Web 页面提示 Docker 部署不支持自更新

这是容器部署的安全设计，用于避免容器重建后二进制回退。更新 `.env` 镜像标签并执行 `docker compose up -d` 即可。

## 支持的架构

MSM 官方多架构镜像（`msmbox/msm` 与 `msmbox/msm-agent`）当前支持：

- `linux/amd64`
- `linux/arm64`
- `linux/arm/v7`

Docker 会按宿主架构自动选择匹配清单。`arm/v6`、老旧 MIPS 或 32 位 x86 设备请使用 [Linux 安装](/zh/guide/install-linux) 或 [OpenWrt 安装](/zh/guide/install-openwrt) 提供的静态二进制或软件包。

## 下一步

- [首次使用](/zh/guide/first-use)
- [Docker 管理](/zh/guide/docker-center)
- [系统更新](/zh/guide/update)
- [故障排查](/zh/faq/troubleshooting)
