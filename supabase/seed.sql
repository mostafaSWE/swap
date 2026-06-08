-- ════════════════════════════════════════════════════════════════════════
-- Swap — seed data
-- Run AFTER 0001_schema, 0002_rls, 0003_storage.
--
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING).
-- The fixed UUIDs here MATCH packages/config (countries/cities/categories),
-- so the app constants and the database never drift.
--
-- Demo auth users are created with password:  Swap1234!
-- (emails are *.demo — change before any real deployment).
-- ════════════════════════════════════════════════════════════════════════

-- ── Countries ───────────────────────────────────────────────────────────
insert into public.countries (id, name_ar, name_en, iso_code, phone_code, currency_code, timezone, sort_order) values
  ('11111111-1111-4111-8111-000000000001','السعودية','Saudi Arabia','SA','+966','SAR','Asia/Riyadh',1),
  ('11111111-1111-4111-8111-000000000002','الإمارات العربية المتحدة','United Arab Emirates','AE','+971','AED','Asia/Dubai',2),
  ('11111111-1111-4111-8111-000000000003','قطر','Qatar','QA','+974','QAR','Asia/Qatar',3),
  ('11111111-1111-4111-8111-000000000004','الكويت','Kuwait','KW','+965','KWD','Asia/Kuwait',4),
  ('11111111-1111-4111-8111-000000000005','البحرين','Bahrain','BH','+973','BHD','Asia/Bahrain',5),
  ('11111111-1111-4111-8111-000000000006','عُمان','Oman','OM','+968','OMR','Asia/Muscat',6)
on conflict (id) do nothing;

-- ── Cities ──────────────────────────────────────────────────────────────
insert into public.cities (id, country_id, name_ar, name_en, slug, sort_order) values
  ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','الرياض','Riyadh','riyadh',1),
  ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000001','جدة','Jeddah','jeddah',2),
  ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000001','مكة المكرمة','Makkah','makkah',3),
  ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000001','المدينة المنورة','Madinah','madinah',4),
  ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000001','الدمام','Dammam','dammam',5),
  ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000001','الخبر','Khobar','khobar',6),
  ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000001','الطائف','Taif','taif',7),
  ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000001','أبها','Abha','abha',8),
  ('22222222-2222-4222-8222-000000000009','11111111-1111-4111-8111-000000000002','دبي','Dubai','dubai',9),
  ('22222222-2222-4222-8222-000000000010','11111111-1111-4111-8111-000000000002','أبوظبي','Abu Dhabi','abu-dhabi',10),
  ('22222222-2222-4222-8222-000000000011','11111111-1111-4111-8111-000000000002','الشارقة','Sharjah','sharjah',11),
  ('22222222-2222-4222-8222-000000000012','11111111-1111-4111-8111-000000000002','عجمان','Ajman','ajman',12),
  ('22222222-2222-4222-8222-000000000013','11111111-1111-4111-8111-000000000002','رأس الخيمة','Ras Al Khaimah','ras-al-khaimah',13),
  ('22222222-2222-4222-8222-000000000014','11111111-1111-4111-8111-000000000002','الفجيرة','Fujairah','fujairah',14),
  ('22222222-2222-4222-8222-000000000015','11111111-1111-4111-8111-000000000002','أم القيوين','Umm Al Quwain','umm-al-quwain',15),
  ('22222222-2222-4222-8222-000000000016','11111111-1111-4111-8111-000000000003','الدوحة','Doha','doha',16),
  ('22222222-2222-4222-8222-000000000017','11111111-1111-4111-8111-000000000003','الريان','Al Rayyan','al-rayyan',17),
  ('22222222-2222-4222-8222-000000000018','11111111-1111-4111-8111-000000000003','الوكرة','Al Wakrah','al-wakrah',18),
  ('22222222-2222-4222-8222-000000000019','11111111-1111-4111-8111-000000000003','لوسيل','Lusail','lusail',19),
  ('22222222-2222-4222-8222-000000000020','11111111-1111-4111-8111-000000000004','مدينة الكويت','Kuwait City','kuwait-city',20),
  ('22222222-2222-4222-8222-000000000021','11111111-1111-4111-8111-000000000004','حولي','Hawalli','hawalli',21),
  ('22222222-2222-4222-8222-000000000022','11111111-1111-4111-8111-000000000004','السالمية','Salmiya','salmiya',22),
  ('22222222-2222-4222-8222-000000000023','11111111-1111-4111-8111-000000000004','الفروانية','Farwaniya','farwaniya',23),
  ('22222222-2222-4222-8222-000000000024','11111111-1111-4111-8111-000000000005','المنامة','Manama','manama',24),
  ('22222222-2222-4222-8222-000000000025','11111111-1111-4111-8111-000000000005','المحرق','Muharraq','muharraq',25),
  ('22222222-2222-4222-8222-000000000026','11111111-1111-4111-8111-000000000005','الرفاع','Riffa','riffa',26),
  ('22222222-2222-4222-8222-000000000027','11111111-1111-4111-8111-000000000005','مدينة عيسى','Isa Town','isa-town',27),
  ('22222222-2222-4222-8222-000000000028','11111111-1111-4111-8111-000000000006','مسقط','Muscat','muscat',28),
  ('22222222-2222-4222-8222-000000000029','11111111-1111-4111-8111-000000000006','صلالة','Salalah','salalah',29),
  ('22222222-2222-4222-8222-000000000030','11111111-1111-4111-8111-000000000006','صحار','Sohar','sohar',30),
  ('22222222-2222-4222-8222-000000000031','11111111-1111-4111-8111-000000000006','نزوى','Nizwa','nizwa',31)
on conflict (id) do nothing;

-- ── Categories ──────────────────────────────────────────────────────────
insert into public.categories (id, name_ar, name_en, slug, icon, sort_order) values
  ('33333333-3333-4333-8333-000000000001','إلكترونيات','Electronics','electronics','electronics',1),
  ('33333333-3333-4333-8333-000000000002','أثاث','Furniture','furniture','furniture',2),
  ('33333333-3333-4333-8333-000000000003','سيارات','Cars','cars','cars',3),
  ('33333333-3333-4333-8333-000000000004','أجهزة منزلية','Home appliances','home-appliances','appliances',4),
  ('33333333-3333-4333-8333-000000000005','ملابس','Clothing','clothing','clothing',5),
  ('33333333-3333-4333-8333-000000000006','ساعات','Watches','watches','watches',6),
  ('33333333-3333-4333-8333-000000000007','ألعاب','Toys','toys','toys',7),
  ('33333333-3333-4333-8333-000000000008','معدات رياضية','Sports equipment','sports','sports',8),
  ('33333333-3333-4333-8333-000000000009','أخرى','Other','other','other',9)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Demo auth users  (password for all: Swap1234!)
-- Inserting into auth.users fires handle_new_user() which creates the profile.
-- ════════════════════════════════════════════════════════════════════════
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','authenticated','authenticated','ahmed@swap.demo', crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"أحمد العتيبي","username":"ahmed","phone":"+966500000001","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','authenticated','authenticated','sara@swap.demo',  crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"سارة القحطاني","username":"sara","phone":"+966500000002","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','authenticated','authenticated','khalid@swap.demo',crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"خالد المنصوري","username":"khalid","phone":"+971500000003","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','authenticated','authenticated','fatima@swap.demo',crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"فاطمة آل ثاني","username":"fatima","phone":"+974500000004","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','authenticated','authenticated','omar@swap.demo',  crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"عمر الصباح","username":"omar","phone":"+965500000005","preferred_language":"en"}','','','','')
on conflict (id) do nothing;

-- Enrich the auto-created profiles with country/city/verification/admin/bio.
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000001', is_verified=true,  is_admin=true,  bio='مهتم بتبادل الإلكترونيات والساعات.', avatar_url='https://i.pravatar.cc/150?img=12' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000002', is_verified=true,  is_admin=false, bio='أبادل الأثاث والأجهزة المنزلية.',      avatar_url='https://i.pravatar.cc/150?img=45' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000002';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000009', is_verified=false, is_admin=false, bio='Furniture and home items in Dubai.',   avatar_url='https://i.pravatar.cc/150?img=33' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000003';
update public.profiles set country_id='11111111-1111-4111-8111-000000000003', city_id='22222222-2222-4222-8222-000000000016', is_verified=true,  is_admin=false, bio='تبادل الأجهزة والإلكترونيات في الدوحة.', avatar_url='https://i.pravatar.cc/150?img=47' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000004';
update public.profiles set country_id='11111111-1111-4111-8111-000000000004', city_id='22222222-2222-4222-8222-000000000020', is_verified=false, is_admin=false, bio='Electronics and appliances in Kuwait.', avatar_url='https://i.pravatar.cc/150?img=14' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000005';

-- ════════════════════════════════════════════════════════════════════════
-- Demo listings (12)
-- ════════════════════════════════════════════════════════════════════════
insert into public.listings (id, owner_id, category_id, country_id, city_id, title, description, condition, wanted_exchange, status, is_verified_item, is_featured, view_count) values
  ('44444444-4444-4444-8444-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','آيفون 14 برو','آيفون 14 برو 256 جيجابايت بحالة ممتازة مع العلبة.','used','جهاز سامسونج S23 أو لابتوب','active',true,true,142),
  ('44444444-4444-4444-8444-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','غسالة أوتوماتيك','غسالة 8 كيلو تعمل بكفاءة، نظيفة جدًا.','used','ثلاجة أو مايكروويف','active',false,false,58),
  ('44444444-4444-4444-8444-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','طقم غرفة نوم','طقم غرفة نوم خشب كامل بحالة جيدة.','used','أثاث مجلس أو طاولة طعام','active',false,true,77),
  ('44444444-4444-4444-8444-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','مكيف سبليت','مكيف سبليت 18000 وحدة بارد، شغال بكفاءة عالية.','used','غسالة فل أوتوماتيك','active',true,false,91),
  ('44444444-4444-4444-8444-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','لابتوب','Dell XPS 13 laptop, 16GB RAM, great condition.','used','iPad Pro or gaming console','active',false,false,64),
  ('44444444-4444-4444-8444-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','ساعة يد فاخرة','ساعة يد بحالة الجديد مع الضمان.','new','ساعة أخرى أو سماعات','active',false,false,39),
  ('44444444-4444-4444-8444-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000008','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','دراجة هوائية','دراجة جبلية مقاس 27.5، استخدام خفيف.','used','دراجة كهربائية أو معدات رياضية','active',false,false,27),
  ('44444444-4444-4444-8444-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','كنبة مجلس','كنبة 3 مقاعد لون رمادي، مريحة ونظيفة.','used','طاولة طعام أو مكتب','active',false,false,45),
  ('44444444-4444-4444-8444-000000000009','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','بلايستيشن 5','جهاز بلايستيشن 5 مع يدين وألعاب.','used','إكس بوكس أو لابتوب','active',false,true,118),
  ('44444444-4444-4444-8444-000000000010','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','ماكينة قهوة','Espresso coffee machine, barely used.','used','Air fryer or blender','active',false,false,33),
  ('44444444-4444-4444-8444-000000000011','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','عربة أطفال','عربة أطفال قابلة للطي، بحالة ممتازة.','used','كرسي سيارة للأطفال','active',false,false,21),
  ('44444444-4444-4444-8444-000000000012','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','كرسي مكتب','كرسي مكتب طبي مريح للظهر.','new','كرسي قيمنق أو مكتب','active',true,false,52)
on conflict (id) do nothing;

-- ── Listing images (placeholder URLs; replace with Storage URLs later) ───
insert into public.listing_images (id, listing_id, image_url, sort_order)
select
  ('55555555-5555-4555-8555-' || lpad(((l.n - 1) * 2 + img)::text, 12, '0'))::uuid,
  l.id,
  'https://picsum.photos/seed/swap-' || l.n || '-' || img || '/600/600',
  img
from (
  select id, row_number() over (order by created_at) as n
  from public.listings
  where id like '44444444-4444-4444-8444-%'
) l
cross join generate_series(0, 1) as img
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Follows
-- ════════════════════════════════════════════════════════════════════════
insert into public.follows (follower_id, following_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000004'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000002')
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Conversations + participants + messages (3 demo threads)
-- ════════════════════════════════════════════════════════════════════════
insert into public.conversations (id, listing_id) values
  ('66666666-6666-4666-8666-000000000001','44444444-4444-4444-8444-000000000001'),
  ('66666666-6666-4666-8666-000000000002','44444444-4444-4444-8444-000000000004'),
  ('66666666-6666-4666-8666-000000000003','44444444-4444-4444-8444-000000000003')
on conflict (id) do nothing;

insert into public.conversation_participants (conversation_id, user_id) values
  ('66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003'),
  ('66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000005'),
  ('66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000004'),
  ('66666666-6666-4666-8666-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  ('66666666-6666-4666-8666-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000003')
on conflict do nothing;

insert into public.messages (id, conversation_id, sender_id, body, is_read) values
  ('77777777-7777-4777-8777-000000000001','66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','السلام عليكم، هل الآيفون متاح للتبادل؟',true),
  ('77777777-7777-4777-8777-000000000002','66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','وعليكم السلام، نعم متاح. وش عندك للمبادلة؟',true),
  ('77777777-7777-4777-8777-000000000003','66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','عندي سامسونج S23 بحالة ممتازة.',false),
  ('77777777-7777-4777-8777-000000000004','66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','Is the AC still available?',true),
  ('77777777-7777-4777-8777-000000000005','66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','نعم متاح، تبغى تبادله بإيش؟',false),
  ('77777777-7777-4777-8777-000000000006','66666666-6666-4666-8666-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','هل طقم غرفة النوم ما زال متوفر؟',false)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Reports (demo moderation queue)
-- ════════════════════════════════════════════════════════════════════════
insert into public.reports (id, reporter_id, target_type, target_id, reason, description, status) values
  ('88888888-8888-4888-8888-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','listing','44444444-4444-4444-8444-000000000007','spam','يبدو إعلان مكرر.','pending'),
  ('88888888-8888-4888-8888-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','user','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','inappropriate','سلوك غير لائق في المحادثة.','pending')
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Verification requests (manual admin workflow — no payment in MVP)
-- ════════════════════════════════════════════════════════════════════════
insert into public.verification_requests (id, user_id, listing_id, type, country_id, city_id, status, notes) values
  ('99999999-9999-4999-8999-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003',null,'account','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','pending','طلب توثيق حساب.'),
  ('99999999-9999-4999-8999-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','44444444-4444-4444-8444-000000000009','item','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','pending','طلب توثيق منتج (بلايستيشن 5).')
on conflict (id) do nothing;
