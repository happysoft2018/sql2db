

----------------------------------------------------------------------
-- 모든 FK 조회
----------------------------------------------------------------------
SELECT
	fk.name AS '외래키 이름',
    OBJECT_NAME(fkc.parent_object_id) AS '테이블 이름',
    c1.name AS '컬럼 이름',
    OBJECT_NAME(fkc.referenced_object_id) AS '참조된 테이블 이름',
    c2.name AS '참조된 컬럼 이름',
    fkc.constraint_column_id AS '외래키 순서',
	CONCAT('ALTER TABLE ', OBJECT_NAME(fkc.parent_object_id), ' DROP CONSTRAINT ', fk.name, ';') AS '삭제명령어'
FROM
    sys.foreign_key_columns fkc
INNER JOIN
    sys.columns c1 ON fkc.parent_column_id = c1.column_id AND fkc.parent_object_id = c1.object_id
INNER JOIN
    sys.columns c2 ON fkc.referenced_column_id = c2.column_id AND fkc.referenced_object_id = c2.object_id
INNER JOIN
	sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id
ORDER BY
    OBJECT_NAME(fkc.parent_object_id), fkc.constraint_column_id;




----------------------------------------------------------------------
-- 모든 테이블 조회
----------------------------------------------------------------------
SELECT name, CONCAT('DROP TABLE ', name, ';') AS '테이블 삭제 명령어' 
FROM sys.tables;

