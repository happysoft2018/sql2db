-- ===============================================
-- 테스트용 샘플 테이블 생성 스크립트
-- SQL2DB 마이그레이션 도구 테스트용
-- ===============================================

-- 1. 사용자 테이블 (Users)
IF OBJECT_ID('users', 'U') IS NOT NULL
    DROP TABLE users;

CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    department_id INT NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_login_date DATETIME2 NULL,
    is_active BIT NOT NULL DEFAULT 1,
    salary DECIMAL(10,2) NULL,
    birth_date DATE NULL
);

-- 2. 부서 테이블 (Departments)
IF OBJECT_ID('departments', 'U') IS NOT NULL
    DROP TABLE departments;

CREATE TABLE departments (
    department_id INT IDENTITY(1,1) PRIMARY KEY,
    department_name NVARCHAR(100) NOT NULL,
    department_code NVARCHAR(10) NOT NULL UNIQUE,
    manager_id INT NULL,
    budget DECIMAL(15,2) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    is_active BIT NOT NULL DEFAULT 1
);

-- 3. 카테고리 테이블 (Categories)
IF OBJECT_ID('categories', 'U') IS NOT NULL
    DROP TABLE categories;

CREATE TABLE categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL,
    category_code NVARCHAR(20) NOT NULL UNIQUE,
    parent_category_id INT NULL,
    description NVARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 4. 상품 테이블 (Products)
IF OBJECT_ID('products', 'U') IS NOT NULL
    DROP TABLE products;

CREATE TABLE products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    product_name NVARCHAR(200) NOT NULL,
    product_code NVARCHAR(50) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description NVARCHAR(1000) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_date DATETIME2 NULL,
    created_by INT NULL
);

-- 5. 주문 테이블 (Orders)
IF OBJECT_ID('orders', 'U') IS NOT NULL
    DROP TABLE orders;

CREATE TABLE orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    order_number NVARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    order_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    ship_date DATETIME2 NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_method NVARCHAR(50) NULL,
    shipping_address NVARCHAR(500) NULL,
    notes NVARCHAR(1000) NULL,
    created_by INT NULL
);

-- 6. 주문 상세 테이블 (Order_Items)
IF OBJECT_ID('order_items', 'U') IS NOT NULL
    DROP TABLE order_items;

CREATE TABLE order_items (
    order_item_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    line_total AS (quantity * unit_price * (1 - discount_percent / 100)),
    created_date DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 7. 고객 테이블 (Customers)
IF OBJECT_ID('customers', 'U') IS NOT NULL
    DROP TABLE customers;

CREATE TABLE customers (
    customer_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_code NVARCHAR(20) NOT NULL UNIQUE,
    company_name NVARCHAR(200) NULL,
    contact_name NVARCHAR(100) NOT NULL,
    contact_email NVARCHAR(100) NOT NULL,
    contact_phone NVARCHAR(50) NULL,
    address NVARCHAR(500) NULL,
    city NVARCHAR(100) NULL,
    country NVARCHAR(100) NULL,
    customer_type NVARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    credit_limit DECIMAL(15,2) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_order_date DATETIME2 NULL
);

-- 8. 로그 테이블 (Activity_Logs)
IF OBJECT_ID('activity_logs', 'U') IS NOT NULL
    DROP TABLE activity_logs;

CREATE TABLE activity_logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    action NVARCHAR(100) NOT NULL,
    table_name NVARCHAR(100) NULL,
    record_id INT NULL,
    old_values NVARCHAR(MAX) NULL,
    new_values NVARCHAR(MAX) NULL,
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(500) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ===============================================
-- 외래키 제약조건 추가
-- ===============================================

-- Users → Departments
ALTER TABLE users 
ADD CONSTRAINT FK_users_departments 
FOREIGN KEY (department_id) REFERENCES departments(department_id);

-- Departments → Users (Manager)
ALTER TABLE departments 
ADD CONSTRAINT FK_departments_users 
FOREIGN KEY (manager_id) REFERENCES users(user_id);

-- Categories → Categories (Self-reference)
ALTER TABLE categories 
ADD CONSTRAINT FK_categories_parent 
FOREIGN KEY (parent_category_id) REFERENCES categories(category_id);

-- Products → Categories
ALTER TABLE products 
ADD CONSTRAINT FK_products_categories 
FOREIGN KEY (category_id) REFERENCES categories(category_id);

-- Products → Users (Created by)
ALTER TABLE products 
ADD CONSTRAINT FK_products_users 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Orders → Customers
ALTER TABLE orders 
ADD CONSTRAINT FK_orders_customers 
FOREIGN KEY (customer_id) REFERENCES customers(customer_id);

-- Orders → Users (Created by)
ALTER TABLE orders 
ADD CONSTRAINT FK_orders_users 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Order_Items → Orders
ALTER TABLE order_items 
ADD CONSTRAINT FK_order_items_orders 
FOREIGN KEY (order_id) REFERENCES orders(order_id);

-- Order_Items → Products
ALTER TABLE order_items 
ADD CONSTRAINT FK_order_items_products 
FOREIGN KEY (product_id) REFERENCES products(product_id);

-- Activity_Logs → Users
ALTER TABLE activity_logs 
ADD CONSTRAINT FK_activity_logs_users 
FOREIGN KEY (user_id) REFERENCES users(user_id);

PRINT '✅ 테스트용 샘플 테이블 생성 완료!';
PRINT '   - 8개 테이블 생성됨';
PRINT '   - 외래키 관계 설정됨';
PRINT '   - 다음으로 insert-sample-data.sql을 실행하세요.'; 