# NodeConfig - 节点配置生成工具箱

## 项目简介

NodeConfig 是一个功能强大的节点配置管理系统，提供了完整的节点管理、用户管理和订阅管理功能。系统采用前后端分离架构，使用 Docker 进行容器化部署，确保了部署的一致性和可靠性。

## 技术栈

### 后端
- Node.js
- Express.js
- MySQL
- Sequelize ORM
- PM2 进程管理
- JWT 认证

### 前端
- Vue.js
- Element UI
- Axios

### 部署
- Docker & Docker Compose
- Nginx
- MySQL

## 目录结构

```
NodeConfig/
├── src/                          # 源代码目录
│   ├── frontend/                 # 前端代码
│   │   ├── public/              # 静态资源
│   │   ├── package.json         # 前端依赖配置
│   │   ├── vue.config.js        # Vue 配置
│   │   └── .env                 # 前端环境变量
│   ├── backend/                  # 后端代码
│   │   ├── controllers/         # 控制器
│   │   ├── models/             # 数据模型
│   │   ├── routes/             # 路由配置
│   │   ├── middleware/         # 中间件
│   │   ├── database/           # 数据库相关
│   │   ├── config/            # 配置文件
│   │   └── utils/             # 工具函数
│   ├── public/                 # 公共资源
│   └── server.js               # 主服务器文件
├── docker-compose.yml          # Docker 编排配置
├── Dockerfile                  # Docker 构建文件
├── nginx.conf                  # Nginx 配置
├── init.sql                    # 数据库初始化脚本
├── install.sh                  # 安装脚本
├── setup.sh                    # 环境设置脚本
└── docker-entrypoint.sh       # Docker 入口脚本
```

## 功能特性

1. 节点管理
   - 节点添加、编辑、删除
   - 节点状态监控
   - 节点配置模板
   - 节点流量统计

2. 用户管理
   - 用户注册与登录
   - 角色权限控制
   - 用户订阅管理
   - 流量限制

3. 订阅管理
   - 订阅链接生成
   - 订阅配置更新
   - 流量统计
   - 有效期管理

4. 系统管理
   - 系统监控
   - 自动备份
   - 日志管理
   - 系统优化

## 安装部署

### 快速安装

```bash
# 下载安装脚本
wget https://raw.githubusercontent.com/DavisNova/NodeConfig01/main/install.sh

# 添加执行权限
chmod +x install.sh

# 运行安装脚本
./install.sh
```

### 手动安装

1. 安装依赖
```bash
# 选择选项 1
./install.sh
```

2. 部署服务
```bash
# 选择选项 2
./install.sh
```

### 环境要求

- Debian/Ubuntu 系统
- 最小配置要求：
  - CPU: 1核
  - 内存: 512MB
  - 硬盘: 1GB

## 配置说明

1. 环境变量配置（.env）
2. 数据库配置（init.sql）
3. Nginx 配置（nginx.conf）
4. Docker 配置（docker-compose.yml）

## 使用说明

1. 访问管理面板
```
http://您的服务器IP:3000
```

2. 默认管理员账号
```
用户名: admin
密码: admin123
```

## 维护管理

1. 查看服务状态
```bash
./install.sh  # 选择选项 6
```

2. 查看日志
```bash
./install.sh  # 选择选项 7
```

3. 备份数据
```bash
./install.sh  # 选择选项 10
```

4. 恢复数据
```bash
./install.sh  # 选择选项 11
```

## 更新升级

```bash
./install.sh  # 选择选项 9
```

## 故障排除

1. 服务无法启动
   - 检查端口占用
   - 检查数据库连接
   - 查看错误日志

2. 数据库连接失败
   - 验证数据库凭据
   - 检查数据库服务状态
   - 确认数据库权限

## 安全建议

1. 及时修改默认管理员密码
2. 定期备份数据
3. 更新系统安全补丁
4. 配置防火墙规则

## 许可证

MIT License

## 技术支持

- 问题报告：提交 Issue
- 功能建议：提交 Pull Request
- 技术讨论：参与 Discussions

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 发起 Pull Request

## 版本历史

- v1.0.0 - 初始发布
  - 完整的节点管理功能
  - 用户系统
  - 订阅管理
  - Docker 部署支持
