# 🧪 Beta 版发布

用于查看 MSM `dev` 分支的每日构建发布记录。Beta 版可能包含未完全验证的功能，请勿直接用于生产环境。

---

## 🚧 `dev` 分支测试重点

以下能力已经进入 `dev`，欢迎测试反馈。当前 Beta 版本与具体发布内容，以本页上方最新发布卡和 [GitHub Release](https://github.com/msm9527/msm-wiki/releases) 为准。

- 统一代理服务强化跨 Clash / Sing-Box 安全切换、配置迁移、网络恢复和就绪验证
- 远程回家扩展为 Shadowsocks、VLESS、Trojan、AnyTLS、Hysteria2、TUIC v5 六种协议
- EasyTier、Tailscale / Headscale、WireGuard 三个自建私网服务可多选并存
- 网络工具与 Docker 管理重构为运维控制台，并强化查看者 / 操作员权限边界
- Cloudflare Tunnel 支持同一 Tunnel 多条跨 Zone 路由，并可发布本机或局域网中的多个 Web 服务
- 域名服务内置受管反向代理运行时，完善 DDNS、证书、反向代理、访问日志和运行时修复
- 配置写入增强注释与字段顺序保留，系统网络增加 DNS / FakeIP 自愈
- 授权页收敛支持与社群入口，自助撤销要求授权邮箱和授权码，并移除 IP 激活备选路径
- 仪表盘与进程管理增加 MSM 自身 / 托管合计资源口径、网卡与双栈地址，并优化实时图表性能
- 强化组件升级、MSM 更新预检、手工停止意图和主机重启后的托管服务自动恢复

本 Wiki 的功能专题按当前 `dev` 界面维护；稳定版中看不到某个入口时，请先核对版本，而不是按文档强行调用新接口。

---

## 🧪 最新 Beta 版本

<div class="msm-release-hero msm-release-hero--beta" data-version="beta-1.4.1" data-release-date="2026-09-06 11:00:40 CST" data-release-url="https://github.com/msm9527/msm-wiki/releases/tag/beta-1.4.1">
  <div class="msm-release-hero-copy">
    <span class="msm-release-kicker">MSM / Beta 版</span>
    <h3 class="msm-release-version"><span>Beta 版</span> <code>beta-1.4.1</code></h3>
    <p class="msm-release-lede">同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单</p>
  </div>
  <div class="msm-release-actions">
    <a class="msm-release-action msm-release-action--primary" href="https://github.com/msm9527/msm-wiki/releases/tag/beta-1.4.1" target="_blank" rel="noreferrer">查看 Release <span aria-hidden="true">↗</span></a>
    <a class="msm-release-action" href="/zh/guide/releases-beta.html#一键安装">安装指南 <span aria-hidden="true">→</span></a>
  </div>
</div>
<div class="msm-release-metrics" aria-label="发布概览">
  <div class="msm-release-metric"><span>版本</span><strong>beta-1.4.1</strong></div>
  <div class="msm-release-metric"><span>发布时间</span><strong>2026-09-06 11:00:40 CST</strong></div>
  <div class="msm-release-metric"><span>源提交</span><a href="https://github.com/msm9527/msm/commit/2954c4d1fc10198ae97d26354d3681542a125b7c" target="_blank" rel="noreferrer"><code>2954c4d</code></a></div>
  <div class="msm-release-metric"><span>发布类型</span><strong>Beta 版</strong></div>
</div>
<p class="msm-release-download-note"><span>下载说明</span>同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单</p>

### 📋 本次更新

::: info 📝 备注（Notes）
- 本次版本从 2026-09-05T22:16:22Z 之后更新，包含 10 个提交，主要更新：chore: 升级版本至 1.4.1 / bump version to 1.4.1，涉及 M .version; M backend/docs/openapi.json; M backend/docs/openapi.yaml; ...
:::

::: details 📋 构建信息
- **发布通道**: beta（Beta 版）
- **源提交**: [`2954c4d`](https://github.com/msm9527/msm/commit/2954c4d1fc10198ae97d26354d3681542a125b7c)
- **提交信息**: chore: 升级版本至 1.4.1 / bump version to 1.4.1
- **提交作者**: root
- **提交时间**: 2026-09-06 11:00:40 CST
:::

---

## 📚 历史 Beta 版本

> 下面仅列出最近几个 Beta 版本的主要变更，完整变更记录以 GitHub Release 为准。

::: details beta-1.0.14 · 2026-03-31 16:29 · Beta 版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/beta-1.0.14" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 统一 MosDNS 恢复写操作重试策略
- 调整组件更新 GitHub 下载优先级

**问题修复**
- 修复 MosDNS 未启用列表插件回写失败
- 修复许可证重激活因本地材料损坏失败
- 修复 MosDNS 列表插件就绪前的回写问题

**注意事项**
- 0.x 升级 1.x 必须重置或重装 DNS 服务
:::

## ⚠️ 使用说明

1. Beta 版标签格式：`beta-x.x.x`
2. Docker 标签格式：`msmbox/msm:beta-x.x.x` 与 `msmbox/msm:beta-latest`
3. 若需稳定环境，请使用[稳定版发布](/zh/guide/releases)
4. 请仅在自有或已获授权的环境中测试，并在安装前阅读[使用与合规](/zh/legal/)

## 一键安装

```bash
# 使用 curl（sudo）
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install_beta.sh | sudo bash
# root 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install_beta.sh | bash

# 或使用 wget（sudo）
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install_beta.sh | sudo bash
# root 用户
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install_beta.sh | bash
```

::: tip 国内加速（可选）
如果直连 GitHub 较慢，推荐直接使用 Beta 国内镜像脚本直链：

```bash
# Beta 国内镜像脚本（等价于 install_beta_cn.sh）
# curl（sudo）
curl -fsSL https://msm.19930520.xyz/dl/beta/install.sh | sudo bash
# root 用户
curl -fsSL https://msm.19930520.xyz/dl/beta/install.sh | bash

# wget（sudo）
wget -qO- https://msm.19930520.xyz/dl/beta/install.sh | sudo bash
# root 用户
wget -qO- https://msm.19930520.xyz/dl/beta/install.sh | bash
```

> `https://msm.19930520.xyz/dl/beta/install.sh` 为 Beta 国内镜像脚本直链，和仓库中的 `install_beta_cn.sh` 同步。

> 系统自带工具小贴士：Debian/Ubuntu/Alpine 最小镜像通常预装 `wget` 而不一定有 `curl`；CentOS/RHEL/Fedora 常见预装 `curl`；macOS 预装 `curl`。缺少对应工具时可先用包管理器安装（如 `apt-get install curl` 或 `yum install wget`）。
:::
