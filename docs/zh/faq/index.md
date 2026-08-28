# 常见问题

## 1. 登录页面无法访问

- 确认服务已启动
- 检查端口是否被占用
- 确认防火墙放行 7777

## 2. 配置保存后不生效

- 保存后需重启对应服务
- 查看配置校验结果

## 3. 代理服务无法启动

- 同一时刻只应由 Clash 或 Sing-Box 其中一个本地核心接管代理网络
- 从 **代理服务 → 概览** 使用安全切换，不要手工启停两个核心模拟切换
- 检查切换进度中的失败阶段、配置校验与目标核心日志
- Smart 核心还要检查 Pro 的 `proxy.manage` 能力和功能开关

## 4. 找不到日志

- 默认路径：`/root/.msm/logs`
- 使用 systemd 可通过 `journalctl -u msm` 查看

## 5. 为什么现在文档都按 IPv4 和 IPv6 一起写？

- MSM 当前文档默认按双栈网络梳理
- FakeIP v4 使用 `28.0.0.0/8`
- FakeIP v6 使用 `f2b0::/18`
- 主路由如果已经具备稳定可达的内网 IPv6，就应同时完成 v4 / v6 配置

## 6. 装完以后最容易漏掉什么？

- 只改了 DNS，没有添加静态路由
- 路由器里把 DNS 写成了两个地址，实际却只有 MSM 的 IPv4 DNS 在使用
- 只添加了 `28.0.0.0/8`，漏了 `f2b0::/18`
- 路由器里 DNS 指向了 MosDNS 主机，但 FakeIP 路由指向了别的主机
- MSM 内部 FakeIP 网段与主路由配置不一致

## 7. 有哪些推荐的参考项目和教程？

::: tip 推荐按这个顺序阅读
1. [MSSB（逗猫佬）](https://github.com/baozaodetudou/mssb)：先理解旁路由分流整体设计思路
2. [MosDNS 相关实践（PH 佬）](https://github.com/yyysuo/mosdns)：再看 MosDNS 侧配置与实战经验
3. [MetaCubeX 官方核心](https://github.com/MetaCubeX/mihomo)：核对上游内核能力与官方参数说明
4. [FakeIP 分流大法总教程](https://drive.google.com/drive/u/1/folders/1ldD2XqIrREPgr_CKMSgvYomXgwknpApi)：系统化学习 FakeIP 分流
5. [以 FakeIP 分流为基石的一套科学方案](https://blog.847977.xyz/2025/10/30/%E4%BB%A5fakeip%E5%88%86%E6%B5%81%E4%B8%BA%E5%9F%BA%E7%9F%B3%E7%9A%84%E4%B8%80%E5%A5%97%E7%A7%91%E5%AD%A6%E6%96%B9%E6%A1%88/)：结合实际拓扑理解 FakeIP 方案落地
6. [Tom佬的技术博客](https://blog.847977.xyz/)：延伸阅读 RouterOS、FakeIP 与相关折腾实践
7. [原版 MosDNS 知识库](https://irine-sistiana.gitbook.io/mosdns-wiki/) 与 [StoreHouse 脚本合集](https://github.com/herozmy/StoreHouse/tree/latest)：用于进阶查阅与脚本实践
:::

## 8. 为什么有些网站就是不代理？

因为DNS模块解析结果为国内ip，自动分流直连。

若需强制代理，需将域名添加至DNS服务→规则管理→个性化名单→代理
<img width="2504" height="287" alt="image" src="https://github.com/user-attachments/assets/ca03278f-6a97-492b-9360-0cfc9ded3e6d" />
或DNS服务→规则管理→在线分流中添加国外专属域名规则
<img width="2501" height="417" alt="image" src="https://github.com/user-attachments/assets/55832bcd-8d51-475a-9b0d-f0512d507046" /><img width="758" height="788" alt="image" src="https://github.com/user-attachments/assets/7b800fb6-73e1-4dc0-ac01-1c4d6088c6fc" />

## 9. 为什么 Pro 模块没有出现在侧边栏？

- 检查授权管理页是否包含所需能力
- 检查 **系统设置 → 功能开关**
- 确认当前用户角色至少有查看权限
- 退出后重新登录，刷新许可证与功能状态

域名服务、Cloudflare 内网穿透、自建私网、Docker 管理和网络工具都会同时检查模块开关与 Pro。

## 10. 回家页面本机检查通过，为什么外网仍连不上？

本机检查只验证配置、核心服务和所选协议要求的本地 TCP / UDP 监听，无法证明公网可达。还需从家庭网络外检查公网 IP / CGNAT、对应协议的端口转发、主机防火墙和 Docker 端口映射。详见 [远程回家](/zh/guide/home)。

## 11. Cloudflare Tunnel 和自建私网有什么区别？

- Cloudflare Tunnel 用于通过 HTTPS 域名发布一个或多个 Web 服务，远端浏览器无需安装客户端
- 自建私网用于 SSH、远程桌面、数据库和整个 LAN，远端设备需要加入 EasyTier、Tailscale 或 WireGuard 网络

两者可以同时运行。详见 [Cloudflare 内网穿透](/zh/guide/cloudflare)和[自建私网](/zh/guide/networking)。

## 12. Docker Agent 节点应该用哪种连接方式？

子节点不方便开放入站端口时优先使用主动回连；已有可信 HTTPS 地址和明确网络边界时可用直连。生产环境不要启用明文 HTTP 兼容开关。详见 [Docker 管理](/zh/guide/docker-center)。

## 更多帮助

- [系统诊断](/zh/guide/diagnostics) - 运行 `msm doctor` 自动检测常见问题
- [故障排查](/zh/faq/troubleshooting) - 详细的故障排查步骤
- [CLI 命令参考](/zh/guide/cli) - 命令行工具使用
- [使用指南总览](/zh/guide/basic-config) - 查找新版功能入口
- [Telegram 交流群](https://t.me/msm_home) - 社区互助交流
