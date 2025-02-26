require('dotenv').config()

module.exports = {
    // 服务器配置
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // 数据库配置
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'nodeconfig',
        dialect: 'mysql'
    },

    // JWT配置
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },

    // 邮件配置
    email: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        },
        from: process.env.MAIL_FROM || 'NodeConfig <noreply@nodeconfig.com>'
    },

    // Redis配置
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASS || null
    },

    // 节点检测配置
    nodeCheck: {
        timeout: process.env.NODE_CHECK_TIMEOUT || 5000,
        interval: process.env.NODE_CHECK_INTERVAL || 300000 // 5分钟
    },

    // 安全配置
    security: {
        passwordSaltRounds: 10,
        rateLimitWindowMs: 15 * 60 * 1000, // 15分钟
        rateLimitMax: 100 // 最大请求次数
    },

    // 订阅配置
    subscription: {
        maxNodes: process.env.MAX_NODES_PER_SUB || 100,
        configTemplate: process.env.CONFIG_TEMPLATE || 'default'
    }
} 