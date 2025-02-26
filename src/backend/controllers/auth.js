const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { User } = require('../models')
const { AppError, catchAsync } = require('../middleware/error')
const config = require('../config')

// 用户登录
exports.login = catchAsync(async (req, res) => {
    const { username, password } = req.body

    // 1) 检查用户名和密码是否存在
    if (!username || !password) {
        throw new AppError('请提供用户名和密码', 400)
    }

    // 2) 查找用户
    const user = await User.findOne({ where: { username } })
    if (!user || !(await user.comparePassword(password))) {
        throw new AppError('用户名或密码错误', 401)
    }

    // 3) 检查用户状态
    if (user.status !== 'active') {
        throw new AppError('账户已被禁用', 403)
    }

    // 4) 生成 token
    const token = jwt.sign({ id: user.id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    })

    // 5) 更新最后登录时间和IP
    user.lastLoginAt = new Date()
    user.lastLoginIp = req.ip
    await user.save()

    // 6) 发送响应
    res.json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
            }
        }
    })
})

// 用户注册
exports.register = catchAsync(async (req, res) => {
    const { username, password, email } = req.body

    // 1) 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
        throw new AppError('用户名已存在', 400)
    }

    // 2) 检查邮箱是否已存在
    if (email) {
        const existingEmail = await User.findOne({ where: { email } })
        if (existingEmail) {
            throw new AppError('邮箱已被使用', 400)
        }
    }

    // 3) 创建用户
    const user = await User.create({
        username,
        password,
        email,
        role: 'user',
        status: 'active'
    })

    // 4) 生成 token
    const token = jwt.sign({ id: user.id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    })

    // 5) 发送响应
    res.status(201).json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
            }
        }
    })
})

// 获取当前用户信息
exports.getCurrentUser = catchAsync(async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
    })

    if (!user) {
        throw new AppError('用户不存在', 404)
    }

    res.json({
        success: true,
        data: user
    })
})

// 修改密码
exports.changePassword = catchAsync(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    // 1) 获取用户
    const user = await User.findByPk(req.user.id)

    // 2) 验证旧密码
    if (!(await user.comparePassword(oldPassword))) {
        throw new AppError('当前密码错误', 401)
    }

    // 3) 更新密码
    user.password = newPassword
    await user.save()

    // 4) 生成新token
    const token = jwt.sign({ id: user.id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    })

    res.json({
        success: true,
        data: { token }
    })
})

// 退出登录
exports.logout = catchAsync(async (req, res) => {
    // 由于使用JWT，服务端不需要做特殊处理
    // 客户端需要清除token
    res.json({
        success: true,
        message: '退出成功'
    })
})

// 发送邮箱验证码
exports.sendEmailCode = catchAsync(async (req, res) => {
    const { email } = req.body

    // 1) 生成验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 2) 保存验证码
    const user = await User.findByPk(req.user.id)
    user.emailVerificationToken = await bcrypt.hash(verificationCode, 8)
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000) // 10分钟有效
    await user.save()

    // 3) 发送邮件
    try {
        // TODO: 实现邮件发送功能
        // await sendEmail({
        //     to: email,
        //     subject: '邮箱验证码',
        //     text: \`您的验证码是: \${verificationCode}\`
        // })

        res.json({
            success: true,
            message: '验证码已发送'
        })
    } catch (error) {
        user.emailVerificationToken = null
        user.emailVerificationExpires = null
        await user.save()
        throw new AppError('发送验证码失败，请稍后重试', 500)
    }
})

// 验证邮箱
exports.verifyEmail = catchAsync(async (req, res) => {
    const { email, code } = req.body

    // 1) 获取用户
    const user = await User.findByPk(req.user.id)

    // 2) 检查验证码是否过期
    if (!user.emailVerificationToken || !user.emailVerificationExpires) {
        throw new AppError('验证码不存在或已过期', 400)
    }

    if (user.emailVerificationExpires < new Date()) {
        throw new AppError('验证码已过期', 400)
    }

    // 3) 验证验证码
    const isValid = await bcrypt.compare(code, user.emailVerificationToken)
    if (!isValid) {
        throw new AppError('验证码错误', 400)
    }

    // 4) 更新邮箱
    user.email = email
    user.emailVerified = true
    user.emailVerificationToken = null
    user.emailVerificationExpires = null
    await user.save()

    res.json({
        success: true,
        message: '邮箱验证成功'
    })
}) 