# UniFi + MSM FakeIP 配置

本页适用于 UniFi 作为客户端默认网关、Debian/Linux 上的 MSM 同时运行 MosDNS 与 Clash 或 Sing-Box 透明代理核心的旁路由拓扑。UniFi 负责 DHCP/RA、静态路由和防火墙；MSM 负责保存 FakeIP 期望值、生成核心配置和管理自己创建的本机规则。

MSM 不调用 UniFi API 或 SSH，也无法从本机确认 UniFi 的配置是否已保存。MSM 设置页的网络诊断会把外部 DNS 分发、静态路由和防火墙显示为“未检查”，这表示责任边界，不表示这些项目已经成功。

## 物理网卡由谁管理

MSM 只管理透明代理所需的本机 nftables、策略路由、FakeIP 本地路由和转发参数。它不会写 systemd-networkd 的 `.network` 文件、NetworkManager、netplan，也不会添加或删除物理网卡的 IPv4/IPv6 地址。设置页中的网络接口只是流量入口选择和地址读取。

`<MSM配置根>/network/.msm-managed-network` 记录的是 MSM 自己的透明代理规则归属，不是物理网卡托管开关。该标记可能用于恢复或清理 MSM 创建的 nftables、策略路由和 FakeIP 路由，不会让 MSM 覆盖静态 IPv6 或 networkd。清理后当前版本会移除标记；旧版本遗留的空标记会在下次清理时清除。

真实 LAN 地址请交给系统中的一个网络管理器（systemd-networkd、NetworkManager、netplan 或 OpenWrt）持有。不要在 MSM 中新增一份静态 IP 配置来和它竞争，也不要把真实 LAN 前缀改成 FakeIP 前缀。若 `Address=` 或 IPv6 地址在重启后消失，应检查网络管理器、DHCP/RA、cloud-init 和外部 helper。历史 `restore-msm-fakeip.sh` 会直接改写 `/etc/systemd/network` 并执行 `ip -6 addr`，它是外部脚本，不能作为 MSM 行为的证据。

## 先在 MSM 确认实际值

登录 MSM，打开 **设置 → 系统 → 网络/FakeIP**，记录：

- 当前 FakeIP IPv4 和 IPv6 地址池；
- MSM 所在 LAN 接口及其真实 IPv4/IPv6 前缀；
- 当前活动核心（Clash 或 Sing-Box）、Linux 模式和 IPv6 开关。

新安装默认配置值为 `28.0.0.1/8` 和 RFC 4193 ULA IPv6 地址池 `fd42:4242:4242::/48`；写入主路由时 IPv4 会规范显示为网络 `28.0.0.0/8`，两者是同一个池。`f2b0::/18` 仅为旧安装的兼容值，MSM 不会在启动、升级或切换核心时自动迁移已有地址池。UniFi 静态路由必须使用 MSM 页面显示的实际地址池，并按路由器要求使用规范网络地址。

## UniFi Web 一次性配置

不同 UniFi Network/OS 版本的菜单名称略有差异，请在 **Settings → Networks** 和 **Routing/Static Routes** 中完成以下操作：

### 1. DHCP/RA 分发 MSM DNS

在需要代理的每个 VLAN 网络中，把 DHCP DNS 指向 MSM 的 DNS 地址。IPv4 DNS 通常足够；使用 IPv6 RA 时，也要确认客户端不会被下发一个绕过 MSM 的 DNS。若 UniFi 继续作为 DNS 转发器，必须确认它的上游指向 MSM。

### 2. 添加 FakeIP 静态路由

为 MSM 页面中的每个地址池添加精确路由：

| 目标网络 | 下一跳 |
| --- | --- |
| 实际 FakeIP IPv4 池 | MSM 在该网络上的 IPv4 地址 |
| 实际 FakeIP IPv6 池 | MSM 在该网络上的 IPv6 地址，或控制器要求的链路本地下一跳 |

每个仍使用的 VLAN 都要检查路由可达性。不要把 FakeIP 的 `/48` 当成 Debian LAN 接口前缀，也不要把整个公网 IPv6 空间指向 MSM。

### 3. 防火墙与 IPv6

允许客户端到 MSM DNS 的流量、FakeIP 去程和状态防火墙需要的返回流量。IPv6 同时保留邻居发现、Packet Too Big 等必要 ICMPv6；允许规则应排在 VLAN 隔离或相关拒绝规则之前。MSM 不会修改 UniFi 防火墙，也不会用“全双向放行”代替精确规则。

## MSM 的回程模式

推荐使用 **`system`** 模式：MSM 使用现有系统路由和 UniFi 静态路由，适合客户端与 MSM 路径对称的拓扑。

当前版本的 **`via_gateway`** 自动 nftables/策略路由回程保持关闭并 fail-closed。选择该模式会明确提示不支持自动下发，不会静默退回普通模式，也不会写入固定的网卡名、mark、路由表、下一跳或 VLAN。需要上级网关回程时，请使用 `system` 并在 UniFi 添加精确静态路由；专用代理 VLAN 也仍要由 UniFi 配置路由和防火墙。

完成一次 UniFi 配置且在 MSM 正常保存后，MSM 重启、核心重启、网络规则重建和升级不需要再次运行外置恢复脚本。只有 FakeIP 池、MSM 地址、客户端 VLAN 或 UniFi 策略发生变化时，才需要同步调整 UniFi。

## 验证顺序

按下面顺序验证，避免把所有超时都归因于回程：

1. **DNS**：从每个 VLAN 查询 A/AAAA，确认结果属于 MSM 当前 FakeIP 池。
2. **UniFi 去程**：检查静态路由和防火墙日志，确认 FakeIP 两个地址族都指向 MSM。
3. **MSM 接管**：在网络诊断中确认 FakeIP 配置、选定接口、代理核心和透明代理规则状态；物理网卡地址归属应显示为主机网络管理器。
4. **客户端回程**：分别验证每个 VLAN 的 TCP 双向连接和 IPv6 ICMPv6。
5. **应用层**：再区分 TLS、MTU、UDP/QUIC、长连接和视频吞吐。

MSM 主机可用以下命令观察本机路径，把占位符替换为实际地址：

```sh
dig A example.test @<MSM-DNS>
dig AAAA example.test @<MSM-DNS>
ip -4 route get <FAKE-IPV4>
ip -6 route get <FAKE-IPV6>
ip -4 route show table all
ip -6 route show table all
curl -4 -I --max-time 10 https://example.test/
curl -6 -I --max-time 10 https://example.test/
```

`ping` FakeIP 只能说明本地代理地址响应，不能代表代理出口质量。HTTP 200 只证明一次 TCP/HTTP 路径；UDP/QUIC 和视频吞吐必须单独测试。不要在 Windows 客户端添加永久 FakeIP 路由。

## 地址池与前缀变更

MSM 会拒绝 `/0`、回环、组播和 IPv4 link-local 等明显不适合作为 FakeIP 池的输入，并兼容历史 `28.0.0.1/8` 与 `f2b0::/18`。真实 LAN 前缀必须按二层链路设计，例如接口为 `/64` 时不能改成 FakeIP 使用的 `/48`。新默认的 `fd42:4242:4242::/48` 是虚拟地址池，不应当作为真实 LAN 前缀分配给接口。FakeIP 池保存在 MSM 数据库中，同时同步 MosDNS、活动核心、已安装核心和受管网络规则；只编辑生成的配置文件不会改变数据库，重启时会按数据库值回放。

更换地址池时：

1. 在 MSM 保存并应用新的 FakeIP 配置；
2. 按页面实际值更新 UniFi 两个静态路由；
3. 等待 DNS TTL 到期或清理客户端缓存；
4. 从每个 VLAN 重新验证 A/AAAA、TCP、IPv6 和 UDP/QUIC。

MSM 无法清除客户端缓存，也不承诺所有旧连接无损迁移。

## 历史 helper 迁移与回滚

历史 helper 可能写死接口、下一跳、策略优先级、路由表和 VLAN。迁移前先备份并在 MSM 诊断中核对地址池及受管资源；人工停止 helper 后启用 MSM 管理，再验证各 VLAN 的 IPv4/IPv6 TCP 与 UDP。不要按名称接管未知规则或清空共享路由表。

如迁移失败，使用 helper 生成的备份恢复原方案，记录 MSM、代理核心、Debian 和 UniFi 版本，再逐项比较 DNS、去程、接管、回程和应用层证据。

## 相关文档

- [路由器接入总览](/zh/guide/router-integration)
- [MosDNS 与 FakeIP](/zh/guide/mosdns)
- [系统诊断](/zh/guide/diagnostics)
- [故障排查](/zh/faq/troubleshooting)
