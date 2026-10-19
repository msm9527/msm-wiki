# OpenWrt 配置指南

本文用于 **OpenWrt / LEDE 接入另一台 MSM 主机**，以命令行（UCI）方式配置路由与 DNS。

要把 MSM 直接安装到 OpenWrt 路由器上，请先阅读 [OpenWrt 原生包与 LuCI 插件安装](/zh/guide/install-openwrt)。

## 示例环境

- OpenWrt 网关 IPv4：`192.168.1.1`
- MSM 主机 IPv4：`192.168.1.2`
- OpenWrt 网关 IPv6：`fd00::1`
- MSM 主机 IPv6：`fd00::2`

下面的 FakeIP 网段和主机地址是示例。请从 MSM 设置页读取当前 FakeIP 地址池和实际 LAN 地址，再替换命令中的值；修改地址池或 IPv6 开关后要同步修改 OpenWrt。

## 步骤一：添加静态路由（IPv4 + IPv6）

```bash
# 从 MSM 设置页填写这些值；IPv4 目标需要拆成网络地址和掩码。
MSM_IPV4='REPLACE_WITH_MSM_LAN_IPV4'
MSM_IPV6='REPLACE_WITH_MSM_LAN_IPV6'
FAKEIP_V4_NETWORK='REPLACE_WITH_MSM_FAKEIP_V4_NETWORK'
FAKEIP_V4_NETMASK='REPLACE_WITH_MSM_FAKEIP_V4_NETMASK'
FAKEIP_V6_CIDR='REPLACE_WITH_MSM_FAKEIP_V6_CIDR'

uci add network route
uci set network.@route[-1].interface='lan'
uci set network.@route[-1].target="$FAKEIP_V4_NETWORK"
uci set network.@route[-1].netmask="$FAKEIP_V4_NETMASK"
uci set network.@route[-1].gateway="$MSM_IPV4"

uci add network route6
uci set network.@route6[-1].interface='lan'
uci set network.@route6[-1].target="$FAKEIP_V6_CIDR"
uci set network.@route6[-1].gateway="$MSM_IPV6"

uci commit network
/etc/init.d/network reload
```

如需 Telegram IPv6 等附加网段，可继续按 `route6` 方式添加。

## 步骤二：设置 DHCP DNS

```bash
uci set dhcp.lan.dhcp_option="6,$MSM_IPV4"
uci commit dhcp
/etc/init.d/dnsmasq restart
```

## 验证

```bash
nslookup google.com "$MSM_IPV4"
dig AAAA google.com "@$MSM_IPV4"
```

- `nslookup google.com <MSM_IPV4>` 应返回 MSM 当前 FakeIP v4 网段内的地址
- `dig AAAA google.com @<MSM_IPV4>` 应返回 MSM 当前 FakeIP v6 网段内的地址（启用 IPv6 时）

## 下一步

- [设备管理](/zh/guide/device-management)
- [DNS 服务管理](/zh/guide/mosdns)
