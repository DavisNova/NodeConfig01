const { Node, NodeTemplate } = require('../models')
const { AppError, catchAsync } = require('../middleware/error')
const { Op } = require('sequelize')
const net = require('net')

// 获取节点列表
exports.getNodes = catchAsync(async (req, res) => {
    const { page = 1, pageSize = 10, name, type, status, country } = req.query

    // 构建查询条件
    const where = {}
    if (name) where.name = { [Op.like]: \`%\${name}%\` }
    if (type) where.type = type
    if (status) where.status = status
    if (country) where.country = country

    // 查询节点
    const { count, rows } = await Node.findAndCountAll({
        where,
        offset: (page - 1) * pageSize,
        limit: parseInt(pageSize),
        order: [['created_at', 'DESC']]
    })

    res.json({
        success: true,
        data: {
            total: count,
            nodes: rows
        }
    })
})

// 获取节点详情
exports.getNode = catchAsync(async (req, res) => {
    const node = await Node.findByPk(req.params.id)
    if (!node) {
        throw new AppError('节点不存在', 404)
    }

    res.json({
        success: true,
        data: node
    })
})

// 创建节点
exports.createNode = catchAsync(async (req, res) => {
    const {
        name,
        type,
        config,
        country,
        city,
        host,
        port,
        purchase_date,
        expire_date,
        bandwidth_limit,
        remark
    } = req.body

    // 检查节点名称是否存在
    const existingNode = await Node.findOne({ where: { name } })
    if (existingNode) {
        throw new AppError('节点名称已存在', 400)
    }

    // 创建节点
    const node = await Node.create({
        name,
        type,
        config,
        country,
        city,
        host,
        port,
        purchase_date,
        expire_date,
        bandwidth_limit,
        remark,
        status: 'active'
    })

    res.status(201).json({
        success: true,
        data: node
    })
})

// 更新节点
exports.updateNode = catchAsync(async (req, res) => {
    const {
        name,
        type,
        config,
        country,
        city,
        host,
        port,
        purchase_date,
        expire_date,
        bandwidth_limit,
        remark,
        status
    } = req.body

    const node = await Node.findByPk(req.params.id)
    if (!node) {
        throw new AppError('节点不存在', 404)
    }

    // 检查节点名称是否被其他节点使用
    if (name && name !== node.name) {
        const existingNode = await Node.findOne({ where: { name } })
        if (existingNode) {
            throw new AppError('节点名称已存在', 400)
        }
    }

    // 更新节点信息
    Object.assign(node, {
        name,
        type,
        config,
        country,
        city,
        host,
        port,
        purchase_date,
        expire_date,
        bandwidth_limit,
        remark,
        status
    })

    await node.save()

    res.json({
        success: true,
        data: node
    })
})

// 删除节点
exports.deleteNode = catchAsync(async (req, res) => {
    const node = await Node.findByPk(req.params.id)
    if (!node) {
        throw new AppError('节点不存在', 404)
    }

    await node.destroy()

    res.json({
        success: true,
        message: '节点已删除'
    })
})

// 检测节点
exports.checkNode = catchAsync(async (req, res) => {
    const node = await Node.findByPk(req.params.id)
    if (!node) {
        throw new AppError('节点不存在', 404)
    }

    // 创建TCP连接测试延迟
    const startTime = Date.now()
    const socket = new net.Socket()
    
    const checkPromise = new Promise((resolve, reject) => {
        socket.connect(node.port, node.host, () => {
            const latency = Date.now() - startTime
            socket.destroy()
            resolve(latency)
        })

        socket.on('error', (error) => {
            socket.destroy()
            reject(error)
        })

        // 设置超时
        socket.setTimeout(5000)
        socket.on('timeout', () => {
            socket.destroy()
            reject(new Error('连接超时'))
        })
    })

    try {
        const latency = await checkPromise
        node.latency = latency
        node.lastCheckAt = new Date()
        node.status = 'active'
        await node.save()

        res.json({
            success: true,
            data: {
                latency,
                status: 'active'
            }
        })
    } catch (error) {
        node.latency = null
        node.lastCheckAt = new Date()
        node.status = 'error'
        node.lastError = error.message
        await node.save()

        res.json({
            success: true,
            data: {
                error: error.message,
                status: 'error'
            }
        })
    }
})

// 批量检测节点
exports.batchCheckNodes = catchAsync(async (req, res) => {
    const nodes = await Node.findAll()
    
    // 启动批量检测任务
    process.nextTick(async () => {
        for (const node of nodes) {
            try {
                const socket = new net.Socket()
                const startTime = Date.now()
                
                await new Promise((resolve, reject) => {
                    socket.connect(node.port, node.host, () => {
                        const latency = Date.now() - startTime
                        socket.destroy()
                        resolve(latency)
                    })

                    socket.on('error', (error) => {
                        socket.destroy()
                        reject(error)
                    })

                    socket.setTimeout(5000)
                    socket.on('timeout', () => {
                        socket.destroy()
                        reject(new Error('连接超时'))
                    })
                })
                .then(async (latency) => {
                    node.latency = latency
                    node.lastCheckAt = new Date()
                    node.status = 'active'
                    await node.save()
                })
                .catch(async (error) => {
                    node.latency = null
                    node.lastCheckAt = new Date()
                    node.status = 'error'
                    node.lastError = error.message
                    await node.save()
                })
            } catch (error) {
                console.error(\`检测节点 \${node.name} 失败:\`, error)
            }
        }
    })

    res.json({
        success: true,
        message: '批量检测任务已启动'
    })
})

// 获取节点模板列表
exports.getTemplates = catchAsync(async (req, res) => {
    const templates = await NodeTemplate.findAll({
        order: [['created_at', 'DESC']]
    })

    res.json({
        success: true,
        data: templates
    })
})

// 获取节点模板详情
exports.getTemplate = catchAsync(async (req, res) => {
    const template = await NodeTemplate.findByPk(req.params.id)
    if (!template) {
        throw new AppError('模板不存在', 404)
    }

    res.json({
        success: true,
        data: template
    })
})

// 创建节点模板
exports.createTemplate = catchAsync(async (req, res) => {
    const { name, type, config } = req.body

    // 检查模板名称是否存在
    const existingTemplate = await NodeTemplate.findOne({ where: { name } })
    if (existingTemplate) {
        throw new AppError('模板名称已存在', 400)
    }

    // 创建模板
    const template = await NodeTemplate.create({
        name,
        type,
        config
    })

    res.status(201).json({
        success: true,
        data: template
    })
})

// 更新节点模板
exports.updateTemplate = catchAsync(async (req, res) => {
    const { name, type, config } = req.body

    const template = await NodeTemplate.findByPk(req.params.id)
    if (!template) {
        throw new AppError('模板不存在', 404)
    }

    // 检查模板名称是否被其他模板使用
    if (name && name !== template.name) {
        const existingTemplate = await NodeTemplate.findOne({ where: { name } })
        if (existingTemplate) {
            throw new AppError('模板名称已存在', 400)
        }
    }

    // 更新模板
    Object.assign(template, { name, type, config })
    await template.save()

    res.json({
        success: true,
        data: template
    })
})

// 删除节点模板
exports.deleteTemplate = catchAsync(async (req, res) => {
    const template = await NodeTemplate.findByPk(req.params.id)
    if (!template) {
        throw new AppError('模板不存在', 404)
    }

    await template.destroy()

    res.json({
        success: true,
        message: '模板已删除'
    })
}) 