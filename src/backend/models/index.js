const User = require('./user')
const Node = require('./node')
const Subscription = require('./subscription')
const SubscriptionNode = require('./subscription-node')

// 建立模型关联关系
const setupAssociations = () => {
    // User - Subscription (一对多)
    User.hasMany(Subscription, {
        foreignKey: 'userId',
        as: 'subscriptions'
    })
    Subscription.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user'
    })

    // Subscription - Node (多对多)
    Subscription.belongsToMany(Node, {
        through: SubscriptionNode,
        foreignKey: 'subscriptionId',
        otherKey: 'nodeId',
        as: 'nodes'
    })
    Node.belongsToMany(Subscription, {
        through: SubscriptionNode,
        foreignKey: 'nodeId',
        otherKey: 'subscriptionId',
        as: 'subscriptions'
    })
}

setupAssociations()

module.exports = {
    User,
    Node,
    Subscription,
    SubscriptionNode
} 