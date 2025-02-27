FROM node:18

WORKDIR /app/src

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装基础依赖
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json 和 .npmrc
COPY package*.json .npmrc ./

# 安装依赖
RUN npm install

# 复制其他文件
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
