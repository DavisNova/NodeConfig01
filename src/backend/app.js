const express = require('express')
const { connectDB } = require('./utils/db')
const { logger, accessLogger, errorLogger } = require('./utils/logger')
const { 
    basicSecurity, 
    apiLimiter, 
    sqlInjectionProtection, 
    xssProtection,
    secureHeaders,
    errorHandler 
} = require('./middleware/security')
const { performanceMonitor, startMonitoring } = require('./middleware/performance')
const config = require('./config')
const routes = require('./routes')

const app = express()

// 连接数据库
connectDB()

// 基础中间件
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// 安全中间件
app.use(basicSecurity)
app.use(secureHeaders)
app.use(apiLimiter)
app.use(sqlInjectionProtection)
app.use(xssProtection)

// 日志中间件
app.use(accessLogger)
app.use(errorLogger)

// 性能监控中间件
app.use(performanceMonitor)

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now()
    })
})

// API路由
app.use('/api', routes)

// 错误处理
app.use(errorHandler)

// 启动服务器
const PORT = config.port || 3000
const server = app.listen(PORT, () => {
    logger.info(\`Server is running on port \${PORT}\`)
})

// 启动监控
startMonitoring(app)

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...')
    server.close(() => {
        logger.info('Server closed')
        process.exit(0)
    })
})

module.exports = app 