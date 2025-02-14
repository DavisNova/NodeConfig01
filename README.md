# nodeconfig
创建订阅链接的网页服务

## 功能特性

- 支持多种节点类型(VLESS, SOCKS5等)
- 可视化配置管理界面
- 订阅链接生成与管理
- 二维码分享功能
- 多用户管理
- 节点状态监控
- 访问统计
- 完整的管理后台

## 维护命令

### 1. 服务管理
```bash
# 查看服务状态
node-config    # 或输入数字 6

# 启动服务
node-config    # 或输入数字 3

# 停止服务
node-config    # 或输入数字 4

# 重启服务
node-config    # 或输入数字 5
```

### 2. 日志查看
```bash
# 查看所有服务日志
node-config    # 或输入数字 7

# 查看指定服务日志（如 nodeconfig）
docker logs nodeconfig

# 实时查看日志
docker logs -f nodeconfig

# 查看最近100条日志
docker logs --tail 100 nodeconfig

# 查看 MySQL 日志
docker logs nodeconfig-mysql

# 查看 phpMyAdmin 日志
docker logs nodeconfig-phpmyadmin
```

### 3. 数据库管理
```bash
# 访问数据库管理界面
http://服务器IP:8080

# 默认数据库账号
用户名: nodeconfig
密码: nodeconfig123
```

### 4. 备份与恢复
```bash
# 备份数据
node-config    # 或输入数字 10

# 恢复数据
node-config    # 或输入数字 11
```

### 5. 系统维护
```bash
# 检查更新
node-config    # 或输入数字 12

# 系统优化
node-config    # 或输入数字 14

# 自动清理
node-config    # 或输入数字 15
```

### 6. 故障排查
```bash
# 检查端口占用
netstat -tunlp | grep -E '3000|3306|8080'

# 检查服务状态
docker-compose ps

# 检查容器资源使用
docker stats

# 检查系统日志
journalctl -u docker
```

### 7. 完全卸载
```bash
node-config    # 或输入数字 13
```

## 运行
bash <(curl -sL https://raw.githubusercontent.com/DavisNova/NodeConfig01/refs/heads/main/install.sh)

## 技术栈

- 后端: Node.js + Express
- 数据库: MySQL 8.0
- 容器化: Docker + Docker Compose
- 前端: Bootstrap 5 + 原生JavaScript
- 反向代理: Nginx
- 安全性: HTTPS, JWT认证

## 使用指南

1. 访问管理面板
   - 地址: `http://服务器IP:3000/admin`
   - 默认账号: admin
   - 默认密码: admin123

2. 添加节点
   - 支持批量导入
   - 支持多种格式转换

3. 生成订阅
   - 自动生成订阅链接
   - 支持二维码分享
   - 可设置过期时间

## 安全建议

1. 及时修改默认管理员密码
2. 启用HTTPS
3. 配置防火墙规则
4. 定期备份数据
5. 监控系统日志

## 常见问题

### 1. 服务无法启动
```bash
# 检查错误日志
docker-compose logs

# 检查端口占用
netstat -tunlp | grep -E '3000|3306|8080'

# 检查磁盘空间
df -h
```

### 2. 数据库连接失败
```bash
# 检查 MySQL 状态
docker-compose ps mysql

# 查看 MySQL 日志
docker logs nodeconfig-mysql

# 重启 MySQL
docker-compose restart mysql
```

### 3. 性能问题
```bash
# 查看资源使用情况
docker stats

# 清理日志和缓存
node-config    # 或输入数字 15

# 查看系统负载
top
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 发起 Pull Request

## 许可证

MIT License

## 联系方式

- 作者: DavisNova
- 项目地址: https://github.com/DavisNova/NodeConfig01
