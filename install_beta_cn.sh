#!/bin/bash

# MSM Beta 国内镜像一键安装脚本（独立）
# 仅使用 msm.19930520.xyz Beta 镜像获取版本与二进制包，适用于 Linux/macOS

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
GITHUB_REPO="msm9527/msm-wiki"
SERVICE_NAME="msm"
MSM_VERSION="${MSM_VERSION:-}"
MSM_DL_BASE="${MSM_DL_BASE:-https://msm.19930520.xyz/dl/beta}"
MSM_CONFIG_DIR="${MSM_CONFIG_DIR:-}"
FETCH_CONNECT_TIMEOUT="${MSM_FETCH_CONNECT_TIMEOUT:-10}"
FETCH_MAX_TIME="${MSM_FETCH_MAX_TIME:-30}"
MSM_AUTO_FIX_PORT_CONFLICTS="${MSM_AUTO_FIX_PORT_CONFLICTS:-}"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

fetch_text() {
    local url="$1"
    local show_progress="${2:-true}"

    if [ "$show_progress" = "true" ]; then
        print_info "获取: $url"
    fi

    if [ "$DOWNLOAD_CMD" = "wget" ]; then
        wget -qO- --timeout="$FETCH_CONNECT_TIMEOUT" "$url"
    else
        curl --connect-timeout "$FETCH_CONNECT_TIMEOUT" --max-time "$FETCH_MAX_TIME" --retry 3 --retry-delay 1 -fsSL "$url"
    fi
}

download_file() {
    local url="$1"
    local output="$2"

    print_info "开始下载..."
    print_info "URL: $url"

    if [ "$DOWNLOAD_CMD" = "wget" ]; then
        wget --timeout=30 -O "$output" "$url"
    else
        curl --connect-timeout 30 --max-time 300 --retry 3 --retry-delay 1 -fL --progress-bar "$url" -o "$output"
    fi
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 权限运行此脚本"
        print_info "使用以下方式之一运行:"
        print_info "  方式1: sudo bash install_beta_cn.sh"
        print_info "  方式2: su root -c 'bash install_beta_cn.sh'"
        print_info "  方式3: 切换到 root 用户后运行 bash install_beta_cn.sh"
        exit 1
    fi
}

# 解析 MSM 配置目录（确保 systemd 服务使用持久目录）
resolve_config_dir() {
    # 允许外部显式指定
    if [ -n "$MSM_CONFIG_DIR" ]; then
        echo "$MSM_CONFIG_DIR"
        return
    fi

    # 优先读取 root 用户 home
    local root_home=""
    if command -v getent > /dev/null 2>&1; then
        root_home=$(getent passwd root 2>/dev/null | cut -d: -f6 || true)
    fi
    if [ -z "$root_home" ]; then
        root_home="/root"
    fi

    echo "${root_home}/.msm"
}

normalize_version() {
    local version="$1"

    version="${version#v}"
    if echo "$version" | grep -q '^beta-'; then
        if ! is_beta_version "$version"; then
            print_error "无效的 Beta 版本号: $1"
            print_info "版本号示例: beta-0.7.7 或 0.7.7"
            exit 1
        fi
        echo "$version"
        return
    fi

    if ! is_beta_version "$version"; then
        print_error "无效的 Beta 版本号: $1"
        print_info "版本号示例: beta-0.7.7 或 0.7.7"
        exit 1
    fi
    echo "beta-${version}"
}

is_beta_version() {
    echo "$1" | grep -Eq '^(v?beta-)?[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$'
}

systemd_is_running() {
    command -v systemctl > /dev/null 2>&1 || return 1
    [ -d /run/systemd/system ] || return 1

    local state
    state=$(systemctl is-system-running 2>/dev/null || true)
    case "$state" in
        running|degraded|starting|initializing)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

is_truthy() {
    case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
        1|y|yes|true|on)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# 检测系统架构
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "amd64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            print_error "不支持的系统架构: $arch"
            print_info "目前仅支持 amd64 和 arm64 架构"
            exit 1
            ;;
    esac
}

# 检测操作系统
detect_os() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    case $os in
        linux)
            echo "linux"
            ;;
        darwin)
            echo "darwin"
            ;;
        *)
            print_error "不支持的操作系统: $os"
            print_info "目前仅支持 Linux 和 macOS"
            exit 1
            ;;
    esac
}

# 检测 libc 类型（glibc 或 musl）
detect_libc() {
    # 检查是否是 Alpine Linux（使用 musl）
    if [ -f /etc/alpine-release ]; then
        echo "musl"
        return
    fi

    # 检查 ldd 版本信息
    if command -v ldd &> /dev/null; then
        if ldd --version 2>&1 | grep -qi musl; then
            echo "musl"
            return
        fi
    fi

    # 默认为 glibc
    echo "glibc"
}

# 安装依赖
install_dependencies() {
    # 检查 wget 或 curl 是否存在
    if command -v curl &> /dev/null; then
        DOWNLOAD_CMD="curl"
        return
    elif command -v wget &> /dev/null; then
        DOWNLOAD_CMD="wget"
        return
    fi

    # 两者都不存在，需要安装
    print_info "wget 和 curl 都未安装，正在安装 wget..."

    local os=$(uname -s | tr '[:upper:]' '[:lower:]')

    if [ "$os" = "linux" ]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release

            case $ID in
                ubuntu|debian)
                    apt-get install -y wget > /dev/null 2>&1
                    ;;
                centos|rhel|fedora)
                    yum install -y wget > /dev/null 2>&1
                    ;;
                alpine)
                    apk add --no-cache wget > /dev/null 2>&1
                    ;;
                *)
                    print_error "无法自动安装 wget，请手动安装 wget 或 curl"
                    exit 1
                    ;;
            esac
        fi
    elif [ "$os" = "darwin" ]; then
        print_error "wget 和 curl 都未安装，请使用 brew install wget 安装"
        exit 1
    fi

    DOWNLOAD_CMD="wget"
    print_success "wget 安装完成"
}

# 获取最新版本号
get_latest_version() {
    print_info "从国内镜像获取最新 Beta 版本信息..."
    local version
    local mirror_version_url="${MSM_DL_BASE%/}/.version"
    version=$(fetch_text "$mirror_version_url" "true" || true)
    version=$(echo "$version" | tr -d '\r\n[:space:]')

    if ! is_beta_version "$version" || ! echo "$version" | grep -Eq '^beta-'; then
        print_error "无法从镜像获取最新 Beta 版本信息"
        print_info "可设置 MSM_VERSION 指定版本号，例如："
        print_info "  MSM_VERSION=beta-0.7.6 bash install_beta_cn.sh"
        exit 1
    fi

    echo "$version"
}

# 下载 MSM
download_msm() {
    local version=$1
    local os=$2
    local arch=$3
    local libc=$4

    # 构建文件名
    local filename
    local libc_suffix=""
    if [ "$os" = "linux" ] && [ "$libc" = "musl" ]; then
        libc_suffix="-musl"
    fi
    local version_clean="${version#v}"
    filename="msm-${version_clean}-${os}-${arch}${libc_suffix}.tar.gz"

    local download_url="${MSM_DL_BASE%/}/${version_clean}/${filename}"
    local checksum_url="${MSM_DL_BASE%/}/${version_clean}/SHA256SUMS"

    print_info "下载 MSM ${version} (${os}-${arch}${libc_suffix})..."
    print_info "下载地址: $download_url"
    printf '\n' >&2

    printf '\n' >&2

    # 创建临时目录
    local temp_dir
    if ! temp_dir=$(mktemp -d); then
        print_error "无法创建临时目录"
        exit 1
    fi

    # 下载文件（显示进度条）
    if ! download_file "$download_url" "${temp_dir}/${filename}"; then
        print_error "下载失败: $download_url"
        rm -rf "${temp_dir}"
        exit 1
    fi
    printf '\n' >&2

    # 校验发布包完整性
    local checksum_manifest
    if ! checksum_manifest=$(fetch_text "$checksum_url" "false"); then
        print_warning "镜像未提供 SHA256 校验清单，尝试从 GitHub Release 获取"
        checksum_url="https://github.com/${GITHUB_REPO}/releases/download/${version}/SHA256SUMS"
        if ! checksum_manifest=$(fetch_text "$checksum_url" "false"); then
            print_error "无法下载 SHA256 校验清单: $checksum_url"
            rm -rf "${temp_dir}"
            exit 1
        fi
    fi
    local expected_checksum
    expected_checksum=$(printf '%s\n' "$checksum_manifest" | awk -v file="$filename" '$2 == file {print $1; exit}')
    if ! echo "$expected_checksum" | grep -Eq '^[0-9a-fA-F]{64}$'; then
        print_error "SHA256 校验清单中没有找到 $filename"
        rm -rf "${temp_dir}"
        exit 1
    fi
    local actual_checksum
    if command -v sha256sum > /dev/null 2>&1; then
        actual_checksum=$(sha256sum "${temp_dir}/${filename}" | awk '{print $1}')
    elif command -v shasum > /dev/null 2>&1; then
        actual_checksum=$(shasum -a 256 "${temp_dir}/${filename}" | awk '{print $1}')
    elif command -v openssl > /dev/null 2>&1; then
        actual_checksum=$(openssl dgst -sha256 "${temp_dir}/${filename}" | sed 's/^.*= //')
    else
        print_error "系统缺少 sha256sum、shasum 或 openssl，无法校验下载包"
        rm -rf "${temp_dir}"
        exit 1
    fi
    if [ "${actual_checksum}" != "${expected_checksum}" ]; then
        print_error "SHA256 校验失败: $filename"
        rm -rf "${temp_dir}"
        exit 1
    fi
    print_success "SHA256 校验通过"

    local archive_entries
    if ! archive_entries=$(tar -tzf "${temp_dir}/${filename}"); then
        print_error "无法读取压缩包内容"
        rm -rf "${temp_dir}"
        exit 1
    fi
    local archive_entry
    local found_binary="false"
    while IFS= read -r archive_entry; do
        case "$archive_entry" in
            msm)
                found_binary="true"
                ;;
            "")
                ;;
            *)
                print_error "压缩包包含不允许的文件: $archive_entry"
                rm -rf "${temp_dir}"
                exit 1
                ;;
        esac
    done <<< "$archive_entries"
    if [ "$found_binary" != "true" ]; then
        print_error "压缩包中缺少 msm 二进制文件"
        rm -rf "${temp_dir}"
        exit 1
    fi

    # 解压文件
    print_info "解压文件..."
    if ! tar -xzf "${temp_dir}/${filename}" -C "$temp_dir"; then
        print_error "解压失败"
        rm -rf "${temp_dir}"
        exit 1
    fi

    # 删除压缩包
    rm "${temp_dir}/${filename}"

    printf '%s\n' "$temp_dir"
}

# 安装 MSM
install_msm() {
    local temp_dir="$1"
    local target="/usr/local/bin/msm"
    local staged="${target}.new.$$"

    print_info "安装 MSM..."

    if [ ! -f "${temp_dir}/msm" ]; then
        print_error "下载包中缺少 msm 二进制文件"
        rm -rf "$temp_dir"
        exit 1
    fi

    if ! cp "${temp_dir}/msm" "$staged" || ! chmod 0755 "$staged"; then
        print_error "无法准备新的 MSM 二进制文件"
        rm -f "$staged"
        rm -rf "$temp_dir"
        exit 1
    fi

    # 尝试停止正在运行的服务/进程，避免覆盖二进制失败
    if systemd_is_running; then
        if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
            print_info "停止 ${SERVICE_NAME} 服务..."
            systemctl stop "$SERVICE_NAME"
        fi
    fi
    if pgrep -f "/usr/local/bin/msm" > /dev/null 2>&1; then
        print_info "停止正在运行的 MSM 进程..."
        pkill -f "/usr/local/bin/msm" || true
        sleep 1
        if pgrep -f "/usr/local/bin/msm" > /dev/null 2>&1; then
            pkill -9 -f "/usr/local/bin/msm" || true
        fi
    fi

    # 复制文件到系统路径
    if ! mv -f "$staged" "$target"; then
        print_error "无法原子替换 $target"
        rm -f "$staged"
        rm -rf "$temp_dir"
        exit 1
    fi

    # 清理临时文件
    rm -rf "${temp_dir}"

    print_success "MSM 二进制文件已安装到 /usr/local/bin/msm"
}

# 安装系统服务
install_service() {
    print_info "安装系统服务..."

    # 检测服务管理器
    if systemd_is_running; then
        # 显式指定配置目录，避免在部分 CT/非交互环境落到临时目录
        /usr/local/bin/msm service install --manager systemd -c "$MSM_CONFIG_DIR"
        print_success "systemd 服务已安装"
    elif command -v rc-update &> /dev/null; then
        # Alpine Linux 使用 OpenRC
        print_warning "检测到 OpenRC 服务管理器"
        print_warning "MSM 目前主要支持 systemd，在 Alpine 上请手动管理服务"
        print_info "可以使用以下命令直接运行 MSM："
        print_info "  msm -d  # 后台运行"
        print_info "  msm     # 前台运行"
        return
    else
        print_warning "未检测到 systemd 或 OpenRC，跳过服务安装"
        print_info "请手动运行 MSM: msm -d"
        return
    fi

    print_success "系统服务已安装"
}

# 检查并处理端口冲突
get_port_53_conflict() {
    local process_name=""
    local port53_process=""

    if command -v lsof &> /dev/null; then
        port53_process=$(lsof -i :53 -t 2>/dev/null | head -1)
        if [ -n "$port53_process" ]; then
            process_name=$(ps -p "$port53_process" -o comm= 2>/dev/null)
        fi
    elif command -v ss &> /dev/null; then
        local ss_out=""
        ss_out=$(ss -H -lntup 'sport = :53' 2>/dev/null || true)
        ss_out="${ss_out}"$'\n'"$(ss -H -lnup 'sport = :53' 2>/dev/null || true)"
        if echo "$ss_out" | grep -q '[^[:space:]]'; then
            port53_process=$(echo "$ss_out" | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
            process_name=$(echo "$ss_out" | sed -n 's/.*users:(("\([^"]\+\)".*/\1/p' | head -1)
            if [ -z "$process_name" ] && [ -n "$port53_process" ]; then
                process_name=$(ps -p "$port53_process" -o comm= 2>/dev/null)
            fi
        fi
    elif command -v netstat &> /dev/null && netstat -tuln 2>/dev/null | grep -q ":53 "; then
        process_name="unknown"
    else
        return 2
    fi

    if [ -n "$process_name" ] || [ -n "$port53_process" ]; then
        printf '%s|%s\n' "$process_name" "$port53_process"
        return 0
    fi

    return 1
}

print_port_conflict_help() {
    local process_name="$1"
    local port53_process="$2"

    if [ -n "$process_name" ] && [ -n "$port53_process" ]; then
        print_warning "检测到 53 端口被占用: $process_name (PID: $port53_process)"
    else
        print_warning "检测到 53 端口被占用"
    fi

    print_warning "自动处理将停止并禁用冲突服务"
    print_warning "处理 systemd-resolved 时，必要时会重写 /etc/resolv.conf 并备份原文件"
    print_info "常见冲突服务: systemd-resolved、dnsmasq、named、bind9"
    print_info "非交互环境会在打印提示后默认自动处理"
}

prompt_port_conflict_fix() {
    local process_name="$1"
    local port53_process="$2"

    print_port_conflict_help "$process_name" "$port53_process"

    if is_truthy "$MSM_AUTO_FIX_PORT_CONFLICTS"; then
        print_info "已启用 MSM_AUTO_FIX_PORT_CONFLICTS，开始自动处理 53 端口冲突"
        return 0
    fi

    if [ ! -t 0 ]; then
        print_info "检测到非交互运行，默认自动处理 53 端口冲突"
        return 0
    fi

    printf "是否自动处理 53 端口冲突？[y/N]: " >&2
    local answer=""
    read -r answer || return 1
    if is_truthy "$answer"; then
        return 0
    fi

    print_info "已取消自动处理"
    print_info "如确认允许脚本自动处理，可重新运行并输入 y，或使用 MSM_AUTO_FIX_PORT_CONFLICTS=1"
    return 1
}

stop_and_disable_service() {
    local service="$1"

    if ! systemd_is_running; then
        print_error "检测到 53 端口冲突，但当前系统不支持通过 systemctl 自动处理"
        return 1
    fi

    if systemctl is-active --quiet "$service" 2>/dev/null; then
        print_info "停止 $service 服务..."
        systemctl stop "$service"
        systemctl disable "$service"
        print_success "$service 已停止并禁用"
        return 0
    fi

    return 1
}

needs_resolv_conf_update() {
    if [ -L /etc/resolv.conf ]; then
        return 0
    fi

    if [ -f /etc/resolv.conf ] && grep -Eq '^[[:space:]]*nameserver[[:space:]]+127\.0\.0\.53([[:space:]]|$)' /etc/resolv.conf 2>/dev/null; then
        return 0
    fi

    return 1
}

update_resolv_conf() {
    local backup_path="/etc/resolv.conf.msm-backup.$(date +%Y%m%d%H%M%S)"

    if [ -L /etc/resolv.conf ] || [ -f /etc/resolv.conf ]; then
        cp -fL /etc/resolv.conf "$backup_path" 2>/dev/null || cp -af /etc/resolv.conf "$backup_path" 2>/dev/null || true
    fi

    rm -f /etc/resolv.conf
    cat > /etc/resolv.conf <<'EOF'
nameserver 223.5.5.5
nameserver 114.114.114.114
EOF

    print_success "已更新 DNS 配置"
    if [ -e "$backup_path" ]; then
        print_info "原 resolv.conf 备份路径: $backup_path"
    fi
}

auto_fix_port_conflicts() {
    local handled_any="false"

    if stop_and_disable_service "systemd-resolved"; then
        handled_any="true"
        if needs_resolv_conf_update; then
            update_resolv_conf
        fi
    fi

    for service in dnsmasq named bind9; do
        if stop_and_disable_service "$service"; then
            handled_any="true"
        fi
    done

    if [ "$handled_any" != "true" ]; then
        print_error "未找到可自动处理的 systemd 服务，请手动释放 53 端口"
        return 1
    fi

    local conflict=""
    local detect_status=0
    if conflict=$(get_port_53_conflict); then
        detect_status=0
    else
        detect_status=$?
    fi
    if [ "$detect_status" -eq 0 ]; then
        local process_name="${conflict%%|*}"
        local port53_process="${conflict#*|}"
        if [ -n "$process_name" ] && [ -n "$port53_process" ]; then
            print_error "53 端口仍被占用: $process_name (PID: $port53_process)"
        else
            print_error "53 端口仍被占用"
        fi
        return 1
    fi

    print_success "53 端口冲突已自动处理"
}

check_port_conflicts() {
    print_info "检查端口占用情况..."

    local conflict=""
    local detect_status=0
    if conflict=$(get_port_53_conflict); then
        detect_status=0
    else
        detect_status=$?
    fi
    if [ "$detect_status" -eq 1 ]; then
        return
    fi
    if [ "$detect_status" -eq 2 ]; then
        print_warning "未检测到 lsof、ss 或 netstat，跳过端口检测"
        return
    fi

    local process_name="${conflict%%|*}"
    local port53_process="${conflict#*|}"
    if ! systemd_is_running; then
        print_warning "当前没有运行中的 systemd，无法自动释放 53 端口；请手动处理后再启动 MSM"
        return
    fi
    if prompt_port_conflict_fix "$process_name" "$port53_process"; then
        auto_fix_port_conflicts
        return
    fi

    print_error "用户未同意自动处理 53 端口冲突，安装已停止"
    return 1
}

# 配置防火墙
configure_firewall() {
    print_info "配置防火墙..."

    local ports="7777 53 1053 7890 7891 7892 6666"

    # 检测防火墙类型
    if command -v ufw &> /dev/null; then
        if ! ufw status 2>/dev/null | grep -q '^Status: active'; then
            print_warning "检测到 UFW，但未启用，跳过自动配置"
            return
        fi
        # Ubuntu/Debian UFW
        for port in $ports; do
            ufw allow ${port}/tcp > /dev/null 2>&1
            ufw allow ${port}/udp > /dev/null 2>&1
        done
        print_success "UFW 防火墙规则已添加"
    elif command -v firewall-cmd &> /dev/null; then
        if ! firewall-cmd --state > /dev/null 2>&1; then
            print_warning "检测到 firewalld，但服务未运行，跳过自动配置"
            return
        fi
        # CentOS/RHEL firewalld
        for port in $ports; do
            firewall-cmd --permanent --add-port=${port}/tcp > /dev/null 2>&1
            firewall-cmd --permanent --add-port=${port}/udp > /dev/null 2>&1
        done
        firewall-cmd --reload > /dev/null 2>&1
        print_success "firewalld 防火墙规则已添加"
    elif command -v iptables &> /dev/null; then
        # Alpine Linux 或其他使用 iptables 的系统
        print_warning "检测到 iptables，请手动配置防火墙规则"
        print_info "需要开放的端口："
        print_info "  TCP/UDP: 7777 (Web 管理界面)"
        print_info "  TCP/UDP: 53, 1053 (DNS 服务)"
        print_info "  TCP/UDP: 7890, 7891, 7892 (代理服务)"
        print_info "  TCP/UDP: 6666 (管理端口)"
    else
        print_warning "未检测到防火墙，请手动开放以下端口："
        print_warning "  TCP/UDP: 7777 (Web 管理界面)"
        print_warning "  TCP/UDP: 53, 1053 (DNS 服务)"
        print_warning "  TCP/UDP: 7890, 7891, 7892 (代理服务)"
        print_warning "  TCP/UDP: 6666 (管理端口)"
    fi
}

# 启动服务
start_service() {
    print_info "启动 MSM 服务..."

    # 检测服务管理器
    if systemd_is_running; then
        systemctl start "$SERVICE_NAME"

        # 等待服务启动
        sleep 2

        # 检查服务状态
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            print_success "MSM 服务已启动"
        else
            print_error "MSM 服务启动失败"
            print_info "查看日志: journalctl -u ${SERVICE_NAME} -n 50"
            print_info "或使用: msm logs"
            exit 1
        fi
    else
        # 非 systemd 系统（如 Alpine）
        print_warning "未检测到 systemd，请手动启动 MSM"
        print_info "后台运行: msm -d"
        print_info "前台运行: msm"
    fi
}

# 判断是否为公网 IPv4
is_public_ipv4() {
    local ip="$1"

    echo "$ip" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$' || return 1

    local o1 o2 o3 o4
    IFS='.' read -r o1 o2 o3 o4 <<< "$ip"

    for o in "$o1" "$o2" "$o3" "$o4"; do
        [ -n "$o" ] || return 1
        [ "$o" -ge 0 ] 2>/dev/null && [ "$o" -le 255 ] 2>/dev/null || return 1
    done

    # 排除私网/保留网段
    if [ "$o1" -eq 0 ] || [ "$o1" -eq 10 ] || [ "$o1" -eq 127 ]; then
        return 1
    fi
    if [ "$o1" -eq 100 ] && [ "$o2" -ge 64 ] && [ "$o2" -le 127 ]; then
        return 1
    fi
    if [ "$o1" -eq 169 ] && [ "$o2" -eq 254 ]; then
        return 1
    fi
    if [ "$o1" -eq 172 ] && [ "$o2" -ge 16 ] && [ "$o2" -le 31 ]; then
        return 1
    fi
    if [ "$o1" -eq 192 ] && [ "$o2" -eq 168 ]; then
        return 1
    fi
    if [ "$o1" -ge 224 ]; then
        return 1
    fi

    return 0
}

# 获取公网 IPv4（适配国内网络，多源探测并过滤私网/保留地址）
get_public_ipv4() {
    local services=(
        "https://ip.3322.net"
        "https://4.ipw.cn"
        "https://myip.ipip.net"
        "https://pv.sohu.com/cityjson?ie=utf-8"
        "https://ifconfig.me"
    )

    for url in "${services[@]}"; do
        local resp=""
        local ip=""

        if [ "$DOWNLOAD_CMD" = "wget" ]; then
            resp=$(wget -qO- --timeout=4 "$url" 2>/dev/null || true)
        else
            resp=$(curl -fsSL --connect-timeout 2 --max-time 4 "$url" 2>/dev/null || true)
        fi

        ip=$(echo "$resp" | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
        if is_public_ipv4 "$ip"; then
            echo "$ip"
            return 0
        fi
    done

    return 1
}

# 显示安装信息
show_info() {
    # 获取内网 IP 地址
    local lan_ip=""

    # 方法1: 使用 hostname 命令
    if command -v hostname &> /dev/null; then
        lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
    fi

    # 方法2: 使用 ip 命令
    if [ -z "$lan_ip" ]; then
        if command -v ip &> /dev/null; then
            lan_ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || echo "")
        fi
    fi

    # 方法3: 使用 ifconfig 命令
    if [ -z "$lan_ip" ]; then
        if command -v ifconfig &> /dev/null; then
            lan_ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1 || echo "")
        fi
    fi

    # 方法4: 使用 ip addr 命令
    if [ -z "$lan_ip" ]; then
        if command -v ip &> /dev/null; then
            lan_ip=$(ip addr show 2>/dev/null | grep -Eo 'inet ([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1 || echo "")
        fi
    fi

    # 方法5: 读取 /proc/net/fib_trie (Linux 特有)
    if [ -z "$lan_ip" ] && [ -f /proc/net/fib_trie ]; then
        lan_ip=$(cat /proc/net/fib_trie 2>/dev/null | grep -B1 "host LOCAL" | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1 || echo "")
    fi

    # 方法6: 使用 awk 解析 /proc/net/route (Linux 特有)
    if [ -z "$lan_ip" ] && [ -f /proc/net/route ]; then
        local iface=$(awk '$2 == "00000000" {print $1; exit}' /proc/net/route 2>/dev/null)
        if [ -n "$iface" ]; then
            lan_ip=$(ip -4 addr show dev "$iface" 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1 || echo "")
        fi
    fi

    # 获取外网 IP 地址
    local wan_ip=""

    wan_ip=$(get_public_ipv4 2>/dev/null || echo "")

    echo ""
    echo "=========================================="
    echo -e "${GREEN}MSM 安装完成！${NC}"
    echo "=========================================="
    echo ""

    # 只在成功获取到 IP 时显示
    if [ -n "$lan_ip" ] || [ -n "$wan_ip" ]; then
        echo "访问地址:"
        if [ -n "$lan_ip" ]; then
            echo "  内网访问: http://${lan_ip}:7777"
        fi
        if [ -n "$wan_ip" ]; then
            echo "  外网访问: http://${wan_ip}:7777"
        fi
        echo ""
    fi

    echo -e "${YELLOW}重要提示:${NC}"
    echo "  1. 首次访问时需要创建管理员账号"
    echo "  2. 请设置强密码并妥善保管"
    if [ -n "$wan_ip" ]; then
        echo "  3. 外网访问需要确保防火墙已开放 7777 端口"
    fi
    echo ""
    echo "常用命令:"
    echo "  查看状态: msm status"
    echo "  查看日志: msm logs"
    echo "  停止服务: msm stop"
    echo "  重启服务: msm restart"
    echo "  重置密码: msm reset-password"
    echo "  系统诊断: msm doctor"
    echo ""
    echo "或使用 systemd:"
    echo "  systemctl status msm"
    echo "  systemctl stop msm"
    echo "  systemctl restart msm"
    echo "  journalctl -u msm -f"
    echo ""
    echo "安装位置: /usr/local/bin/msm"
    echo "配置目录: ${MSM_CONFIG_DIR}"
    echo ""
    echo "文档地址: https://doc.msmbox.net/zh/"
    echo "使用与合规: https://doc.msmbox.net/zh/legal/"
    echo "请仅在自有或已获授权的设备与网络中使用 MSM。"
    echo "=========================================="
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  MSM 一键安装脚本"
    echo "  MSM Manager"
    echo "=========================================="
    echo ""

    # 检查 root 权限
    check_root

    # 解析配置目录（用于 service install，避免重启后丢失初始化状态）
    MSM_CONFIG_DIR=$(resolve_config_dir)
    print_info "MSM 配置目录: $MSM_CONFIG_DIR"

    # 检测操作系统和架构
    local os=$(detect_os)
    local arch=$(detect_arch)
    print_info "操作系统: $os"
    print_info "系统架构: $arch"

    # 检测 libc 类型（仅 Linux）
    local libc=""
    if [ "$os" = "linux" ]; then
        libc=$(detect_libc)
        print_info "libc 类型: $libc"
    fi

    # 安装依赖
    install_dependencies

    # 获取版本
    local version
    if [ -n "$MSM_VERSION" ]; then
        version=$(normalize_version "$MSM_VERSION")
        print_info "使用指定版本: $version"
    else
        version=$(get_latest_version)
        print_success "最新版本: $version"
    fi

    # 下载 MSM
    local temp_dir
    temp_dir=$(download_msm "$version" "$os" "$arch" "$libc")

    # 安装 MSM
    install_msm "$temp_dir"

    # 检查并处理端口冲突
    check_port_conflicts

    # 安装系统服务
    install_service

    # 配置防火墙
    configure_firewall

    # 启动服务
    start_service

    # 显示安装信息
    show_info
}

# 运行主函数
main "$@"
