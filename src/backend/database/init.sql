-- 创建数据库
CREATE DATABASE IF NOT EXISTS nodeconfig CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nodeconfig;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- 节点表
CREATE TABLE IF NOT EXISTS nodes (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('vless', 'socks5') NOT NULL,
    config TEXT NOT NULL,
    template_config TEXT NULL COMMENT '节点模板配置',
    status ENUM('active', 'inactive', 'error') DEFAULT 'active',
    country VARCHAR(2) NOT NULL,
    city VARCHAR(50),
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    purchase_date TIMESTAMP NULL,
    expire_date TIMESTAMP NULL,
    latency INT NULL COMMENT '节点延迟(ms)',
    last_check_at TIMESTAMP NULL,
    bandwidth BIGINT DEFAULT 0 COMMENT '已使用流量(字节)',
    bandwidth_limit BIGINT NULL COMMENT '流量限制(字节)',
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_country (country),
    INDEX idx_type (type),
    INDEX idx_expire (expire_date),
    INDEX idx_host_port (host, port)
) ENGINE=InnoDB;

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    token VARCHAR(36) UNIQUE NOT NULL,
    template_id VARCHAR(36) NULL COMMENT '使用的模板ID',
    status ENUM('active', 'inactive') DEFAULT 'active',
    expire_at TIMESTAMP NULL,
    last_access_at TIMESTAMP NULL,
    last_access_ip VARCHAR(45) NULL,
    access_count INT DEFAULT 0,
    bandwidth BIGINT DEFAULT 0 COMMENT '已使用流量(字节)',
    bandwidth_limit BIGINT NULL COMMENT '流量限制(字节)',
    config JSON NULL COMMENT '订阅配置',
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_status (status),
    INDEX idx_user (user_id),
    INDEX idx_expire (expire_at)
) ENGINE=InnoDB;

-- 订阅节点关联表
CREATE TABLE IF NOT EXISTS subscription_nodes (
    subscription_id VARCHAR(36) NOT NULL,
    node_id VARCHAR(36) NOT NULL,
    status ENUM('active', 'disabled') DEFAULT 'active',
    bandwidth BIGINT DEFAULT 0 COMMENT '该订阅在此节点上的流量使用量(字节)',
    last_access_at TIMESTAMP NULL,
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (subscription_id, node_id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_last_access (last_access_at)
) ENGINE=InnoDB;

-- 节点模板表
CREATE TABLE IF NOT EXISTS node_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('vless', 'socks5') NOT NULL,
    config TEXT NOT NULL,
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- 备份记录表
CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    status ENUM('success', 'failed') DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- 创建初始管理员账户 (密码: admin123)
INSERT INTO users (id, username, password, role, status) VALUES 
(UUID(), 'admin', '$2a$10$YourHashedPasswordHere', 'admin', 'active')
ON DUPLICATE KEY UPDATE role='admin';

-- 创建数据库优化存储过程
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS cleanup_old_data()
BEGIN
    -- 删除过期的订阅
    UPDATE subscriptions SET status = 'inactive'
    WHERE expire_at IS NOT NULL AND expire_at < NOW();

    -- 删除过期的节点
    UPDATE nodes SET status = 'inactive'
    WHERE expire_date IS NOT NULL AND expire_date < NOW();

    -- 删除超过流量限制的订阅
    UPDATE subscriptions SET status = 'inactive'
    WHERE bandwidth_limit IS NOT NULL AND bandwidth >= bandwidth_limit;

    -- 删除30天前的备份记录
    DELETE FROM backups
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END //

DELIMITER ;

-- 创建定时任务
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS cleanup_event
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL cleanup_old_data(); 