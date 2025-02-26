const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth')
const { protect } = require('../middleware/auth')
const { loginLimiter } = require('../middleware/rateLimit')

// 公开路由
router.post('/login', loginLimiter, authController.login)
router.post('/register', authController.register)

// 需要认证的路由
router.use(protect)

router.get('/me', authController.getCurrentUser)
router.post('/logout', authController.logout)
router.put('/password', authController.changePassword)
router.post('/email/code', authController.sendEmailCode)
router.post('/email/verify', authController.verifyEmail)

module.exports = router 