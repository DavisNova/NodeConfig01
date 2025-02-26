const express = require('express');
const router = express.Router();
const NodeController = require('../controllers/nodeController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 所有节点路由都需要认证
router.use(authenticate);

// 管理员路由
router.post('/', isAdmin, NodeController.create);
router.put('/:id', isAdmin, NodeController.update);
router.delete('/:id', isAdmin, NodeController.delete);

// 普通用户和管理员都可以访问的路由
router.get('/', NodeController.getList);
router.get('/:id', NodeController.getDetail);
router.post('/check-status', NodeController.checkNodesStatus);

module.exports = router; 