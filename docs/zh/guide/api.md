# API 参考

MSM 后端使用 REST、SSE 和 WebSocket。所有业务接口统一以 `/api/v1` 开头；本文提供稳定的路径分组和认证边界，具体请求字段以当前 Web 界面发出的请求和对应版本代码为准。

## 基本地址

```text
http://<MSM-IP>:7777/api/v1
```

启用 HTTPS 后改用 `https://`。不要关闭证书验证来掩盖证书配置错误。

## 认证

### 登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

Web 界面使用安全 Cookie 会话；API 客户端也可按当前响应使用 Bearer Token。登录、刷新、改密、激活等敏感接口有额外速率限制。

### Bearer Token

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://<MSM-IP>:7777/api/v1/auth/me
```

### API Token

长期 Token 从 **用户管理 / 系统设置中的 API Token** 功能创建，需要相应 Pro 能力。Token 只在创建时完整显示，应立即存入密码管理器并限制权限。

### Cookie

浏览器内的 SSE / WebSocket 通常复用登录 Cookie。跨域客户端还会受到 Origin、CORS 和 Cookie 属性限制。

## 授权不只检查 Token

后端会继续检查：

- 用户角色：`admin`、`operator`、`viewer`
- 系统功能开关
- 基础 Pro 和细分许可证能力
- 本机授权 Proof
- 高风险写操作的短期在线授权与 Action Attestation

有效 Token 不代表可以调用所有写接口。遇到 `403` 时读取响应中的 `code`，不要通过重试绕过权限。

## 核心路径组

| 路径组 | 主要用途 |
|--------|----------|
| `/auth` | 登录、退出、刷新与当前用户 |
| `/setup` | 初始化、组件下载 / 上传、HTTPS 与系统重置 |
| `/services` | 托管服务查询、启停、配置和日志 |
| `/monitor` | 系统、硬件、资源和网络监控 |
| `/mosdns` | DNS 统计、规则、客户端、日志、配置和版本 |
| `/proxy/controller` | 当前活动代理核心的统一控制接口 |
| `/mihomo` | Mihomo 特有版本、配置和回家接口 |
| `/singbox` | Sing-Box 特有版本、配置和回家接口 |
| `/edge` | 域名服务、DDNS、证书、反向代理和发布工作流 |
| `/cloudflare/tunnel` | Cloudflare 网页穿透 |
| `/cloudflare/mesh` | Cloudflare 云端私网与配对 |
| `/networking` | EasyTier、Tailscale、WireGuard 自建私网 |
| `/docker-center` | Docker 资源与节点控制 |
| `/nettools` | 网络诊断与实时任务 |
| `/config`、`/history` | 全局配置树、校验、历史与回滚 |
| `/backups` | 备份、存储、导入与恢复 |
| `/users`、`/api-tokens` | 用户与长期 Token |
| `/settings`、`/user-settings` | 系统和用户设置 |
| `/license-activation` | 授权状态、指纹、激活与撤销 |
| `/update`、`/component-updates` | MSM 和组件更新 |
| `/events` | SSE 事件流 |

## 统一代理接口

新客户端应优先使用 `/proxy/controller`，它会根据当前活动核心转发到 Mihomo 或 Sing-Box。

常用接口：

| 方法 | 路径 | 最低常见角色 |
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

高级策略、规则集和配置写入还会检查 `proxy.manage` 或非 Pro 数量限制。

### 回家

Mihomo 与 Sing-Box 路径结构一致：

```text
GET  /api/v1/{mihomo|singbox}/home-access
GET  /api/v1/{mihomo|singbox}/home-access/detect
PUT  /api/v1/{mihomo|singbox}/home-access
POST /api/v1/{mihomo|singbox}/home-access/validate
POST /api/v1/{mihomo|singbox}/home-access/test
```

先读取并校验，再保存 / 应用；不要直接拼接核心配置文件。

## 域名服务

所有 `/edge` 接口要求模块开关启用并具备基础 Pro。

| 路径 | 用途 |
|------|------|
| `/edge/overview`、`/edge/events`、`/edge/runtime` | 概览、事件和代理运行时 |
| `/edge/publish/workflows` | 创建、预检、继续和取消发布工作流 |
| `/edge/ddns/credentials` | DNS 服务商凭据 |
| `/edge/ddns/tasks` | DDNS 任务、同步、测试和批处理 |
| `/edge/certificates` | 证书预检、申请、导入、下载和部署 |
| `/edge/proxies` | 反向代理、验证、应用、健康和诊断 |

凭据、私钥和内部运行时路径不会原样出现在普通响应中。不要把加密存储误解为可以在请求日志中输出秘密。

## Cloudflare 与自建私网

### 网页穿透

```text
GET/PUT /api/v1/cloudflare/tunnel
POST    /api/v1/cloudflare/tunnel/{validate|provision|install|setup|start|stop|restart|test}
```

### 云端私网

```text
GET/PUT /api/v1/cloudflare/mesh
POST    /api/v1/cloudflare/mesh/{validate|install|setup|start|stop|restart|test}
POST    /api/v1/cloudflare/mesh/pairing/invites
POST    /api/v1/cloudflare/mesh/pairing/import
```

### EasyTier / Tailscale / WireGuard

```text
GET/PUT /api/v1/networking
GET     /api/v1/networking/endpoints
POST    /api/v1/networking/{install|start|stop|restart|diagnose}
POST    /api/v1/networking/peers
DELETE  /api/v1/networking/peers/:id
```

## Docker 管理

`/docker-center` 要求基础 Pro、有效 Proof 和对应角色。通过查询参数或当前选择访问远端节点时，控制端会代理同一套资源契约。

主要资源：

```text
/docker-center/overview
/docker-center/engine/health
/docker-center/containers
/docker-center/images
/docker-center/volumes
/docker-center/networks
/docker-center/stacks
/docker-center/compose/validate
/docker-center/system
/docker-center/events
/docker-center/templates
/docker-center/nodes
```

大多数读取要求 viewer；常规生命周期要求 operator；创建 / 删除容器、文件写入、脚本、终端、节点管理和清理通常要求 admin。以具体响应为准。

`/docker-agent` 是 Agent 注册、回连与控制端代理协议，不是面向普通第三方客户端的公共 API。

## 网络工具

常用 REST 路径：

```text
/nettools/health
/nettools/ping
/nettools/dns/query
/nettools/portscan
/nettools/ipv6/check
/nettools/nat/check
/nettools/traceroute
/nettools/http/test
/nettools/speedtest
/nettools/ipinfo
/nettools/whois
/nettools/subnet/calc
/nettools/wol
/nettools/ssl/info
/nettools/interfaces
/nettools/arp/scan
/nettools/mtr
/nettools/iperf
```

实时任务使用 `/nettools/ws/{ping|traceroute|mtr|portscan|speedtest}`。端口扫描、HTTP、WOL、iPerf3 等操作要求 operator。

## SSE 与 WebSocket

SSE 入口：

```text
GET /api/v1/events
GET /api/v1/events/monitor
GET /api/v1/events/proxy
GET /api/v1/events/mosdns
GET /api/v1/events/mihomo
GET /api/v1/events/logs/:service
```

浏览器优先使用安全 Cookie。生产环境不建议把长期 Token 放进 URL，因为 URL 可能进入代理、历史和日志。

## 错误处理

错误响应使用结构化 JSON，通常包含：

```json
{
  "error": "可读错误说明",
  "code": "MACHINE_READABLE_CODE"
}
```

常见状态：

- `400`：请求字段或配置校验失败
- `401`：未认证或凭据失效
- `403`：角色、Pro、Proof 或在线授权不足
- `404`：资源或路由不存在
- `409`：状态冲突、依赖或并发操作冲突
- `429`：速率限制
- `500`：后端执行失败
- `503`：功能开关关闭、目标服务或节点不可用

客户端应保留 `code` 和服务端消息，不要只显示 HTTP 状态码。

## 安全建议

- 使用 HTTPS
- Token 只授予所需角色与能力
- 不把 Token 放入 URL、日志或仓库
- 写操作先读取当前状态，处理并发变化与 `409`
- 发布、更新、核心切换等长操作监听进度，不要重复提交
- 对 `429` 和临时 `5xx` 使用有上限的退避重试
- 不自动重试删除、清理、回滚、激活等非幂等高风险操作

## 下一步

- [授权管理](/zh/guide/license)
- [统一代理服务](/zh/guide/proxy)
- [系统诊断](/zh/guide/diagnostics)
