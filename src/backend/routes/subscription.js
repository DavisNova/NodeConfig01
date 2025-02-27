const express = require('express')
const router = express.Router()
const { cache, clearCache } = require('../middleware/cache')
const subscriptionController = require('../controllers/subscription')
const { protect, restrictTo } = require('../middleware/auth')

// 获取订阅列表 (缓存5分钟)
router.get('/', protect, cache(300), subscriptionController.getSubscriptions)

// 创建订阅 (清除缓存)
router.post('/', protect, clearCache('cache:*/subscription*'), subscriptionController.createSubscription)

// 获取订阅详情 (缓存2分钟)
router.get('/:id', protect, cache(120), subscriptionController.getSubscription)

// 更新订阅 (清除缓存)
router.put('/:id', protect, clearCache('cache:*/subscription*'), subscriptionController.updateSubscription)

// 删除订阅 (清除缓存)
router.delete('/:id', protect, clearCache('cache:*/subscription*'), subscriptionController.deleteSubscription)

// 生成订阅配置
router.get('/:id/config', protect, cache(60), subscriptionController.generateConfig)

// 获取订阅统计
router.get('/:id/stats', protect, cache(300), subscriptionController.getStats)

// 更新订阅流量（仅限管理员）
router.put('/:id/bandwidth', protect, restrictTo('admin'), clearCache('cache:*/subscription*'), subscriptionController.updateBandwidth)

module.exports = router 