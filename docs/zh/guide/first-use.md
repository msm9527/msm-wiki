# 首次使用

这页帮助你完成初始化并跑通基础的 DNS + 代理链路。安装方式见 [安装总览](/zh/guide/install)，主路由配置见 [路由器集成](/zh/guide/router-integration)。

## 0. 确认授权、备份与使用边界

在继续前，请确认：

- 当前 MSM 主机、主路由、域名、Docker 主机和相关数据属于你，或已获得明确管理授权
- 已备份现有 DNS、DHCP、路由、防火墙和代理配置
- 保留不经 MSM 的本地管理入口，断网时仍能登录主路由或主机回滚
- 使用的订阅、节点、规则、软件与外部服务来源合法且可信
- 已阅读 [合规使用规范](/zh/legal/acceptable-use)、[隐私与数据安全](/zh/legal/privacy-security) 和 [免责声明](/zh/legal/disclaimer)

## 1. 访问系统

默认访问：

```text
http://<MSM-IP>:7777
```

如果打不开，先确认 MSM 进程、监听端口和防火墙，不要直接开始配置主路由。

## 2. 初始化向导

### 创建管理员账户

- 设置管理员用户名
- 密码至少 8 位，生产环境使用独立强密码
- 邮箱可选

### 系统设置

- 选择正确时区
- Web 管理端口默认 `7777`
- HTTPS 可上传现有 PEM 证书，或生成局域网自签名证书

修改管理端口后，后续访问地址和防火墙规则都要同步调整。

### 组件参数

- 按 CPU 和系统选择合适构建
- 选择连接家庭 LAN 的网络接口
- 根据实际网络决定是否启用 IPv6
- 核对 DNS、FakeIP 和透明代理相关参数

容器环境看到的接口和地址可能属于容器网络，应结合宿主机端口与网络模式判断。

### 选择服务与代理方案

基础旁路由通常安装 MosDNS，并选择一个本地代理方案：

- **Clash Meta**：Meta 稳定版或 Alpha 预览版
- **Clash Smart**：需要对应 Pro 能力
- **Sing-Box**：reF1nd 核心

首次使用建议先选 Clash Meta 或 Sing-Box，把完整链路跑通后再评估 Smart。运行时只应有一个活动代理核心。

MSM 在这一步只安装和管理代理核心，不随附节点、订阅或网络接入服务。后续导入的内容必须由用户自行合法取得并承担使用责任。

### 完成初始化

向导会下载所需组件、生成配置、启动服务并执行就绪检查。不要只看下载完成，应等最终状态确认核心、控制接口和网络准备就绪。

## 3. 登录后的首次检查

进入仪表盘后确认：

- MSM、MosDNS 和所选代理核心状态正常
- 资源使用没有持续异常
- 页面没有配置或网络告警
- 当前活动代理方案与初始化选择一致

然后进入 **代理服务 → 概览**，确认节点、规则、连接和日志子菜单都能打开。

## 4. 接入主路由

1. DHCP DNS 指向 MSM
2. 为实际启用的 FakeIP IPv4 网段添加到 MSM 的静态路由
3. 使用 IPv6 时，再添加 FakeIP IPv6 静态路由
4. 确认默认网关和回程路径正确

默认模板常用 `28.0.0.0/8` 和 `f2b0::/18`，但必须以当前 MSM 配置为准。详细步骤见 [路由器集成](/zh/guide/router-integration)。

## 5. 配置 DNS 客户端与代理

1. 在 **DNS服务 → 客户端设置** 配置自己的手机或电脑
2. 在 **代理服务 → 代理节点** 导入订阅
3. 更新订阅并执行节点延迟测试
4. 选择策略组实际使用的节点
5. 在 **规则管理** 核对兜底规则

详见 [设备管理](/zh/guide/device-management) 和 [统一代理服务](/zh/guide/proxy)。

## 6. 验收

在已接入的客户端上分别验证：

```bash
nslookup example.com <MSM-IP>
dig A example.com @<MSM-IP>
dig AAAA example.com @<MSM-IP>
```

再发起真实访问，并在 MSM 中检查：

- **DNS 日志**是否出现查询
- **代理连接**是否命中预期规则和节点
- **代理日志**是否持续报错
- [网络工具](/zh/guide/network-tools) 中 DNS、Ping 和 HTTP 结果是否一致

## 7. 再开启扩展模块

基础链路稳定后，再按需使用：

- [域名服务](/zh/guide/domain-services)
- [Cloudflare 内网穿透](/zh/guide/cloudflare)
- [自建私网](/zh/guide/networking)
- [Docker 管理](/zh/guide/docker-center)
- [网络工具](/zh/guide/network-tools)

这些模块受系统功能开关、Pro 授权和用户角色共同控制。

## 下一步

- [完整使用流程](/zh/guide/complete-workflow)
- [使用指南总览](/zh/guide/basic-config)
- [系统设置](/zh/guide/settings)
