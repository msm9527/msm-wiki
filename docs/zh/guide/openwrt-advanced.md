# OpenWrt 进阶配置

本文档介绍 OpenWrt 的高级配置方法，包括自动化脚本、批量路由管理等。

::: warning 地址池必须以 MSM 当前配置为准
脚本中的 FakeIP 地址池、网关地址和接口名都使用 `REPLACE_WITH_...` 占位符。运行前必须替换为 MSM 设置页显示的实际 FakeIP 地址池、MSM LAN 地址和 OpenWrt 接口；修改地址池后不要继续使用旧路由。
:::

## 自动化路由配置脚本

手动添加大量静态路由比较繁琐，可以使用自动化脚本批量配置。

### 脚本功能

- 预置路由列表
- 批量添加静态路由
- 智能清理旧路由，避免冲突
- 支持路由优先级设置

### 创建自动化配置脚本

创建脚本 `setup-msm.sh`：

```bash
cat > /root/setup-msm.sh << 'MSM_HEALTH_CHECK_EOF'
#!/bin/bash

# MSM 集成配置脚本
# 功能：配置 MSM IP、备用 DNS、IPv4 路由、IPv6 路由

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

# 默认值
DEFAULT_BACKUP_DNS="223.5.5.5"
DEFAULT_IPV4_GATEWAY="REPLACE_WITH_MSM_LAN_IPV4"
DEFAULT_IPV6_GATEWAY="REPLACE_WITH_MSM_LAN_IPV6"
DEFAULT_INTERFACE="REPLACE_WITH_OPENWRT_INTERFACE"
FAKEIP_V4_ROUTE="REPLACE_WITH_MSM_FAKEIP_V4_CIDR"
FAKEIP_V6_ROUTE="REPLACE_WITH_MSM_FAKEIP_V6_CIDR"
HIGH_PRIORITY_NET="$FAKEIP_V4_ROUTE"
CHECK_HOST="https://8.8.8.8"

# IPv4 路由地址集 - 按分类定义
read -r -d '' IPV4_FAKEIP_ROUTES << EOF || true
# MosDNS 和 Clash FakeIP 路由
$FAKEIP_V4_ROUTE
8.8.8.8/32
1.1.1.1/32
EOF

read -r -d '' IPV4_TELEGRAM_ROUTES << 'EOF' || true
# Telegram 路由
149.154.160.0/22
149.154.164.0/22
149.154.172.0/22
91.108.4.0/22
91.108.8.0/22
91.108.12.0/22
91.108.16.0/22
91.108.20.0/22
91.108.56.0/22
95.161.64.0/22
67.198.55.0/24
109.239.140.0/24
EOF

read -r -d '' IPV4_NETFLIX_ROUTES << 'EOF' || true
# Netflix 路由
207.45.72.0/22
208.75.76.0/22
210.0.153.0/24
185.76.151.0/24
EOF

# IPv6 路由地址集 - 按分类定义
read -r -d '' IPV6_FAKEIP_ROUTES << EOF || true
# IPv6 FakeIP 路由
$FAKEIP_V6_ROUTE
EOF

read -r -d '' IPV6_TELEGRAM_ROUTES << 'EOF' || true
# IPv6 Telegram 路由
2001:b28:f23d::/48
2001:b28:f23f::/48
2001:67c:4e8::/48
EOF

# 根据选择合并路由
merge_ipv4_routes() {
    local temp_routes=""
    [ "$SELECT_FAKEIP" = "1" ] && temp_routes="${temp_routes}${IPV4_FAKEIP_ROUTES}"$'\n'
    [ "$SELECT_TELEGRAM" = "1" ] && temp_routes="${temp_routes}${IPV4_TELEGRAM_ROUTES}"$'\n'
    [ "$SELECT_NETFLIX" = "1" ] && temp_routes="${temp_routes}${IPV4_NETFLIX_ROUTES}"$'\n'
    IPV4_ROUTES="$temp_routes"
}

merge_ipv6_routes() {
    local temp_routes=""
    [ "$SELECT_IPV6_FAKEIP" = "1" ] && temp_routes="${temp_routes}${IPV6_FAKEIP_ROUTES}"$'\n'
    [ "$SELECT_IPV6_TELEGRAM" = "1" ] && temp_routes="${temp_routes}${IPV6_TELEGRAM_ROUTES}"$'\n'
    IPV6_ROUTES="$temp_routes"
}

# 打印分隔线
print_separator() {
    echo "============================================"
}

# 打印提示信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# 打印错误信息
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印警告信息
print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 清屏并显示菜单
show_menu() {
    clear
    print_separator
    echo "       MSM 集成配置工具"
    print_separator
    echo ""
    echo "请选择要执行的操作："
    echo ""
    echo "1) 完整配置（DNS + IPv4路由 + IPv6路由）"
    echo "2) 仅配置 DNS"
    echo "3) 仅配置 IPv4 路由"
    echo "4) 仅配置 IPv6 路由"
    echo "5) 配置 DNS + IPv4 路由"
    echo "6) 配置 DNS + IPv6 路由"
    echo "7) 配置 IPv4 + IPv6 路由"
    echo "8) 设置 DNS 健康检查定时计划"
    echo "9) 取消 DNS 健康检查定时计划"
    echo "0) 退出"
    echo ""
}

# 选择 IPv4 路由分类
select_ipv4_routes() {
    clear
    print_separator
    echo "       选择 IPv4 路由分类"
    print_separator
    echo ""
    echo "请选择要添加的 IPv4 路由分类（可多选）："
    echo ""

    # 初始化选择状态（默认全选）
    SELECT_FAKEIP=1
    SELECT_TELEGRAM=1
    SELECT_NETFLIX=1

    while true; do
        echo "当前选择："
        [ "$SELECT_FAKEIP" = "1" ] && echo "  ✓ MosDNS 和 Clash FakeIP" || echo "  ☐ MosDNS 和 Clash FakeIP"
        [ "$SELECT_TELEGRAM" = "1" ] && echo "  ✓ Telegram" || echo "  ☐ Telegram"
        [ "$SELECT_NETFLIX" = "1" ] && echo "  ✓ Netflix" || echo "  ☐ Netflix"
        echo ""
        echo "1) 切换 MosDNS 和 Clash FakeIP"
        echo "2) 切换 Telegram"
        echo "3) 切换 Netflix"
        echo "4) 全选"
        echo "5) 全不选"
        echo "6) 确认并继续"
        echo ""

        read -p "请选择 (1-6): " choice

        case $choice in
            1) [ "$SELECT_FAKEIP" = "1" ] && SELECT_FAKEIP=0 || SELECT_FAKEIP=1 ;;
            2) [ "$SELECT_TELEGRAM" = "1" ] && SELECT_TELEGRAM=0 || SELECT_TELEGRAM=1 ;;
            3) [ "$SELECT_NETFLIX" = "1" ] && SELECT_NETFLIX=0 || SELECT_NETFLIX=1 ;;
            4) SELECT_FAKEIP=1; SELECT_TELEGRAM=1; SELECT_NETFLIX=1 ;;
            5) SELECT_FAKEIP=0; SELECT_TELEGRAM=0; SELECT_NETFLIX=0 ;;
            6)
                if [ "$SELECT_FAKEIP" = "0" ] && [ "$SELECT_TELEGRAM" = "0" ] && [ "$SELECT_NETFLIX" = "0" ]; then
                    print_error "至少选择一个路由分类"
                else
                    break
                fi
                ;;
            *) print_error "无效的选择" ;;
        esac
        clear
        print_separator
        echo "       选择 IPv4 路由分类"
        print_separator
        echo ""
    done
}

# 选择 IPv6 路由分类
select_ipv6_routes() {
    clear
    print_separator
    echo "       选择 IPv6 路由分类"
    print_separator
    echo ""
    echo "请选择要添加的 IPv6 路由分类（可多选）："
    echo ""

    # 初始化选择状态（默认全选）
    SELECT_IPV6_FAKEIP=1
    SELECT_IPV6_TELEGRAM=1

    while true; do
        echo "当前选择："
        [ "$SELECT_IPV6_FAKEIP" = "1" ] && echo "  ✓ IPv6 FakeIP" || echo "  ☐ IPv6 FakeIP"
        [ "$SELECT_IPV6_TELEGRAM" = "1" ] && echo "  ✓ IPv6 Telegram" || echo "  ☐ IPv6 Telegram"
        echo ""
        echo "1) 切换 IPv6 FakeIP"
        echo "2) 切换 IPv6 Telegram"
        echo "3) 全选"
        echo "4) 全不选"
        echo "5) 确认并继续"
        echo ""

        read -p "请选择 (1-5): " choice

        case $choice in
            1) [ "$SELECT_IPV6_FAKEIP" = "1" ] && SELECT_IPV6_FAKEIP=0 || SELECT_IPV6_FAKEIP=1 ;;
            2) [ "$SELECT_IPV6_TELEGRAM" = "1" ] && SELECT_IPV6_TELEGRAM=0 || SELECT_IPV6_TELEGRAM=1 ;;
            3) SELECT_IPV6_FAKEIP=1; SELECT_IPV6_TELEGRAM=1 ;;
            4) SELECT_IPV6_FAKEIP=0; SELECT_IPV6_TELEGRAM=0 ;;
            5)
                if [ "$SELECT_IPV6_FAKEIP" = "0" ] && [ "$SELECT_IPV6_TELEGRAM" = "0" ]; then
                    print_error "至少选择一个路由分类"
                else
                    break
                fi
                ;;
            *) print_error "无效的选择" ;;
        esac
        clear
        print_separator
        echo "       选择 IPv6 路由分类"
        print_separator
        echo ""
    done
}

# 手动输入 MSM IPv4 和 IPv6 地址
get_msm_ips() {
    echo ""
    echo "请输入 MSM 的 IPv4 地址（默认: $DEFAULT_IPV4_GATEWAY）:"
    read -r IPV4_GATEWAY
    if [ -z "$IPV4_GATEWAY" ]; then
        IPV4_GATEWAY="$DEFAULT_IPV4_GATEWAY"
    fi
    print_info "MSM IPv4 地址: $IPV4_GATEWAY"

    # 立即检查 IPv4 连接
    echo "正在测试 IPv4 连接..."
    if ping -c 2 -W 2 "$IPV4_GATEWAY" > /dev/null 2>&1; then
        print_info "IPv4 连接正常 - 可以访问 $IPV4_GATEWAY"
    else
        print_error "IPv4 连接失败 - 无法访问 $IPV4_GATEWAY"
    fi

    echo ""
    read -p "是否配置 IPv6 地址? (y/n, 默认: y): " config_ipv6
    if [ "$config_ipv6" = "n" ] || [ "$config_ipv6" = "N" ]; then
        IPV6_GATEWAY=""
        print_info "跳过 IPv6 地址配置"
    else
        echo ""
        echo "请输入 MSM 的 IPv6 地址（默认: $DEFAULT_IPV6_GATEWAY）:"
        read -r IPV6_GATEWAY
        if [ -z "$IPV6_GATEWAY" ]; then
            IPV6_GATEWAY="$DEFAULT_IPV6_GATEWAY"
        fi
        print_info "MSM IPv6 地址: $IPV6_GATEWAY"

        # 立即检查 IPv6 连接
        echo "正在测试 IPv6 连接..."
        if ping -c 2 -W 2 "$IPV6_GATEWAY" > /dev/null 2>&1; then
            print_info "IPv6 连接正常 - 可以访问 $IPV6_GATEWAY"
        else
            print_error "IPv6 连接失败 - 无法访问 $IPV6_GATEWAY"
        fi
    fi
}

# 获取备用 DNS
get_backup_dns() {
    echo ""
    echo "请输入备用 DNS 地址（默认: $DEFAULT_BACKUP_DNS）:"
    read -r BACKUP_DNS
    if [ -z "$BACKUP_DNS" ]; then
        BACKUP_DNS="$DEFAULT_BACKUP_DNS"
    fi
    print_info "使用备用 DNS: $BACKUP_DNS"
}

# 检查路由配置后是否能访问
check_accessibility() {
    local ipv4_ok=0
    local ipv6_ok=0

    print_separator
    print_info "检查网络访问..."
    print_separator
    echo ""

    # 检查 IPv4 连接
    if [ -n "$IPV4_GATEWAY" ]; then
        echo "正在测试 IPv4 连接..."
        if ping -c 2 -W 2 "$IPV4_GATEWAY" > /dev/null 2>&1; then
            print_info "IPv4 连接正常 - 可以访问 $IPV4_GATEWAY"
            ipv4_ok=1
        else
            print_error "IPv4 连接失败 - 无法访问 $IPV4_GATEWAY"
        fi
    fi

    # 检查 IPv6 连接
    if [ -n "$IPV6_GATEWAY" ]; then
        echo "正在测试 IPv6 连接..."
        if ping -c 2 -W 2 "$IPV6_GATEWAY" > /dev/null 2>&1; then
            print_info "IPv6 连接正常 - 可以访问 $IPV6_GATEWAY"
            ipv6_ok=1
        else
            print_error "IPv6 连接失败 - 无法访问 $IPV6_GATEWAY"
        fi
    fi

    echo ""

    # 汇总结果
    if [ $ipv4_ok -eq 1 ] || [ $ipv6_ok -eq 1 ]; then
        print_info "网络连接测试部分成功"
    else
        print_warning "网络连接测试失败，请检查路由配置"
    fi

    echo ""
}

# 配置 DNS（MSM 健康检查）
setup_dns() {
    print_separator
    print_info "【DNS 配置】"
    print_separator

    echo ""
    echo "正在检查 MSM 连接状态..."

    curl -s -o /dev/null --connect-timeout 3 "$CHECK_HOST"

    # 检查 MSM 是否可达
    if [ $? -eq 0 ]; then
        print_info "网络连接正常，使用 MSM DNS"
        CURRENT_DNS=$(uci get dhcp.@dnsmasq[0].server 2>/dev/null | grep "$MSM_IP")
        if [ -z "$CURRENT_DNS" ]; then
            print_info "正在切换到 MSM DNS: $MSM_IP"
            uci del dhcp.@dnsmasq[0].server 2>/dev/null || true
            uci add_list dhcp.@dnsmasq[0].server="$MSM_IP"
            uci set network.lan.dns="$MSM_IP"
            uci del dhcp.lan.dhcp_option 2>/dev/null || true
            uci add_list dhcp.lan.dhcp_option="6,$MSM_IP"
            uci commit
            /etc/init.d/network reload
            /etc/init.d/dnsmasq restart
            print_info "DNS 配置完成"
            logger -t "MSM-CONFIG" "MSM 恢复，已切换到 MSM DNS $MSM_IP"
        else
            print_info "MSM DNS 已配置，无需更改"
        fi
    else
        print_warning "网络连接异常，使用备用 DNS"
        CURRENT_DNS=$(uci get dhcp.@dnsmasq[0].server 2>/dev/null | grep "$BACKUP_DNS")
        if [ -z "$CURRENT_DNS" ]; then
            print_info "正在切换到备用 DNS: $BACKUP_DNS"
            uci del dhcp.@dnsmasq[0].server 2>/dev/null || true
            uci add_list dhcp.@dnsmasq[0].server="$BACKUP_DNS"
            uci set network.lan.dns="$BACKUP_DNS"
            uci del dhcp.lan.dhcp_option 2>/dev/null || true
            uci add_list dhcp.lan.dhcp_option="6,$BACKUP_DNS"
            uci commit
            /etc/init.d/network reload
            /etc/init.d/dnsmasq restart
            print_info "DNS 配置完成"
            logger -t "MSM-CONFIG" "MSM 故障，已切换到备用 DNS $BACKUP_DNS"
        else
            print_info "备用 DNS 已配置，无需更改"
        fi
    fi
}

# 配置 IPv4 路由
setup_ipv4_routes() {
    print_separator
    print_info "【IPv4 路由配置】"
    print_separator

    select_ipv4_routes
    merge_ipv4_routes

    echo ""
    print_info "正在添加新 IPv4 路由..."
    echo ""
    ROUTE_COUNT=0
    while IFS= read -r line; do
        # 跳过空行和注释
        if [ -z "$line" ] || [[ "$line" =~ ^# ]]; then
            continue
        fi

        target_net="$line"

        # 删除目标相同的原始规则
        EXISTING_ROUTES=$(uci show network 2>/dev/null | grep "=route" | grep -v "=route6" | cut -d'.' -f2 | cut -d'=' -f1 | sort -u)
        for route in $EXISTING_ROUTES; do
            ROUTE_TARGET=$(uci get network."$route".target 2>/dev/null)
            if [ "$ROUTE_TARGET" = "$target_net" ]; then
                print_info "删除目标重复的旧路由: $route ($target_net)"
                uci del network."$route" || true
            fi
        done

        # 添加路由
        ROUTE_SECTION=$(uci add network route)
        uci set network."$ROUTE_SECTION".interface="$DEFAULT_INTERFACE"
        uci set network."$ROUTE_SECTION".target="$target_net"
        uci set network."$ROUTE_SECTION".gateway="$IPV4_GATEWAY"

        # 为 FakeIP 网段设置高优先级
        if [ "$target_net" = "$HIGH_PRIORITY_NET" ]; then
            uci set network."$ROUTE_SECTION".metric="0"
            print_info "添加高优先级路由: $target_net"
        else
            uci set network."$ROUTE_SECTION".metric="1"
            print_info "添加路由: $target_net"
        fi

        ROUTE_COUNT=$((ROUTE_COUNT + 1))
    done <<< "$IPV4_ROUTES"

    if [ $ROUTE_COUNT -gt 0 ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_info "已添加 $ROUTE_COUNT 条路由，正在提交配置..."

        uci commit network
        if [ $? -eq 0 ]; then
            print_info "配置已提交"
        else
            print_error "提交配置失败"
            return 1
        fi

        print_info "正在重启网络服务..."
        /etc/init.d/network reload
        if [ $? -eq 0 ]; then
            print_info "网络服务已重启"
        else
            print_error "重启网络服务失败"
        fi

        echo ""
        print_info "✅ IPv4 路由配置完成！已添加 $ROUTE_COUNT 条路由"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo ""
        print_warning "⚠️  未添加任何 IPv4 路由"
        return 1
    fi
}

# 设置健康检查定时计划
setup_health_check_schedule() {
    print_separator
    print_info "【DNS 健康检查设置】"
    print_separator

    # 健康检查脚本路径
    HEALTH_CHECK_SCRIPT="/usr/local/bin/msm-health-check.sh"

    echo ""
    # 检查目录是否存在，不存在则创建
    if [ ! -d "/usr/local/bin" ]; then
        print_info "创建目录 /usr/local/bin"
        mkdir -p /usr/local/bin
    fi

    print_info "正在创建健康检查脚本..."

    # 创建健康检查脚本
    cat > "$HEALTH_CHECK_SCRIPT" << 'HEALTH_EOF'
#!/bin/bash

# MSM DNS 健康检查脚本
# 自动在 MSM 故障时切换到备用 DNS

MSM_IP="PLACEHOLDER_MSM_IP"
BACKUP_DNS="PLACEHOLDER_BACKUP_DNS"
CHECK_HOST="https://8.8.8.8"

curl -s -o /dev/null --connect-timeout 3 "$CHECK_HOST"

if [ $? -eq 0 ]; then
    # MSM 正常，使用 MSM DNS
    CURRENT_DNS=$(uci get dhcp.@dnsmasq[0].server 2>/dev/null | grep "$MSM_IP")
    if [ -z "$CURRENT_DNS" ]; then
        logger -t "MSM-HEALTH-CHECK" "MSM 恢复，切换到 MSM DNS $MSM_IP"
        uci del dhcp.@dnsmasq[0].server 2>/dev/null || true
        uci add_list dhcp.@dnsmasq[0].server="$MSM_IP"
        uci set network.lan.dns="$MSM_IP"
        uci del dhcp.lan.dhcp_option 2>/dev/null || true
        uci add_list dhcp.lan.dhcp_option="6,$MSM_IP"
        uci commit
        /etc/init.d/network reload
        /etc/init.d/dnsmasq restart
    fi
else
    # MSM 故障，使用备用 DNS
    CURRENT_DNS=$(uci get dhcp.@dnsmasq[0].server 2>/dev/null | grep "$BACKUP_DNS")
    if [ -z "$CURRENT_DNS" ]; then
        logger -t "MSM-HEALTH-CHECK" "MSM 故障，切换到备用 DNS $BACKUP_DNS"
        uci del dhcp.@dnsmasq[0].server 2>/dev/null || true
        uci add_list dhcp.@dnsmasq[0].server="$BACKUP_DNS"
        uci set network.lan.dns="$BACKUP_DNS"
        uci del dhcp.lan.dhcp_option 2>/dev/null || true
        uci add_list dhcp.lan.dhcp_option="6,$BACKUP_DNS"
        uci commit
        /etc/init.d/network reload
        /etc/init.d/dnsmasq restart
    fi
fi
HEALTH_EOF

    # 替换占位符
    sed -i "s|PLACEHOLDER_MSM_IP|$IPV4_GATEWAY|g" "$HEALTH_CHECK_SCRIPT"
    sed -i "s|PLACEHOLDER_BACKUP_DNS|$BACKUP_DNS|g" "$HEALTH_CHECK_SCRIPT"

    chmod +x "$HEALTH_CHECK_SCRIPT"
    print_info "脚本已创建: $HEALTH_CHECK_SCRIPT"

    echo ""
    print_info "正在配置定时任务..."

    # 移除可能存在的旧 crontab 条目
    crontab -l 2>/dev/null | grep -v "msm-health-check.sh" | crontab - 2>/dev/null || true

    # 添加新的 crontab 条目 - 每分钟执行一次
    (crontab -l 2>/dev/null; echo "* * * * * $HEALTH_CHECK_SCRIPT") | crontab - 2>/dev/null

    echo ""
    print_info "✅ DNS 健康检查已启用！"
    print_info "  - 执行频率: 每分钟检查一次"
    print_info "  - 脚本位置: $HEALTH_CHECK_SCRIPT"

    logger -t "MSM-CONFIG" "DNS 健康检查定时计划已启用，MSM IP: $IPV4_GATEWAY, 备用 DNS: $BACKUP_DNS"
}

# 取消健康检查定时计划
cancel_health_check_schedule() {
    print_separator
    print_info "【DNS 健康检查取消】"
    print_separator

    echo ""
    print_info "正在移除定时任务..."

    # 移除 crontab 条目
    crontab -l 2>/dev/null | grep -v "msm-health-check.sh" | crontab - 2>/dev/null || true

    print_info "✅ DNS 健康检查已取消！"

    echo ""
    read -p "是否删除健康检查脚本? (y/n, 默认: n): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -f /usr/local/bin/msm-health-check.sh
        print_info "脚本已删除"
    fi

    logger -t "MSM-CONFIG" "DNS 健康检查定时计划已取消"
}

# 配置 IPv6 路由
setup_ipv6_routes() {
    print_separator
    print_info "【IPv6 路由配置】"
    print_separator

    select_ipv6_routes
    merge_ipv6_routes

    echo ""
    print_info "正在添加新 IPv6 路由..."
    echo ""
    ROUTE_COUNT=0
    while IFS= read -r line; do
        # 跳过空行和注释
        if [ -z "$line" ] || [[ "$line" =~ ^# ]]; then
            continue
        fi

        target_net="$line"

        # 删除目标相同的原始规则
        EXISTING_ROUTES=$(uci show network 2>/dev/null | grep "=route6" | cut -d'.' -f2 | cut -d'=' -f1 | sort -u)
        for route in $EXISTING_ROUTES; do
            ROUTE_TARGET=$(uci get network."$route".target 2>/dev/null)
            if [ "$ROUTE_TARGET" = "$target_net" ]; then
                print_info "删除目标重复的旧路由: $route ($target_net)"
                uci delete network."$route" || true
            fi
        done

        ROUTE_SECTION=$(uci add network route6)
        uci set network."$ROUTE_SECTION".interface="$DEFAULT_INTERFACE"
        uci set network."$ROUTE_SECTION".target="$target_net"
        uci set network."$ROUTE_SECTION".gateway="$IPV6_GATEWAY"

        print_info "添加 IPv6 路由: $target_net"
        ROUTE_COUNT=$((ROUTE_COUNT + 1))
    done <<< "$IPV6_ROUTES"

    if [ $ROUTE_COUNT -gt 0 ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_info "已添加 $ROUTE_COUNT 条路由，正在提交配置..."

        uci commit network
        if [ $? -eq 0 ]; then
            print_info "配置已提交"
        else
            print_error "提交配置失败"
            return 1
        fi

        print_info "正在重启网络服务..."
        /etc/init.d/network reload
        if [ $? -eq 0 ]; then
            print_info "网络服务已重启"
        else
            print_error "重启网络服务失败"
        fi

        echo ""
        print_info "✅ IPv6 路由配置完成！已添加 $ROUTE_COUNT 条路由"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo ""
        print_warning "⚠️  未添加任何 IPv6 路由"
        return 1
    fi
}

# 主程序
main() {
    echo ""
    print_separator
    echo "       🚀 MSM 集成配置工具"
    print_separator

    # 初始化时只获取一次 MSM 地址和备用 DNS
    get_msm_ips
    get_backup_dns

    echo ""
    print_separator
    print_info "配置信息确认"
    print_separator
    print_info "MSM IPv4 地址: $IPV4_GATEWAY"
    if [ -n "$IPV6_GATEWAY" ]; then
        print_info "MSM IPv6 地址: $IPV6_GATEWAY"
    fi
    print_info "备用 DNS 地址: $BACKUP_DNS"
    echo ""
    read -p "按 Enter 进入菜单..."

    while true; do
        show_menu
        read -p "请选择 (0-9): " choice

        case $choice in
            1)
                setup_dns
                setup_ipv4_routes
                setup_ipv6_routes
                ;;
            2)
                setup_dns || true
                ;;
            3)
                setup_ipv4_routes || true
                ;;
            4)
                setup_ipv6_routes || true
                ;;
            5)
                setup_dns || true
                setup_ipv4_routes || true
                ;;
            6)
                setup_dns || true
                setup_ipv6_routes || true
                ;;
            7)
                setup_ipv4_routes || true
                setup_ipv6_routes || true
                ;;
            8)
                setup_health_check_schedule || true
                ;;
            9)
                cancel_health_check_schedule || true
                ;;
            0)
                print_info "感谢使用 MSM 配置工具，再见！"
                exit 0
                ;;
            *)
                print_error "无效的选择，请重试"
                read -p "按 Enter 继续..."
                ;;
        esac

        echo ""
        print_separator
        read -p "按 Enter 继续..."
    done
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    print_error "此脚本需要 root 权限运行"
    exit 1
fi

# 运行主程序
main
MSM_HEALTH_CHECK_EOF

# 添加执行权限
chmod +x /root/setup-msm.sh
```

### 运行脚本

```bash
# 运行脚本
/root/setup-msm.sh

# 按提示输入 MSM 设置页显示的实际主机 IP
# 或直接回车使用默认值
```

### 验证路由

```bash
# 查看路由表
ip route | grep "<MSM当前FakeIPv4网段的网络地址>"

# 查看 UCI 配置
uci show network | grep route
```

## 性能优化

### 调整 dnsmasq 缓存

```bash
# 增加 DNS 缓存大小
uci set dhcp.@dnsmasq[0].cachesize='10000'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

### 调整网络参数

```bash
# 优化网络性能
cat >> /etc/sysctl.conf << 'EOF'

# 增加连接跟踪表大小
net.netfilter.nf_conntrack_max=65536

# 优化 TCP 参数
net.ipv4.tcp_fin_timeout=30
net.ipv4.tcp_keepalive_time=1200
net.ipv4.tcp_syncookies=1
net.ipv4.tcp_tw_reuse=1
EOF

# 应用配置
sysctl -p
```

## 故障排查

### 查看路由表

```bash
# 查看 IPv4 路由
ip route

# 查看 IPv6 路由
ip -6 route

# 查看特定路由
ip route | grep "<MSM当前FakeIPv4网段的网络地址>"
```

### 查看 DNS 配置

```bash
# 查看 dnsmasq 配置
uci show dhcp

# 查看 dnsmasq 进程
ps | grep dnsmasq

# 测试 DNS 解析
nslookup google.com 192.168.1.2
```

### 查看防火墙规则

```bash
# 查看 NAT 规则
iptables -t nat -L -n -v

# 查看 IPv6 NAT 规则
ip6tables -t nat -L -n -v
```

### 查看日志

```bash
# 查看系统日志
logread | grep -i dns

# 查看健康检查日志
tail -f /var/log/msm-health-check.log

# 查看 dnsmasq 日志
logread | grep dnsmasq
```

## 备份和恢复

### 备份配置

```bash
# 备份网络配置
cp /etc/config/network /root/network.backup

# 备份 DHCP 配置
cp /etc/config/dhcp /root/dhcp.backup

# 备份防火墙配置
cp /etc/config/firewall /root/firewall.backup

# 备份脚本
tar -czf /root/msm-scripts-backup.tar.gz \
  /root/routes.txt \
  /root/setup-routes.sh \
  /root/msm-health-check.sh
```

### 恢复配置

```bash
# 恢复网络配置
cp /root/network.backup /etc/config/network
uci commit network
/etc/init.d/network reload

# 恢复 DHCP 配置
cp /root/dhcp.backup /etc/config/dhcp
uci commit dhcp
/etc/init.d/dnsmasq restart

# 恢复防火墙配置
cp /root/firewall.backup /etc/config/firewall
uci commit firewall
/etc/init.d/firewall restart
```

## 参考资源

- [OpenWrt 官方文档](https://openwrt.org/docs/start)
- [UCI 配置系统](https://openwrt.org/docs/guide-user/base-system/uci)
- [dnsmasq 配置](https://openwrt.org/docs/guide-user/base-system/dhcp)
- [防火墙配置](https://openwrt.org/docs/guide-user/firewall/firewall_configuration)

## 下一步

- [OpenWrt 基础配置](/zh/guide/openwrt) - 基础配置指南
- [设备管理](/zh/guide/device-management) - 配置设备白名单
- [常见问题](/zh/faq/) - 故障排查
