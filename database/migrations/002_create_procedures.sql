-- =====================================================================
-- RMS — Migration 002: stored procedures
-- Rebuilds the 25 procedures the existing app calls, with the exact names,
-- parameter order and result-column names the code expects.
-- Re-runnable: each procedure is replaced (DROP PROCEDURE IF EXISTS removes
-- only the procedure code, never data).
-- Money values are returned with CAST(... AS DOUBLE) so the app receives
-- numbers (the mysql2 driver returns DECIMAL as text by default).
-- Dates shown as text use the format 'YYYY-MM-DD HH:MM'.
-- =====================================================================

SET NAMES utf8mb4;

DELIMITER $$

-- ---------------------------------------------------------------------
-- AUTH / STAFF
-- ---------------------------------------------------------------------

-- Used by POST /api/login. Inactive staff cannot log in.
DROP PROCEDURE IF EXISTS login $$
CREATE PROCEDURE login(IN p_username VARCHAR(50))
BEGIN
  SELECT staff_id, name, last_name, username, role, password
  FROM staff
  WHERE username = p_username AND is_active = 1
  LIMIT 1;
END $$

-- Used by POST /api/staff. Receives an already-hashed password.
DROP PROCEDURE IF EXISTS add_staff $$
CREATE PROCEDURE add_staff(
  IN p_name VARCHAR(50), IN p_last_name VARCHAR(50), IN p_username VARCHAR(50),
  IN p_password VARCHAR(255), IN p_role VARCHAR(20), IN p_phone VARCHAR(10))
BEGIN
  IF EXISTS (SELECT 1 FROM staff WHERE username = p_username) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'این نام کاربری قبلاً استفاده شده است';
  END IF;
  INSERT INTO staff (name, last_name, username, password, role, phone)
  VALUES (p_name, p_last_name, p_username, p_password, p_role, p_phone);
  SELECT LAST_INSERT_ID() AS staff_id, 'پرسنل با موفقیت اضافه شد' AS msg;
END $$

-- Used by GET /api/staff
DROP PROCEDURE IF EXISTS getstaff $$
CREATE PROCEDURE getstaff()
BEGIN
  SELECT staff_id, name, last_name, username, role, phone, is_active
  FROM staff
  ORDER BY staff_id;
END $$

-- Used by GET/PUT /api/staff/[id]. Deliberately does NOT return the password hash.
DROP PROCEDURE IF EXISTS getStaffById $$
CREATE PROCEDURE getStaffById(IN p_staff_id INT)
BEGIN
  SELECT staff_id, name, last_name, username, role, phone, is_active
  FROM staff
  WHERE staff_id = p_staff_id;
END $$

-- Used by PUT /api/staff/[id]: is the username taken by someone else?
DROP PROCEDURE IF EXISTS checkUsernameExists $$
CREATE PROCEDURE checkUsernameExists(IN p_username VARCHAR(50), IN p_staff_id INT)
BEGIN
  SELECT COUNT(*) AS count
  FROM staff
  WHERE username = p_username AND staff_id <> p_staff_id;
END $$

DROP PROCEDURE IF EXISTS updateStaff $$
CREATE PROCEDURE updateStaff(
  IN p_staff_id INT, IN p_name VARCHAR(50), IN p_last_name VARCHAR(50),
  IN p_role VARCHAR(20), IN p_phone VARCHAR(10), IN p_username VARCHAR(50))
BEGIN
  UPDATE staff
  SET name = p_name, last_name = p_last_name, role = p_role,
      phone = p_phone, username = p_username
  WHERE staff_id = p_staff_id;
  SELECT ROW_COUNT() AS affected;
END $$

DROP PROCEDURE IF EXISTS updateStaffWithPassword $$
CREATE PROCEDURE updateStaffWithPassword(
  IN p_staff_id INT, IN p_name VARCHAR(50), IN p_last_name VARCHAR(50),
  IN p_role VARCHAR(20), IN p_phone VARCHAR(10), IN p_username VARCHAR(50),
  IN p_password VARCHAR(255))
BEGIN
  UPDATE staff
  SET name = p_name, last_name = p_last_name, role = p_role,
      phone = p_phone, username = p_username, password = p_password
  WHERE staff_id = p_staff_id;
  SELECT ROW_COUNT() AS affected;
END $$

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

-- Used by GET /api/tables (management page and checkout). Returns all tables.
DROP PROCEDURE IF EXISTS getTables $$
CREATE PROCEDURE getTables()
BEGIN
  SELECT table_id, table_no, is_active
  FROM tables
  ORDER BY CHAR_LENGTH(table_no), table_no;
END $$

DROP PROCEDURE IF EXISTS updateTable $$
CREATE PROCEDURE updateTable(IN p_table_id INT, IN p_table_no VARCHAR(20))
BEGIN
  UPDATE tables SET table_no = p_table_no WHERE table_id = p_table_id;
  SELECT ROW_COUNT() AS affected;
END $$

-- ---------------------------------------------------------------------
-- MENU
-- ---------------------------------------------------------------------

-- Used by GET /api/menu?categoryId=N (0 = all categories).
-- `image` is returned as a web path because the menu cards use it directly as <img src>.
DROP PROCEDURE IF EXISTS GetMenuItems $$
CREATE PROCEDURE GetMenuItems(IN p_category_id INT)
BEGIN
  SELECT m.id, m.name, m.description, m.category, c.name AS category_name,
         CAST(m.price AS DOUBLE) AS price,
         IF(m.image IS NULL, NULL, CONCAT('/uploads/menu/', m.image)) AS image,
         m.is_active,
         UNIX_TIMESTAMP(m.updated_at) AS updatedAt
  FROM menu_items m
  JOIN category c ON c.id = m.category
  WHERE p_category_id = 0 OR m.category = p_category_id
  ORDER BY c.name, m.name;
END $$

-- Used by POST /api/menu
DROP PROCEDURE IF EXISTS addItem $$
CREATE PROCEDURE addItem(
  IN p_name VARCHAR(100), IN p_description VARCHAR(500), IN p_category INT,
  IN p_price DECIMAL(12,2), IN p_image VARCHAR(255))
BEGIN
  INSERT INTO menu_items (name, description, category, price, image)
  VALUES (p_name, p_description, p_category, p_price, p_image);
  SELECT LAST_INSERT_ID() AS id, 'آیتم با موفقیت اضافه شد' AS msg;
END $$

-- Used by PUT /api/menu/[id]
DROP PROCEDURE IF EXISTS UpdateMenuItem $$
CREATE PROCEDURE UpdateMenuItem(
  IN p_id INT, IN p_name VARCHAR(100), IN p_description VARCHAR(500),
  IN p_category INT, IN p_price DECIMAL(12,2), IN p_image VARCHAR(255))
BEGIN
  UPDATE menu_items
  SET name = p_name, description = p_description, category = p_category,
      price = p_price, image = p_image
  WHERE id = p_id;
  SELECT p_id AS id, 'آیتم با موفقیت ویرایش شد' AS msg;
END $$

-- ---------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------

-- Used by POST /api/orders. Returns the new order_id.
DROP PROCEDURE IF EXISTS createOrder $$
CREATE PROCEDURE createOrder(IN p_table_id INT, IN p_staff_id INT, IN p_notes VARCHAR(500))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tables WHERE table_id = p_table_id AND is_active = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'میز انتخاب شده معتبر یا فعال نیست';
  END IF;
  INSERT INTO orders (table_id, staff_id, notes) VALUES (p_table_id, p_staff_id, p_notes);
  SELECT LAST_INSERT_ID() AS order_id;
END $$

-- Used by POST /api/orders and POST /api/orders/[id].
-- DESIGN DECISION D3 (needs approval): the price stored is the menu's CURRENT
-- price from the database; the price sent by the browser (p_price) is ignored.
DROP PROCEDURE IF EXISTS addOrderItems $$
CREATE PROCEDURE addOrderItems(
  IN p_order_id INT, IN p_menu_item_id INT, IN p_qty INT, IN p_price DECIMAL(12,2))
BEGIN
  DECLARE v_price DECIMAL(12,2);

  IF NOT EXISTS (SELECT 1 FROM orders WHERE order_id = p_order_id AND status = 'open') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'سفارش باز یافت نشد';
  END IF;
  IF p_qty IS NULL OR p_qty < 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'تعداد نامعتبر است';
  END IF;

  SELECT price INTO v_price FROM menu_items
  WHERE id = p_menu_item_id AND is_active = 1;
  IF v_price IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'آیتم منو یافت نشد یا غیرفعال است';
  END IF;

  INSERT INTO order_items (order_id, menu_item_id, qty, price)
  VALUES (p_order_id, p_menu_item_id, p_qty, v_price);
  SELECT LAST_INSERT_ID() AS id;
END $$

-- Shared column list for order lists (GetOrders / GetOrdersByWaiter)
DROP PROCEDURE IF EXISTS GetOrders $$
CREATE PROCEDURE GetOrders()
BEGIN
  SELECT o.order_id, t.table_no, o.status, o.paid,
         DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at,
         CONCAT(s.name, ' ', s.last_name) AS waiter,
         CAST(COALESCE(SUM(oi.qty * oi.price), 0) AS DOUBLE) AS total_amount
  FROM orders o
  JOIN tables t ON t.table_id = o.table_id
  JOIN staff  s ON s.staff_id = o.staff_id
  LEFT JOIN order_items oi ON oi.order_id = o.order_id
  GROUP BY o.order_id, t.table_no, o.status, o.paid, o.created_at, s.name, s.last_name
  ORDER BY o.created_at DESC, o.order_id DESC;
END $$

DROP PROCEDURE IF EXISTS GetOrdersByWaiter $$
CREATE PROCEDURE GetOrdersByWaiter(IN p_staff_id INT)
BEGIN
  SELECT o.order_id, t.table_no, o.status, o.paid,
         DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at,
         CONCAT(s.name, ' ', s.last_name) AS waiter,
         CAST(COALESCE(SUM(oi.qty * oi.price), 0) AS DOUBLE) AS total_amount
  FROM orders o
  JOIN tables t ON t.table_id = o.table_id
  JOIN staff  s ON s.staff_id = o.staff_id
  LEFT JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.staff_id = p_staff_id
  GROUP BY o.order_id, t.table_no, o.status, o.paid, o.created_at, s.name, s.last_name
  ORDER BY o.created_at DESC, o.order_id DESC;
END $$

-- Used by checkout "add to existing order": open orders for one table
DROP PROCEDURE IF EXISTS GetActiveOrdersByTable $$
CREATE PROCEDURE GetActiveOrdersByTable(IN p_table_id INT)
BEGIN
  SELECT o.order_id, o.table_id, t.table_no,
         DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at
  FROM orders o
  JOIN tables t ON t.table_id = o.table_id
  WHERE o.table_id = p_table_id AND o.status = 'open'
  ORDER BY o.created_at DESC;
END $$

-- Used by GET /api/orders/[id]. Returns THREE result sets in this order:
--   1) order header   2) order items   3) bill (empty if not paid yet)
DROP PROCEDURE IF EXISTS getOrderDetails $$
CREATE PROCEDURE getOrderDetails(IN p_order_id INT)
BEGIN
  SELECT o.order_id, o.table_id, t.table_no, o.status, o.paid, o.notes AS note,
         DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at,
         CONCAT(s.name, ' ', s.last_name) AS waiter
  FROM orders o
  JOIN tables t ON t.table_id = o.table_id
  JOIN staff  s ON s.staff_id = o.staff_id
  WHERE o.order_id = p_order_id;

  SELECT oi.id, oi.menu_item_id, m.name AS menu_item, oi.qty,
         CAST(oi.price AS DOUBLE) AS price,
         CAST(oi.qty * oi.price AS DOUBLE) AS total_price,
         oi.status
  FROM order_items oi
  JOIN menu_items m ON m.id = oi.menu_item_id
  WHERE oi.order_id = p_order_id
  ORDER BY oi.id;

  SELECT b.bill_id,
         CAST(b.subtotal AS DOUBLE) AS subtotal,
         CAST(b.discount AS DOUBLE) AS discount,
         CAST(b.total_amount AS DOUBLE) AS total_amount,
         DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created_at
  FROM bills b
  WHERE b.order_id = p_order_id;
END $$

-- Used by DELETE /api/orders/[id]. Only an OPEN order can be cancelled.
DROP PROCEDURE IF EXISTS cancelOrder $$
CREATE PROCEDURE cancelOrder(IN p_order_id INT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE order_id = p_order_id AND status = 'open') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'فقط سفارش باز قابل لغو است';
  END IF;
  UPDATE orders SET status = 'cancelled' WHERE order_id = p_order_id;
  SELECT ROW_COUNT() AS affected;
END $$

-- Used by POST /api/orders/[id]/payment.
-- DESIGN DECISION D4 (needs approval): the subtotal is recalculated from the
-- order's items in the database; the subtotal sent by the browser is ignored.
-- Runs in a transaction and locks the order row, so the same order can't be
-- paid twice even if two cashiers click at the same moment.
DROP PROCEDURE IF EXISTS confirmPayment $$
CREATE PROCEDURE confirmPayment(
  IN p_order_id INT, IN p_subtotal DECIMAL(12,2), IN p_discount DECIMAL(12,2))
BEGIN
  DECLARE v_status   VARCHAR(20);
  DECLARE v_subtotal DECIMAL(12,2);
  DECLARE v_discount DECIMAL(12,2);
  DECLARE v_bill_id  INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status INTO v_status FROM orders WHERE order_id = p_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'سفارش یافت نشد';
  END IF;
  IF v_status <> 'open' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'این سفارش قبلاً بسته یا لغو شده است';
  END IF;

  SELECT COALESCE(SUM(qty * price), 0) INTO v_subtotal
  FROM order_items WHERE order_id = p_order_id;
  IF v_subtotal <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'سفارش هیچ آیتمی ندارد';
  END IF;

  SET v_discount = COALESCE(p_discount, 0);
  IF v_discount < 0 OR v_discount > v_subtotal THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'مقدار تخفیف نامعتبر است';
  END IF;

  INSERT INTO bills (order_id, subtotal, discount, total_amount)
  VALUES (p_order_id, v_subtotal, v_discount, v_subtotal - v_discount);
  SET v_bill_id = LAST_INSERT_ID();

  UPDATE orders SET status = 'closed', paid = 1 WHERE order_id = p_order_id;

  COMMIT;

  SELECT 'پرداخت با موفقیت ثبت شد' AS msg, v_bill_id AS bill_id,
         CAST(v_subtotal AS DOUBLE) AS subtotal,
         CAST(v_discount AS DOUBLE) AS discount,
         CAST(v_subtotal - v_discount AS DOUBLE) AS total_amount;
END $$

-- ---------------------------------------------------------------------
-- DASHBOARD  (GET /api/dashboard) — FOUR result sets in this order:
--   1) net_sales (all time)  2) today's figures  3) latest 10 orders  4) top 5 items
-- "Today" uses the database clock, which must be set to Kabul time (+04:30).
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS getDashboardStats $$
CREATE PROCEDURE getDashboardStats()
BEGIN
  SELECT CAST(COALESCE(SUM(total_amount), 0) AS DOUBLE) AS net_sales
  FROM bills;

  SELECT
    (SELECT COUNT(*) FROM orders
      WHERE created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY
        AND status <> 'cancelled') AS todays_orders,
    CAST(COALESCE(SUM(b.discount), 0) AS DOUBLE)     AS todays_discounts,
    CAST(COALESCE(SUM(b.total_amount), 0) AS DOUBLE) AS todays_net_sales
  FROM bills b
  WHERE b.created_at >= CURDATE() AND b.created_at < CURDATE() + INTERVAL 1 DAY;

  SELECT o.order_id, t.table_no, o.status,
         DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at,
         CAST(COALESCE(SUM(oi.qty * oi.price), 0) AS DOUBLE) AS total_amount
  FROM orders o
  JOIN tables t ON t.table_id = o.table_id
  LEFT JOIN order_items oi ON oi.order_id = o.order_id
  GROUP BY o.order_id, t.table_no, o.status, o.created_at
  ORDER BY o.created_at DESC, o.order_id DESC
  LIMIT 10;

  SELECT m.id, m.name,
         CAST(SUM(oi.qty) AS SIGNED) AS total_sold,
         CAST(SUM(oi.qty * oi.price) AS DOUBLE) AS total_revenue
  FROM order_items oi
  JOIN orders o     ON o.order_id = oi.order_id AND o.status = 'closed'
  JOIN menu_items m ON m.id = oi.menu_item_id
  GROUP BY m.id, m.name
  ORDER BY total_sold DESC, total_revenue DESC
  LIMIT 5;
END $$

-- ---------------------------------------------------------------------
-- REPORTS  (POST /api/reports) — dates are inclusive: start 00:00 to end 23:59
-- Money reports are based on PAID bills (payment date).
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS getSalesReport $$
CREATE PROCEDURE getSalesReport(IN p_start DATE, IN p_end DATE)
BEGIN
  SELECT DATE_FORMAT(b.created_at, '%Y-%m-%d') AS date,
         COUNT(*) AS total_orders,
         CAST(SUM(b.subtotal) AS DOUBLE)     AS total_sales,
         CAST(SUM(b.discount) AS DOUBLE)     AS total_discount,
         CAST(SUM(b.total_amount) AS DOUBLE) AS net_sales
  FROM bills b
  WHERE b.created_at >= p_start AND b.created_at < p_end + INTERVAL 1 DAY
  GROUP BY DATE_FORMAT(b.created_at, '%Y-%m-%d')
  ORDER BY date;
END $$

DROP PROCEDURE IF EXISTS getProductPerformanceReport $$
CREATE PROCEDURE getProductPerformanceReport(IN p_start DATE, IN p_end DATE)
BEGIN
  DECLARE v_total DECIMAL(14,2);

  SELECT COALESCE(SUM(oi.qty * oi.price), 0) INTO v_total
  FROM order_items oi
  JOIN bills b ON b.order_id = oi.order_id
  WHERE b.created_at >= p_start AND b.created_at < p_end + INTERVAL 1 DAY;

  SELECT m.name AS product_name,
         CAST(SUM(oi.qty) AS SIGNED) AS total_qty,
         CAST(SUM(oi.qty * oi.price) AS DOUBLE) AS total_sales,
         CAST(IF(v_total = 0, 0, ROUND(SUM(oi.qty * oi.price) * 100 / v_total, 2)) AS DOUBLE)
           AS sales_percentage
  FROM order_items oi
  JOIN bills b      ON b.order_id = oi.order_id
  JOIN menu_items m ON m.id = oi.menu_item_id
  WHERE b.created_at >= p_start AND b.created_at < p_end + INTERVAL 1 DAY
  GROUP BY m.id, m.name
  ORDER BY total_sales DESC;
END $$

DROP PROCEDURE IF EXISTS getFinancialReport $$
CREATE PROCEDURE getFinancialReport(IN p_start DATE, IN p_end DATE)
BEGIN
  SELECT CAST(COALESCE(SUM(subtotal), 0) AS DOUBLE)     AS total_sales,
         CAST(COALESCE(SUM(discount), 0) AS DOUBLE)     AS total_discount,
         CAST(COALESCE(SUM(total_amount), 0) AS DOUBLE) AS net_income
  FROM bills
  WHERE created_at >= p_start AND created_at < p_end + INTERVAL 1 DAY;
END $$

-- Orders report covers ALL orders created in the period (open, closed, cancelled).
DROP PROCEDURE IF EXISTS getOrdersReport $$
CREATE PROCEDURE getOrdersReport(IN p_start DATE, IN p_end DATE)
BEGIN
  SELECT o.order_id, t.table_no, o.status,
         DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at,
         CAST(COALESCE(b.total_amount,
              (SELECT SUM(oi.qty * oi.price) FROM order_items oi WHERE oi.order_id = o.order_id),
              0) AS DOUBLE) AS total_amount
  FROM orders o
  JOIN tables t ON t.table_id = o.table_id
  LEFT JOIN bills b ON b.order_id = o.order_id
  WHERE o.created_at >= p_start AND o.created_at < p_end + INTERVAL 1 DAY
  ORDER BY o.created_at, o.order_id;
END $$

DELIMITER ;

INSERT IGNORE INTO schema_migrations (version) VALUES ('002_create_procedures');
