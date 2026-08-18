# RouterOS 配置指南

适用于 MikroTik RouterOS v7（WinBox / WebFig / CLI）。

本文默认 **MosDNS 与当前活动代理核心（Clash 或 Sing-Box）运行在同一台 MSM 主机**。如果你是分体部署，请记住两条原则：

- DHCP DNS 指向 MosDNS 所在主机
- FakeIP、Telegram、Netflix 等静态路由指向透明代理所在主机

## 变量约定

- `{MSM主机IPv4}`：MSM 主机的 IPv4 地址
- `{MSM主机IPv6}`：MSM 主机的 IPv6 地址，推荐使用 ULA 或 GUA，例如 `fd00:20::2`
- 默认 FakeIP v4 网段：`28.0.0.0/8`
- 默认 FakeIP v6 网段：`f2b0::/18`

## 示例环境

- RouterOS 网关 IPv4：`192.168.20.1`
- MSM 主机 IPv4：`192.168.20.2`
- RouterOS LAN IPv6：`fd00:20::1/64`
- MSM 主机 IPv6：`fd00:20::2/64`

::: tip 重要
RouterOS 的 IPv6 静态路由下一跳最好使用 ULA 或 GUA。若只能使用 link-local 地址，RouterOS 官方文档要求显式指定接口，例如 `fe80::1234%bridge`，否则路由可能无效。
:::

## 配置原则

MSM 在 RouterOS 上只采用一种接入方式：**主路由直接添加静态路由**。

- DHCP DNS 指向 MSM
- IPv4 目标网段直接指向 `{MSM主机IPv4}`
- IPv6 目标网段直接指向 `{MSM主机IPv6}`

`mangle`、`routing rule`、额外路由表等策略路由写法不作为 MSM 的 RouterOS 标准配置。

### 步骤一：配置 DHCP DNS

#### 推荐方式：客户端直接使用 MSM 作为 DNS

```shell
/ip dhcp-server network set 0 dns-server=192.168.20.2
```

- 优点：链路最短，MosDNS 能直接识别客户端源地址
- 适合：绝大多数家庭网络

### 步骤二：添加 FakeIP 静态路由

```shell
/ip route
add distance=1 dst-address=28.0.0.0/8 gateway=192.168.20.2 comment="MSM FakeIP v4"
add distance=1 dst-address=8.8.8.8/32 gateway=192.168.20.2 comment="Google DNS"
add distance=1 dst-address=8.8.4.4/32 gateway=192.168.20.2 comment="Google DNS"
add distance=1 dst-address=1.1.1.1/32 gateway=192.168.20.2 comment="Cloudflare DNS"
add distance=1 dst-address=1.0.0.1/32 gateway=192.168.20.2 comment="Cloudflare DNS"

/ipv6 route
add distance=1 dst-address=f2b0::/18 gateway=fd00:20::2 comment="MSM FakeIP v6"
```

上面已经覆盖了 MSM 最常见的 FakeIP v4 / v6 以及公共 DNS 绕行配置。

### 步骤三：可选补充网段

如果你的规则里还需要 Telegram、Netflix 等目的网段，可继续添加：

```shell
/ip route
add distance=1 dst-address=149.154.160.0/20 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.105.192.0/23 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.108.4.0/22 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.108.8.0/22 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.108.12.0/22 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.108.16.0/22 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.108.20.0/22 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=91.108.56.0/22 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=95.161.64.0/20 gateway=192.168.20.2 comment="Telegram"
add distance=1 dst-address=23.246.0.0/18 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=37.77.184.0/21 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=45.57.0.0/17 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=64.120.128.0/17 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=66.197.128.0/17 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=69.53.224.0/19 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=103.87.204.0/22 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=108.175.32.0/20 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=185.2.220.0/22 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=185.9.188.0/22 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=192.173.64.0/18 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=198.38.96.0/19 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=198.45.48.0/20 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=207.45.72.0/22 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=208.75.76.0/22 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=210.0.153.0/24 gateway=192.168.20.2 comment="Netflix"
add distance=1 dst-address=185.76.151.0/24 gateway=192.168.20.2 comment="Netflix"

/ipv6 route
add distance=1 dst-address=2001:b28:f23d::/48 gateway=fd00:20::2 comment="Telegram v6"
add distance=1 dst-address=2001:b28:f23f::/48 gateway=fd00:20::2 comment="Telegram v6"
add distance=1 dst-address=2001:b28:f23c::/48 gateway=fd00:20::2 comment="Telegram v6"
add distance=1 dst-address=2001:67c:4e8::/48 gateway=fd00:20::2 comment="Telegram v6"
add distance=1 dst-address=2a0a:f280::/32 gateway=fd00:20::2 comment="Telegram v6"
```

## 不要使用的方式

以下做法不作为 MSM 的 RouterOS 标准文档内容：

- `mangle mark-routing`
- `routing rule`
- 额外 routing table
- 为 FakeIP 单独设计的策略路由

这些做法常见于更复杂的 RouterOS 自定义方案，但对 MSM 的标准一体机接入来说，只会增加 FastTrack、Conntrack、排错路径和配置维护的复杂度。

## 验证

### 客户端验证

```bash
nslookup google.com
dig AAAA google.com
```

- `nslookup google.com` 应返回 `28.0.0.0/8` 段地址
- `dig AAAA google.com` 应返回 `f2b0::/18` 段地址

### RouterOS 侧验证

```shell
/ip route print detail where dst-address=28.0.0.0/8
/ipv6 route print detail where dst-address=f2b0::/18
```

- 确认 FakeIP v4 / v6 路由都存在
- 确认下一跳分别指向正确的 MSM IPv4 / IPv6 地址

## 下一步

- [路由器集成总览](/zh/guide/router-integration)
- [DNS 服务管理](/zh/guide/mosdns)
- [设备管理](/zh/guide/device-management)
