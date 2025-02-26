const express = require('express')
const router = express.Router()
const nodeController = require('../controllers/node')
const { protect, restrictTo } = require('../middleware/auth')

// 需要管理员权限
router.use(restrictTo('admin'))

// 节点管理
router.get('/', nodeController.getNodes)
router.post('/', nodeController.createNode)
router.get('/:id', nodeController.getNode)
router.put('/:id', nodeController.updateNode)
router.delete('/:id', nodeController.deleteNode)

// 节点检测
router.post('/:id/check', nodeController.checkNode)
router.post('/batch-check', nodeController.batchCheckNodes)

// 节点模板
router.get('/templates', nodeController.getTemplates)
router.post('/templates', nodeController.createTemplate)
router.get('/templates/:id', nodeController.getTemplate)
router.put('/templates/:id', nodeController.updateTemplate)
router.delete('/templates/:id', nodeController.deleteTemplate)

module.exports = router 