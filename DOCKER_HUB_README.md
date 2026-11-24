# MSM - 家庭网络统一管理平台

MSM 是面向家庭网络与自托管环境的统一管理平台，集成 MosDNS 分流、Clash / Sing-Box 透明代理、域名服务（DDNS / ACME 证书 / 反向代理 / L4 端口转发）、Cloudflare 穿透、自建私网（WireGuard / EasyTier / Tailscale）、Docker Center 与网络诊断工作台。

- **官方文档**: https://doc.msmbox.net/zh/
- **版本发布与下载**: https://github.com/msm9527/msm-wiki/releases
- **问题反馈**: https://github.com/msm9527/msm-wiki/issues

## 支持架构与镜像标签

| 镜像 | 支持平台 | 说明 |
| --- | --- | --- |
| `msmbox/msm` | `linux/amd64`、`linux/arm64`、`linux/arm/v7` | 主管理平台（Debian 13 运行基线，内置 Docker CLI、Compose 插件、nftables、WireGuard 与网络工具） |
| `msmbox/msm-agent` | `linux/amd64`、`linux/arm64`、`linux/arm/v7` | 独立轻量子节点 Agent（Alpine 3.23 基线，仅用于 Docker Center 远程节点管理） |

- `latest` / `<x.y.z>`：正式稳定版
- `beta-latest` / `beta-<x.y.z>`：Beta 预览版

> ARMv5 / ARMv6 设备请直接从 [Releases 页面](https://github.com/msm9527/msm-wiki/releases) 下载静态二进制或 OpenWrt 软件包。

## 快速开始

### 1. Host 网络模式（推荐，支持透明代理与 DNS 53 端口）

```bash
docker run -d \
  --name msm \
  --restart unless-stopped \
  --network host \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --device /dev/net/tun:/dev/net/tun \
  -e TZ=Asia/Shanghai \
  -v "$PWD/msm-data:/opt/msm" \
  -v "$PWD/msm-logs:/var/log/msm" \
  msmbox/msm:latest
```

### 2. Bridge 桥接模式（仅使用 Web 面板 / 域名反代 / Docker 管理等场景）

```bash
docker run -d \
  --name msm \
  --restart unless-stopped \
  -p 7777:7777 \
  -p 53:53/udp -p 53:53/tcp \
  -p 80:80 -p 443:443 \
  -e TZ=Asia/Shanghai \
  -v "$PWD/msm-data:/opt/msm" \
  -v "$PWD/msm-logs:/var/log/msm" \
  msmbox/msm:latest
```

## 常用端口与环境变量

| 端口 | 用途 |
| --- | --- |
| `7777` | MSM Web 管理界面（支持 HTTP 与 HTTPS） |
| `7778` | 可选 gRPC 接口 |
| `53` / `1053` | MosDNS 解析端口 |
| `7890` / `7891` / `7892` | 代理核心 HTTP / SOCKS5 / Mixed 端口 |
| `80` / `443` | Edge 内置网关 HTTP / HTTPS 入口 |

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MSM_PORT` | `7777` | 管理面板监听端口 |
| `MSM_CONFIG_DIR` | `/opt/msm` | 配置、数据库与受管组件数据目录 |
| `TZ` | `Asia/Shanghai` | 容器时区 |

更多 Compose 示例、Docker Socket 挂载权限与子节点 Agent 配置详见 [Docker 部署指南](https://doc.msmbox.net/zh/guide/docker) 与 [Docker 管理文档](https://doc.msmbox.net/zh/guide/docker-center)。
