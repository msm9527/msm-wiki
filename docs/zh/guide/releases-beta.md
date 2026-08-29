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
> 发布时间：2026-08-29 13:30:57 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.3.0>  
> - 下载方式：同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单

### ✨ 新增（Added）
- 支持 Sing-Box 代理核心及无损切换
- 勋章支持原生 GLB 下载与高精度打印 STL 导出
- 仪表盘新增流星拖尾动效与平滑图表更新
- 完善系统备份恢复功能与组件更新流程
- 重构运维工作台并强化运行时安全
- 新增原始股东勋章及 Pro 权益展示
- 支持双核心回家配置交付
- 独立子节点程序与远程 Docker 节点管理

### 🔧 变更（Changed）
- 优化 MSM 常驻内存与 CPU 占用
- 升级发布包主程序选择逻辑以兼容旧版
- 重构 Docker Center 容器管理与资源视图
- 统一网络工具与远程回家界面设计体系
- 边缘反向代理管理重构与运行闭环
- 仪表盘布局优化与组件动画性能提升
- 调整 Docker Center 路由权限检测逻辑

### 🐛 修复（Fixed）
- 修复旧版本升级后的 Edge 迁移残留问题
- 修复代理核心互斥与运行时状态检测冲突
- 修复无 WebGL 环境勋章降级显示异常
- 修复 Clash 实时数据跟随控制器端口错误
- 修复 macOS 后端构建与 ARP 路径导入错误
- 修复勋章 STL 模型内翻与尖刺问题
- 修复 Docker 请求取消与进程停止处理
- 修复组网服务托管与日志统一问题
- 修复代理配置缩进和路由自愈逻辑
- 修复仪表盘设置点击闪烁与弹窗问题
- 修复 Dev 启动期 SSL 探测报错
- 修复订阅更新中断代理连接问题
- 修复 IPv6 直连解析与回滚完整性

### 📝 备注（Notes）
- 升级后需清理 Edge 升级残留文件
- 部分 3D 勋章功能依赖浏览器 WebGL 支持
- 发布包兼容性校验增强，确保主程序正确识别
- 非 Root 用户 TUN 清理跳过未修改的系统 DNS
- 前端构建隔离以避免开发页白屏问题

::: details 📋 构建信息
- **发布通道**: beta（Beta 版）
- **源提交**: [`97a1b21`](https://github.com/msm9527/msm/commit/97a1b216e457f96b8437478893bb38a26978e2bb)
- **提交信息**: 清理升级残留 Edge 文件 / Remove staged Edge companion after migration
- **提交作者**: root
- **提交时间**: 2026-08-29 13:30:57 CST
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
