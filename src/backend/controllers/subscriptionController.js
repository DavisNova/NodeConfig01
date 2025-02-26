const Subscription = require('../models/subscription');
const Node = require('../models/node');
const logger = require('../utils/logger');
const yaml = require('js-yaml');

class SubscriptionController {
    // 创建订阅
    static async create(req, res) {
        try {
            const { name, description, nodes, expire_at } = req.body;
            const user_id = req.user.id;

            // 验证必填字段
            if (!name || !nodes || !Array.isArray(nodes) || nodes.length === 0) {
                return res.status(400).json({
                    error: true,
                    message: '名称和节点列表为必填项'
                });
            }

            // 验证节点有效性
            const validNodes = await Node.validateNodes(nodes);
            if (!validNodes) {
                return res.status(400).json({
                    error: true,
                    message: '包含无效的节点'
                });
            }

            const subscriptionId = await Subscription.create({
                user_id,
                name,
                description,
                nodes,
                expire_at
            });

            res.status(201).json({
                success: true,
                message: '订阅创建成功',
                subscriptionId
            });
        } catch (error) {
            logger.error('创建订阅失败:', error);
            res.status(500).json({
                error: true,
                message: '创建订阅失败'
            });
        }
    }

    // 更新订阅
    static async update(req, res) {
        try {
            const subscriptionId = req.params.id;
            const updateData = req.body;

            // 验证节点有效性
            if (updateData.nodes) {
                const validNodes = await Node.validateNodes(updateData.nodes);
                if (!validNodes) {
                    return res.status(400).json({
                        error: true,
                        message: '包含无效的节点'
                    });
                }
            }

            const success = await Subscription.update(subscriptionId, updateData);

            if (success) {
                res.json({
                    success: true,
                    message: '订阅更新成功'
                });
            } else {
                res.status(404).json({
                    error: true,
                    message: '订阅不存在或更新失败'
                });
            }
        } catch (error) {
            logger.error('更新订阅失败:', error);
            res.status(500).json({
                error: true,
                message: '更新订阅失败'
            });
        }
    }

    // 获取订阅列表
    static async getList(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                user_id: req.user.role === 'admin' ? req.query.user_id : req.user.id,
                status: req.query.status,
                search: req.query.search
            };

            const result = await Subscription.getList(filters, page, limit);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('获取订阅列表失败:', error);
            res.status(500).json({
                error: true,
                message: '获取订阅列表失败'
            });
        }
    }

    // 获取订阅详情
    static async getDetail(req, res) {
        try {
            const subscriptionId = req.params.id;
            const subscription = await Subscription.getById(subscriptionId, true);

            if (!subscription) {
                return res.status(404).json({
                    error: true,
                    message: '订阅不存在'
                });
            }

            // 检查访问权限
            if (req.user.role !== 'admin' && subscription.user_id !== req.user.id) {
                return res.status(403).json({
                    error: true,
                    message: '无权访问此订阅'
                });
            }

            res.json({
                success: true,
                subscription
            });
        } catch (error) {
            logger.error('获取订阅详情失败:', error);
            res.status(500).json({
                error: true,
                message: '获取订阅详情失败'
            });
        }
    }

    // 删除订阅
    static async delete(req, res) {
        try {
            const subscriptionId = req.params.id;
            const success = await Subscription.delete(subscriptionId);

            if (success) {
                res.json({
                    success: true,
                    message: '订阅删除成功'
                });
            } else {
                res.status(404).json({
                    error: true,
                    message: '订阅不存在或删除失败'
                });
            }
        } catch (error) {
            logger.error('删除订阅失败:', error);
            res.status(500).json({
                error: true,
                message: '删除订阅失败'
            });
        }
    }

    // 生成订阅配置
    static async generateConfig(req, res) {
        try {
            const subscriptionId = req.params.id;
            
            // 检查订阅有效性
            const isValid = await Subscription.isValid(subscriptionId);
            if (!isValid) {
                return res.status(400).json({
                    error: true,
                    message: '订阅无效或已过期'
                });
            }

            const subscription = await Subscription.getById(subscriptionId, true);
            
            // 生成配置
            const config = {
                port: 7890,
                socks-port: 7891,
                allow-lan: true,
                mode: "rule",
                log-level: "info",
                external-controller: "127.0.0.1:9090",
                proxies: subscription.nodes.map(node => {
                    if (node.type === 'vless') {
                        return parseVlessConfig(node.config);
                    } else {
                        return parseSocks5Config(node.config);
                    }
                }).filter(Boolean)
            };

            // 添加代理组
            config['proxy-groups'] = generateProxyGroups(config.proxies);

            const yamlConfig = yaml.dump(config);

            res.setHeader('Content-Type', 'text/yaml');
            res.setHeader('Content-Disposition', `attachment; filename=subscription-${subscriptionId}.yaml`);
            res.send(yamlConfig);
        } catch (error) {
            logger.error('生成订阅配置失败:', error);
            res.status(500).json({
                error: true,
                message: '生成订阅配置失败'
            });
        }
    }
}

// 辅助函数：解析 VLESS 配置
function parseVlessConfig(config) {
    try {
        const regex = /vless:\/\/([^@]+)@([^:]+):(\d+)\?(.*)/;
        const match = config.match(regex);
        if (!match) return null;

        const [_, uuid, server, port, params] = match;
        const paramsObj = Object.fromEntries(
            params.split('&').map(p => {
                const [key, value] = p.split('=');
                return [key, decodeURIComponent(value || '')];
            })
        );

        return {
            name: `${server}:${port}`,
            type: 'vless',
            server,
            port: parseInt(port),
            uuid,
            tls: true,
            network: paramsObj.type || 'tcp',
            servername: paramsObj.sni || server,
            'skip-cert-verify': true
        };
    } catch (error) {
        logger.error('解析 VLESS 配置失败:', error);
        return null;
    }
}

// 辅助函数：解析 Socks5 配置
function parseSocks5Config(config) {
    try {
        const [server, port, username, password] = config.split(':');
        return {
            name: `${server}:${port}`,
            type: 'socks5',
            server,
            port: parseInt(port),
            username,
            password,
            'skip-cert-verify': true
        };
    } catch (error) {
        logger.error('解析 Socks5 配置失败:', error);
        return null;
    }
}

// 辅助函数：生成代理组配置
function generateProxyGroups(proxies) {
    const proxyNames = proxies.map(p => p.name);
    return [
        {
            name: '🚀 节点选择',
            type: 'select',
            proxies: ['♻️ 自动选择', '🔯 故障转移', 'DIRECT', ...proxyNames]
        },
        {
            name: '♻️ 自动选择',
            type: 'url-test',
            proxies: proxyNames,
            url: 'http://www.gstatic.com/generate_204',
            interval: 300
        },
        {
            name: '🔯 故障转移',
            type: 'fallback',
            proxies: proxyNames,
            url: 'http://www.gstatic.com/generate_204',
            interval: 300
        }
    ];
}

module.exports = SubscriptionController; 