

-----------------------------------------------------------
-- 외래키 삭제
-----------------------------------------------------------
ALTER TABLE activity_logs DROP CONSTRAINT FK_activity_logs_users;
ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_approver;
ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_requester;
ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_users;
ALTER TABLE approval_relations DROP CONSTRAINT FK_approval_relations_products;
ALTER TABLE approval_requests DROP CONSTRAINT FK_approval_requests_users;
ALTER TABLE categories DROP CONSTRAINT FK_categories_parent;
ALTER TABLE departments DROP CONSTRAINT FK_departments_users;
ALTER TABLE employees DROP CONSTRAINT FK_employees_manager;
ALTER TABLE entity_relationships DROP CONSTRAINT FK_entity_relationships_users;
ALTER TABLE order_items DROP CONSTRAINT FK_order_items_products;
ALTER TABLE order_items DROP CONSTRAINT FK_order_items_orders;
ALTER TABLE orders DROP CONSTRAINT FK_orders_customers;
ALTER TABLE orders DROP CONSTRAINT FK_orders_users;
ALTER TABLE product_reviews DROP CONSTRAINT FK_product_reviews_products;
ALTER TABLE product_reviews DROP CONSTRAINT FK_product_reviews_customers;
ALTER TABLE products DROP CONSTRAINT FK_products_categories;
ALTER TABLE products DROP CONSTRAINT FK_products_users;
ALTER TABLE users DROP CONSTRAINT FK_users_companies;
ALTER TABLE users DROP CONSTRAINT FK_users_departments;


-----------------------------------------------------------
-- 테이블 삭제
-----------------------------------------------------------
DROP TABLE product_reviews;
DROP TABLE entity_relationships;
DROP TABLE approval_requests;
DROP TABLE audit_logs;
DROP TABLE status_codes;
DROP TABLE approval_relations;
DROP TABLE migration_log;
DROP TABLE validation_errors;
DROP TABLE migration_stats;
DROP TABLE example_table;
DROP TABLE users;
DROP TABLE departments;
DROP TABLE categories;
DROP TABLE products;
DROP TABLE orders;
DROP TABLE order_items;
DROP TABLE customers;
DROP TABLE activity_logs;
DROP TABLE companies;
DROP TABLE employees;



