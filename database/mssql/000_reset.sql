-- ============================================================
-- eGlobe Review Management System
-- SQL Server 2022 — FULL RESET (drops all app tables)
-- ============================================================
-- WARNING: This deletes ALL data. Use only in development.
-- Run:  sqlcmd -S localhost,1433 -U sa -P <pwd> -d eglobe_reviews -i 000_reset.sql
-- ============================================================

USE [eglobe_reviews];
GO

-- Disable FK checks while dropping
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
GO

-- Drop tables in dependency order (children first)
IF OBJECT_ID('ai_reply_history','U')  IS NOT NULL DROP TABLE [ai_reply_history];
IF OBJECT_ID('review_replies','U')    IS NOT NULL DROP TABLE [review_replies];
IF OBJECT_ID('reviews','U')           IS NOT NULL DROP TABLE [reviews];
IF OBJECT_ID('notifications','U')     IS NOT NULL DROP TABLE [notifications];
IF OBJECT_ID('api_logs','U')          IS NOT NULL DROP TABLE [api_logs];
IF OBJECT_ID('sync_logs','U')         IS NOT NULL DROP TABLE [sync_logs];
IF OBJECT_ID('analytics_cache','U')   IS NOT NULL DROP TABLE [analytics_cache];
IF OBJECT_ID('settings','U')          IS NOT NULL DROP TABLE [settings];
IF OBJECT_ID('google_auth','U')       IS NOT NULL DROP TABLE [google_auth];
IF OBJECT_ID('business_info','U')     IS NOT NULL DROP TABLE [business_info];
IF OBJECT_ID('users','U')             IS NOT NULL DROP TABLE [users];
IF OBJECT_ID('schema_migrations','U') IS NOT NULL DROP TABLE [schema_migrations];
GO

-- Drop views
IF OBJECT_ID('v_reviews_with_replies','V') IS NOT NULL DROP VIEW [v_reviews_with_replies];
IF OBJECT_ID('v_analytics_summary','V')    IS NOT NULL DROP VIEW [v_analytics_summary];
IF OBJECT_ID('v_monthly_stats','V')        IS NOT NULL DROP VIEW [v_monthly_stats];
IF OBJECT_ID('v_unanswered_reviews','V')   IS NOT NULL DROP VIEW [v_unanswered_reviews];
GO

PRINT '=== All tables dropped. Database is clean. ===';
PRINT 'Next step: run  npx prisma db push  to recreate the schema.';
GO
