-- ============================================================
-- eGlobe Review Management System
-- MySQL Database Schema  — Migration 001: Initial Schema
-- ============================================================
-- Run this file against a fresh MySQL 8.0+ database.
-- Usage:
--   mysql -u root -p eglobe_reviews < 001_initial_schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_ALL_TABLES';
SET time_zone = '+00:00';

-- ============================================================
-- Users
-- ============================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id`         VARCHAR(36)  NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `password`   VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `role`       ENUM('ADMIN','MANAGER','VIEWER') NOT NULL DEFAULT 'ADMIN',
  `avatar`     VARCHAR(500)  NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `last_login` DATETIME      NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE  KEY `uq_users_email`   (`email`),
  KEY     `idx_users_role`       (`role`),
  KEY     `idx_users_is_active`  (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform admin users';

-- ============================================================
-- Settings  (one row per logical section)
-- ============================================================

CREATE TABLE IF NOT EXISTS `settings` (
  `id`         VARCHAR(36)  NOT NULL,
  `section`    VARCHAR(100) NOT NULL COMMENT 'google | openai | email | business | notifications',
  `data`       JSON         NOT NULL COMMENT 'Section-specific configuration blob',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE  KEY `uq_settings_section` (`section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='All application settings stored as JSON per section';

-- ============================================================
-- Google OAuth Credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS `google_auth` (
  `id`            VARCHAR(36)  NOT NULL,
  `access_token`  TEXT          NULL COMMENT 'Encrypted OAuth access token',
  `refresh_token` TEXT          NULL COMMENT 'Encrypted OAuth refresh token',
  `expires_at`    DATETIME      NULL,
  `is_connected`  TINYINT(1)   NOT NULL DEFAULT 0,
  `place_id`      VARCHAR(255)  NULL COMMENT 'Google Maps Place ID',
  `account_id`    VARCHAR(255)  NULL COMMENT 'accounts/xxxxx',
  `location_id`   VARCHAR(255)  NULL COMMENT 'locations/xxxxx',
  `account_name`  VARCHAR(255)  NULL,
  `location_name` VARCHAR(255)  NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Google Business Profile OAuth credentials';

-- ============================================================
-- Reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS `reviews` (
  `id`                VARCHAR(36)  NOT NULL,
  `google_review_id`  VARCHAR(255) NOT NULL COMMENT 'Unique ID from Google',
  `reviewer_name`     VARCHAR(255) NOT NULL,
  `reviewer_photo_url` VARCHAR(500) NULL,
  `rating`            TINYINT      NOT NULL COMMENT '1 to 5',
  `text`              TEXT         NOT NULL,
  `published_at`      DATETIME     NOT NULL,
  `sentiment`         ENUM('POSITIVE','NEGATIVE','NEUTRAL') NOT NULL DEFAULT 'NEUTRAL',
  `sentiment_score`   DECIMAL(4,3) NOT NULL DEFAULT 0.500 COMMENT '0.000–1.000',
  `keywords`          JSON         NOT NULL DEFAULT (JSON_ARRAY()) COMMENT 'Array of keyword strings',
  `google_review_url` VARCHAR(500) NULL,
  `is_synced`         TINYINT(1)  NOT NULL DEFAULT 1,
  `is_new`            TINYINT(1)  NOT NULL DEFAULT 1,
  `created_at`        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE  KEY `uq_reviews_google_id`  (`google_review_id`),
  KEY     `idx_reviews_rating`        (`rating`),
  KEY     `idx_reviews_sentiment`     (`sentiment`),
  KEY     `idx_reviews_published_at`  (`published_at`),
  KEY     `idx_reviews_is_new`        (`is_new`),
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` BETWEEN 1 AND 5),
  CONSTRAINT `chk_sentiment_score` CHECK (`sentiment_score` BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Google Business Profile reviews';

-- ============================================================
-- Review Replies
-- ============================================================

CREATE TABLE IF NOT EXISTS `review_replies` (
  `id`               VARCHAR(36)  NOT NULL,
  `review_id`        VARCHAR(36)  NOT NULL,
  `text`             TEXT         NOT NULL,
  `is_ai_generated`  TINYINT(1)  NOT NULL DEFAULT 0,
  `posted_to_google` TINYINT(1)  NOT NULL DEFAULT 0,
  `posted_at`        DATETIME     NULL,
  `google_reply_id`  VARCHAR(255) NULL COMMENT 'ID returned by Google after posting',
  `created_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE  KEY `uq_reply_review_id`        (`review_id`),
  KEY     `idx_reply_posted_to_google`    (`posted_to_google`),
  CONSTRAINT `fk_reply_review`
    FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Owner replies to Google reviews';

-- ============================================================
-- AI Reply History
-- ============================================================

CREATE TABLE IF NOT EXISTS `ai_reply_history` (
  `id`              VARCHAR(36)  NOT NULL,
  `review_id`       VARCHAR(36)  NOT NULL,
  `generated_reply` TEXT         NOT NULL,
  `tone`            VARCHAR(50)  NOT NULL COMMENT 'professional|friendly|formal|luxury|hospitality|empathetic',
  `model`           VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
  `prompt`          TEXT         NULL COMMENT 'Full system+user prompt sent to the model',
  `tokens_used`     INT          NULL,
  `processing_time` DECIMAL(6,3) NULL COMMENT 'Seconds',
  `was_used`        TINYINT(1)  NOT NULL DEFAULT 0 COMMENT 'Whether reply was actually posted',
  `created_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_history_review_id` (`review_id`),
  KEY `idx_ai_history_tone`      (`tone`),
  KEY `idx_ai_history_was_used`  (`was_used`),
  CONSTRAINT `fk_ai_history_review`
    FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='History of AI-generated reply attempts';

-- ============================================================
-- Analytics Cache
-- ============================================================

CREATE TABLE IF NOT EXISTS `analytics_cache` (
  `id`         VARCHAR(36)  NOT NULL,
  `cache_key`  VARCHAR(255) NOT NULL,
  `data`       JSON         NOT NULL,
  `expires_at` DATETIME     NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE  KEY `uq_cache_key`      (`cache_key`),
  KEY     `idx_cache_expires_at`  (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Pre-computed analytics results cache';

-- ============================================================
-- Sync Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS `sync_logs` (
  `id`              VARCHAR(36)  NOT NULL,
  `status`          ENUM('SUCCESS','FAILED','IN_PROGRESS') NOT NULL,
  `reviews_synced`  INT          NOT NULL DEFAULT 0,
  `new_reviews`     INT          NOT NULL DEFAULT 0,
  `updated_reviews` INT          NOT NULL DEFAULT 0,
  `errors`          JSON         NULL COMMENT 'Array of error message strings',
  `started_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at`    DATETIME     NULL,
  `duration`        DECIMAL(8,3) NULL COMMENT 'Total seconds elapsed',
  `triggered_by`    VARCHAR(50)  NOT NULL DEFAULT 'cron' COMMENT 'cron | manual | webhook',
  PRIMARY KEY (`id`),
  KEY `idx_sync_status`     (`status`),
  KEY `idx_sync_started_at` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='History of Google review sync operations';

-- ============================================================
-- Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         VARCHAR(36)  NOT NULL,
  `type`       ENUM('NEW_REVIEW','NEGATIVE_REVIEW','REPLY_POSTED','SYNC_COMPLETE','SYSTEM') NOT NULL,
  `title`      VARCHAR(255) NOT NULL,
  `message`    TEXT         NOT NULL,
  `is_read`    TINYINT(1)  NOT NULL DEFAULT 0,
  `review_id`  VARCHAR(36)  NULL COMMENT 'Related review (nullable)',
  `metadata`   JSON         NULL,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_is_read`    (`is_read`),
  KEY `idx_notif_type`       (`type`),
  KEY `idx_notif_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='In-app notifications for review activity';

-- ============================================================
-- API Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS `api_logs` (
  `id`           VARCHAR(36)  NOT NULL,
  `method`       VARCHAR(10)  NOT NULL,
  `endpoint`     VARCHAR(500) NOT NULL,
  `status_code`  SMALLINT     NOT NULL,
  `duration`     DECIMAL(8,2) NOT NULL COMMENT 'Milliseconds',
  `ip_address`   VARCHAR(45)  NULL,
  `user_id`      VARCHAR(36)  NULL,
  `user_agent`   VARCHAR(500) NULL,
  `request_body` JSON         NULL,
  `error`        TEXT         NULL,
  `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_status_code`  (`status_code`),
  KEY `idx_api_endpoint`     (`endpoint`(191)),
  KEY `idx_api_created_at`   (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='API request/response audit log';

-- ============================================================
-- Business Info
-- ============================================================

CREATE TABLE IF NOT EXISTS `business_info` (
  `id`          VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `address`     VARCHAR(500) NULL,
  `phone`       VARCHAR(50)  NULL,
  `email`       VARCHAR(255) NULL,
  `website`     VARCHAR(500) NULL,
  `logo_url`    VARCHAR(500) NULL,
  `description` TEXT         NULL,
  `industry`    VARCHAR(100) NULL,
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Business profile information';

-- ============================================================
-- Schema version tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version`    VARCHAR(50)  NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `applied_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks applied database migrations';

INSERT INTO `schema_migrations` (`version`, `name`)
VALUES ('001', 'initial_schema')
ON DUPLICATE KEY UPDATE `applied_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;
