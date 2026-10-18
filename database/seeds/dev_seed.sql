-- =====================================================================
-- RMS — DEVELOPMENT / TEST SEED DATA (synthetic, fake people)
-- NEVER load this into a production database.
-- All four accounts share the dev-only password:  DevOnly@123
-- (stored below only as a bcrypt hash)
-- Re-runnable: INSERT IGNORE skips rows that already exist.
-- =====================================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO staff (staff_id, name, last_name, username, password, role, phone) VALUES
 (1, 'احمد',  'مدیری',    'manager1', '$2b$10$48Y3z7GZr2FTaawkwmtEIeR0zmrYUc8hv.xOhXUCqIFAaJTIkoWLW', 'manager', '0700000001'),
 (2, 'محمود', 'صندوقی',   'cashier1', '$2b$10$48Y3z7GZr2FTaawkwmtEIeR0zmrYUc8hv.xOhXUCqIFAaJTIkoWLW', 'cashier', '0700000002'),
 (3, 'کریم',  'خدمتگار',  'waiter1',  '$2b$10$48Y3z7GZr2FTaawkwmtEIeR0zmrYUc8hv.xOhXUCqIFAaJTIkoWLW', 'waiter',  '0700000003'),
 (4, 'نسیم',  'آشپزی',    'chef1',    '$2b$10$48Y3z7GZr2FTaawkwmtEIeR0zmrYUc8hv.xOhXUCqIFAaJTIkoWLW', 'chef',    '0700000004');

INSERT IGNORE INTO tables (table_id, table_no) VALUES
 (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5');

INSERT IGNORE INTO category (id, name) VALUES
 (1, 'غذای اصلی'), (2, 'نوشیدنی'), (3, 'دسر');

-- Images refer to files that already exist in public/uploads/menu/
INSERT IGNORE INTO menu_items (id, name, description, category, price, image) VALUES
 (1, 'چلو',        'برنج سفید دم‌کرده',          1, 150, '1759650638944-chelow.jpg'),
 (2, 'کباب مخلوط', 'بشقاب کباب با برنج و سبزی',  1, 450, '1757423663575-1736245719697-KebabPlatter.jpg'),
 (3, 'بریانی',     'بریانی مرغ با ادویه',        1, 350, '1759603195539-Biryani.jpg'),
 (4, 'ماهی',       'ماهی سرخ‌شده با سبزیجات',     1, 500, '1759649429872-fish.jpg'),
 (5, 'آب آلوورا',  'نوشیدنی خنک آلوورا',         2, 80,  '1759650737903-aloeVera.jpg'),
 (6, 'شربت توت',   'شربت تازه توت',              2, 90,  '1757920315662-berry.jpg'),
 (7, 'بستنی',      'بستنی وانیلی',               3, 120, '1760599492259-icecream.jpg'),
 (8, 'پنکیک',      'پنکیک با عسل',               3, 180, '1760599604217-pancake.jpg');
