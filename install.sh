#!/bin/bash

# MSM 一键安装部署脚本
# 适用于 Linux 系统 (Ubuntu/Debian/CentOS)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
GITHUB_REPO="msm9527/msm-wiki"
RELEASE_URL="https://github.com/${GITHUB_REPO}/releases/latest"
SERVICE_NAME="msm"
GITHUB_PROXY="${MSM_GITHUB_PROXY:-${GITHUB_PROXY:-}}"
GITHUB_PROXY="${GITHUB_PROXY%/}"
GITHUB_PROXY_CANDIDATES=(
    "$GITHUB_PROXY"
    "https://edgeone.gh-proxy.org"
    "https://hk.gh-proxy.org"
    "https://cdn.gh-proxy.org"
    "https://ghfast.top"
    "https://gh-proxy.org"
    "https://v6.gh-proxy.org"
)

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

# 拼接代理地址
build_proxy_url() {
    local base="$1"
    local url="$2"
    base="${base%/}"
    echo "${base}/${url}"
}

# 获取文本内容（支持 GitHub 代理回退）
fetch_text() {
    local url="$1"
    local result=""
    local urls=("$url")

    for proxy in "${GITHUB_PROXY_CANDIDATES[@]}"; do
        [ -n "$proxy" ] || continue
        urls+=("$(build_proxy_url "$proxy" "$url")")
    done

    for u in "${urls[@]}"; do
        if [ "$DOWNLOAD_CMD" = "wget" ]; then
            result=$(wget -qO- "$u" 2>/dev/null || true)
        else
            result=$(curl -fsSL "$u" 2>/dev/null || true)
        fi
        if [ -n "$result" ]; then
            echo "$result"
            return 0
        fi
    done

    return 1
}

# 下载文件（支持 GitHub 代理回退）
download_with_fallback() {
    local url="$1"
    local output="$2"
    local urls=("$url")

    for proxy in "${GITHUB_PROXY_CANDIDATES[@]}"; do
        [ -n "$proxy" ] || continue
        urls+=("$(build_proxy_url "$proxy" "$url")")
    done

    for u in "${urls[@]}"; do
        if [ "$DOWNLOAD_CMD" = "wget" ]; then
            if wget --progress=bar:force:noscroll "$u" -O "$output"; then
                return 0
            fi
        else
            if curl -fL "$u" -o "$output"; then
                return 0
            fi
        fi
        print_warning "下载失败，尝试下一个镜像..."
    done

    return 1
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 权限运行此脚本"
        print_info "使用以下方式之一运行:"
        print_info "  方式1: sudo bash install.sh"
        print_info "  方式2: su root -c 'bash install.sh'"
        print_info "  方式3: 切换到 root 用户后运行 bash install.sh"
        exit 1
    fi
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
    if command -v wget &> /dev/null; then
        DOWNLOAD_CMD="wget"
        return
    elif command -v curl &> /dev/null; then
        DOWNLOAD_CMD="curl"
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
    print_info "获取最新版本信息..."

    local version
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
    local response

    if ! response=$(fetch_text "$api_url"); then
        response=""
    fi

    if [ -n "$response" ]; then
        version=$(echo "$response" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    fi

    if [ -z "$version" ] || ! echo "$version" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+'; then
        local html
        local releases_url="https://github.com/${GITHUB_REPO}/releases/latest"
        html=$(fetch_text "$releases_url" || true)
        version=$(echo "$html" | grep -Eo 'releases/tag/v[0-9]+\.[0-9]+\.[0-9]+[^"]*' | head -1 | sed 's#.*/##')
    fi

    if [ -z "$version" ]; then
        print_error "无法获取最新版本信息"
        print_info "可尝试设置 MSM_GITHUB_PROXY 或 GITHUB_PROXY 后重试"
        exit 1
    fi

    echo $version
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
    filename="msm-${version}-${os}-${arch}${libc_suffix}.tar.gz"

    local download_url="https://github.com/${GITHUB_REPO}/releases/download/${version}/${filename}"

    print_info "下载 MSM ${version} (${os}-${arch}${libc_suffix})..."
    print_info "下载地址: $download_url"
    printf '\n' >&2

    # 创建临时目录
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"

    # 下载文件（显示进度条）
    if ! download_with_fallback "$download_url" "${filename}"; then
        print_error "下载失败"
        print_info "可尝试设置 MSM_GITHUB_PROXY 或 GITHUB_PROXY 后重试"
        rm -rf $temp_dir
        exit 1
    fi
    printf '\n' >&2

    # 解压文件
    print_info "解压文件..."
    if ! tar -xzf "${filename}"; then
        print_error "解压失败"
        rm -rf $temp_dir
        exit 1
    fi

    # 删除压缩包
    rm "${filename}"

    printf '%s\n' "$temp_dir"
}

# 安装 MSM
install_msm() {
    local temp_dir="$1"

    print_info "安装 MSM..."

    # 复制文件到系统路径
    cp "${temp_dir}/msm" /usr/local/bin/msm
    chmod +x /usr/local/bin/msm

    # 清理临时文件
    rm -rf "${temp_dir}"

    print_success "MSM 二进制文件已安装到 /usr/local/bin/msm"
}

# 安装系统服务
install_service() {
    print_info "安装系统服务..."

    # 检测服务管理器
    if command -v systemctl &> /dev/null; then
        # 使用 MSM 内置命令安装 systemd 服务
        /usr/local/bin/msm service install
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
check_port_conflicts() {
    print_info "检查端口占用情况..."

    # 检查 53 端口
    if command -v lsof &> /dev/null; then
        local port53_process=$(lsof -i :53 -t 2>/dev/null | head -1)
        if [ -n "$port53_process" ]; then
            local process_name=$(ps -p $port53_process -o comm= 2>/dev/null)
            print_warning "检测到 53 端口被占用: $process_name (PID: $port53_process)"

            # 处理 systemd-resolved
            if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
                print_info "停止 systemd-resolved 服务..."
                systemctl stop systemd-resolved
                systemctl disable systemd-resolved
                print_success "systemd-resolved 已停止并禁用"

                # 备份并修改 resolv.conf
                if [ -L /etc/resolv.conf ]; then
                    rm /etc/resolv.conf
                    echo "nameserver 8.8.8.8" > /etc/resolv.conf
                    echo "nameserver 1.1.1.1" >> /etc/resolv.conf
                    print_success "已更新 DNS 配置"
                fi
            fi

            # 检查其他可能占用 53 端口的服务
            for service in dnsmasq named bind9; do
                if systemctl is-active --quiet $service 2>/dev/null; then
                    print_info "停止 $service 服务..."
                    systemctl stop $service
                    systemctl disable $service
                    print_success "$service 已停止并禁用"
                fi
            done
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":53 "; then
            print_warning "检测到 53 端口被占用"
            print_warning "尝试停止可能冲突的服务..."

            for service in systemd-resolved dnsmasq named bind9; do
                if systemctl is-active --quiet $service 2>/dev/null; then
                    systemctl stop $service
                    systemctl disable $service
                    print_success "$service 已停止并禁用"
                fi
            done
        fi
    fi
}

# 配置防火墙
configure_firewall() {
    print_info "配置防火墙..."

    local ports="7777 53 1053 7890 7891 7892 6666"

    # 检测防火墙类型
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        for port in $ports; do
            ufw allow ${port}/tcp > /dev/null 2>&1 || true
            ufw allow ${port}/udp > /dev/null 2>&1 || true
        done
        print_success "UFW 防火墙规则已添加"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld
        for port in $ports; do
            firewall-cmd --permanent --add-port=${port}/tcp > /dev/null 2>&1 || true
            firewall-cmd --permanent --add-port=${port}/udp > /dev/null 2>&1 || true
        done
        firewall-cmd --reload > /dev/null 2>&1 || true
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
    if command -v systemctl &> /dev/null; then
        systemctl start ${SERVICE_NAME}

        # 等待服务启动
        sleep 2

        # 检查服务状态
        if systemctl is-active --quiet ${SERVICE_NAME}; then
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

    # 使用下载命令获取公网 IP
    if [ "$DOWNLOAD_CMD" = "curl" ]; then
        wan_ip=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo "")
    elif [ "$DOWNLOAD_CMD" = "wget" ]; then
        wan_ip=$(wget -qO- --timeout=3 ifconfig.me 2>/dev/null || echo "")
    fi

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
    echo "配置目录: /root/.msm"
    echo ""
    echo "文档地址: https://msm9527.github.io/msm-wiki/zh/"
    echo "=========================================="
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  MSM 一键安装脚本"
    echo "  Mosdns Singbox Mihomo Manager"
    echo "=========================================="
    echo ""

    # 检查 root 权限
    check_root

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

    # 获取最新版本
    local version=$(get_latest_version)
    print_success "最新版本: $version"

    # 下载 MSM
    local temp_dir=$(download_msm $version $os $arch $libc)

    # 安装 MSM
    install_msm $temp_dir

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
main
