# Docker 安装

MSM 提供多架构 Docker 镜像。默认推荐 **Bridge + 显式端口映射**；确实需要直接管理宿主机网络时，也可以使用 Linux Host 网络模式。

## 部署前准备

- Linux 主机和 Docker Engine / Compose v2
- 可用的 `/dev/net/tun`
- 持久化数据目录
- 至少 32 个随机字符的 `JWT_SECRET`
- 仅开放实际需要的端口

```bash
openssl rand -base64 48
```

不要把生成结果提交到 Compose 文件或公开仓库，建议写入权限受限的 `.env`。

## Docker Compose（推荐）

项目仓库中的 `docker-compose.yml` 默认使用 Bridge 网络，并提供完整的能力、TUN、转发参数和可配置端口。生产环境应固定不可变版本或镜像摘要：

```dotenv
MSM_IMAGE=msmbox/msm:1.3.0
JWT_SECRET=替换为至少32个随机字符
MSM_DATA_DIR=./data
MSM_WEB_PORT=7777
```

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 msm
```

访问 `http://<宿主机地址>:7777`。Beta 测试可临时使用 `msmbox/msm:beta-latest`，生产环境不要长期跟随可变标签。

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
  -p 1053:1053/udp \
  -p 7890:7890 \
  -p 7891:7891 \
  -p 7892:7892 \
  -e JWT_SECRET='替换为至少32个随机字符' \
  -e MSM_CONFIG_DIR=/opt/msm \
  -e TZ=Asia/Shanghai \
  -v /opt/msm:/opt/msm \
  msmbox/msm:1.3.0
```

`NET_ADMIN`、`NET_RAW` 与 TUN 用于透明代理、网络诊断和受管隧道。它们只作用于容器网络命名空间。不要为了省事默认授予 `--privileged`；只有明确知道某项宿主网络能力需要更高权限时再单独评估。

## Bridge 与 Host 网络

### Bridge（默认）

Bridge 适合大多数部署，端口暴露清晰，也便于限制访问来源。需要注意：

- 容器中的 `127.0.0.1` 只指向容器自身。
- Cloudflare Tunnel 发布宿主机或 LAN 服务时，应填写容器实际可达的宿主机地址、LAN IP 或同网络服务名。
- MSM 无法自动读取宿主机 LAN 接口时，可用 `MSM_HOST_LAN_HINTS`、`MSM_HOST_LAN_CIDRS` 和 `MSM_HOST_PUBLIC_IP` 提供只读提示。
- 需要 DNS、代理、远程回家或 Edge 自定义监听时，必须映射对应 TCP / UDP 端口。

### Host（可选，仅 Linux）

Host 模式直接使用宿主机网络命名空间，适合必须读取和管理宿主网络的场景：

```yaml
services:
  msm:
    network_mode: host
    environment:
      MSM_NETWORK_SCOPE: host
```

启用 `network_mode: host` 时删除 `ports:`，并在宿主机防火墙中限制管理端口。Host 模式会扩大网络权限和端口冲突范围，不是默认必选项。

## 端口与监听

| 默认端口 | 协议 | 用途 |
|---------|------|------|
| 7777 | TCP | Web 管理界面 |
| 53 | UDP/TCP | MosDNS（按实际配置映射） |
| 1053 | UDP/TCP | DNS 备用端口 |
| 7890 | TCP | HTTP 代理 |
| 7891 | TCP | SOCKS5 代理 |
| 7892 | TCP | 混合代理 |
| 31303 起 | TCP/UDP | 远程回家，按所选协议与监听器映射 |
| 自定义 | TCP | Edge 反向代理，按页面配置映射 |

映射端口不会让 MSM 自动监听。Edge 默认不主动占用 80/443；只有创建并启用使用该端口的反向代理路由后，受管运行时才监听对应端口。

## 数据持久化

至少持久化 `/opt/msm`，其中包含数据库、配置、组件和运行状态。备份前确认任务已结束，恢复时使用相同或兼容版本。

```bash
-v /path/on/host:/opt/msm
```

访问日志可按 Compose 示例单独挂载。不要把 JWT、DNS 凭据、Cloudflare Token、证书私钥或代理订阅复制进镜像层。

## 更新镜像

Docker 部署不允许在容器内自更新 MSM 主二进制。应更新镜像并重建容器：

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 msm
```

如使用不可变版本，先修改 `.env` 中 `MSM_IMAGE`，再执行上面的命令。数据目录已持久化时，重建不会丢失配置。MosDNS、Clash 和 Sing-Box 等组件仍可按页面能力管理，但升级前同样应备份。

## 常见问题

### 53 端口被占用

先查明宿主机上的占用者，不要直接停用系统 DNS：

```bash
ss -lntup | grep ':53 '
```

可将宿主端口映射为其他值，或只在确认网络恢复路径后调整占用服务。容器自身 DNS 与 MSM 管理的 MosDNS 监听不是同一概念。

### 容器能启动，但透明代理或 TUN 不工作

确认 `/dev/net/tun` 存在、容器具有 `NET_ADMIN` / `NET_RAW`，并检查内核转发和容器日志。部分受限虚拟化环境不允许创建 TUN 或修改 nftables。

### Cloudflare / 反向代理访问不到 LAN 源站

在容器内直接测试源站地址。Bridge 模式不要使用 `127.0.0.1` 指代宿主机；同时检查 VLAN、防火墙和源站监听地址。

### Web 页面提示不能更新 MSM

这是 Docker 部署的安全限制，不是故障。修改镜像版本并重建容器，避免容器重建后回退到旧二进制。

## 支持的架构

- `linux/amd64`
- `linux/arm64`
- `linux/arm/v7`
- `linux/arm/v6`
- `linux/386`

Docker 会按宿主架构选择清单中的镜像。正式部署前仍应核对发布资产与镜像标签是否包含目标平台。

## 下一步

- [Docker 管理](/zh/guide/docker-center)
- [系统更新](/zh/guide/update)
- [常见问题与排错](/zh/faq/troubleshooting)
