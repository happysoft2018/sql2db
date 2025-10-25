

-----------------------------------------------------------
-- 테이블 삭제
-----------------------------------------------------------
IF OBJECT_ID('product_reviews', 'U') IS NOT NULL 
    DROP TABLE product_reviews;
IF OBJECT_ID('entity_relationships', 'U') IS NOT NULL 
    DROP TABLE entity_relationships;
IF OBJECT_ID('approval_requests', 'U') IS NOT NULL 
    DROP TABLE approval_requests;
IF OBJECT_ID('audit_logs', 'U') IS NOT NULL 
    DROP TABLE audit_logs;
IF OBJECT_ID('status_codes', 'U') IS NOT NULL 
    DROP TABLE status_codes;
IF OBJECT_ID('approval_relations', 'U') IS NOT NULL 
    DROP TABLE approval_relations;
IF OBJECT_ID('migration_log', 'U') IS NOT NULL 
    DROP TABLE migration_log;
IF OBJECT_ID('validation_errors', 'U') IS NOT NULL 
    DROP TABLE validation_errors;
IF OBJECT_ID('migration_stats', 'U') IS NOT NULL 
    DROP TABLE migration_stats;
IF OBJECT_ID('example_table', 'U') IS NOT NULL 
    DROP TABLE example_table;
IF OBJECT_ID('users', 'U') IS NOT NULL 
    DROP TABLE users;
IF OBJECT_ID('departments', 'U') IS NOT NULL 
    DROP TABLE departments;
IF OBJECT_ID('categories', 'U') IS NOT NULL 
    DROP TABLE categories;
IF OBJECT_ID('products', 'U') IS NOT NULL 
    DROP TABLE products;
IF OBJECT_ID('orders', 'U') IS NOT NULL 
    DROP TABLE orders;
IF OBJECT_ID('order_items', 'U') IS NOT NULL 
    DROP TABLE order_items;
IF OBJECT_ID('customers', 'U') IS NOT NULL 
    DROP TABLE customers;
IF OBJECT_ID('activity_logs', 'U') IS NOT NULL 
    DROP TABLE activity_logs;
IF OBJECT_ID('companies', 'U') IS NOT NULL 
    DROP TABLE companies;
IF OBJECT_ID('employees', 'U') IS NOT NULL 
    DROP TABLE employees;



