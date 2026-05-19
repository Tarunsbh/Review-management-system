-- ============================================================
-- eGlobe Review Management System
-- Seed Data — Realistic demo dataset
-- ============================================================
-- bcrypt hash of "admin" (rounds=10):
--   $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_ALL_TABLES';

-- ============================================================
-- 1. Users
-- ============================================================

INSERT INTO `users` (`id`, `email`, `name`, `password`, `role`, `is_active`, `last_login`)
VALUES
  ('user_admin_001', 'admin@admin.com',
   'Admin User',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'ADMIN', 1, NOW()),
  ('user_mgr_001', 'manager@eglobe.com',
   'Hotel Manager',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'MANAGER', 1, NULL)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================
-- 2. Business Info
-- ============================================================

INSERT INTO `business_info`
  (`id`, `name`, `address`, `phone`, `email`, `website`, `industry`, `description`)
VALUES
  ('biz_001',
   'eGlobe Hotel & Resorts',
   '123 Luxury Boulevard, Bandra West, Mumbai 400050, Maharashtra, India',
   '+91 98765 43210',
   'info@eglobe.com',
   'https://eglobe.com',
   'hotel',
   'A premier 5-star luxury hotel offering world-class amenities, fine dining, a rooftop infinity pool, and an award-winning spa in the heart of Mumbai.')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================
-- 3. Settings
-- ============================================================

INSERT INTO `settings` (`id`, `section`, `data`)
VALUES
  ('set_google', 'google', JSON_OBJECT(
    'apiKey',         '',
    'clientId',       '',
    'clientSecret',   '',
    'placeId',        '',
    'accountId',      '',
    'locationId',     '',
    'isConnected',    false,
    'autoSync',       true,
    'syncInterval',   'hourly'
  )),
  ('set_openai', 'openai', JSON_OBJECT(
    'apiKey',         '',
    'model',          'gpt-4o-mini',
    'temperature',    0.7,
    'maxTokens',      500,
    'defaultTone',    'professional',
    'autoSuggest',    true
  )),
  ('set_email', 'email', JSON_OBJECT(
    'smtpHost',     'smtp.gmail.com',
    'smtpPort',     587,
    'smtpUsername', '',
    'smtpPassword', '',
    'fromEmail',    'reviews@eglobe.com',
    'fromName',     'eGlobe Reviews',
    'isVerified',   false
  )),
  ('set_business', 'business', JSON_OBJECT(
    'name',        'eGlobe Hotel & Resorts',
    'address',     '123 Luxury Boulevard, Bandra West, Mumbai 400050',
    'phone',       '+91 98765 43210',
    'email',       'info@eglobe.com',
    'website',     'https://eglobe.com',
    'industry',    'hotel',
    'description', 'A premier 5-star luxury hotel in Mumbai'
  )),
  ('set_notifications', 'notifications', JSON_OBJECT(
    'emailNotifications',  true,
    'newReviewAlert',      true,
    'negativeReviewAlert', true,
    'weeklyReport',        false,
    'monthlyReport',       true,
    'slackWebhook',        '',
    'whatsappNumber',      ''
  ))
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================
-- 4. Google Auth (demo disconnected state)
-- ============================================================

INSERT INTO `google_auth`
  (`id`, `is_connected`, `account_name`, `location_name`)
VALUES
  ('ga_001', 0, 'eGlobe Hotel & Resorts', 'Mumbai Main Branch')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================
-- 5. Reviews  (50 realistic reviews spanning 12 months)
-- ============================================================

INSERT INTO `reviews`
  (`id`, `google_review_id`, `reviewer_name`, `reviewer_photo_url`,
   `rating`, `text`, `published_at`, `sentiment`, `sentiment_score`, `keywords`)
VALUES

-- 5-star reviews
('rev_001','gr_001','Sarah Johnson',
 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=6366f1&color=fff',
 5,'Absolutely incredible stay! The staff was welcoming and professional. The room was spotless and beautifully decorated. The rooftop infinity pool is breathtaking at sunset. Best hotel experience I have ever had!',
 DATE_SUB(NOW(), INTERVAL 2 HOUR),'POSITIVE',0.97,JSON_ARRAY('staff','pool','clean','sunset')),

('rev_002','gr_002','Michael Chen',
 'https://ui-avatars.com/api/?name=Michael+Chen&background=6366f1&color=fff',
 5,'Outstanding service from check-in to check-out. The breakfast buffet was an absolute feast — incredible variety. Location is perfect for business and leisure. Will definitely return!',
 DATE_SUB(NOW(), INTERVAL 6 HOUR),'POSITIVE',0.95,JSON_ARRAY('breakfast','location','service')),

('rev_003','gr_003','Emma Williams',
 'https://ui-avatars.com/api/?name=Emma+Williams&background=6366f1&color=fff',
 5,'Spent our anniversary here and it was magical. The spa treatment was divine, the restaurant food was exceptional. Staff remembered our names throughout — incredible personal touch.',
 DATE_SUB(NOW(), INTERVAL 12 HOUR),'POSITIVE',0.96,JSON_ARRAY('spa','restaurant','staff','anniversary')),

('rev_004','gr_004','David Martinez',
 'https://ui-avatars.com/api/?name=David+Martinez&background=6366f1&color=fff',
 5,'Perfect business hotel. Lightning-fast WiFi, excellent meeting room facilities, and the most comfortable bed I have slept in while travelling. The 24-hour room service is a lifesaver.',
 DATE_SUB(NOW(), INTERVAL 18 HOUR),'POSITIVE',0.94,JSON_ARRAY('wifi','room','service','comfortable')),

('rev_005','gr_005','Priya Patel',
 'https://ui-avatars.com/api/?name=Priya+Patel&background=6366f1&color=fff',
 5,'Stunning property. The lobby design alone is worth visiting. The concierge went above and beyond to arrange a surprise birthday setup for my husband. Truly five-star service.',
 DATE_SUB(NOW(), INTERVAL 1 DAY),'POSITIVE',0.98,JSON_ARRAY('lobby','concierge','birthday','service')),

-- 4-star reviews
('rev_006','gr_006','James Wilson',
 'https://ui-avatars.com/api/?name=James+Wilson&background=6366f1&color=fff',
 4,'Great hotel overall. Rooms are spacious and well-appointed. Breakfast was delicious. My only minor complaint is that WiFi in the room could be faster. Would still highly recommend.',
 DATE_SUB(NOW(), INTERVAL 2 DAY),'POSITIVE',0.82,JSON_ARRAY('rooms','breakfast','wifi')),

('rev_007','gr_007','Olivia Brown',
 'https://ui-avatars.com/api/?name=Olivia+Brown&background=6366f1&color=fff',
 4,'Wonderful stay. The pool area is beautiful. Staff very helpful when I had a request. Checkout process was slightly slow but overall a very positive experience.',
 DATE_SUB(NOW(), INTERVAL 3 DAY),'POSITIVE',0.80,JSON_ARRAY('pool','staff','checkout')),

('rev_008','gr_008','Noah Davis',
 'https://ui-avatars.com/api/?name=Noah+Davis&background=6366f1&color=fff',
 4,'Excellent location. Rooms are well designed. The gym could use more equipment but the spa more than makes up for it. Breakfast had great variety.',
 DATE_SUB(NOW(), INTERVAL 4 DAY),'POSITIVE',0.79,JSON_ARRAY('location','gym','spa','breakfast')),

('rev_009','gr_009','Sophia Taylor',
 'https://ui-avatars.com/api/?name=Sophia+Taylor&background=6366f1&color=fff',
 4,'Very comfortable stay. The bed was incredibly soft. Restaurant serves excellent Indian cuisine. The bar has a great selection. Will be back next time I am in Mumbai.',
 DATE_SUB(NOW(), INTERVAL 5 DAY),'POSITIVE',0.83,JSON_ARRAY('comfortable','restaurant','bar')),

('rev_010','gr_010','Liam Anderson',
 'https://ui-avatars.com/api/?name=Liam+Anderson&background=6366f1&color=fff',
 4,'Good value for a 5-star hotel. Service is attentive. The only thing I would change is more English-language TV channels. But that is a very minor point.',
 DATE_SUB(NOW(), INTERVAL 6 DAY),'POSITIVE',0.76,JSON_ARRAY('service','value')),

-- 3-star reviews
('rev_011','gr_011','Ava Thomas',
 'https://ui-avatars.com/api/?name=Ava+Thomas&background=6366f1&color=fff',
 3,'Mixed experience. The room was clean and the bed comfortable. However the air conditioning made a noise that disturbed my sleep. Staff were apologetic and moved me, but it caused some inconvenience.',
 DATE_SUB(NOW(), INTERVAL 7 DAY),'NEUTRAL',0.50,JSON_ARRAY('clean','ac','noise','staff')),

('rev_012','gr_012','Ethan Jackson',
 'https://ui-avatars.com/api/?name=Ethan+Jackson&background=6366f1&color=fff',
 3,'Decent stay. Nothing particularly wrong but nothing exceptional either. Expected more for the price. Breakfast was good, room was adequate, service was average.',
 DATE_SUB(NOW(), INTERVAL 8 DAY),'NEUTRAL',0.48,JSON_ARRAY('breakfast','price','room')),

('rev_013','gr_013','Isabella White',
 'https://ui-avatars.com/api/?name=Isabella+White&background=6366f1&color=fff',
 3,'The property looks great from photos but in person some areas feel dated. The lobby is gorgeous but our room needed some updating. Staff were friendly though.',
 DATE_SUB(NOW(), INTERVAL 9 DAY),'NEUTRAL',0.52,JSON_ARRAY('lobby','room','staff')),

-- 2-star reviews
('rev_014','gr_014','Mason Harris',
 'https://ui-avatars.com/api/?name=Mason+Harris&background=6366f1&color=fff',
 2,'Disappointing experience. Room was not as clean as expected for a hotel of this calibre. The bathroom had hair in the drain and the sheets had a stain. Housekeeping should be more thorough.',
 DATE_SUB(NOW(), INTERVAL 10 DAY),'NEGATIVE',0.18,JSON_ARRAY('clean','bathroom','housekeeping')),

('rev_015','gr_015','Mia Martin',
 'https://ui-avatars.com/api/?name=Mia+Martin&background=6366f1&color=fff',
 2,'Very slow service at the restaurant. Waited 45 minutes for a main course and the food arrived cold. When I complained, the staff were dismissive. Not what I expected.',
 DATE_SUB(NOW(), INTERVAL 11 DAY),'NEGATIVE',0.15,JSON_ARRAY('restaurant','service','slow','food')),

-- 1-star review
('rev_016','gr_016','Lucas Garcia',
 'https://ui-avatars.com/api/?name=Lucas+Garcia&background=6366f1&color=fff',
 1,'Terrible experience from start to finish. Noisy room facing the street, rude front desk staff when I asked to change, and checkout took over an hour. Paid premium rates for a substandard experience. Will not return.',
 DATE_SUB(NOW(), INTERVAL 12 DAY),'NEGATIVE',0.05,JSON_ARRAY('noise','staff','checkout','rude')),

-- More positive reviews
('rev_017','gr_017','Charlotte Lee',
 'https://ui-avatars.com/api/?name=Charlotte+Lee&background=6366f1&color=fff',
 5,'Honeymoon stay. The team prepared our room with rose petals and champagne. Every detail was perfect. The ocean view from our balcony was spectacular. Unforgettable.',
 DATE_SUB(NOW(), INTERVAL 13 DAY),'POSITIVE',0.99,JSON_ARRAY('honeymoon','view','balcony','champagne')),

('rev_018','gr_018','Aiden King',
 'https://ui-avatars.com/api/?name=Aiden+King&background=6366f1&color=fff',
 5,'Impeccable. From the moment I arrived the service never faltered. Every staff member I encountered was courteous, knowledgeable and genuinely warm. The food at the rooftop restaurant is world-class.',
 DATE_SUB(NOW(), INTERVAL 14 DAY),'POSITIVE',0.97,JSON_ARRAY('service','staff','restaurant','rooftop')),

('rev_019','gr_019','Ella Scott',
 'https://ui-avatars.com/api/?name=Ella+Scott&background=6366f1&color=fff',
 4,'Fantastic property in a great location. The spa is excellent — I had the Ayurvedic massage and felt completely rejuvenated. Breakfast variety could be improved slightly but overall a great stay.',
 DATE_SUB(NOW(), INTERVAL 15 DAY),'POSITIVE',0.84,JSON_ARRAY('spa','massage','breakfast','location')),

('rev_020','gr_020','Henry Adams',
 'https://ui-avatars.com/api/?name=Henry+Adams&background=6366f1&color=fff',
 5,'First time visiting Mumbai and this hotel made it unforgettable. The local tours the concierge arranged were amazing. The hotel itself is beautiful, clean and luxurious.',
 DATE_SUB(NOW(), INTERVAL 16 DAY),'POSITIVE',0.96,JSON_ARRAY('concierge','tour','clean','luxurious')),

('rev_021','gr_021','Amelia Nelson',
 'https://ui-avatars.com/api/?name=Amelia+Nelson&background=6366f1&color=fff',
 5,'Attended a corporate event here. The event team was incredibly professional and the catering was superb. The banquet hall is stunning. Will definitely recommend for corporate events.',
 DATE_SUB(NOW(), INTERVAL 17 DAY),'POSITIVE',0.95,JSON_ARRAY('event','catering','banquet','corporate')),

('rev_022','gr_022','Benjamin Carter',
 'https://ui-avatars.com/api/?name=Benjamin+Carter&background=6366f1&color=fff',
 4,'Lovely hotel. The evening cocktails at the rooftop bar were a highlight. Great ambience, skilled bartenders and fantastic views of the city. Highly recommended.',
 DATE_SUB(NOW(), INTERVAL 18 DAY),'POSITIVE',0.86,JSON_ARRAY('cocktails','bar','rooftop','views')),

('rev_023','gr_023','Chloe Mitchell',
 'https://ui-avatars.com/api/?name=Chloe+Mitchell&background=6366f1&color=fff',
 5,'Truly exceptional. I travel extensively for work and eGlobe consistently delivers the best experience. The turn-down service, pillow menu, and personalised welcome note make all the difference.',
 DATE_SUB(NOW(), INTERVAL 20 DAY),'POSITIVE',0.98,JSON_ARRAY('turndown','pillow','personalised','service')),

('rev_024','gr_024','Daniel Perez',
 'https://ui-avatars.com/api/?name=Daniel+Perez&background=6366f1&color=fff',
 3,'Decent hotel but not worth the premium price in my opinion. Room was clean and well-maintained. Service was hit or miss depending on which staff member you encountered.',
 DATE_SUB(NOW(), INTERVAL 22 DAY),'NEUTRAL',0.45,JSON_ARRAY('price','clean','service')),

('rev_025','gr_025','Emily Roberts',
 'https://ui-avatars.com/api/?name=Emily+Roberts&background=6366f1&color=fff',
 5,'The children loved the kids club and the pool. As parents we were able to truly relax knowing they were safe and entertained. Family-friendly luxury hotel at its best.',
 DATE_SUB(NOW(), INTERVAL 24 DAY),'POSITIVE',0.96,JSON_ARRAY('kids','pool','family','relax')),

('rev_026','gr_026','Frank Turner',
 'https://ui-avatars.com/api/?name=Frank+Turner&background=6366f1&color=fff',
 2,'The AC in my room broke on night one. Maintenance took 4 hours to fix it. I was not offered any compensation or apology. Unacceptable for a hotel at this price point.',
 DATE_SUB(NOW(), INTERVAL 26 DAY),'NEGATIVE',0.12,JSON_ARRAY('ac','maintenance','compensation')),

('rev_027','gr_027','Grace Young',
 'https://ui-avatars.com/api/?name=Grace+Young&background=6366f1&color=fff',
 5,'Celebrated my 50th birthday here. The staff organised a beautiful cake surprise and the entire team sang happy birthday. I was moved to tears. Exceptional personal service.',
 DATE_SUB(NOW(), INTERVAL 28 DAY),'POSITIVE',0.99,JSON_ARRAY('birthday','staff','surprise','personal')),

('rev_028','gr_028','Harry Collins',
 'https://ui-avatars.com/api/?name=Harry+Collins&background=6366f1&color=fff',
 4,'Good hotel. Pool and gym are well maintained. Breakfast is excellent. The only thing stopping a 5-star is the parking situation — very limited spaces.',
 DATE_SUB(NOW(), INTERVAL 30 DAY),'POSITIVE',0.78,JSON_ARRAY('pool','gym','breakfast','parking')),

('rev_029','gr_029','Iris Moore',
 'https://ui-avatars.com/api/?name=Iris+Moore&background=6366f1&color=fff',
 5,'Luxury redefined. Everything from the thread-count of the sheets to the scent in the lobby is curated to perfection. The attention to detail here is unmatched.',
 DATE_SUB(NOW(), INTERVAL 32 DAY),'POSITIVE',0.97,JSON_ARRAY('luxury','detail','sheets','lobby')),

('rev_030','gr_030','Jack Thompson',
 'https://ui-avatars.com/api/?name=Jack+Thompson&background=6366f1&color=fff',
 5,'The in-room dining menu is fantastic. I ordered room service three times and it was always delivered promptly, hot and beautifully presented. The club sandwich is a must-try!',
 DATE_SUB(NOW(), INTERVAL 35 DAY),'POSITIVE',0.93,JSON_ARRAY('room service','food','menu','prompt')),

('rev_031','gr_031','Karen Evans',
 'https://ui-avatars.com/api/?name=Karen+Evans&background=6366f1&color=fff',
 4,'Stayed for a week for work. The hotel made it feel like a home away from home. Laundry service was efficient, gym was great, and the in-house cafe is perfect for morning calls.',
 DATE_SUB(NOW(), INTERVAL 38 DAY),'POSITIVE',0.81,JSON_ARRAY('laundry','gym','cafe','home')),

('rev_032','gr_032','Leo Martinez',
 'https://ui-avatars.com/api/?name=Leo+Martinez&background=6366f1&color=fff',
 1,'Absolutely dreadful. Booked a sea-view room, was given a road-facing room. When I showed my booking confirmation, the manager was unhelpful and offered no solution. Complete waste of money.',
 DATE_SUB(NOW(), INTERVAL 40 DAY),'NEGATIVE',0.04,JSON_ARRAY('room','view','manager','booking')),

('rev_033','gr_033','Luna Phillips',
 'https://ui-avatars.com/api/?name=Luna+Phillips&background=6366f1&color=fff',
 5,'The weekend brunch at Sky Restaurant is phenomenal. The live music, the spread of food, the views — everything combined to make it a truly special experience.',
 DATE_SUB(NOW(), INTERVAL 42 DAY),'POSITIVE',0.96,JSON_ARRAY('brunch','restaurant','music','views','food')),

('rev_034','gr_034','Mark Campbell',
 'https://ui-avatars.com/api/?name=Mark+Campbell&background=6366f1&color=fff',
 5,'Executive suite was absolutely worth the upgrade. The private lounge access, the butler service, the panoramic views — it is a completely different level of experience.',
 DATE_SUB(NOW(), INTERVAL 45 DAY),'POSITIVE',0.97,JSON_ARRAY('suite','butler','lounge','views')),

('rev_035','gr_035','Nina Richardson',
 'https://ui-avatars.com/api/?name=Nina+Richardson&background=6366f1&color=fff',
 3,'The hotel is beautiful but my room had a musty smell that persisted despite housekeeping. When I raised it they sprayed air freshener which did not help. Should have been offered a room change.',
 DATE_SUB(NOW(), INTERVAL 48 DAY),'NEUTRAL',0.40,JSON_ARRAY('smell','housekeeping','room')),

('rev_036','gr_036','Oscar Stewart',
 'https://ui-avatars.com/api/?name=Oscar+Stewart&background=6366f1&color=fff',
 5,'Just returned from my third stay and the quality never wavers. The signature eGlobe welcome drink, the personalised amenities — they have mastered the art of luxury hospitality.',
 DATE_SUB(NOW(), INTERVAL 50 DAY),'POSITIVE',0.98,JSON_ARRAY('welcome','personalised','luxury','repeat')),

('rev_037','gr_037','Penelope Wright',
 'https://ui-avatars.com/api/?name=Penelope+Wright&background=6366f1&color=fff',
 4,'Wonderful stay. The afternoon tea experience in the lobby lounge was delightful. The chef prepared beautiful pastries and the selection of teas was impressive.',
 DATE_SUB(NOW(), INTERVAL 53 DAY),'POSITIVE',0.85,JSON_ARRAY('tea','lobby','lounge','pastries','chef')),

('rev_038','gr_038','Quinn Baker',
 'https://ui-avatars.com/api/?name=Quinn+Baker&background=6366f1&color=fff',
 2,'Disappointed with the check-in experience. Queue was very long, no dedicated fast track for returning guests. It took nearly 30 minutes. This is unacceptable at a 5-star property.',
 DATE_SUB(NOW(), INTERVAL 55 DAY),'NEGATIVE',0.20,JSON_ARRAY('checkin','queue','wait','service')),

('rev_039','gr_039','Rose Gonzalez',
 'https://ui-avatars.com/api/?name=Rose+Gonzalez&background=6366f1&color=fff',
 5,'The pillow menu alone makes this hotel worth it! The blackout curtains are perfect. The mattress technology is incredible. Best sleep I have had in years.',
 DATE_SUB(NOW(), INTERVAL 58 DAY),'POSITIVE',0.95,JSON_ARRAY('pillow','sleep','curtains','mattress')),

('rev_040','gr_040','Samuel Rivera',
 'https://ui-avatars.com/api/?name=Samuel+Rivera&background=6366f1&color=fff',
 5,'Corporate retreat organised here. The team handled everything flawlessly. Event coordinators were responsive and creative. The gala dinner was spectacular.',
 DATE_SUB(NOW(), INTERVAL 60 DAY),'POSITIVE',0.96,JSON_ARRAY('corporate','event','gala','coordinator')),

('rev_041','gr_041','Tina Flores',
 'https://ui-avatars.com/api/?name=Tina+Flores&background=6366f1&color=fff',
 4,'Beautiful hotel in a prime location. Staff are attentive. The rooftop pool is the best I have seen in Mumbai. Only giving 4 stars as the coffee in the room was not great.',
 DATE_SUB(NOW(), INTERVAL 62 DAY),'POSITIVE',0.80,JSON_ARRAY('pool','rooftop','location','coffee')),

('rev_042','gr_042','Uma Walker',
 'https://ui-avatars.com/api/?name=Uma+Walker&background=6366f1&color=fff',
 5,'The Ayurvedic spa here deserves its own rating. Completely transformed my wellbeing over 3 days. The therapists are world-class and the products are of exceptional quality.',
 DATE_SUB(NOW(), INTERVAL 65 DAY),'POSITIVE',0.97,JSON_ARRAY('spa','ayurveda','wellness','therapist')),

('rev_043','gr_043','Victor Allen',
 'https://ui-avatars.com/api/?name=Victor+Allen&background=6366f1&color=fff',
 3,'Average experience. The hotel has all the right facilities but they felt understaffed during my visit. Long waits at the restaurant and pool bar. Management should address this.',
 DATE_SUB(NOW(), INTERVAL 68 DAY),'NEUTRAL',0.42,JSON_ARRAY('understaffed','restaurant','bar','wait')),

('rev_044','gr_044','Wendy Hill',
 'https://ui-avatars.com/api/?name=Wendy+Hill&background=6366f1&color=fff',
 5,'Completely faultless. Every single interaction with the staff was positive. The food across all three restaurants was phenomenal. Exceeded expectations in every department.',
 DATE_SUB(NOW(), INTERVAL 70 DAY),'POSITIVE',0.99,JSON_ARRAY('food','staff','restaurant','faultless')),

('rev_045','gr_045','Xavier Lewis',
 'https://ui-avatars.com/api/?name=Xavier+Lewis&background=6366f1&color=fff',
 4,'Excellent weekend getaway. The pool brunch on Sunday is not to be missed. Live DJ, incredible food and cocktails. The only thing missing was more shade around the pool area.',
 DATE_SUB(NOW(), INTERVAL 73 DAY),'POSITIVE',0.82,JSON_ARRAY('pool','brunch','DJ','cocktails')),

('rev_046','gr_046','Yasmine Clark',
 'https://ui-avatars.com/api/?name=Yasmine+Clark&background=6366f1&color=fff',
 5,'The Junior Suite was spectacular — a proper living room, dressing area and the most gorgeous bathroom I have ever seen. Worth every penny. I will be back for my anniversary.',
 DATE_SUB(NOW(), INTERVAL 76 DAY),'POSITIVE',0.96,JSON_ARRAY('suite','bathroom','anniversary','luxurious')),

('rev_047','gr_047','Zachary Turner',
 'https://ui-avatars.com/api/?name=Zachary+Turner&background=6366f1&color=fff',
 2,'Food quality at the main restaurant has declined. Had a meal here 2 years ago that was extraordinary. This visit the same dishes were mediocre and overpriced. Very disappointing.',
 DATE_SUB(NOW(), INTERVAL 80 DAY),'NEGATIVE',0.22,JSON_ARRAY('food','restaurant','quality','overpriced')),

('rev_048','gr_048','Alice Barnes',
 'https://ui-avatars.com/api/?name=Alice+Barnes&background=6366f1&color=fff',
 5,'The sustainability initiatives here impressed me greatly. Solar-powered rooftop, water recycling, organic produce in the kitchen. Luxurious AND responsible. Rare combination.',
 DATE_SUB(NOW(), INTERVAL 84 DAY),'POSITIVE',0.95,JSON_ARRAY('sustainable','solar','organic','responsible')),

('rev_049','gr_049','Brian Cooper',
 'https://ui-avatars.com/api/?name=Brian+Cooper&background=6366f1&color=fff',
 4,'Great business hotel. The co-working lounge is a brilliant addition — fast internet, great coffee and a productive atmosphere. Perfect for remote work between meetings.',
 DATE_SUB(NOW(), INTERVAL 88 DAY),'POSITIVE',0.84,JSON_ARRAY('coworking','internet','coffee','business')),

('rev_050','gr_050','Carol Sanders',
 'https://ui-avatars.com/api/?name=Carol+Sanders&background=6366f1&color=fff',
 5,'Truly a home away from home. The warmth of the staff, the quality of every facility, the thoughtfulness in every detail. This is what true hospitality looks like.',
 DATE_SUB(NOW(), INTERVAL 92 DAY),'POSITIVE',0.98,JSON_ARRAY('warm','staff','hospitality','home'));

-- ============================================================
-- 6. Review Replies  (for selected reviews)
-- ============================================================

INSERT INTO `review_replies`
  (`id`, `review_id`, `text`, `is_ai_generated`, `posted_to_google`, `posted_at`)
VALUES
  ('rpl_001', 'rev_001',
   'Dear Sarah,\n\nThank you so much for this wonderful review! We are delighted that your stay exceeded expectations. Your kind words about our team and facilities mean a great deal to us and will be shared with the entire staff.\n\nWe look forward to welcoming you back to eGlobe very soon!\n\nWarm regards,\nManagement, eGlobe Hotel & Resorts',
   1, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),

  ('rpl_002', 'rev_002',
   'Dear Michael,\n\nThank you for your kind review! We are thrilled you enjoyed our breakfast spread and found the location convenient. We pride ourselves on seamless service throughout our guests\' stay.\n\nWe hope to see you again!\n\nBest regards,\nManagement',
   0, 1, DATE_SUB(NOW(), INTERVAL 4 HOUR)),

  ('rpl_003', 'rev_003',
   'Dear Emma,\n\nThank you for celebrating your anniversary with us! It was our honour to be part of this special occasion. We are so pleased the spa, restaurant and our team all contributed to creating a magical memory.\n\nWishing you many more happy years together, and we look forward to welcoming you back!\n\nWith warm wishes,\neGlobe Hotel & Resorts',
   1, 1, DATE_SUB(NOW(), INTERVAL 10 HOUR)),

  ('rpl_005', 'rev_005',
   'Dear Priya,\n\nThank you for your beautiful review! It was our concierge team''s absolute pleasure to help arrange a special birthday surprise. Moments like these are what inspire us every day.\n\nWe hope your husband had a wonderful birthday, and we look forward to being part of many more special occasions!\n\nWarmly,\neGlobe Hotel & Resorts',
   1, 1, DATE_SUB(NOW(), INTERVAL 20 HOUR)),

  ('rpl_014', 'rev_014',
   'Dear Mason,\n\nThank you for your honest feedback. We are deeply sorry that our housekeeping standards fell short during your visit. This is not the experience we aim to provide, and we take your comments very seriously.\n\nWe have addressed this directly with our housekeeping management team. We would welcome the opportunity to host you again and demonstrate our true standards.\n\nSincerely,\nManagement, eGlobe Hotel & Resorts',
   0, 1, DATE_SUB(NOW(), INTERVAL 9 DAY)),

  ('rpl_016', 'rev_016',
   'Dear Lucas,\n\nThank you for sharing your experience. We sincerely apologise for the multiple issues you encountered. The noise, service and extended checkout time you described are unacceptable and do not reflect our standards.\n\nWe would very much appreciate the opportunity to speak with you directly. Please contact our Guest Relations team at guestrelations@eglobe.com.\n\nWith sincere apologies,\nManagement, eGlobe Hotel & Resorts',
   1, 1, DATE_SUB(NOW(), INTERVAL 11 DAY)),

  ('rpl_027', 'rev_027',
   'Dear Grace,\n\nThank you for such a heartwarming review! We are so touched that we could be part of your 50th birthday celebration. Your happiness is our greatest reward.\n\nHappy Birthday once again, and we hope to celebrate many more milestones with you!\n\nWith love and warmth,\nThe eGlobe Family',
   1, 1, DATE_SUB(NOW(), INTERVAL 27 DAY)),

  ('rpl_032', 'rev_032',
   'Dear Leo,\n\nWe sincerely apologise for the room allocation error and for the unhelpful response you received when you raised it. This is not the standard of service we hold ourselves to.\n\nWe would like to investigate this further and offer you an appropriate resolution. Please reach out to us at guestrelations@eglobe.com with your booking reference.\n\nWith sincere apologies,\nManagement',
   0, 1, DATE_SUB(NOW(), INTERVAL 39 DAY));

-- ============================================================
-- 7. AI Reply History
-- ============================================================

INSERT INTO `ai_reply_history`
  (`id`, `review_id`, `generated_reply`, `tone`, `model`, `tokens_used`, `processing_time`, `was_used`)
VALUES
  ('ai_001', 'rev_001',
   'Dear Sarah, Thank you for this magnificent 5-star review. We are overjoyed to hear your stay was exceptional...',
   'professional', 'gpt-4o-mini', 187, 1.23, 1),

  ('ai_002', 'rev_001',
   'Hi Sarah! Wow, we are absolutely thrilled to read this amazing review! Your kind words have literally made our entire team smile...',
   'friendly', 'gpt-4o-mini', 142, 0.98, 0),

  ('ai_003', 'rev_014',
   'Dear Mason, We sincerely apologise for the housekeeping shortfall you experienced. This falls far below our expected standards...',
   'empathetic', 'gpt-4o-mini', 215, 1.45, 0),

  ('ai_004', 'rev_016',
   'Dear Lucas, We are profoundly sorry for the deeply unsatisfactory experience you encountered during your stay...',
   'professional', 'gpt-4o-mini', 198, 1.31, 1),

  ('ai_005', 'rev_005',
   'Most Esteemed Priya, It is with the deepest gratitude that we acknowledge your gracious review...',
   'luxury', 'gpt-4o-mini', 224, 1.56, 1);

-- ============================================================
-- 8. Sync Logs
-- ============================================================

INSERT INTO `sync_logs`
  (`id`, `status`, `reviews_synced`, `new_reviews`, `updated_reviews`,
   `started_at`, `completed_at`, `duration`, `triggered_by`)
VALUES
  ('sync_001','SUCCESS',50, 5,2, DATE_SUB(NOW(), INTERVAL 2 HOUR),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 HOUR), INTERVAL 3 SECOND),  3.21,'cron'),
  ('sync_002','SUCCESS',50, 2,1, DATE_SUB(NOW(), INTERVAL 26 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 26 HOUR), INTERVAL 3 SECOND), 2.87,'cron'),
  ('sync_003','FAILED', 0, 0,0, DATE_SUB(NOW(), INTERVAL 50 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 50 HOUR), INTERVAL 1 SECOND), 0.92,'cron'),
  ('sync_004','SUCCESS',50, 7,3, DATE_SUB(NOW(), INTERVAL 74 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 74 HOUR), INTERVAL 4 SECOND), 4.12,'manual'),
  ('sync_005','SUCCESS',48, 4,2, DATE_SUB(NOW(), INTERVAL 98 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 98 HOUR), INTERVAL 3 SECOND), 2.95,'cron');

UPDATE `sync_logs` SET `errors` = JSON_ARRAY('Rate limit exceeded: 429 from Google API. Retry after 60s.')
WHERE `id` = 'sync_003';

-- ============================================================
-- 9. Notifications
-- ============================================================

INSERT INTO `notifications`
  (`id`, `type`, `title`, `message`, `is_read`, `review_id`)
VALUES
  ('notif_001','NEW_REVIEW',      'New 5-star review from Sarah Johnson',   'Sarah Johnson rated you 5 stars: "Absolutely incredible stay!"',                              0, 'rev_001'),
  ('notif_002','NEGATIVE_REVIEW', '⚠️ 2-star review from Mason Harris',     'Mason Harris left a 2-star review requiring immediate attention.',                            0, 'rev_014'),
  ('notif_003','REPLY_POSTED',    'Reply posted to Emma Williams',           'Your reply to Emma Williams has been posted to Google.',                                       0, 'rev_003'),
  ('notif_004','SYNC_COMPLETE',   'Review sync completed',                   'Sync completed: 5 new reviews fetched from Google Business Profile.',                        1, NULL),
  ('notif_005','NEW_REVIEW',      'New 4-star review from James Wilson',     'James Wilson rated you 4 stars: "Great hotel overall. WiFi a bit slow..."',                   1, 'rev_006'),
  ('notif_006','NEGATIVE_REVIEW', '⚠️ 1-star review from Lucas Garcia',     'Lucas Garcia left a 1-star review. Immediate response recommended.',                          1, 'rev_016'),
  ('notif_007','SYSTEM',          'Weekly report ready',                     'Your weekly review analytics report is ready to view.',                                        1, NULL),
  ('notif_008','NEW_REVIEW',      'New 5-star review from Priya Patel',      'Priya Patel rated you 5 stars: "Stunning property. Concierge went above and beyond."',       1, 'rev_005'),
  ('notif_009','SYNC_COMPLETE',   'Scheduled sync failed',                   'Sync failed due to Google API rate limit. Will retry automatically in 1 hour.',               1, NULL),
  ('notif_010','NEW_REVIEW',      'New 5-star review from David Martinez',   'David Martinez rated you 5 stars: "Perfect business hotel."',                                 1, 'rev_004');

-- ============================================================
-- 10. Analytics Cache (pre-computed summary)
-- ============================================================

INSERT INTO `analytics_cache` (`id`, `cache_key`, `data`, `expires_at`)
VALUES
  ('cache_001', 'analytics_summary', JSON_OBJECT(
    'totalReviews',   50,
    'averageRating',  4.56,
    'positiveCount',  37,
    'negativeCount',  7,
    'neutralCount',   6,
    'repliedCount',   8,
    'unrepliedCount', 42,
    'replyRate',      16.0,
    'ratingTrend',    5.2,
    'reviewGrowth',   18.3
  ), DATE_ADD(NOW(), INTERVAL 1 HOUR)),

  ('cache_002', 'rating_distribution', JSON_ARRAY(
    JSON_OBJECT('rating', 5, 'count', 28, 'percentage', 56.0),
    JSON_OBJECT('rating', 4, 'count', 9,  'percentage', 18.0),
    JSON_OBJECT('rating', 3, 'count', 6,  'percentage', 12.0),
    JSON_OBJECT('rating', 2, 'count', 4,  'percentage', 8.0),
    JSON_OBJECT('rating', 1, 'count', 3,  'percentage', 6.0)
  ), DATE_ADD(NOW(), INTERVAL 6 HOUR))
ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `expires_at` = VALUES(`expires_at`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Verification queries
-- ============================================================

SELECT '=== Seed Verification ===' AS '';
SELECT CONCAT(COUNT(*), ' users')         AS result FROM users;
SELECT CONCAT(COUNT(*), ' reviews')       AS result FROM reviews;
SELECT CONCAT(COUNT(*), ' replies')       AS result FROM review_replies;
SELECT CONCAT(COUNT(*), ' ai_history')    AS result FROM ai_reply_history;
SELECT CONCAT(COUNT(*), ' sync_logs')     AS result FROM sync_logs;
SELECT CONCAT(COUNT(*), ' notifications') AS result FROM notifications;
SELECT CONCAT(COUNT(*), ' settings')      AS result FROM settings;
SELECT CONCAT(ROUND(AVG(rating),2), ' avg_rating') AS result FROM reviews;
