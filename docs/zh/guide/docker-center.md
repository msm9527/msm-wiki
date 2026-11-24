# Docker 管理

**Docker 管理**是 MSM 的容器运维工作台，支持统一管理本机 Docker 引擎以及多个独立 **Docker Agent 子节点**。所有资源页面均跟随顶部的「管理目标」切换，不同目标的数据与操作彼此隔离。

::: warning 仅管理已授权主机
连接 Docker Socket 或 Agent 往往等同于获得目标主机的高权限控制能力。请仅注册自有或已明确授权的节点，不得将 MSM 用于未授权容器、镜像、数据卷或主机的访问与操作。
:::

该模块属于 Pro 扩展能力，首次使用需在 **应用商店（`/apps`）** 安装并在 **系统设置 → 功能开关 → Docker 管理** 中开启。

页面顶部固定显示当前管理目标、引擎在线 / 离线状态、引擎版本和最近同步时间，并提供手动刷新与连接检测。目标概览与节点状态会自动轮询更新；执行删除、重启或文件修改等写操作前，请务必核对当前选中的管理目标。

当前主要工作区如下：

| 区域 | 路由 | 说明 |
|------|------|------|
| **容器** | `/docker/containers` | 默认入口；支持卡片/表格双视图、自定义图标、日志、终端、脚本与文件工作区 |
| **应用栈** | `/docker/stacks` | 从 YAML 或模板创建、校验、部署与管理 Compose 应用栈 |
| **镜像** | `/docker/images` | 拉取、搜索、导入导出、打标签、查看层详情与清理未使用镜像 |
| **存储卷** | `/docker/volumes` | 创建、查看挂载点与关联容器、清理未使用卷 |
| **网络** | `/docker/networks` | 管理 bridge / macvlan 等网络、子网池及容器连接关系 |
| **事件** | `/docker/events` | 按资源类型筛选查看 Docker 实时事件流 |
| **容器更新** | `/docker/updates` | 批量检查镜像新版本并执行安全升级（支持本机与独立 Agent 子节点） |
| **操作审计** | `/docker/operations` | 查看容器、应用栈、镜像等运维操作记录与结果（操作员/管理员） |
| **系统** | `/docker/system` | 查看 Engine 版本、OS/架构、存储驱动、磁盘占用并执行系统清理 |
| **节点** | `/docker/nodes` | 接入、监控、轮换凭据和管理独立 Agent 子节点 |

::: danger Docker 权限边界
能够操作 Docker 通常等同于能够控制目标主机上的容器工作负载。只向可信用户分配管理员和操作员角色，并妥善保护 Docker Socket、Agent 数据卷及 MSM 管理入口。
:::

## 用户角色

| 角色 | 能力 |
|------|------|
| **查看者（viewer）** | 查看容器、镜像、网络、存储卷、事件、系统信息与节点状态 |
| **操作员（operator）** | 执行常规容器 / 镜像 / 网络 / 存储 / 应用栈 / 更新操作，查看操作审计 |
| **管理员（admin）** | 节点注册、凭据轮换、删除节点、高风险系统清理等全部管理能力 |

前端会根据角色隐藏无权按钮，后端也会对每一次 HTTP 与 WebSocket 请求独立鉴权。

## 管理目标

### 本机 Docker

MSM 后端需要能够访问本机 Docker Engine（默认 `unix:///var/run/docker.sock` 或自定义 `DOCKER_HOST`）。

如果提示「引擎不可用」：

- 确认目标主机 `dockerd` 正在运行
- 确认运行 MSM 的用户对 `/var/run/docker.sock` 有读写权限
- Docker 部署时确认已按需挂载 `/var/run/docker.sock:/var/run/docker.sock`
- 点击页面顶部的连接检测刷新状态

### 独立 Agent 子节点

被管理主机只需运行轻量独立的 **`msm-docker-agent`**，不需要安装完整 MSM，也不会启动 Web、DNS 或代理组件。Agent 拥有独立的镜像、二进制包与数据卷生命周期：

- **Docker 镜像**：
  - 稳定版：`msmbox/msm-agent:latest` 或固定版本 `msmbox/msm-agent:<MSM版本>`
  - Beta 版：`msmbox/msm-agent:beta-latest` 或 `msmbox/msm-agent:beta-<MSM版本>`
  - 镜像基于 `alpine:3.23.3`，仅内置 `msm-docker-agent`、Docker CLI 与 Docker Compose 插件，支持 `linux/amd64`、`linux/arm64`、`linux/arm/v7`
- **独立二进制**：可从源码执行 `scripts/package-release-docker-agent.sh` 或在发布工作流产物中获取对应架构的 `msm-docker-agent` 静态二进制包，适合直接在宿主机以 systemd / OpenRC 运行

进入 **Docker 管理 → 节点**，支持两种接入模式：

| 方式 | 连接方向 | 适用场景 |
|------|----------|----------|
| **主动回连（Tunnel，推荐）** | Agent 主动向 MSM 建立出站 TLS 隧道 | 子节点位于 NAT / 家庭宽带 / 云主机且不想开放入站端口 |
| **HTTPS 直连（Direct）** | MSM 主动连接 Agent 的 HTTPS 端口 | 同内网或已有固定受信任 HTTPS 地址与清晰防火墙边界 |

#### 方式一：主动回连（推荐）

主动回连模式下，子节点**不需要开放 `7788` 入站端口**，也**不需要单独准备 TLS 证书**。Agent 默认将自身管理端口仅绑定在容器内 `127.0.0.1:7788`，并通过出站连接向控制端建立多路复用隧道（默认 4 条）。

1. 在 MSM 进入 **Docker 管理 → 节点**，点击添加节点并选择 **主动回连**
2. 填写子节点名称（如 `nas-docker`）和子节点可访问的 MSM 地址（生产环境使用 HTTPS；若隔离内网测试使用 HTTP，页面会提示勾选允许明文回连开关）
3. 生成一次性接入令牌，页面将给出可直接复制的部署命令
4. 将令牌写入权限为 `0600` 的本地文件并启动 Agent：

```bash
umask 077
printf %s '替换为控制端生成的一次性令牌' > ./msm-agent-enrollment-token

docker run -d \
  --name msm-docker-agent \
  --restart unless-stopped \
  --read-only \
  --security-opt no-new-privileges:true \
  -e MSM_AGENT_CONTROLLER_URL="https://msm.example.com" \
  -e MSM_AGENT_NODE_NAME="nas-docker" \
  -e MSM_AGENT_ENROLLMENT_TOKEN_FILE="/run/secrets/enrollment-token" \
  -v msm-docker-agent-data:/var/lib/msm-docker-agent \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD/msm-agent-enrollment-token:/run/secrets/enrollment-token:ro" \
  --tmpfs /tmp:size=64m,mode=1777 \
  msmbox/msm-agent:latest
```

使用 Docker Compose（对应源码中的 `docker-compose.agent-tunnel.yml`）：

```yaml
services:
  msm-docker-agent:
    image: ${MSM_AGENT_IMAGE:-msmbox/msm-agent:latest}
    container_name: msm-docker-agent
    restart: unless-stopped
    read_only: true
    security_opt:
      - no-new-privileges:true
    environment:
      MSM_AGENT_LISTEN: 127.0.0.1:7788
      MSM_AGENT_DATA_DIR: /var/lib/msm-docker-agent
      MSM_AGENT_CONTROLLER_URL: ${MSM_AGENT_CONTROLLER_URL:?请设置控制端 URL}
      MSM_AGENT_NODE_NAME: ${MSM_AGENT_NODE_NAME:?请设置节点名称}
      MSM_AGENT_ENROLLMENT_TOKEN_FILE: /run/secrets/enrollment-token
      # 控制端使用自签名 / 私有 CA 时挂载证书并配置：
      # MSM_AGENT_CONTROLLER_CA: /run/tls/controller-ca.crt
      # 仅限完全隔离的测试网络（禁止用于公网）：
      # MSM_AGENT_ALLOW_INSECURE_CONTROLLER_HTTP: "true"
    volumes:
      - msm-docker-agent-data:/var/lib/msm-docker-agent
      - ${MSM_DOCKER_SOCKET_PATH:-/var/run/docker.sock}:/var/run/docker.sock
      - ${MSM_AGENT_HOST_ENROLLMENT_TOKEN_FILE:-./msm-agent-enrollment-token}:/run/secrets/enrollment-token:ro
    tmpfs:
      - /tmp:size=64m,mode=1777

volumes:
  msm-docker-agent-data:
```

首次注册成功后，Agent 会把长期回连凭据以 `0600` 权限保存在数据卷内的 `controller.json` 中；后续重启即使一次性令牌已过期或删除，也会自动使用长期凭据恢复连接。

#### 方式二：HTTPS 直连

1. 在子节点准备受 MSM 控制端信任的 TLS 证书与私钥（放入 `./tls/agent.crt` 与 `./tls/agent.key`）
2. 启动 Agent 容器并仅向控制端开放 `7788` 端口：

```bash
docker run -d \
  --name msm-docker-agent \
  --restart unless-stopped \
  --read-only \
  --security-opt no-new-privileges:true \
  -p 7788:7788 \
  -e MSM_AGENT_LISTEN="0.0.0.0:7788" \
  -e MSM_AGENT_TLS_CERT="/run/tls/agent.crt" \
  -e MSM_AGENT_TLS_KEY="/run/tls/agent.key" \
  -v msm-docker-agent-data:/var/lib/msm-docker-agent \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD/tls:/run/tls:ro" \
  --tmpfs /tmp:size=64m,mode=1777 \
  msmbox/msm-agent:latest
```

3. 在子节点生成有效期 10 分钟的一次性接入令牌（Agent 启动时不会自动打印令牌）：

```bash
docker exec msm-docker-agent msm-docker-agent token
```

4. 在 MSM 的 **Docker 管理 → 节点** 填写节点名称、HTTPS Endpoint（如 `https://agent.example.com:7788`）和一次性令牌完成登记。

::: info HTTP 测试网络限制
未配置 TLS 时，直连 Agent 默认拒绝监听非回环地址，防止凭据明文暴露。仅在隔离测试网络中，需要在控制端设置 `MSM_DOCKER_ALLOW_INSECURE_NODE_HTTP=true`，并在 Agent 端同时设置 `MSM_AGENT_ALLOW_INSECURE_HTTP=true` 才允许 HTTP 直连。
:::

#### 宿主机直接运行独立二进制（无容器化 Agent）

如需在宿主机直接运行二进制（无需容器套娃）：

```bash
# 查看版本
msm-docker-agent version

# 主动回连模式启动（未指定 -listen 时默认仅监听 127.0.0.1:7788）
msm-docker-agent serve \
  --data-dir /var/lib/msm-docker-agent \
  --controller-url https://msm.example.com \
  --node-name nas-host \
  --enrollment-token-file /etc/msm-docker-agent/enrollment-token

# 直连模式生成一次性令牌
msm-docker-agent token --data-dir /var/lib/msm-docker-agent

# 健康检查（自动忽略 HTTP_PROXY 环境变量）
msm-docker-agent healthcheck
```

#### Agent 常用环境变量一览

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `MSM_AGENT_LISTEN` | 直连 `0.0.0.0:7788` / 回连 `127.0.0.1:7788` | Agent 监听地址 |
| `MSM_AGENT_DATA_DIR` | `/var/lib/msm-docker-agent` | SQLite、密钥与托管应用栈数据目录 |
| `MSM_AGENT_TLS_CERT` / `MSM_AGENT_TLS_KEY` | 空 | 直连模式 HTTPS 证书与私钥路径（需成对配置） |
| `MSM_AGENT_ALLOW_INSECURE_HTTP` | `false` | 直连模式显式允许非回环明文 HTTP（仅测试网） |
| `MSM_AGENT_CONTROLLER_URL` | 空 | 主动回连目标 MSM 控制端 URL |
| `MSM_AGENT_NODE_NAME` | 空 | 主动回连自动注册的节点名称 |
| `MSM_AGENT_ENROLLMENT_TOKEN_FILE` | 空 | 首次主动回连使用的一次性令牌文件路径 |
| `MSM_AGENT_CONTROLLER_CA` | 系统 CA | 控制端使用私有 CA 时的 PEM 证书路径 |
| `MSM_AGENT_TUNNEL_CONNECTIONS` | `4` | 主动回连并发隧道连接数（允许范围 `1–8`） |
| `MSM_AGENT_ALLOW_INSECURE_CONTROLLER_HTTP` | `false` | 主动回连显式允许 HTTP 控制端（仅隔离测试网） |
| `DOCKER_HOST` | `unix:///var/run/docker.sock` | 目标 Docker Engine 地址 |
| `MSM_DOCKER_STACKS_DIR` | `<DATA_DIR>/stacks` | Agent 托管 Compose 应用栈目录 |

## 页面功能说明

### 容器

- 支持搜索、状态筛选、卡片/表格视图切换、自定义容器图标（联动图标库）与批量操作
- 启动、停止、重启、暂停、重命名和删除
- 实时日志、资源占用统计、进程列表、环境变量、挂载卷和网络详情
- 按角色权限开放交互式终端、脚本执行与容器文件浏览器
- 从表单创建新容器并配置端口、挂载、环境变量、网络与资源限制

终端、脚本执行、文件写入和特权容器属于高风险操作，执行前请确认当前管理目标和容器名称。

### 应用栈

- 统一承载原 Compose 工作区：从 YAML 或模板创建应用栈，保存前校验 Compose 语法
- 部署、启动、停止、重启、更新和删除受管应用栈
- 查看所属服务、关联容器、日志和实时 YAML；外部部署的 Compose 项目以只读信息展示
- 注意：独立 Agent 镜像不包含 Buildx 与 Git，包含 `build:` 指令的项目需先在目标主机完成镜像构建

### 镜像、存储卷与网络

- **镜像**：拉取、搜索、导入/导出、打标签、查看层与入口命令、一键基于镜像建容器、清理悬空镜像与缓存
- **存储卷**：创建、查看驱动/挂载点及关联容器、区分使用中与未使用卷
- **网络**：创建 `bridge`、`macvlan` 等网络，配置子网/网关/地址池和父接口，动态连接或断开容器；仍被容器占用的网络受删除保护

### 容器更新、事件与操作审计

- **容器更新**：扫描当前目标容器所使用的镜像仓库摘要，对比新版本并按策略重建升级，支持本机和 Agent 子节点
- **事件**：实时流式展示 Docker Engine 生命周期事件，可按资源类型筛选
- **操作审计**：完整记录容器启停、重建、应用栈变更等运维动作与执行状态
- **系统**：查看 Engine 版本、OS/架构、存储驱动、磁盘空间占用与一键清理（勾选数据卷清理前请先备份）

## 节点凭据与安全生命周期

- 一次性令牌默认 10 分钟有效且仅可使用一次
- 控制端加密存储访问凭据；直连 Agent 仅保存凭据哈希，回连 Agent 在数据卷内以 `0600` 权限保存长期连接凭据
- 不要把同一份 Agent 数据卷复制到多台机器同时运行，每台主机应拥有独立数据卷与身份
- 怀疑凭据泄露时，管理员可直接在节点页执行**凭据轮换**（新旧凭据平滑过渡，完成后旧凭据立即失效）
- 删除节点仅移除控制关系，不会删除目标主机上的容器和数据

## 常见问题

### 切换管理目标后列表看起来不对

核对页面顶部当前选中的「管理目标」与最近同步时间；切换节点后等待健康检查与资源拉取完成即可。

### 独立 Agent 节点离线或连接失败

按顺序检查以下四项：

1. 在子节点执行 `docker exec msm-docker-agent msm-docker-agent healthcheck` 检查 Agent 自身进程存活
2. 主动回连模式检查子节点能否解析并访问控制端 URL，以及控制端 TLS 证书是否受系统或 `MSM_AGENT_CONTROLLER_CA` 信任
3. 直连模式检查控制端能否访问目标 `7788` 端口，以及证书域名/IP SAN 是否匹配
4. 查看容器日志 `docker logs --tail=100 msm-docker-agent` 定位重连错误原因（排障分享日志时请勿泄露 `controller.json`）

### Agent 在线但部分操作失败

- 检查当前登录账号角色（查看者无法执行写操作）
- 确认挂载的 Docker Socket 具备读写权限（如挂载为 `:ro` 将无法执行写操作）
- 检查应用栈 YAML 是否包含无法在精简 Agent 容器内构建的 `build:` 路径

## 下一步

- [Docker 安装](/zh/guide/docker) - 部署 MSM 容器本身
- [网络工具](/zh/guide/network-tools) - 排查控制端与子节点网络连通性
- [用户管理](/zh/guide/user-management) - 分配管理员、操作员与查看者权限
