# OpenWrt 安装

将 MSM 直接安装到 OpenWrt 路由器时，使用发布页的 **`msm` 原生软件包 + `luci-app-msm` 插件**。`msm` 包提供程序、UCI 配置和 procd 服务；LuCI 插件在「服务 → MSM」中提供启停配置、状态和 Web 控制台入口。

如果 MSM 运行在另一台服务器，只需要让 OpenWrt 接入它，请阅读 [OpenWrt 路由与 DNS 配置](/zh/guide/openwrt)。

## 选择包格式和架构

OpenWrt 24.10 及以前使用 **opkg / `.ipk`**；25.12 及以后使用 **apk v3 / `.apk`**。衍生固件以实际安装的包管理器为准。[OpenWrt 官方安装说明](https://openwrt.org/faq/how_to_install_packages)

通过 SSH 在路由器上执行：

```sh
cat /etc/openwrt_release
if command -v apk >/dev/null 2>&1; then
    apk --print-arch
else
    opkg print-architecture
fi
df -h
free -m
```

按包管理器返回的架构选择 `msm` 文件，不要仅凭 `uname -m` 猜测。尤其 ARM64 设备虽然都显示 `aarch64`，软件包架构仍可能不同。

| 硬件 | 软件包架构 | 对应程序 |
| --- | --- | --- |
| Intel / AMD 64 位软路由 | `x86_64` | Linux amd64，兼容基础 x86-64 指令集 |
| ARM64 路由器、开发板 | `aarch64_generic`、`aarch64_cortex-a53`、`aarch64_cortex-a72` | Linux arm64 |
| ARMv7 设备 | `arm_cortex-a7_neon-vfpv4`、`arm_cortex-a9_vfpv3-d16`、`arm_cortex-a9_neon`、`arm_cortex-a15_neon-vfpv4` | Linux armv7 |
| ARMv6 设备 | `arm_arm1176jzf-s_vfp` | Linux armv6 |
| LuCI 插件 | `all` | 所有受支持架构通用 |

没有匹配架构时，不要通过强制架构参数安装其他 CPU 的包。当前发布包不包含 MIPS 或 32 位 x86 版本。

程序使用静态 Go 构建，不依赖 glibc。安装后，数据库和下载的 DNS / 代理内核仍需要额外的持久化空间；小容量闪存设备可以先准备外接存储，再配置数据目录。

## 下载和校验

- [稳定版发布页](https://github.com/msm9527/msm-wiki/releases/latest)
- [全部发布记录（包含 Beta）](https://github.com/msm9527/msm-wiki/releases)
- 国内镜像：稳定版目录为 `https://msm.19930520.xyz/dl/<发布标签>/`，Beta 目录为 `https://msm.19930520.xyz/dl/beta/<发布标签>/`。

在同一个发布版本中下载三个文件：**一个匹配架构的 `msm` 包、一个同格式的 `luci-app-msm` 包和 `SHA256SUMS`**。发布页的「OpenWrt 原生安装包」表列出了完整文件名。IPK 与 APK 不能混装；APK 是 OpenWrt 的软件包，与 Android 安装包无关。

例如，发布标签 `1.5.0` 的 x86_64 包名是 `msm_1.5.0-r1_x86_64.ipk` 或 `msm-1.5.0-r1_x86_64.apk`，LuCI 包名是 `luci-app-msm_1.5.0-r1_all.ipk` 或 `luci-app-msm-1.5.0-r1_all.apk`。Beta 标签 `beta-1.5.0` 的 IPK 包版本为 `1.5.0~beta-r1`，APK 包版本为 `1.5.0_beta-r1`，以遵循各包管理器的预发布版本排序；下载 URL 的目录仍使用原发布标签。这里的版本号仅用于说明命名，请以发布页实际文件为准。

在路由器上创建一个空目录，例如 `/tmp/msm-install`，通过 SCP / SFTP 上传这三个文件。保留下载时的完整文件名，之后在该目录执行校验：

```sh
cd /tmp/msm-install
: > selected.sha256
for pkg in ./*.ipk ./*.apk; do
    [ -f "$pkg" ] || continue
    name="${pkg#./}"
    awk -v name="$name" '$2 == name { print; found = 1 } END { if (!found) exit 1 }' SHA256SUMS >> selected.sha256 || exit 1
done
# 应当恰好找到两个包的校验记录，且两个文件都显示 OK。
test "$(wc -l < selected.sha256)" -eq 2 && sha256sum -c selected.sha256
```

校验成功后，按实际包管理器安装。

### opkg 固件（IPK）

```sh
cd /tmp/msm-install
opkg update
opkg install ./msm_*.ipk ./luci-app-msm_*.ipk
```

也可以通过 LuCI 的「系统 → 软件包 → 上传软件包」先安装 `msm`，再安装 `luci-app-msm`。安装本地文件和查询架构的语法见 [opkg 官方文档](https://openwrt.org/docs/guide-user/additional-software/opkg)。

### apk 固件（APK）

```sh
cd /tmp/msm-install
apk update
apk add --allow-untrusted ./msm-*.apk ./luci-app-msm-*.apk
```

发布的 APK 是独立分发包，未使用 OpenWrt 官方软件源签名，因此在校验 SHA256 后用 `--allow-untrusted` 安装。这里的包使用 apk v3 格式，不能用于 Alpine 的旧版 apk v2。[apk 官方文档](https://openwrt.org/docs/guide-user/additional-software/apk)

安装失败时先检查架构、剩余空间和固件软件源；不要跳过依赖检查。LuCI 插件需要固件提供的 LuCI 和 rpcd，依赖由包管理器解析安装。

## 启动和初始化

首次安装默认**不启动 MSM**。重新登录 LuCI，打开「服务 → MSM」：

1. 确认 Web 端口，默认 `7777`。
2. 确认数据目录，默认 `/etc/msm`。外接存储应先完成挂载；修改目录不会自动迁移原来的数据。
3. 勾选启用，点击「保存并应用」。
4. 点击「打开 MSM Web 界面」，完成 [首次使用](/zh/guide/first-use) 中的管理员初始化。

也可以通过 SSH 启动：

```sh
uci set msm.main.enabled='1'
uci set msm.main.port='7777'
uci commit msm
/etc/init.d/msm enable
/etc/init.d/msm restart
```

默认 Web 地址是 `http://<路由器-LAN-IP>:7777`。OpenWrt 自带的 dnsmasq 通常使用 DNS 端口 `53`；初始化 DNS 服务时先选用空闲端口（例如 `1053`），验证成功后再配置 dnsmasq 转发或其他接入方式。安装包不会自动修改 DHCP、DNS、防火墙或静态路由。

如果 MSM 就运行在这台 OpenWrt 上，不要照抄「MSM 位于另一台主机」的网关静态路由示例；按实际部署配置本机服务。

## 服务管理和排错

OpenWrt 原生包统一使用 procd 管理。下面的命令也适用于尚未包含新 CLI 服务管理适配的旧版 MSM：

```sh
# 状态、重启、停止
/etc/init.d/msm status
/etc/init.d/msm restart
/etc/init.d/msm stop

# 配置和系统日志
uci show msm
logread -e msm

# procd 进程信息
ubus call service list '{"name":"msm"}'
```

要持久停用，在 LuCI 取消启用并保存，或执行：

```sh
uci set msm.main.enabled='0'
uci commit msm
/etc/init.d/msm stop
/etc/init.d/msm disable
```

首次创建默认数据目录时，程序日志放在 `/tmp/msm/logs`，以减少闪存写入；重启设备后这些日志会清空。配置和数据库仍保存在数据目录中。

出现 Web 页面无法访问时，检查服务状态、配置端口是否被占用，以及实际 LAN 地址。修改数据目录后无法启动时，检查目录是否为绝对路径、存储是否已挂载且可写。LuCI 菜单未出现时，重新登录 LuCI 并确认 `luci-app-msm` 安装成功。

## 更新、备份和卸载

更新前，在 MSM 的 [备份恢复](/zh/guide/backup-restore) 页面导出配置，也可以在停服后复制整个数据目录。下载同一渠道的新 `msm` 与 `luci-app-msm` 包，校验后重复对应安装命令。升级保留 UCI 配置和应用数据；原先启用的服务在升级后恢复运行。

OpenWrt 软件包安装的 MSM 应通过 **opkg / apk 更新**，不要再用通用 Linux 安装脚本覆盖程序和服务文件。

卸载命令：

```sh
# opkg 固件
opkg remove luci-app-msm msm

# apk 固件（二选一，按实际包管理器执行）
apk del luci-app-msm msm
```

卸载会停止服务，应用数据目录会保留。固件重刷、恢复出厂设置或外接存储变更前，应另外保存备份；自定义数据目录需要自行纳入固件升级备份。

## 下一步

- [首次使用](/zh/guide/first-use)
- [DNS 服务管理](/zh/guide/mosdns)
- [OpenWrt 接入独立 MSM 主机](/zh/guide/openwrt)
