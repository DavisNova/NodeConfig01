const jwt = require('jsonwebtoken')
const { AppError } = require('./error')
const config = require('../config')
const { User } = require('../models/user')

// 验证JWT Token
const protect = async (req, res, next) => {
    try {
        // 1) 获取token
        let token
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1]
        }

        if (!token) {
            return next(new AppError('请先登录', 401))
        }

        // 2) 验证token
        const decoded = jwt.verify(token, config.jwt.secret)

        // 3) 检查用户是否仍然存在
        const user = await User.findByPk(decoded.id)
        if (!user) {
            return next(new AppError('此token对应的用户不存在', 401))
        }

        // 4) 检查用户是否在token签发后更改了密码
        if (user.passwordChangedAt) {
            const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10)
            if (decoded.iat < changedTimestamp) {
                return next(new AppError('用户近期修改了密码，请重新登录', 401))
            }
        }

        // 5) 检查用户状态
        if (user.status !== 'active') {
            return next(new AppError('账户已被禁用', 403))
        }

        // 将用户信息添加到请求对象
        req.user = user
        next()
    } catch (error) {
        return next(new AppError('认证失败', 401))
    }
}

// 限制角色访问
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('没有权限执行此操作', 403))
        }
        next()
    }
}

// 限制只能操作自己的资源
const restrictToSelf = (req, res, next) => {
    if (req.user.role !== 'admin' && req.params.id !== req.user.id) {
        return next(new AppError('只能操作自己的资源', 403))
    }
    next()
}

// 速率限制
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    message: '请求过于频繁，请稍后再试'
})

module.exports = {
    protect,
    restrictTo,
    restrictToSelf,
    loginLimiter
} 