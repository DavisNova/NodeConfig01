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

# 设置 npm 配置
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set disturl https://npmmirror.com/mirrors/node \
    && npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass \
    && npm config set sharp_dist_base_url https://npmmirror.com/mirrors/sharp-libvips \
    && npm config set electron_mirror https://npmmirror.com/mirrors/electron/ \
    && npm config set puppeteer_download_host https://npmmirror.com/mirrors \
    && npm config set chromedriver_cdnurl https://npmmirror.com/mirrors/chromedriver \
    && npm config set operadriver_cdnurl https://npmmirror.com/mirrors/operadriver \
    && npm config set phantomjs_cdnurl https://npmmirror.com/mirrors/phantomjs \
    && npm config set selenium_cdnurl https://npmmirror.com/mirrors/selenium \
    && npm config set node_inspector_cdnurl https://npmmirror.com/mirrors/node-inspector

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
