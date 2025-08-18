SELECT *
FROM products 
WHERE status IN (${statusList}) 
AND category_id IN (${categoryIds}) 
