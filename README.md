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

## 运行
bash <(curl -sL https://raw.githubusercontent.com/DavisNova/NodeConfig01/main/install.sh)

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

1. 安装失败
   - 检查系统要求
   - 确保Docker正常运行
   - 查看安装日志

2. 无法访问面板
   - 检查防火墙设置
   - 确认服务状态
   - 查看错误日志

3. 订阅无法更新
   - 检查节点配置
   - 确认数据库连接
   - 验证订阅地址

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
