-- gestion_snack 
-- Instructions:
-- 1) Create a database:    CREATE DATABASE gestion_snack;
-- 2) Run:   psql -U <user> -d gestion_snack -f gestion_snack_postgres.sql
-- (or open in pgAdmin Query Tool and execute while connected to gestion_snack)
--
-- This script uses PostgreSQL enum types and plpgsql triggers/functions.
-- It is idempotent for objects (uses DROP ... IF EXISTS where appropriate).

-- activate cryptographiques functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

----------------------------
-- Prepare: drop types if they exist (safe to run multiple times)
----------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        DROP TYPE role_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        DROP TYPE product_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status_type') THEN
        DROP TYPE table_status_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
        DROP TYPE payment_method_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type_type') THEN
        DROP TYPE order_type_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_type') THEN
        DROP TYPE order_status_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status_type') THEN
        DROP TYPE reservation_status_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_type') THEN
        DROP TYPE transaction_status_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_source_type') THEN
        DROP TYPE message_source_type;
    END IF;
END $$;

-- Create enum types
CREATE TYPE role_type AS ENUM ('ADMIN','CUSTOMER','CASHIER','WAITER','COOK','PROVIDER');
CREATE TYPE product_type AS ENUM ('FOOD','DRINK');
CREATE TYPE table_status_type AS ENUM ('FREE','OCCUPIED','RESERVED');
CREATE TYPE payment_method_type AS ENUM ('CASH','CARD');
CREATE TYPE order_type_type AS ENUM ('ON_SITE','TAKEAWAY');
CREATE TYPE order_status_type AS ENUM ('ACTIVE','CLOSED','SERVED','CANCELLED');
CREATE TYPE reservation_status_type AS ENUM ('BOOKED','CANCELLED','COMPLETED');
CREATE TYPE transaction_status_type AS ENUM ('PENDING','COMPLETED','FAILED','REFUNDED');
CREATE TYPE message_source_type AS ENUM ('USER','BOT');

----------------------------
-- Tables
----------------------------

-- Roles
CREATE TABLE roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_name role_type NOT NULL UNIQUE DEFAULT 'CUSTOMER',
    description TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Categories
CREATE TABLE categories (
    category_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Tables Snack (formerly dining_tables)
CREATE TABLE tables_snack (
    table_id BIGSERIAL PRIMARY KEY,
    order_id BIGINT, -- Added from MPD (ORD_id)
    table_number INTEGER NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    status table_status_type DEFAULT 'FREE' NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Customers
CREATE TABLE customers (
    customer_id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL, -- firsr_name in MPD
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    address TEXT, -- adress in MPD
    phone VARCHAR(50),
    email VARCHAR(150) NOT NULL UNIQUE,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Reviews
CREATE TABLE reviews (
    review_id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    comment TEXT,
    star INTEGER, -- Added from MPD
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reviews_customer ON reviews(customer_id);

-- Providers
CREATE TABLE provider (
    provider_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Replaces first_name/last_name
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(150) NOT NULL UNIQUE,
    provider_type VARCHAR(50),
    delivery_delay VARCHAR(50), -- delivrery_delay in MPD
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Products
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(category_id) ON DELETE SET NULL, -- id2 in MPD
    stock_id BIGINT, -- STO_id in MPD
    product_name VARCHAR(100) NOT NULL UNIQUE, -- name in MPD
    description TEXT, -- Added from MPD
    alergy TEXT, -- Added from MPD
    image_url VARCHAR(255),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    alert_threshold INTEGER NOT NULL DEFAULT 0,
    product_type product_type DEFAULT 'DRINK' NOT NULL,
    needs_sauce BOOLEAN DEFAULT FALSE,
    needs_viande BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Stock alerts (formerly stock_alerts)
CREATE TABLE stock_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    alert_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE
);

-- Tickets
CREATE TABLE tickets (
    ticket_id BIGSERIAL PRIMARY KEY,
    order_id BIGINT, -- circular ref to orders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders (header)
CREATE TABLE orders (
    order_id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES tickets(ticket_id) ON DELETE SET NULL, -- TIC_id in MPD
    table_id BIGINT REFERENCES tables_snack(table_id) ON DELETE SET NULL,
    customer_id BIGINT REFERENCES customers(customer_id) ON DELETE RESTRICT,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    order_date DATE DEFAULT CURRENT_DATE,
    payment_method payment_method_type DEFAULT 'CASH' NOT NULL,
    order_type order_type_type DEFAULT 'ON_SITE' NOT NULL,
    pickup_time TIME,
    guest_count INTEGER,
    status order_status_type DEFAULT 'ACTIVE' NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Order items (composite PK removed based on MPD)
CREATE TABLE order_items (
    order_item_id BIGSERIAL PRIMARY KEY, -- id in MPD
    order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    sale_id BIGINT, -- sale_id in MPD
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Provider Products (formerly fournir)
CREATE TABLE provider_products (
    provide_id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES provider(provider_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    supply_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Reservations
CREATE TABLE reservations (
    reservation_id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    table_id BIGINT NOT NULL REFERENCES tables_snack(table_id) ON DELETE RESTRICT,
    datetime_from TIMESTAMP NOT NULL, -- Replaces reservation_date/time
    datetime_to TIMESTAMP NOT NULL,
    places INTEGER NOT NULL, -- Replaces number_of_people
    Attribut_55 VARCHAR(255), -- Requested from MPD
    status reservation_status_type DEFAULT 'BOOKED' NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Employees
CREATE TABLE employees (
    employee_id BIGSERIAL PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100) NOT NULL UNIQUE,
    role_id BIGINT REFERENCES roles(role_id) ON DELETE RESTRICT, -- ROL_id from MPD
    salary NUMERIC(10,2) DEFAULT 0,
    hire_date DATE,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Users
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL, -- references employee_id/customer/provider as needed (application-level)
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Renamed from password_hash for MPD
    is_active BOOLEAN DEFAULT TRUE, -- Added from MPD
    last_login TIMESTAMP, -- Added from MPD
    pin_up_to_date BOOLEAN DEFAULT FALSE,
    email VARCHAR(100) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Stock movements
CREATE TABLE stock_movements (
    movement_id BIGSERIAL PRIMARY KEY, -- id in MPD
    product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    performed_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Assignments (formerly gerer)
CREATE TABLE order_assignments (
    employee_id BIGINT REFERENCES employees(employee_id) ON DELETE CASCADE, -- id in MPD
    order_id BIGINT REFERENCES orders(order_id) ON DELETE CASCADE,
    table_id BIGINT REFERENCES tables_snack(table_id) ON DELETE CASCADE,
    PRIMARY KEY (employee_id, order_id, table_id)
);

-- Table Reservations (formerly associer)
CREATE TABLE table_reservations (
    reservation_id BIGINT REFERENCES reservations(reservation_id) ON DELETE CASCADE, -- id in MPD
    table_id BIGINT REFERENCES tables_snack(table_id) ON DELETE CASCADE,
    PRIMARY KEY (reservation_id, table_id)
);

-- Transactions
CREATE TABLE transactions (
    idTransaction BIGSERIAL PRIMARY KEY, -- idTransaction in MPD

    order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(customer_id) ON DELETE SET NULL,
    payment_method payment_method_type DEFAULT 'CASH' NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status transaction_status_type DEFAULT 'PENDING' NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Messages (chatbot conversation)
CREATE TABLE messages (
    idMessage BIGSERIAL PRIMARY KEY, -- idMessage in MPD
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    sender_type message_source_type DEFAULT 'USER' NOT NULL,
    order_id BIGINT REFERENCES orders(order_id) ON DELETE SET NULL,
    response_to_message_id BIGINT REFERENCES messages(idMessage) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Audit log
CREATE TABLE audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(10) NOT NULL,
    record_id TEXT NOT NULL,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

-- Indexes
CREATE INDEX idx_orderitems_product ON order_items(product_id);
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_response_to ON messages(response_to_message_id);

----------------------------
-- Utility function to recalc order total
----------------------------
CREATE OR REPLACE FUNCTION sp_recalc_order_total(p_order_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE orders o
    SET total_amount = COALESCE((SELECT SUM(oi.line_total) FROM order_items oi WHERE oi.order_id = p_order_id),0),
        updated_at = CURRENT_TIMESTAMP
    WHERE o.order_id = p_order_id;
END;
$$;

----------------------------
-- TRIGGERS (plpgsql functions + triggers)
----------------------------

-- Helper: insert audit
CREATE OR REPLACE FUNCTION fn_audit_insert(p_table text, p_action text, p_record text, p_by text, p_details text DEFAULT NULL)
RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO audit_log(table_name, action_type, record_id, performed_by, details) VALUES (p_table, p_action, p_record, p_by, p_details);
$$;

-- 1) Create user after employee insert
CREATE OR REPLACE FUNCTION trg_employee_after_insert_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = NEW.email OR username = NEW.username) INTO user_exists;
    IF user_exists THEN
        PERFORM fn_audit_insert('employees', 'INSERT', NEW.employee_id::text, NEW.created_by);
        RETURN NEW;
    END IF;

    IF NEW.role_id IS NOT NULL THEN
        INSERT INTO users (owner_id, username, password, email, role_id, created_by)
        VALUES (NEW.employee_id, NEW.username, crypt('1234', gen_salt('bf')), NEW.email, NEW.role_id, NEW.created_by);
    END IF;

    PERFORM fn_audit_insert('employees','INSERT', NEW.employee_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_employee_after_insert
AFTER INSERT ON employees
FOR EACH ROW EXECUTE FUNCTION trg_employee_after_insert_fn();

-- 2) Create user after customer insert
CREATE OR REPLACE FUNCTION trg_customer_after_insert_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    r_id BIGINT;
BEGIN
    SELECT role_id INTO r_id FROM roles WHERE role_name = 'CUSTOMER' LIMIT 1;
    IF r_id IS NULL THEN
        RAISE EXCEPTION 'Role CUSTOMER not found - cannot create user for customer %', NEW.customer_id;
    END IF;
    INSERT INTO users (owner_id, username, password, email, role_id, created_by)
    VALUES (NEW.customer_id, NEW.username, crypt('1234', gen_salt('bf')), NEW.email, r_id, NEW.created_by);

    PERFORM fn_audit_insert('customers','INSERT', NEW.customer_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_customer_after_insert
AFTER INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION trg_customer_after_insert_fn();

-- 3) Create user after provider insert
CREATE OR REPLACE FUNCTION trg_provider_after_insert_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    r_id BIGINT;
    generated_username VARCHAR(50);
BEGIN
    SELECT role_id INTO r_id FROM roles WHERE role_name = 'PROVIDER' LIMIT 1;
    IF r_id IS NULL THEN
        RAISE EXCEPTION 'Role PROVIDER not found - cannot create user for provider %', NEW.provider_id;
    END IF;
    
    generated_username := LOWER(REPLACE(NEW.name, ' ', '.')) || NEW.provider_id;

    INSERT INTO users (owner_id, username, password, email, role_id, created_by)
    VALUES (NEW.provider_id, generated_username, crypt('1234', gen_salt('bf')), NEW.email, r_id, NEW.created_by);

    PERFORM fn_audit_insert('provider','INSERT', NEW.provider_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_provider_after_insert
AFTER INSERT ON provider
FOR EACH ROW EXECUTE FUNCTION trg_provider_after_insert_fn();

-- Provider Products triggers
CREATE OR REPLACE FUNCTION trg_provider_products_bi_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    p_exists INT;
BEGIN
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Erreur : la quantité fournie doit être > 0.';
    END IF;
    SELECT product_id INTO p_exists FROM products WHERE product_id = NEW.product_id FOR UPDATE;
    IF p_exists IS NULL THEN
        RAISE EXCEPTION 'Erreur : produit introuvable pour la fourniture.';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_provider_products_bi BEFORE INSERT ON provider_products
FOR EACH ROW EXECUTE FUNCTION trg_provider_products_bi_fn();

CREATE OR REPLACE FUNCTION trg_provider_products_ai_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    -- Only update stock if status is VALIDATED
    -- IF NEW.status = 'VALIDATED' THEN (assuming status exists or not, wait, fournir doesn't have status in new schema, but let's keep robust logic if status exists in app level? Actually MPD has no status in fournir. I will remove the status check to make it robustly update stock on insert)
    UPDATE products
    SET quantity_available = quantity_available + NEW.quantity,
        updated_by = NEW.created_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    PERFORM fn_audit_insert('provider_products','INSERT', NEW.provide_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_provider_products_ai AFTER INSERT ON provider_products
FOR EACH ROW EXECUTE FUNCTION trg_provider_products_ai_fn();

CREATE OR REPLACE FUNCTION trg_provider_products_bu_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Erreur : la quantité fournie doit être > 0.';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_provider_products_bu BEFORE UPDATE ON provider_products
FOR EACH ROW EXECUTE FUNCTION trg_provider_products_bu_fn();

CREATE OR REPLACE FUNCTION trg_provider_products_au_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE diff INT;
BEGIN
    IF NEW.product_id = OLD.product_id THEN
        diff := NEW.quantity - OLD.quantity;
        IF diff <> 0 THEN
            UPDATE products
            SET quantity_available = quantity_available + diff,
                updated_by = NEW.updated_by,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id;
        END IF;
    ELSE
        -- retirer l'ancienne quantité de l'ancien produit
        UPDATE products
        SET quantity_available = quantity_available - OLD.quantity,
            updated_by = NEW.updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = OLD.product_id;

        -- ajouter la nouvelle quantité au nouveau produit
        UPDATE products
        SET quantity_available = quantity_available + NEW.quantity,
            updated_by = NEW.updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id;
    END IF;

    PERFORM fn_audit_insert('provider_products','UPDATE', NEW.provide_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_provider_products_au AFTER UPDATE ON provider_products
FOR EACH ROW EXECUTE FUNCTION trg_provider_products_au_fn();

CREATE OR REPLACE FUNCTION trg_provider_products_ad_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET quantity_available = quantity_available - OLD.quantity,
        updated_by = OLD.updated_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = OLD.product_id;

    PERFORM fn_audit_insert('provider_products','DELETE', OLD.provide_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_provider_products_ad AFTER DELETE ON provider_products
FOR EACH ROW EXECUTE FUNCTION trg_provider_products_ad_fn();

-- Order items BEFORE INSERT (validate stock and compute line_total)
CREATE OR REPLACE FUNCTION trg_orderitems_bi_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_stock INT;
BEGIN
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Erreur : la quantité doit être > 0.';
    END IF;
    SELECT quantity_available INTO current_stock FROM products WHERE product_id = NEW.product_id FOR UPDATE;
    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Erreur : produit introuvable.';
    END IF;
    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Erreur : stock insuffisant pour cet article.';
    END IF;
    IF NEW.unit_price IS NULL OR NEW.unit_price = 0 THEN
        SELECT unit_price INTO NEW.unit_price FROM products WHERE product_id = NEW.product_id;
    END IF;
    NEW.line_total := ROUND(NEW.quantity * NEW.unit_price::numeric,2);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orderitems_bi BEFORE INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_orderitems_bi_fn();

-- Order items AFTER INSERT (deduct stock and recalc order total)
CREATE OR REPLACE FUNCTION trg_orderitems_ai_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET quantity_available = quantity_available - NEW.quantity,
        updated_by = NEW.created_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    PERFORM sp_recalc_order_total(NEW.order_id);

    PERFORM fn_audit_insert('order_items','INSERT', NEW.order_item_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orderitems_ai AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_orderitems_ai_fn();

-- Order items BEFORE UPDATE (validate stock if increasing or changing product)
CREATE OR REPLACE FUNCTION trg_orderitems_bu_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_stock INT;
DECLARE diff INT;
BEGIN
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Erreur : la quantité doit être > 0.';
    END IF;
    NEW.line_total := ROUND(NEW.quantity * NEW.unit_price::numeric,2);

    IF NEW.product_id = OLD.product_id THEN
        diff := NEW.quantity - OLD.quantity;
        IF diff > 0 THEN
            SELECT quantity_available INTO current_stock FROM products WHERE product_id = NEW.product_id FOR UPDATE;
            IF current_stock IS NULL THEN
                RAISE EXCEPTION 'Erreur : produit introuvable.';
            END IF;
            IF current_stock < diff THEN
                RAISE EXCEPTION 'Erreur : stock insuffisant pour augmenter la quantité.';
            END IF;
        END IF;
    ELSE
        SELECT quantity_available INTO current_stock FROM products WHERE product_id = NEW.product_id FOR UPDATE;
        IF current_stock IS NULL THEN
            RAISE EXCEPTION 'Erreur : nouveau produit introuvable.';
        END IF;
        IF current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Erreur : stock insuffisant pour le nouveau produit.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orderitems_bu BEFORE UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_orderitems_bu_fn();

-- Order items AFTER UPDATE (adjust stock and recalc)
CREATE OR REPLACE FUNCTION trg_orderitems_au_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE diff INT;
BEGIN
    IF NEW.product_id = OLD.product_id THEN
        diff := NEW.quantity - OLD.quantity;
        IF diff > 0 THEN
            UPDATE products
            SET quantity_available = quantity_available - diff,
                updated_by = NEW.updated_by,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id;
        ELSIF diff < 0 THEN
            UPDATE products
            SET quantity_available = quantity_available + ABS(diff),
                updated_by = NEW.updated_by,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id;
        END IF;
    ELSE
        -- restore old product stock
        UPDATE products
        SET quantity_available = quantity_available + OLD.quantity,
            updated_by = NEW.updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = OLD.product_id;

        -- deduct new product stock
        UPDATE products
        SET quantity_available = quantity_available - NEW.quantity,
            updated_by = NEW.updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id;
    END IF;

    PERFORM sp_recalc_order_total(NEW.order_id);

    PERFORM fn_audit_insert('order_items','UPDATE', NEW.order_item_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orderitems_au AFTER UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_orderitems_au_fn();

-- Order items AFTER DELETE (restore stock and recalc)
CREATE OR REPLACE FUNCTION trg_orderitems_ad_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET quantity_available = quantity_available + OLD.quantity,
        updated_by = OLD.updated_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = OLD.product_id;

    PERFORM sp_recalc_order_total(OLD.order_id);

    PERFORM fn_audit_insert('order_items','DELETE', OLD.order_item_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_orderitems_ad AFTER DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_orderitems_ad_fn();

-- Products AFTER UPDATE: manage stock alerts and audit
CREATE OR REPLACE FUNCTION trg_products_after_update_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.quantity_available <= NEW.alert_threshold THEN
        IF NOT EXISTS (SELECT 1 FROM stock_alerts WHERE product_id = NEW.product_id) THEN
            INSERT INTO stock_alerts(product_id, message) VALUES (NEW.product_id, '⚠ Alerte stock faible : ' || NEW.product_name || ' - ' || NEW.quantity_available::text || ' unités restantes.');
        END IF;
    ELSE
        DELETE FROM stock_alerts WHERE product_id = NEW.product_id;
    END IF;

    PERFORM fn_audit_insert('products','UPDATE', NEW.product_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_products_after_update AFTER UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION trg_products_after_update_fn();

-- Products audit insert & delete
CREATE OR REPLACE FUNCTION trg_products_ai_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('products','INSERT', NEW.product_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_products_ai AFTER INSERT ON products FOR EACH ROW EXECUTE FUNCTION trg_products_ai_fn();

CREATE OR REPLACE FUNCTION trg_products_ad_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('products','DELETE', OLD.product_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_products_ad AFTER DELETE ON products FOR EACH ROW EXECUTE FUNCTION trg_products_ad_fn();

-- Orders audit and cancel restore
CREATE OR REPLACE FUNCTION trg_orders_ai_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('orders','INSERT', NEW.order_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orders_ai AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION trg_orders_ai_fn();

CREATE OR REPLACE FUNCTION trg_orders_au_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('orders','UPDATE', OLD.order_id::text, NEW.updated_by);

    IF OLD.status::text <> 'CANCELLED' AND NEW.status::text = 'CANCELLED' THEN
        -- restore stock for all lines of this order
        UPDATE products p
        SET quantity_available = p.quantity_available + oi.quantity,
            updated_at = CURRENT_TIMESTAMP
        FROM order_items oi
        WHERE oi.order_id = NEW.order_id AND oi.product_id = p.product_id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orders_au AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trg_orders_au_fn();

CREATE OR REPLACE FUNCTION trg_orders_ad_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('orders','DELETE', OLD.order_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_orders_ad AFTER DELETE ON orders FOR EACH ROW EXECUTE FUNCTION trg_orders_ad_fn();

-- Audit triggers for other tables: employees, users, roles, dining_tables, stock_alerts, reservations, customers
CREATE OR REPLACE FUNCTION trg_generic_audit_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert(TG_TABLE_NAME,'INSERT', NEW.*::text, NEW.created_by);
    RETURN NEW;
END;
$$;
-- Instead of using same generic for all, create specific simple ones for clarity:

CREATE OR REPLACE FUNCTION trg_employees_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('employees','INSERT', NEW.employee_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
-- Duplicate trigger removed: CREATE TRIGGER trg_employees_ai AFTER INSERT ON employees FOR EACH ROW EXECUTE FUNCTION trg_employees_ai_fn();

CREATE OR REPLACE FUNCTION trg_employees_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('employees','UPDATE', OLD.employee_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_employees_au AFTER UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION trg_employees_au_fn();

CREATE OR REPLACE FUNCTION trg_employees_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('employees','DELETE', OLD.employee_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_employees_ad AFTER DELETE ON employees FOR EACH ROW EXECUTE FUNCTION trg_employees_ad_fn();

CREATE OR REPLACE FUNCTION trg_users_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('users','INSERT', NEW.user_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_users_ai AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION trg_users_ai_fn();

CREATE OR REPLACE FUNCTION trg_users_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('users','UPDATE', OLD.user_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_users_au AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trg_users_au_fn();

CREATE OR REPLACE FUNCTION trg_users_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('users','DELETE', OLD.user_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_users_ad AFTER DELETE ON users FOR EACH ROW EXECUTE FUNCTION trg_users_ad_fn();

CREATE OR REPLACE FUNCTION trg_transactions_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('transactions','INSERT', NEW.idtransaction::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_transactions_ai AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION trg_transactions_ai_fn();

CREATE OR REPLACE FUNCTION trg_transactions_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('transactions','UPDATE', OLD.idtransaction::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_transactions_au AFTER UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION trg_transactions_au_fn();

CREATE OR REPLACE FUNCTION trg_transactions_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('transactions','DELETE', OLD.idtransaction::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_transactions_ad AFTER DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION trg_transactions_ad_fn();

CREATE OR REPLACE FUNCTION trg_messages_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('messages','INSERT', NEW.idMessage::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_messages_ai AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION trg_messages_ai_fn();

CREATE OR REPLACE FUNCTION trg_messages_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('messages','UPDATE', OLD.idMessage::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_messages_au AFTER UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION trg_messages_au_fn();

CREATE OR REPLACE FUNCTION trg_messages_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('messages','DELETE', OLD.idMessage::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_messages_ad AFTER DELETE ON messages FOR EACH ROW EXECUTE FUNCTION trg_messages_ad_fn();

CREATE OR REPLACE FUNCTION trg_roles_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('roles','INSERT', NEW.role_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_roles_ai AFTER INSERT ON roles FOR EACH ROW EXECUTE FUNCTION trg_roles_ai_fn();

CREATE OR REPLACE FUNCTION trg_roles_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('roles','UPDATE', OLD.role_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_roles_au AFTER UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION trg_roles_au_fn();

CREATE OR REPLACE FUNCTION trg_roles_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('roles','DELETE', OLD.role_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_roles_ad AFTER DELETE ON roles FOR EACH ROW EXECUTE FUNCTION trg_roles_ad_fn();

CREATE OR REPLACE FUNCTION trg_tables_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('tables_snack','INSERT', NEW.table_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tables_ai AFTER INSERT ON tables_snack FOR EACH ROW EXECUTE FUNCTION trg_tables_ai_fn();

CREATE OR REPLACE FUNCTION trg_tables_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('tables_snack','UPDATE', OLD.table_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tables_au AFTER UPDATE ON tables_snack FOR EACH ROW EXECUTE FUNCTION trg_tables_au_fn();

CREATE OR REPLACE FUNCTION trg_tables_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('tables_snack','DELETE', OLD.table_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_tables_ad AFTER DELETE ON tables_snack FOR EACH ROW EXECUTE FUNCTION trg_tables_ad_fn();

CREATE OR REPLACE FUNCTION trg_alertstocks_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('stock_alerts','INSERT', NEW.alert_id::text, current_user);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_alertstocks_ai AFTER INSERT ON stock_alerts FOR EACH ROW EXECUTE FUNCTION trg_alertstocks_ai_fn();

CREATE OR REPLACE FUNCTION trg_reservations_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('reservations','INSERT', NEW.reservation_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reservations_ai AFTER INSERT ON reservations FOR EACH ROW EXECUTE FUNCTION trg_reservations_ai_fn();

CREATE OR REPLACE FUNCTION trg_reservations_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('reservations','UPDATE', OLD.reservation_id::text, NEW.updated_by);
    IF OLD.status::text <> 'CANCELLED' AND NEW.status::text = 'CANCELLED' THEN
        UPDATE tables_snack SET status = 'FREE', updated_at = CURRENT_TIMESTAMP WHERE table_id = NEW.table_id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reservations_au AFTER UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION trg_reservations_au_fn();

CREATE OR REPLACE FUNCTION trg_reservations_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('reservations','DELETE', OLD.reservation_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_reservations_ad AFTER DELETE ON reservations FOR EACH ROW EXECUTE FUNCTION trg_reservations_ad_fn();

CREATE OR REPLACE FUNCTION trg_customers_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('customers','INSERT', NEW.customer_id::text, NEW.created_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_customers_ai AFTER INSERT ON customers FOR EACH ROW EXECUTE FUNCTION trg_customers_ai_fn();

CREATE OR REPLACE FUNCTION trg_customers_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('customers','UPDATE', OLD.customer_id::text, NEW.updated_by);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_customers_au AFTER UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trg_customers_au_fn();

CREATE OR REPLACE FUNCTION trg_customers_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('customers','DELETE', OLD.customer_id::text, current_user);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_customers_ad AFTER DELETE ON customers FOR EACH ROW EXECUTE FUNCTION trg_customers_ad_fn();

-- Reviews triggers for audit
CREATE OR REPLACE FUNCTION trg_reviews_ai_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('reviews','INSERT', NEW.review_id::text, NEW.created_by, NEW.comment);
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reviews_ai AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION trg_reviews_ai_fn();

CREATE OR REPLACE FUNCTION trg_reviews_au_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('reviews','UPDATE', OLD.review_id::text, NEW.updated_by, 'old_comment='||COALESCE(OLD.comment,'')||';new_comment='||COALESCE(NEW.comment,''));
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reviews_au AFTER UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION trg_reviews_au_fn();

CREATE OR REPLACE FUNCTION trg_reviews_ad_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_audit_insert('reviews','DELETE', OLD.review_id::text, current_user, OLD.comment);
    RETURN OLD;
END;
$$;
CREATE TRIGGER trg_reviews_ad AFTER DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION trg_reviews_ad_fn();

----------------------------
-- Example data inserts (useful for testing)
----------------------------

INSERT INTO roles (role_name, description, created_by) VALUES
 ('ADMIN','Accès complet à toutes les fonctionnalités.','SYSTEM'),
 ('CUSTOMER','Accès client aux fonctionnalités de commande.','SYSTEM'),
 ('CASHIER','Responsable des encaissements.','SYSTEM'),
 ('WAITER','Accès limité aux opérations de vente.','SYSTEM'),
 ('COOK','Responsable de la cuisine.','SYSTEM'),
 ('PROVIDER','Fournisseur externe.','SYSTEM');

INSERT INTO tables_snack (table_number, capacity, status, created_by) VALUES
 (1, 4, 'FREE', 'SYSTEM'),
 (2, 2, 'FREE', 'SYSTEM'),
 (3, 6, 'FREE', 'SYSTEM'),
 (4, 4, 'FREE', 'SYSTEM'),
 (5, 8, 'FREE', 'SYSTEM'),
 (6, 2, 'FREE', 'SYSTEM'),
 (7, 4, 'FREE', 'SYSTEM'),
 (8, 6, 'FREE', 'SYSTEM'),
 (9, 2, 'FREE', 'SYSTEM'),
 (10,10, 'FREE', 'SYSTEM'),
 (11, 4, 'FREE', 'SYSTEM'),
 (12, 6, 'FREE', 'SYSTEM')
ON CONFLICT (table_number) DO NOTHING;

INSERT INTO customers (first_name, last_name, username, address, phone, email, created_by) VALUES
 ('Jean','Dupont','jean.dupont','10 Rue Exemple','+32600000000','jean.dupont@example.com','SYSTEM'),
 ('Marie','Simo','marie.simo','20 Rue Exemple','+32600000001','marie.simo@example.com','SYSTEM');

INSERT INTO employees (last_name, first_name, username, address, phone, email, role_id, salary, hire_date, created_by) VALUES
 ('Smith','Alice','a.smith','10 Rue Principale','0102030405','a.smith@gmail.com',(SELECT role_id FROM roles WHERE role_name='ADMIN'),3000.00,'2022-01-01','SYSTEM'),
 ('Johnson','Bob','b.johnson','20 Avenue Secondaire','0607080910','b.johnson@gmail.com',(SELECT role_id FROM roles WHERE role_name='WAITER'),1500.00,'2023-01-01','SYSTEM');

INSERT INTO provider (name, address, phone, email, provider_type, delivery_delay, created_by) VALUES
 ('John Supply','30 Rue Fournisseur','+32600000002','john.supply@provider.com','FOOD','24h','SYSTEM'),
 ('Sarah Deliver','40 Ave Livraison','+326000000003','sarah.deliver@provider.com','DRINK','48h','SYSTEM');

INSERT INTO products (product_name, description, unit_price, quantity_available, alert_threshold, product_type, image_url, created_by) VALUES
 ('Sandwich',
  'Sandwich maison garni de jambon, fromage fondu, salade et tomates fraîches',
  5.50, 100, 10, 'FOOD',
  'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
  'SYSTEM'),
 ('Pizza',
  'Pizza napolitaine à pâte fine, sauce tomate maison, mozzarella et basilic',
  12.00, 50, 5, 'FOOD',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
  'SYSTEM'),
 ('Soda',
  'Boisson gazeuse rafraîchissante au cola, servie avec glaçons',
  1.50, 200, 20, 'DRINK',
  'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400&q=80',
  'SYSTEM');

-- Use DO block to insert an order and its items, capturing the generated order_id
-- NOTE: table_id=NULL + TAKEAWAY pour ne pas créer d'incohérence statut table
DO $$
DECLARE last_order_id BIGINT;
BEGIN
    INSERT INTO orders (table_id, customer_id, created_by, order_type, payment_method) VALUES (NULL, 1, 'SYSTEM','TAKEAWAY','CARD') RETURNING order_id INTO last_order_id;
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, created_by)
    VALUES (last_order_id, (SELECT product_id FROM products WHERE product_name='Sandwich'), 3, (SELECT unit_price FROM products WHERE product_name='Sandwich'), 'SYSTEM');
END$$;

DO $$
DECLARE oid2 BIGINT;
BEGIN
    INSERT INTO orders (table_id, customer_id, created_by, order_type, payment_method) VALUES (NULL, NULL, 'SYSTEM','TAKEAWAY','CASH') RETURNING order_id INTO oid2;
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, created_by)
    VALUES (oid2, (SELECT product_id FROM products WHERE product_name='Pizza'), 2, (SELECT unit_price FROM products WHERE product_name='Pizza'), 'SYSTEM'),
           (oid2, (SELECT product_id FROM products WHERE product_name='Soda'), 4, (SELECT unit_price FROM products WHERE product_name='Soda'), 'SYSTEM');
END$$;

-- Provide an example supply
INSERT INTO provider_products (provider_id, product_id, quantity, supply_date, created_by)
VALUES
 ((SELECT provider_id FROM provider WHERE name='John Supply'), (SELECT product_id FROM products WHERE product_name='Pizza'), 100, CURRENT_DATE, 'SYSTEM'),
 ((SELECT provider_id FROM provider WHERE name='Sarah Deliver'), (SELECT product_id FROM products WHERE product_name='Soda'), 500, CURRENT_DATE, 'SYSTEM');

-- Example reservation
INSERT INTO reservations (customer_id, table_id, datetime_from, datetime_to, places, created_by)
VALUES (1, 3, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day 2 hours', 4, 'SYSTEM');

-- Insert 3 examples reviews
INSERT INTO reviews (customer_id, comment, created_by)
VALUES
  (1, 'Très bon service, sandwich délicieux.', 'SYSTEM'),
  (2, 'Service rapide mais pizza un peu froide.', 'SYSTEM'),
  (1, 'Ambiance sympa, personnel accueillant.', 'SYSTEM');

-- ── Nouveaux employés : cuisinier & caissier ─────────────────────────────────
INSERT INTO employees (last_name, first_name, username, address, phone, email, role_id, salary, hire_date, created_by)
VALUES
  ('Cuisinier', 'Chef',  'c.cuisinier', '15 Rue de la Cuisine, Bruxelles', '+32478000010',
   'c.cuisinier@snack-tiegni.be',
   (SELECT role_id FROM roles WHERE role_name = 'COOK'),    1800.00, CURRENT_DATE, 'SYSTEM'),
  ('Laresse',   'Alex',  'a.laresse',   '22 Rue du Commerce, Bruxelles',   '+32478000011',
   'a.laresse@snack-tiegni.be',
   (SELECT role_id FROM roles WHERE role_name = 'CASHIER'), 1700.00, CURRENT_DATE, 'SYSTEM')
ON CONFLICT (username) DO NOTHING;

-- ── Plats belges ─────────────────────────────────────────────────────────────
INSERT INTO products (product_name, description, unit_price, quantity_available, alert_threshold, product_type, image_url, created_by)
VALUES
  ('Moules-frites',
   'Moules de la Mer du Nord marinées au vin blanc, accompagnées de frites dorées maison',
   16.50, 30, 5, 'FOOD',
   'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80',
   'SYSTEM'),
  ('Carbonnade flamande',
   'Ragoût de bœuf belge mijoté à la bière brune Leffe, servi avec du pain de campagne beurré',
   14.50, 20, 5, 'FOOD',
   'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',
   'SYSTEM')
ON CONFLICT (product_name) DO NOTHING;

-- ── Boissons belges ──────────────────────────────────────────────────────────
INSERT INTO products (product_name, description, unit_price, quantity_available, alert_threshold, product_type, image_url, created_by)
VALUES
  ('Jupiler',
   'Bière blonde lager belge – la plus vendue de Belgique (33cl)',
   2.50, 200, 20, 'DRINK',
   'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80',
   'SYSTEM'),
  ('Leffe Brune',
   'Bière d''abbaye brune belge, riche aux arômes de caramel et vanille (33cl)',
   3.50, 150, 15, 'DRINK',
   'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&q=80',
   'SYSTEM'),
  ('Limonade Belge Cristal',
   'Limonade artisanale belge pétillante, légèrement sucrée au citron naturel (25cl)',
   2.00, 250, 25, 'DRINK',
   'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
   'SYSTEM')
ON CONFLICT (product_name) DO NOTHING;


