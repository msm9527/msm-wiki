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
- 新增 Sing-Box 代理核心支持与无损切换
- 重构荣誉勋章 3D 陈列，支持 GLB/STL 导出
- 完善多协议远程回家配置交付（含 Shadowsocks）
- 重塑 Docker Center 容器工作台与资源视图
- 内置受管反向代理运行时，统一域名服务界面
- 新增独立 Docker Agent 子节点程序
- 仪表盘新增流星图表动效与实时数据优化
- 完善组件更新与备份恢复流程
- 突出展示 Surge 权益，增加购买与社群入口
- 网络工具重构为统一 Workbench 设计体系

### 🔧 变更（Changed）
- 修复升级包主程序选择，兼容旧升级器版本
- 隔离前端构建目录，避免开发页白屏问题
- 移除 IP 激活备选方案，Surge 改为独立模块
- 降低 MSM 常驻内存，使用懒加载正则与紧凑 OUI 库
- 强化托管进程恢复，支持跨平台信号处理
- 脱敏日志并移除 URL 凭证，拒绝伪二进制版本
- 统一代理服务，实现核心无损切换与安全门控
- 修复 DHCP 覆盖后的 DNS 自愈逻辑
- 发布版本化独立镜像，优化 Docker Agent 体积
- 全站 Ops 界面质感升级，统一强调色与左条指示

### 🐛 修复（Fixed）
- 修复 Clash v1.19.30 配置校验与 Smart 字段残留
- 修复 Clash 流量/版本跟随控制器端口与 Secret
- 修复“设置”点击闪烁及弹不出问题
- Dev 后端探测优先匹配当前页面协议，消除 SSL 报错
- 自动修复安装绑定失败导致的连接问题
- 修复 Sing-Box 订阅测速及健康检查异常
- 修复核心切换期间控制器路由丢失问题
- 修复初始化阶段网络提前接管导致的冲突
- 修复网络管理页空数据崩溃及请求中误显
- 无 WebGL 时安全降级勋章，修复 M 字母 STL 尖刺
- 修复证书续期调度时的内存分配峰值
- 正确处理 Docker 中心请求取消与进程停止
- 稳定跨平台进程与核心切换测试时序
- 移除 Darwin ARP 路径无效导入
- 允许非 root TUN 清理跳过未修改的系统 DNS

### 📝 备注（Notes）
- 1.2.6 及更早版本会选择最后一个 msm-* 条目作为升级目标
- Docker 环境新增 `MSM_DOCKER=1` 环境变量标识
- 发布构建需使用隔离目录，避免 Vite 缓存影响
- 非 root 用户无法修改系统 DNS，重置时需留意
- 部分 3D 勋章功能依赖 WebGL，不支持则降级显示

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
