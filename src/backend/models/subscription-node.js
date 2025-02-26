const { DataTypes } = require('sequelize')
const { sequelize } = require('../utils/db')

const SubscriptionNode = sequelize.define('SubscriptionNode', {
    subscriptionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Subscriptions',
            key: 'id'
        },
        primaryKey: true
    },
    nodeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Nodes',
            key: 'id'
        },
        primaryKey: true
    },
    bandwidth: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        comment: '该订阅在此节点上的流量使用量(字节)'
    },
    lastAccessAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'disabled'),
        defaultValue: 'active'
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['subscriptionId']
        },
        {
            fields: ['nodeId']
        }
    ]
})

// 实例方法
SubscriptionNode.prototype.addBandwidth = function(bytes) {
    this.bandwidth += bytes
    this.lastAccessAt = new Date()
    return this.save()
}

module.exports = SubscriptionNode 