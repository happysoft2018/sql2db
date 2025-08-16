-- ===============================================
-- Example Table 생성 스크립트
-- SQL2DB 마이그레이션 도구 테스트용 예시 테이블
-- ===============================================
-- 
-- 이 스크립트는 마이그레이션 테스트를 위한 다양한 데이터 타입과
-- 제약조건을 포함한 예시 테이블을 생성합니다.
-- 
-- 시간 설정 참고:
-- SQL Server에서 GETDATE()는 서버의 현지 시각을 반환합니다.
-- 한국 표준시(KST)로 설정하려면 서버 타임존을 확인하세요.
-- 
-- ===============================================

-- 기존 테이블이 있다면 삭제
IF OBJECT_ID('example_table', 'U') IS NOT NULL
    DROP TABLE example_table;

-- Example Table 생성
CREATE TABLE example_table (
    -- 기본 식별자
    id INT IDENTITY(1,1) PRIMARY KEY,
    unique_code NVARCHAR(20) NOT NULL UNIQUE,
    
    -- 문자열 타입들
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    email NVARCHAR(150) NULL,
    phone NVARCHAR(20) NULL,
    address NVARCHAR(300) NULL,
    city NVARCHAR(50) NULL,
    country NVARCHAR(50) NULL,
    postal_code NVARCHAR(10) NULL,
    
    -- 숫자 타입들
    age INT NULL,
    salary DECIMAL(10,2) NULL,
    rating DECIMAL(3,2) NULL,
    quantity INT NOT NULL DEFAULT 0,
    price DECIMAL(12,2) NULL,
    discount_percent DECIMAL(5,2) NULL,
    
    -- 날짜/시간 타입들
    birth_date DATE NULL,
    hire_date DATE NULL,
    created_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_date DATETIME2 NULL,
    last_login DATETIME2 NULL,
    expiry_date DATETIME2 NULL,
    
    -- 불린 타입
    is_active BIT NOT NULL DEFAULT 1,
    is_verified BIT NOT NULL DEFAULT 0,
    is_premium BIT NOT NULL DEFAULT 0,
    
    -- 열거형 스타일 (문자열로 구현)
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    category NVARCHAR(30) NULL,
    priority NVARCHAR(10) NULL,
    gender NVARCHAR(10) NULL,
    
    -- JSON 데이터
    metadata NVARCHAR(MAX) NULL,
    preferences NVARCHAR(MAX) NULL,
    
    -- 바이너리 데이터 (이미지, 파일 등)
    profile_image VARBINARY(MAX) NULL,
    document_file VARBINARY(MAX) NULL,
    
    -- 계산된 컬럼
    full_name AS (name + ' (' + unique_code + ')') PERSISTED,
    age_group AS (
        CASE 
            WHEN age < 18 THEN 'Under 18'
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 35 THEN '26-35'
            WHEN age BETWEEN 36 AND 50 THEN '36-50'
            WHEN age > 50 THEN 'Over 50'
            ELSE 'Unknown'
        END
    ) PERSISTED,
    
    -- 체크 제약조건들
    CONSTRAINT CK_example_table_age CHECK (age >= 0 AND age <= 150),
    CONSTRAINT CK_example_table_salary CHECK (salary >= 0),
    CONSTRAINT CK_example_table_rating CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT CK_example_table_quantity CHECK (quantity >= 0),
    CONSTRAINT CK_example_table_price CHECK (price >= 0),
    CONSTRAINT CK_example_table_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT CK_example_table_status CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED')),
    CONSTRAINT CK_example_table_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT CK_example_table_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
    CONSTRAINT CK_example_table_email CHECK (email LIKE '%@%.%'),
    CONSTRAINT CK_example_table_phone CHECK (phone LIKE '[0-9]%' OR phone IS NULL)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IX_example_table_name ON example_table(name);
CREATE INDEX IX_example_table_email ON example_table(email);
CREATE INDEX IX_example_table_status ON example_table(status);
CREATE INDEX IX_example_table_category ON example_table(category);
CREATE INDEX IX_example_table_created_date ON example_table(created_date);
CREATE INDEX IX_example_table_is_active ON example_table(is_active);
CREATE INDEX IX_example_table_status_active ON example_table(status, is_active);
CREATE INDEX IX_example_table_category_status ON example_table(category, status);

-- 테이블 생성 완료 메시지
PRINT 'Example Table이 성공적으로 생성되었습니다.';
PRINT '테이블명: example_table';
PRINT '생성 시간: ' + CONVERT(NVARCHAR, GETDATE(), 120);

-- ===============================================
-- 샘플 데이터 삽입 (선택사항)
-- ===============================================

-- 샘플 데이터를 삽입하려면 아래 주석을 해제하세요

INSERT INTO example_table (
    unique_code, name, description, email, phone, address, city, country, postal_code,
    age, salary, rating, quantity, price, discount_percent,
    birth_date, hire_date, last_login, expiry_date,
    is_active, is_verified, is_premium,
    status, category, priority, gender,
    metadata, preferences
) VALUES
-- 일반 사용자
('EMP001', '김철수', '개발팀 선임 개발자', 'kim.cs@company.com', '010-1234-5678', '서울시 강남구 테헤란로 123', '서울', '대한민국', '06123',
    28, 4500000.00, 4.5, 1, 0.00, 0.00,
    '1995-03-15', '2020-01-15', '2024-01-15 09:30:00', '2025-01-15 00:00:00',
    1, 1, 0,
    'ACTIVE', 'EMPLOYEE', 'MEDIUM', 'MALE',
    '{"department": "IT", "skills": ["Java", "Spring", "SQL"]}', '{"theme": "dark", "language": "ko"}'),

-- 관리자
('EMP002', '이영희', '마케팅팀 팀장', 'lee.yh@company.com', '010-2345-6789', '서울시 서초구 서초대로 456', '서울', '대한민국', '06611',
    35, 6500000.00, 4.8, 1, 0.00, 0.00,
    '1988-07-22', '2018-03-01', '2024-01-15 08:45:00', '2025-01-15 00:00:00',
    1, 1, 1,
    'ACTIVE', 'MANAGER', 'HIGH', 'FEMALE',
    '{"department": "Marketing", "team_size": 8}', '{"theme": "light", "language": "ko"}'),

-- 신입 사원
('EMP003', '박민수', '신입 개발자', 'park.ms@company.com', '010-3456-7890', '경기도 성남시 분당구 정자로 789', '성남', '대한민국', '13561',
    24, 3200000.00, 4.2, 1, 0.00, 0.00,
    '1999-11-08', '2024-01-02', '2024-01-15 10:15:00', '2025-01-15 00:00:00',
    1, 1, 0,
    'ACTIVE', 'EMPLOYEE', 'LOW', 'MALE',
    '{"department": "IT", "mentor": "EMP001"}', '{"theme": "auto", "language": "ko"}'),

-- 휴직자
('EMP004', '최수진', '디자인팀 디자이너', 'choi.sj@company.com', '010-4567-8901', '부산시 해운대구 해운대로 321', '부산', '대한민국', '48095',
    29, 3800000.00, 4.6, 1, 0.00, 0.00,
    '1994-05-12', '2021-06-01', '2023-12-20 17:30:00', '2024-06-01 00:00:00',
    0, 1, 0,
    'SUSPENDED', 'EMPLOYEE', 'MEDIUM', 'FEMALE',
    '{"department": "Design", "leave_reason": "육아휴직"}', '{"theme": "light", "language": "ko"}'),

-- 고객 데이터
('CUST001', '홍길동', 'VIP 고객', 'hong.gd@email.com', '010-5678-9012', '대구시 수성구 동대구로 654', '대구', '대한민국', '41931',
    42, 0.00, 5.0, 5, 150000.00, 10.00,
    '1981-09-30', NULL, '2024-01-14 15:20:00', '2024-12-31 00:00:00',
    1, 1, 1,
    'ACTIVE', 'CUSTOMER', 'HIGH', 'MALE',
    '{"customer_type": "VIP", "total_purchases": 2500000}', '{"newsletter": true, "marketing": true}'),

-- 비활성 사용자
('EMP005', '정태호', '전 직원', 'jung.th@oldcompany.com', '010-6789-0123', '인천시 연수구 송도대로 987', '인천', '대한민국', '22004',
    31, 0.00, 3.8, 1, 0.00, 0.00,
    '1992-12-03', '2019-08-01', '2023-08-31 18:00:00', '2023-08-31 00:00:00',
    0, 1, 0,
    'INACTIVE', 'FORMER_EMPLOYEE', 'LOW', 'MALE',
    '{"department": "Sales", "termination_date": "2023-08-31"}', '{"theme": "light", "language": "ko"}');

PRINT '샘플 데이터가 삽입되었습니다.';


-- ===============================================
-- 유용한 뷰 생성 (선택사항)
-- ===============================================

-- 활성 사용자 뷰
IF OBJECT_ID('v_active_users', 'V') IS NOT NULL
    DROP VIEW v_active_users;

CREATE VIEW v_active_users AS
SELECT 
    id,
    unique_code,
    name,
    email,
    age,
    salary,
    status,
    category,
    created_date,
    full_name,
    age_group
FROM example_table
WHERE is_active = 1 AND status = 'ACTIVE';

PRINT 'Active Users 뷰가 생성되었습니다.';

-- 직원 통계 뷰
IF OBJECT_ID('v_employee_stats', 'V') IS NOT NULL
    DROP VIEW v_employee_stats;

CREATE VIEW v_employee_stats AS
SELECT 
    category,
    COUNT(*) as total_count,
    AVG(CAST(age AS FLOAT)) as avg_age,
    AVG(CAST(salary AS FLOAT)) as avg_salary,
    AVG(CAST(rating AS FLOAT)) as avg_rating,
    COUNT(CASE WHEN is_premium = 1 THEN 1 END) as premium_count,
    COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified_count
FROM example_table
WHERE category IN ('EMPLOYEE', 'MANAGER')
GROUP BY category;

PRINT 'Employee Stats 뷰가 생성되었습니다.';

-- ===============================================
-- 유용한 저장 프로시저 생성 (선택사항)
-- ===============================================

-- 사용자 상태 업데이트 저장 프로시저
IF OBJECT_ID('sp_update_user_status', 'P') IS NOT NULL
    DROP PROCEDURE sp_update_user_status;

CREATE PROCEDURE sp_update_user_status
    @unique_code NVARCHAR(20),
    @new_status NVARCHAR(20),
    @is_active BIT = NULL,
    @updated_by NVARCHAR(100) = NULL
AS
BEGIN
    DECLARE @old_status NVARCHAR(20);
    DECLARE @old_is_active BIT;
    
    -- 현재 상태 조회
    SELECT @old_status = status, @old_is_active = is_active
    FROM example_table
    WHERE unique_code = @unique_code;
    
    IF @old_status IS NULL
    BEGIN
        RAISERROR('사용자를 찾을 수 없습니다: %s', 16, 1, @unique_code);
        RETURN;
    END
    
    -- 상태 업데이트
    UPDATE example_table
    SET 
        status = @new_status,
        is_active = ISNULL(@is_active, is_active),
        updated_date = GETDATE()
    WHERE unique_code = @unique_code;
    
    -- 로그 출력
    PRINT '사용자 상태가 업데이트되었습니다:';
    PRINT '  코드: ' + @unique_code;
    PRINT '  이전 상태: ' + @old_status + ' -> 새 상태: ' + @new_status;
    PRINT '  이전 활성: ' + CAST(@old_is_active AS NVARCHAR) + ' -> 새 활성: ' + CAST(ISNULL(@is_active, @old_is_active) AS NVARCHAR);
    PRINT '  업데이트자: ' + ISNULL(@updated_by, 'SYSTEM');
END;

PRINT 'User Status Update 저장 프로시저가 생성되었습니다.';

-- 사용자 검색 저장 프로시저
IF OBJECT_ID('sp_search_users', 'P') IS NOT NULL
    DROP PROCEDURE sp_search_users;

CREATE PROCEDURE sp_search_users
    @search_term NVARCHAR(100) = NULL,
    @category NVARCHAR(30) = NULL,
    @status NVARCHAR(20) = NULL,
    @is_active BIT = NULL,
    @min_age INT = NULL,
    @max_age INT = NULL,
    @min_salary DECIMAL(10,2) = NULL,
    @max_salary DECIMAL(10,2) = NULL
AS
BEGIN
    SELECT 
        id,
        unique_code,
        name,
        email,
        age,
        salary,
        status,
        category,
        is_active,
        created_date,
        full_name,
        age_group
    FROM example_table
    WHERE 
        (@search_term IS NULL OR 
         name LIKE '%' + @search_term + '%' OR 
         email LIKE '%' + @search_term + '%' OR
         unique_code LIKE '%' + @search_term + '%')
        AND (@category IS NULL OR category = @category)
        AND (@status IS NULL OR status = @status)
        AND (@is_active IS NULL OR is_active = @is_active)
        AND (@min_age IS NULL OR age >= @min_age)
        AND (@max_age IS NULL OR age <= @max_age)
        AND (@min_salary IS NULL OR salary >= @min_salary)
        AND (@max_salary IS NULL OR salary <= @max_salary)
    ORDER BY created_date DESC;
END;

PRINT 'User Search 저장 프로시저가 생성되었습니다.';

-- ===============================================
-- 테이블 정보 조회
-- ===============================================

-- 생성된 테이블 정보 확인
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'example_table'
ORDER BY ORDINAL_POSITION;

-- 제약조건 정보 확인
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
    ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
WHERE kcu.TABLE_NAME = 'example_table'
ORDER BY CONSTRAINT_TYPE, CONSTRAINT_NAME;

-- 인덱스 정보 확인
SELECT 
    i.name as index_name,
    i.type_desc as index_type,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) as columns
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('example_table')
GROUP BY i.name, i.type_desc
ORDER BY i.name;

PRINT 'Example Table 생성 스크립트가 완료되었습니다.';
