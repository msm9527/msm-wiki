# 🧪 Beta 版发布

用于查看 MSM `dev` 分支的每日构建发布记录。Beta 版可能包含未完全验证的功能，请勿直接用于生产环境。

---

## 🚧 `dev` 分支测试重点（MSM 1.3.0）

以下能力已经进入 `dev`。Beta 下载是否已更新到 `beta-1.3.0`，以本页下方自动生成的最新发布区和 GitHub Release 为准。

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

> 当前 Beta 版本：`beta-1.3.0`  
> 发布时间：2026-08-29 12:22:55 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.3.0>  
> - 下载方式：同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单

### ✨ 新增（Added）
- 支持 Sing-Box 代理核心及双核心无损切换
- 新增原始股东勋章及 3D 荣誉展示重构
- 支持导出 3D 模型 (GLB) 及打印级 STL 文件
- 完善公网端口与域名入口配置管理
- 新增受管反向代理运行时及 Caddy 网关闭环
- 新增独立子节点程序与 Pro 节点管理
- 完善回家配置交付（Shadowsocks/Sing-box）
- 网络工具工作台重构与统一设计体系
- Docker Center 资源关系视图与库存清单
- 边缘服务操作记录独立筛选与概览
- 支持四种代理方案部署
- 添加 Pro 工具模块开关

### 🔧 变更（Changed）
- 移除 Mesh 功能，专注于 Cloudflare Tunnel
- 将 Surge 改为标准模块并突出 Pro 权益
- 优化仪表盘布局、动画性能及实时图表插值
- 降低 MSM 常驻内存峰值与空闲 CPU 占用
- 统一勋章渲染质感、材质及背面编号展示
- 后端初始化、鉴权与运行时隔离强化
- 日志脱敏处理并移除 URL 凭证泄露风险
- 生产镜像加固与供应链安全提升
- 前端依赖升级与安全漏洞修复
- 发布包兼容性校验逻辑增强
- 运维工作台多路由支持与权限细化
- 移除 IP 激活备选方案，仅保留授权验证

### 🐛 修复（Fixed）
- 修复代理核心切换时的控制器端口竞争问题
- 修复 Clash v1.19.30 配置兼容性与校验
- 修复仪表盘设置点击闪烁及弹窗失效问题
- 修复 Docker 容器列表实时刷新与连接状态
- 修复 Edge DNS 测试端口竞争与测速默认值
- 修复勋章 STL 打印尖刺与内翻绕序问题
- 修复无 WebGL 环境下的勋章降级显示
- 修复请求取消与进程停止的处理逻辑
- 修复 DHCP 覆盖后的 DNS 自愈机制
- 修复 Sing-Box 订阅更新中断代理问题
- 修复核心回滚失败时的配置同步回退
- 修复远程访问配置测速与直连检测
- 修复空状态下数据加载误显与色相漂移
- 修复安装绑定自动修复与重启恢复逻辑
- 修复 MosDNS 并发客户端初始化竞态
- 修复非 root 用户清理系统 DNS 的权限问题
- 修复 macOS 后端构建与 Darwin ARP 路径导入

### ⚠️ 废弃（Deprecated）
- 移除 Mesh 网关支持，聚焦 Tunnel 穿透

### 📝 备注（Notes）
- 版本更新至 v1.3.0，请备份配置文件以防兼容问题
- 部分徽章导出需浏览器支持 WebGL，否则降级显示
- 发布包结构变更，确保升级器选择正确的 msm 主程序
- Docker Agent 镜像已版本化，建议显式指定拉取标签
- 非 root 进程无法修改系统 DNS，重置时需注意权限

::: details 📋 构建信息
- **发布通道**: beta（Beta 版）
- **源提交**: [`b4a2fca`](https://github.com/msm9527/msm/commit/b4a2fcacfe8155567988ae9a05dee0691fae32e1)
- **提交信息**: 补充发布包兼容性校验 / Add release compatibility assertion
- **提交作者**: root
- **提交时间**: 2026-08-29 12:22:55 CST
:::

---

## 📚 历史 Beta 版本

> 下面仅列出最近几个 Beta 版本的主要变更，完整变更记录以 GitHub Release 为准。

### beta-1.0.14（2026-03-31 16:29） <Badge type="tip" text="Beta 版" />

- 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.0.14>

**新增 / 优化**
- 统一 MosDNS 恢复写操作重试策略
- 调整组件更新 GitHub 下载优先级

**问题修复**
- 修复 MosDNS 未启用列表插件回写失败
- 修复许可证重激活因本地材料损坏失败
- 修复 MosDNS 列表插件就绪前的回写问题

**注意事项**
- 0.x 升级 1.x 必须重置或重装 DNS 服务

---

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
