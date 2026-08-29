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
> 发布时间：2026-08-29 13:17:55 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.3.0>  
> - 下载方式：同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单

### ✨ 新增（Added）
- 支持 Sing-Box 代理核心及双核心无损切换
- 勋章系统新增 3D 展示、GLB 下载及打印级 STL
- 边缘服务内置受管反向代理运行时（Caddy）
- 远程回家支持双格式配置（Sing-box/MosDNS）
- Docker Center 新增独立子节点程序与资源视图
- 备份恢复功能增强，支持组件更新与模块归档
- 仪表盘新增流星图表动效与平滑插值更新

### 🔧 变更（Changed）
- 优化仪表盘布局与动画性能，统一组件质感
- 重构网络工具与远程回家界面为统一 Workbench
- 升级 Docker Center 容器管理交互与资源清单
- 降低 MSM 常驻内存，使用紧凑 OUI 数据库
- 发布包主程序选择逻辑调整，兼容旧升级器
- 前端构建隔离，避免开发环境缓存干扰
- 代理核心切换增加互斥校验与运行时检测

### 🐛 修复（Fixed）
- 修复旧版本升级后的 Edge 迁移问题
- 修复 macOS 后端构建与 ARP 路径导入错误
- 修复代理核心切换请求断线与端口竞争
- 修复无 WebGL 环境下勋章安全降级显示
- 修复 Docker 容器列表实时刷新与连接状态
- 修复日志窗口切换显示与下载功能
- 修复网卡速率检测与显示异常
- 修复 Clash 实时数据跟随控制器端口与 Secret
- 修复仪表盘中设置点击闪烁与弹不出问题
- 修复勋章 STL 内翻并提升打印精度
- 修复发布构建与 3D 降级回退逻辑
- 修复进程停止与请求取消处理不当
- 修复组网服务托管与日志统一性问题
- 修复订阅更新中断代理核心运行
- 修复 IPv6 直连解析与 DHCP 覆盖后 DNS 自愈
- 修复代理方案安全切换与 Fake-IP 路由
- 修复初始化阶段网络提前接管问题
- 修复 Sing-Box 冷启动与无损切换稳定性
- 修复 Clash 配置中 Smart 锚点残留
- 修复 Surge 外部模式下载仅经 Surge 路由
- 修复 MosDNS 并发客户端初始化竞态
- 修复 Docker 节点主动恢复连接与额度验证
- 修复 Docker 目标菜单遮挡导航栏问题
- 修复短视口下浮层遮挡冲突
- 修复 Docker 控制台与总览压缩设计
- 修复 Docker 资源页与移动端体验统一性
- 修复 Docker Control Deck 视觉系统
- 修复 Docker Center 后端与节点代理
- 修复 Docker 开发环境与双模式接入
- 修复 Sing-Box 与 Clash 功能对齐
- 修复域名服务导航与高密度界面
- 修复 DDNS、证书与 Caddy 网关闭环
- 修复核心切换端口竞争和延迟失败
- 修复暴露 Clash API 和对齐 Zashboard 显示
- 修复 Sing-Box 订阅测速健康检查
- 恢复独立代理管理首页
- 统一双核心 Clash 控制界面
- 概览页支持安全切换核心
- 稳定 Sing-Box 冷启动与无损切换
- 同步 Surge 协议默认端口
- 强制外部流量仅走 Surge
- 支持 Smart 核心切换与配置兼容
- 完善 Sing-Box 真实回归
- 清理 Meta 配置中的 Smart 锚点
- 识别普通组残留 Smart 字段
- 清理 Smart 组普通字段
- 统一代理服务并实现核心无损切换
- 清理旧 Smart 配置字段
- 拒绝伪二进制版本回退
- 加固 Smart 核心切换与兼容
- 将 Surge 改为独立模块
- 在 Pro 详情突出 Surge
- 完善外部 Surge 引导
- 外部模式下载仅经 Surge
- 停止服务后同步模板
- 加固 MosDNS 升级与容器回归
- 回滚失败的进程配置同步
- 收紧 reF1nd Sing-Box 配置链路
- 补充 Pro 代理权益与模式门控
- 保留本地子进程退出处理
- 完善智能核心与外部 Surge 管理
- 支持 Sing-Box 代理核心
- 完善回家自动检测与 Docker 映射
- 完成 Shadowsocks 回家配置
- 固化 Docker 开发环境
- 以 dev 为准同步 main 合并基线

### 📝 备注（Notes）
- 版本号已更新至 v1.3.0
- 部分 3D 勋章功能需浏览器支持 WebGL
- 旧版升级后首次运行可能触发 Edge 迁移
- 发布包兼容性校验增强，确保 msm 主程序正确

::: details 📋 构建信息
- **发布通道**: beta（Beta 版）
- **源提交**: [`43e44fa`](https://github.com/msm9527/msm/commit/43e44faed19cc2f9414dc5bd25eb46f741f39f17)
- **提交信息**: 修复旧版本升级后的 Edge 迁移 / Migrate Edge companion after legacy upgrades
- **提交作者**: root
- **提交时间**: 2026-08-29 13:17:55 CST
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
