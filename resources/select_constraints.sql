

-- ===================================================================================
-- FK 정보 조회
-- ===================================================================================
SELECT 
    fk.name AS fk_name,
    tp.name AS parent_table,
    cp.name AS parent_column,
    tr.name AS referenced_table,
    cr.name AS referenced_column
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fkc 
    ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables AS tp 
    ON fkc.parent_object_id = tp.object_id
INNER JOIN sys.columns AS cp 
    ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
INNER JOIN sys.tables AS tr 
    ON fkc.referenced_object_id = tr.object_id
INNER JOIN sys.columns AS cr 
    ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
WHERE tp.name  IN (
         'order_items'
        ,'customers'
        ,'activity_logs'
        ,'companies'
        ,'employees'
        ,'product_reviews'
        ,'entity_relationships'
        ,'approval_requests'
        ,'audit_logs'
        ,'status_codes'
        ,'approval_relations'
        ,'migration_log'
        ,'validation_errors'
        ,'migration_stats'
        ,'audit_table'
        ,'users'
        ,'departments'
        ,'categories'
        ,'products'
        ,'orders'
    )

