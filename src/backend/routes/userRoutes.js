const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 公开路由
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// 需要认证的路由
router.get('/profile', authenticate, UserController.getUserInfo);
router.put('/profile', authenticate, UserController.updateUser);

// 管理员路由
router.get('/list', authenticate, isAdmin, UserController.getList);
router.delete('/:id', authenticate, isAdmin, UserController.delete);

module.exports = router; 