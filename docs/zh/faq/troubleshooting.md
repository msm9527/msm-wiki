# 故障排查

## 1. 服务无法启动

```bash
sudo msm status
sudo systemctl status msm
```

## 2. 查看日志

```bash
sudo msm logs
sudo journalctl -u msm -n 100 --no-pager
```

## 3. 端口冲突

```bash
sudo ss -tlnp | grep 7777
```

## 4. 配置校验失败

- 使用“配置编辑”中的校验功能
- 确认缩进与 YAML 语法

## 5. 代理无流量

- 确认主路由 DHCP DNS 设置正确
- 确认 FakeIP 网段与路由一致
- 在 MSM 设置页记录当前 FakeIP IPv4 网段，并检查它是否指向 MSM
- 启用 IPv6 时，再检查当前 FakeIP IPv6 网段是否指向 MSM 的 IPv6 地址
- 查看 MosDNS 与代理服务日志

`28.0.0.0/8` 和 `f2b0::/18` 仅是默认模板示例。自定义地址池时，以 MSM 当前配置为准，并同步修改主路由静态路由。
