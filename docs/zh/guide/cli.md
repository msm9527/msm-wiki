# CLI 命令参考

MSM 提供完整的命令行工具 `msm` 用于服务启停、子服务控制、在线升级、网络诊断、授权管理与系统服务托管；独立 Docker 子节点则由单独的 `msm-docker-agent` 命令提供。

## 基本用法

```bash
msm [命令] [参数] [选项]
```

::: tip 默认行为
直接运行不带子命令的 `msm` 等同于 `msm serve`。
:::

## 全局选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-c, --config <路径>` | 配置与数据目录路径（也可通过 `MSM_CONFIG_DIR` 设置） | `~/.msm` |
| `-p, --port <端口>` | HTTP/HTTPS Web 服务端口（也可通过 `MSM_PORT` 设置） | `7777` |
| `--help` / `--help-all` | 显示当前命令帮助 / 所有命令完整帮助 | - |
| `--version` | 显示当前版本号与构建信息 | - |

## 服务与子服务控制

| 命令 | 说明 |
|------|------|
| `msm serve [-p 端口] [-c 目录] [-d]` | 启动 MSM 主服务（`-d` 表示后台守护进程模式） |
| `msm init [-c 目录]` | 初始化 MSM 配置目录并生成默认配置 |
| `msm status` | 查看 MSM 主服务及各托管子服务（MosDNS、Clash、Sing-Box 等）运行状态 |
| `msm list` | 列出所有受管子服务及其编号与名称，便于配合 `start/stop/restart` 操作 |
| `msm start [编号\|服务名]` | 启动主服务或指定受管子服务（如 `msm start mosdns`） |
| `msm stop [编号\|服务名]` | 停止主服务或指定受管子服务 |
| `msm restart [编号\|服务名]` | 重启主服务或指定受管子服务 |
| `msm logs [服务名]` | 查看主服务或指定子服务日志（`mosdns` / `mihomo` / `singbox`） |
| `msm operation [请求 ID]` | 查询最近或指定请求 ID 的后台异步操作状态与详情 |

> 提示：命令参数中针对 Clash 的内部服务标识仍沿用 `mihomo`（例如 `msm logs mihomo`、`msm restart mihomo`）。

## 系统服务托管与 DNS 恢复

### `msm service install` / `uninstall`

将 MSM 注册为当前操作系统的托管服务，实现开机自启与自动拉起：

```bash
# 自动检测当前系统的服务管理器（systemd / launchd / openrc / procd）
sudo msm service install

# 显式指定服务管理器
sudo msm service install --manager systemd
sudo msm service install --manager openrc   # Alpine Linux
sudo msm service install --manager procd    # OpenWrt
sudo msm service install --manager launchd  # macOS

# 卸载系统服务注册
sudo msm service uninstall
```

### `msm service recover-dns`

当系统停用或卸载 MSM 后，若宿主机（特别是 Linux `systemd-resolved` 或 OpenWrt `dnsmasq`）因 53 端口接管变更导致本机 DNS 解析异常，可执行此命令安全恢复宿主机 DNS：

```bash
sudo msm service recover-dns
```

## 在线更新与回滚（`msm update`）

除 Docker 容器部署外，二进制安装的 MSM 可直接通过命令行完成版本检查、下载、安装与回滚：

```bash
msm update status      # 查看当前版本与最近更新状态
msm update releases    # 列出可用发布版本
msm update check       # 检查是否有新版本
msm update download    # 仅下载并校验目标版本包
msm update install     # 下载并安装更新
msm update force       # 强制重装指定或最新版本
msm update cancel      # 取消正在进行的更新任务
msm update rollback    # 回滚至升级前保留的旧版本二进制
msm update config      # 查看或修改更新通道与镜像源设置
```

## 系统诊断与密码重置

### `msm doctor`

全面检测运行环境、关键端口占用、核心配置、网络连通性与权限状态，并输出修复建议：

```bash
msm doctor
```

### `msm reset-password`

忘记 Web 管理密码时，在 MSM 所在主机本地执行此命令重置管理员密码：

```bash
msm reset-password
```

## 网络诊断工具箱（`msm nettools`）

MSM 将 Web 端网络工具箱能力同样开放为 CLI 子命令，方便无浏览器环境或在 SSH 终端内快速排障：

```bash
# 连通性与路径
msm nettools ping <target>
msm nettools traceroute <target>
msm nettools mtr <target>
msm nettools portscan <target>

# DNS、HTTP 与证书
msm nettools dns <domain>
msm nettools http <url>
msm nettools ssl <host>
msm nettools whois <target>
msm nettools ipinfo [ip]

# 局域网与地址诊断
msm nettools interfaces
msm nettools arp
msm nettools ipv6
msm nettools nat
msm nettools subnet <cidr>
msm nettools wol <mac>

# 带宽与吞吐测速
msm nettools speedtest
msm nettools iperf <host>
```

## 授权管理（`msm license`）

```bash
msm license status                  # 查看当前 Pro 授权状态
msm license fingerprint             # 查看本机硬件指纹
msm license activate --code <授权码> # 使用授权码激活 Pro（省略 --code 时进入交互输入）
msm license deactivate              # 取消本机授权绑定
```

## 独立 Docker 子节点 CLI（`msm-docker-agent`）

部署在远端 Docker 主机上的轻量独立 Agent 使用专用命令 `msm-docker-agent`：

```bash
# 查看 Agent 版本
msm-docker-agent version

# 启动 Agent（主动回连模式，未指定 --listen 时默认仅绑定 127.0.0.1:7788）
msm-docker-agent serve \
  --data-dir /var/lib/msm-docker-agent \
  --controller-url https://msm.example.com \
  --node-name nas-docker \
  --enrollment-token-file /run/secrets/enrollment-token

# 启动 Agent（HTTPS 直连模式）
msm-docker-agent serve \
  --listen 0.0.0.0:7788 \
  --data-dir /var/lib/msm-docker-agent \
  --tls-cert /run/tls/agent.crt \
  --tls-key /run/tls/agent.key

# 生成直连模式一次性接入令牌（10 分钟有效，可选 --json）
msm-docker-agent token --data-dir /var/lib/msm-docker-agent

# 存活探针（自动忽略 HTTP_PROXY 代理环境变量）
msm-docker-agent healthcheck
```

## 常用环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 会话签名密钥（Docker 与生产环境建议至少 32 位随机字符） | 本机首次自动生成 |
| `MSM_CONFIG_DIR` | MSM 配置与数据目录 | `~/.msm` |
| `MSM_PORT` | Web 服务监听端口 | `7777` |
| `MSM_NETWORK_SCOPE` | 网络模式提示（Docker Host 模式设为 `host`） | 自动检测 |
| `MSM_DOCKER_ALLOW_INSECURE_NODE_HTTP` | 控制端显式允许与直连 Agent 使用明文 HTTP（仅隔离测试网） | `false` |

## 下一步

- [安装总览](/zh/guide/install)
- [系统诊断](/zh/guide/diagnostics)
- [Docker 管理](/zh/guide/docker-center)
- [故障排查](/zh/faq/troubleshooting)
