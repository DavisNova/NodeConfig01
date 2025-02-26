const User = require('../models/user');
const jwt = require('../utils/jwt');
const logger = require('../utils/logger');

class UserController {
    // 用户注册
    static async register(req, res) {
        try {
            const { username, password, email } = req.body;

            // 验证必填字段
            if (!username || !password) {
                return res.status(400).json({
                    error: true,
                    message: '用户名和密码为必填项'
                });
            }

            // 检查用户名是否已存在
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({
                    error: true,
                    message: '用户名已存在'
                });
            }

            // 创建用户
            const userId = await User.create({
                username,
                password,
                email,
                role: 'user'
            });

            res.status(201).json({
                success: true,
                message: '注册成功',
                userId
            });
        } catch (error) {
            logger.error('用户注册失败:', error);
            res.status(500).json({
                error: true,
                message: '注册失败'
            });
        }
    }

    // 用户登录
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            // 验证必填字段
            if (!username || !password) {
                return res.status(400).json({
                    error: true,
                    message: '用户名和密码为必填项'
                });
            }

            // 查找用户
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(401).json({
                    error: true,
                    message: '用户名或密码错误'
                });
            }

            // 验证密码
            const isValidPassword = await User.verifyPassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: true,
                    message: '用户名或密码错误'
                });
            }

            // 生成 token
            const token = jwt.generateToken(user);

            res.json({
                success: true,
                message: '登录成功',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            logger.error('用户登录失败:', error);
            res.status(500).json({
                error: true,
                message: '登录失败'
            });
        }
    }

    // 获取用户信息
    static async getUserInfo(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    error: true,
                    message: '用户不存在'
                });
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            logger.error('获取用户信息失败:', error);
            res.status(500).json({
                error: true,
                message: '获取用户信息失败'
            });
        }
    }

    // 更新用户信息
    static async updateUser(req, res) {
        try {
            const userId = req.user.id;
            const { email, password } = req.body;

            const success = await User.update(userId, {
                email,
                password
            });

            if (success) {
                res.json({
                    success: true,
                    message: '用户信息更新成功'
                });
            } else {
                res.status(400).json({
                    error: true,
                    message: '用户信息更新失败'
                });
            }
        } catch (error) {
            logger.error('更新用户信息失败:', error);
            res.status(500).json({
                error: true,
                message: '更新用户信息失败'
            });
        }
    }
}

module.exports = UserController; 