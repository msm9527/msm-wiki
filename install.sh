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
INSTALL_DIR="/opt/msm"
GITHUB_REPO="msm9527/msm-wiki"
RELEASE_URL="https://github.com/${GITHUB_REPO}/releases/latest"
SERVICE_NAME="msm"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 权限运行此脚本"
        print_info "使用命令: sudo bash install.sh"
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

# 安装依赖
install_dependencies() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')

    if [ "$os" = "linux" ]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            print_info "检测到操作系统: $ID"

            case $ID in
                ubuntu|debian)
                    print_info "更新软件包列表..."
                    apt-get update -qq
                    print_info "安装依赖..."
                    apt-get install -y curl wget tar gzip > /dev/null 2>&1
                    ;;
                centos|rhel|fedora)
                    print_info "安装依赖..."
                    yum install -y curl wget tar gzip > /dev/null 2>&1
                    ;;
                *)
                    print_warning "未知的 Linux 发行版，跳过依赖安装"
                    ;;
            esac
        fi
    elif [ "$os" = "darwin" ]; then
        print_info "检测到 macOS 系统"
        # macOS 通常已经包含所需工具
    fi
}

# 获取最新版本号
get_latest_version() {
    print_info "获取最新版本信息..."
    local version=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

    if [ -z "$version" ]; then
        print_error "无法获取最新版本信息"
        exit 1
    fi

    echo $version
}

# 下载 MSM
download_msm() {
    local version=$1
    local os=$2
    local arch=$3
    local filename="msm-${version}-${os}-${arch}.tar.gz"
    local download_url="https://github.com/${GITHUB_REPO}/releases/download/${version}/${filename}"

    print_info "下载 MSM ${version} (${os}-${arch})..."
    print_info "下载地址: $download_url"

    # 创建临时目录
    local temp_dir=$(mktemp -d)
    cd $temp_dir

    # 下载文件
    if ! wget -q --show-progress "$download_url" -O "${filename}"; then
        print_error "下载失败"
        rm -rf $temp_dir
        exit 1
    fi

    # 解压文件
    print_info "解压文件..."
    if ! tar -xzf "${filename}"; then
        print_error "解压失败"
        rm -rf $temp_dir
        exit 1
    fi

    # 删除压缩包
    rm "${filename}"

    echo $temp_dir
}

# 安装 MSM
install_msm() {
    local temp_dir=$1

    print_info "安装 MSM..."

    # 复制文件到系统路径
    cp ${temp_dir}/msm /usr/local/bin/msm
    chmod +x /usr/local/bin/msm

    # 清理临时文件
    rm -rf $temp_dir

    print_success "MSM 二进制文件已安装到 /usr/local/bin/msm"
}

# 安装系统服务
install_service() {
    print_info "安装系统服务..."

    # 使用 MSM 内置命令安装服务
    /usr/local/bin/msm service install

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
}

# 显示安装信息
show_info() {
    local ip=$(curl -s ifconfig.me || echo "your-server-ip")

    echo ""
    echo "=========================================="
    echo -e "${GREEN}MSM 安装完成！${NC}"
    echo "=========================================="
    echo ""
    echo "访问地址: http://${ip}:7777"
    echo ""
    echo -e "${YELLOW}重要提示:${NC}"
    echo "  1. 首次访问时需要创建管理员账号"
    echo "  2. 请设置强密码并妥善保管"
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

    # 安装依赖
    install_dependencies

    # 获取最新版本
    local version=$(get_latest_version)
    print_success "最新版本: $version"

    # 下载 MSM
    local temp_dir=$(download_msm $version $os $arch)

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
