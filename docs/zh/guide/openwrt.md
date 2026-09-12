# OpenWrt 配置指南

本文用于 **OpenWrt / LEDE 接入另一台 MSM 主机**，以命令行（UCI）方式配置路由与 DNS。

要把 MSM 直接安装到 OpenWrt 路由器上，请先阅读 [OpenWrt 原生包与 LuCI 插件安装](/zh/guide/install-openwrt)。

## 示例环境

- OpenWrt 网关 IPv4：`192.168.1.1`
- MSM 主机 IPv4：`192.168.1.2`
- OpenWrt 网关 IPv6：`fd00::1`
- MSM 主机 IPv6：`fd00::2`

## 步骤一：添加静态路由（IPv4 + IPv6）

```bash
uci add network route
uci set network.@route[-1].interface='lan'
uci set network.@route[-1].target='28.0.0.0'
uci set network.@route[-1].netmask='255.0.0.0'
uci set network.@route[-1].gateway='192.168.1.2'

uci add network route6
uci set network.@route6[-1].interface='lan'
uci set network.@route6[-1].target='f2b0::/18'
uci set network.@route6[-1].gateway='fd00::2'

uci commit network
/etc/init.d/network reload
```

如需 Telegram IPv6 等附加网段，可继续按 `route6` 方式添加。

## 步骤二：设置 DHCP DNS

```bash
uci set dhcp.lan.dhcp_option='6,192.168.1.2'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

## 验证

```bash
nslookup google.com 192.168.1.2
dig AAAA google.com @192.168.1.2
```

- `nslookup google.com 192.168.1.2` 应返回 `28.0.0.0/8` 段地址
- `dig AAAA google.com @192.168.1.2` 应返回 `f2b0::/18` 段地址

## 下一步

- [设备管理](/zh/guide/device-management)
- [DNS 服务管理](/zh/guide/mosdns)
