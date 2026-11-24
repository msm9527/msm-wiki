# API 参考

MSM 后端基于 REST、SSE 和 WebSocket 构建，所有业务接口统一以 `/api/v1` 开头。本页给出稳定路径分组、认证模型与权限边界；完整端点清单与字段结构以源码内自动生成的 OpenAPI 规范（`backend/docs/openapi.yaml`）和当前 Web 端请求为准。

## 基本地址

```text
http://<MSM-IP>:7777/api/v1
```

启用 HTTPS 后请改用 `https://`，不要为了绕过配置问题关闭 TLS 证书校验。

## 认证方式

### 1. 登录与会话 Cookie

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

Web 界面默认使用安全 Cookie 会话，浏览器内的 SSE / WebSocket 同样复用会话 Cookie；登录、刷新、改密与激活等接口带有独立速率限制。

### 2. Bearer Token 与长期 API Token

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://<MSM-IP>:7777/api/v1/auth/me
```

长期 API Token 可在 **系统设置 → 系统管理 → API Token 管理** 创建（同样适用于 [MSM Assistant 浏览器助手](/zh/guide/assistant)）。Token 仅在创建时完整展示一次，请妥善保存并遵循最小权限角色原则。

## 权限与门控边界

后端在验证身份后，还会按接口级联校验：

- **用户角色**：`admin`、`operator`、`viewer`
- **应用商店安装状态与系统功能开关**
- **Pro 授权状态、细分能力与本机授权 Proof**
- **高风险写操作的在线动作确认**

有效 Token 并不代表拥有全部接口权限；遇到 `403` 时请读取响应体中的 `code` 字段，不要盲目重试。

## 核心路径分组

| 路径组 | 主要用途 |
|--------|----------|
| `/auth` | 登录、登出、会话刷新与当前用户信息 |
| `/setup` | 初始化向导、组件下载/上传、HTTPS 与系统重置 |
| `/apps` | 应用商店目录查询、模块安装/卸载与依赖状态 |
| `/icons` | 图标库管理、图标上传/搜索与服务/策略组/容器图标绑定 |
| `/services` | 托管子服务状态查询、启停、重载与日志 |
| `/monitor` | 主机 CPU、内存、磁盘、流量、温度与系统监控 |
| `/mosdns` | DNS 统计、规则、客户端、AdGuard 拦截、Geosite、自动分类、批量重建、备份、日志与版本 |
| `/proxy/controller` | 当前活动代理核心的统一控制面（节点、规则、连接、Smart 权重与降权） |
| `/proxy/icon-linkage` | 代理策略组与图标库的自动联动配置 |
| `/mihomo` | Clash 专属版本、配置、Smart 资产与回家接口（路径保留内部技术标识） |
| `/singbox` | Sing-Box 专属版本、配置与回家接口 |
| `/home-access/shares` | 远程回家终端配置分享链接创建、撤销与公开下载 |
| `/edge` | Edge 网关概览、拓扑、DDNS、ACME 证书、L7 反向代理、L4 端口转发与 STUN 隧道 |
| `/cloudflare/tunnel` | Cloudflare Tunnel 隧道配置、部署与启停 |
| `/networking` | EasyTier、Tailscale、WireGuard 自建私网、节点与终端分发 |
| `/network` | FakeIP 一致性诊断、规则预演与本机受管网络规则恢复 |
| `/docker-center` | 多节点 Docker 容器、镜像、存储卷、网络、应用栈、更新检查、事件与操作审计 |
| `/nettools` | 网络诊断 REST 接口与实时流 WebSocket 任务 |
| `/notify` | 通知渠道配置、测试推送与事件通知规则 |
| `/storage` | 存储占用分析、目录清理预览与安全清理 |
| `/assistant` | MSM Assistant 浏览器助手快速连接状态与协同接口 |
| `/policy-sync` | 策略同步任务与规则源同步状态 |
| `/config`、`/history` | 全局配置树编辑、校验、历史版本对比与回滚 |
| `/backups` | v3 分级备份（configuration / offline / legacy）、导入导出与恢复 |
| `/users`、`/api-tokens` | 用户角色与长期 API Token 管理 |
| `/settings`、`/user-settings` | 系统全局设置、功能开关、下载镜像源与个人偏好 |
| `/license-activation` | Pro 授权状态、硬件指纹、激活、刷新与解绑 |
| `/update`、`/component-updates` | MSM 主程序及核心组件的检查、下载、安装与回滚 |
| `/audit` | 系统关键安全与运维审计日志 |
| `/uninstall` | Web 端安全卸载预览与触发流程 |
| `/events` | 全局与分模块 SSE 实时事件流 |

## 常用业务端点速查

### 统一代理控制面（`/proxy/controller`）

推荐第三方工具与扩展优先调用 `/proxy/controller`，后端会自动路由至当前运行的 Clash 或 Sing-Box 核心：

| 方法 | 路径 | 常见最低角色 |
|------|------|--------------|
| `GET` | `/proxy/controller/capabilities` | viewer |
| `GET` | `/proxy/controller/overview` | viewer |
| `GET` | `/proxy/controller/proxies` | viewer |
| `PUT` | `/proxy/controller/proxies/:name` | operator |
| `GET` | `/proxy/controller/rules` | viewer |
| `GET` | `/proxy/controller/connections` | viewer |
| `DELETE` | `/proxy/controller/connections/:id` | operator |
| `GET` | `/proxy/controller/providers/proxies` | viewer |
| `PUT` | `/proxy/controller/providers/proxies/:name` | operator |
| `POST` | `/proxy/controller/validate-restart` | operator |

### 远程回家与分享（`/mihomo`、`/singbox`、`/home-access/shares`）

```text
GET  /api/v1/{mihomo|singbox}/home-access
GET  /api/v1/{mihomo|singbox}/home-access/detect
PUT  /api/v1/{mihomo|singbox}/home-access
POST /api/v1/{mihomo|singbox}/home-access/validate
POST /api/v1/{mihomo|singbox}/home-access/test
GET/POST/DELETE /api/v1/home-access/shares
```

### Edge 域名与端口网关（`/edge`）

| 路径 | 用途 |
|------|------|
| `/edge/overview`、`/edge/topology`、`/edge/runtime` | 概览、服务拓扑与内置网关引擎状态 |
| `/edge/publish/workflows` | 一键发布域名工作流的创建、预检、继续与取消 |
| `/edge/ddns/credentials`、`/edge/ddns/tasks` | DNS 服务商凭据、双栈 DDNS 同步与诊断 |
| `/edge/certificates` | ACME 证书预检、签发、续期、导入与下载 |
| `/edge/proxies` | L7 反向代理规则、上游发现探测、校验与热加载 |
| `/edge/forwards` | L4 TCP / UDP 端口转发规则管理 |
| `/edge/tunnels` | STUN NAT 穿透隧道管理 |

### 自建私网与 Cloudflare（`/networking`、`/cloudflare/tunnel`）

```text
GET/PUT /api/v1/cloudflare/tunnel
POST    /api/v1/cloudflare/tunnel/{validate|provision|install|setup|start|stop|restart|test}

GET/PUT /api/v1/networking
GET     /api/v1/networking/endpoints
POST    /api/v1/networking/install
POST    /api/v1/networking/services/{wireguard|easytier|tailscale}/{start|stop|restart|diagnose}
POST    /api/v1/networking/peers
DELETE  /api/v1/networking/peers/:id
```

### Docker 管理（`/docker-center`）

切换远端节点时，控制端会透明代理同一套资源契约（`/docker-agent` 为内部 Agent 登记与隧道复用协议，不面向普通客户端）：

```text
/docker-center/engine/health
/docker-center/containers
/docker-center/images
/docker-center/volumes
/docker-center/networks
/docker-center/stacks
/docker-center/updates
/docker-center/operations
/docker-center/events
/docker-center/system
/docker-center/nodes
```

### 网络诊断与 FakeIP 校验（`/network`、`/nettools`）

```text
GET  /api/v1/network/diagnostics
POST /api/v1/network/plan
POST /api/v1/network/reconcile
```

`/nettools` 提供 `ping`、`dns/query`、`portscan`、`ipv6/check`、`nat/check`、`traceroute`、`http/test`、`speedtest`、`ipinfo`、`whois`、`subnet/calc`、`wol`、`ssl/info`、`interfaces`、`arp/scan`、`mtr`、`iperf` 等 REST 接口，以及 `/nettools/ws/{ping|traceroute|mtr|portscan|speedtest}` 实时流 WebSocket。

## SSE 实时事件流

```text
GET /api/v1/events
GET /api/v1/events/monitor
GET /api/v1/events/proxy
GET /api/v1/events/mosdns
GET /api/v1/events/mihomo
GET /api/v1/events/logs/:service
```

生产环境请勿把长期 API Token 拼接在 URL 查询参数中，以免泄漏至反向代理访问日志或浏览器历史。

## 错误响应规范

所有错误返回结构化 JSON：

```json
{
  "error": "可读错误说明",
  "code": "MACHINE_READABLE_CODE"
}
```

| 状态码 | 含义 |
|--------|------|
| `400` | 请求参数或配置校验失败 |
| `401` | 未登录或 Token 失效 |
| `403` | 角色、Pro 授权或能力不足 |
| `404` | 资源不存在 |
| `409` | 状态冲突、存在引用依赖或并发写入冲突 |
| `429` | 触发接口速率限制 |
| `500` | 后端执行异常 |
| `503` | 模块未安装、功能开关关闭或远端节点离线 |

## 下一步

- [浏览器助手（MSM Assistant）](/zh/guide/assistant) - 使用 API Token 快速连接浏览器扩展
- [CLI 命令参考](/zh/guide/cli) - 终端管理与脚本化运维
- [隐私与数据安全](/zh/legal/privacy-security)
