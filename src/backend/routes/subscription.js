const express = require('express')
const router = express.Router()
const subscriptionController = require('../controllers/subscription')
const { protect, restrictTo } = require('../middleware/auth')

// 获取订阅列表
router.get('/', subscriptionController.getSubscriptions)

// 创建订阅
router.post('/', subscriptionController.createSubscription)

// 获取订阅详情
router.get('/:id', subscriptionController.getSubscription)

// 更新订阅
router.put('/:id', subscriptionController.updateSubscription)

// 删除订阅
router.delete('/:id', subscriptionController.deleteSubscription)

// 生成订阅配置
router.get('/:id/config', subscriptionController.generateConfig)

// 获取订阅统计
router.get('/:id/stats', subscriptionController.getStats)

// 更新订阅流量（仅限管理员）
router.put('/:id/bandwidth', restrictTo('admin'), subscriptionController.updateBandwidth)

module.exports = router 