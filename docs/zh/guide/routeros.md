# RouterOS 配置指南

适用于 MikroTik RouterOS（WinBox / WebFig / CLI）。

## 变量约定

- `{MSM主机IP}`：部署 MosDNS / Mihomo / Sing-box 的主机 IP

## 示例环境

- RouterOS 网关：`192.168.20.1`
- MSM 主机：`192.168.20.2`

## 步骤一：添加静态路由（FakeIP）

### Web 界面（WinBox / WebFig）

1. 打开 **IP > Routes**
2. 新增路由：
   - **Dst. Address**：`28.0.0.0/8`
   - **Gateway**：`192.168.20.2`

### CLI

```shell
/ip route add dst-address=28.0.0.0/8 gateway=192.168.20.2
```

## 步骤二：配置 DHCP DNS

1. 打开 **IP > DHCP Server > Networks**
2. 编辑你的 LAN 网络条目
3. 将 **DNS Servers** 设置为 `192.168.20.2`

### CLI（修改已有网络）

```shell
/ip dhcp-server network set [find address~"192.168.20.0/24"] dns-server=192.168.20.2
```

## RouterOS 配置提示（可选）

1. 在 `IP > Routes` 中新增上述路由规则，路由表选择 `main`。
2. 在 `IP > DNS` 保持路由器自身 DNS 为上游值（无需指向 `{MSM主机IP}`）。
3. 在 `IP > DHCP Server > Networks` 设置 DHCP 下发 DNS 为 `{MSM主机IP}`。
4. 如需故障切换，可在 `Tools > Netwatch` 监测目标（如 `1.1.1.1`），异常时切换到备用 DNS，恢复后切回主 DNS。

## RouterOS 命令示例（可选）

### 路由规则

```shell
/ip route
add comment="mihomo/singbox fakeip" disabled=no distance=1 dst-address=28.0.0.0/8 gateway={MSM主机IP} routing-table=main scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=8.8.8.8/32 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=8.8.4.4/32 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=1.1.1.1/32 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=1.0.0.1/32 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10

# Telegram
add disabled=no distance=1 dst-address=149.154.160.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=149.154.164.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=149.154.172.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=91.108.4.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=91.108.20.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=91.108.56.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=91.108.8.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=95.161.64.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=91.108.12.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=91.108.16.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=67.198.55.0/24 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=109.239.140.0/24 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10

# Netflix
add disabled=no distance=1 dst-address=207.45.72.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=208.75.76.0/22 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=210.0.153.0/24 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
add disabled=no distance=1 dst-address=185.76.151.0/24 gateway={MSM主机IP} scope=30 suppress-hw-offload=no target-scope=10
```

### DNS 与 DHCP

```shell
/ip dns set servers={MSM主机IP}
/ip dhcp-server network set dns-server={MSM主机IP} numbers=0
```

### 跳过链接追踪 (Conntrack)

RouterOS v7 的默认防火墙设置，会导致 Conntrack 将目标地址为 FakeIP 的连接首包 (SYN) 标记为 invalid。  
现象为任何需要走代理的连接，需要等待5秒才能建立连接。如果没有遇到上述现象，无需进行此配置。

有两种解决方案：

1. (最简单) 将设备的网关也设置为 `{MSM主机IP}`。

```shell
/ip dhcp-server network set gateway={MSM主机IP} numbers=0
```

2. (更优雅，可配合 `Netwatch 故障切换示例2` 使用) 跳过链接追踪

```shell
# 将需要跳过链接追踪的 IP 添加到地址列表
/ip firewall address-list
add address=28.0.0.0/8 list=msm_list
add address=8.8.8.8/32 list=msm_list
add address=8.8.4.4/32 list=msm_list
add address=1.1.1.1/32 list=msm_list
add address=1.0.0.1/32 list=msm_list

# Telegram
add address=149.154.160.0/22 list=msm_list
add address=149.154.164.0/22 list=msm_list
add address=149.154.172.0/22 list=msm_list
add address=91.108.4.0/22 list=msm_list
add address=91.108.20.0/22 list=msm_list
add address=91.108.56.0/22 list=msm_list
add address=91.108.8.0/22 list=msm_list
add address=95.161.64.0/22 list=msm_list
add address=91.108.12.0/22 list=msm_list
add address=91.108.16.0/22 list=msm_list
add address=67.198.55.0/24 list=msm_list
add address=109.239.140.0/24 list=msm_list

# Netflix
add address=207.45.72.0/22 list=msm_list
add address=208.75.76.0/22 list=msm_list
add address=210.0.153.0/24 list=msm_list
add address=185.76.151.0/24 list=msm_list
```

```shell
# 跳过链接追踪
/ip firewall raw
add action=notrack chain=prerouting dst-address-list=msm_list comment="Bypass Conntrack for msm"
```

### Netwatch 故障切换示例

> 目标 IP 可使用 `1.1.1.1` 等公网 IP，备用 DNS 可替换为实际值。

**up（恢复时）**

```shell
/ip dns set server={MSM主机IP}
/ip dhcp-server network set dns-server={MSM主机IP} numbers=0
```

**down（不可达时）**

```shell
/ip dns set server=223.5.5.5
/ip dhcp-server network set dns-server=223.5.5.5 numbers=0
```

### Netwatch 故障切换示例2

```shell
# dynamic-servers显示的运营商DNS一般拥有最快的解析速度，推荐加入MSM的上游DNS设置
/ip dns print

# 避免RouterOS直接使用运营商DNS作为上游DNS
/interface pppoe-client set [find name="pppoe-out1"] use-peer-dns=no
```

```shell
# 将DHCP Server的网关和DNS恢复为RouterOS IP
/ip dhcp-server network set gateway={RouterOS IP} numbers=0
/ip dhcp-server network set dns-server={RouterOS IP} numbers=0
```

```shell
/tool netwatch
add host=1.1.1.1 port=853 type=tcp-conn interval=10s timeout=1s \
    up-script="/ip dns set servers={MSM主机IP}" \
    down-script="/ip dns set servers=223.5.5.5"
```

效果解释:
- 设备使用RouterOS作为上游DNS服务器，再由RouterOS根据网络情况设置不同的上游DNS服务器
- 当 `1.1.1.1` 可达时，RouterOS的上游服务器为MSM主机
- 当 `1.1.1.1` 不可达时，RouterOS的上游服务器为阿里DNS 223.5.5.5
- 当RouterOS的上游服务器切换时，设备所使用的DNS服务器即时生效，无需等待DHCP过期更新后才切换。

## 验证

- 客户端 `nslookup google.com` 返回 `28.0.0.0/8` 段 IP
- 白名单设备可访问国外站点

## 下一步

- [设备管理](/zh/guide/device-management)
- [MosDNS 管理](/zh/guide/mosdns)
