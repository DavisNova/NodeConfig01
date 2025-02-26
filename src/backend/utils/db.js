const { Sequelize } = require('sequelize')
const config = require('../config')

const sequelize = new Sequelize({
    ...config.database,
    logging: config.nodeEnv === 'development' ? console.log : false,
    define: {
        timestamps: true,
        underscored: true
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
})

const connectDB = async () => {
    try {
        await sequelize.authenticate()
        console.log('Database connection has been established successfully.')
        
        // 同步所有模型
        if (config.nodeEnv === 'development') {
            await sequelize.sync({ alter: true })
            console.log('Database models synchronized.')
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error)
        process.exit(1)
    }
}

module.exports = {
    sequelize,
    connectDB
} 