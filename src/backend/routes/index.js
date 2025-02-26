const express = require('express')
const router = express.Router()
const authRoutes = require('./auth')
const userRoutes = require('./user')
const nodeRoutes = require('./node')
const subscriptionRoutes = require('./subscription')
const { protect } = require('../middleware/auth')

// 健康检查
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    })
})

// API版本
router.get('/version', (req, res) => {
    res.json({
        version: '1.0.0',
        apiVersion: 'v1'
    })
})

// 认证相关路由
router.use('/auth', authRoutes)

// 需要认证的路由
router.use(protect) // 应用认证中间件

// 用户相关路由
router.use('/user', userRoutes)

// 节点相关路由
router.use('/node', nodeRoutes)

// 订阅相关路由
router.use('/subscription', subscriptionRoutes)

module.exports = router 