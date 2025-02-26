const { DataTypes } = require('sequelize')
const { sequelize } = require('../utils/db')

const Node = sequelize.define('Node', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 50]
        }
    },
    type: {
        type: DataTypes.ENUM('vless', 'socks5'),
        allowNull: false
    },
    config: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'error'),
        defaultValue: 'active'
    },
    country: {
        type: DataTypes.STRING(2),
        allowNull: false,
        validate: {
            isIn: [['CN', 'HK', 'TW', 'JP', 'KR', 'SG', 'US']]
        }
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    host: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIP: true
        }
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 65535
        }
    },
    latency: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    lastCheckAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastErrorAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    expireDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    bandwidth: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        comment: '已使用流量(字节)'
    },
    bandwidthLimit: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '流量限制(字节)'
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['country']
        },
        {
            fields: ['type']
        }
    ]
})

// 实例方法
Node.prototype.toJSON = function() {
    const values = { ...this.get() }
    // 删除敏感信息
    delete values.config
    return values
}

Node.prototype.isExpired = function() {
    if (!this.expireDate) return false
    return new Date() > this.expireDate
}

Node.prototype.isOverLimit = function() {
    if (!this.bandwidthLimit) return false
    return this.bandwidth >= this.bandwidthLimit
}

Node.prototype.updateLatency = function(latency) {
    this.latency = latency
    this.lastCheckAt = new Date()
    if (this.status === 'error') {
        this.status = 'active'
    }
    return this.save()
}

Node.prototype.markError = function(error) {
    this.status = 'error'
    this.lastErrorAt = new Date()
    this.lastError = error.message || String(error)
    return this.save()
}

// 关联关系
Node.associate = (models) => {
    Node.belongsToMany(models.Subscription, {
        through: 'SubscriptionNodes',
        foreignKey: 'nodeId',
        as: 'subscriptions'
    })
}

// 钩子
Node.addHook('beforeSave', async (node) => {
    // 检查过期状态
    if (node.expireDate && node.expireDate < new Date()) {
        node.status = 'inactive'
    }
    // 检查流量限制
    if (node.bandwidthLimit && node.bandwidth >= node.bandwidthLimit) {
        node.status = 'inactive'
    }
})

module.exports = Node 