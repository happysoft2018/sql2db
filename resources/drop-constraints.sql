
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