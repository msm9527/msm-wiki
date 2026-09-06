# 📦 版本发布

用于查看 MSM 各版本的更新内容和升级建议。

开发分支（`dev`）的每日构建请查看：[Beta 版发布](/zh/guide/releases-beta)。

---

## 🚀 最新稳定版本

<div class="msm-release-hero msm-release-hero--stable" data-version="1.2.6" data-release-date="2026-07-27 16:07:30 CST" data-release-url="https://github.com/msm9527/msm-wiki/releases/tag/1.2.6">
  <div class="msm-release-hero-copy">
    <span class="msm-release-kicker">MSM / 稳定版</span>
    <h3 class="msm-release-version"><span>稳定版</span> <code>v1.2.6</code></h3>
    <p class="msm-release-lede">同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单</p>
  </div>
  <div class="msm-release-actions">
    <a class="msm-release-action msm-release-action--primary" href="https://github.com/msm9527/msm-wiki/releases/tag/1.2.6" target="_blank" rel="noreferrer">查看 Release <span aria-hidden="true">↗</span></a>
    <a class="msm-release-action" href="/zh/guide/install-linux.html">安装指南 <span aria-hidden="true">→</span></a>
  </div>
</div>
<div class="msm-release-metrics" aria-label="发布概览">
  <div class="msm-release-metric"><span>版本</span><strong>v1.2.6</strong></div>
  <div class="msm-release-metric"><span>发布时间</span><strong>2026-07-27 16:07:30 CST</strong></div>
  <div class="msm-release-metric"><span>源提交</span><a href="https://github.com/msm9527/msm/commit/dd17a5502c662932df341cfbd58271d38bab77bf" target="_blank" rel="noreferrer"><code>dd17a55</code></a></div>
  <div class="msm-release-metric"><span>发布类型</span><strong>稳定版</strong></div>
</div>
<p class="msm-release-download-note"><span>下载说明</span>同一发布页内提供各平台二进制、安装包、派网 APX 与 SHA256 校验清单</p>

### 📋 本次更新

::: tip ✨ 新增（Added）
- 勋章展示系统（3D、画廊、导航栏、登录页）
- 连接页改用 WebSocket 实现实时流
- 代理管理支持内联编辑订阅与节点
- 规则页支持批量导入、热重载与联动
- 确认/选择弹窗使用 Portal 解决遮挡
- MosDNS 增加记忆池容量显示与清空
- MosDNS 高级模式状态持久化
- Clash 编辑对话框防意外关闭
:::

::: info 🔧 变更（Changed）
- 心跳间隔增至 30 分钟，失败阈值增至 8 次
- 测速探测 URL 统一为 http gstatic generate_204
- 策略组标签更名为代理组
- Toast 容器层级提升至 10000
- 前端资源缓存策略优化（index.html 不缓存）
- 后端日志噪音降低（移除无信息量堆栈）
- 前端 react-markdown 改为懒加载
:::

::: danger 🐛 修复（Fixed）
- Clash 订阅节点测速 404 回退健康检查
- Clash 订阅更新瞬时错误增加有限重试
- Clash 配置并发写入临时文件竞态修复
- Clash v1.19.28 节点显示不全修复
- Nftables fd 越界崩溃修复（升级 fork）
- Alpine 系统进程指纹漂移导致重启循环修复
- 外部重启后托管服务自动恢复机制修复
- 许可证 5xx 网关错误视为瞬时错误处理
- 许可证租约有效时日志降级消除误报
- 已知未安装服务日志返回空而非 404
- 前端 Chunk 预加载错误自动硬刷新自愈
- 订阅内节点延迟测速结果同步刷新
- TUN 网络自愈与残留规则清理修复
- macOS TUN 局域网转发修复
- Tauri 可配置 daemon 地址及启动卡住修复
- 桌面端托盘切换与服务进度修复
- MosDNS 审计降级与组件就绪等待修复
- FakeIP 路由丢失后静默失效修复
- Bing/NVIDIA 域名解析路径一致性修复
- 策略组表单 TS 编译错误修复
- 启用中的订阅重启后被误标禁用修复
- 应用并重启前增加配置验证步骤
- 服务卸载残留彻底清理
- Launchd 服务更新接管旧进程
- 安全客户端版本来源动态同步
:::

::: info 📝 备注（Notes）
- 本次发布版本号升级至 1.2.6
- 日常开发修复请在 dev 分支进行
- 勋章等部分功能需 Pro 授权
- 激活/心跳支持源站 IP 直连兜底
:::

::: details 📋 构建信息
- **发布通道**: stable（稳定版）
- **源提交**: [`dd17a55`](https://github.com/msm9527/msm/commit/dd17a5502c662932df341cfbd58271d38bab77bf)
- **提交信息**: Merge pull request #60 from msm9527/dev
- **提交作者**: msm
- **提交时间**: 2026-07-27 16:07:30 CST
:::

---

## 📚 历史版本

> 下面仅列出最近几个版本的主要变更，完整变更记录以 GitHub Release 为准。

::: details v1.2.5 · 2026-07-17 15:54 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.2.5" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 勋章系统升级为真 3D（WebGL/React Three Fiber）
- 代理管理页支持内联编辑订阅与节点
- 规则页集成规则集编辑与批量导入功能
- 连接页改用 WebSocket 实时流更新
- MosDNS 保存高级模式状态到本地存储
- 新增策略组与规则集编辑 Hook
- 代理页折叠/hover 动效增强
- 升级 react-grid-layout 到 v2 版本
- 心跳与激活逻辑优化，提升稳定性与体验
- 「应用并重启」统一改为验证配置后执行
- 进程身份指纹改用 start ticks 修复 Alpine 断开
- 前端资源哈希失效自动恢复机制
- 服务日志返回空而非 404 消除轮询噪音
- 优化首页 Dashboard 交互与连接页渲染性能
- react-markdown 组件实现懒加载优化

**问题修复**
- 修复 Clash TUN 配置回放、macOS 默认及 Fake-IP 值
- 修复 HTTP/HTTPS 切换后运行地址同步问题
- 修复 Linux TUN 自愈、残留规则清理及转发
- 修复订阅更新瞬时拉取错误导致失败
- 修复订阅节点测速后延迟显示不同步
- 修复未安装服务的日志接口返回 404 问题
- 修复启动后启用中的订阅被误标为禁用
- 修复 fakeip 路由丢失导致透明代理静默失效
- 修复确认/选择弹窗被浮窗遮挡的定位问题
- 修复 MSMDaemon 安装管理与启动卡住问题
- 修复 DNS 入池条件误判中毒问题（仅 NXDOMAIN）
- 修复网关 5xx 错误导致 Pro 授权意外降级
- 修复未激活用户上报 telemetry 被服务端拉黑
- 修复策略组表单 TS 编译错误及显示不全

**注意事项**
- 租约有效时 lease mismatch 日志降为 Debug
- 离线动作授权降级为“除显式拒绝外有效”
- 源站 IP 直连兜底解决代理/CDN 链路 502
- 移除 @types/react-grid-layout（v2 自带类型）
:::

::: details v1.2.2 · 2026-06-17 16:08 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.2.2" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**注意事项**
- 分析显示该提交为开发标记，关联 #58，详细功能待确认。
:::

::: details v1.2.0 · 2026-06-10 16:13 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.2.0" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- MosDNS 高级模式状态自动保存到本地
- 添加记忆池容量显示与一键清空功能
- Clash 编辑对话框增加防误关确认

**问题修复**
- 优化 DNS 解析逻辑，修复 FakeIP 缓存及入池规则
- 升级 License 安全机制，未激活禁止 Telemetry 上报
- 修复软失败判定漏洞，改为 Fail-Secure 模式
- 修复 TUN 网络转发、路由丢失及配置回放问题
- 修复 Daemon 启动卡顿、服务管理及卸载残留
- 修复桌面托盘切换、版本同步及 MosDNS 就绪
- 修复 MosDNS 记忆池安全及数据一致性问题

**注意事项**
- macOS 用户注意：TUN 局域网转发及默认配置已修复
:::

::: details v1.1.7 · 2026-05-16 14:37 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.1.7" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 添加默认代理 CIDR 216.239.36.0/24
- 审计存储展示分解与字段透传支持
- 优化自动判定批量操作与页面加载性能
- 优化 MosDNS 自动判定冲突模型与标签语义
- 优化高变化域名及 MosDNS 缓存策略
- 调整通知弹窗居中显示与排版
- 优化规则源配置、日志分页与升级验证
- 增强进程管理与升级回滚可靠性

**问题修复**
- 修复 MosDNS 自动判定确认语义
- 修复配置恢复兼容性与订阅直连问题
- 修复自动判定与升级缓存逻辑
- 修复更新轮询构建错误及状态恢复

**注意事项**
- 0.x 升至 1.x 需重装或重置安全并重下 DNS 服务
:::

::: details v1.1.2 · 2026-05-04 07:20 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.1.2" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 升级页支持恢复、应用及保留 MosDNS 配置
- 调整 MosDNS 快路径 TTL 范围

**问题修复**
- 优化 MosDNS FakeIP TTL 处理

**注意事项**
- 0.x 升级至 1.x 需重置安全并重下 DNS 服务
:::

::: details v1.1.1 · 2026-05-03 17:52 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.1.1" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 限制 MosDNS 更新需先升级 MSM

**问题修复**
- 修复许可证掉授权与 machine_code 回退
- 修复增量升级配置恢复与恢复加固
- 修复战网国内外 DNS 分流规则
- 修复 MosDNS 原始指标代理异常
- 修复本机分流模板保留及缓存同步问题

**注意事项**
- 0.x 升 1.x 必须重装或重置安全并重新下载 DNS 服务
:::

::: details v1.1.0 · 2026-04-30 01:39 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.1.0" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 支持国内外 ECS 策略分离
- 增加授权容灾功能
- 隐藏废弃及国外 ECS 上游入口
- 简化 MSM ECS 设置展示及缓存统计
- 同步缓存与上游默认值

**问题修复**
- 修复增量升级配置兼容性
- 修复 ECS 策略状态类型错误
- 修复激活页面 503 状态提示
- 修复 OpenRC 重启及自重启逻辑
- 修复 Docker Pro 授权掉线问题

**注意事项**
- 0.x 升 1.x 需重装或重置安全并重下 DNS 服务
:::

::: details v1.0.35 · 2026-04-27 20:14 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.35" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 降低默认运行时内存预算

**问题修复**
- 修复强制更新下载后无法安装的问题

**注意事项**
- 0.x 升级至 1.x 需重置安全并重新下载 DNS 服务
:::

::: details v1.0.33 · 2026-04-26 19:28 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.33" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 新增备份恢复与更新流程安全防护功能。
- 支持 MosDNS 白名单模式下本机代理。
- 增强 MSM CLI 服务管理与重启状态同步。
- 强化进程托管自愈逻辑与异常清理机制。
- 统一更新下载回退策略及风险评分调整。
- 收紧 Pro 在线授权并下发安全限制。

**问题修复**
- 修复代理网络自愈误判及双栈健康检查。
- 优化 MosDNS 缓存容量、策略及规则刷新。
- 修复前端黑屏、表单校验及版本列表显示。
- 修复冷启动接管及托管进程异常退出清理。
- 修复备份归档安全性及 API Token 状态误判。

**注意事项**
- 0.x 升级 1.x 必须重置安全并重新下载 DNS 服务。
:::

::: details v1.0.27 · 2026-04-16 14:28 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.27" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 新增规则集文件编辑功能
- 新增日志悬浮窗交互优化及 5 项 UX 改进
- 新增更新配置桌面端右栏常驻，移动端折叠显示
- 合并安装和重启按钮为一个操作
- 日志页面迁移至浮动窗口，侧边栏移除入口
- 更新页面 UI 美化，修复平台翻译
- MosDNS 恢复原始重试策略，优化网络请求逻辑
- 性能提升：Clash 配置接口合并，API 调用减少 125 倍
- 性能优化：SSE 数据迁移至 Zustand，消除级联重渲染

**问题修复**
- 修复更新重启死循环，清理构建备份
- 修复更新下载跳过中转服务器，避免误装 Beta 版本
- 修复强制更新后无法安装重启及 Clash 版本显示异常
- 修复更新模块 UI 重构、组件状态感知及按钮显示问题
- 修复嵌入式前端黑屏、轮播模式 Bug 及外观设置问题
- 修复日志页循环请求、运行时错误及循环依赖
- 修复 MosDNS 规则查询走系统代理及配置恢复超时
- 修复 Inline 规则集 Payload 序列化错误
- 修复本地服务 HTTP 请求绕过系统代理问题

**注意事项**
- 0.x 升级到 1.x 需重装或重置安全，重新下载 DNS 服务
:::

::: details v1.0.26 · 2026-04-16 12:35 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.26" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 更新配置桌面端右栏常驻，移动端折叠
- 合并安装和重启为一个操作按钮
- 支持规则集文件在线编辑功能
- 日志页面迁移至浮动窗口，移除侧边栏
- 更新页面 UI 美化及平台翻译修复
- 日志窗口交互优化及 5 项 UX 改进
- 配置接口合并，API 调用从 5 次减至 1 次
- SSE 数据迁移至 Zustand store 消除重渲染
- MosDNS 恢复原始 3×500ms 重试策略

**问题修复**
- 修复嵌入式前端黑屏问题
- 修复更新模块状态、按钮及版本显示异常
- 修复强制更新安装重启流程及版本显示问题
- 修复轮播模式 Bug 及外观设置页面问题
- 修复规则查询及本地服务代理配置错误
- 修复日志页循环请求及运行时错误
- 更新下载跳过中转服务器避免 Beta 版

**注意事项**
- 0.x 升至 1.x 需重装或重置安全并重新下载 DNS
:::

::: details v1.0.25 · 2026-04-16 11:52 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.25" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 更新配置桌面端常驻，移动端折叠显示
- 合并安装和重启操作为单一按钮
- 支持规则集文件在线编辑功能
- 日志页面迁移至浮动窗口，优化交互
- 优化配置接口调用及 SSE 数据渲染性能
- MosDNS 恢复原始重试策略

**问题修复**
- 修复更新模块 UI、版本显示及安装重启流程问题
- 跳过中转服务器更新，防止误装 Beta 版本
- 修复本地服务及规则查询的系统代理逻辑
- 修复 MosDNS 升级后配置恢复超时问题
- 修复轮播模式 Bug 及外观设置页面问题
- 修复日志页循环请求及相关运行时错误
- 修复规则集文件序列化导致崩溃问题

**注意事项**
- 0.x 升级 1.x 需重装或重置 DNS 服务
:::

::: details v1.0.24 · 2026-04-13 23:41 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.24" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 调整代理网络自愈策略：默认关闭，放宽判定，间隔 3 秒
- 默认禁用 libpcap 依赖，保留显式构建支持

**问题修复**
- 修复代理网络规则丢失、误判及重启重复恢复问题
- 修复 MosDNS 日志交互、概览及就绪判定问题
- 修复 Clash YAML 保存及粘贴错位兼容性问题
- 修复更新页面状态残留及 Alpha 版显示问题

**注意事项**
- 0.x 升级至 1.x 需重置安全或重装 DNS 服务，否则可能失效
:::

::: details v1.0.22 · 2026-04-11 00:57 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.22" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 支持 Fake-IP 范围在设置页编辑并立即生效
- 支持 HTTPS 证书上传及自签名生成
- Setup 支持自动下载和手动上传安装方式
- 新增 CLI 自更新命令及平台版本选择修复
- MosDNS 客户端黑白名单拆分适配
- 补齐进程管理前端控制面与服务配置接口
- 前端统一将旧代理核心 / ProxyCore 显示名调整为 Clash
- 默认隐藏实验性 Docker 管理和网络工具入口
- 启动链路切换，移除旧版 supervisord 依赖
- 系统设置页面布局优化及个人中心入口迁移
- 优化前端构建分包，消除 Vite 大 chunk 警告

**问题修复**
- 修复升级残留进程导致的端口冲突问题
- 修复重启时能力丢失导致 Pro 授权失效问题
- 修复 MosDNS 上游统计及 DNS 查询曲线停滞
- 修复 Linux 下僵尸进程误判及单节点 YAML 解析
- 修复配置文件保存时二进制路径查找错误
- 修复日志页筛选异常及访问日志降噪处理
- 修复服务关闭时 SSE 长连接导致的超时问题

**注意事项**
- ⚠️ 0.x 升级到 1.x 需重装或重置安全以重新下载 DNS 服务
- ⚠️ 加固了 Pro 授权校验与运行时完整性
:::

::: details v1.0.15 · 2026-04-01 10:37 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.15" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**问题修复**
- 修复规则集编辑、展示及保存异常行为

**注意事项**
- 0.x 升级至 1.x 需重置安全并重新下载 DNS 服务
:::

::: details v1.0.14 · 2026-03-31 10:14 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/1.0.14" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- 联动 MosDNS 客户端名称并优化日志筛选功能
- 调整组件更新阶段 GitHub 下载优先级
- 优化内存预算、监控负载及长期运行内存占用
- 统一 MosDNS 恢复写操作的重试策略

**问题修复**
- 修复 MosDNS 恢复阶段回写失败及 API 就绪等待问题
- 修复许可证重激活时因本地授权材料损坏导致的失败
- 修复内存回收死锁并降低实时面板分配
- 修复 Dashboard 布局拖拽混乱、调节受限及刷新失效问题

**注意事项**
- 0.x 升级到 1.x 需重装或重置安全，DNS 服务已变更
:::

::: details v0.7.4 · 2026-01-05 21:16 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/0.7.4" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- Clash 规则管理增强  
  - 规则页支持按配置文件分组排序，方便快速定位  
  - 规则 / Provider 支持“可选重启生效”  
  - 默认 `interval` 等参数调整为更合理的值
- Setup 流程优化  
  - 保存配置时增加下载进度提示  
  - 运行期可切换代理核心，缺失核心自动下载
- 项目管理与下载优化  
  - 新增 Issue 模板与 VPS 预设（含 Clash）  
  - CLI / 下载链路默认优先使用内置加速源，界面展示下载进度

**问题修复**
- 修复 Clash 规则编辑器初始化报错、弹窗越界、空 `{}` YAML 导致损坏等问题
- 修复前端启停代理、日志级别解析、Toast 长文本、导航高亮等多处 UI / 交互问题
- 修复部分版本号、路径、配置读取错位，尤其是 Setup 与缓存相关逻辑

**注意事项**
- Tauri 桌面链路已基本稳定，但在 macOS 上仍建议重点验证 `launchctl` 工作目录与权限场景
:::

::: details v0.7.3 · 2026-01-01 13:29 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/0.7.3" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**新增 / 优化**
- Connections 页面重做  
  - 采用弹窗模式，支持保持展开状态，更紧凑的布局  
  - 测速与展开可并存，便于排查连接质量
- 代理链展示优化  
  - 切换操作不再强制折叠，补充更多测速信息  
  - 规则页节点卡片新增图标、双列瀑布流布局
- Setup 优化  
  - 初始化流程与版本号管理进行了多处微调

**问题修复**
- 修复 IPv6 / DNS 开关在保存和读取旧配置时的不一致问题
- 修复 Clash 页面若干弹窗居中、溢出与 YAML 处理错误
- 修复白屏、布局跳动等零碎 UI 问题

**注意事项**
- 桌面端与 SSE 改造仍处于快速演进阶段，升级后建议重点观察 SSE 长连接稳定性
:::

::: details v0.7.2 · 2025-12-31 20:52 · 稳定版
<div class="msm-release-history-link"><a href="https://github.com/msm9527/msm-wiki/releases/tag/0.7.2" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>
**核心内容**
- 桌面端服务管理  
  - 桌面端服务管理与托盘初版  
  - 支持自动安装 / 提权、首次运行门禁、状态面板等
- UI 与链路优化  
  - MosDNS / Clash 管理界面大幅改版  
  - 梳理 SSE 相对路径、CORS、静态资源与代理概览链路
- 问题修复  
  - 修复大量 macOS DMG、权限、服务检测相关问题  
  - 修复 Connections 刷新 / 测速 / 展开等问题
:::

## 🔄 升级建议

::: warning 升级前准备
1. 升级前建议先备份配置目录和重要数据，避免遗漏迁移
2. 桌面端（Tauri）用户：升级后请确认 `launchctl` / 托盘服务状态，以及本地 API 是否可访问
3. Clash 规则 / Provider 编辑器自 0.7.3 起快速演进，升级前建议备份现有 YAML，升级后复核生成结果
:::

### 📖 如何升级

详细步骤请参考：[更新升级指南](/zh/guide/update)。

### 🔗 版本兼容性（0.7.x 系列）

- ✅ 0.7.x 系列版本之间可以直接升级
- 🔄 配置文件在升级过程中会自动迁移和合并
- 💾 建议定期备份配置目录，尤其在跨大版本前

---

## 💬 获取帮助

- ⚖️ [使用与合规](/zh/legal/)：安装或升级前了解授权使用、数据安全、免责与知识产权边界
- 📘 [常见问题](/zh/faq/)：排查常见使用问题
- 🔧 [故障排查](/zh/faq/troubleshooting)：定位复杂故障
- 🐛 [GitHub Issues](https://github.com/msm9527/msm-wiki/issues)：报告 Bug 或提交功能需求
- 💬 [GitHub Discussions](https://github.com/msm9527/msm-wiki/discussions)：交流使用经验与方案
