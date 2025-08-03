-- ===============================================
-- 테스트용 샘플 데이터 입력 스크립트
-- SQL2DB 마이그레이션 도구 테스트용
-- ===============================================

-- 임시로 외래키 제약조건 비활성화
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";

PRINT '🚀 테스트용 샘플 데이터 입력 시작...';

-- ===============================================
-- 1. 부서 데이터 입력 (Departments)
-- ===============================================
PRINT '📝 부서 데이터 입력 중...';

INSERT INTO departments (department_name, department_code, budget) VALUES
('개발팀', 'DEV', 500000000.00),
('마케팅팀', 'MKT', 300000000.00),
('영업팀', 'SALES', 200000000.00),
('인사팀', 'HR', 150000000.00),
('재무팀', 'FIN', 100000000.00),
('IT지원팀', 'IT', 80000000.00),
('품질관리팀', 'QA', 120000000.00),
('디자인팀', 'DESIGN', 180000000.00);

-- ===============================================
-- 2. 사용자 데이터 입력 (Users)
-- ===============================================
PRINT '👥 사용자 데이터 입력 중...';

INSERT INTO users (username, email, first_name, last_name, status, department_id, last_login_date, salary, birth_date) VALUES
('john.doe', 'john.doe@company.com', '존', '도', 'ACTIVE', 1, DATEADD(day, -1, GETDATE()), 75000.00, '1985-03-15'),
('jane.smith', 'jane.smith@company.com', '제인', '스미스', 'ACTIVE', 1, DATEADD(day, -2, GETDATE()), 82000.00, '1987-07-22'),
('mike.johnson', 'mike.johnson@company.com', '마이크', '존슨', 'ACTIVE', 2, DATEADD(day, -3, GETDATE()), 68000.00, '1990-11-08'),
('sarah.wilson', 'sarah.wilson@company.com', '사라', '윌슨', 'ACTIVE', 3, DATEADD(hour, -5, GETDATE()), 72000.00, '1988-05-14'),
('david.brown', 'david.brown@company.com', '데이비드', '브라운', 'PENDING', 1, NULL, 78000.00, '1986-09-30'),
('emily.davis', 'emily.davis@company.com', '에밀리', '데이비스', 'ACTIVE', 4, DATEADD(day, -7, GETDATE()), 65000.00, '1992-01-18'),
('robert.miller', 'robert.miller@company.com', '로버트', '밀러', 'ACTIVE', 5, DATEADD(day, -1, GETDATE()), 85000.00, '1983-12-05'),
('lisa.garcia', 'lisa.garcia@company.com', '리사', '가르시아', 'ACTIVE', 6, DATEADD(hour, -12, GETDATE()), 70000.00, '1989-08-27'),
('kevin.martinez', 'kevin.martinez@company.com', '케빈', '마르티네즈', 'APPROVED', 7, DATEADD(day, -4, GETDATE()), 73000.00, '1991-04-12'),
('amanda.taylor', 'amanda.taylor@company.com', '아만다', '테일러', 'ACTIVE', 8, DATEADD(day, -2, GETDATE()), 67000.00, '1990-10-03'),
('chris.anderson', 'chris.anderson@company.com', '크리스', '앤더슨', 'PENDING', 2, NULL, 71000.00, '1987-06-19'),
('nicole.thomas', 'nicole.thomas@company.com', '니콜', '토마스', 'ACTIVE', 3, DATEADD(day, -6, GETDATE()), 74000.00, '1988-02-28'),
('ryan.jackson', 'ryan.jackson@company.com', '라이언', '잭슨', 'ACTIVE', 1, DATEADD(hour, -8, GETDATE()), 79000.00, '1985-11-16'),
('jennifer.white', 'jennifer.white@company.com', '제니퍼', '화이트', 'APPROVED', 4, DATEADD(day, -3, GETDATE()), 66000.00, '1993-07-07'),
('matthew.harris', 'matthew.harris@company.com', '매튜', '해리스', 'ACTIVE', 5, DATEADD(day, -1, GETDATE()), 81000.00, '1984-04-25');

-- 부서 관리자 업데이트
UPDATE departments SET manager_id = 1 WHERE department_id = 1; -- 개발팀 관리자: john.doe
UPDATE departments SET manager_id = 3 WHERE department_id = 2; -- 마케팅팀 관리자: mike.johnson
UPDATE departments SET manager_id = 4 WHERE department_id = 3; -- 영업팀 관리자: sarah.wilson
UPDATE departments SET manager_id = 6 WHERE department_id = 4; -- 인사팀 관리자: emily.davis
UPDATE departments SET manager_id = 7 WHERE department_id = 5; -- 재무팀 관리자: robert.miller

-- ===============================================
-- 3. 카테고리 데이터 입력 (Categories)
-- ===============================================
PRINT '📂 카테고리 데이터 입력 중...';

INSERT INTO categories (category_name, category_code, description, sort_order) VALUES
('전자제품', 'ELEC', '전자제품 전체 카테고리', 1),
('의류', 'CLOTH', '의류 전체 카테고리', 2),
('도서', 'BOOK', '도서 전체 카테고리', 3),
('가구', 'FURN', '가구 전체 카테고리', 4),
('스포츠', 'SPORT', '스포츠용품 전체 카테고리', 5);

-- 하위 카테고리 입력
INSERT INTO categories (category_name, category_code, parent_category_id, description, sort_order) VALUES
('스마트폰', 'PHONE', 1, '스마트폰 및 액세서리', 11),
('노트북', 'LAPTOP', 1, '노트북 및 컴퓨터', 12),
('남성의류', 'MENS', 2, '남성용 의류', 21),
('여성의류', 'WOMENS', 2, '여성용 의류', 22),
('소설', 'NOVEL', 3, '소설 도서', 31),
('전문서적', 'TECH', 3, '전문 기술 서적', 32),
('침실가구', 'BEDROOM', 4, '침실용 가구', 41),
('거실가구', 'LIVING', 4, '거실용 가구', 42);

-- ===============================================
-- 4. 고객 데이터 입력 (Customers)
-- ===============================================
PRINT '🏢 고객 데이터 입력 중...';

INSERT INTO customers (customer_code, company_name, contact_name, contact_email, contact_phone, address, city, country, customer_type, credit_limit, last_order_date) VALUES
('CUST001', '테크솔루션(주)', '김철수', 'kim@techsolution.com', '02-1234-5678', '서울시 강남구 테헤란로 123', '서울', '한국', 'CORPORATE', 10000000.00, DATEADD(day, -5, GETDATE())),
('CUST002', '글로벌IT', '이영희', 'lee@globalit.com', '02-2345-6789', '서울시 서초구 서초대로 456', '서울', '한국', 'CORPORATE', 15000000.00, DATEADD(day, -2, GETDATE())),
('CUST003', NULL, '박민수', 'park@email.com', '010-3456-7890', '부산시 해운대구 해운대로 789', '부산', '한국', 'INDIVIDUAL', 1000000.00, DATEADD(day, -10, GETDATE())),
('CUST004', '스마트비즈', '정수연', 'jung@smartbiz.com', '031-4567-8901', '경기도 성남시 분당구 판교로 101', '성남', '한국', 'CORPORATE', 8000000.00, DATEADD(day, -1, GETDATE())),
('CUST005', NULL, '최동욱', 'choi@personal.com', '010-5678-9012', '대구시 수성구 동대구로 202', '대구', '한국', 'INDIVIDUAL', 500000.00, DATEADD(day, -15, GETDATE())),
('CUST006', '이노베이션코프', '한지민', 'han@innovation.com', '051-6789-0123', '부산시 금정구 부산대학로 303', '부산', '한국', 'CORPORATE', 12000000.00, DATEADD(day, -3, GETDATE())),
('CUST007', NULL, '송민호', 'song@gmail.com', '010-7890-1234', '광주시 서구 상무대로 404', '광주', '한국', 'INDIVIDUAL', 800000.00, DATEADD(day, -8, GETDATE())),
('CUST008', '디지털월드', '윤서희', 'yoon@digitalworld.com', '042-8901-2345', '대전시 유성구 대학로 505', '대전', '한국', 'CORPORATE', 6000000.00, DATEADD(day, -12, GETDATE())),
('CUST009', NULL, '강태현', 'kang@naver.com', '010-9012-3456', '인천시 남동구 인천대로 606', '인천', '한국', 'INDIVIDUAL', 1200000.00, DATEADD(day, -6, GETDATE())),
('CUST010', '퓨처테크', '임수빈', 'lim@futuretech.com', '02-0123-4567', '서울시 마포구 월드컵로 707', '서울', '한국', 'CORPORATE', 20000000.00, DATEADD(day, -4, GETDATE()));

-- ===============================================
-- 5. 상품 데이터 입력 (Products)
-- ===============================================
PRINT '📦 상품 데이터 입력 중...';

INSERT INTO products (product_name, product_code, category_id, price, cost, stock_quantity, min_stock_level, description, created_by) VALUES
('갤럭시 S24 Ultra', 'PHONE001', 6, 1200000.00, 800000.00, 150, 20, '최신 플래그십 스마트폰', 1),
('아이폰 15 Pro', 'PHONE002', 6, 1350000.00, 900000.00, 120, 15, '애플 최신 프로 모델', 1),
('맥북 프로 16인치', 'LAPTOP001', 7, 3200000.00, 2400000.00, 50, 10, '고성능 노트북', 2),
('델 XPS 13', 'LAPTOP002', 7, 1800000.00, 1300000.00, 80, 15, '초경량 노트북', 2),
('나이키 에어맥스', 'MENS001', 8, 180000.00, 120000.00, 200, 30, '인기 운동화', 3),
('아디다스 후디', 'MENS002', 8, 95000.00, 65000.00, 180, 25, '편안한 후드티', 3),
('자라 원피스', 'WOMENS001', 9, 89000.00, 45000.00, 150, 20, '트렌디한 원피스', 4),
('유니클로 블라우스', 'WOMENS002', 9, 59000.00, 35000.00, 220, 30, '기본 블라우스', 4),
('해리포터 전집', 'BOOK001', 10, 120000.00, 80000.00, 100, 15, '베스트셀러 소설', 5),
('클린 코드', 'BOOK002', 11, 35000.00, 25000.00, 80, 10, '프로그래밍 필독서', 5),
('모던 소파', 'FURN001', 13, 850000.00, 600000.00, 25, 5, '3인용 패브릭 소파', 6),
('원목 식탁', 'FURN002', 13, 680000.00, 450000.00, 30, 8, '4인용 원목 식탁', 6),
('킹사이즈 침대', 'FURN003', 12, 1200000.00, 800000.00, 15, 3, '킹사이즈 침대프레임', 7),
('러닝머신', 'SPORT001', 5, 1500000.00, 1000000.00, 20, 5, '가정용 러닝머신', 8),
('덤벨 세트', 'SPORT002', 5, 280000.00, 180000.00, 50, 10, '조절식 덤벨 세트', 8);

-- ===============================================
-- 6. 주문 데이터 입력 (Orders)
-- ===============================================
PRINT '🛒 주문 데이터 입력 중...';

INSERT INTO orders (order_number, customer_id, order_date, total_amount, tax_amount, status, payment_method, shipping_address, created_by) VALUES
('ORD-2024-001', 1, DATEADD(day, -30, GETDATE()), 2400000.00, 240000.00, 'COMPLETED', '신용카드', '서울시 강남구 테헤란로 123', 4),
('ORD-2024-002', 2, DATEADD(day, -25, GETDATE()), 1800000.00, 180000.00, 'COMPLETED', '계좌이체', '서울시 서초구 서초대로 456', 4),
('ORD-2024-003', 3, DATEADD(day, -20, GETDATE()), 275000.00, 27500.00, 'SHIPPED', '신용카드', '부산시 해운대구 해운대로 789', 12),
('ORD-2024-004', 4, DATEADD(day, -15, GETDATE()), 1530000.00, 153000.00, 'COMPLETED', '계좌이체', '경기도 성남시 분당구 판교로 101', 4),
('ORD-2024-005', 5, DATEADD(day, -12, GETDATE()), 148000.00, 14800.00, 'PROCESSING', '신용카드', '대구시 수성구 동대구로 202', 12),
('ORD-2024-006', 6, DATEADD(day, -10, GETDATE()), 850000.00, 85000.00, 'COMPLETED', '계좌이체', '부산시 금정구 부산대학로 303', 4),
('ORD-2024-007', 7, DATEADD(day, -8, GETDATE()), 1620000.00, 162000.00, 'SHIPPED', '신용카드', '광주시 서구 상무대로 404', 12),
('ORD-2024-008', 8, DATEADD(day, -5, GETDATE()), 715000.00, 71500.00, 'PROCESSING', '계좌이체', '대전시 유성구 대학로 505', 4),
('ORD-2024-009', 9, DATEADD(day, -3, GETDATE()), 1780000.00, 178000.00, 'PENDING', '신용카드', '인천시 남동구 인천대로 606', 12),
('ORD-2024-010', 10, DATEADD(day, -1, GETDATE()), 3485000.00, 348500.00, 'CONFIRMED', '계좌이체', '서울시 마포구 월드컵로 707', 4);

-- ===============================================
-- 7. 주문 상세 데이터 입력 (Order_Items)
-- ===============================================
PRINT '📋 주문 상세 데이터 입력 중...';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_percent) VALUES
-- ORD-2024-001 (2개 상품)
(1, 1, 2, 1200000.00, 0.00),   -- 갤럭시 S24 Ultra x2
-- ORD-2024-002 (1개 상품)
(2, 3, 1, 3200000.00, 43.75),  -- 맥북 프로 (할인 적용)
-- ORD-2024-003 (3개 상품)
(3, 5, 1, 180000.00, 0.00),    -- 나이키 에어맥스
(3, 6, 1, 95000.00, 0.00),     -- 아디다스 후디
-- ORD-2024-004 (2개 상품)
(4, 2, 1, 1350000.00, 0.00),   -- 아이폰 15 Pro
(4, 5, 1, 180000.00, 0.00),    -- 나이키 에어맥스
-- ORD-2024-005 (2개 상품)
(5, 7, 1, 89000.00, 0.00),     -- 자라 원피스
(5, 8, 1, 59000.00, 0.00),     -- 유니클로 블라우스
-- ORD-2024-006 (1개 상품)
(6, 11, 1, 850000.00, 0.00),   -- 모던 소파
-- ORD-2024-007 (2개 상품)
(7, 13, 1, 1200000.00, 0.00),  -- 킹사이즈 침대
(7, 9, 2, 120000.00, 50.00),   -- 해리포터 전집 x2 (50% 할인)
(7, 14, 1, 1500000.00, 80.00), -- 러닝머신 (80% 할인)
-- ORD-2024-008 (3개 상품)
(8, 10, 1, 35000.00, 0.00),    -- 클린 코드
(8, 12, 1, 680000.00, 0.00),   -- 원목 식탁
-- ORD-2024-009 (2개 상품)
(9, 4, 1, 1800000.00, 1.11),   -- 델 XPS 13 (약간 할인)
-- ORD-2024-010 (3개 상품)
(10, 2, 2, 1350000.00, 0.00),  -- 아이폰 15 Pro x2
(10, 15, 1, 280000.00, 0.00),  -- 덤벨 세트
(10, 11, 1, 850000.00, 5.88);  -- 모던 소파 (약간 할인)

-- ===============================================
-- 8. 활동 로그 데이터 입력 (Activity_Logs)
-- ===============================================
PRINT '📊 활동 로그 데이터 입력 중...';

INSERT INTO activity_logs (user_id, action, table_name, record_id, ip_address, user_agent) VALUES
(1, '로그인', 'users', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(4, '주문 생성', 'orders', 1, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(1, '상품 등록', 'products', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(4, '주문 승인', 'orders', 1, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(2, '재고 업데이트', 'products', 1, '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
(12, '주문 생성', 'orders', 3, '192.168.1.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)'),
(7, '고객 정보 수정', 'customers', 1, '192.168.1.104', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(4, '주문 배송 처리', 'orders', 3, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(1, '사용자 승인', 'users', 5, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
(12, '비밀번호 변경', 'users', 12, '192.168.1.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)');

-- 외래키 제약조건 다시 활성화
EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";

-- ===============================================
-- 데이터 입력 완료 및 통계
-- ===============================================

DECLARE @userCount INT, @deptCount INT, @categoryCount INT, @productCount INT, @customerCount INT, @orderCount INT, @orderItemCount INT, @logCount INT;

SELECT @userCount = COUNT(*) FROM users;
SELECT @deptCount = COUNT(*) FROM departments;
SELECT @categoryCount = COUNT(*) FROM categories;
SELECT @productCount = COUNT(*) FROM products;
SELECT @customerCount = COUNT(*) FROM customers;
SELECT @orderCount = COUNT(*) FROM orders;
SELECT @orderItemCount = COUNT(*) FROM order_items;
SELECT @logCount = COUNT(*) FROM activity_logs;

PRINT '';
PRINT '✅ 테스트용 샘플 데이터 입력 완료!';
PRINT '================================================';
PRINT '📊 입력된 데이터 통계:';
PRINT '   👥 사용자: ' + CAST(@userCount AS NVARCHAR(10)) + '명';
PRINT '   🏢 부서: ' + CAST(@deptCount AS NVARCHAR(10)) + '개';
PRINT '   📂 카테고리: ' + CAST(@categoryCount AS NVARCHAR(10)) + '개';
PRINT '   📦 상품: ' + CAST(@productCount AS NVARCHAR(10)) + '개';
PRINT '   🏪 고객: ' + CAST(@customerCount AS NVARCHAR(10)) + '개';
PRINT '   🛒 주문: ' + CAST(@orderCount AS NVARCHAR(10)) + '건';
PRINT '   📋 주문상세: ' + CAST(@orderItemCount AS NVARCHAR(10)) + '건';
PRINT '   📊 활동로그: ' + CAST(@logCount AS NVARCHAR(10)) + '건';
PRINT '================================================';
PRINT '🎯 이제 SQL2DB 마이그레이션 도구를 테스트할 수 있습니다!';
PRINT '   - 다양한 데이터 타입과 관계가 설정됨';
PRINT '   - 외래키 제약조건이 활성화됨';
PRINT '   - 테스트 시나리오에 적합한 실제적인 데이터'; 