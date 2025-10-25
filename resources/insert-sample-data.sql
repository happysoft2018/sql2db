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

INSERT INTO users (user_id, username, email, first_name, last_name, status, department_id, company_code, last_login_date, salary, birth_date) VALUES
(1, 'john.doe', 'john.doe@company.com', '존', '도', 'ACTIVE', 1, 'COMPANY01', DATEADD(day, -1, GETDATE()), 75000.00, '1985-03-15'),
(2, 'jane.smith', 'jane.smith@company.com', '제인', '스미스', 'ACTIVE', 1, 'COMPANY01', DATEADD(day, -2, GETDATE()), 82000.00, '1987-07-22'),
(3, 'mike.johnson', 'mike.johnson@company.com', '마이크', '존슨', 'ACTIVE', 2, 'COMPANY01', DATEADD(day, -3, GETDATE()), 68000.00, '1990-11-08'),
(4, 'sarah.wilson', 'sarah.wilson@company.com', '사라', '윌슨', 'ACTIVE', 3, 'COMPANY02', DATEADD(hour, -5, GETDATE()), 72000.00, '1988-05-14'),
(5, 'david.brown', 'david.brown@company.com', '데이비드', '브라운', 'PENDING', 1, 'COMPANY02', NULL, 78000.00, '1986-09-30'),
(6, 'emily.davis', 'emily.davis@company.com', '에밀리', '데이비스', 'ACTIVE', 4, 'COMPANY02', DATEADD(day, -7, GETDATE()), 65000.00, '1992-01-18'),
(7, 'robert.miller', 'robert.miller@company.com', '로버트', '밀러','ACTIVE', 5, 'COMPANY02', DATEADD(day, -17, GETDATE()), 65000.00, '1992-01-18'),
(8, 'lisa.garcia', 'lisa.garcia@company.com', '리사', '가르시아', 'ACTIVE', 6, 'COMPANY03', DATEADD(hour, -12, GETDATE()), 70000.00, '1989-08-27'),
(9, 'kevin.martinez', 'kevin.martinez@company.com', '케빈', '마르티네즈', 'APPROVED', 7, 'COMPANY03', DATEADD(day, -4, GETDATE()), 73000.00, '1991-04-12'),
(10, 'amanda.taylor', 'amanda.taylor@company.com', '아만다', '테일러', 'ACTIVE', 8, 'COMPANY01', DATEADD(day, -2, GETDATE()), 67000.00, '1990-10-03'),
(11, 'chris.anderson', 'chris.anderson@company.com', '크리스', '앤더슨', 'PENDING', 2, 'COMPANY01', NULL, 71000.00, '1987-06-19'),
(12, 'nicole.thomas', 'nicole.thomas@company.com', '니콜', '토마스', 'ACTIVE', 3, 'COMPANY02', DATEADD(day, -6, GETDATE()), 74000.00, '1988-02-28'),
(13, 'ryan.jackson', 'ryan.jackson@company.com', '라이언', '잭슨', 'ACTIVE', 1, 'COMPANY02', DATEADD(hour, -8, GETDATE()), 79000.00, '1985-11-16'),
(14, 'jennifer.white', 'jennifer.white@company.com', '제니퍼', '화이트', 'APPROVED', 4, 'COMPANY03', DATEADD(day, -3, GETDATE()), 66000.00, '1993-07-07'),
(15, 'matthew.harris', 'matthew.harris@company.com', '매튜', '해리스', 'ACTIVE', 5, 'COMPANY03', DATEADD(day, -1, GETDATE()), 81000.00, '1984-04-25');

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

INSERT INTO categories (category_id, category_name, category_code, description, sort_order) VALUES
(1, '전자제품', 'ELEC', '전자제품 전체 카테고리', 1),
(2, '의류', 'CLOTH', '의류 전체 카테고리', 2),
(3, '도서', 'BOOK', '도서 전체 카테고리', 3),
(4, '가구', 'FURN', '가구 전체 카테고리', 4),
(5, '스포츠', 'SPORT', '스포츠용품 전체 카테고리', 5);

-- 하위 카테고리 입력
INSERT INTO categories (category_id, category_name, category_code, parent_category_id, description, sort_order) VALUES
(101, '스마트폰', 'PHONE', 1, '스마트폰 및 액세서리', 11),
(102, '노트북', 'LAPTOP', 1, '노트북 및 컴퓨터', 12),
(201, '남성의류', 'MENS', 2, '남성용 의류', 21),
(202, '여성의류', 'WOMENS', 2, '여성용 의류', 22),
(301, '소설', 'NOVEL', 3, '소설 도서', 31),
(302, '전문서적', 'TECH', 3, '전문 기술 서적', 32),
(401, '침실가구', 'BEDROOM', 4, '침실용 가구', 41),
(402, '거실가구', 'LIVING', 4, '거실용 가구', 42),
(501, '축구용품', 'SOCCER_GEAR', 5, '축구용품', 51),
(502, '농구용품', 'BASKETBALL_GEAR', 5, '농구용품', 52);

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
('갤럭시 S24 Ultra', 'PHONE001', 101, 1200000.00, 800000.00, 150, 20, '최신 플래그십 스마트폰', 1),
('아이폰 15 Pro', 'PHONE002', 101, 1350000.00, 900000.00, 120, 15, '애플 최신 프로 모델', 1),
('맥북 프로 16인치', 'LAPTOP001', 102, 3200000.00, 2400000.00, 50, 10, '고성능 노트북', 2),
('델 XPS 13', 'LAPTOP002', 102, 1800000.00, 1300000.00, 80, 15, '초경량 노트북', 2),
('나이키 에어맥스', 'MENS001', 201, 180000.00, 120000.00, 200, 30, '인기 운동화', 3),
('아디다스 후디', 'MENS002', 201, 95000.00, 65000.00, 180, 25, '편안한 후드티', 3),
('자라 원피스', 'WOMENS001', 202, 89000.00, 45000.00, 150, 20, '트렌디한 원피스', 4),
('유니클로 블라우스', 'WOMENS002', 202, 59000.00, 35000.00, 220, 30, '기본 블라우스', 4),
('해리포터 전집', 'BOOK001', 301, 120000.00, 80000.00, 100, 15, '베스트셀러 소설', 5),
('클린 코드', 'BOOK002', 302, 35000.00, 25000.00, 80, 10, '프로그래밍 필독서', 5),
('모던 소파', 'FURN001', 401, 850000.00, 600000.00, 25, 5, '3인용 패브릭 소파', 6),
('원목 식탁', 'FURN002', 401, 680000.00, 450000.00, 30, 8, '4인용 원목 식탁', 6),
('킹사이즈 침대', 'FURN003', 402, 1200000.00, 800000.00, 15, 3, '킹사이즈 침대프레임', 7),
('러닝머신', 'SPORT001', 501, 1500000.00, 1000000.00, 20, 5, '가정용 러닝머신', 8),
('덤벨 세트', 'SPORT002', 501, 280000.00, 180000.00, 50, 10, '조절식 덤벨 세트', 8);

-- ===============================================
-- 6. 주문 데이터 입력 (Orders)
-- ===============================================
PRINT '🛒 주문 데이터 입력 중...';

INSERT INTO orders (order_number, customer_id, order_date, total_amount, tax_amount, status, payment_method, shipping_address, created_by) VALUES
('ORD01', 1, DATEADD(day, -30, GETDATE()), 2400000.00, 240000.00, 'COMPLETED', '신용카드', '서울시 강남구 테헤란로 123', 4),
('ORD02', 2, DATEADD(day, -25, GETDATE()), 1800000.00, 180000.00, 'COMPLETED', '계좌이체', '서울시 서초구 서초대로 456', 4),
('ORD03', 3, DATEADD(day, -20, GETDATE()), 275000.00, 27500.00, 'SHIPPED', '신용카드', '부산시 해운대구 해운대로 789', 12),
('ORD04', 4, DATEADD(day, -15, GETDATE()), 1530000.00, 153000.00, 'COMPLETED', '계좌이체', '경기도 성남시 분당구 판교로 101', 4),
('ORD05', 5, DATEADD(day, -12, GETDATE()), 148000.00, 14800.00, 'PROCESSING', '신용카드', '대구시 수성구 동대구로 202', 12),
('ORD06', 6, DATEADD(day, -10, GETDATE()), 850000.00, 85000.00, 'COMPLETED', '계좌이체', '부산시 금정구 부산대학로 303', 4),
('ORD07', 7, DATEADD(day, -8, GETDATE()), 1620000.00, 162000.00, 'SHIPPED', '신용카드', '광주시 서구 상무대로 404', 12),
('ORD08', 8, DATEADD(day, -5, GETDATE()), 715000.00, 71500.00, 'PROCESSING', '계좌이체', '대전시 유성구 대학로 505', 4),
('ORD09', 9, DATEADD(day, -3, GETDATE()), 1780000.00, 178000.00, 'PENDING', '신용카드', '인천시 남동구 인천대로 606', 12),
('ORD10', 10, DATEADD(day, -1, GETDATE()), 3485000.00, 348500.00, 'CONFIRMED', '계좌이체', '서울시 마포구 월드컵로 707', 4);

-- ===============================================
-- 7. 주문 상세 데이터 입력 (Order_Items)
-- ===============================================
PRINT '📋 주문 상세 데이터 입력 중...';

INSERT INTO order_items (order_number, product_code, quantity, unit_price, discount_percent) VALUES
-- ORD-2024-001 (2개 상품)
('ORD01', 'PHONE001', 2, 1200000.00, 0.00),   -- 갤럭시 S24 Ultra x2
-- ORD-2024-002 (1개 상품)
('ORD02', 'LAPTOP001', 1, 3200000.00, 43.75),  -- 맥북 프로 (할인 적용)
-- ORD-2024-003 (3개 상품)
('ORD03', 'MENS001', 1, 180000.00, 0.00),    -- 나이키 에어맥스
('ORD03', 'MENS002', 1, 95000.00, 0.00),     -- 아디다스 후디
-- ORD-2024-004 (2개 상품)
('ORD04', 'PHONE002', 1, 1350000.00, 0.00),   -- 아이폰 15 Pro
('ORD04', 'MENS001', 1, 180000.00, 0.00),    -- 나이키 에어맥스
-- ORD-2024-005 (2개 상품)
('ORD05', 'WOMENS001', 1, 89000.00, 0.00),     -- 자라 원피스
('ORD05', 'WOMENS002', 1, 59000.00, 0.00),     -- 유니클로 블라우스
-- ORD-2024-006 (1개 상품)
('ORD06', 'FURN001', 1, 850000.00, 0.00),   -- 모던 소파
-- ORD-2024-007 (2개 상품)
('ORD07', 'FURN003', 1, 1200000.00, 0.00),  -- 킹사이즈 침대
('ORD07', 'BOOK001', 2, 120000.00, 50.00),   -- 해리포터 전집 x2 (50% 할인)
('ORD07', 'SPORT001', 1, 1500000.00, 80.00), -- 러닝머신 (80% 할인)
-- ORD-2024-008 (3개 상품)
('ORD08', 'BOOK002', 1, 35000.00, 0.00),    -- 클린 코드
('ORD08', 'FURN002', 1, 680000.00, 0.00),   -- 원목 식탁
-- ORD-2024-009 (2개 상품)
('ORD09', 'LAPTOP002', 1, 1800000.00, 1.11),   -- 델 XPS 13 (약간 할인)
-- ORD-2024-010 (3개 상품)
('ORD10', 'PHONE002', 2, 1350000.00, 0.00),  -- 아이폰 15 Pro x2
('ORD10', 'SPORT002', 1, 280000.00, 0.00),  -- 덤벨 세트
('ORD10', 'FURN001', 1, 850000.00, 5.88);  -- 모던 소파 (약간 할인)

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

-- ===============================================
-- 9. 회사 데이터 입력 (Companies)
-- ===============================================
PRINT '🏢 회사 데이터 입력 중...';

INSERT INTO companies (company_code, company_name, address, phone, email, status) VALUES
('COMPANY01', '테크이노베이션(주)', '서울시 강남구 테헤란로 123', '02-1234-5678', 'info@techinnovation.com', 'ACTIVE'),
('COMPANY02', '글로벌솔루션', '서울시 서초구 서초대로 456', '02-2345-6789', 'contact@globalsolution.com', 'ACTIVE'),
('COMPANY03', '스마트시스템즈', '경기도 성남시 분당구 판교로 789', '031-3456-7890', 'support@smartsystems.com', 'ACTIVE'),
('COMPANY04', '디지털퓨처', '부산시 해운대구 해운대로 101', '051-4567-8901', 'hello@digitalfuture.com', 'INACTIVE'),
('COMPANY05', '넥스트웨이브', '대전시 유성구 대학로 202', '042-5678-9012', 'admin@nextwave.com', 'ACTIVE');

-- ===============================================
-- 10. 직원 데이터 입력 (Employees)
-- ===============================================
PRINT '👨‍💼 직원 데이터 입력 중...';

INSERT INTO employees (emp_name, emp_code, department_code, hire_date, salary, status, email, phone) VALUES
('김철수', 'EMP001', 'DEV', '2020-03-15', 85000.00, 'ACTIVE', 'kim.cs@company.com', '010-1111-2222'),
('이영희', 'EMP002', 'DEV', '2021-07-22', 78000.00, 'ACTIVE', 'lee.yh@company.com', '010-2222-3333'),
('박민수', 'EMP003', 'MKT', '2019-11-08', 72000.00, 'ACTIVE', 'park.ms@company.com', '010-3333-4444'),
('정수연', 'EMP004', 'SALES', '2022-05-14', 75000.00, 'ACTIVE', 'jung.sy@company.com', '010-4444-5555'),
('최동욱', 'EMP005', 'HR', '2020-09-30', 68000.00, 'ACTIVE', 'choi.dw@company.com', '010-5555-6666'),
('한지민', 'EMP006', 'FIN', '2021-01-18', 73000.00, 'ACTIVE', 'han.jm@company.com', '010-6666-7777'),
('송민호', 'EMP007', 'IT', '2019-12-05', 80000.00, 'ACTIVE', 'song.mh@company.com', '010-7777-8888'),
('윤서희', 'EMP008', 'QA', '2020-08-27', 71000.00, 'ACTIVE', 'yoon.sh@company.com', '010-8888-9999'),
('강태현', 'EMP009', 'DESIGN', '2021-04-12', 76000.00, 'ACTIVE', 'kang.th@company.com', '010-9999-0000'),
('임수빈', 'EMP010', 'DEV', '2022-10-03', 82000.00, 'ACTIVE', 'lim.sb@company.com', '010-0000-1111');

-- 직원 관리자 관계 설정
UPDATE employees SET manager_id = 1 WHERE emp_id IN (2, 10); -- 김철수가 이영희, 임수빈의 관리자
UPDATE employees SET manager_id = 3 WHERE emp_id = 9; -- 박민수가 강태현의 관리자
UPDATE employees SET manager_id = 7 WHERE emp_id = 8; -- 송민호가 윤서희의 관리자

-- ===============================================
-- 11. 상품 리뷰 데이터 입력 (Product_Reviews)
-- ===============================================
PRINT '⭐ 상품 리뷰 데이터 입력 중...';

INSERT INTO product_reviews (product_code, customer_id, rating, review_title, review_text, is_verified, helpful_count) VALUES
('PHONE001', 1, 5, '최고의 스마트폰!', '갤럭시 S24 Ultra 정말 만족합니다. 카메라 품질이 뛰어나고 배터리도 오래갑니다.', 1, 15),
('MENS001', 3, 4, '좋은 제품이에요', '성능은 훌륭하지만 가격이 조금 비싸네요. 그래도 추천합니다.', 1, 8),
('PHONE002' , 2, 5, '아이폰 최고!', '아이폰 15 Pro는 역시 아이폰이네요. 디자인과 성능 모두 만족합니다.', 1, 22),
('LAPTOP001', 4, 5, '개발자에게 최적', '맥북 프로 16인치로 개발 작업이 훨씬 편해졌습니다. 강력 추천!', 1, 35),
('LAPTOP002', 5, 4, '가성비 좋은 노트북', '델 XPS 13은 가볍고 성능도 좋습니다. 휴대성이 뛰어나요.', 1, 12),
('MENS001', 6, 5, '편안한 운동화', '나이키 에어맥스는 정말 편안합니다. 러닝할 때 발이 안 아파요.', 1, 18),
('BOOK001', 7, 5, '해리포터 팬 필수', '해리포터 전집은 몇 번을 읽어도 재미있어요. 소장가치 충분합니다.', 1, 45),
('BOOK002', 8, 5, '개발자 필독서', '클린 코드는 모든 개발자가 읽어야 할 책입니다. 정말 도움됩니다.', 1, 67),
('FURN001', 9, 4, '만족스러운 소파', '모던 소파 디자인도 좋고 앉았을 때도 편안합니다. 추천해요.', 1, 9),
('SPORT001', 10, 5, '홈트레이닝 최고', '러닝머신 구매 후 집에서 운동하기 편해졌습니다. 품질도 좋아요.', 1, 120); 

-- ===============================================
-- 12. 엔티티 관계 데이터 입력 (Entity_Relationships)
-- ===============================================
PRINT '🔗 엔티티 관계 데이터 입력 중...';

INSERT INTO entity_relationships (entity_id, related_entity_id, relation_type, entity_type, related_entity_type, description, created_by) VALUES
(1, 1, 'BELONGS_TO', 'USER', 'DEPARTMENT', '사용자-부서 소속 관계', 1),
(2, 1, 'BELONGS_TO', 'USER', 'DEPARTMENT', '사용자-부서 소속 관계', 1),
(3, 2, 'BELONGS_TO', 'USER', 'DEPARTMENT', '사용자-부서 소속 관계', 1),
(1, 6, 'PURCHASED', 'CUSTOMER', 'PRODUCT', '고객-상품 구매 관계', 4),
(2, 3, 'PURCHASED', 'CUSTOMER', 'PRODUCT', '고객-상품 구매 관계', 4),
(3, 5, 'PURCHASED', 'CUSTOMER', 'PRODUCT', '고객-상품 구매 관계', 12),
(6, 7, 'CATEGORY_RELATION', 'PRODUCT', 'CATEGORY', '상품-카테고리 관계', 1),
(7, 9, 'CATEGORY_RELATION', 'PRODUCT', 'CATEGORY', '상품-카테고리 관계', 1),
(1, 2, 'COLLEAGUE', 'USER', 'USER', '동료 관계', 1),
(4, 12, 'REPORTS_TO', 'USER', 'USER', '보고 관계', 4);

-- ===============================================
-- 13. 승인 요청 데이터 입력 (Approval_Requests)
-- ===============================================
PRINT '📋 승인 요청 데이터 입력 중...';

INSERT INTO approval_requests (request_code, approver_code, requester_code, product_code, request_type, request_amount, description, status, created_by) VALUES
('REQ001', 'EMP001', 'EMP002', 'PHONE001', 'PURCHASE', 1200000.00, '개발팀 스마트폰 구매 요청', 'APPROVED', 2),
('REQ002', 'EMP003', 'EMP004', 'LAPTOP001', 'PURCHASE', 3200000.00, '영업팀 노트북 구매 요청', 'PENDING', 4),
('REQ003', 'EMP001', 'EMP005', 'FURN001', 'PURCHASE', 850000.00, '사무용 소파 구매 요청', 'REJECTED', 5),
('REQ004', 'EMP007', 'EMP008', 'SPORT001', 'PURCHASE', 1500000.00, '헬스장 러닝머신 구매 요청', 'APPROVED', 8),
('REQ005', 'EMP003', 'EMP009', 'BOOK001', 'PURCHASE', 120000.00, '도서 구매 요청', 'PENDING', 9),
('REQ006', 'EMP001', 'EMP010', 'LAPTOP002', 'PURCHASE', 1800000.00, '개발팀 추가 노트북 구매 요청', 'APPROVED', 10);

-- ===============================================
-- 14. 감사 로그 데이터 입력 (Audit_Logs)
-- ===============================================
PRINT '🔍 감사 로그 데이터 입력 중...';

INSERT INTO audit_logs (action_type, entity_code, user_code, table_name, record_id, log_message, ip_address, user_agent, session_id) VALUES
('LOGIN', 'USER001', 'EMP001', 'users', 1, '사용자 로그인', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS001'),
('CREATE', 'ORD001', 'EMP004', 'orders', 1, '주문 생성', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS002'),
('UPDATE', 'PROD001', 'EMP001', 'products', 1, '상품 정보 수정', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS001'),
('APPROVE', 'REQ001', 'EMP001', 'approval_requests', 1, '구매 요청 승인', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS001'),
('REJECT', 'REQ003', 'EMP001', 'approval_requests', 3, '구매 요청 거부', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS001'),
('DELETE', 'CUST005', 'EMP005', 'customers', 5, '고객 정보 삭제', '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS005'),
('UPDATE', 'EMP002', 'EMP001', 'employees', 2, '직원 정보 수정', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS001'),
('CREATE', 'REV001', 'EMP003', 'product_reviews', 1, '상품 리뷰 작성', '192.168.1.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)', 'SESS003'),
('LOGIN', 'USER007', 'EMP007', 'users', 7, '사용자 로그인', '192.168.1.107', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'SESS007'),
('UPDATE', 'ORD003', 'EMP004', 'orders', 3, '주문 상태 변경', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'SESS002');

-- ===============================================
-- 15. 상태 코드 데이터 입력 (Status_Codes)
-- ===============================================
PRINT '📊 상태 코드 데이터 입력 중...';

INSERT INTO status_codes (category, status_code, status_description, sort_order) VALUES
('USER_STATUS', 'ACTIVE', '활성 사용자', 1),
('USER_STATUS', 'PENDING', '승인 대기 중', 2),
('USER_STATUS', 'APPROVED', '승인됨', 3),
('USER_STATUS', 'INACTIVE', '비활성', 4),
('USER_STATUS', 'SUSPENDED', '정지됨', 5),
('ORDER_STATUS', 'PENDING', '주문 대기', 1),
('ORDER_STATUS', 'CONFIRMED', '주문 확인', 2),
('ORDER_STATUS', 'PROCESSING', '처리 중', 3),
('ORDER_STATUS', 'SHIPPED', '배송 중', 4),
('ORDER_STATUS', 'COMPLETED', '완료', 5),
('ORDER_STATUS', 'CANCELLED', '취소됨', 6),
('PRODUCT_STATUS', 'ACTIVE', '판매 중', 1),
('PRODUCT_STATUS', 'INACTIVE', '판매 중지', 2),
('PRODUCT_STATUS', 'DISCONTINUED', '단종', 3),
('APPROVAL_STATUS', 'PENDING', '승인 대기', 1),
('APPROVAL_STATUS', 'APPROVED', '승인됨', 2),
('APPROVAL_STATUS', 'REJECTED', '거부됨', 3);

-- ===============================================
-- 16. 승인 관계 데이터 입력 (Approval_Relations)
-- ===============================================
PRINT '🔐 승인 관계 데이터 입력 중...';

INSERT INTO approval_relations (approver_id, requester_id, product_code, relation_type, hierarchy_level, created_by, effective_start_date) VALUES
(1, 2, 'PHONE001', 'PURCHASE_APPROVAL', 1, 1, '2024-01-01'),
(1, 13, 'MENS001', 'PURCHASE_APPROVAL', 1, 1, '2024-01-01'),
(3, 4, 'PHONE002', 'PURCHASE_APPROVAL', 1, 3, '2024-01-01'),
(3, 9, 'LAPTOP002', 'PURCHASE_APPROVAL', 1, 3, '2024-01-01'),
(7, 8, 'SPORT001', 'PURCHASE_APPROVAL', 1, 7, '2024-01-01'),
(1, 5, 'WOMENS001', 'PURCHASE_APPROVAL', 2, 1, '2024-01-01'),
(4, 12, 'FURN002', 'GENERAL_APPROVAL', 1, 4, '2024-01-01'),
(6, 14, 'FURN003', 'BUDGET_APPROVAL', 1, 6, '2024-01-01'),
(7, 15, 'SPORT002', 'SYSTEM_APPROVAL', 1, 7, '2024-01-01'),
(1, 10, 'LAPTOP001', 'PURCHASE_APPROVAL', 1, 1, '2024-01-01');

-- ===============================================
-- 17. 마이그레이션 로그 데이터 입력 (Migration_Log)
-- ===============================================
PRINT '📈 마이그레이션 로그 데이터 입력 중...';

INSERT INTO migration_log (migration_id, query_id, phase, operation_type, table_name, message, rows_processed, start_time, end_time, status) VALUES
('MIG001', 'migrate_users', 'PRE_PROCESS', 'DATA_MIGRATION', 'users', '사용자 테이블 이관 준비 완료', 0, DATEADD(hour, -2, GETDATE()), DATEADD(hour, -2, GETDATE()), 'COMPLETED'),
('MIG001', 'migrate_users', 'PROCESS', 'DATA_MIGRATION', 'users', '사용자 데이터 이관 중', 15, DATEADD(hour, -2, GETDATE()), DATEADD(hour, -1, GETDATE()), 'COMPLETED'),
('MIG001', 'migrate_users', 'POST_PROCESS', 'DATA_MIGRATION', 'users', '사용자 테이블 이관 완료', 15, DATEADD(hour, -1, GETDATE()), DATEADD(hour, -1, GETDATE()), 'COMPLETED'),
('MIG002', 'migrate_products', 'PRE_PROCESS', 'DATA_MIGRATION', 'products', '상품 테이블 이관 준비', 0, DATEADD(minute, -30, GETDATE()), DATEADD(minute, -30, GETDATE()), 'COMPLETED'),
('MIG002', 'migrate_products', 'PROCESS', 'DATA_MIGRATION', 'products', '상품 데이터 이관 중', 15, DATEADD(minute, -30, GETDATE()), DATEADD(minute, -15, GETDATE()), 'COMPLETED'),
('MIG003', 'migrate_orders', 'PROCESS', 'DATA_MIGRATION', 'orders', '주문 데이터 이관 중', 10, DATEADD(minute, -10, GETDATE()), NULL, 'RUNNING');

-- 외래키 제약조건 다시 활성화
EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";

-- ===============================================
-- 데이터 입력 완료 및 통계
-- ===============================================

DECLARE @userCount INT, @deptCount INT, @categoryCount INT, @productCount INT, @customerCount INT, @orderCount INT, @orderItemCount INT, @logCount INT;
DECLARE @companyCount INT, @empCount INT, @reviewCount INT, @relationCount INT, @approvalCount INT, @auditCount INT, @statusCount INT, @approvalRelationCount INT, @migrationLogCount INT;

SELECT @userCount = COUNT(*) FROM users;
SELECT @deptCount = COUNT(*) FROM departments;
SELECT @categoryCount = COUNT(*) FROM categories;
SELECT @productCount = COUNT(*) FROM products;
SELECT @customerCount = COUNT(*) FROM customers;
SELECT @orderCount = COUNT(*) FROM orders;
SELECT @orderItemCount = COUNT(*) FROM order_items;
SELECT @logCount = COUNT(*) FROM activity_logs;
SELECT @companyCount = COUNT(*) FROM companies;
SELECT @empCount = COUNT(*) FROM employees;
SELECT @reviewCount = COUNT(*) FROM product_reviews;
SELECT @relationCount = COUNT(*) FROM entity_relationships;
SELECT @approvalCount = COUNT(*) FROM approval_requests;
SELECT @auditCount = COUNT(*) FROM audit_logs;
SELECT @statusCount = COUNT(*) FROM status_codes;
SELECT @approvalRelationCount = COUNT(*) FROM approval_relations;
SELECT @migrationLogCount = COUNT(*) FROM migration_log;

PRINT '';
PRINT '✅ 테스트용 샘플 데이터 입력 완료!';
PRINT '================================================';
PRINT '📊 입력된 데이터 통계:';
PRINT '   👥 사용자: ' + CAST(@userCount AS NVARCHAR(10)) + '명';
PRINT '   🏢 부서: ' + CAST(@deptCount AS NVARCHAR(10)) + '개';
PRINT '   🏪 회사: ' + CAST(@companyCount AS NVARCHAR(10)) + '개';
PRINT '   👨‍💼 직원: ' + CAST(@empCount AS NVARCHAR(10)) + '명';
PRINT '   📂 카테고리: ' + CAST(@categoryCount AS NVARCHAR(10)) + '개';
PRINT '   📦 상품: ' + CAST(@productCount AS NVARCHAR(10)) + '개';
PRINT '   ⭐ 상품리뷰: ' + CAST(@reviewCount AS NVARCHAR(10)) + '건';
PRINT '   🏪 고객: ' + CAST(@customerCount AS NVARCHAR(10)) + '개';
PRINT '   🛒 주문: ' + CAST(@orderCount AS NVARCHAR(10)) + '건';
PRINT '   📋 주문상세: ' + CAST(@orderItemCount AS NVARCHAR(10)) + '건';
PRINT '   🔗 엔티티관계: ' + CAST(@relationCount AS NVARCHAR(10)) + '건';
PRINT '   📋 승인요청: ' + CAST(@approvalCount AS NVARCHAR(10)) + '건';
PRINT '   🔐 승인관계: ' + CAST(@approvalRelationCount AS NVARCHAR(10)) + '건';
PRINT '   📊 활동로그: ' + CAST(@logCount AS NVARCHAR(10)) + '건';
PRINT '   🔍 감사로그: ' + CAST(@auditCount AS NVARCHAR(10)) + '건';
PRINT '   📊 상태코드: ' + CAST(@statusCount AS NVARCHAR(10)) + '건';
PRINT '   📈 마이그레이션로그: ' + CAST(@migrationLogCount AS NVARCHAR(10)) + '건';
PRINT '================================================';
PRINT '🎯 이제 SQL2DB 마이그레이션 도구를 테스트할 수 있습니다!';
PRINT '   - 17개 테이블에 풍부한 테스트 데이터 구성';
PRINT '   - 다양한 데이터 타입과 복잡한 관계 설정';
PRINT '   - 외래키 제약조건이 활성화됨';
PRINT '   - 실제 마이그레이션 시나리오에 적합한 데이터';
PRINT '   - 동적 변수, IN절, JOIN 등 모든 기능 테스트 가능'; 