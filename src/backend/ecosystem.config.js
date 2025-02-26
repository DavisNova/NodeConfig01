module.exports = {
    apps: [{
        name: 'nodeconfig',
        script: 'app.js',
        instances: 'max',
        exec_mode: 'cluster',
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        // 性能优化配置
        node_args: '--max-old-space-size=2048',
        // 错误处理
        error_file: '/opt/nodeconfig/logs/error.log',
        out_file: '/opt/nodeconfig/logs/out.log',
        merge_logs: true,
        // 优雅重启
        kill_timeout: 3000,
        wait_ready: true,
        // 自动重启
        max_restarts: 10,
        restart_delay: 4000,
        // 监控配置
        exp_backoff_restart_delay: 100,
        // 性能监控
        trace: true,
        // 日志配置
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        // 集群配置
        increment_var: 'PORT',
        instance_var: 'INSTANCE_ID'
    }]
} 