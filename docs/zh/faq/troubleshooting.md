# 故障排查

遇到问题时，推荐先执行一次 `msm doctor` 定位基础环境异常，再按下方常见现象分段排查。

## 1. 服务无法启动或管理页面打不开

```bash
# 查看 MSM 与子服务状态
sudo msm status

# 检查 systemd / OpenRC / procd 状态（按平台选择）
sudo systemctl status msm
# Alpine: rc-service msm status
# OpenWrt: /etc/init.d/msm status

# 查看最近主服务日志
sudo msm logs
sudo journalctl -u msm -n 100 --no-pager
```

排查关键端口是否被其他进程占用：

```bash
sudo ss -lntup | grep -E ':(7777|53|7890)\b'
```

- **`7777` 被占用**：修改启动端口（`msm serve -p <新端口>` 或调整服务单元中的 `MSM_PORT`），并核对防火墙放行规则。
- **启用 HTTPS 后无法打开**：核对协议已切换为 `https://`，确认证书与私钥匹配且未过期。
- **忘记管理员密码**：在 MSM 所在宿主机执行 `sudo msm reset-password`。

## 2. 53 端口冲突或停用后宿主机无法解析 DNS

若 Linux 宿主机（如 `systemd-resolved`）或 OpenWrt（`dnsmasq`）的 53 端口与 MosDNS 冲突，或卸载/停用 MSM 后宿主机自身无法解析域名：

```bash
# 恢复宿主机原有 DNS 配置
sudo msm service recover-dns
```

恢复前也可以先用 `ss -lntup | grep ':53 '` 确认当前持有 53 端口的进程。

## 3. 代理无流量、国外网站不走代理或 IPv6 异常

按「客户端 DNS → FakeIP 返回 → 静态路由 → 代理核心」四步逐段核验：

1. **客户端核验解析**：在局域网客户端分别执行：
   ```bash
   nslookup google.com
   dig AAAA google.com
   ```
   - 确认 DNS 服务器返回的是 MSM 的 LAN IP，且主路由 DHCP **未额外填写运营商备用 DNS**。
   - 确认返回的 `A` / `AAAA` 属于 MSM 当前设置的 FakeIP 地址池。
2. **核对 FakeIP 地址池与静态路由一致**：
   - 新安装默认配置值为 `28.0.0.1/8`（主路由静态路由通常规范为 `28.0.0.0/8`）和合规 ULA `fd42:4242:4242::/48`；历史安装可能仍使用 `f2b0::/18`。
   - 一切以 MSM 设置页中的当前配置为准；修改地址池后必须同步更新主路由静态路由。
3. **核对设备分流名单**：检查 **DNS 服务 → 客户端设置**，确认测试设备处于预期的白名单/策略分组。
4. **查看实时日志与网络诊断**：
   - 前往 Web 端 **系统诊断** 检查本机 FakeIP 与策略路由一致性（如规则漂移可点击恢复）。
   - 检查 `msm logs mosdns` 与 `msm logs mihomo` / `msm logs singbox` 是否存在配置或上游报错。

5. **重启后代理核心 IPv6 自动关闭**：
   - 代理核心与 DNS 的 IPv6 受系统级策略统一管辖。如果在代理常规设置开启了 IPv6，但系统全局设置仍为关闭，每次服务重启时会自动对齐系统配置导致被覆盖。
   - 前往 **系统设置 → 系统管理**（或安装配置中的 IPv6/FakeIP 选项）开启 IPv6 选项并保存，即可持久保持开启。

## 4. Clash Smart 不自动切换节点

- 在 **代理节点** 检查该 Smart 策略组是否处于手动锁定状态；点击 **恢复自动选择** 同时清除内存与持久化选择。
- 确认规则命中的业务组最终指向 `type: smart` 策略组，且组内至少有两个健康节点。
- 检查订阅集合（`proxy-providers`）自身的 `health-check` 是否启用并匹配 `expected-status`（策略组的 `interval` 不会覆盖集合配置）。
- 针对个别假死连接，可在 **连接管理** 直接点击 **降权切换节点** 触发重新选路。详见 [Clash 管理](/zh/guide/clash#clash-smart-自动选路与调优)。

## 5. Edge 网关（域名服务）HTTPS / 反向代理 / 端口转发异常

进入 **域名服务 → 服务拓扑（`/edge/topology`）** 从左向右核对链路状态：

1. **DDNS 未生效**：查看任务中的「服务商写入状态」与「权威 DNS 核验」是否一致；直连公网 IP 探测异常时切换探测来源或网卡接口。
2. **ACME 证书签发失败**：优先在 Staging 环境核对 DNS-01 凭据最小权限；HTTP-01 / TLS-ALPN-01 需确认公网 80/443 可达。
3. **502 / 无法连接上游**：Docker Bridge 模式下不要填写 `127.0.0.1` 指向宿主机服务；上游若为自签名 HTTPS 请正确配置 SNI / CA。
4. **外网连不上端口**：核对路由器端口映射、宿主机防火墙及 Docker `ports:` 映射与路由监听端口完全一致。

## 6. Docker 管理与独立 Agent 子节点离线

- **本机引擎不可用**：确认 `dockerd` 已启动、运行用户可读写 `/var/run/docker.sock`（Docker 部署需挂载且不要加 `:ro`）。
- **独立 Agent 节点离线**：
  ```bash
  # 检查 Agent 自身健康状态（自动忽略 HTTP_PROXY）
  docker exec msm-docker-agent msm-docker-agent healthcheck

  # 查看重连日志（分享排障信息前请脱敏，切勿泄露 controller.json）
  docker logs --tail=100 msm-docker-agent
  ```
  - 主动回连模式：确认子节点能解析并访问控制端 URL，且证书受系统 CA 或 `MSM_AGENT_CONTROLLER_CA` 信任；不要把控制端 URL 写成 `127.0.0.1`。
  - HTTPS 直连模式：确认控制端可访问子节点 `7788` 端口且 TLS 证书匹配。

## 7. macOS 桌面应用或 CLI 被系统拦截

未公证构建首次运行若提示“无法验证开发者”或“文件已损坏”，执行以下命令移除下载隔离属性：

```bash
# 桌面应用
/usr/bin/xattr -dr com.apple.quarantine "/Applications/msm-desktop.app"

# CLI 二进制
/usr/bin/xattr -dr com.apple.quarantine /usr/local/bin/msm
```

## 8. 反馈问题前建议收集的信息

提交 Issue 或社区求助前，请先脱敏移除订阅链接、Token、密钥与公网隐私信息，然后附上：

- MSM 版本与部署平台（`msm --version`、`uname -a`）
- `msm doctor` 诊断摘要
- 相关核心最近 50–100 行报错日志（`msm logs [mosdns|mihomo|singbox]`）
- 复现步骤与预期/实际行为

## 下一步

- [常见问题（FAQ）](/zh/faq/)
- [系统诊断](/zh/guide/diagnostics)
- [CLI 命令参考](/zh/guide/cli)
