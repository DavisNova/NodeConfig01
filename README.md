# NodeConfig - 节点配置生成工具箱

## 项目简介

NodeConfig 是一个功能强大的节点配置管理系统，提供了完整的节点管理、用户管理和订阅管理功能。系统采用前后端分离架构，使用 Docker 进行容器化部署，确保了部署的一致性和可靠性。

## 技术栈

### 后端
- Node.js
- Express.js
- MySQL
- JWT 认证
- Node-Schedule 定时任务
- Winston 日志管理

### 前端
- Vue 3
- Ant Design Vue
- Moment.js
- QRCode 生成

### 部署
- Docker & Docker Compose
- Nginx
- MySQL
- Redis 缓存

## 目录结构

```
NodeConfig/
├── src/                          # 源代码目录
│   ├── public/                   # 静态资源
│   │   ├── admin.html           # 管理后台页面
│   │   └── index.html           # 用户前端页面
│   ├── server.js                # 主服务器文件
│   ├── template.yml             # 节点配置模板
│   └── package.json             # 项目依赖配置
├── docker-compose.yml           # Docker 编排配置
├── Dockerfile                   # Docker 构建文件
├── nginx.conf                   # Nginx 配置
├── init.sql                     # 数据库初始化脚本
├── install.sh                   # 安装脚本
├── setup.sh                     # 环境设置脚本
└── docker-entrypoint.sh        # Docker 入口脚本
```

## 功能特性

1. 节点管理
   - 支持 VLESS 和 SOCKS5 节点配置
   - 节点信息管理(名称、类型、国家、城市等)
   - 节点有效期管理
   - 节点状态监控
   - 节点使用统计

2. 用户管理
   - 用户注册与登录
   - JWT 令牌认证
   - 角色权限控制(管理员/普通用户)
   - 用户信息管理
   - 密码修改功能

3. 订阅管理
   - 订阅链接生成
   - 订阅二维码生成
   - 订阅配置自动更新
   - 流量统计
   - 访问日志记录

4. 系统功能
   - 实时统计面板
   - 自动数据备份(每日凌晨3点)
   - 详细错误日志
   - 系统性能优化
   - 安全防护措施

## 页面说明

1. 用户前端 (/)
   - 登录界面
   - 我的订阅列表
     - 订阅链接和二维码
     - 节点数量统计
     - 流量使用情况
     - 到期时间显示
   - 个人信息管理
     - 基本信息查看
     - 密码修改

2. 管理后台 (/admin)
   - 仪表盘
     - 总订阅数
     - 活跃用户数
     - 节点总数
     - 今日访问量
   - 订阅管理
     - 订阅列表
     - 订阅创建
     - 订阅编辑
     - 订阅删除
   - 节点管理
     - 节点列表
     - 节点添加
     - 节点编辑
     - 节点删除
   - 系统设置
     - 系统名称
     - 管理员邮箱

## API 接口

1. 认证接口
   - POST /api/login - 用户登录
   - POST /api/user/change-password - 修改密码

2. 用户接口
   - GET /api/user/info - 获取用户信息
   - GET /api/user/subscriptions - 获取用户订阅列表

3. 管理接口
   - GET /api/admin/stats - 获取统计数据
   - GET /api/admin/users - 获取用户列表
   - GET /api/admin/nodes - 获取节点列表
   - GET /api/admin/templates - 获取模板列表

4. 订阅接口
   - GET /subscribe/:id - 获取订阅配置
   - POST /api/check - 检查节点配置
   - POST /api/generate - 生成配置文件
   - POST /api/save - 保存配置

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

### 环境要求

- Debian/Ubuntu 系统
- Docker & Docker Compose
- 最小配置要求：
  - CPU: 1核
  - 内存: 1GB
  - 硬盘: 5GB

## 配置说明

1. 环境变量配置(.env)
```env
# 数据库配置
DB_HOST=mysql
DB_USER=nodeconfig
DB_PASSWORD=nodeconfig123
DB_NAME=nodeconfig_db
DB_PORT=3306

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-jwt-secret-key

# 系统配置
PORT=3000
NODE_ENV=production
```

2. 数据库配置(init.sql)
- 用户表
- 节点表
- 订阅表
- 访问统计表
- 错误日志表

3. Nginx配置(nginx.conf)
- 反向代理设置
- SSL配置
- 缓存优化
- 安全头部

## 使用说明

1. 访问地址
```
用户前端: http://您的服务器IP:3000
管理后台: http://您的服务器IP:3000/admin
```

2. 默认管理员账号
```
用户名: admin
密码: admin123
```

## 维护管理

1. 服务管理
```bash
# 启动服务
./install.sh  # 选择选项 3

# 停止服务
./install.sh  # 选择选项 4

# 重启服务
./install.sh  # 选择选项 5
```

2. 查看状态
```bash
./install.sh  # 选择选项 6
```

3. 日志查看
```bash
./install.sh  # 选择选项 7
```

4. 数据备份
```bash
./install.sh  # 选择选项 10
```

## 安全建议

1. 系统安全
   - 修改默认管理员密码
   - 配置强密码策略
   - 启用防火墙
   - 定期更新系统

2. 数据安全
   - 启用自动备份
   - 定期验证备份
   - 加密敏感数据
   - 监控异常访问

3. 访问控制
   - 限制管理员IP
   - 启用登录失败限制
   - 定期清理过期会话
   - 记录操作日志

## 故障排除

1. 服务启动问题
   - 检查端口占用
   - 验证数据库连接
   - 查看错误日志
   - 确认环境变量

2. 数据库问题
   - 检查数据库服务
   - 验证连接参数
   - 确认表结构
   - 检查权限设置

3. 节点配置问题
   - 验证节点格式
   - 检查模板配置
   - 测试节点连接
   - 查看解析日志

## 版本历史

### v1.0.0 (2024-02-27)
- 完整的节点管理功能
- 用户认证系统
- 订阅管理功能
- Docker部署支持
- 自动备份功能
- 错误日志记录

## 许可证

MIT License

## 技术支持

- Issues: https://github.com/DavisNova/NodeConfig01/issues
- Discussions: https://github.com/DavisNova/NodeConfig01/discussions
- Email: support@nodeconfig.com

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 发起 Pull Request

## 开发计划

1. 近期计划
   - 添加节点监控功能
   - 优化数据库查询性能
   - 增加更多节点类型支持
   - 完善错误处理机制

2. 长期计划
   - 支持集群部署
   - 添加API文档
   - 优化前端界面
   - 增加更多统计功能
