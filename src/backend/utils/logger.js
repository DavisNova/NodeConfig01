const winston = require('winston');
const { format } = winston;
const path = require('path');
const config = require('../config');

// 日志格式化
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

// 创建日志目录
const LOG_DIR = path.join(process.cwd(), 'logs');
require('fs').mkdirSync(LOG_DIR, { recursive: true });

// 创建日志实例
const logger = winston.createLogger({
    level: config.log.level || 'info',
    format: logFormat,
    defaultMeta: { service: 'nodeconfig' },
    transports: [
        // 错误日志
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 7,
            tailable: true
        }),
        // 普通日志
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 7,
            tailable: true
        }),
        // 访问日志
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'access.log'),
            level: 'http',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 7,
            tailable: true
        })
    ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
}

// 创建访问日志中间件
const accessLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    next();
};

// 错误日志中间件
const errorLogger = (err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        user: req.user?.id
    });
    next(err);
};

// 性能日志中间件
const performanceLogger = (req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;
        
        if (duration > 1000) { // 记录超过1秒的请求
            logger.warn({
                type: 'slow_request',
                method: req.method,
                url: req.url,
                duration,
                ip: req.ip
module.exports = logger; 