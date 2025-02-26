const express = require('express');
const router = express.Router();
const SubscriptionController = require('../controllers/subscriptionController');
const { authenticate, isAdmin, checkResourceAccess } = require('../middleware/auth');

// 所有订阅路由都需要认证
router.use(authenticate);

// 创建订阅
router.post('/', SubscriptionController.create);

// 获取订阅列表
router.get('/', SubscriptionController.getList);

// 获取订阅详情
router.get('/:id', checkResourceAccess('subscription'), SubscriptionController.getDetail);

// 更新订阅
router.put('/:id', checkResourceAccess('subscription'), SubscriptionController.update);

// 删除订阅
router.delete('/:id', checkResourceAccess('subscription'), SubscriptionController.delete);

// 生成订阅配置
router.get('/:id/config', checkResourceAccess('subscription'), SubscriptionController.generateConfig);

module.exports = router; 