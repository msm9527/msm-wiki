# 更新升级

本文档介绍如何更新 MSM 和各个组件（MosDNS、SingBox、Clash）。

## 更新 MSM

### 方式一：一键更新脚本

```bash
# 重新运行安装脚本即可自动更新
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

::: tip 提示
安装脚本会自动检测已安装的版本，如果有新版本会自动更新。
:::

### 方式二：手动更新

#### 1. 备份当前版本

```bash
# 停止服务
sudo systemctl stop msm

# 备份二进制文件
sudo cp /usr/local/bin/msm /usr/local/bin/msm.backup

# 备份配置和数据
sudo tar -czf /root/msm-backup-$(date +%Y%m%d).tar.gz /root/.msm
```

#### 2. 下载最新版本

访问 [GitHub Releases](https://github.com/msm9527/msm-wiki/releases/latest) 下载最新版本。

**Linux amd64**:
```bash
# 下载最新版本（以 0.7.4 为例）
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.4-linux-amd64.tar.gz

# 解压
tar -xzf msm-0.7.4-linux-amd64.tar.gz

# 替换文件
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**Linux arm64**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.4-linux-arm64.tar.gz

tar -xzf msm-0.7.4-linux-arm64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**macOS amd64**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.4-darwin-amd64.tar.gz

tar -xzf msm-0.7.4-darwin-amd64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**macOS arm64**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.4-darwin-arm64.tar.gz

tar -xzf msm-0.7.4-darwin-arm64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

#### 3. 启动服务

```bash
# 启动服务
sudo systemctl start msm

# 查看状态
sudo systemctl status msm

# 查看版本
msm -v
```

### 方式三：Docker 更新

```bash
# 停止容器
docker stop msm

# 删除旧容器
docker rm msm

# 拉取最新镜像
docker pull msm9527/msm:latest

# 重新运行容器
docker run -d \
  --name msm \
  --restart unless-stopped \
  --network host \
  -v /opt/msm/data:/root/.msm/data \
  -v /opt/msm/logs:/root/.msm/logs \
  -v /opt/msm/config:/root/.msm/config \
  msm9527/msm:latest
```

或使用 Docker Compose:

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

## 更新 MosDNS

### 方式一：Web 界面更新

1. 登录 MSM 管理界面
2. 进入 **DNS服务** 页面
3. 点击 **版本管理**
4. 选择要安装的版本
5. 点击 **安装**
6. 等待下载完成
7. 点击 **切换版本**
8. 重启 MosDNS 服务

### 方式二：命令行更新

```bash
# 查看当前版本
~/.msm/mosdns/mosdns version

# 下载最新版本
cd /tmp
wget https://github.com/IrineSistiana/mosdns/releases/latest/download/mosdns-linux-amd64.zip
unzip mosdns-linux-amd64.zip

# 停止服务
sudo systemctl stop msm

# 备份旧版本
cp ~/.msm/mosdns/mosdns ~/.msm/mosdns/mosdns.backup

# 替换文件
mv mosdns ~/.msm/mosdns/mosdns
chmod +x ~/.msm/mosdns/mosdns

# 启动服务
sudo systemctl start msm

# 验证版本
~/.msm/mosdns/mosdns version
```

## 更新 Sing-Box

MSM 使用 reF1nd Sing-Box 核心。推荐从 **系统设置 → 系统更新** 或 **代理服务** 中的版本入口执行：

1. 创建备份
2. 检查目标版本与当前架构
3. 启动更新并等待下载、校验和持久化完成
4. 等待 Sing-Box 配置、控制器和服务就绪检查
5. 在代理节点、连接和日志中执行真实验证

不要直接用 SagerNet 官方二进制覆盖 reF1nd 核心；两者的控制与配置能力可能不同。

## 更新 Mihomo

官方 Mihomo 与 Mihomo Smart 属于不同核心家族。推荐从 **系统设置 → 系统更新** 或 **代理服务 → 概览** 的方案 / 版本入口操作：

1. 确认当前是官方 Mihomo 还是 Mihomo Smart
2. 创建备份并记录当前版本
3. 选择与目标方案匹配的 Meta、Alpha 或 Smart 版本
4. 等待二进制家族、配置、网络和控制器验证完成
5. 检查订阅、策略组、连接与日志

::: danger 不要手工混用核心
Smart 配置不能直接交给 Meta / Alpha，官方配置也不应只替换为 Smart 二进制。跨家族变更必须使用 MSM 的代理方案切换流程。
:::

只有在 Web 更新不可用、且你能独立验证二进制来源、架构、签名和核心家族时，才考虑停机手工替换。手工替换前备份整个配置目录和原二进制，完成后运行版本、配置和就绪检查。

## 更新前注意事项

### 1. 备份配置

更新前务必备份配置文件：

```bash
# 备份整个配置目录
sudo tar -czf /root/msm-backup-$(date +%Y%m%d).tar.gz /root/.msm

# 或只备份配置文件
cp ~/.msm/mosdns/config.yaml ~/.msm/mosdns/config.yaml.backup
cp ~/.msm/singbox/config.json ~/.msm/singbox/config.json.backup
cp ~/.msm/mihomo/config.yaml ~/.msm/mihomo/config.yaml.backup
```

### 2. 查看更新日志

访问 GitHub Releases 页面查看更新日志，了解新版本的变化：

- [MSM Releases](https://github.com/msm9527/msm-wiki/releases)
- [MosDNS Releases](https://github.com/IrineSistiana/mosdns/releases)
- [reF1nd Sing-Box](https://github.com/reF1nd/sing-box)
- [MetaCubeX 官方 Releases](https://github.com/MetaCubeX/mihomo/releases)

### 3. 测试环境

如果可能，先在测试环境中更新，确认无问题后再在生产环境更新。

### 4. 选择合适的时间

选择网络使用较少的时间段进行更新，避免影响用户使用。

## 更新后验证

### 1. 检查服务状态

```bash
# 检查 MSM 服务
sudo systemctl status msm

# 检查版本
msm -v
~/.msm/mosdns/mosdns version
~/.msm/singbox/sing-box version
~/.msm/mihomo/mihomo -v
```

### 2. 检查配置

在 MSM 管理界面中：

1. 进入 **配置编辑** 页面
2. 检查配置文件是否正常
3. 执行配置校验
4. 查看服务日志

### 3. 测试功能

1. **测试 DNS 解析**:
   ```bash
   nslookup google.com
   ```

2. **测试代理**:
   - 访问 Google
   - 访问 YouTube
   - 访问 Twitter

3. **测试国内网站**:
   - 访问百度
   - 访问淘宝

### 4. 查看日志

```bash
# 查看 MSM 日志
sudo journalctl -u msm -n 100 --no-pager

# 或在 Web 界面查看日志
```

## 回滚版本

如果更新后出现问题，可以回滚到旧版本。

### 回滚 MSM

```bash
# 停止服务
sudo systemctl stop msm

# 恢复备份
sudo cp /usr/local/bin/msm.backup /usr/local/bin/msm

# 启动服务
sudo systemctl start msm
```

### 回滚组件

```bash
# 停止服务
sudo systemctl stop msm

# 恢复 MosDNS
cp ~/.msm/mosdns/mosdns.backup ~/.msm/mosdns/mosdns

# 恢复 SingBox
cp ~/.msm/singbox/sing-box.backup ~/.msm/singbox/sing-box

# 恢复 Clash
cp ~/.msm/mihomo/mihomo.backup ~/.msm/mihomo/mihomo

# 启动服务
sudo systemctl start msm
```

### 从备份恢复

```bash
# 停止服务
sudo systemctl stop msm

# 恢复整个配置目录
sudo tar -xzf /root/msm-backup-20260101.tar.gz -C /

# 启动服务
sudo systemctl start msm
```

## 自动更新（不推荐）

::: warning 警告
不建议启用自动更新，因为新版本可能引入不兼容的变化。建议手动更新并测试。
:::

如果确实需要自动更新，可以使用 cron 定时任务：

```bash
# 编辑 crontab
sudo crontab -e

# 添加以下行（每周日凌晨 3 点检查更新）
0 3 * * 0 curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

## 常见问题

### 问题 1: 更新后服务无法启动

**解决方法**:
1. 查看日志：`sudo journalctl -u msm -n 100`
2. 检查配置文件是否兼容新版本
3. 回滚到旧版本
4. 查看 GitHub Issues 寻找解决方案

### 问题 2: 更新后配置丢失

**原因**: 没有备份配置

**解决方法**:
1. 从备份恢复配置
2. 如果没有备份，需要重新配置

### 问题 3: 更新后性能下降

**可能原因**:
- 新版本引入的 bug
- 配置不兼容

**解决方法**:
1. 查看更新日志，了解变化
2. 调整配置
3. 回滚到旧版本
4. 向开发者反馈问题

## 下一步

- [备份恢复](/zh/guide/backup-restore) - 备份和恢复配置
- [故障排查](/zh/faq/troubleshooting) - 解决更新问题
- [常见问题](/zh/faq/) - 更多问题解答
