-- ===============================================
-- 테스트용 샘플 테이블 생성 스크립트
-- SQL2DB 마이그레이션 도구 테스트용
-- ===============================================
-- 
-- 시간 설정 참고:
-- SQL Server에서 GETDATE()는 서버의 현지 시각을 반환합니다.
-- 한국 표준시(KST)로 설정하려면 서버 타임존을 확인하세요.
-- 
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
    company_code NVARCHAR(20) NULL,
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

-- 9. 회사 테이블 (Companies)
IF OBJECT_ID('companies', 'U') IS NOT NULL
    DROP TABLE companies;

CREATE TABLE companies (
    company_id INT IDENTITY(1,1) PRIMARY KEY,
    company_code NVARCHAR(20) NOT NULL UNIQUE,
    company_name NVARCHAR(200) NOT NULL,
    address NVARCHAR(500) NULL,
    phone NVARCHAR(50) NULL,
    email NVARCHAR(100) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    is_active BIT NOT NULL DEFAULT 1
);

-- 10. 직원 테이블 (Employees)
IF OBJECT_ID('employees', 'U') IS NOT NULL
    DROP TABLE employees;

CREATE TABLE employees (
    emp_id INT IDENTITY(1,1) PRIMARY KEY,
    emp_name NVARCHAR(100) NOT NULL,
    emp_code NVARCHAR(20) NOT NULL UNIQUE,
    department_code NVARCHAR(10) NOT NULL,
    hire_date DATE NOT NULL,
    salary DECIMAL(10,2) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    manager_id INT NULL,
    email NVARCHAR(100) NULL,
    phone NVARCHAR(50) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    is_active BIT NOT NULL DEFAULT 1
);

-- 11. 상품 리뷰 테이블 (Product_Reviews)
IF OBJECT_ID('product_reviews', 'U') IS NOT NULL
    DROP TABLE product_reviews;

CREATE TABLE product_reviews (
    review_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    customer_id INT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title NVARCHAR(200) NULL,
    review_text NVARCHAR(1000) NULL,
    is_verified BIT NOT NULL DEFAULT 0,
    helpful_count INT NOT NULL DEFAULT 0,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_date DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- 12. 엔티티 관계 테이블 (Entity_Relationships)
IF OBJECT_ID('entity_relationships', 'U') IS NOT NULL
    DROP TABLE entity_relationships;

CREATE TABLE entity_relationships (
    relation_id INT IDENTITY(1,1) PRIMARY KEY,
    entity_id INT NOT NULL,
    related_entity_id INT NOT NULL,
    relation_type NVARCHAR(50) NOT NULL,
    entity_type NVARCHAR(50) NOT NULL,
    related_entity_type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by INT NULL
);

-- 13. 승인 요청 테이블 (Approval_Requests)
IF OBJECT_ID('approval_requests', 'U') IS NOT NULL
    DROP TABLE approval_requests;

CREATE TABLE approval_requests (
    request_id INT IDENTITY(1,1) PRIMARY KEY,
    request_code NVARCHAR(50) NOT NULL UNIQUE,
    approver_code NVARCHAR(20) NOT NULL,
    requester_code NVARCHAR(20) NOT NULL,
    product_code NVARCHAR(50) NULL,
    request_type NVARCHAR(50) NOT NULL,
    request_amount DECIMAL(15,2) NULL,
    description NVARCHAR(1000) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    approved_date DATETIME2 NULL,
    rejected_date DATETIME2 NULL,
    comments NVARCHAR(1000) NULL,
    created_by INT NULL
);

-- 14. 감사 로그 테이블 (Audit_Logs)
IF OBJECT_ID('audit_logs', 'U') IS NOT NULL
    DROP TABLE audit_logs;

CREATE TABLE audit_logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    action_type NVARCHAR(100) NOT NULL,
    entity_code NVARCHAR(50) NULL,
    user_code NVARCHAR(20) NULL,
    table_name NVARCHAR(100) NULL,
    record_id INT NULL,
    log_message NVARCHAR(1000) NULL,
    old_values NVARCHAR(MAX) NULL,
    new_values NVARCHAR(MAX) NULL,
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(500) NULL,
    session_id NVARCHAR(100) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 15. 상태 코드 테이블 (Status_Codes)
IF OBJECT_ID('status_codes', 'U') IS NOT NULL
    DROP TABLE status_codes;

CREATE TABLE status_codes (
    status_id INT IDENTITY(1,1) PRIMARY KEY,
    category NVARCHAR(50) NOT NULL,
    status_code NVARCHAR(20) NOT NULL,
    status_description NVARCHAR(200) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    UNIQUE(category, status_code)
);

-- 16. 승인 관계 테이블 (Approval_Relations)
IF OBJECT_ID('approval_relations', 'U') IS NOT NULL
    DROP TABLE approval_relations;

CREATE TABLE approval_relations (
    relation_id INT IDENTITY(1,1) PRIMARY KEY,
    approver_id INT NOT NULL,
    requester_id INT NOT NULL,
    product_id INT NULL,
    relation_type NVARCHAR(50) NOT NULL,
    hierarchy_level INT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by INT NULL,
    effective_start_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    effective_end_date DATE NULL
);

-- 17. 마이그레이션 로그 테이블 (Migration_Log)
IF OBJECT_ID('migration_log', 'U') IS NOT NULL
    DROP TABLE migration_log;

CREATE TABLE migration_log (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    migration_id NVARCHAR(50) NULL,
    query_id NVARCHAR(100) NULL,
    phase NVARCHAR(50) NULL,
    operation_type NVARCHAR(50) NULL,
    table_name NVARCHAR(100) NULL,
    message NVARCHAR(1000) NULL,
    rows_processed INT NULL,
    start_time DATETIME2 NULL,
    end_time DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    error_message NVARCHAR(MAX) NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE()
);


-- 기존 테이블이 있다면 삭제
IF OBJECT_ID('validation_errors', 'U') IS NOT NULL
    DROP TABLE validation_errors;

-- 18. Validation Errors 테이블 생성
CREATE TABLE validation_errors (
    error_id INT IDENTITY(1,1) PRIMARY KEY,
    migration_id NVARCHAR(50) NULL,                    -- 마이그레이션 식별자
    query_id NVARCHAR(100) NULL,                       -- 쿼리 식별자
    table_name NVARCHAR(100) NOT NULL,                 -- 대상 테이블명
    column_name NVARCHAR(100) NULL,                    -- 오류가 발생한 컬럼명
    row_identifier NVARCHAR(500) NULL,                 -- 행 식별자 (PK 값 또는 고유 식별자)
    error_type NVARCHAR(50) NOT NULL,                  -- 오류 유형 (CONSTRAINT_VIOLATION, DATA_TYPE_MISMATCH, NULL_VIOLATION, UNIQUE_VIOLATION 등)
    error_code NVARCHAR(20) NULL,                      -- 오류 코드
    error_message NVARCHAR(1000) NOT NULL,             -- 오류 메시지
    error_details NVARCHAR(MAX) NULL,                  -- 상세 오류 정보 (JSON 형태 가능)
    source_data NVARCHAR(MAX) NULL,                    -- 원본 데이터 (문제가 된 데이터)
    expected_value NVARCHAR(500) NULL,                 -- 예상 값
    actual_value NVARCHAR(500) NULL,                   -- 실제 값
    severity NVARCHAR(20) NOT NULL DEFAULT 'ERROR',    -- 심각도 (ERROR, WARNING, INFO)
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',    -- 상태 (PENDING, RESOLVED, IGNORED, FIXED)
    resolved_by NVARCHAR(100) NULL,                    -- 해결한 사용자
    resolved_date DATETIME2 NULL,                      -- 해결 날짜
    resolution_notes NVARCHAR(1000) NULL,              -- 해결 노트
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(), -- 오류 발생 시간
    updated_date DATETIME2 NULL                        -- 마지막 업데이트 시간
);


-- 기존 테이블이 있다면 삭제
IF OBJECT_ID('migration_stats', 'U') IS NOT NULL
    DROP TABLE migration_stats;

-- 19. Migration Stats 테이블 생성
CREATE TABLE migration_stats (
    stat_id INT IDENTITY(1,1) PRIMARY KEY,
    migration_id NVARCHAR(50) NOT NULL,                 -- 마이그레이션 식별자
    query_id NVARCHAR(100) NULL,                        -- 쿼리 식별자 (NULL이면 전체 통계)
    table_name NVARCHAR(100) NULL,                      -- 대상 테이블명
    stat_type NVARCHAR(50) NOT NULL,                    -- 통계 유형 (OVERALL, QUERY, TABLE, PHASE)
    stat_category NVARCHAR(50) NOT NULL,                -- 통계 카테고리 (PERFORMANCE, DATA, ERROR, TIMING)
    stat_name NVARCHAR(100) NOT NULL,                   -- 통계 항목명
    stat_value DECIMAL(18,4) NULL,                      -- 통계 값 (숫자)
    stat_text NVARCHAR(500) NULL,                       -- 통계 값 (텍스트)
    stat_json NVARCHAR(MAX) NULL,                       -- 통계 값 (JSON 형태)
    start_time DATETIME2 NULL,                          -- 시작 시간
    end_time DATETIME2 NULL,                            -- 종료 시간
    duration_seconds DECIMAL(10,3) NULL,                -- 소요 시간 (초)
    batch_number INT NULL,                              -- 배치 번호
    phase NVARCHAR(50) NULL,                            -- 실행 단계 (preProcess, sourceQuery, postProcess)
    status NVARCHAR(20) NOT NULL DEFAULT 'COMPLETED',   -- 상태 (RUNNING, COMPLETED, FAILED)
    error_message NVARCHAR(1000) NULL,                  -- 오류 메시지
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),  -- 생성 시간
    updated_date DATETIME2 NULL                         -- 마지막 업데이트 시간
);



-- 20. 감사 테이블 (Audit_Table)
IF OBJECT_ID('audit_table', 'U') IS NOT NULL
    DROP TABLE audit_table;

CREATE TABLE audit_table (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    migration_id NVARCHAR(50) NULL,
    action_type NVARCHAR(100) NULL,
    table_name NVARCHAR(100) NULL,
    user_id INT ,
    message NVARCHAR(1000) NULL,
    start_time DATETIME2 NULL,
    end_time DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    error_message NVARCHAR(MAX) NULL,
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

-- ===============================================
-- 새로운 테이블들의 외래키 제약조건 추가
-- ===============================================

-- Users → Companies
ALTER TABLE users 
ADD CONSTRAINT FK_users_companies 
FOREIGN KEY (company_code) REFERENCES companies(company_code);

-- Employees → Employees (Self-reference for Manager)
ALTER TABLE employees 
ADD CONSTRAINT FK_employees_manager 
FOREIGN KEY (manager_id) REFERENCES employees(emp_id);

-- Product_Reviews → Products
ALTER TABLE product_reviews 
ADD CONSTRAINT FK_product_reviews_products 
FOREIGN KEY (product_id) REFERENCES products(product_id);

-- Product_Reviews → Customers
ALTER TABLE product_reviews 
ADD CONSTRAINT FK_product_reviews_customers 
FOREIGN KEY (customer_id) REFERENCES customers(customer_id);

-- Entity_Relationships → Users (Created by)
ALTER TABLE entity_relationships 
ADD CONSTRAINT FK_entity_relationships_users 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Approval_Requests → Users (Created by)
ALTER TABLE approval_requests 
ADD CONSTRAINT FK_approval_requests_users 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Approval_Relations → Users (Approver)
ALTER TABLE approval_relations 
ADD CONSTRAINT FK_approval_relations_approver 
FOREIGN KEY (approver_id) REFERENCES users(user_id);

-- Approval_Relations → Users (Requester)
ALTER TABLE approval_relations 
ADD CONSTRAINT FK_approval_relations_requester 
FOREIGN KEY (requester_id) REFERENCES users(user_id);

-- Approval_Relations → Products
ALTER TABLE approval_relations 
ADD CONSTRAINT FK_approval_relations_products 
FOREIGN KEY (product_id) REFERENCES products(product_id);

-- Approval_Relations → Users (Created by)
ALTER TABLE approval_relations 
ADD CONSTRAINT FK_approval_relations_users 
FOREIGN KEY (created_by) REFERENCES users(user_id);

PRINT '✅ 테스트용 샘플 테이블 생성 완료!';
PRINT '   - 17개 테이블 생성됨';
PRINT '   - 외래키 관계 설정됨';
PRINT '   - 다음으로 insert-sample-data.sql을 실행하세요.'; 