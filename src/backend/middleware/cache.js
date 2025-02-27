const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});

// 缓存中间件
const cache = (duration) => {
    return async (req, res, next) => {
        // 跳过非 GET 请求
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;
        try {
            const cachedResponse = await redis.get(key);
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // 重写 res.json 方法以缓存响应
            const originalJson = res.json;
            res.json = function(body) {
                redis.setex(key, duration, JSON.stringify(body));
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Cache error:', error);
            next();
        }
    };
};

// 清除缓存中间件
const clearCache = (pattern) => {
    return async (req, res, next) => {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length) {
                await redis.del(keys);
            }
            next();
        } catch (error) {
            console.error('Clear cache error:', error);
            next();
        }
    };
};

module.exports = {
    cache,
    clearCache,
    redis
}; 