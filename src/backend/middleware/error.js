const config = require('../config')

class AppError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
        this.status = \`\${statusCode}\`.startsWith('4') ? 'fail' : 'error'
        this.isOperational = true

        Error.captureStackTrace(this, this.constructor)
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'

    if (config.nodeEnv === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        })
    } else {
        // 生产环境
        if (err.isOperational) {
            // 可预见的操作错误
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            })
        } else {
            // 编程错误：不泄露错误详情
            console.error('ERROR 💥', err)
            res.status(500).json({
                status: 'error',
                message: '服务器内部错误'
            })
        }
    }
}

const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next)
    }
}

module.exports = {
    AppError,
    errorHandler,
    catchAsync
} 