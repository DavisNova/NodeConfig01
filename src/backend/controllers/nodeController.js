const Node = require('../models/node');
const logger = require('../utils/logger');
const yaml = require('js-yaml');

class NodeController {
    // 创建节点
    static async create(req, res) {
        try {
            const { 
                name, type, config, country,
                status, purchase_date, expire_date 
            } = req.body;

            // 验证必填字段
            if (!name || !type || !config) {
                return res.status(400).json({
                    error: true,
                    message: '名称、类型和配置为必填项'
                });
            }

            // 验证节点配置格式
            try {
                if (type === 'vless') {
                    if (!config.startsWith('vless://')) {
                        throw new Error('Invalid VLESS config format');
                    }
                } else if (type === 'socks5') {
                    const parts = config.split(':');
                    if (parts.length !== 4) {
                        throw new Error('Invalid SOCKS5 config format');
                    }
                }
            } catch (error) {
                return res.status(400).json({
                    error: true,
                    message: '节点配置格式错误'
                });
            }

            const nodeId = await Node.create({
                name,
                type,
                config,
                country,
                status,
                purchase_date,
                expire_date
            });

            res.status(201).json({
                success: true,
                message: '节点创建成功',
                nodeId
            });
        } catch (error) {
            logger.error('创建节点失败:', error);
            res.status(500).json({
                error: true,
                message: '创建节点失败'
            });
        }
    }

    // 更新节点
    static async update(req, res) {
        try {
            const nodeId = req.params.id;
            const updateData = req.body;

            const success = await Node.update(nodeId, updateData);

            if (success) {
                res.json({
                    success: true,
                    message: '节点更新成功'
                });
            } else {
                res.status(404).json({
                    error: true,
                    message: '节点不存在或更新失败'
                });
            }
        } catch (error) {
            logger.error('更新节点失败:', error);
            res.status(500).json({
                error: true,
                message: '更新节点失败'
            });
        }
    }

    // 获取节点列表
    static async getList(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                type: req.query.type,
                country: req.query.country,
                status: req.query.status,
                search: req.query.search,
                active: req.query.active === 'true'
            };

            const result = await Node.getList(page, limit, filters);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('获取节点列表失败:', error);
            res.status(500).json({
                error: true,
                message: '获取节点列表失败'
            });
        }
    }

    // 获取节点详情
    static async getDetail(req, res) {
        try {
            const nodeId = req.params.id;
            const node = await Node.getById(nodeId);

            if (!node) {
                return res.status(404).json({
                    error: true,
                    message: '节点不存在'
                });
            }

            res.json({
                success: true,
                node
            });
        } catch (error) {
            logger.error('获取节点详情失败:', error);
            res.status(500).json({
                error: true,
                message: '获取节点详情失败'
            });
        }
    }

    // 删除节点
    static async delete(req, res) {
        try {
            const nodeId = req.params.id;
            const success = await Node.delete(nodeId);

            if (success) {
                res.json({
                    success: true,
                    message: '节点删除成功'
                });
            } else {
                res.status(404).json({
                    error: true,
                    message: '节点不存在或删除失败'
                });
            }
        } catch (error) {
            logger.error('删除节点失败:', error);
            res.status(500).json({
                error: true,
                message: '删除节点失败'
            });
        }
    }

    // 批量检查节点状态
    static async checkNodesStatus(req, res) {
        try {
            const { nodeIds } = req.body;

            if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
                return res.status(400).json({
                    error: true,
                    message: '请提供要检查的节点ID列表'
                });
            }

            const nodes = await Node.getByIds(nodeIds);
            const statusMap = {};

            nodes.forEach(node => {
                statusMap[node.id] = {
                    status: node.status,
                    expired: node.expire_date && new Date(node.expire_date) <= new Date()
                };
            });

            res.json({
                success: true,
                statusMap
            });
        } catch (error) {
            logger.error('检查节点状态失败:', error);
            res.status(500).json({
                error: true,
                message: '检查节点状态失败'
            });
        }
    }
}

module.exports = NodeController; 