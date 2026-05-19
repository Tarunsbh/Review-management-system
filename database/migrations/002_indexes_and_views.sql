-- ============================================================
-- Migration 002: Additional Indexes, Views & Stored Procedures
-- ============================================================

-- ============================================================
-- Composite indexes for common query patterns
-- ============================================================

-- Reviews dashboard: filter by rating + date
ALTER TABLE `reviews`
  ADD KEY `idx_reviews_rating_date` (`rating`, `published_at` DESC);

-- Reviews: sentiment + date for trend queries
ALTER TABLE `reviews`
  ADD KEY `idx_reviews_sentiment_date` (`sentiment`, `published_at` DESC);

-- Notifications: unread by type
ALTER TABLE `notifications`
  ADD KEY `idx_notif_unread_type` (`is_read`, `type`, `created_at` DESC);

-- ============================================================
-- VIEW: reviews_with_replies
-- ============================================================

CREATE OR REPLACE VIEW `v_reviews_with_replies` AS
SELECT
  r.id,
  r.google_review_id,
  r.reviewer_name,
  r.reviewer_photo_url,
  r.rating,
  r.text,
  r.published_at,
  r.sentiment,
  r.sentiment_score,
  r.keywords,
  r.google_review_url,
  r.is_new,
  r.created_at,
  -- reply columns (NULL when no reply)
  rp.id               AS reply_id,
  rp.text             AS reply_text,
  rp.is_ai_generated  AS reply_is_ai,
  rp.posted_to_google AS reply_posted,
  rp.posted_at        AS reply_posted_at,
  rp.created_at       AS reply_created_at
FROM `reviews` r
LEFT JOIN `review_replies` rp ON rp.review_id = r.id;

-- ============================================================
-- VIEW: analytics_summary
-- ============================================================

CREATE OR REPLACE VIEW `v_analytics_summary` AS
SELECT
  COUNT(*)                                                          AS total_reviews,
  ROUND(AVG(rating), 2)                                            AS avg_rating,
  SUM(CASE WHEN sentiment = 'POSITIVE' THEN 1 ELSE 0 END)         AS positive_count,
  SUM(CASE WHEN sentiment = 'NEGATIVE' THEN 1 ELSE 0 END)         AS negative_count,
  SUM(CASE WHEN sentiment = 'NEUTRAL'  THEN 1 ELSE 0 END)         AS neutral_count,
  SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END)                     AS five_star,
  SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END)                     AS four_star,
  SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END)                     AS three_star,
  SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END)                     AS two_star,
  SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END)                     AS one_star,
  COUNT(DISTINCT rp.review_id)                                     AS replied_count,
  COUNT(*) - COUNT(DISTINCT rp.review_id)                          AS unreplied_count,
  ROUND(COUNT(DISTINCT rp.review_id) / COUNT(*) * 100, 1)         AS reply_rate_pct
FROM `reviews` r
LEFT JOIN `review_replies` rp ON rp.review_id = r.id;

-- ============================================================
-- VIEW: monthly_review_stats
-- ============================================================

CREATE OR REPLACE VIEW `v_monthly_stats` AS
SELECT
  DATE_FORMAT(published_at, '%Y-%m') AS month,
  COUNT(*)                            AS total_reviews,
  ROUND(AVG(rating), 2)              AS avg_rating,
  SUM(CASE WHEN sentiment = 'POSITIVE' THEN 1 ELSE 0 END) AS positive,
  SUM(CASE WHEN sentiment = 'NEGATIVE' THEN 1 ELSE 0 END) AS negative,
  SUM(CASE WHEN sentiment = 'NEUTRAL'  THEN 1 ELSE 0 END) AS neutral
FROM `reviews`
GROUP BY DATE_FORMAT(published_at, '%Y-%m')
ORDER BY month DESC;

-- ============================================================
-- VIEW: unanswered_reviews  (needs reply, sorted by urgency)
-- ============================================================

CREATE OR REPLACE VIEW `v_unanswered_reviews` AS
SELECT
  r.id,
  r.reviewer_name,
  r.rating,
  r.text,
  r.sentiment,
  r.published_at,
  TIMESTAMPDIFF(HOUR, r.published_at, NOW()) AS hours_since_posted
FROM `reviews` r
LEFT JOIN `review_replies` rp ON rp.review_id = r.id
WHERE rp.id IS NULL
ORDER BY
  r.rating ASC,          -- low-rated first (most urgent)
  r.published_at ASC;    -- oldest first within same rating

-- ============================================================
-- STORED PROCEDURE: sp_get_rating_distribution
-- ============================================================

DROP PROCEDURE IF EXISTS `sp_get_rating_distribution`;
DELIMITER $$
CREATE PROCEDURE `sp_get_rating_distribution`()
BEGIN
  SELECT
    rating,
    COUNT(*)                            AS `count`,
    ROUND(COUNT(*) / t.total * 100, 1) AS percentage
  FROM `reviews`
  CROSS JOIN (SELECT COUNT(*) AS total FROM `reviews`) t
  GROUP BY rating, t.total
  ORDER BY rating DESC;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE: sp_purge_old_logs
-- ============================================================

DROP PROCEDURE IF EXISTS `sp_purge_old_logs`;
DELIMITER $$
CREATE PROCEDURE `sp_purge_old_logs`(IN keep_days INT)
BEGIN
  DECLARE cutoff DATETIME DEFAULT DATE_SUB(NOW(), INTERVAL keep_days DAY);
  DELETE FROM `api_logs`   WHERE created_at < cutoff;
  DELETE FROM `sync_logs`  WHERE started_at < cutoff;
  SELECT ROW_COUNT() AS rows_deleted;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE: sp_sync_summary  (last N syncs)
-- ============================================================

DROP PROCEDURE IF EXISTS `sp_sync_summary`;
DELIMITER $$
CREATE PROCEDURE `sp_sync_summary`(IN n INT)
BEGIN
  SELECT
    id, status, reviews_synced, new_reviews,
    updated_reviews, started_at, completed_at,
    duration, triggered_by
  FROM `sync_logs`
  ORDER BY started_at DESC
  LIMIT n;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE: sp_mark_all_notifications_read
-- ============================================================

DROP PROCEDURE IF EXISTS `sp_mark_all_notifications_read`;
DELIMITER $$
CREATE PROCEDURE `sp_mark_all_notifications_read`()
BEGIN
  UPDATE `notifications` SET is_read = 1 WHERE is_read = 0;
  SELECT ROW_COUNT() AS updated_count;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER: trg_notify_negative_review
-- Creates a NEGATIVE_REVIEW notification automatically
-- ============================================================

DROP TRIGGER IF EXISTS `trg_notify_negative_review`;
DELIMITER $$
CREATE TRIGGER `trg_notify_negative_review`
AFTER INSERT ON `reviews`
FOR EACH ROW
BEGIN
  IF NEW.rating <= 2 THEN
    INSERT INTO `notifications`
      (`id`, `type`, `title`, `message`, `review_id`)
    VALUES (
      UUID(),
      'NEGATIVE_REVIEW',
      CONCAT('⚠️ ', NEW.rating, '-star review from ', NEW.reviewer_name),
      CONCAT(
        NEW.reviewer_name, ' left a ', NEW.rating,
        '-star review that needs your attention: "',
        LEFT(NEW.text, 120), '"'
      ),
      NEW.id
    );
  END IF;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER: trg_notify_new_review
-- Creates a NEW_REVIEW notification for any new review
-- ============================================================

DROP TRIGGER IF EXISTS `trg_notify_new_review`;
DELIMITER $$
CREATE TRIGGER `trg_notify_new_review`
AFTER INSERT ON `reviews`
FOR EACH ROW
BEGIN
  IF NEW.rating >= 3 THEN
    INSERT INTO `notifications`
      (`id`, `type`, `title`, `message`, `review_id`)
    VALUES (
      UUID(),
      'NEW_REVIEW',
      CONCAT('New ', NEW.rating, '-star review from ', NEW.reviewer_name),
      CONCAT(
        NEW.reviewer_name, ' left a ', NEW.rating,
        '-star review: "', LEFT(NEW.text, 100), '"'
      ),
      NEW.id
    );
  END IF;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER: trg_notify_reply_posted
-- ============================================================

DROP TRIGGER IF EXISTS `trg_notify_reply_posted`;
DELIMITER $$
CREATE TRIGGER `trg_notify_reply_posted`
AFTER INSERT ON `review_replies`
FOR EACH ROW
BEGIN
  DECLARE reviewer VARCHAR(255);
  SELECT reviewer_name INTO reviewer FROM `reviews` WHERE id = NEW.review_id;
  INSERT INTO `notifications`
    (`id`, `type`, `title`, `message`, `review_id`)
  VALUES (
    UUID(),
    'REPLY_POSTED',
    CONCAT('Reply posted to ', reviewer, '''s review'),
    CONCAT(
      'Your reply to ', reviewer,
      ' has been posted', IF(NEW.posted_to_google, ' to Google.', '.')
    ),
    NEW.review_id
  );
END$$
DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `name`)
VALUES ('002', 'indexes_views_procedures_triggers')
ON DUPLICATE KEY UPDATE `applied_at` = CURRENT_TIMESTAMP;
