const express = require('express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const MySQLStore = require('connect-mysql')(session);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const schedule = require('node-schedule');

const app = express();

// 请求日志中间件 - 放在最前面
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 数据库配置优化
const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'nodeconfig',
    password: process.env.DB_PASSWORD || 'nodeconfig123',
    database: process.env.DB_NAME || 'nodeconfig_db',
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    queueLimit: process.env.DB_QUEUE_LIMIT || 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: false,
    timezone: '+00:00',
    charset: 'utf8mb4',
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 优化数据库连接测试函数
async function testDatabaseConnection() {
    let retries = 3;
    while (retries > 0) {
        try {
            const conn = await pool.getConnection();
            await conn.ping();
            console.log('数据库连接成功');
            conn.release();
            return true;
        } catch (error) {
            console.error(`数据库连接失败(剩余重试次数: ${retries - 1}):`, error);
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    return false;
}

// 基础中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求超时设置
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error('请求超时');
        res.status(408).json({ error: true, message: '请求超时' });
    });
    next();
});

// 会话配置
app.use(session({
    store: new MySQLStore({
        config: dbConfig
    }),
    secret: 'nodeconfig-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 静态文件配置优化
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));
app.use(express.static(path.join(__dirname), {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

// 健康检查路由
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin 路由
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// 用户认证中间件
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: true, message: '未登录' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute('SELECT id, username, role FROM users WHERE id = ?', [decoded.id]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: true, message: '用户不存在' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        console.error('认证错误:', error);
        res.status(401).json({ error: true, message: '认证失败' });
    }
};

// 管理员认证中间件
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: true, message: '需要管理员权限' });
    }
    next();
};

// 管理后台 API

// 获取统计数据
app.get('/api/admin/stats', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [subscriptions] = await conn.execute('SELECT COUNT(*) as total FROM subscriptions');
            const [activeUsers] = await conn.execute('SELECT COUNT(DISTINCT username) as total FROM subscriptions WHERE status = "active"');
            const [nodes] = await conn.execute('SELECT COUNT(*) as total FROM nodes');
            const [todayVisits] = await conn.execute(
                'SELECT COUNT(*) as total FROM access_stats WHERE DATE(access_time) = CURDATE()'
            );

            res.json({
                totalSubscriptions: subscriptions[0].total,
                activeUsers: activeUsers[0].total,
                totalNodes: nodes[0].total,
                todayVisits: todayVisits[0].total
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: true, message: '获取统计数据失败' });
    }
});

// 获取订阅列表
app.get('/api/admin/subscriptions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        const offset = (page - 1) * size;
        
        const conn = await pool.getConnection();
        try {
            let query = 'SELECT * FROM subscriptions WHERE 1=1';
            let countQuery = 'SELECT COUNT(*) as total FROM subscriptions WHERE 1=1';
            let params = [];
            
            if (search) {
                query += ` AND (username LIKE '%${search}%' OR description LIKE '%${search}%')`;
                countQuery += ` AND (username LIKE '%${search}%' OR description LIKE '%${search}%')`;
            }
            
            if (status) {
                query += ` AND status = '${status}'`;
                countQuery += ` AND status = '${status}'`;
            }
            
            // 执行计数查询
            const [totalRows] = await conn.query(countQuery);
            
            // 添加分页并执行主查询
            query += ` ORDER BY created_at DESC LIMIT ${size} OFFSET ${offset}`;
            const [subscriptions] = await conn.query(query);
            
            // 格式化日期
            const formattedSubscriptions = subscriptions.map(sub => ({
                ...sub,
                created_at: sub.created_at ? moment(sub.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
                updated_at: sub.updated_at ? moment(sub.updated_at).format('YYYY-MM-DD HH:mm:ss') : null
            }));
            
            res.json({
                subscriptions: formattedSubscriptions,
                total: totalRows[0].total,
                page,
                size
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error getting subscriptions:', error);
        res.status(500).json({ 
            error: true, 
            message: '获取订阅列表失败',
            details: error.message 
        });
    }
});

// 获取订阅详情
app.get('/api/admin/subscriptions/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [subscription] = await conn.execute(
                'SELECT s.*, GROUP_CONCAT(n.node_url) as nodes FROM subscriptions s LEFT JOIN nodes n ON s.id = n.subscription_id WHERE s.id = ? GROUP BY s.id',
                [req.params.id]
            );

            if (subscription.length === 0) {
                return res.status(404).json({ error: true, message: '订阅不存在' });
            }

            // 生成 YAML 配置
            const nodes = subscription[0].nodes ? subscription[0].nodes.split(',') : [];
            const template = yaml.load(fs.readFileSync(path.join(__dirname, 'template.yml'), 'utf8'));
            template.proxies = nodes.map(node => {
                return node.startsWith('vless://') ? parseVlessLink(node) : parseSocks5Link(node);
            }).filter(Boolean);

            subscription[0].yaml_config = yaml.dump(template);

            res.json(subscription[0]);
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error getting subscription details:', error);
        res.status(500).json({ error: true, message: '获取订阅详情失败' });
    }
});

// 编辑订阅
app.put('/api/admin/subscriptions/:id', async (req, res) => {
    try {
        const { username, description, status, nodes } = req.body;
        
        if (!username) {
            return res.status(400).json({
                error: true,
                message: '用户名不能为空'
            });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 更新订阅基本信息
            await conn.execute(
                'UPDATE subscriptions SET username = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [username, description, status, req.params.id]
            );

            // 如果提供了新的节点配置，更新节点
            if (nodes && nodes.length > 0) {
                // 删除旧节点
                await conn.execute('DELETE FROM nodes WHERE subscription_id = ?', [req.params.id]);
                
                // 添加新节点
                for (const node of nodes) {
                    await conn.execute(
                        'INSERT INTO nodes (subscription_id, node_type, node_url) VALUES (?, ?, ?)',
                        [req.params.id, node.startsWith('vless://') ? 'vless' : 'socks5', node]
                    );
                }
            }

            await conn.commit();
            
            res.json({
                success: true,
                message: '订阅更新成功'
            });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({
            error: true,
            message: '更新订阅失败'
        });
    }
});

// 删除订阅
app.delete('/api/admin/subscriptions/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 先删除关联的节点
            await conn.execute('DELETE FROM nodes WHERE subscription_id = ?', [req.params.id]);
            
            // 再删除订阅
            const [result] = await conn.execute('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
            
            await conn.commit();

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: true,
                    message: '订阅不存在'
                });
            }

            res.json({
                success: true,
                message: '订阅删除成功'
            });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({
            error: true,
            message: '删除订阅失败'
        });
    }
});

// 记录访问统计
app.post('/api/admin/access-stats', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            await conn.execute(
                'INSERT INTO access_stats (ip_address, user_agent) VALUES (?, ?)',
                [req.ip, req.headers['user-agent']]
            );
            res.json({ success: true });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error recording access stats:', error);
        res.status(500).json({ error: true });
    }
});

// 解析 vless 链接
function parseVlessLink(link) {
    try {
        const regex = /vless:\/\/([^@]+)@([^:]+):(\d+)\?(.*)/;
        const match = link.match(regex);
        if (!match) {
            console.log('Invalid VLESS link format');
            return null;
        }

        const [_, uuid, server, port, params] = match;
        const paramsObj = Object.fromEntries(
            params.split('&').map(p => {
                const [key, value] = p.split('=');
                return [key, decodeURIComponent(value || '')];
            })
        );

        return {
            name: `vless-${server}-${port}`,
            type: 'vless',
            server,
            port: parseInt(port),
            uuid,
            network: paramsObj.type || 'tcp',
            udp: true,
            tls: true,
            flow: 'xtls-rprx-vision',
            servername: paramsObj.sni || 'yahoo.com',
            'reality-opts': {
                'public-key': paramsObj.pbk || '',
                'short-id': paramsObj.sid || ''
            },
            'client-fingerprint': paramsObj.fp || 'chrome'
        };
    } catch (error) {
        console.error('Error parsing VLESS link:', error);
        return null;
    }
}

// 解析 socks5 链接
function parseSocks5Link(link) {
    try {
        const parts = link.split(':');
        if (parts.length !== 4) {
            console.log('Invalid SOCKS5 link format');
            return null;
        }

        const [server, port, username, password] = parts;
        
        // 验证端口号
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            console.log('Invalid port number');
            return null;
        }

        return {
            name: `socks5-${server}-${port}`,
            type: 'socks5',
            server,
            port: portNum,
            username,
            password,
            'skip-cert-verify': true,
            udp: true
        };
    } catch (error) {
        console.error('Error parsing SOCKS5 link:', error);
        return null;
    }
}

// 检查配置格式
app.post('/api/check', (req, res) => {
    try {
        const { nodes } = req.body;
        const proxies = [];
        const errors = [];
        const template = yaml.load(fs.readFileSync(path.join(__dirname, 'template.yml'), 'utf8'));

        if (!nodes || nodes.length === 0) {
            return res.status(400).json({ 
                error: true, 
                message: '请提供至少一个节点链接' 
            });
        }

        nodes.forEach((node, index) => {
            const trimmedNode = node.trim();
            if (!trimmedNode) return;

            let proxy = null;
            if (trimmedNode.startsWith('vless://')) {
                proxy = parseVlessLink(trimmedNode);
                if (!proxy) {
                    errors.push(`第 ${index + 1} 个 VLESS 节点格式错误`);
                }
            } else if (trimmedNode.includes(':')) {
                proxy = parseSocks5Link(trimmedNode);
                if (!proxy) {
                    errors.push(`第 ${index + 1} 个 SOCKS5 节点格式错误`);
                }
            } else {
                errors.push(`第 ${index + 1} 个节点格式无法识别`);
            }

            if (proxy) {
                proxies.push(proxy);
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({
                error: true,
                message: errors.join('\n')
            });
        }

        // 更新配置
        template.proxies = proxies;
        
        // 更新代理组
        updateProxyGroups(template, proxies);

        // 生成 YAML 字符串
        const yamlStr = yaml.dump(template, {
            lineWidth: -1,
            noRefs: true
        });

        res.json({
            error: false,
            message: '配置格式正确',
            yaml: yamlStr
        });

    } catch (error) {
        console.error('Error checking config:', error);
        res.status(500).json({ 
            error: true, 
            message: '检查配置时发生错误' 
        });
    }
});

// 生成配置文件
app.post('/api/generate', (req, res) => {
    try {
        const { nodes } = req.body;
        
        if (!nodes || nodes.length === 0) {
            return res.status(400).json({ 
                error: true, 
                message: '请提供至少一个节点链接' 
            });
        }

        const proxies = [];
        const errors = [];
        const template = yaml.load(fs.readFileSync(path.join(__dirname, 'template.yml'), 'utf8'));

        nodes.forEach((node, index) => {
            const trimmedNode = node.trim();
            if (!trimmedNode) return;

            let proxy = null;
            if (trimmedNode.startsWith('vless://')) {
                proxy = parseVlessLink(trimmedNode);
                if (!proxy) {
                    errors.push(`第 ${index + 1} 个 VLESS 节点格式错误`);
                }
            } else if (trimmedNode.includes(':')) {
                proxy = parseSocks5Link(trimmedNode);
                if (!proxy) {
                    errors.push(`第 ${index + 1} 个 SOCKS5 节点格式错误`);
                }
            } else {
                errors.push(`第 ${index + 1} 个节点格式无法识别`);
            }

            if (proxy) {
                proxies.push(proxy);
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({
                error: true,
                message: errors.join('\n')
            });
        }

        // 更新配置
        template.proxies = proxies;
        
        // 更新代理组
        updateProxyGroups(template, proxies);

        // 生成 YAML 字符串
        const yamlStr = yaml.dump(template, {
            lineWidth: -1,
            noRefs: true
        });

        // 发送响应
        res.setHeader('Content-Type', 'application/yaml');
        res.setHeader('Content-Disposition', 'attachment; filename=config.yaml');
        res.send(yamlStr);

    } catch (error) {
        console.error('Error generating config:', error);
        res.status(500).json({ 
            error: true, 
            message: '生成配置文件时发生错误' 
        });
    }
});

// 保存配置
app.post('/api/save', async (req, res) => {
    try {
        const { username, description, nodes } = req.body;
        
        if (!username || !nodes || nodes.length === 0) {
            return res.status(400).json({
                error: true,
                message: '请提供用户名和节点配置'
            });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 生成订阅ID
            const subscriptionId = uuidv4();
            const subscriptionUrl = `${req.protocol}://${req.get('host')}/subscribe/${subscriptionId}`;
            
            // 生成二维码
            const qrcodeDataUrl = await QRCode.toDataURL(subscriptionUrl);

            // 保存订阅信息
            const [result] = await conn.execute(
                'INSERT INTO subscriptions (username, description, node_config, subscription_url, qrcode_url) VALUES (?, ?, ?, ?, ?)',
                [username, description, JSON.stringify(nodes), subscriptionUrl, qrcodeDataUrl]
            );

            // 保存节点信息
            for (const node of nodes) {
                await conn.execute(
                    'INSERT INTO nodes (subscription_id, node_type, node_url) VALUES (?, ?, ?)',
                    [result.insertId, node.startsWith('vless://') ? 'vless' : 'socks5', node]
                );
            }

            await conn.commit();

            // 记录操作日志
            await conn.execute(
                    'INSERT INTO operation_logs (action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?)',
                    ['create_subscription', 'subscription', result.insertId, '创建新订阅', req.ip]
                );

            res.json({
                success: true,
                subscriptionUrl,
                qrcodeUrl: qrcodeDataUrl
            });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({
            error: true,
            message: '保存配置时发生错误'
        });
    }
});

// 获取订阅配置
app.get('/subscribe/:id', async (req, res) => {
    try {
        console.log('订阅请求参数:', req.params.id);
        
        const [rows] = await pool.execute(
            'SELECT * FROM subscriptions WHERE subscription_url LIKE ?',
            [`%${req.params.id}%`]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: true,
                message: '订阅不存在'
            });
        }

        const nodes = JSON.parse(rows[0].node_config);
        const template = yaml.load(fs.readFileSync(path.join(__dirname, 'template.yml'), 'utf8'));
        
        template.proxies = nodes.map(node => {
            return node.startsWith('vless://') ? 
                parseVlessLink(node) : 
                parseSocks5Link(node);
        }).filter(Boolean);

        updateProxyGroups(template, template.proxies);

        const yamlStr = yaml.dump(template, {
            lineWidth: -1,
            noRefs: true
        });

        // 修改这里的访问统计记录
        try {
            await pool.execute(
                'INSERT INTO access_stats (subscription_id, ip_address, user_agent) VALUES (?, ?, ?)',
                [rows[0].id || null, req.ip || null, req.headers['user-agent'] || null]
            );
        } catch (statError) {
            console.error('记录访问统计失败:', statError);
            // 继续处理，不影响订阅返回
        }

        res.setHeader('Content-Type', 'application/yaml');
        res.setHeader('Content-Disposition', 'attachment; filename=config.yaml');
        res.send(yamlStr);

    } catch (error) {
        console.error('订阅处理错误:', error);
        res.status(500).json({
            error: true,
            message: '获取订阅配置时发生错误',
            details: error.message
        });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: true, message: '用户名或密码错误' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: true, message: '用户名或密码错误' });
        }

        // 更新最后登录时间和IP
        await pool.execute(
            'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
            [req.ip, user.id]
        );

        // 生成 JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24小时
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: true, message: '登录失败' });
    }
});

// 获取用户订阅列表
app.get('/api/user/subscriptions', authMiddleware, async (req, res) => {
    try {
        const [subscriptions] = await pool.execute(`
            SELECT s.*, 
                   COUNT(DISTINCT sn.node_id) as node_count,
                   GROUP_CONCAT(DISTINCT n.country) as countries
            FROM subscriptions s
            LEFT JOIN subscription_nodes sn ON s.id = sn.subscription_id
            LEFT JOIN nodes n ON sn.node_id = n.id
            WHERE s.user_id = ?
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `, [req.user.id]);

        res.json({ subscriptions });
    } catch (error) {
        console.error('获取订阅列表错误:', error);
        res.status(500).json({ error: true, message: '获取订阅列表失败' });
    }
});

// 获取节点列表
app.get('/api/admin/nodes', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [nodes] = await conn.execute(`
                SELECT n.*, 
                       COUNT(DISTINCT sn.subscription_id) as subscription_count,
                       GROUP_CONCAT(DISTINCT s.username) as subscribed_users
                FROM nodes n
                LEFT JOIN subscription_nodes sn ON n.id = sn.node_id
                LEFT JOIN subscriptions s ON sn.subscription_id = s.id
                GROUP BY n.id
                ORDER BY n.created_at DESC
            `);

            res.json({ nodes: nodes.map(node => ({
                ...node,
                created_at: moment(node.created_at).format('YYYY-MM-DD HH:mm:ss'),
                updated_at: node.updated_at ? moment(node.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
                purchase_date: node.purchase_date ? moment(node.purchase_date).format('YYYY-MM-DD') : null,
                expire_date: node.expire_date ? moment(node.expire_date).format('YYYY-MM-DD') : null
            }))});
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('获取节点列表失败:', error);
        res.status(500).json({ error: true, message: '获取节点列表失败', details: error.message });
    }
});

// 获取节点详情
app.get('/api/admin/nodes/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [nodes] = await conn.execute('SELECT * FROM nodes WHERE id = ?', [req.params.id]);
            
            if (nodes.length === 0) {
                return res.status(404).json({ error: true, message: '节点不存在' });
            }

            const node = nodes[0];
            node.created_at = moment(node.created_at).format('YYYY-MM-DD HH:mm:ss');
            node.updated_at = node.updated_at ? moment(node.updated_at).format('YYYY-MM-DD HH:mm:ss') : null;
            node.purchase_date = node.purchase_date ? moment(node.purchase_date).format('YYYY-MM-DD') : null;
            node.expire_date = node.expire_date ? moment(node.expire_date).format('YYYY-MM-DD') : null;

            res.json(node);
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('获取节点详情失败:', error);
        res.status(500).json({ error: true, message: '获取节点详情失败', details: error.message });
    }
});

// 创建节点
app.post('/api/admin/nodes', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            name,
            type,
            config,
            country,
            city,
            purchase_date,
            expire_date,
            remark
        } = req.body;

        if (!name || !type || !config || !country) {
            return res.status(400).json({ error: true, message: '缺少必要参数' });
        }

        const conn = await pool.getConnection();
        try {
            const [result] = await conn.execute(`
                INSERT INTO nodes (
                    name, type, config, country, city, 
                    purchase_date, expire_date, remark, 
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
            `, [
                name, type, config, country, city || null,
                purchase_date || null, expire_date || null, remark || null
            ]);

            res.json({ 
                success: true, 
                message: '节点创建成功',
                node_id: result.insertId 
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('创建节点失败:', error);
        res.status(500).json({ error: true, message: '创建节点失败', details: error.message });
    }
});

// 更新节点
app.put('/api/admin/nodes/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            name,
            type,
            config,
            country,
            city,
            purchase_date,
            expire_date,
            remark,
            status
        } = req.body;

        if (!name || !type || !config || !country) {
            return res.status(400).json({ error: true, message: '缺少必要参数' });
        }

        const conn = await pool.getConnection();
        try {
            const [result] = await conn.execute(`
                UPDATE nodes 
                SET name = ?, type = ?, config = ?, country = ?, 
                    city = ?, purchase_date = ?, expire_date = ?, 
                    remark = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            `, [
                name, type, config, country,
                city || null, purchase_date || null, expire_date || null,
                remark || null, status || 'active', req.params.id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: true, message: '节点不存在' });
            }

            res.json({ success: true, message: '节点更新成功' });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('更新节点失败:', error);
        res.status(500).json({ error: true, message: '更新节点失败', details: error.message });
    }
});

// 删除节点
app.delete('/api/admin/nodes/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            // 开启事务
            await conn.beginTransaction();

            // 先删除节点与订阅的关联
            await conn.execute('DELETE FROM subscription_nodes WHERE node_id = ?', [req.params.id]);
            
            // 再删除节点
            const [result] = await conn.execute('DELETE FROM nodes WHERE id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ error: true, message: '节点不存在' });
            }

            // 提交事务
            await conn.commit();
            res.json({ success: true, message: '节点删除成功' });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('删除节点失败:', error);
        res.status(500).json({ error: true, message: '删除节点失败', details: error.message });
    }
});

// 用户管理 API

// 获取用户列表
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [users] = await conn.execute(`
                SELECT u.id, u.username, u.email, u.role, u.status,
                       u.last_login, u.created_at, u.updated_at,
                       COUNT(DISTINCT s.id) as subscription_count,
                       SUM(s.bandwidth_used) as total_bandwidth_used
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id
                GROUP BY u.id
                ORDER BY u.created_at DESC
            `);

            res.json({
                users: users.map(user => ({
                    ...user,
                    last_login: user.last_login ? moment(user.last_login).format('YYYY-MM-DD HH:mm:ss') : null,
                    created_at: moment(user.created_at).format('YYYY-MM-DD HH:mm:ss'),
                    updated_at: user.updated_at ? moment(user.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
                    total_bandwidth_used: user.total_bandwidth_used ? Math.round(user.total_bandwidth_used / (1024 * 1024 * 1024)) : 0 // 转换为GB
                }))
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ error: true, message: '获取用户列表失败', details: error.message });
    }
});

// 获取用户详情
app.get('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [users] = await conn.execute(`
                SELECT u.*, 
                       COUNT(DISTINCT s.id) as subscription_count,
                       GROUP_CONCAT(DISTINCT s.id) as subscription_ids
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id
                WHERE u.id = ?
                GROUP BY u.id
            `, [req.params.id]);

            if (users.length === 0) {
                return res.status(404).json({ error: true, message: '用户不存在' });
            }

            const user = users[0];
            delete user.password; // 删除密码字段

            // 格式化日期
            user.last_login = user.last_login ? moment(user.last_login).format('YYYY-MM-DD HH:mm:ss') : null;
            user.created_at = moment(user.created_at).format('YYYY-MM-DD HH:mm:ss');
            user.updated_at = user.updated_at ? moment(user.updated_at).format('YYYY-MM-DD HH:mm:ss') : null;

            res.json(user);
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('获取用户详情失败:', error);
        res.status(500).json({ error: true, message: '获取用户详情失败', details: error.message });
    }
});

// 创建用户
app.post('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            role = 'user',
            status = 'active'
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: true, message: '缺少必要参数' });
        }

        const conn = await pool.getConnection();
        try {
            // 检查用户名是否已存在
            const [existingUsers] = await conn.execute(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ error: true, message: '用户名或邮箱已存在' });
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);

            // 创建用户
            const [result] = await conn.execute(`
                INSERT INTO users (
                    username, email, password, role, status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            `, [username, email, hashedPassword, role, status]);

            res.json({
                success: true,
                message: '用户创建成功',
                user_id: result.insertId
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ error: true, message: '创建用户失败', details: error.message });
    }
});

// 更新用户
app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            email,
            password,
            role,
            status
        } = req.body;

        const conn = await pool.getConnection();
        try {
            // 检查用户是否存在
            const [users] = await conn.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
            
            if (users.length === 0) {
                return res.status(404).json({ error: true, message: '用户不存在' });
            }

            // 构建更新语句
            let updateFields = [];
            let updateValues = [];

            if (email) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                updateFields.push('password = ?');
                updateValues.push(hashedPassword);
            }

            if (role) {
                updateFields.push('role = ?');
                updateValues.push(role);
            }

            if (status) {
                updateFields.push('status = ?');
                updateValues.push(status);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({ error: true, message: '没有需要更新的字段' });
            }

            updateFields.push('updated_at = NOW()');
            updateValues.push(req.params.id);

            const [result] = await conn.execute(`
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: true, message: '用户不存在' });
            }

            res.json({ success: true, message: '用户更新成功' });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('更新用户失败:', error);
        res.status(500).json({ error: true, message: '更新用户失败', details: error.message });
    }
});

// 删除用户
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            // 开启事务
            await conn.beginTransaction();

            // 检查是否为最后一个管理员
            const [adminCount] = await conn.execute(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
            );
            const [targetUser] = await conn.execute(
                'SELECT role FROM users WHERE id = ?',
                [req.params.id]
            );

            if (adminCount[0].count === 1 && targetUser[0]?.role === 'admin') {
                await conn.rollback();
                return res.status(400).json({ error: true, message: '不能删除最后一个管理员' });
            }

            // 删除用户的订阅节点关联
            await conn.execute(`
                DELETE sn FROM subscription_nodes sn
                INNER JOIN subscriptions s ON sn.subscription_id = s.id
                WHERE s.user_id = ?
            `, [req.params.id]);

            // 删除用户的订阅
            await conn.execute('DELETE FROM subscriptions WHERE user_id = ?', [req.params.id]);

            // 删除用户
            const [result] = await conn.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ error: true, message: '用户不存在' });
            }

            // 提交事务
            await conn.commit();
            res.json({ success: true, message: '用户删除成功' });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ error: true, message: '删除用户失败', details: error.message });
    }
});

// 模板管理 API

// 获取模板列表
app.get('/api/admin/templates', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [templates] = await conn.execute(`
                SELECT t.*, 
                       COUNT(DISTINCT n.id) as node_count
                FROM node_templates t
                LEFT JOIN nodes n ON t.id = n.template_id
                GROUP BY t.id
                ORDER BY t.created_at DESC
            `);

            res.json({
                templates: templates.map(template => ({
                    ...template,
                    created_at: moment(template.created_at).format('YYYY-MM-DD HH:mm:ss'),
                    updated_at: template.updated_at ? moment(template.updated_at).format('YYYY-MM-DD HH:mm:ss') : null
                }))
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('获取模板列表失败:', error);
        res.status(500).json({ error: true, message: '获取模板列表失败', details: error.message });
    }
});

// 获取模板详情
app.get('/api/admin/templates/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            const [templates] = await conn.execute(`
                SELECT t.*, 
                       COUNT(DISTINCT n.id) as node_count,
                       GROUP_CONCAT(DISTINCT n.id) as node_ids
                FROM node_templates t
                LEFT JOIN nodes n ON t.id = n.template_id
                WHERE t.id = ?
                GROUP BY t.id
            `, [req.params.id]);

            if (templates.length === 0) {
                return res.status(404).json({ error: true, message: '模板不存在' });
            }

            const template = templates[0];
            template.created_at = moment(template.created_at).format('YYYY-MM-DD HH:mm:ss');
            template.updated_at = template.updated_at ? moment(template.updated_at).format('YYYY-MM-DD HH:mm:ss') : null;

            res.json(template);
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('获取模板详情失败:', error);
        res.status(500).json({ error: true, message: '获取模板详情失败', details: error.message });
    }
});

// 创建模板
app.post('/api/admin/templates', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            name,
            type,
            config,
            description
        } = req.body;

        if (!name || !type || !config) {
            return res.status(400).json({ error: true, message: '缺少必要参数' });
        }

        const conn = await pool.getConnection();
        try {
            // 检查模板名称是否已存在
            const [existingTemplates] = await conn.execute(
                'SELECT id FROM node_templates WHERE name = ?',
                [name]
            );

            if (existingTemplates.length > 0) {
                return res.status(400).json({ error: true, message: '模板名称已存在' });
            }

            // 创建模板
            const [result] = await conn.execute(`
                INSERT INTO node_templates (
                    name, type, config, description,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, NOW(), NOW())
            `, [name, type, config, description || null]);

            res.json({
                success: true,
                message: '模板创建成功',
                template_id: result.insertId
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('创建模板失败:', error);
        res.status(500).json({ error: true, message: '创建模板失败', details: error.message });
    }
});

// 更新模板
app.put('/api/admin/templates/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            name,
            type,
            config,
            description
        } = req.body;

        if (!name || !type || !config) {
            return res.status(400).json({ error: true, message: '缺少必要参数' });
        }

        const conn = await pool.getConnection();
        try {
            // 检查模板是否存在
            const [templates] = await conn.execute(
                'SELECT id FROM node_templates WHERE id = ?',
                [req.params.id]
            );

            if (templates.length === 0) {
                return res.status(404).json({ error: true, message: '模板不存在' });
            }

            // 检查名称是否与其他模板重复
            const [existingTemplates] = await conn.execute(
                'SELECT id FROM node_templates WHERE name = ? AND id != ?',
                [name, req.params.id]
            );

            if (existingTemplates.length > 0) {
                return res.status(400).json({ error: true, message: '模板名称已存在' });
            }

            // 更新模板
            const [result] = await conn.execute(`
                UPDATE node_templates 
                SET name = ?, type = ?, config = ?, 
                    description = ?, updated_at = NOW()
                WHERE id = ?
            `, [name, type, config, description || null, req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: true, message: '模板不存在' });
            }

            res.json({ success: true, message: '模板更新成功' });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('更新模板失败:', error);
        res.status(500).json({ error: true, message: '更新模板失败', details: error.message });
    }
});

// 删除模板
app.delete('/api/admin/templates/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            // 开启事务
            await conn.beginTransaction();

            // 检查模板是否被节点使用
            const [nodes] = await conn.execute(
                'SELECT COUNT(*) as count FROM nodes WHERE template_id = ?',
                [req.params.id]
            );

            if (nodes[0].count > 0) {
                await conn.rollback();
                return res.status(400).json({ 
                    error: true, 
                    message: '模板正在被节点使用,无法删除',
                    node_count: nodes[0].count
                });
            }

            // 删除模板
            const [result] = await conn.execute(
                'DELETE FROM node_templates WHERE id = ?',
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ error: true, message: '模板不存在' });
            }

            // 提交事务
            await conn.commit();
            res.json({ success: true, message: '模板删除成功' });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('删除模板失败:', error);
        res.status(500).json({ error: true, message: '删除模板失败', details: error.message });
    }
});

// 优化错误处理中间件
app.use((err, req, res, next) => {
    const errorId = uuidv4();
    console.error(`Error ID: ${errorId}`);
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('URL:', req.url);
    console.error('Method:', req.method);
    console.error('Headers:', req.headers);
    console.error('Body:', req.body);
    
    // 记录错误到数据库
    pool.execute(
        'INSERT INTO error_logs (error_id, error_message, error_stack, request_url, request_method, request_headers, request_body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [errorId, err.message, err.stack, req.url, req.method, JSON.stringify(req.headers), JSON.stringify(req.body)]
    ).catch(logError => {
        console.error('Error logging failed:', logError);
    });
    
    res.status(err.status || 500).json({
        error: true,
        message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
        code: err.code || 'INTERNAL_ERROR',
        errorId: errorId
    });
});

// 优化 404 处理
app.use((req, res) => {
    const errorId = uuidv4();
    console.log(`404 Not Found (ID: ${errorId}):`, req.url);
    
    // 记录 404 错误
    pool.execute(
        'INSERT INTO error_logs (error_id, error_message, request_url, request_method, request_headers, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [errorId, '404 Not Found', req.url, req.method, JSON.stringify(req.headers)]
    ).catch(logError => {
        console.error('Error logging failed:', logError);
    });
    
    res.status(404).json({
        error: true,
        message: '页面不存在',
        path: req.url,
        errorId: errorId
    });
});

// 更新代理组配置
function updateProxyGroups(template, proxies) {
    if (!Array.isArray(proxies)) {
        console.error('Invalid proxies input');
        proxies = [];
    }

    // 获取所有代理名称
    const proxyNames = proxies.map(proxy => proxy.name);
    
    // 确保至少有一个代理
    if (proxyNames.length === 0) {
        proxyNames.push('DIRECT');
    }

    // 删除旧的代理组配置
    delete template.proxy_groups;  // 删除下划线版本
    delete template['proxy-groups'];  // 删除横线版本

    // 统一使用 proxy-groups 格式
    template['proxy-groups'] = [
        {
            name: '🚀 节点选择',
            type: 'select',
            proxies: ['♻️ 自动选择', '🔯 故障转移', 'DIRECT', ...proxyNames]
        },
        {
            name: '♻️ 自动选择',
            type: 'url-test',
            proxies: [...proxyNames],
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            tolerance: 50
        },
        {
            name: '🔯 故障转移',
            type: 'fallback',
            proxies: [...proxyNames],
            url: 'http://www.gstatic.com/generate_204',
            interval: 300
        },
        {
            name: '🌍 国外媒体',
            type: 'select',
            proxies: ['🚀 节点选择', '♻️ 自动选择', '🎯 全球直连']
        },
        {
            name: '📲 电报信息',
            type: 'select',
            proxies: ['🚀 节点选择', '🎯 全球直连']
        },
        {
            name: 'Ⓜ️ 微软服务',
            type: 'select',
            proxies: ['🎯 全球直连', '🚀 节点选择']
        },
        {
            name: '🍎 苹果服务',
            type: 'select',
            proxies: ['🎯 全球直连', '🚀 节点选择']
        },
        {
            name: '🎯 全球直连',
            type: 'select',
            proxies: ['DIRECT', '🚀 节点选择']
        },
        {
            name: '🛑 全球拦截',
            type: 'select',
            proxies: ['REJECT', 'DIRECT']
        }
    ];
}

// 数据库备份功能
const BACKUP_DIR = process.env.BACKUP_DIR || '/opt/nodeconfig-backup';

// 执行备份
async function backupDatabase() {
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `nodeconfig_db_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 构建备份命令
    const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > ${backupPath}`;
    
    try {
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve();
            });
        });

        console.log(`数据库备份成功: ${backupPath}`);

        // 删除30天前的备份
        const oldBackups = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.sql'))
            .map(file => path.join(BACKUP_DIR, file));

        for (const backup of oldBackups) {
            const stats = fs.statSync(backup);
            const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysOld > 30) {
                fs.unlinkSync(backup);
                console.log(`删除过期备份: ${backup}`);
            }
        }
    } catch (error) {
        console.error('数据库备份失败:', error);
    }
}

// 每天凌晨3点执行备份
schedule.scheduleJob('0 3 * * *', backupDatabase);

// 启动服务器
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        // 等待数据库连接
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.error('无法连接到数据库，服务启动失败');
            process.exit(1);
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`服务器运行在端口 ${PORT}`);
        });
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

startServer();
