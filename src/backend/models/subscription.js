const { DataTypes } = require('sequelize')
const { sequelize } = require('../utils/db')
const config = require('../config')

const Subscription = sequelize.define('Subscription', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 50]
        }
    },
    token: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    expireAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastAccessAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastAccessIp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    accessCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
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
    nodeLimit: {
        type: DataTypes.INTEGER,
        defaultValue: () => config.subscription.maxNodes,
        validate: {
            min: 1,
            max: 1000
        }
    },
    config: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: '订阅配置'
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['userId']
        },
        {
            fields: ['token']
        },
        {
            fields: ['status']
        }
    ]
})

// 实例方法
Subscription.prototype.isExpired = function() {
    if (!this.expireAt) return false
    return new Date() > this.expireAt
}

Subscription.prototype.isOverLimit = function() {
    if (!this.bandwidthLimit) return false
    return this.bandwidth >= this.bandwidthLimit
}

Subscription.prototype.canAddNode = async function() {
    const count = await this.countNodes()
    return count < this.nodeLimit
}

Subscription.prototype.recordAccess = function(ip) {
    this.lastAccessAt = new Date()
    this.lastAccessIp = ip
    this.accessCount += 1
    return this.save()
}

Subscription.prototype.addBandwidth = function(bytes) {
    this.bandwidth += bytes
    if (this.isOverLimit()) {
        this.status = 'inactive'
    }
    return this.save()
}

Subscription.prototype.generateConfig = async function() {
    const nodes = await this.getNodes({
        where: {
            status: 'active'
        },
        attributes: {
            include: ['config']
        }
    })

    // 根据订阅配置生成最终的配置文件
    const config = {
        version: 1,
        nodes: nodes.map(node => ({
            ...JSON.parse(node.config),
            name: node.name,
            type: node.type
        })),
        ...this.config
    }

    return config
}

// 关联关系
Subscription.associate = (models) => {
    Subscription.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
    })
    
    Subscription.belongsToMany(models.Node, {
        through: 'SubscriptionNodes',
        foreignKey: 'subscriptionId',
        as: 'nodes'
    })
}

// 钩子
Subscription.addHook('beforeSave', async (subscription) => {
    // 检查过期状态
    if (subscription.expireAt && subscription.expireAt < new Date()) {
        subscription.status = 'inactive'
    }
    // 检查流量限制
    if (subscription.bandwidthLimit && subscription.bandwidth >= subscription.bandwidthLimit) {
        subscription.status = 'inactive'
    }
})

module.exports = Subscription 