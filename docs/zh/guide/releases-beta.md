# 🧪 Beta 版发布

用于查看 MSM `dev` 分支的每日构建发布记录。Beta 版可能包含未完全验证的功能，请勿直接用于生产环境。

---

## 🚧 `dev` 分支尚未发布变化（2026-08-01 至 2026-08-15）

以下能力已经进入 `dev`，但 GitHub 当前最新 Beta Release 仍是 `beta-1.2.6`。它们不代表已有同名可下载版本；测试时以具体构建提交和页面实际状态为准。

- 统一代理服务强化跨 Mihomo / Sing-Box 安全切换、配置迁移、网络恢复和就绪验证
- 远程回家扩展为 Shadowsocks、VLESS、Trojan、AnyTLS、Hysteria2、TUIC v5 六种协议
- 新增 EasyTier、Tailscale / Headscale、WireGuard 三引擎自建私网
- 网络工具与 Docker 管理重构为运维控制台，并强化查看者 / 操作员权限边界
- Cloudflare Tunnel 支持同一 Tunnel 最多 32 条跨 Zone 路由，网页穿透与云端私网可并行管理
- 域名服务内置受管反向代理运行时，完善 DDNS、证书、反向代理、访问日志和运行时修复
- 配置写入增强注释与字段顺序保留，系统网络增加 DNS / FakeIP 自愈
- 授权页收敛支持与社群入口，自助撤销要求授权邮箱和授权码，并移除 IP 激活备选路径

本 Wiki 的功能专题按当前 `dev` 界面维护；稳定版或 `beta-1.2.6` 中看不到某个入口时，请先核对版本，而不是按文档强行调用新接口。

---

## 🧪 最新 Beta 版本

> 当前 Beta 版本：`beta-1.2.6`  
> 发布时间：2026-07-27 15:14:53 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.2.6>  
> - 下载方式：同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单

### ✨ 新增（Added）
- License 三层连接兜底（直连/DNS/SOCKS5）
- Mihomo 连接页改用 WebSocket 实时流
- 代理管理页支持内联编辑订阅与节点
- 规则页集成拖拽排序与依赖校验
- 新增 Mihomo API 错误日志统一处理
- 日志节流功能，抑制重复信息
- MosDNS 高级模式状态持久化
- 前端界面多语言翻译支持

### 🔧 变更（Changed）
- 应用重启前增加配置验证流程
- 预期运行态错误降级为 Warn 无堆栈
- 首页 Dashboard 渲染性能优化
- react-markdown 模块懒加载

### 🐛 修复（Fixed）
- 修复组件更新失败重试风暴问题
- 修复 nftables fd 越界导致崩溃
- 修复 Mihomo TUN 配置回放丢失问题
- 修复 Linux/macOS TUN 自愈与残留清理
- 修复 fakeip 路由丢失后静默失效
- 修复 HTTP/HTTPS 切换后地址不同步
- 修复租约冲突误报日志
- 修复 MosDNS 记忆池安全一致性问题
- 修复重启后订阅状态误标禁用
- 修复桌面托盘与服务进度显示
- 修复 macOS TUN 默认配置
- 缩短 FakeIP 缓存陈旧窗口至 10 分钟
- 彻底清理服务卸载残留文件
- 未激活状态下停止上报遥测数据

### 📝 备注（Notes）
- 实测后端日志体积下降约 42%
- nftables 内核升级至 ce5261f8
- Fake-IP 默认值统一为 28.0.0.1/8
- Pro 授权离线降级策略调整
- 遥测数据仅在激活后启动

::: details 📋 构建信息
- **发布通道**: beta（Beta 版）
- **源提交**: [`0a73742`](https://github.com/msm9527/msm/commit/0a73742f374f8131c03807fdc0871de397d83a6c)
- **提交信息**: chore: 更新版本到 1.2.6 / bump version to 1.2.6
- **提交作者**: msm
- **提交时间**: 2026-07-27 15:14:53 CST
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
