# MSM Docker 部署说明

官方镜像同时提供主控端镜像 `msmbox/msm` 与独立 Docker 子节点镜像 `msmbox/msm-agent`，支持 `linux/amd64`、`linux/arm64` 和 `linux/arm/v7`（Debian 13 / Alpine 3.23 运行基线）。

完整图文教程见官方文档：
- [Docker 部署教程](https://doc.msmbox.net/zh/guide/docker)
- [Docker Center 与独立子节点 Agent](https://doc.msmbox.net/zh/guide/docker-center)

## 快速启动（Docker Compose）

```yaml
services:
  msm:
    image: msmbox/msm:latest
    container_name: msm
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    devices:
      - /dev/net/tun:/dev/net/tun
    environment:
      MSM_PORT: "7777"
      MSM_CONFIG_DIR: /opt/msm
      TZ: Asia/Shanghai
    volumes:
      - ./data/msm:/opt/msm
      - ./logs/msm:/var/log/msm
      # 如需通过本机 Docker Center 管理宿主机容器，取消下一行注释：
      # - /var/run/docker.sock:/var/run/docker.sock:ro
```

启动后访问 `http://<宿主机IP>:7777` 完成初始化向导。

> 如需查看独立发布包（含 ARMv5/ARMv6 静态二进制）或历史版本标签，请前往 [Releases 页面](https://github.com/msm9527/msm-wiki/releases)。

## 独立 Docker 子节点（`msmbox/msm-agent`）

如需在另一台 Docker 主机（NAS / 服务器 / NAT 后设备）接入 MSM Docker Center，无需部署完整 MSM，只需运行轻量子节点镜像 `msmbox/msm-agent:latest`：

- **主动回连模式（推荐，适用于 NAT 后或跨网段主机）**：在 MSM 的 **Docker 管理 → 添加节点 → 主动回连** 中生成一次性令牌和一键 `docker run` / Compose 命令，子节点仅发起出站 HTTPS 隧道连接，不暴露监听端口。
- **直连模式**：映射 `7788` 端口并挂载 TLS 证书后，通过 `docker exec msm-docker-agent msm-docker-agent token` 获取一次性配对令牌登记到 MSM。

## 问题反馈

使用中遇到问题请前往 [msm-wiki Issues](https://github.com/msm9527/msm-wiki/issues) 提交脱敏日志与环境信息。
