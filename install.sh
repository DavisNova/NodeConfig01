#!/bin/bash

# 版本信息
VERSION="1.0.0"
SCRIPT_URL="https://raw.githubusercontent.com/DavisNova/NodeConfig01/refs/heads/main/install.sh"
GITHUB_REPO="DavisNova/NodeConfig01"
INSTALL_DIR="/opt/nodeconfig"
BACKUP_DIR="/opt/nodeconfig-backup"
LOG_FILE="/var/log/nodeconfig-install.log"

# 定义颜色
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
cyan='\033[0;36m'
plain='\033[0m'

# 在文件开头添加源配置
DOCKER_MIRRORS=(
    "https://mirror.ccs.tencentyun.com"
    "https://registry.docker-cn.com"
    "https://docker.mirrors.ustc.edu.cn"
    "https://hub-mirror.c.163.com"
)

# 日志函数
log() {
    echo -e "${1}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${1}" >> $LOG_FILE
}

# 错误恢复函数
recover_from_error() {
    log "${yellow}尝试从错误中恢复...${plain}"
    
    # 停止所有容器
    docker-compose down 2>/dev/null
    
    # 清理容器和镜像
    docker system prune -f
    
    # 重新创建网络
    docker network create --subnet=172.20.0.0/16 nodeconfig_net 2>/dev/null
    
    # 重新部署
    deploy_service
}

# 错误处理
handle_error() {
    log "${red}错误: $1${plain}"
    read -p "是否尝试恢复? [y/N] " choice
    case "$choice" in
        y|Y )
            recover_from_error
            ;;
        * )
            exit 1
            ;;
    esac
}

# 清屏函数
clear_screen() {
    clear
    echo -e "${cyan}"
    cat << "EOF"
 _   _           _        ____             __ _       
| \ | | ___   __| | ___  / ___|___  _ __  / _(_) __ _ 
|  \| |/ _ \ / _' |/ _ \| |   / _ \| '_ \| |_| |/ _' |
| |\  | (_) | (_| |  __/| |__| (_) | | | |  _| | (_| |
|_| \_|\___/ \__,_|\___| \____\___/|_| |_|_| |_|\__, |
                                                |___/ 
EOF
    echo -e "${plain}"
    echo "节点配置生成工具箱 v1.0.0"
    echo "------------------------"
}

# 检查系统
check_sys() {
    if [[ ! -f /etc/debian_version ]]; then
        echo -e "${red}错误：本脚本仅支持 Debian/Ubuntu 系统！${plain}"
        exit 1
    fi
}

# 检查系统资源
check_resources() {
    log "${yellow}检查系统资源...${plain}"
    
    # 检查内存
    local total_mem=$(free -m | awk '/^Mem:/{print $2}')
    if [ $total_mem -lt 512 ]; then
        handle_error "内存不足，需要至少512MB内存"
    fi
    
    # 检查磁盘空间
    local free_space=$(df -m /opt | awk 'NR==2 {print $4}')
    if [ $free_space -lt 1024 ]; then
        handle_error "磁盘空间不足，需要至少1GB可用空间"
    fi
    
    # 检查CPU核心数
    local cpu_cores=$(nproc)
    if [ $cpu_cores -lt 1 ]; then
        handle_error "CPU核心数不足"
    fi
    
    log "${green}系统资源检查通过${plain}"
}

# 系统优化
optimize_system() {
    log "${yellow}开始系统优化...${plain}"
    
    # 调整系统限制
    cat > /etc/security/limits.d/nodeconfig.conf << EOF
*       soft    nofile      65535
*       hard    nofile      65535
EOF

    # 调整内核参数
    cat > /etc/sysctl.d/99-nodeconfig.conf << EOF
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_max_tw_buckets = 5000
net.ipv4.tcp_max_tw_buckets = 5000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65000
net.core.somaxconn = 8192
EOF

    sysctl -p /etc/sysctl.d/99-nodeconfig.conf
    
    log "${green}系统优化完成${plain}"
}

# 初始化函数
init_env() {
    # 创建必要的目录
    mkdir -p "${INSTALL_DIR}" "${BACKUP_DIR}" "$(dirname ${LOG_FILE})" || handle_error "创建目录失败"
    
    # 系统优化
    optimize_system
    
    # 检查网络连接
    if ! ping -c 1 github.com >/dev/null 2>&1; then
        log "${yellow}警告: 无法连接到 GitHub，尝试使用镜像源${plain}"
        SCRIPT_URL="https://ghproxy.com/${SCRIPT_URL}"
    fi
    
    # 设置时区
    ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
    
    # 初始化日志
    echo "=== NodeConfig 安装日志 ===" > ${LOG_FILE}
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')" >> ${LOG_FILE}
    echo "系统信息: $(uname -a)" >> ${LOG_FILE}
}

# 安装基础组件
install_base() {
    # 安装前检查
    if [ -f /var/run/reboot-required ]; then
        log "${yellow}警告: 系统需要重启才能继续安装${plain}"
        read -p "是否现在重启系统? [y/N] " choice
        case "$choice" in
            y|Y ) reboot;;
            * ) log "${yellow}继续安装，但可能会出现问题${plain}";;
        esac
    fi
    
    # 检查是否已安装
    if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
        log "${green}Docker 和 Docker Compose 已安装${plain}"
        return 0
    fi
    
    log "${yellow}开始安装依赖...${plain}"
    
    # 配置apt国内源
    cp /etc/apt/sources.list /etc/apt/sources.list.bak
    cat > /etc/apt/sources.list << EOF
    deb https://mirrors.aliyun.com/debian/ bullseye main contrib non-free
    deb https://mirrors.aliyun.com/debian/ bullseye-updates main contrib non-free
    deb https://mirrors.aliyun.com/debian/ bullseye-backports main contrib non-free
    deb https://mirrors.aliyun.com/debian-security bullseye-security main contrib non-free
EOF

    # 更新系统包并安装依赖
    apt update || handle_error "更新包列表失败"
    apt install -y curl wget git apt-transport-https ca-certificates gnupg lsb-release || handle_error "安装基础依赖失败"

    # 配置Docker镜像加速
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << EOF
{
    "registry-mirrors": [
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://mirror.ccs.tencentyun.com",
        "https://docker.mirrors.ustc.edu.cn"
    ],
    "max-concurrent-downloads": 10,
    "max-concurrent-uploads": 5,
    "experimental": true
}
EOF

    # 安装Docker
    log "${yellow}安装Docker...${plain}"
    if ! curl -fsSL https://get.docker.com | sh; then
        handle_error "Docker安装失败"
    fi

    # 启动Docker服务
    systemctl daemon-reload
    systemctl restart docker || handle_error "启动Docker服务失败"
    systemctl enable docker || handle_error "设置Docker开机启动失败"

    # 安装 Docker Compose
    echo -e "${yellow}安装 Docker Compose...${plain}"
    curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

    # 验证安装
    echo -e "${yellow}验证安装...${plain}"
    if ! command -v docker &> /dev/null; then
        echo -e "${red}Docker 安装失败${plain}"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${red}Docker Compose 安装失败${plain}"
        exit 1
    fi

    docker --version
    docker-compose --version

    echo -e "${green}依赖安装完成！${plain}"
    sleep 2
}

# 添加健康检查函数
check_service_health() {
    local retries=30
    local wait_time=10
    local counter=0
    
    log "${yellow}检查服务健康状态...${plain}"
    
    while [ $counter -lt $retries ]; do
        if curl -s http://localhost:3000/health > /dev/null; then
            log "${green}服务健康检查通过！${plain}"
            return 0
        fi
        
        counter=$((counter + 1))
        log "${yellow}等待服务就绪... ($counter/$retries)${plain}"
        sleep $wait_time
    done
    
    handle_error "服务健康检查失败，请检查日志"
}

# 检查端口占用
check_port() {
    local port=$1
    if netstat -tuln | grep -q ":${port} "; then
        handle_error "端口 ${port} 已被占用，请检查并释放端口"
    fi
}

# 检查服务状态
check_service_status() {
    log "${yellow}检查服务状态...${plain}"
    
    if [ ! -d "$INSTALL_DIR" ]; then
        log "${red}服务未安装${plain}"
        return 1
    fi
    
    cd $INSTALL_DIR
    
    # 检查容器状态
    local containers=$(docker-compose ps -q)
    if [ -z "$containers" ]; then
        log "${red}服务未运行${plain}"
        return 1
    fi
    
    # 检查各个容器的状态
    local all_running=true
    for container in $containers; do
        local status=$(docker inspect -f '{{.State.Status}}' $container)
        local name=$(docker inspect -f '{{.Name}}' $container | cut -d'/' -f2)
        if [ "$status" != "running" ]; then
            log "${red}容器 $name 状态异常: $status${plain}"
            all_running=false
        else
            log "${green}容器 $name 运行正常${plain}"
        fi
    done
    
    if [ "$all_running" = true ]; then
        log "${green}所有服务运行正常${plain}"
        return 0
    else
        return 1
    fi
}

# 查看日志
view_logs() {
    log "${yellow}查看服务日志...${plain}"
    
    if [ ! -d "$INSTALL_DIR" ]; then
        handle_error "服务未安装"
    fi
    
    cd $INSTALL_DIR
    
    echo -e "\n${green}可用的服务：${plain}"
    docker-compose ps --services
    
    echo
    read -p "请输入要查看的服务名称(直接回车查看所有): " service_name
    
    if [ -z "$service_name" ]; then
        docker-compose logs --tail=100 -f
    else
        if docker-compose ps --services | grep -q "^$service_name$"; then
            docker-compose logs --tail=100 -f $service_name
        else
            handle_error "服务名称不存在"
        fi
    fi
}

# 检查网络连接
check_network() {
    log "${yellow}检查网络连接...${plain}"
    
    # 检查 DNS
    if ! nslookup registry.cn-hangzhou.aliyuncs.com >/dev/null 2>&1; then
        log "${yellow}DNS 解析失败，尝试使用备用 DNS${plain}"
        echo "nameserver 8.8.8.8" > /etc/resolv.conf
        echo "nameserver 114.114.114.114" >> /etc/resolv.conf
    fi
    
    # 检查镜像源连接
    if ! curl -s https://registry.cn-hangzhou.aliyuncs.com/v2/ >/dev/null; then
        handle_error "无法连接到 Docker 镜像源，请检查网络设置"
    fi
}

# 部署服务
deploy_service() {
    log "${yellow}开始部署服务...${plain}"
    
    # 检查必要端口
    check_port 3000
    check_port 3306
    check_port 8080
    
    # 停止并清理现有服务
    if [ -d "$INSTALL_DIR" ]; then
        log "${yellow}停止现有服务...${plain}"
        if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
            cd $INSTALL_DIR && docker-compose down 2>/dev/null
        fi
        cd /
        log "${yellow}清理旧文件...${plain}"
        rm -rf $INSTALL_DIR
    fi

    # 创建工作目录
    mkdir -p $INSTALL_DIR/src || handle_error "创建工作目录失败"
    cd $INSTALL_DIR || handle_error "进入工作目录失败"

    # 创建 docker-compose.yml
    cat > docker-compose.yml << 'EOFDC'
version: '3'
services:
  nodeconfig:
    build: .
    container_name: nodeconfig
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=nodeconfig
      - DB_PASSWORD=nodeconfig123
      - DB_NAME=nodeconfig_db
      - SERVER_IP=${SERVER_IP:-localhost}
    volumes:
      - ./src:/app/src
      - node_modules:/app/src/node_modules
    depends_on:
      mysql:
        condition: service_healthy
EOFDC

    # 创建 Dockerfile
    cat > Dockerfile << 'EOFD'
FROM node:18
WORKDIR /app/src
RUN apt-get update && apt-get install -y curl default-mysql-client tzdata git
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
COPY src/package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install
COPY src/ .
EXPOSE 3000
CMD ["npm", "start"]
EOFD

    # 创建 package.json
    mkdir -p src
    cat > src/package.json << 'EOFP'
{
  "name": "node-config-generator",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "mysql2": "^2.3.3"
  }
}
EOFP

    # 创建基础服务文件
    cat > src/server.js << 'EOFS'
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('NodeConfig is running!');
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
EOFS

    # 配置 Docker 镜像源
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.docker-cn.com",
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com"
    ],
    "experimental": true,
    "max-concurrent-downloads": 10
}
EOF

    # 重启 Docker 服务
    systemctl daemon-reload
    systemctl restart docker
    sleep 5

    # 拉取基础镜像
    for i in {1..3}; do
        if docker pull node:18; then
            break
        fi
        log "${yellow}拉取镜像失败，第 $i 次重试...${plain}"
        sleep 5
    done

    # 拉取 MySQL 镜像
    docker pull mysql:8.0 || handle_error "拉取 MySQL 镜像失败"
    docker pull phpmyadmin/phpmyadmin || handle_error "拉取 phpMyAdmin 镜像失败"

    # 启动服务
    log "${yellow}启动服务...${plain}"
    docker-compose up -d --build --force-recreate || handle_error "启动服务失败"

    # 检查服务状态
    check_service_health
}

# 添加更新功能
update_service() {
    log "${yellow}开始更新服务...${plain}"
    
    # 检查当前版本
    local current_version=$(cd $INSTALL_DIR && git rev-parse HEAD 2>/dev/null || echo "none")
    log "${yellow}当前版本: ${current_version}${plain}"
    
    # 检查远程版本
    local remote_version=$(git ls-remote https://github.com/$GITHUB_REPO.git main | cut -f1)
    log "${yellow}最新版本: ${remote_version}${plain}"
    
    if [ "$current_version" = "$remote_version" ]; then
        log "${green}已经是最新版本！${plain}"
        return 0
    fi
    
    # 备份当前配置
    if [ -d "$INSTALL_DIR" ]; then
        log "${yellow}备份当前配置...${plain}"
        cp -r $INSTALL_DIR/data /tmp/nodeconfig-data-backup 2>/dev/null
        
        # 停止并删除现有服务
        cd $INSTALL_DIR && docker-compose down || handle_error "停止服务失败"
        cd /
        rm -rf $INSTALL_DIR
    fi

    # 重新部署服务
    deploy_service

    # 恢复配置
    if [ -d "/tmp/nodeconfig-data-backup" ]; then
        log "${yellow}恢复配置...${plain}"
        cp -r /tmp/nodeconfig-data-backup/* $INSTALL_DIR/data/
        rm -rf /tmp/nodeconfig-data-backup
    fi
    
    log "${green}更新完成！${plain}"
    log "${yellow}更新日志：${plain}"
    cd $INSTALL_DIR && git log --oneline $current_version..$remote_version
}

# 备份数据
backup_data() {
    log "${yellow}开始备份数据...${plain}"
    local backup_file="${BACKUP_DIR}/nodeconfig-$(date +%Y%m%d%H%M%S).tar.gz"
    
    mkdir -p $BACKUP_DIR
    
    if [ -d "$INSTALL_DIR" ]; then
        cd $INSTALL_DIR
        tar czf $backup_file data/ docker-compose.yml || handle_error "备份失败"
        log "${green}备份完成: ${backup_file}${plain}"
    else
        handle_error "未找到需要备份的数据"
    fi
}

# 恢复数据
restore_data() {
    log "${yellow}可用的备份文件：${plain}"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        handle_error "未找到备份目录"
    fi
    
    ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null || handle_error "未找到备份文件"
    
    echo
    read -p "请输入要恢复的备份文件名: " backup_file
    
    if [ -f "$BACKUP_DIR/$backup_file" ]; then
        cd $INSTALL_DIR
        tar xzf "$BACKUP_DIR/$backup_file" || handle_error "恢复失败"
        docker-compose up -d || handle_error "重启服务失败"
        log "${green}数据恢复完成${plain}"
    else
        handle_error "备份文件不存在"
    fi
}

# 完全卸载
uninstall_all() {
    log "${yellow}开始完全卸载...${plain}"
    
    # 停止并删除容器
    if [ -d "${INSTALL_DIR}" ]; then
        cd ${INSTALL_DIR} && docker-compose down -v
    fi
    
    # 删除安装目录
    rm -rf ${INSTALL_DIR}
    
    # 删除备份
    read -p "是否删除备份文件? [y/N] " choice
    case "$choice" in
        y|Y ) rm -rf ${BACKUP_DIR};;
        * ) log "${green}保留备份文件${plain}";;
    esac
    
    # 删除Docker（可选）
    read -p "是否卸载Docker? [y/N] " choice
    case "$choice" in
        y|Y )
            systemctl stop docker
            apt-get remove -y docker-ce docker-ce-cli containerd.io
            rm -rf /var/lib/docker
            rm -rf /etc/docker
            ;;
        * ) log "${green}保留Docker安装${plain}";;
    esac
    
    # 删除命令和日志
    rm -f /usr/local/bin/node-config
    rm -f /usr/local/bin/node
    rm -f ${LOG_FILE}
    
    log "${green}卸载完成！${plain}"
}

# 自动清理
auto_cleanup() {
    log "${yellow}开始自动清理...${plain}"
    
    # 清理不用的Docker镜像
    docker image prune -f
    
    # 清理日志文件
    find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete
    
    # 清理系统日志
    journalctl --vacuum-time=7d
    
    # 清理apt缓存
    apt-get clean
    
    log "${green}清理完成${plain}"
}

# 显示菜单
show_menu() {
    while true; do
        clear_screen
        echo -e "
  ${green}节点配置生成工具箱${plain}
  
  ${green}1.${plain}  安装依赖
  ${green}2.${plain}  部署服务
  ${green}3.${plain}  启动服务
  ${green}4.${plain}  停止服务
  ${green}5.${plain}  重启服务
  ${green}6.${plain}  查看状态
  ${green}7.${plain}  查看日志
  ${green}8.${plain}  卸载服务
  ${green}9.${plain}  更新服务
  ${green}10.${plain} 备份数据
  ${green}11.${plain} 恢复数据
  ${green}12.${plain} 检查更新
  ${green}13.${plain} 完全卸载
  ${green}14.${plain} 系统优化
  ${green}15.${plain} 自动清理
  ${green}0.${plain}  退出脚本
  "
        echo && read -p "请输入选择 [0-15]: " num

        case "${num}" in
            1)
                install_base
                continue
                ;;
            2)
                deploy_service
                continue
                ;;
            3)
                cd $INSTALL_DIR && docker-compose up -d
                echo -e "${green}服务已启动！${plain}"
                sleep 2
                continue
                ;;
            4)
                cd $INSTALL_DIR && docker-compose down
                echo -e "${green}服务已停止！${plain}"
                sleep 2
                continue
                ;;
            5)
                cd $INSTALL_DIR && docker-compose restart
                echo -e "${green}服务已重启！${plain}"
                sleep 2
                continue
                ;;
            6)
                check_service_status
                echo && read -p "按回车继续..." 
                ;;
            7)
                view_logs
                echo && read -p "按回车继续..." 
                ;;
            8)
                cd $INSTALL_DIR && docker-compose down
                rm -rf $INSTALL_DIR
                echo -e "${green}服务已卸载！${plain}"
                sleep 2
                continue
                ;;
            9)
                update_service
                continue
                ;;
            10)
                backup_data
                continue
                ;;
            11)
                restore_data
                continue
                ;;
            12)
                check_script_update
                continue
                ;;
            13)
                uninstall_all
                exit 0
                ;;
            14)
                optimize_system
                continue
                ;;
            15)
                auto_cleanup
                continue
                ;;
            0)
                exit 0
                ;;
            *)
                echo -e "${red}请输入正确的数字 [0-15]${plain}"
                sleep 2
                ;;
        esac
    done
}

# 检查脚本更新
check_script_update() {
    log "${yellow}检查脚本更新...${plain}"
    local remote_version=$(curl -sL $SCRIPT_URL | grep "VERSION=" | head -n1 | cut -d'"' -f2)
    
    if [[ -n "$remote_version" && "$VERSION" != "$remote_version" ]]; then
        log "${yellow}发现新版本: ${remote_version}${plain}"
        read -p "是否更新到新版本? [y/N] " choice
        case "$choice" in
            y|Y )
                log "${yellow}正在更新脚本...${plain}"
                curl -sL $SCRIPT_URL -o /tmp/install.sh.new || handle_error "下载更新失败"
                mv /tmp/install.sh.new $0
                chmod +x $0
                log "${green}脚本已更新，请重新运行！${plain}"
                exit 0
                ;;
            * )
                log "${yellow}跳过更新${plain}"
                ;;
        esac
    else
        log "${green}脚本已是最新版本${plain}"
    fi
}

# 检查是否为root用户
[[ $EUID -ne 0 ]] && echo -e "${red}错误：必须使用root用户运行此脚本！${plain}" && exit 1

# 初始化环境
init_env

# 检查系统环境
check_sys

# 检查系统资源
check_resources

# 检查脚本更新
check_script_update

# 显示主菜单
show_menu
