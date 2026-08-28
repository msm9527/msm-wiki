# Cloudflare 内网穿透

MSM 使用 **Cloudflare Tunnel** 将本机或局域网中的 Web 服务发布为 HTTPS 域名。连接器主动向 Cloudflare 建立出站连接，不需要公网 IP，也不需要在路由器开放入站端口。

::: warning 账号、域名与数据边界
请仅使用自有或已授权的 Cloudflare 账号、域名和 Tunnel。优先使用最小权限 API Token，并为公开的管理页面同时保留应用自身认证和 Cloudflare Access。
:::

该模块属于 Pro 功能，并受 **系统设置 → 功能开关 → 内网穿透** 控制。它只负责 Web 服务发布；需要访问整个家庭网段时，请使用[自建私网](/zh/guide/networking)或[远程回家](/zh/guide/home)。

## 支持的发布方式

进入 **内网穿透 → Cloudflare Tunnel**。MSM 支持两种互不混用的凭据模式：

| 模式 | 适用场景 | Cloudflare 侧操作 |
|------|----------|------------------|
| **Tunnel Token** | 已在控制台创建 Tunnel 和公开主机名 | MSM 安装并运行连接器，不改云端路由 |
| **API 自动配置** | 希望在 MSM 中新增和维护多个入口 | MSM 创建或复用 Tunnel，并合并入口与 DNS 记录 |

切换模式后按当前模式重新填写凭据。已保存的敏感值默认隐藏并在本机加密保存；管理员可通过小眼睛查看，或输入新值完成替换。

## 创建最小权限 API Token

API 自动配置需要 **Account ID** 和一个自定义 API Token。不要使用 Global API Key。

1. 打开 Cloudflare 右上角用户菜单，进入 **My Profile → API Tokens → Create Token**。
2. 选择 **Create Custom Token**，不要套用只覆盖单项资源的模板。
3. 添加以下三项权限：
   - `Account / Cloudflare Tunnel / Edit`
   - `Zone / DNS / Edit`
   - `Zone / Zone / Read`
4. 在 **Account Resources** 中只包含当前账户。
5. 在 **Zone Resources** 中只包含准备发布的域名；跨多个 Zone 时逐个加入。
6. 可按需设置客户端 IP 与过期时间，然后选择 **Continue to summary → Create Token**。
7. Token 只完整显示一次：离开页面前复制到密码管理器，并粘贴到 MSM。
8. 在 MSM 填写 Account ID、Tunnel 名称和至少一个发布服务，先保存，再运行权限与配置检查。

MSM 在写入云端资源前会先做权限预检。预检失败不会保存新 Token，也不会创建或修改 Tunnel、DNS 记录。修正权限后可直接重试；不需要删除已经验证无误的本地服务条目。

## 使用现有 Tunnel Token

1. 在 Cloudflare 控制台进入 **Networking → Tunnels** 并创建或打开一个 Tunnel。
2. 复制安装命令，或只复制命令中 `--token` 后面的完整值。
3. 在 MSM 选择 **控制台创建 / 已有 Tunnel** 并粘贴 Token。
4. 确认控制台已经配置公开主机名及源站，然后由 MSM 安装、启动和检查 `cloudflared`。

Token 模式不会替你批量修改云端公开主机名。要在 MSM 中维护多个域名入口，请改用 API 自动配置。

## 一个 Tunnel 发布多个服务

API 自动配置模式可以在同一个 Tunnel 中维护多条“公网域名 → 源站”路由，例如：

```text
msm.example.com   → http://127.0.0.1:7777
nas.example.com   → http://192.168.1.20:5000
pve.example.net   → https://192.168.1.30:8006
```

源站既可以是 MSM 本机，也可以是连接器能访问的其他局域网设备。每条入口可独立编辑、启停和检查。MSM 会根据完整域名匹配当前账户中最长后缀相符的 Zone，所以同一个 Tunnel 可以发布不同 Zone 下的域名。

### 源站地址注意事项

- 宿主机安装可使用 `127.0.0.1` 访问本机服务。
- Docker Bridge 模式中的 `127.0.0.1` 指向 MSM 容器自身，不是宿主机。
- 发布其他容器时，优先使用同一 Docker 网络中的服务名，或容器实际可达的宿主机 / LAN 地址。
- HTTPS 私有源站需要正确配置 SNI 与证书校验；不要用“跳过验证”长期掩盖证书错误。
- 地址必须包含协议和真实端口，例如 `https://192.168.1.30:8006`。

## 保存、连接与验证

推荐按以下顺序操作：

1. 添加并保存所有发布服务。
2. 点击 **开始设置并连接**；MSM 会下载并校验 `cloudflared`。
3. API 模式会匹配 Zone、安全合并 Tunnel 入口和 DNS；Token 模式使用控制台现有资源。
4. 等待连接状态变为在线。
5. 对每个源站执行检查，确认连接器能实际访问目标。
6. 使用手机流量等真正的外部网络访问每个 HTTPS 域名。

“连接器在线”只表示 `cloudflared` 已连接 Cloudflare，不代表 DNS 已传播、源站可达或应用登录一定成功。以每条服务的检查结果和外网真实访问为准。

## 访问保护

- Tunnel 只提供入口与传输，不替代 MSM、PVE、NAS 等应用自身的登录认证。
- 管理页面建议配置 Cloudflare Access，只允许指定身份访问。
- API Token 仅授权必要账户、Zone 和操作；不用后立即撤销。
- 不在截图、日志、工单或聊天中发送 Token、安装命令和完整 Account ID 组合。
- 定期检查 Cloudflare 审计记录、Tunnel 连接器和不再使用的公开主机名。

## 常见问题

### 连接器在线，但域名打不开

依次检查 DNS 是否已指向 Tunnel、公开主机名是否匹配、源站 URL 是否含正确协议和端口，以及 MSM 所在环境能否直接访问源站。Docker 用户尤其要检查 `127.0.0.1` 的实际含义。

### API 权限预检失败

确认 Token 属于 Account ID 对应账户，具备 Cloudflare Tunnel Edit、DNS Edit 和 Zone Read，并且资源范围包含所有准备发布的 Zone。新建 Token 后记得使用新值替换旧凭据。

### 局域网设备的网页无法发布

先在 MSM 主机或容器中直接访问该 LAN 地址。若本地都无法访问，Tunnel 也无法访问；检查 VLAN、防火墙、容器网络和源站监听地址。

### 想访问 SSH、数据库或整个家庭网段

Cloudflare Tunnel 页面面向 HTTP/HTTPS 服务发布，不再提供私网 Mesh。请选择[自建私网](/zh/guide/networking)中的 EasyTier、Tailscale、WireGuard，或使用[远程回家](/zh/guide/home)。

## 下一步

- [域名服务](/zh/guide/domain-services) - DDNS、生产证书和反向代理
- [自建私网](/zh/guide/networking) - 同时管理 EasyTier、Tailscale 与 WireGuard
- [远程回家](/zh/guide/home) - 生成代理客户端可导入的回家配置
