# MSSQL 데이터 이관 도구

원격 MSSQL 소스 데이터베이스의 데이터를 다른 원격 MSSQL 데이터베이스로 이관하는 Node.js 기반 도구입니다.

## 주요 기능

- ✅ MSSQL 간 데이터 이관
- ✅ JSON 형식의 쿼리 설정 파일 지원
- ✅ 변수 치환 기능
- ✅ 배치 처리로 대용량 데이터 지원
- ✅ 트랜잭션 지원
- ✅ 상세한 로깅
- ✅ 명령줄 인터페이스 (CLI)
- ✅ 연결 테스트 및 설정 검증
- 🆕 **SELECT * 자동 컬럼 감지**
- 🆕 **외부 SQL 파일 지원**
- 🆕 **향상된 삭제 조건 관리 (deleteWhere)**

## 설치 및 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`queries/env.example` 파일을 참고하여 `.env` 파일을 생성하고 데이터베이스 연결 정보를 설정하세요.

```bash
# .env 파일 생성
cp queries/env.example .env
```

`.env` 파일 예시:
```env
# 소스 데이터베이스
SOURCE_DB_SERVER=source-server.com
SOURCE_DB_PORT=1433
SOURCE_DB_DATABASE=source_db
SOURCE_DB_USER=source_user
SOURCE_DB_PASSWORD=source_password

# 대상 데이터베이스
TARGET_DB_SERVER=target-server.com
TARGET_DB_PORT=1433
TARGET_DB_DATABASE=target_db
TARGET_DB_USER=target_user
TARGET_DB_PASSWORD=target_password

# 이관 설정
BATCH_SIZE=1000
ENABLE_TRANSACTION=true

# 로깅 설정
LOG_LEVEL=INFO
ENABLE_FILE_LOGGING=true
```

### 3. 쿼리 설정 파일 구성
설정 파일을 생성하여 이관할 쿼리를 정의하세요. `--config` 옵션으로 파일 경로를 지정하세요.

#### 지원 형식
- **JSON 형식**: `.json` 확장자 (기존 방식)
- **XML 형식**: `.xml` 확장자 (🆕 새로 추가됨)

둘 다 동일한 기능을 제공하며, 선호하는 형식을 선택하여 사용할 수 있습니다.

## 사용법

### Windows 배치 파일 (권장)

Windows 사용자는 간편한 배치 파일을 사용할 수 있습니다:

#### 1. 메인 프로그램 (메뉴 방식)
```bash
migrate.bat
```
- 대화형 메뉴 인터페이스
- 설정 검증, 연결 테스트, 데이터 이관 등 모든 기능 제공
- 로그 파일 보기 및 설정 파일 편집 기능

#### 2. 빠른 실행
```bash
quick-migrate.bat
```
- 검증 → 연결 테스트 → 데이터 이관을 한 번에 실행
- 빠른 이관 작업에 적합

#### 3. 개별 기능 실행
```bash
validate-config.bat     # 설정 파일 검증만
test-connection.bat     # 데이터베이스 연결 테스트만
```

#### 4. XML 설정 파일 테스트 (🆕 신규)
```bash
test-xml-migration.bat
```
- XML 형식의 설정 파일을 사용한 완전한 테스트
- 검증 → 연결 테스트 → 이관 실행의 전체 플로우 제공

#### 5. 설정 파일 DB 연결 테스트 (🆕 신규)
```bash
test-config-db-migration.bat
```
- 설정 파일에 포함된 DB 연결 정보를 사용한 테스트
- .env 파일 설정을 무시하고 설정 파일 내부의 DB 정보 우선 사용
- JSON/XML 형식 선택 가능

#### 6. DB ID 참조 방식 테스트 (🆕 신규)
```bash
test-dbid-migration.bat
```
- config/dbinfo.json에 정의된 DB ID를 참조하는 방식 테스트
- 중앙 집중식 DB 연결 정보 관리
- 개발/운영 환경별 설정 파일 선택 가능

#### 7. DRY RUN 모드 테스트 (🆕 신규)
```bash
test-dry-run.bat
```
- 실제 데이터 변경 없이 마이그레이션 시뮬레이션 실행
- 소스 DB에서만 데이터를 읽어 이관 계획 검증
- 다양한 설정 파일 형식 지원 (JSON/XML/작업별)
- 상세한 시뮬레이션 결과 리포트 제공

#### 8. isWritable 속성 테스트 (🆕 신규)
```bash
test-iswritable.bat
```
- DB 읽기/쓰기 권한 관리 기능 테스트
- 읽기 전용 DB를 타겟으로 사용 시 오류 발생 확인
- 쓰기 가능 DB를 타겟으로 사용 시 정상 처리 확인
- 데이터베이스 목록 및 권한 정보 표시

#### 9. 로그 레벨 테스트 (🆕 신규)
```bash
test-log-levels.bat
```
- 5단계 로그 레벨 시스템 테스트
- ERROR, WARN, INFO, DEBUG, TRACE 레벨별 출력 확인
- 로그 파일 생성 및 확인 기능
- 환경별 로그 레벨 설정 가이드 제공

### 명령줄 인터페이스

#### 1. 도움말 보기
```bash
npm run help
# 또는
node src/migrate-cli.js help
```

#### 2. 설정 검증
```bash
npm run validate
# 또는
node src/migrate-cli.js validate
```

#### 3. 연결 테스트
```bash
npm run test-connections
# 또는
node src/migrate-cli.js test
```

#### 4. 데이터 이관 실행
```bash
npm run migrate
# 또는
node src/migrate-cli.js migrate
```

#### 5. DRY RUN 모드 (🆕 신규)
```bash
# npm 스크립트 사용
npm run dry-run

# 직접 실행
node src/migrate-cli.js migrate --dry-run

# 사용자 정의 설정 파일로 DRY RUN
node src/migrate-cli.js migrate --config ./custom-config.json --dry-run
```

**DRY RUN 모드 특징:**
- 🔍 실제 데이터 변경 없이 마이그레이션 시뮬레이션 실행
- 📊 이관 예정 데이터 건수 및 쿼리 검증
- 🛡️ 소스 DB에서만 데이터를 읽고 타겟 DB는 연결하지 않음
- ⚡ 빠른 검증을 통한 사전 오류 발견
- 📋 상세한 시뮬레이션 결과 리포트 제공

#### 6. 데이터베이스 목록 조회 (🆕 신규)
```bash
# npm 스크립트 사용
npm run list-dbs

# 직접 실행
node src/migrate-cli.js list-dbs
```

**DB 목록 조회 기능:**
- 📊 config/dbinfo.json에 정의된 모든 DB 정보 표시
- 🟢 타겟 DB로 사용 가능한 DB (isWritable: true) 구분 표시
- 🔶 읽기 전용 DB (isWritable: false) 구분 표시
- 💡 각 DB의 서버, 포트, 데이터베이스명, 설명 정보 제공
- ⚡ 타겟 DB 선택 시 사전 권한 확인 가능

#### 7. 사용자 정의 설정 파일 사용
```bash
# JSON 형식 사용
node src/migrate-cli.js migrate --config ./custom-config.json

# XML 형식 사용 (🆕 신규)
node src/migrate-cli.js migrate --config ./custom-config.xml
```

## 설정 파일 구조

### 설정 파일 형식 (JSON)

```json
{
  "variables": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "batchSize": 1000,
    "companyCode": "COMPANY01"
  },
  "queries": [
    {
      "id": "migrate_users",
      "description": "사용자 테이블 데이터 이관",
      "sourceQuery": "SELECT user_id, username, email FROM users WHERE created_date >= '${startDate}'",
      "deleteWhere": "WHERE created_date >= '${startDate}' AND created_date <= '${endDate}'",
      "targetTable": "users",
      "targetColumns": ["user_id", "username", "email"],
      "batchSize": "${batchSize}",
      "primaryKey": "user_id",
      "deleteBeforeInsert": false,
      "enabled": true
    }
  ]
}
```

#### 설정 옵션 설명

- **variables**: 쿼리에서 사용할 변수들을 정의
- **queries**: 이관할 쿼리 목록
  - `id`: 쿼리 고유 식별자
  - `description`: 쿼리 설명
  - `sourceQuery`: 소스 DB에서 실행할 SELECT 쿼리
  - `sourceQueryFile`: 🆕 외부 SQL 파일 경로 (sourceQuery 대신 사용 가능)
  - `deleteWhere`: 🆕 삭제 시 사용할 WHERE 조건 (기존 whereClause 대체)
  - `targetTable`: 대상 DB의 테이블명
  - `targetColumns`: 삽입할 컬럼 목록 (SELECT * 사용 시 자동 설정)
  - `batchSize`: 배치 크기 (선택사항)
  - `primaryKey`: 기본키 컬럼명
  - `deleteBeforeInsert`: 이관 전 대상 테이블 데이터 삭제 여부
  - `enabled`: 쿼리 활성화 여부

## 🆕 새로운 기능

### 1. 5단계 로그 레벨 시스템 (🆕 신규)

환경과 목적에 따라 로그 출력 레벨을 조정할 수 있습니다.

#### 로그 레벨 설정
`.env` 파일에서 `LOG_LEVEL` 환경 변수로 설정:

```env
# 로그 레벨 설정 (ERROR, WARN, INFO, DEBUG, TRACE)
LOG_LEVEL=INFO
```

#### 로그 레벨별 특징

| 레벨 | 설명 | 출력 내용 | 사용 환경 |
|------|------|-----------|-----------|
| **ERROR** | 오류만 | 오류 메시지만 출력 | 운영 환경 (최소 로그) |
| **WARN** | 경고와 오류 | 경고와 오류 메시지 | 운영 환경 |
| **INFO** | 일반 정보 | 정보, 경고, 오류 (기본값) | 일반적인 사용 |
| **DEBUG** | 디버그 정보 | 상세한 디버그 정보 포함 | 개발 환경 |
| **TRACE** | 모든 로그 | 모든 로그 출력 | 문제 해결 |

#### 로그 파일 관리
- 로그는 `logs/` 디렉토리에 날짜별로 저장
- 파일명: `migration-YYYY-MM-DD.log`
- ANSI 색상 코드는 파일에서 제거되어 저장
- 콘솔과 파일에 동시 출력

#### 로그 테스트
```bash
# 로그 레벨 테스트
test-log-levels.bat
```

#### 환경별 권장 설정
```env
# 운영 환경
LOG_LEVEL=WARN

# 개발 환경
LOG_LEVEL=INFO

# 디버깅
LOG_LEVEL=DEBUG

# 문제 해결
LOG_LEVEL=TRACE
```

### 2. SELECT * 자동 컬럼 감지

`SELECT *`를 사용하면 대상 테이블의 모든 컬럼을 자동으로 감지하여 `targetColumns`에 설정합니다.

```json
{
  "id": "migrate_products_all",
  "description": "상품 테이블 전체 데이터 이관",
  "sourceQuery": "SELECT * FROM products WHERE status = 'ACTIVE'",
  "targetTable": "products",
  "targetColumns": [],  // 자동으로 채워짐
  "enabled": true
}
```

**처리 과정:**
1. `SELECT *` 패턴 감지
2. 대상 테이블 스키마 조회
3. `targetColumns` 자동 설정
4. `sourceQuery`를 명시적 컬럼명으로 변환

### 2. 외부 SQL 파일 지원

복잡한 쿼리를 별도 SQL 파일로 관리할 수 있습니다.

```json
{
  "id": "migrate_orders_complex",
  "description": "복잡한 주문 데이터 이관",
  "sourceQueryFile": "sql/orders_migration.sql",
  "targetTable": "orders",
  "targetColumns": ["order_id", "customer_id", "order_date", "total_amount"],
  "enabled": true
}
```

**SQL 파일 예시 (`queries/sql/orders_migration.sql`):**
```sql
-- 복잡한 주문 데이터 조회
-- 변수 치환 지원: ${startDate}, ${endDate}

SELECT 
    o.order_id,
    o.customer_id,
    o.order_date,
    o.total_amount,
    o.status
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
WHERE 
    o.order_date >= '${startDate}' 
    AND o.order_date <= '${endDate}'
    AND o.status IN ('COMPLETED', 'SHIPPED')
ORDER BY o.order_date DESC
```

**장점:**
- 복잡한 쿼리의 가독성 향상
- SQL 파일 재사용 가능
- 버전 관리 용이
- 주석 자동 제거

### 3. 향상된 삭제 조건 관리

기존 `whereClause`를 `deleteWhere`로 변경하여 더 명확한 의미 전달:

```json
{
  "deleteWhere": "WHERE created_date >= '${startDate}' AND created_date <= '${endDate}'",
  "deleteBeforeInsert": true
}
```

## 설정 예시

### 기본 설정
```json
{
  "id": "basic_migration",
  "sourceQuery": "SELECT id, name, email FROM users",
  "targetTable": "users",
  "targetColumns": ["id", "name", "email"]
}
```

### SELECT * 사용
```json
{
  "id": "auto_columns",
  "sourceQuery": "SELECT * FROM products",
  "targetTable": "products",
  "targetColumns": []  // 자동 설정
}
```

### SQL 파일 + SELECT *
```json
{
  "id": "file_with_auto_columns",
  "sourceQueryFile": "sql/complex_query.sql",  // SELECT * FROM table_name
  "targetTable": "target_table",
  "targetColumns": []  // 자동 설정
}
```

### 변수 치환

쿼리에서 `${변수명}` 형식으로 변수를 사용할 수 있습니다:

- 설정 파일의 `variables` 섹션에 정의된 변수
- 환경 변수 (예: `${BATCH_SIZE}`)

#### 🆕 IN절 변수 지원

배열 형태의 변수를 IN절에서 사용할 수 있습니다:

**설정 예시:**
```json
{
  "variables": {
    "statusList": ["ACTIVE", "PENDING", "APPROVED"],
    "categoryIds": [1, 2, 3, 5, 8],
    "departmentCodes": ["IT", "HR", "SALES"],
    "startDate": "2024-01-01"
  }
}
```

**쿼리 사용 예시:**
```sql
SELECT * FROM products 
WHERE status IN (${statusList}) 
  AND category_id IN (${categoryIds})
  AND created_date >= '${startDate}'
```

**변환 결과:**
```sql
SELECT * FROM products 
WHERE status IN ('ACTIVE', 'PENDING', 'APPROVED') 
  AND category_id IN (1, 2, 3, 5, 8)
  AND created_date >= '2024-01-01'
```

**환경 변수에서 IN절 사용:**
```bash
# 환경 변수 설정 (JSON 배열 형태)
export STATUS_LIST='["ACTIVE", "PENDING"]'
export CATEGORY_IDS='[1, 2, 3]'
```

```sql
-- 쿼리에서 사용
SELECT * FROM products 
WHERE status IN (${STATUS_LIST}) 
  AND category_id IN (${CATEGORY_IDS})
```

**특징:**
- 문자열 배열: 자동으로 따옴표 추가
- 숫자 배열: 따옴표 없이 처리
- SQL 인젝션 방지: 따옴표 이스케이핑 처리
- 단일 값과 배열 값 혼용 가능

#### 🆕 동적 변수 추출

소스 DB에서 실시간으로 데이터를 추출하여 전체 작업주기에서 변수로 사용할 수 있습니다.

**설정 예시:**
```json
{
  "dynamicVariables": [
    {
      "id": "extract_active_users",
      "description": "활성 사용자 ID 목록 추출",
      "variableName": "activeUserIds",
      "query": "SELECT user_id FROM users WHERE status = 'ACTIVE' AND last_login_date >= '${startDate}'",
      "extractType": "single_column",
      "columnName": "user_id",
      "enabled": true
    },
    {
      "id": "extract_max_order_id",
      "description": "최대 주문 ID 추출",
      "variableName": "maxOrderId",
      "query": "SELECT MAX(order_id) as max_id FROM orders",
      "extractType": "single_value",
      "enabled": true
    }
  ]
}
```

**추출 타입:**
- `single_value`: 첫 번째 행의 첫 번째 컬럼 값
- `single_column`: 지정된 컬럼의 모든 값을 배열로
- `multiple_columns`: 지정된 여러 컬럼의 값들을 배열로
- `key_value_pairs`: 키-값 쌍 객체로 (첫 번째 컬럼=키, 두 번째 컬럼=값)

**사용 예시:**
```sql
-- 동적 변수를 사용한 쿼리
SELECT * FROM orders 
WHERE user_id IN (${activeUserIds}) 
  AND order_id > ${maxOrderId}
```

**실행 순서:**
1. 동적 변수 추출 (소스 DB에서 데이터 조회)
2. 변수 치환 (동적 변수 > 설정 변수 > 환경 변수 순)
3. 데이터 이관 쿼리 실행

**장점:**
- 실시간 데이터 기반 조건 설정
- 다른 테이블의 데이터를 조건으로 활용
- 복잡한 비즈니스 로직 구현 가능

## 🆕 작업별 설정 파일 관리

각 작업 유형별로 별도의 설정 파일을 관리하여 체계적인 데이터 이관이 가능합니다.

### 디렉토리 구조
```
queries/
├── configs/
│   ├── user-migration.json      # 사용자 데이터 이관
│   ├── order-migration.json     # 주문 데이터 이관
│   ├── product-migration.json   # 상품 데이터 이관
│   └── custom-migration.json    # 사용자 정의 작업
└── sql/
    ├── order_items_migration.sql
    └── ...
```

### CLI 사용법

**작업 목록 확인:**
```bash
node src/migrate-cli.js list
```



## 🆕 XML vs JSON 설정 형식 비교

프로젝트에서는 JSON과 XML 두 가지 형식의 설정 파일을 모두 지원합니다.

### 형식별 특징

| 특징 | JSON | XML |
|------|------|-----|
| **가독성** | 간결하고 직관적 | 구조적이고 명시적 |
| **중첩 구조** | 자연스러운 중첩 | 태그 기반 명확한 구조 |
| **주석 지원** | ❌ 없음 | ✅ `<!-- -->` 주석 가능 |
| **CDATA 지원** | ❌ 없음 | ✅ `<![CDATA[]]>` 지원 |
| **스키마 검증** | JSON Schema | XSD Schema |
| **편집 도구** | 대부분 IDE 지원 | 전용 XML 에디터 |

### JSON 형식 예시
```json
{
  "variables": {
    "startDate": "2024-01-01",
    "statusList": ["ACTIVE", "PENDING"]
  },
  "queries": [
    {
      "id": "migrate_users",
      "sourceQuery": "SELECT * FROM users WHERE status IN (${statusList})",
      "targetTable": "users",
      "enabled": true
    }
  ]
}
```

### XML 형식 예시
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <variables>
    <var name="startDate">2024-01-01</var>
    <var name="statusList">["ACTIVE", "PENDING"]</var>
  </variables>
  <queries>
    <!-- 사용자 데이터 이관 쿼리 -->
    <query id="migrate_users" targetTable="users" enabled="true">
      <sourceQuery>
        <![CDATA[
          SELECT * FROM users 
          WHERE status IN (${statusList})
          ORDER BY user_id
        ]]>
      </sourceQuery>
    </query>
  </queries>
</migration>
```

### 선택 가이드

**JSON을 선택하는 경우:**
- 간결하고 빠른 설정이 필요할 때
- JavaScript/Node.js 환경에 익숙한 경우
- 설정 파일이 자주 변경되는 경우

**XML을 선택하는 경우:**
- 복잡한 SQL 쿼리가 많이 포함된 경우
- 주석으로 상세한 설명이 필요한 경우
- 엄격한 스키마 검증이 필요한 경우
- CDATA 섹션으로 SQL을 깔끔하게 관리하고 싶은 경우

## 🆕 설정 파일 내 DB 연결 정보 관리

설정 파일에서 DB 연결 정보를 관리하는 두 가지 방식을 지원합니다:
1. **직접 설정 방식**: 설정 파일에 연결 정보 직접 포함
2. **DB ID 참조 방식**: config/dbinfo.json에 정의된 DB ID 참조 (🆕 권장)

### 기능 개요

- **우선순위**: 설정 파일 > .env 파일 > 환경 변수
- **프로젝트별 설정**: 각 마이그레이션 작업별로 다른 DB 사용 가능
- **팀 협업 지원**: 일관된 DB 설정을 프로젝트와 함께 공유
- **보안 고려**: 민감한 정보는 여전히 환경 변수 사용 권장
- **중앙 집중 관리**: config/dbinfo.json에서 모든 DB 연결 정보 관리 (🆕)

### 🆕 DB ID 참조 방식 (권장)

#### config/dbinfo.json 설정
```json
{
  "dbs": {
    "devSourceDB": {
      "user": "dev_user",
      "password": "dev_pass123!",
      "server": "dev-source-server.company.com",
      "database": "DevSourceDB",
      "port": 1433,
      "isWritable": false,
      "description": "개발 환경 소스 데이터베이스 (읽기 전용)",
      "options": {
        "encrypt": true,
        "trustServerCertificate": true,
        "enableArithAbort": true,
        "requestTimeout": 300000,
        "connectionTimeout": 30000
      }
    },
    "devTargetDB": {
      "user": "dev_user",
      "password": "dev_pass123!",
      "server": "dev-target-server.company.com",
      "database": "DevTargetDB",
      "port": 1433,
      "isWritable": true,
      "description": "개발 환경 타겟 데이터베이스 (읽기/쓰기)",
      "options": {
        "encrypt": true,
        "trustServerCertificate": true
      }
    },
    "prodSourceDB": {
      "isWritable": false,
      "description": "운영 환경 소스 데이터베이스 (읽기 전용)"
      /* 기타 연결 설정 */
    },
    "prodTargetDB": {
      "isWritable": true,
      "description": "운영 환경 타겟 데이터베이스 (읽기/쓰기)"
      /* 기타 연결 설정 */
    }
  }
}
```

#### 🛡️ isWritable 속성 (🆕 신규)

**속성 설명:**
- `isWritable`: 데이터베이스 쓰기 권한 설정 (boolean)
  - `true`: 읽기/쓰기 가능 (타겟 DB로 사용 가능)
  - `false`: 읽기 전용 (소스 DB로만 사용 가능)
  - 기본값: `false` (안전성을 위해 읽기 전용)

- `description`: 데이터베이스 설명 (string, 선택사항)
  - DB 목록 조회 시 표시되는 설명
  - 용도나 환경 정보 명시 권장

**보안 특징:**
- 🛡️ **실수 방지**: 읽기 전용 DB를 타겟으로 사용하려 할 때 오류 발생
- 🔒 **권한 제어**: 운영 DB 보호를 위한 명시적 권한 설정
- 📊 **가시성**: `npm run list-dbs`로 모든 DB의 권한 상태 확인 가능

#### JSON 형식 마이그레이션 설정 (DB ID 참조)
```json
{
  "databases": {
    "source": "devSourceDB",
    "target": "devTargetDB"
  },
  "variables": { /* 변수들 */ },
  "queries": [ /* 쿼리들 */ ]
}
```

#### XML 형식 마이그레이션 설정 (DB ID 참조)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <databases>
    <source>devSourceDB</source>
    <target>devTargetDB</target>
  </databases>
  <variables>...</variables>
  <queries>...</queries>
</migration>
```

### 직접 설정 방식 (기존 방식)

#### JSON 형식 DB 설정
```json
{
  "databases": {
    "source": {
      "id": "sourceDB",
      "server": "source-server.company.com",
      "port": 1433,
      "database": "SourceDB",
      "user": "source_user",
      "password": "source_pass123!",
      "options": {
        "encrypt": true,
        "trustServerCertificate": true,
        "enableArithAbort": true,
        "requestTimeout": 300000,
        "connectionTimeout": 30000
      }
    },
    "target": {
      "id": "targetDB",
      "server": "target-server.company.com", 
      "port": 1433,
      "database": "TargetDB",
      "user": "target_user",
      "password": "target_pass123!",
      "options": {
        "encrypt": true,
        "trustServerCertificate": true,
        "enableArithAbort": true,
        "requestTimeout": 300000,
        "connectionTimeout": 30000
      }
    }
  },
  "variables": { ... },
  "queries": [ ... ]
}
```

### XML 형식 DB 설정

```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <databases>
    <source id="sourceDB">
      <server>source-server.company.com</server>
      <port>1433</port>
      <database>SourceDB</database>
      <user>source_user</user>
      <password>source_pass123!</password>
      <options>
        <encrypt>true</encrypt>
        <trustServerCertificate>true</trustServerCertificate>
        <enableArithAbort>true</enableArithAbort>
        <requestTimeout>300000</requestTimeout>
        <connectionTimeout>30000</connectionTimeout>
      </options>
    </source>
    <target id="targetDB">
      <server>target-server.company.com</server>
      <port>1433</port>
      <database>TargetDB</database>
      <user>target_user</user>
      <password>target_pass123!</password>
      <options>
        <encrypt>true</encrypt>
        <trustServerCertificate>true</trustServerCertificate>
        <enableArithAbort>true</enableArithAbort>
        <requestTimeout>300000</requestTimeout>
        <connectionTimeout>30000</connectionTimeout>
      </options>
    </target>
  </databases>
  
  <variables>...</variables>
  <queries>...</queries>
</migration>
```

### 설정 속성 설명

| 속성명 | 필수 | 설명 | 기본값 |
|--------|------|------|--------|
| `server` | ✅ | 데이터베이스 서버 주소 | - |
| `port` | ❌ | 포트 번호 | 1433 |
| `database` | ✅ | 데이터베이스 이름 | - |
| `user` | ✅ | 사용자 계정 | - |
| `password` | ✅ | 비밀번호 | - |
| `options.encrypt` | ❌ | 암호화 연결 사용 | true |
| `options.trustServerCertificate` | ❌ | 서버 인증서 신뢰 | true |
| `options.enableArithAbort` | ❌ | 산술 오류 시 중단 | true |
| `options.requestTimeout` | ❌ | 요청 타임아웃 (ms) | 300000 |
| `options.connectionTimeout` | ❌ | 연결 타임아웃 (ms) | 30000 |

### 방식별 장단점 비교

| 기능 | DB ID 참조 방식 | 직접 설정 방식 |
|------|-----------------|----------------|
| **설정 파일 크기** | ✅ 간결함 | ❌ 상세함 |
| **중앙 집중 관리** | ✅ config/dbinfo.json | ❌ 분산 관리 |
| **재사용성** | ✅ 높음 | ❌ 낮음 |
| **보안** | ✅ 분리된 관리 | ⚠️ 설정 파일에 노출 |
| **환경별 분리** | ✅ DB ID로 구분 | ⚠️ 파일별 관리 |
| **설정 복잡도** | ✅ 단순 | ❌ 복잡 |
| **즉시 사용** | ⚠️ dbinfo.json 필요 | ✅ 독립적 |

### 사용법

```bash
# DB ID 참조 방식 (권장)
node src/migrate-cli.js migrate --config dev-migration.json
node src/migrate-cli.js migrate --config prod-migration.xml

# 직접 설정 방식 (기존)
node src/migrate-cli.js migrate --config custom-db-config.json

# 테스트 배치 파일 사용
test-dbid-migration.bat          # DB ID 참조 방식 테스트
test-config-db-migration.bat     # 직접 설정 방식 테스트
```

### 장점

- **환경별 분리**: 개발/스테이징/운영 환경별로 다른 설정 파일 사용
- **버전 관리**: 설정 파일을 Git으로 관리하여 DB 설정 이력 추적
- **팀 협업**: 팀원 간 동일한 DB 설정 공유
- **설정 통합**: 쿼리와 DB 설정을 하나의 파일에서 관리

### 보안 고려사항

⚠️ **주의**: 설정 파일에 DB 비밀번호를 포함할 때는 다음 사항을 고려하세요:

- **개발 환경**: 설정 파일에 직접 포함 가능
- **운영 환경**: 환경 변수나 별도 보안 저장소 사용 권장
- **Git 관리**: `.gitignore`에 민감한 설정 파일 추가 고려
- **권한 관리**: 설정 파일 접근 권한 적절히 제한

## 🆕 FK 참조 순서를 고려한 테이블 삭제

외래키(Foreign Key) 참조 관계를 자동으로 분석하여 올바른 순서로 테이블 데이터를 삭제합니다.

### 기능 개요

- **자동 FK 관계 분석**: 데이터베이스에서 모든 외래키 관계를 조회
- **토폴로지 정렬**: 의존성 그래프를 기반으로 안전한 삭제 순서 계산
- **순환 참조 처리**: 순환 참조 감지 시 FK 제약 조건 일시 비활성화
- **CASCADE 삭제 고려**: DELETE CASCADE 설정된 관계는 의존성에서 제외

### 설정 방법

**기본 설정 파일에서 활성화:**
```json
{
  "variables": {
    "enableForeignKeyOrder": true,
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "queries": [
    {
      "id": "migrate_orders",
      "targetTable": "orders",
      "deleteBeforeInsert": true,
      "deleteWhere": "WHERE order_date >= '${startDate}'"
    },
    {
      "id": "migrate_order_items", 
      "targetTable": "order_items",
      "deleteBeforeInsert": true,
      "deleteWhere": "WHERE order_id IN (SELECT order_id FROM orders WHERE order_date >= '${startDate}')"
    }
  ]
}
```

### 작동 원리

1. **FK 관계 분석**
   ```sql
   -- 시스템에서 자동으로 실행되는 쿼리
   SELECT fk.name, tp.name AS parent_table, tr.name AS referenced_table,
          fk.delete_referential_action_desc
   FROM sys.foreign_keys fk
   INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
   INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
   ```

2. **삭제 순서 계산**
   - 토폴로지 정렬 알고리즘 사용
   - 참조하는 테이블(child) → 참조되는 테이블(parent) 순서
   - 예: `order_items` → `orders` → `customers`

3. **안전한 삭제 실행**
   ```
   계산된 순서: order_items → orders → customers
   
   1. DELETE FROM order_items WHERE ...
   2. DELETE FROM orders WHERE ...  
   3. DELETE FROM customers WHERE ...
   ```

### 순환 참조 처리

순환 참조가 감지되면 자동으로 FK 제약 조건을 일시 비활성화합니다:

```
⚠️ 순환 참조 감지: table_a, table_b, table_c
1. FK 제약 조건 비활성화
2. 데이터 삭제 실행
3. FK 제약 조건 재활성화
```

### 사용 예시

**일반적인 전자상거래 테이블 구조:**
```
categories (기준 테이블)
    ↑
products (categories 참조)
    ↑  
order_items (products, orders 참조)
    ↑
orders (customers 참조)
    ↑
customers (기준 테이블)
```

**자동 계산된 삭제 순서:**
```
order_items → orders → products → customers → categories
```

### 비활성화 방법

FK 순서 기능을 사용하지 않으려면:

```json
{
  "variables": {
    "enableForeignKeyOrder": false
  }
}
```

또는 변수를 제거하면 기본적으로 비활성화됩니다.

### 장점

- **데이터 무결성 보장**: FK 제약 조건 위반 방지
- **자동화**: 수동으로 삭제 순서를 관리할 필요 없음
- **안전성**: 순환 참조 상황에서도 안전한 처리
- **유연성**: 필요에 따라 활성화/비활성화 가능

### 주의사항

1. **권한 필요**: 시스템 테이블 조회 권한 필요
2. **성능**: 복잡한 FK 관계에서는 분석 시간 소요
3. **CASCADE 삭제**: DELETE CASCADE가 설정된 경우 의존성에서 자동 제외
4. **순환 참조**: FK 제약 조건 비활성화 시 일시적으로 데이터 무결성 검사 중단

## 프로그래밍 방식 사용

```javascript
const MSSQLDataMigrator = require('./src/mssql-data-migrator');

async function runMigration() {
  const migrator = new MSSQLDataMigrator('./path/to/config.json');
  
  try {
    // 설정 검증
    await migrator.validateConfiguration();
    
    // 연결 테스트
    await migrator.testConnections();
    
    // 이관 실행
    const result = await migrator.executeMigration();
    
    console.log('이관 결과:', result);
  } catch (error) {
    console.error('이관 실패:', error.message);
  }
}

runMigration();
```

## 로깅

`ENABLE_LOGGING=true`로 설정하면 상세한 로그가 `logs/` 디렉토리에 저장됩니다.

로그 파일명 형식: `migration-log-YYYY-MM-DDTHH-mm-ss-sssZ.txt`

## 트랜잭션

`ENABLE_TRANSACTION=true`로 설정하면 전체 이관 과정이 하나의 트랜잭션으로 처리되며, 오류 발생 시 자동으로 롤백됩니다.

## 주의사항

1. **데이터베이스 백업**: 이관 전에 반드시 대상 데이터베이스를 백업하세요.
2. **네트워크 연결**: 안정적인 네트워크 연결이 필요합니다.
3. **권한 확인**: 소스 DB의 읽기 권한과 대상 DB의 쓰기 권한이 필요합니다.
4. **테이블 구조**: 소스와 대상 테이블의 구조가 동일해야 합니다.
5. **SQL 파일 경로**: 상대 경로는 설정 파일 기준으로 해석됩니다.

## 문제 해결

### 연결 오류
- 방화벽 설정 확인
- 데이터베이스 서버 접근 권한 확인
- 연결 정보 (서버, 포트, 사용자명, 비밀번호) 확인

### 권한 오류
- 데이터베이스 사용자의 권한 확인
- 테이블 접근 권한 확인

### SQL 파일 오류
- 파일 경로 확인 (상대/절대 경로)
- 파일 읽기 권한 확인
- SQL 문법 검증

### 성능 최적화
- `BATCH_SIZE` 값 조정
- 네트워크 대역폭 고려
- 대상 데이터베이스의 인덱스 일시 비활성화 고려

## 라이선스

MIT License