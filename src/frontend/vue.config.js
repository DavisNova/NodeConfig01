const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
    // 部署路径
    publicPath: '/',
    
    // 构建输出目录
    outputDir: 'dist',
    
    // 静态资源目录
    assetsDir: 'static',
    
    // 生产环境不生成 sourceMap
    productionSourceMap: false,
    
    // 开发服务器配置
    devServer: {
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    
    // 构建优化配置
    configureWebpack: {
        optimization: {
            splitChunks: {
                chunks: 'all',
                minSize: 20000,
                maxSize: 250000,
                cacheGroups: {
                    vendors: {
                        name: 'chunk-vendors',
                        test: /[\\/]node_modules[\\/]/,
                        priority: -10,
                        chunks: 'initial'
                    },
                    common: {
                        name: 'chunk-common',
                        minChunks: 2,
                        priority: -20,
                        chunks: 'initial',
                        reuseExistingChunk: true
                    }
                }
            }
        },
        performance: {
            hints: false,
            maxEntrypointSize: 512000,
            maxAssetSize: 512000
        }
    },
    
    // CSS 相关配置
    css: {
        extract: process.env.NODE_ENV === 'production',
        sourceMap: false,
        loaderOptions: {
            less: {
                lessOptions: {
                    javascriptEnabled: true
                }
            }
        }
    }
}) 