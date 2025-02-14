#!/bin/bash

# 定义颜色
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
plain='\033[0m'

# 日志函数
log() {
    echo -e "${1}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${1}" >> /var/log/nodeconfig-setup.log
}

# 错误处理
handle_error() {
    log "${red}错误: $1${plain}"
    exit 1
}

# 检查root权限
[[ $EUID -ne 0 ]] && handle_error "必须使用root用户运行此脚本！"

# 创建命令链接
create_command() {
    log "${yellow}开始安装命令...${plain}"
    
    # 创建命令文件
    cat > /usr/local/bin/node-config << 'CMD' || handle_error "创建命令文件失败"
#!/bin/bash
bash <(curl -sL https://raw.githubusercontent.com/DavisNova/NodeConfig01/refs/heads/main/install.sh)
CMD

    # 添加执行权限
    chmod +x /usr/local/bin/node-config || handle_error "添加执行权限失败"
    
    # 创建软链接
    ln -sf /usr/local/bin/node-config /usr/local/bin/node || handle_error "创建软链接失败"
    
    log "${green}安装成功！${plain}"
    log "${green}现在你可以使用以下命令来启动工具箱：${plain}"
    log "  1. ${yellow}node${plain}"
    log "  2. ${yellow}node-config${plain}"
}

# 检查是否已安装
check_installed() {
    if [ -f "/usr/local/bin/node-config" ]; then
        log "${yellow}检测到已安装，正在更新...${plain}"
        rm -f /usr/local/bin/node-config
        rm -f /usr/local/bin/node
    fi
}

# 主流程
check_installed
create_command
