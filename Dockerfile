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
    && echo "Asia/Shanghai" > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json
COPY src/package*.json ./

# 使用多个镜像源提高成功率
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set disturl https://npmmirror.com/dist && \
    npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass && \
    npm install && \
    npm cache clean --force

# 复制其他源代码
COPY src/ .

# 创建日志目录
RUN mkdir -p /app/logs

# 设置权限
RUN chown -R node:node /app \
    && chmod -R 755 /app

# 切换到非 root 用户
USER node

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["npm", "start"]
