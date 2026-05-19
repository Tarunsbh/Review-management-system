-- ============================================================
-- eGlobe Review Management System
-- Microsoft SQL Server 2022 — Schema
-- ============================================================
-- Run against an empty database:
--   sqlcmd -S localhost,1433 -U sa -P <pwd> -d eglobe_reviews -i 001_schema.sql
-- ============================================================

USE [eglobe_reviews];
GO

-- ============================================================
-- Users
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE [users] (
    [id]         NVARCHAR(36)  NOT NULL,
    [email]      NVARCHAR(255) NOT NULL,
    [name]       NVARCHAR(255) NOT NULL,
    [password]   NVARCHAR(255) NOT NULL,          -- bcrypt hash
    [role]       NVARCHAR(20)  NOT NULL DEFAULT 'ADMIN',
    [avatar]     NVARCHAR(500) NULL,
    [isActive]   BIT           NOT NULL DEFAULT 1,
    [lastLogin]  DATETIME2     NULL,
    [createdAt]  DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    [updatedAt]  DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_users]       PRIMARY KEY ([id]),
    CONSTRAINT [UQ_users_email] UNIQUE      ([email]),
    CONSTRAINT [CHK_users_role] CHECK       ([role] IN ('ADMIN','MANAGER','VIEWER'))
  );
  PRINT 'Created table: users';
END
GO

-- ============================================================
-- Settings
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'settings')
BEGIN
  CREATE TABLE [settings] (
    [id]        NVARCHAR(36)   NOT NULL,
    [section]   NVARCHAR(100)  NOT NULL,
    [data]      NVARCHAR(MAX)  NOT NULL,           -- JSON blob
    [createdAt] DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    [updatedAt] DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_settings]         PRIMARY KEY ([id]),
    CONSTRAINT [UQ_settings_section] UNIQUE      ([section]),
    CONSTRAINT [CHK_settings_json]   CHECK       (ISJSON([data]) = 1)
  );
  PRINT 'Created table: settings';
END
GO

-- ============================================================
-- Google Auth
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'google_auth')
BEGIN
  CREATE TABLE [google_auth] (
    [id]           NVARCHAR(36)  NOT NULL,
    [accessToken]  NVARCHAR(MAX) NULL,
    [refreshToken] NVARCHAR(MAX) NULL,
    [expiresAt]    DATETIME2     NULL,
    [isConnected]  BIT           NOT NULL DEFAULT 0,
    [placeId]      NVARCHAR(255) NULL,
    [accountId]    NVARCHAR(255) NULL,
    [locationId]   NVARCHAR(255) NULL,
    [accountName]  NVARCHAR(255) NULL,
    [locationName] NVARCHAR(255) NULL,
    [createdAt]    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    [updatedAt]    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_google_auth] PRIMARY KEY ([id])
  );
  PRINT 'Created table: google_auth';
END
GO

-- ============================================================
-- Reviews
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'reviews')
BEGIN
  CREATE TABLE [reviews] (
    [id]               NVARCHAR(36)  NOT NULL,
    [googleReviewId]   NVARCHAR(255) NOT NULL,
    [reviewerName]     NVARCHAR(255) NOT NULL,
    [reviewerPhotoUrl] NVARCHAR(500) NULL,
    [rating]           INT           NOT NULL,
    [text]             NVARCHAR(MAX) NOT NULL,
    [publishedAt]      DATETIME2     NOT NULL,
    [sentiment]        NVARCHAR(20)  NOT NULL DEFAULT 'NEUTRAL',
    [sentimentScore]   DECIMAL(4,3)  NOT NULL DEFAULT 0.500,
    [keywords]         NVARCHAR(MAX) NOT NULL DEFAULT N'[]',   -- JSON array
    [googleReviewUrl]  NVARCHAR(500) NULL,
    [isSynced]         BIT           NOT NULL DEFAULT 1,
    [isNew]            BIT           NOT NULL DEFAULT 1,
    [createdAt]        DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    [updatedAt]        DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_reviews]              PRIMARY KEY ([id]),
    CONSTRAINT [UQ_reviews_googleId]     UNIQUE      ([googleReviewId]),
    CONSTRAINT [CHK_reviews_rating]      CHECK       ([rating] BETWEEN 1 AND 5),
    CONSTRAINT [CHK_reviews_sentiment]   CHECK       ([sentiment] IN ('POSITIVE','NEGATIVE','NEUTRAL')),
    CONSTRAINT [CHK_reviews_sentScore]   CHECK       ([sentimentScore] BETWEEN 0 AND 1)
  );
  PRINT 'Created table: reviews';
END
GO

-- ============================================================
-- Review Replies
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'review_replies')
BEGIN
  CREATE TABLE [review_replies] (
    [id]             NVARCHAR(36)  NOT NULL,
    [reviewId]       NVARCHAR(36)  NOT NULL,
    [text]           NVARCHAR(MAX) NOT NULL,
    [isAiGenerated]  BIT           NOT NULL DEFAULT 0,
    [postedToGoogle] BIT           NOT NULL DEFAULT 0,
    [postedAt]       DATETIME2     NULL,
    [googleReplyId]  NVARCHAR(255) NULL,
    [createdAt]      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    [updatedAt]      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_review_replies]    PRIMARY KEY ([id]),
    CONSTRAINT [UQ_reply_reviewId]    UNIQUE      ([reviewId]),
    CONSTRAINT [FK_reply_review]      FOREIGN KEY ([reviewId]) REFERENCES [reviews]([id]) ON DELETE CASCADE
  );
  PRINT 'Created table: review_replies';
END
GO

-- ============================================================
-- AI Reply History
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ai_reply_history')
BEGIN
  CREATE TABLE [ai_reply_history] (
    [id]             NVARCHAR(36)  NOT NULL,
    [reviewId]       NVARCHAR(36)  NOT NULL,
    [generatedReply] NVARCHAR(MAX) NOT NULL,
    [tone]           NVARCHAR(50)  NOT NULL,
    [model]          NVARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    [prompt]         NVARCHAR(MAX) NULL,
    [tokensUsed]     INT           NULL,
    [processingTime] DECIMAL(6,3)  NULL,
    [wasUsed]        BIT           NOT NULL DEFAULT 0,
    [createdAt]      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_ai_reply_history] PRIMARY KEY ([id]),
    CONSTRAINT [FK_ai_review]        FOREIGN KEY ([reviewId]) REFERENCES [reviews]([id]) ON DELETE CASCADE
  );
  PRINT 'Created table: ai_reply_history';
END
GO

-- ============================================================
-- Analytics Cache
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'analytics_cache')
BEGIN
  CREATE TABLE [analytics_cache] (
    [id]        NVARCHAR(36)  NOT NULL,
    [cacheKey]  NVARCHAR(255) NOT NULL,
    [data]      NVARCHAR(MAX) NOT NULL,
    [expiresAt] DATETIME2     NOT NULL,
    [createdAt] DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_analytics_cache]    PRIMARY KEY ([id]),
    CONSTRAINT [UQ_analytics_cacheKey] UNIQUE      ([cacheKey])
  );
  PRINT 'Created table: analytics_cache';
END
GO

-- ============================================================
-- Sync Logs
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sync_logs')
BEGIN
  CREATE TABLE [sync_logs] (
    [id]             NVARCHAR(36)  NOT NULL,
    [status]         NVARCHAR(20)  NOT NULL,
    [reviewsSynced]  INT           NOT NULL DEFAULT 0,
    [newReviews]     INT           NOT NULL DEFAULT 0,
    [updatedReviews] INT           NOT NULL DEFAULT 0,
    [errors]         NVARCHAR(MAX) NULL,
    [startedAt]      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    [completedAt]    DATETIME2     NULL,
    [duration]       DECIMAL(8,3)  NULL,
    [triggeredBy]    NVARCHAR(50)  NOT NULL DEFAULT 'cron',
    CONSTRAINT [PK_sync_logs]    PRIMARY KEY ([id]),
    CONSTRAINT [CHK_sync_status] CHECK       ([status] IN ('SUCCESS','FAILED','IN_PROGRESS'))
  );
  PRINT 'Created table: sync_logs';
END
GO

-- ============================================================
-- Notifications
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notifications')
BEGIN
  CREATE TABLE [notifications] (
    [id]        NVARCHAR(36)  NOT NULL,
    [type]      NVARCHAR(30)  NOT NULL,
    [title]     NVARCHAR(255) NOT NULL,
    [message]   NVARCHAR(MAX) NOT NULL,
    [isRead]    BIT           NOT NULL DEFAULT 0,
    [reviewId]  NVARCHAR(36)  NULL,
    [metadata]  NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_notifications]  PRIMARY KEY ([id]),
    CONSTRAINT [CHK_notif_type]    CHECK       ([type] IN ('NEW_REVIEW','NEGATIVE_REVIEW','REPLY_POSTED','SYNC_COMPLETE','SYSTEM'))
  );
  PRINT 'Created table: notifications';
END
GO

-- ============================================================
-- API Logs
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'api_logs')
BEGIN
  CREATE TABLE [api_logs] (
    [id]          NVARCHAR(36)  NOT NULL,
    [method]      NVARCHAR(10)  NOT NULL,
    [endpoint]    NVARCHAR(500) NOT NULL,
    [statusCode]  SMALLINT      NOT NULL,
    [duration]    DECIMAL(10,2) NOT NULL,
    [ipAddress]   NVARCHAR(45)  NULL,
    [userId]      NVARCHAR(36)  NULL,
    [userAgent]   NVARCHAR(500) NULL,
    [requestBody] NVARCHAR(MAX) NULL,
    [error]       NVARCHAR(MAX) NULL,
    [createdAt]   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_api_logs] PRIMARY KEY ([id])
  );
  PRINT 'Created table: api_logs';
END
GO

-- ============================================================
-- Business Info
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'business_info')
BEGIN
  CREATE TABLE [business_info] (
    [id]          NVARCHAR(36)  NOT NULL,
    [name]        NVARCHAR(255) NOT NULL,
    [address]     NVARCHAR(500) NULL,
    [phone]       NVARCHAR(50)  NULL,
    [email]       NVARCHAR(255) NULL,
    [website]     NVARCHAR(500) NULL,
    [logoUrl]     NVARCHAR(500) NULL,
    [description] NVARCHAR(MAX) NULL,
    [industry]    NVARCHAR(100) NULL,
    [createdAt]   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    [updatedAt]   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_business_info] PRIMARY KEY ([id])
  );
  PRINT 'Created table: business_info';
END
GO

-- ============================================================
-- Schema migrations tracker
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'schema_migrations')
BEGIN
  CREATE TABLE [schema_migrations] (
    [version]   NVARCHAR(50)  NOT NULL,
    [name]      NVARCHAR(255) NOT NULL,
    [appliedAt] DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_schema_migrations] PRIMARY KEY ([version])
  );
  PRINT 'Created table: schema_migrations';
END
GO

INSERT INTO [schema_migrations] ([version],[name])
SELECT '001','initial_schema'
WHERE NOT EXISTS (SELECT 1 FROM [schema_migrations] WHERE [version]='001');
GO

PRINT '=== Migration 001 applied successfully ===';
GO
