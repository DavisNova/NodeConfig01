FROM node:18-alpine

# 设置时区
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata curl git && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# 创建应用目录
WORKDIR /app

# 复制 package.json
COPY src/package*.json ./

# 安装依赖
RUN npm install --production && \
    npm cache clean --force

# 复制应用代码
COPY src/ .

# 创建必要的目录
RUN mkdir -p /app/public && \
    chown -R node:node /app

# 切换到非 root 用户
USER node

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 直接使用 node 启动，避免使用 npm start
CMD ["node", "server.js"]
