-- =====================================================================
-- RMS — Migration 001: create tables
-- Target: MySQL 8.4 LTS (also valid on MySQL 8.0). Charset utf8mb4 for Persian text.
-- Additive only: uses CREATE TABLE IF NOT EXISTS, never DROP.
-- Table and column names match exactly what the existing app code uses.
-- =====================================================================

SET NAMES utf8mb4;

-- Bookkeeping: which migrations have been applied to this database
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50)  NOT NULL PRIMARY KEY,
  applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff / users. Column names (staff_id, name, last_name, ...) come from the code.
CREATE TABLE IF NOT EXISTS staff (
  staff_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,                 -- first name
  last_name   VARCHAR(50)  NOT NULL,
  username    VARCHAR(50)  NOT NULL,
  password    VARCHAR(255) NOT NULL,                 -- bcrypt hash only, never plain text
  role        ENUM('manager','cashier','waiter','chef') NOT NULL,
  phone       VARCHAR(10)  NOT NULL,                 -- app validates 07XXXXXXXX
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (staff_id),
  UNIQUE KEY uq_staff_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restaurant tables (the table name `tables` is what the code uses)
CREATE TABLE IF NOT EXISTS tables (
  table_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_no    VARCHAR(20)  NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (table_id),
  UNIQUE KEY uq_tables_table_no (table_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu categories
CREATE TABLE IF NOT EXISTS category (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu items. `category` holds the category id (the code filters on it).
-- `image` holds only the file name inside public/uploads/menu/.
CREATE TABLE IF NOT EXISTS menu_items (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  description VARCHAR(500)  NULL,
  category    INT UNSIGNED  NOT NULL,
  price       DECIMAL(12,2) NOT NULL,
  image       VARCHAR(255)  NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_items_name_category (name, category),
  KEY idx_menu_items_category (category),
  CONSTRAINT fk_menu_items_category FOREIGN KEY (category) REFERENCES category (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_menu_items_price CHECK (price > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders. status values come from the UI: open / closed / cancelled.
CREATE TABLE IF NOT EXISTS orders (
  order_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id    INT UNSIGNED NOT NULL,
  staff_id    INT UNSIGNED NOT NULL,                 -- the waiter / staff who created it
  notes       VARCHAR(500) NULL,
  status      ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
  paid        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY idx_orders_table_status (table_id, status),
  KEY idx_orders_staff (staff_id),
  KEY idx_orders_created (created_at),
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables (table_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_staff FOREIGN KEY (staff_id) REFERENCES staff (staff_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items inside an order. price is a snapshot of the price at order time,
-- so later menu price changes don't rewrite history.
CREATE TABLE IF NOT EXISTS order_items (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED  NOT NULL,
  menu_item_id  INT UNSIGNED  NOT NULL,
  qty           INT UNSIGNED  NOT NULL,
  price         DECIMAL(12,2) NOT NULL,
  status        ENUM('pending','in-progress') NOT NULL DEFAULT 'pending',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_menu_item (menu_item_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_order_items_qty CHECK (qty > 0),
  CONSTRAINT chk_order_items_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One bill per paid order (created by confirmPayment)
CREATE TABLE IF NOT EXISTS bills (
  bill_id       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED  NOT NULL,
  subtotal      DECIMAL(12,2) NOT NULL,
  discount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount  DECIMAL(12,2) NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bill_id),
  UNIQUE KEY uq_bills_order (order_id),
  KEY idx_bills_created (created_at),
  CONSTRAINT fk_bills_order FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_bills_amounts CHECK (
    subtotal >= 0 AND discount >= 0 AND discount <= subtotal
    AND total_amount = subtotal - discount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('001_create_tables');
