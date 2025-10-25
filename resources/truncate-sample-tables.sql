

    -----------------------------------------------------------
    -- 외래키 삭제
    -----------------------------------------------------------
    IF OBJECT_ID('FK_activity_logs_users', 'F') IS NOT NULL 
        ALTER TABLE activity_logs DROP CONSTRAINT FK_activity_logs_users;
    IF OBJECT_ID('FK_approval_relations_approver', 'F') IS NOT NULL 
        ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_approver;
    IF OBJECT_ID('FK_approval_relations_requester', 'F') IS NOT NULL 
        ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_requester;
    IF OBJECT_ID('FK_approval_relations_users', 'F') IS NOT NULL 
        ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_users;
    IF OBJECT_ID('FK_approval_relations_products', 'F') IS NOT NULL 
        ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_products;
    IF OBJECT_ID('FK_approval_requests_users', 'F') IS NOT NULL 
        ALTER TABLE approval_requests DROP CONSTRAINT FK_approval_requests_users;
    IF OBJECT_ID('FK_categories_parent', 'F') IS NOT NULL 
        ALTER TABLE categories DROP CONSTRAINT FK_categories_parent;
    IF OBJECT_ID('FK_departments_users', 'F') IS NOT NULL 
        ALTER TABLE departments DROP CONSTRAINT FK_departments_users;
    IF OBJECT_ID('FK_employees_manager', 'F') IS NOT NULL 
        ALTER TABLE employees DROP CONSTRAINT FK_employees_manager;
    IF OBJECT_ID('FK_entity_relationships_users', 'F') IS NOT NULL 
        ALTER TABLE entity_relationships DROP CONSTRAINT FK_entity_relationships_users;
    IF OBJECT_ID('FK_order_items_products', 'F') IS NOT NULL 
        ALTER TABLE order_items DROP CONSTRAINT FK_order_items_products;
    IF OBJECT_ID('FK_order_items_orders', 'F') IS NOT NULL 
        ALTER TABLE order_items DROP CONSTRAINT FK_order_items_orders;
    IF OBJECT_ID('FK_orders_customers', 'F') IS NOT NULL 
        ALTER TABLE orders DROP CONSTRAINT FK_orders_customers;
    IF OBJECT_ID('FK_orders_users', 'F') IS NOT NULL 
        ALTER TABLE orders DROP CONSTRAINT FK_orders_users;
    IF OBJECT_ID('FK_product_reviews_products', 'F') IS NOT NULL 
        ALTER TABLE product_reviews DROP CONSTRAINT FK_product_reviews_products;
    IF OBJECT_ID('FK_product_reviews_customers', 'F') IS NOT NULL 
        ALTER TABLE product_reviews DROP CONSTRAINT FK_product_reviews_customers;
    IF OBJECT_ID('FK_products_categories', 'F') IS NOT NULL 
        ALTER TABLE products DROP CONSTRAINT FK_products_categories;
    IF OBJECT_ID('FK_products_users', 'F') IS NOT NULL 
        ALTER TABLE products DROP CONSTRAINT FK_products_users;
    IF OBJECT_ID('FK_users_companies', 'F') IS NOT NULL 
        ALTER TABLE users DROP CONSTRAINT FK_users_companies;
    IF OBJECT_ID('FK_users_departments', 'F') IS NOT NULL 
        ALTER TABLE users DROP CONSTRAINT FK_users_departments;


PRINT '✅ 외래키 삭제 완료!';
PRINT '   - 다음으로 truncate-sample-tables.sql을 실행하세요.'; 
-----------------------------------------------------------
-- 테이블 truncate
-----------------------------------------------------------

truncate table order_items;
truncate table customers;
truncate table activity_logs;
truncate table companies;
truncate table employees;
truncate table product_reviews;
truncate table entity_relationships;
truncate table approval_requests;
truncate table audit_logs;
truncate table status_codes;
truncate table approval_relations;
truncate table migration_log;
truncate table validation_errors;
truncate table migration_stats;
truncate table audit_table;
truncate table users;
truncate table departments;
truncate table categories;
truncate table products;
truncate table orders;



-----------------------------------------------------------
-- 외래키 추가
-----------------------------------------------------------
IF OBJECT_ID('FK_activity_logs_users', 'F') IS NULL 
ALTER TABLE activity_logs ADD CONSTRAINT FK_activity_logs_users FOREIGN KEY (user_id) REFERENCES users(user_id);
IF OBJECT_ID('FK_approval_relations_approver', 'F') IS NULL 
ALTER TABLE approval_relations ADD CONSTRAINT FK_approval_relations_approver FOREIGN KEY (approver_id) REFERENCES users(user_id);
IF OBJECT_ID('FK_approval_relations_products', 'F') IS NULL 
ALTER TABLE approval_relations ADD CONSTRAINT FK_approval_relations_products FOREIGN KEY (product_code) REFERENCES products(product_code);
IF OBJECT_ID('FK_approval_relations_requester', 'F') IS NULL 
ALTER TABLE approval_relations ADD CONSTRAINT FK_approval_relations_requester FOREIGN KEY (requester_id) REFERENCES users(user_id);
IF OBJECT_ID('FK_approval_relations_users', 'F') IS NULL 
ALTER TABLE approval_relations ADD CONSTRAINT FK_approval_relations_users FOREIGN KEY (created_by) REFERENCES users(user_id);
IF OBJECT_ID('FK_approval_requests_users', 'F') IS NULL 
ALTER TABLE approval_requests ADD CONSTRAINT FK_approval_requests_users FOREIGN KEY (created_by) REFERENCES users(user_id);
IF OBJECT_ID('FK_categories_parent', 'F') IS NULL 
ALTER TABLE categories ADD CONSTRAINT FK_categories_parent FOREIGN KEY (parent_category_id) REFERENCES categories(category_id);
IF OBJECT_ID('FK_departments_users', 'F') IS NULL 
ALTER TABLE departments ADD CONSTRAINT FK_departments_users FOREIGN KEY (manager_id) REFERENCES users(user_id);
IF OBJECT_ID('FK_employees_manager', 'F') IS NULL 
ALTER TABLE employees ADD CONSTRAINT FK_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(emp_id);
IF OBJECT_ID('FK_entity_relationships_users', 'F') IS NULL 
ALTER TABLE entity_relationships ADD CONSTRAINT FK_entity_relationships_users FOREIGN KEY (created_by) REFERENCES users(user_id);
IF OBJECT_ID('FK_order_items_orders', 'F') IS NULL 
ALTER TABLE order_items ADD CONSTRAINT FK_order_items_orders FOREIGN KEY (order_number) REFERENCES orders(order_number);
IF OBJECT_ID('FK_order_items_products', 'F') IS NULL 
ALTER TABLE order_items ADD CONSTRAINT FK_order_items_products FOREIGN KEY (product_code) REFERENCES products(product_code);
IF OBJECT_ID('FK_orders_customers', 'F') IS NULL 
ALTER TABLE orders ADD CONSTRAINT FK_orders_customers FOREIGN KEY (customer_id) REFERENCES customers(customer_id);
IF OBJECT_ID('FK_orders_users', 'F') IS NULL 
ALTER TABLE orders ADD CONSTRAINT FK_orders_users FOREIGN KEY (created_by) REFERENCES users(user_id);
IF OBJECT_ID('FK_product_reviews_customers', 'F') IS NULL 
ALTER TABLE product_reviews ADD CONSTRAINT FK_product_reviews_customers FOREIGN KEY (customer_id) REFERENCES customers(customer_id);
IF OBJECT_ID('FK_product_reviews_products', 'F') IS NULL 
ALTER TABLE product_reviews ADD CONSTRAINT FK_product_reviews_products FOREIGN KEY (product_code) REFERENCES products(product_code);
IF OBJECT_ID('FK_products_categories', 'F') IS NULL 
ALTER TABLE products ADD CONSTRAINT FK_products_categories FOREIGN KEY (category_id) REFERENCES categories(category_id);
IF OBJECT_ID('FK_products_users', 'F') IS NULL 
ALTER TABLE products ADD CONSTRAINT FK_products_users FOREIGN KEY (created_by) REFERENCES users(user_id);
IF OBJECT_ID('FK_users_companies', 'F') IS NULL 
ALTER TABLE users ADD CONSTRAINT FK_users_companies FOREIGN KEY (company_code) REFERENCES companies(company_code);
IF OBJECT_ID('FK_users_departments', 'F') IS NULL 
ALTER TABLE users ADD CONSTRAINT FK_users_departments FOREIGN KEY (department_id) REFERENCES departments(department_id);


PRINT '✅ 외래키 생성 완료!';
PRINT '   - 다음으로 insert-sample-data.sql을 실행하세요.'; 