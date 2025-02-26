const { Subscription, Node, User, SubscriptionNode } = require('../models')
const { AppError, catchAsync } = require('../middleware/error')
const { Op } = require('sequelize')
const yaml = require('js-yaml')

// 获取订阅列表
exports.getSubscriptions = catchAsync(async (req, res) => {
    const { page = 1, pageSize = 10, name, status, userId } = req.query
    const isAdmin = req.user.role === 'admin'

    // 构建查询条件
    const where = {}
    if (name) where.name = { [Op.like]: \`%\${name}%\` }
    if (status) where.status = status
    if (userId && isAdmin) {
        where.userId = userId
    } else {
        where.userId = req.user.id
    }

    // 查询订阅
    const { count, rows } = await Subscription.findAndCountAll({
        where,
        include: [{
            model: User,
            as: 'user',
            attributes: ['username']
        }],
        offset: (page - 1) * pageSize,
        limit: parseInt(pageSize),
        order: [['created_at', 'DESC']]
    })

    // 获取每个订阅的节点数量
    const subscriptions = await Promise.all(rows.map(async (subscription) => {
        const nodeCount = await subscription.countNodes()
        return {
            ...subscription.toJSON(),
            nodeCount
        }
    }))

    res.json({
        success: true,
        data: {
            total: count,
            subscriptions
        }
    })
})

// 获取订阅详情
exports.getSubscription = catchAsync(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id, {
        include: [
            {
                model: Node,
                as: 'nodes',
                through: { attributes: ['status', 'bandwidth'] }
            },
            {
                model: User,
                as: 'user',
                attributes: ['username']
            }
        ]
    })

    if (!subscription) {
        throw new AppError('订阅不存在', 404)
    }

    // 检查权限
    if (subscription.userId !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('没有权限访问此订阅', 403)
    }

    res.json({
        success: true,
        data: subscription
    })
})

// 创建订阅
exports.createSubscription = catchAsync(async (req, res) => {
    const {
        name,
        userId,
        nodes,
        templateId,
        expire_at,
        bandwidth_limit,
        remark
    } = req.body

    // 检查用户是否存在
    const targetUserId = userId || req.user.id
    const user = await User.findByPk(targetUserId)
    if (!user) {
        throw new AppError('用户不存在', 404)
    }

    // 检查权限
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('没有权限为其他用户创建订阅', 403)
    }

    // 检查节点是否存在
    if (!nodes || nodes.length === 0) {
        throw new AppError('请选择至少一个节点', 400)
    }

    const existingNodes = await Node.findAll({
        where: {
            id: nodes,
            status: 'active'
        }
    })

    if (existingNodes.length !== nodes.length) {
        throw new AppError('部分节点不存在或已停用', 400)
    }

    // 创建订阅
    const subscription = await Subscription.create({
        name,
        userId: targetUserId,
        templateId,
        expire_at,
        bandwidth_limit,
        remark,
        status: 'active'
    })

    // 关联节点
    await subscription.setNodes(existingNodes)

    // 返回完整的订阅信息
    const result = await Subscription.findByPk(subscription.id, {
        include: [
            {
                model: Node,
                as: 'nodes',
                through: { attributes: ['status', 'bandwidth'] }
            },
            {
                model: User,
                as: 'user',
                attributes: ['username']
            }
        ]
    })

    res.status(201).json({
        success: true,
        data: result
    })
})

// 更新订阅
exports.updateSubscription = catchAsync(async (req, res) => {
    const {
        name,
        nodes,
        templateId,
        expire_at,
        bandwidth_limit,
        remark,
        status
    } = req.body

    const subscription = await Subscription.findByPk(req.params.id)
    if (!subscription) {
        throw new AppError('订阅不存在', 404)
    }

    // 检查权限
    if (subscription.userId !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('没有权限修改此订阅', 403)
    }

    // 更新节点关联
    if (nodes) {
        const existingNodes = await Node.findAll({
            where: {
                id: nodes,
                status: 'active'
            }
        })

        if (existingNodes.length !== nodes.length) {
            throw new AppError('部分节点不存在或已停用', 400)
        }

        await subscription.setNodes(existingNodes)
    }

    // 更新订阅信息
    Object.assign(subscription, {
        name,
        templateId,
        expire_at,
        bandwidth_limit,
        remark,
        status
    })

    await subscription.save()

    // 返回更新后的订阅信息
    const result = await Subscription.findByPk(subscription.id, {
        include: [
            {
                model: Node,
                as: 'nodes',
                through: { attributes: ['status', 'bandwidth'] }
            },
            {
                model: User,
                as: 'user',
                attributes: ['username']
            }
        ]
    })

    res.json({
        success: true,
        data: result
    })
})

// 删除订阅
exports.deleteSubscription = catchAsync(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id)
    if (!subscription) {
        throw new AppError('订阅不存在', 404)
    }

    // 检查权限
    if (subscription.userId !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('没有权限删除此订阅', 403)
    }

    await subscription.destroy()

    res.json({
        success: true,
        message: '订阅已删除'
    })
})

// 生成订阅配置
exports.generateConfig = catchAsync(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id, {
        include: [
            {
                model: Node,
                as: 'nodes',
                where: { status: 'active' },
                through: { where: { status: 'active' } }
            }
        ]
    })

    if (!subscription) {
        throw new AppError('订阅不存在', 404)
    }

    // 检查权限
    if (subscription.userId !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('没有权限访问此订阅', 403)
    }

    // 检查订阅状态
    if (subscription.status !== 'active') {
        throw new AppError('订阅已停用', 400)
    }

    // 检查是否过期
    if (subscription.expire_at && new Date(subscription.expire_at) < new Date()) {
        throw new AppError('订阅已过期', 400)
    }

    // 检查流量限制
    if (subscription.bandwidth_limit && subscription.bandwidth >= subscription.bandwidth_limit) {
        throw new AppError('订阅流量已用尽', 400)
    }

    // 生成配置
    const config = {
        version: 1,
        nodes: subscription.nodes.map(node => ({
            name: node.name,
            type: node.type,
            server: node.host,
            port: node.port,
            ...JSON.parse(node.config)
        }))
    }

    // 记录访问
    subscription.lastAccessAt = new Date()
    subscription.lastAccessIp = req.ip
    subscription.accessCount += 1
    await subscription.save()

    // 返回YAML格式的配置
    res.setHeader('Content-Type', 'text/yaml')
    res.setHeader('Content-Disposition', \`attachment; filename="subscription-\${subscription.id}.yaml"\`)
    res.send(yaml.dump(config))
})

// 获取订阅统计信息
exports.getStats = catchAsync(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id)
    if (!subscription) {
        throw new AppError('订阅不存在', 404)
    }

    // 检查权限
    if (subscription.userId !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('没有权限访问此订阅', 403)
    }

    // 获取统计信息
    const stats = {
        totalBandwidth: subscription.bandwidth,
        bandwidthLimit: subscription.bandwidth_limit,
        accessCount: subscription.accessCount,
        lastAccessAt: subscription.lastAccessAt,
        lastAccessIp: subscription.lastAccessIp,
        nodeCount: await subscription.countNodes(),
        activeNodeCount: await subscription.countNodes({
            where: { status: 'active' }
        })
    }

    res.json({
        success: true,
        data: stats
    })
})

// 更新订阅流量
exports.updateBandwidth = catchAsync(async (req, res) => {
    const { nodeId, bandwidth } = req.body
    const subscription = await Subscription.findByPk(req.params.id)

    if (!subscription) {
        throw new AppError('订阅不存在', 404)
    }

    // 更新节点流量
    const subscriptionNode = await SubscriptionNode.findOne({
        where: {
            subscriptionId: subscription.id,
            nodeId
        }
    })

    if (subscriptionNode) {
        subscriptionNode.bandwidth += bandwidth
        await subscriptionNode.save()
    }

    // 更新订阅总流量
    subscription.bandwidth += bandwidth
    if (subscription.bandwidth_limit && subscription.bandwidth >= subscription.bandwidth_limit) {
        subscription.status = 'inactive'
    }
    await subscription.save()

    res.json({
        success: true,
        data: {
            bandwidth: subscription.bandwidth,
            status: subscription.status
        }
    })
}) 