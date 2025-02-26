const express = require('express')
const router = express.Router()
const userController = require('../controllers/user')
const { protect, restrictTo } = require('../middleware/auth')

// 个人信息相关
router.get('/profile', userController.getUserStats)
router.put('/profile', userController.updateProfile)

// 管理员路由
router.use(restrictTo('admin'))

router.get('/', userController.getUsers)
router.post('/', userController.createUser)
router.get('/:id', userController.getUser)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)
router.get('/:id/stats', userController.getUserStats)

module.exports = router 