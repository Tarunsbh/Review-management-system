-- ============================================================
-- eGlobe Review Management System
-- SQL Server 2022 — Indexes, Views & Triggers
-- ============================================================

USE [eglobe_reviews];
GO

-- ============================================================
-- Composite indexes
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_reviews_rating_date')
  CREATE INDEX [IX_reviews_rating_date]    ON [reviews]      ([rating], [publishedAt] DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_reviews_sentiment_date')
  CREATE INDEX [IX_reviews_sentiment_date] ON [reviews]      ([sentiment], [publishedAt] DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_notif_unread_type')
  CREATE INDEX [IX_notif_unread_type]      ON [notifications] ([isRead], [type], [createdAt] DESC);
GO

-- ============================================================
-- VIEW: v_reviews_with_replies
-- ============================================================

CREATE OR ALTER VIEW [v_reviews_with_replies] AS
SELECT
  r.[id],
  r.[googleReviewId],
  r.[reviewerName],
  r.[reviewerPhotoUrl],
  r.[rating],
  r.[text],
  r.[publishedAt],
  r.[sentiment],
  r.[sentimentScore],
  r.[keywords],
  r.[googleReviewUrl],
  r.[isNew],
  r.[createdAt],
  rp.[id]             AS reply_id,
  rp.[text]           AS reply_text,
  rp.[isAiGenerated]  AS reply_is_ai,
  rp.[postedToGoogle] AS reply_posted,
  rp.[postedAt]       AS reply_posted_at,
  rp.[createdAt]      AS reply_created_at
FROM [reviews] r
LEFT JOIN [review_replies] rp ON rp.[reviewId] = r.[id];
GO

-- ============================================================
-- VIEW: v_analytics_summary
-- ============================================================

CREATE OR ALTER VIEW [v_analytics_summary] AS
SELECT
  COUNT(*)                                                     AS total_reviews,
  ROUND(AVG(CAST([rating] AS FLOAT)), 2)                      AS avg_rating,
  SUM(CASE WHEN [sentiment] = 'POSITIVE' THEN 1 ELSE 0 END)   AS positive_count,
  SUM(CASE WHEN [sentiment] = 'NEGATIVE' THEN 1 ELSE 0 END)   AS negative_count,
  SUM(CASE WHEN [sentiment] = 'NEUTRAL'  THEN 1 ELSE 0 END)   AS neutral_count,
  SUM(CASE WHEN [rating] = 5 THEN 1 ELSE 0 END)               AS five_star,
  SUM(CASE WHEN [rating] = 4 THEN 1 ELSE 0 END)               AS four_star,
  SUM(CASE WHEN [rating] = 3 THEN 1 ELSE 0 END)               AS three_star,
  SUM(CASE WHEN [rating] = 2 THEN 1 ELSE 0 END)               AS two_star,
  SUM(CASE WHEN [rating] = 1 THEN 1 ELSE 0 END)               AS one_star
FROM [reviews];
GO

-- ============================================================
-- VIEW: v_monthly_stats
-- ============================================================

CREATE OR ALTER VIEW [v_monthly_stats] AS
SELECT
  FORMAT([publishedAt], 'yyyy-MM')                             AS [month],
  COUNT(*)                                                     AS total_reviews,
  ROUND(AVG(CAST([rating] AS FLOAT)), 2)                      AS avg_rating,
  SUM(CASE WHEN [sentiment] = 'POSITIVE' THEN 1 ELSE 0 END)   AS positive,
  SUM(CASE WHEN [sentiment] = 'NEGATIVE' THEN 1 ELSE 0 END)   AS negative,
  SUM(CASE WHEN [sentiment] = 'NEUTRAL'  THEN 1 ELSE 0 END)   AS neutral
FROM [reviews]
GROUP BY FORMAT([publishedAt], 'yyyy-MM');
GO

-- ============================================================
-- VIEW: v_unanswered_reviews
-- ============================================================

CREATE OR ALTER VIEW [v_unanswered_reviews] AS
SELECT
  r.[id],
  r.[reviewerName],
  r.[rating],
  r.[text],
  r.[sentiment],
  r.[publishedAt],
  DATEDIFF(HOUR, r.[publishedAt], GETUTCDATE()) AS hours_since_posted
FROM [reviews] r
LEFT JOIN [review_replies] rp ON rp.[reviewId] = r.[id]
WHERE rp.[id] IS NULL;
GO

-- ============================================================
-- TRIGGER: trg_notify_negative_review
-- ============================================================

CREATE OR ALTER TRIGGER [trg_notify_negative_review]
ON [reviews]
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO [notifications] ([id],[type],[title],[message],[reviewId],[createdAt])
  SELECT
    NEWID(),
    'NEGATIVE_REVIEW',
    N'⚠️ ' + CAST([rating] AS NVARCHAR) + N'-star review from ' + [reviewerName],
    [reviewerName] + N' left a ' + CAST([rating] AS NVARCHAR) + N'-star review: "' + LEFT([text], 120) + N'"',
    [id],
    GETUTCDATE()
  FROM inserted
  WHERE [rating] <= 2;
END;
GO

-- ============================================================
-- TRIGGER: trg_notify_new_review
-- ============================================================

CREATE OR ALTER TRIGGER [trg_notify_new_review]
ON [reviews]
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO [notifications] ([id],[type],[title],[message],[reviewId],[createdAt])
  SELECT
    NEWID(),
    'NEW_REVIEW',
    N'New ' + CAST([rating] AS NVARCHAR) + N'-star review from ' + [reviewerName],
    [reviewerName] + N' left a ' + CAST([rating] AS NVARCHAR) + N'-star review: "' + LEFT([text], 100) + N'"',
    [id],
    GETUTCDATE()
  FROM inserted
  WHERE [rating] >= 3;
END;
GO

INSERT INTO [schema_migrations] ([version],[name])
SELECT '002','indexes_views_triggers'
WHERE NOT EXISTS (SELECT 1 FROM [schema_migrations] WHERE [version]='002');
GO

PRINT '=== Migration 002 applied successfully ===';
GO
