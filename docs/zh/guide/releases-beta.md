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
> 发布时间：2026-08-28 21:44:20 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.3.0>  
> - 下载方式：同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单

### ✨ 新增（Added）
- 支持 Sing-Box 代理核心及无损切换
- 勋章支持原生 GLB 下载与打印级 STL 导出
- 新增原始股东勋章及 3D 陈列展示
- 完善远程回家配置（含 Shadowsocks）
- Docker 独立子节点程序（Agent）发布
- 边缘反向代理管理界面重构
- 仪表盘实时图表平滑动效更新
- 新增 Pro 工具模块开关

### 🔧 变更（Changed）
- 优化 MSM 常驻内存，采用懒加载正则
- Docker Center 容器工作台深度美化与重构
- 网络工具与远程回家界面统一设计体系
- 代理核心切换流程增强安全性与稳定性
- 移除 IP 激活备选方案，收敛授权逻辑
- 日志脱敏处理，移除 URL 凭证明文
- 前端构建隔离，避免开发页白屏问题
- macOS 后端替换旧 Cocoa API 为现代接口
- 仪表盘组件布局与动画性能优化
- 统一双核心 Clash 控制界面与概览

### 🐛 修复（Fixed）
- 修复升级与托管进程恢复机制
- 修复代理核心互斥与运行时检测逻辑
- 修复 Docker 请求取消与进程停止处理
- 修复无 WebGL 环境勋章安全降级显示
- 修复 macOS 后端构建与重置回归问题
- 修复 Clash v1.19.30 配置校验兼容
- 修复勋章 M 字母 STL 尖刺与非流形边
- 修复监控数据空值导致的 JSON 序列化错误
- 修复网卡速率检测与显示异常
- 修复仪表板设置点击闪烁与弹出问题
- 修复 Sing-Box 订阅测速与冷启动稳定性
- 修复路由自愈仅针对 MSM 受管路由
- 修复 Docker 节点主动回连与连接失败状态
- 修复事件流 Cookie 鉴权丢失问题
- 修复 DHCP 覆盖后的 DNS 自愈功能
- 修复初始化阶段网络提前接管问题
- 修复核心切换期间控制器路由映射
- 修复 Sing-Box 配置更新语义明确化
- 修复 FlClash 二维码识别率提升
- 修复直连与回家配置测速失败
- 修复安装绑定自动修复功能
- 修复私有 HTTPS 上游发布安全性
- 恢复规则集表单兼容导出功能
- 修复 IPv6 直连解析问题
- 修复订阅排序与连接详情显示
- 修复 Tailscale 登录缺失时的状态快照
- 修复 Docker Center 正则首次编译
- 修复 Docker 节点健康并发配置
- 修复 Docker 概览汇总图标上色
- 修复远程回家交付与 Cloudflare 工作台

### ⚠️ 废弃（Deprecated）
- 移除 IP 激活备选方案
- 移除 Mesh 并专注 Tunnel

### 📝 备注（Notes）
- 前端构建隔离避免开发页白屏
- macOS 后端替换旧 Cocoa API
- Docker 独立子节点程序需单独部署
- 勋章 STL 导出精度提升至 4×
- 仪表盘图表引入平滑插值动效
- 代理核心切换需完整执行配置回放
- 日志脱敏处理，不再包含 URL 凭证
- 部分功能需 Pro 授权才能使用
- Sing-Box 核心切换支持无损重启
- 内存优化：OUI 数据库与懒加载正则

::: details 📋 构建信息
- **发布通道**: beta（Beta 版）
- **源提交**: [`ba7c1f6`](https://github.com/msm9527/msm/commit/ba7c1f682963f03c726d230ee0cf64eaaaa2a80f)
- **提交信息**: chore(release): 升级版本至 1.3.0 / bump version to 1.3.0
- **提交作者**: root
- **提交时间**: 2026-08-28 21:44:20 CST
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
