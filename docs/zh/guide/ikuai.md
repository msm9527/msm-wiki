# 爱快（iKuai）配置指南

## 示例环境

- 爱快网关：`192.168.1.1`
- MSM 主机IPv4：`192.168.1.2`
- MSM 主机IPv6：`fe80::a1b2:c3d4:e5f6:7788`

以下地址、CSV 中的网段和下一跳均为示例。导入前请以 MSM 设置页当前 FakeIP 地址池、MSM 实际 LAN 地址和启用的地址族为准，修改或删除不适用的条目；地址池变化后要重新核对静态路由。
## 步骤一：下载并修改静态路由规则

- [下载爱快 3.X 规则](https://raw.githubusercontent.com/msm9527/msm-wiki/main/docs/zh/guide/ikuai_static_route_3.x.csv)
- [下载爱快 4.X (Beta版) 规则](https://raw.githubusercontent.com/msm9527/msm-wiki/main/docs/zh/guide/ikuai_static_route_4.x_beta.csv)
- 使用Excel、WPS亦或是Visual Studio打开对应爱快版本的static_route.csv文件
- 查找替换，搜索并替换 **`REPLACE_WITH_MSM_LAN_IPV4`** 为 MSM 设置页显示的实际 IPv4 地址
- 查找替换，搜索并替换 **`REPLACE_WITH_MSM_LAN_IPV6_NEXT_HOP`** 为实际的 MSM IPv6 下一跳；若使用链路本地地址，同时确认接口绑定
- 将 FakeIP 行中的 `REPLACE_WITH_MSM_FAKEIP_V4_NETWORK`、`REPLACE_WITH_MSM_FAKEIP_V4_NETMASK` 和 `REPLACE_WITH_MSM_FAKEIP_V6_CIDR` 替换为 MSM 设置页当前值；地址池变化后必须重新导入前核对
- 保存并关闭文件

## 步骤二：导入静态路由（FakeIP）

1.爱快 3.X 静态路由配置导入
在 **网络设置>静态路由>静态路由** 页面导入刚修改完之后的静态路由：
![爱快 3.X 静态路由配置导入](https://github.com/user-attachments/assets/54d01507-f2f8-4182-8dcc-736b4664c51a)

2.爱快 4.X 静态路由配置导入
在 **网络配置>静态路由>静态路由** 页面导入刚修改完之后的静态路由：
![爱快 4.X 静态路由配置导入](https://github.com/user-attachments/assets/8fa6470b-a31d-446b-9413-999079fe939c)

## 步骤三：配置 DHCP DNS

在 **DHCP 服务器地址池** 中设置 DNS：

- **DNS 服务器**：填写 MSM 设置页显示的实际 IPv4 地址
- **备用 DNS**：可选填写运营商 DNS
![配置 DHCP DNS](https://github.com/user-attachments/assets/68fb5a28-8059-47d0-86f5-71c0df55e20b)

## 验证

客户端执行：

```bash
nslookup google.com
```

应返回 MSM 当前 FakeIP v4 网段内的地址；启用 IPv6 时，另行验证 AAAA 查询和 IPv6 静态路由。

## 下一步

- [设备管理](/zh/guide/device-management)
- [DNS 服务管理](/zh/guide/mosdns)
