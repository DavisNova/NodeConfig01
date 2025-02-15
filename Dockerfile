FROM node:18

WORKDIR /app/src

# 修改系统源并安装依赖
RUN apt-get update && apt-get install -y \
    curl \
    default-mysql-client \
    tzdata \
    git \
    && rm -rf /var/lib/apt/lists/*

# 设置时区
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 创建基础目录结构
RUN mkdir -p /app/src /app/logs

# 设置工作目录权限
RUN chown -R node:node /app && \
    chmod -R 755 /app

# 切换到非 root 用户
USER node

# 配置 npm
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set disturl https://npmmirror.com/dist

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["npm", "start"]
