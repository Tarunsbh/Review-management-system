-- ============================================================
-- eGlobe Review Management System
-- SQL Server 2022 — Seed Data
-- ============================================================
-- Idempotent: safe to run multiple times
-- ============================================================

USE [eglobe_reviews];
GO

-- ─── Admin user (password: "admin") ─────────────────────────
IF NOT EXISTS (SELECT 1 FROM [users] WHERE [email] = 'admin@admin.com')
BEGIN
  INSERT INTO [users] ([id],[email],[name],[password],[role],[isActive],[createdAt],[updatedAt])
  VALUES (
    'user_admin_001',
    'admin@admin.com',
    'Admin User',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'ADMIN', 1, GETUTCDATE(), GETUTCDATE()
  );
  PRINT 'Inserted admin user';
END
GO

-- ─── Manager user (password: "manager123") ──────────────────
IF NOT EXISTS (SELECT 1 FROM [users] WHERE [email] = 'manager@eglobe.com')
BEGIN
  INSERT INTO [users] ([id],[email],[name],[password],[role],[isActive],[createdAt],[updatedAt])
  VALUES (
    'user_mgr_001',
    'manager@eglobe.com',
    'Hotel Manager',
    '$2a$10$lF3z5xFVtC3JaAKjPGYVuO1MhO/VxMvRqp7nDvTwBLKf.MfNPkRui',
    'MANAGER', 1, GETUTCDATE(), GETUTCDATE()
  );
  PRINT 'Inserted manager user';
END
GO

-- ─── Business info ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [business_info])
BEGIN
  INSERT INTO [business_info] ([id],[name],[address],[phone],[email],[website],[industry],[createdAt],[updatedAt])
  VALUES (
    'biz_001',
    N'eGlobe Hotel & Resorts',
    N'123 Luxury Avenue, Bandra West, Mumbai 400050',
    N'+91 98765 43210',
    N'info@eglobe.com',
    N'https://eglobe.com',
    N'hotel',
    GETUTCDATE(), GETUTCDATE()
  );
  PRINT 'Inserted business info';
END
GO

-- ─── Default settings ────────────────────────────────────────
MERGE [settings] AS target
USING (
  VALUES
    ('set_google', 'google',        N'{"apiKey":"","clientId":"","clientSecret":"","placeId":"","accountId":"","locationId":"","isConnected":false}'),
    ('set_openai', 'openai',        N'{"apiKey":"","model":"gpt-4o","temperature":0.7,"maxTokens":500,"defaultTone":"professional","autoSuggest":true}'),
    ('set_email',  'email',         N'{"smtpHost":"","smtpPort":587,"smtpUsername":"","smtpPassword":"","fromEmail":"","fromName":"eGlobe Reviews","isVerified":false}'),
    ('set_biz',    'business',      N'{"name":"eGlobe Hotel & Resorts","address":"123 Luxury Avenue, Mumbai 400050","phone":"+91 98765 43210","email":"info@eglobe.com","website":"https://eglobe.com","industry":"hotel"}'),
    ('set_notif',  'notifications', N'{"emailNotifications":true,"newReviewAlert":true,"negativeReviewAlert":true,"weeklyReport":false,"monthlyReport":true,"slackWebhook":"","whatsappNumber":""}')
) AS source ([id],[section],[data])
ON target.[section] = source.[section]
WHEN NOT MATCHED THEN
  INSERT ([id],[section],[data],[createdAt],[updatedAt])
  VALUES (source.[id], source.[section], source.[data], GETUTCDATE(), GETUTCDATE());
GO

-- ─── Seed reviews ────────────────────────────────────────────
-- Only insert if reviews table is empty
IF NOT EXISTS (SELECT 1 FROM [reviews])
BEGIN

  DECLARE @reviews TABLE (
    id NVARCHAR(36), googleId NVARCHAR(255), reviewer NVARCHAR(255),
    photo NVARCHAR(500), rating INT, txt NVARCHAR(MAX),
    dt DATETIME2, sentiment NVARCHAR(20), score DECIMAL(4,3),
    keywords NVARCHAR(MAX)
  );

  INSERT INTO @reviews VALUES
  ('rev_001','g_001',N'Priya Sharma','https://ui-avatars.com/api/?name=Priya+Sharma&background=6366f1&color=fff',5,N'Absolutely stunning hotel! The staff went above and beyond to make our anniversary special. The suite was immaculate, and the view of the sea was breathtaking. Best stay of my life.',DATEADD(day,-2,GETUTCDATE()),'POSITIVE',0.950,N'["staff","suite","view","anniversary","immaculate"]'),
  ('rev_002','g_002',N'Rajesh Kumar','https://ui-avatars.com/api/?name=Rajesh+Kumar&background=8b5cf6&color=fff',5,N'World-class service from start to finish. The concierge arranged everything perfectly for our corporate team. Fast WiFi, excellent meeting facilities, gourmet breakfast. Highly recommend.',DATEADD(day,-4,GETUTCDATE()),'POSITIVE',0.930,N'["service","concierge","wifi","breakfast","corporate"]'),
  ('rev_003','g_003',N'Fatima Al-Hassan','https://ui-avatars.com/api/?name=Fatima+Al-Hassan&background=06b6d4&color=fff',5,N'The spa treatments were divine! Every therapist was professional and attentive. The rooftop pool is gorgeous. Staff remembered my name on day two — that personal touch is rare.',DATEADD(day,-6,GETUTCDATE()),'POSITIVE',0.970,N'["spa","pool","rooftop","staff","personal"]'),
  ('rev_004','g_004',N'James Wilson','https://ui-avatars.com/api/?name=James+Wilson&background=10b981&color=fff',4,N'Great hotel with excellent amenities. Breakfast buffet had a wide variety. Room was clean and comfortable. The only minor issue was slow check-in, but staff resolved it with a complimentary upgrade.',DATEADD(day,-8,GETUTCDATE()),'POSITIVE',0.780,N'["breakfast","clean","comfortable","upgrade"]'),
  ('rev_005','g_005',N'Mei Chen','https://ui-avatars.com/api/?name=Mei+Chen&background=f59e0b&color=fff',4,N'Beautiful property in a great location. Walking distance to major attractions. The bed was incredibly comfortable and I slept wonderfully. Restaurant food was above average.',DATEADD(day,-10,GETUTCDATE()),'POSITIVE',0.820,N'["location","comfortable","restaurant","bed"]'),
  ('rev_006','g_006',N'Carlos Mendez','https://ui-avatars.com/api/?name=Carlos+Mendez&background=ef4444&color=fff',2,N'Disappointing experience. Room was not cleaned properly when we arrived. The AC made a constant noise keeping us awake. Reported to reception but it took 2 hours to get a new room. Expected better for the price.',DATEADD(day,-12,GETUTCDATE()),'NEGATIVE',0.150,N'["dirty","noisy","slow","disappointing","ac"]'),
  ('rev_007','g_007',N'Ananya Reddy','https://ui-avatars.com/api/?name=Ananya+Reddy&background=6366f1&color=fff',5,N'This is my third stay here and it keeps getting better. The renovation has made the lobby spectacular. Chef Arjun at the restaurant is exceptional — the tasting menu was a culinary journey.',DATEADD(day,-14,GETUTCDATE()),'POSITIVE',0.940,N'["renovation","restaurant","chef","lobby","exceptional"]'),
  ('rev_008','g_008',N'Michael Thompson','https://ui-avatars.com/api/?name=Michael+Thompson&background=8b5cf6&color=fff',3,N'Average stay. The room was decent sized and clean. However the gym equipment was outdated and two machines were broken. Pool area was crowded on weekends. Nothing special but nothing terrible either.',DATEADD(day,-16,GETUTCDATE()),'NEUTRAL',0.500,N'["gym","pool","average","decent"]'),
  ('rev_009','g_009',N'Sarah Johnson','https://ui-avatars.com/api/?name=Sarah+Johnson&background=06b6d4&color=fff',5,N'Honeymoon stay and it was magical! The team decorated our room with rose petals and champagne without us asking. The sunset view from our balcony was absolutely perfect. Thank you for making our first trip as a couple unforgettable.',DATEADD(day,-18,GETUTCDATE()),'POSITIVE',0.980,N'["honeymoon","romantic","sunset","balcony","perfect"]'),
  ('rev_010','g_010',N'Omar Abdullah','https://ui-avatars.com/api/?name=Omar+Abdullah&background=10b981&color=fff',1,N'Worst hotel experience. The toilet was broken for two days. Front desk staff were rude when I complained. No apology, no compensation offered. The manager was unavailable. Absolutely unacceptable. Will never return.',DATEADD(day,-20,GETUTCDATE()),'NEGATIVE',0.030,N'["broken","rude","no apology","unacceptable","worst"]'),
  ('rev_011','g_011',N'Lakshmi Nair','https://ui-avatars.com/api/?name=Lakshmi+Nair&background=f59e0b&color=fff',5,N'Travelled solo and felt completely safe and welcomed. The staff were incredibly helpful with restaurant recommendations and day trip planning. The room was luxurious with amazing toiletries.',DATEADD(day,-22,GETUTCDATE()),'POSITIVE',0.920,N'["safe","helpful","luxurious","solo","toiletries"]'),
  ('rev_012','g_012',N'David Park','https://ui-avatars.com/api/?name=David+Park&background=ef4444&color=fff',4,N'Solid business hotel. Room was well-appointed with good workspace. Housekeeping was prompt. The only downside was limited parking — had to park offsite on one night.',DATEADD(day,-24,GETUTCDATE()),'POSITIVE',0.720,N'["business","workspace","housekeeping","parking"]'),
  ('rev_013','g_013',N'Aisha Patel','https://ui-avatars.com/api/?name=Aisha+Patel&background=6366f1&color=fff',5,N'The pool and spa facilities are world class. I spent three full days just using the property facilities and never got bored. The yoga session at sunrise was transcendent. Staff to guest ratio is impressive.',DATEADD(day,-26,GETUTCDATE()),'POSITIVE',0.960,N'["pool","spa","yoga","sunrise","world-class"]'),
  ('rev_014','g_014',N'Tom Williams','https://ui-avatars.com/api/?name=Tom+Williams&background=8b5cf6&color=fff',3,N'Check-in was slow and we waited 45 minutes. The room itself was fine — clean and comfortable. Breakfast was good. Overall it was okay but for a 5-star hotel I expected a more seamless arrival experience.',DATEADD(day,-28,GETUTCDATE()),'NEUTRAL',0.480,N'["check-in","slow","breakfast","5-star","okay"]'),
  ('rev_015','g_015',N'Pooja Singh','https://ui-avatars.com/api/?name=Pooja+Singh&background=06b6d4&color=fff',5,N'I travel frequently for work and this is now my go-to hotel in the city. The loyalty program benefits are exceptional — upgraded to a suite on my third visit. The pillow menu is a delightful touch.',DATEADD(day,-30,GETUTCDATE()),'POSITIVE',0.940,N'["loyalty","suite","upgrade","pillow","business travel"]'),
  ('rev_016','g_016',N'André Dubois','https://ui-avatars.com/api/?name=André+Dubois&background=10b981&color=fff',4,N'Charming property with excellent food and beverage offerings. The wine list at the rooftop bar is impressive. Staff are friendly and professional. Will definitely return on my next Mumbai trip.',DATEADD(day,-32,GETUTCDATE()),'POSITIVE',0.800,N'["wine","rooftop","bar","food","professional"]'),
  ('rev_017','g_017',N'Sunita Verma','https://ui-avatars.com/api/?name=Sunita+Verma&background=f59e0b&color=fff',2,N'The room photos online were very misleading. The actual room was much smaller and the view was of a construction site. Complained and was told nothing could be done. The bathroom grout was dirty. Not worth the price.',DATEADD(day,-34,GETUTCDATE()),'NEGATIVE',0.130,N'["misleading","small","dirty","construction","overpriced"]'),
  ('rev_018','g_018',N'Robert Chen','https://ui-avatars.com/api/?name=Robert+Chen&background=ef4444&color=fff',5,N'Celebrated my parents 40th anniversary here. The events team coordinated a private dinner on the terrace with live music. My parents were moved to tears. The attention to detail was extraordinary.',DATEADD(day,-36,GETUTCDATE()),'POSITIVE',0.990,N'["anniversary","private dining","live music","events","extraordinary"]'),
  ('rev_019','g_019',N'Kavitha Iyer','https://ui-avatars.com/api/?name=Kavitha+Iyer&background=6366f1&color=fff',4,N'Very comfortable stay. The bed linen quality is premium and I slept like a baby. The in-room dining menu is extensive and food arrives hot. The lobby Wi-Fi was slow but room Wi-Fi was fine.',DATEADD(day,-38,GETUTCDATE()),'POSITIVE',0.760,N'["comfortable","linen","room service","wifi","sleep"]'),
  ('rev_020','g_020',N'Emma Brown','https://ui-avatars.com/api/?name=Emma+Brown&background=8b5cf6&color=fff',5,N'Travelled with a toddler and infant — the staff were angels! They provided a baby cot without asking, had child-friendly menu options, and the pool area had a safe kids zone. Stress-free family holiday.',DATEADD(day,-40,GETUTCDATE()),'POSITIVE',0.960,N'["family","kids","baby cot","staff","child-friendly"]'),
  ('rev_021','g_021',N'Hiroshi Tanaka','https://ui-avatars.com/api/?name=Hiroshi+Tanaka&background=06b6d4&color=fff',5,N'Perfect hotel for a luxury retreat. The Japanese-inspired spa treatment was authentic and deeply relaxing. The attention to detail in the room decor is remarkable. The GM personally greeted us at check-in.',DATEADD(day,-42,GETUTCDATE()),'POSITIVE',0.950,N'["luxury","spa","japanese","gm","attention to detail"]'),
  ('rev_022','g_022',N'Nicole Martinez','https://ui-avatars.com/api/?name=Nicole+Martinez&background=10b981&color=fff',3,N'Mixed feelings. The room was beautiful and modern but we had issues with hot water for the first morning. The pool was great. Breakfast variety could be improved — same items every day for 4 days.',DATEADD(day,-44,GETUTCDATE()),'NEUTRAL',0.470,N'["hot water","pool","breakfast","mixed","beautiful"]'),
  ('rev_023','g_023',N'Arjun Kapoor','https://ui-avatars.com/api/?name=Arjun+Kapoor&background=f59e0b&color=fff',5,N'Outstanding hotel in every way. The signature restaurant deserves its own review — the sea bass was the best I have ever had. Evening turndown service with chocolates and a personalised note was a lovely touch.',DATEADD(day,-46,GETUTCDATE()),'POSITIVE',0.970,N'["restaurant","sea bass","turndown","chocolates","outstanding"]'),
  ('rev_024','g_024',N'Lisa Thompson','https://ui-avatars.com/api/?name=Lisa+Thompson&background=ef4444&color=fff',4,N'Lovely hotel overall. The location is perfect for exploring the city. Concierge team was very helpful with taxi bookings and recommendations. Room service was a bit slow during peak hours but food quality was good.',DATEADD(day,-48,GETUTCDATE()),'POSITIVE',0.740,N'["location","concierge","room service","food quality"]'),
  ('rev_025','g_025',N'Vikram Nair','https://ui-avatars.com/api/?name=Vikram+Nair&background=6366f1&color=fff',5,N'I have stayed at luxury hotels across 40 countries and this ranks among the very best. The cultural touches in the decor and menu reflect deep local pride. The staff training is exceptional — every interaction was warm and genuine.',DATEADD(day,-50,GETUTCDATE()),'POSITIVE',0.980,N'["luxury","cultural","staff","training","genuine"]');

  -- Insert into actual reviews table
  INSERT INTO [reviews] ([id],[googleReviewId],[reviewerName],[reviewerPhotoUrl],[rating],[text],[publishedAt],[sentiment],[sentimentScore],[keywords],[isSynced],[isNew],[createdAt],[updatedAt])
  SELECT id, googleId, reviewer, photo, rating, txt, dt, sentiment, score, keywords, 1, 0, GETUTCDATE(), GETUTCDATE()
  FROM @reviews;

  PRINT 'Inserted 25 sample reviews';
END
GO

-- ─── Sample replies ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [review_replies])
BEGIN
  INSERT INTO [review_replies] ([id],[reviewId],[text],[isAiGenerated],[postedToGoogle],[postedAt],[createdAt],[updatedAt])
  VALUES
  ('rp_001','rev_001',N'Dear Priya, thank you for this wonderful review! We are so happy we could make your anniversary truly special. Our team works tirelessly to create memorable moments, and your kind words mean the world to us. We look forward to celebrating many more milestones with you!',1,1,GETUTCDATE(),GETUTCDATE(),GETUTCDATE()),
  ('rp_002','rev_006',N'Dear Carlos, we sincerely apologize for the experience you described. This is not the standard we hold ourselves to. We have reviewed the incident with our housekeeping and maintenance teams and implemented immediate corrective measures. We would be grateful for the opportunity to make this right — please contact our Guest Relations Manager directly.',1,1,GETUTCDATE(),GETUTCDATE(),GETUTCDATE()),
  ('rp_003','rev_009',N'Dear Sarah, congratulations on your honeymoon! It was our absolute pleasure to make the beginning of your journey together magical. Your happiness is our greatest reward. We wish you a lifetime of love and joy, and we hope to welcome you back for your anniversary celebrations!',0,1,GETUTCDATE(),GETUTCDATE(),GETUTCDATE()),
  ('rp_004','rev_010',N'Dear Omar, we are deeply sorry and embarrassed by the experience you had. The issues you described are completely unacceptable and do not reflect our standards. We have taken serious action with the team involved. Our General Manager will contact you personally to discuss appropriate compensation and resolution.',1,1,GETUTCDATE(),GETUTCDATE(),GETUTCDATE()),
  ('rp_005','rev_017',N'Dear Sunita, we sincerely apologize for the discrepancy between our online photos and your room. This is valuable feedback that we are acting on. We are updating our room photography and reviewing our assignment process to ensure guests receive rooms that match their expectations. Please give us another chance.',1,1,GETUTCDATE(),GETUTCDATE(),GETUTCDATE());

  PRINT 'Inserted sample replies';
END
GO

-- ─── Sample sync logs ────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [sync_logs])
BEGIN
  INSERT INTO [sync_logs] ([id],[status],[reviewsSynced],[newReviews],[updatedReviews],[startedAt],[completedAt],[duration],[triggeredBy])
  VALUES
  ('sl_001','SUCCESS',25,25,0,DATEADD(hour,-1,GETUTCDATE()),DATEADD(minute,-59,GETUTCDATE()),1.820,'manual'),
  ('sl_002','SUCCESS',0, 0, 0,DATEADD(hour,-25,GETUTCDATE()),DATEADD(hour,-25,GETUTCDATE()),0.540,'cron'),
  ('sl_003','SUCCESS',2, 2, 0,DATEADD(hour,-49,GETUTCDATE()),DATEADD(hour,-49,GETUTCDATE()),1.120,'cron'),
  ('sl_004','FAILED',  0, 0, 0,DATEADD(hour,-73,GETUTCDATE()),DATEADD(hour,-73,GETUTCDATE()),0.230,'cron');

  PRINT 'Inserted sync logs';
END
GO

-- ─── Welcome notifications ───────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [notifications])
BEGIN
  INSERT INTO [notifications] ([id],[type],[title],[message],[isRead],[reviewId],[createdAt])
  VALUES
  (NEWID(),'SYSTEM',     N'Welcome to eGlobe Reviews!',  N'Your review management system is ready. Connect your Google Business Profile to start fetching real reviews.',0,NULL,GETUTCDATE()),
  (NEWID(),'SYNC_COMPLETE',N'Initial data loaded',       N'25 sample reviews have been loaded into the system. Connect Google to sync live reviews.',0,NULL,GETUTCDATE()),
  (NEWID(),'NEGATIVE_REVIEW',N'⚠️ Negative review needs attention', N'Carlos Mendez left a 2-star review that requires a response.',0,'rev_006',DATEADD(day,-12,GETUTCDATE())),
  (NEWID(),'NEGATIVE_REVIEW',N'⚠️ 1-star review from Omar Abdullah', N'Omar Abdullah left a 1-star review that needs urgent attention.',0,'rev_010',DATEADD(day,-20,GETUTCDATE()));

  PRINT 'Inserted notifications';
END
GO

PRINT '=== Seed 001 applied successfully ===';

-- ─── Verification ────────────────────────────────────────────
SELECT 'users'          AS tbl, COUNT(*) AS rows FROM [users]          UNION ALL
SELECT 'reviews',              COUNT(*)         FROM [reviews]         UNION ALL
SELECT 'review_replies',       COUNT(*)         FROM [review_replies]  UNION ALL
SELECT 'notifications',        COUNT(*)         FROM [notifications]   UNION ALL
SELECT 'sync_logs',            COUNT(*)         FROM [sync_logs]       UNION ALL
SELECT 'settings',             COUNT(*)         FROM [settings];
GO
