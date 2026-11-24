---
title: Clash 管理
description: MSM 的 Clash 与 Clash Smart 内核管理、智能选路调优与合规使用边界
outline: deep
---

# Clash 管理

Clash 是 MSM **统一代理服务** 中的一类本地管理方案。节点、规则、连接和日志的基础操作请从 [统一代理服务](/zh/guide/proxy) 开始；本页重点说明 Clash Meta 与 Clash Smart 的核心差异、智能选路调优与排障要点。

::: info 文档命名与技术标识
文档面向用户统一使用 **Clash** 和 **Clash Smart**。当前方案使用 MetaCubeX 兼容上游原版内核及 Smart 变体，因此命令行、API、进程名、目录或旧版配置中仍可能出现技术标识 `mihomo`。这些标识仅用于技术区分，不代表 MSM 提供任何网络接入服务。
:::

::: warning 只提供管理能力
MSM 只管理用户自行提供且有权使用的 Clash 内核、配置、规则、节点和订阅。项目不提供节点、订阅、网络接入、内容分发或任何违法违规服务，也不授权将该功能用于未授权访问、侵权或其他违法违规活动。用户应对数据来源、使用授权、具体用途和当地合规负责。
:::

## 核心类型

### Clash Meta

Clash Meta 方案使用上游官方原版内核，支持稳定版和 Alpha 预览版。稳定版适合日常长期运行；Alpha 适合需要体验上游新特性且能自行排查兼容问题的用户。

### Clash Smart

Clash Smart 使用上游官方 Smart 变体原版二进制（MSM 下载时自动校验官方发布摘要、版本与架构，不添加非标准补丁），在传统延迟测速之外引入目标历史质量评分、ASN 偏好与可选 LightGBM 推理选路。启用需要满足：

- 已激活 Pro 授权
- 当前账号具备 `proxy.manage` 权限
- 在 **系统设置 → 功能开关** 中开启 Clash Smart

Smart 配置与 Meta / Alpha 并不等价，请始终通过 MSM 的 **代理服务 → 概览** 切换方案，让系统自动完成迁移与校验，不要手动覆盖核心文件。

## 可管理能力

- 结构化配置编辑器与原始 YAML 编辑器（带在线语法与核心校验）
- 订阅管理、节点测速、策略组与图标联动
- 规则、Rule Provider 与分流策略管理
- 实时连接、流量统计、规则命中分析与手动断开/降权
- TUN、FakeIP 双栈、通用代理参数与高级设置
- Shadowsocks、VLESS、Trojan、AnyTLS、Hysteria2、TUIC v5 远程回家监听器（统一使用标准 `type: direct` + `routing-mark` 回家出站）
- 配置历史版本、差异对比与一键回滚

## 推荐上手流程

1. 在 **代理服务 → 概览** 选择 Clash Meta 或 Clash Smart，等待准备、迁移、网络、控制器与状态验收完成
2. 在 **代理节点** 导入/更新订阅并执行可用性测试
3. 在 **规则管理** 核对规则顺序与策略组指向
4. 在 **连接管理** 观察实际新连接的命中规则与出口链路
5. 在 **日志查看** 确认无持续配置或拨号告警

## Clash Smart 自动选路与调优

Smart 核心、`type: smart` 策略组和实际流量路径必须同时生效，自动选路才会工作。LightGBM 与 ASN 均为增强项，关闭它们时 Smart 依然会使用传统质量评分自动选路；`collectdata` 只控制训练样本导出，并不是自动选路总开关。

### 1. 判断是否真正处于自动选路

1. 确认当前运行的是 Smart 核心，规则命中的业务组最终指向 `type: smart` 策略组，且该组内至少有两个可用候选节点。`mode: direct`、全局模式指向固定出口或业务组写死单个节点都会绕开 Smart。
2. 检查策略组是否被**手动固定**：在节点页手动点击某个节点会锁定出口，即使该节点后续失效也不会自动切换。点击 **恢复自动选择** 会同时清除内核内存和持久化记录（`profile.store-selected: true` 会持久保存手动选择，切核心或重启不会自动解除）。
3. 自动状态下核心返回的 `now` 固定显示 `Smart - Select`——这不是具体节点名，也不会轮流变化。要观察实际出口，请前往 **连接管理** 查看新建立连接的出口链；同一时刻不同目标域名会自动走不同节点。
4. 恢复自动选择不会迁移已经建立的健康 TCP 连接，验证时请发起新的连接。

### 2. Smart 专属参数与运行时维护

在 **代理编辑 → 配置 → Smart 核心设置**（直接可见，无需开启高级模式）中可以配置以下关键参数与资产：

| 参数 / 功能 | 说明与建议值 |
|-------------|--------------|
| **LightGBM 模型预设** | 支持选择官方 **Light / Middle / Large** 模型或自定义 `lgbm-url`，查看 `Model.bin` 状态并支持一键刷新 |
| **ASN 数据库（`ASN.mmdb`）** | 可配置 `geox-url.asn` 并启用 `prefer-asn`，结合目标 ASN 提升同类站点选路稳定性 |
| **`tolerance`（延迟容差）** | 单位毫秒（`0–65535`），容差内的节点视为同等延迟以减少抖动切换 |
| **`policy-priority`（策略优先级）** | 按节点名称（支持子串或正则）调节权重系数，多条以英文分号 `;` 分隔，如 `Premium:1.3;Backup:0.8`（`> 1` 提高优先级，`< 1` 降低优先级；节点名含冒号需写 `\:`） |
| **`sample-rate`（采样率）** | 仅在 `collectdata: true` 时生效，有效范围 `(0, 1]`（默认 `1`）；不需要导出 `smart_weight_data.csv` 时直接关闭 `collectdata` |
| **节点权重排行与一键清缓存** | 在代理节点页和规则页可按 **Smart 权重** 排序（区分常用/偶用/少用），并在顶栏一键清空 Smart 学习缓存 |
| **活跃连接降权切换** | 在 **连接管理** 列表可直接点击 **降权切换节点**，连接详情弹窗会展示 `smartTarget`、`smartBlock`、`exitGeoIP`、`exitIPASN` 与 `destinationIPASN` |

修改 `lgbm-url` 或 `geox-url.asn` 保存后，MSM 会自动下载并校验对应文件。

### 3. 健康检查必须同时配置策略组与 `proxy-providers`

通过 `use` 或 `include-all-providers` 引入的订阅节点，其定时探活由 **`proxy-providers` 自身的 `health-check`** 调度，策略组上的 `interval`、`timeout`、`lazy` **不会覆盖** 订阅集合已有的值。

如果策略组设为 60 秒检测，但 `proxy-providers` 仍保留 300 秒与 `lazy: true`，订阅节点仍会按 300 秒甚至闲置跳过检测。MSM 新建 Smart 组与订阅集合时默认使用一致的积极探活参数：

```yaml
proxy-providers:
  provider_a:
    type: file
    path: ./proxy_providers/provider_a.yaml
    health-check:
      enable: true
      url: https://detectportal.firefox.com/success.txt
      expected-status: '200'
      interval: 60
      timeout: 2000
      lazy: false

proxy-groups:
  - name: Smart
    type: smart
    use: [provider_a]
    url: https://detectportal.firefox.com/success.txt
    expected-status: '200'
    interval: 60
    timeout: 2000
    max-failed-times: 3
    lazy: false
    uselightgbm: false
    collectdata: false
    prefer-asn: false
```

- 检测 URL 必须能在代理链路中稳定访问，且 `expected-status` 与之匹配（例如 `generate_204` 应填写 `'204'`）
- `lazy: false` 会持续周期探活，请结合节点数量合理设置 `interval`
- Smart 对同一目标默认存在约 600 秒的选路缓存（失败或质量显著下降时会提前失效），不会承诺每次都挑瞬时延迟最低的节点；如果希望严格按单一测速 URL 的最低延迟切换，请使用 `url-test` 策略组

## 配置注意事项

- FakeIP IPv4 / IPv6 网段与 DNS 监听端口必须与 MosDNS 及主路由静态路由保持一致
- Smart 专用字段（如 `type: smart`、`uselightgbm`、`policy-priority`）不能残留在 Meta / Alpha 配置中
- 混用结构化编辑与原始 YAML 编辑后，保存前建议查看差异预览
- 不要让 Clash 与 Sing-Box 同时接管透明代理网络

## 远程回家

远程回家已整合进统一 **回家与私网** 工作台（`/networking/inbound` 与 `/networking/delivery`），详见 [远程回家](/zh/guide/home)。保存前会使用当前核心校验完整配置，失败时自动回滚至上一可用版本。

## 故障排查

### 切换到 Smart 失败

- 确认 Pro 授权有效、`proxy.manage` 权限满足且已打开 Clash Smart 功能开关
- 查看切换进度弹窗是否提示核心下载校验失败或配置字段不兼容
- 检查配置中是否存在无法迁移的自定义模板字段

### 保存后核心无法启动

- 先点击页面内的 **配置校验** 查看具体语法/字段报错
- 在 **日志查看** 检查最近的核心启动日志
- 使用 **配置历史** 一键回滚至上一个可用版本，并核对是否将 Smart 专有字段留在了 Meta 配置中

### Smart 一直走同一个节点不切换

- 在节点页确认该 Smart 策略组未处于手动锁定状态，必要时点击 **恢复自动选择**
- 确认组内至少有两个健康节点，且 `proxy-providers` 下的 `health-check` 已正确配置 `expected-status` 与 `interval`
- 对表现异常的目标连接，可在 **连接管理** 直接点击 **降权切换节点** 触发重新选路

## 下一步

- [统一代理服务](/zh/guide/proxy)
- [Sing-Box 核心](/zh/guide/singbox)
- [远程回家](/zh/guide/home)
- [日志查看](/zh/guide/logs)
