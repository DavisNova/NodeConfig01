FROM node:18

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装基础依赖
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 首先复制package.json和package-lock.json
COPY src/package*.json ./

# 安装依赖
RUN npm install

# 复制其他项目文件
COPY src/ ./

EXPOSE 3000

CMD ["npm", "start"]
