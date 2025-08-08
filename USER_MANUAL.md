# MSSQL 데이터 이관 도구 사용자 매뉴얼

## 📖 목차
- [개요](#개요)
- [설치 및 설정](#설치-및-설정)
- [기본 사용법](#기본-사용법)
- [XML 구조 설명](#xml-구조-설명)
- [고급 기능](#고급-기능)
- [예시](#예시)
- [문제 해결](#문제-해결)

## 🎯 개요

MSSQL 데이터 이관 도구는 Microsoft SQL Server 간의 데이터 이관을 효율적으로 수행하는 Node.js 기반 도구입니다.

### 주요 기능
- 🔄 **배치 단위 데이터 이관**: 대용량 데이터 처리 최적화
- 🎛️ **유연한 설정**: XML 또는 JSON 기반 설정
- 🔧 **컬럼 오버라이드**: 이관 시 특정 컬럼값 변경/추가
- ⚙️ **전처리/후처리**: 이관 전후 SQL 스크립트 실행
- 📊 **동적 변수**: 실행 시점 데이터 추출 및 활용
- 🚦 **트랜잭션 지원**: 데이터 일관성 보장
- 📋 **상세 로깅**: 이관 과정 추적 및 디버깅
- 📈 **실시간 진행 관리**: 작업 진행 상태 추적 및 모니터링
- 🔄 **중단 재시작**: 네트워크 오류 등으로 중단된 마이그레이션을 완료된 지점에서 재시작
- 🔍 **현재 시각 함수**: 다양한 형식의 타임스탬프 지원
- 🖥️ **실시간 모니터링**: 키보드 인터랙티브 모니터링 및 차트
- ⭐ **SELECT * 자동 확장**: 전/후처리 스크립트에서도 컬럼 자동 확장
- 🎨 **전/후처리 컬럼 오버라이드**: INSERT/UPDATE 문에 자동 컬럼 추가
- 📝 **고급 SQL 파싱**: 주석 처리 및 복잡한 SQL 구문 지원

## 🛠️ 설치 및 설정

### 1. 환경 요구사항
- Node.js 14.0 이상
- SQL Server 2012 이상 (소스/타겟)
- 적절한 데이터베이스 권한

### 2. 설치
```bash
npm install
```

### 3. 데이터베이스 연결 설정
`config/dbinfo.json` 파일 생성:
```json
{
  "dbs": {
    "sourceDB": {
      "server": "source-server.com",
      "port": 1433,
      "database": "source_database",
      "user": "username",
      "password": "password",
      "isWritable": false,
      "description": "소스 데이터베이스",
      "options": {
        "encrypt": true,
        "trustServerCertificate": true
      }
    },
    "targetDB": {
      "server": "target-server.com", 
      "port": 1433,
      "database": "target_database",
      "user": "username",
      "password": "password",
      "isWritable": true,
      "description": "타겟 데이터베이스"
    }
  }
}
```

## 🚀 기본 사용법

### 1. 명령어

#### 설정 검증
```bash
node src/migrate-cli.js validate --query ./queries/migration-queries.xml
```

#### 데이터베이스 목록 조회
```bash
node src/migrate-cli.js list-dbs
```

#### 데이터 이관 실행
```bash
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

#### 시뮬레이션 실행 (DRY RUN)
```bash
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run
```

#### 중단된 마이그레이션 재시작
```bash
# 재시작 정보 확인
node src/progress-cli.js resume <migration-id>

# 실제 재시작 실행
node src/migrate-cli.js resume <migration-id> --query ./queries/migration-queries.xml
```

### 2. 환경 변수 (선택사항)
```bash
# 배치 크기 (기본값: 1000)
BATCH_SIZE=2000

# 로깅 활성화
ENABLE_LOGGING=true

# 트랜잭션 활성화
ENABLE_TRANSACTION=true
```

## 📋 XML 구조 설명

### 1. 기본 구조
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <!-- 전역 기본 설정 -->
  <settings>
    <sourceDatabase>sourceDB</sourceDatabase>
    <targetDatabase>targetDB</targetDatabase>
    <batchSize>${batchSize}</batchSize>
    <deleteBeforeInsert>true</deleteBeforeInsert>
  </settings>

  <!-- 전역 변수 정의 -->
  <variables>
    <var name="startDate">2024-01-01</var>
    <var name="batchSize">1000</var>
  </variables>

  <!-- 전역 전처리/후처리 -->
  <globalProcesses>
    <preProcess description="이관 준비">
      <![CDATA[ SQL 스크립트 ]]>
    </preProcess>
    <postProcess description="이관 마무리">
      <![CDATA[ SQL 스크립트 ]]>
    </postProcess>
  </globalProcesses>

  <!-- 동적 변수 정의 -->
  <dynamicVariables>
    <dynamicVar id="extract_users" variableName="userIds" ...>
      <![CDATA[ SELECT user_id FROM users ]]>
    </dynamicVar>
  </dynamicVariables>

  <!-- 쿼리 정의 -->
  <queries>
    <query id="migrate_users" ...>
      <!-- 개별 전처리 -->
      <preProcess description="사용자 테이블 준비">
        <![CDATA[ SQL 스크립트 ]]>
      </preProcess>

      <!-- 소스 쿼리 -->
      <sourceQuery>
        <![CDATA[ SELECT * FROM users ]]>
      </sourceQuery>

      <!-- 컬럼 오버라이드 -->
      <columnOverrides>
        <override column="status">MIGRATED</override>
        <override column="updated_by">${migrationUser}</override>
      </columnOverrides>

      <!-- deleteWhere 기능은 제거됨 - deleteBeforeInsert=true시 PK 기준으로 자동 삭제 -->

      <!-- 개별 후처리 -->
      <postProcess description="사용자 테이블 완료">
        <![CDATA[ SQL 스크립트 ]]>
      </postProcess>
    </query>
  </queries>
</migration>
```

### 2. 설정 섹션 (settings)

#### 필수 설정
- `sourceDatabase`: 소스 DB ID (dbinfo.json 참조)
- `targetDatabase`: 타겟 DB ID (dbinfo.json 참조)

#### 선택적 설정
- `batchSize`: 배치 크기 (기본값: 1000)
- `deleteBeforeInsert`: 이관 전 삭제 여부 (기본값: true)
  - `true`: 소스 데이터의 PK 값에 해당하는 타겟 데이터를 삭제 후 이관
  - `false`: 삭제 없이 바로 이관 (UPSERT 형태)

### 3. 쿼리 속성

#### 필수 속성
- `id`: 쿼리 고유 식별자
- `description`: 쿼리 설명
- `targetTable`: 타겟 테이블명
- `primaryKey`: 기본키 컬럼명
- `enabled`: 실행 여부 (true/false)

#### 선택적 속성
- `targetColumns`: 타겟 컬럼 목록 (공백시 소스와 동일)
- `batchSize`: 개별 배치 크기 (글로벌 설정 오버라이드)
- `deleteBeforeInsert`: 개별 삭제 설정 (글로벌 설정 오버라이드)
  - `true`: 소스 데이터의 PK 값으로 타겟 데이터 삭제 후 이관
  - `false`: 삭제 없이 바로 이관

### 4. 데이터 삭제 방식

v2.0부터 `deleteWhere` 기능이 제거되고, `deleteBeforeInsert`가 `true`일 때 자동으로 Primary Key 기준으로 삭제됩니다.

#### 삭제 동작 방식
1. **FK 순서 고려 활성화된 경우** (`enableForeignKeyOrder: true`)
   - 모든 테이블을 FK 참조 순서에 따라 전체 삭제
   - 순환 참조 시 FK 제약조건을 일시 비활성화

2. **FK 순서 고려 비활성화된 경우** (`enableForeignKeyOrder: false`)
   - 각 쿼리별로 소스 데이터의 PK 값에 해당하는 타겟 데이터만 삭제
   - 더 정확하고 안전한 삭제 방식

#### 예시
```xml
<!-- 단일 PK인 경우 -->
<query primaryKey="user_id" deleteBeforeInsert="true">
  <!-- 소스에서 user_id가 1,2,3인 데이터가 조회되면 -->
  <!-- 타겟에서 user_id IN (1,2,3)인 행들을 먼저 삭제 -->
</query>

<!-- 복합 PK인 경우 -->
<query primaryKey="order_id,line_no" deleteBeforeInsert="true">
  <!-- 소스에서 (order_id=100, line_no=1), (order_id=100, line_no=2) 조회되면 -->
  <!-- 타겟에서 해당 복합키 조합의 행들을 먼저 삭제 -->
</query>
```

## 🚀 고급 기능

### 1. 컬럼 오버라이드 (columnOverrides)

특정 컬럼에 고정값 또는 동적값을 설정합니다. 전역 설정과 개별 쿼리 설정을 지원합니다.

#### 전역 컬럼 오버라이드 설정

모든 쿼리에 공통으로 적용될 컬럼 값들을 전역 레벨에서 정의할 수 있습니다.

```xml
<migration>
  <variables>
    <var name="migrationUser">SYSTEM_MIGRATOR</var>
    <var name="migrationTimestamp">2024-12-01 15:30:00</var>
  </variables>

  <!-- 전역 컬럼 오버라이드 설정 -->
  <globalColumnOverrides>
    <override column="created_by">${migrationUser}</override>
    <override column="updated_by">${migrationUser}</override>
    <override column="migration_date">${migrationTimestamp}</override>
    <override column="processed_at">GETDATE()</override>
    <override column="data_version">2.1</override>
  </globalColumnOverrides>

  <queries>
    <!-- 모든 쿼리에 위의 전역 설정이 자동으로 적용됨 -->
  </queries>
</migration>
```

#### 개별 쿼리 컬럼 오버라이드

개별 쿼리에서도 컬럼 오버라이드를 정의할 수 있으며, 전역 설정과 병합됩니다.

```xml
<query id="migrate_users" targetTable="users">
  <sourceQuery>
    SELECT user_id, username, email FROM users WHERE status = 'ACTIVE'
  </sourceQuery>
  
  <!-- 개별 쿼리 컬럼 오버라이드 -->
  <columnOverrides>
    <!-- 고정값 설정 -->
    <override column="status">MIGRATED</override>
    <override column="environment">PROD</override>
    
    <!-- 전역 설정 덮어쓰기 -->
    <override column="migration_date">2024-12-01 20:00:00</override>
    
    <!-- SQL 함수 사용 -->
    <override column="last_updated">GETDATE()</override>
  </columnOverrides>
</query>
```

#### 병합 규칙

1. **전역 설정이 먼저 적용됨**: 모든 쿼리에 전역 `globalColumnOverrides` 설정이 기본으로 적용
2. **개별 설정이 우선됨**: 개별 쿼리의 `columnOverrides`가 같은 컬럼의 전역 설정을 덮어씀
3. **추가 설정 가능**: 개별 쿼리에서 전역에 없는 새로운 컬럼 오버라이드 추가 가능

**예시 결과:**
```
최종 적용되는 columnOverrides:
- created_by: "SYSTEM_MIGRATOR" (전역에서)
- updated_by: "SYSTEM_MIGRATOR" (전역에서) 
- migration_date: "2024-12-01 20:00:00" (개별에서 덮어씀)
- processed_at: "GETDATE()" (전역에서)
- data_version: "2.1" (전역에서)
- status: "MIGRATED" (개별에서 추가)
- environment: "PROD" (개별에서 추가)
- last_updated: "GETDATE()" (개별에서 추가)
```

#### 기본 컬럼 오버라이드 문법

```xml
<columnOverrides>
  <!-- 고정값 설정 -->
  <override column="migration_flag">1</override>
  
  <!-- 변수 사용 -->
  <override column="updated_by">${migrationUser}</override>
  
  <!-- 현재 시각 함수 사용 -->
  <override column="processed_at">${CURRENT_TIMESTAMP}</override>
  <override column="migration_date">${CURRENT_DATE}</override>
  <override column="migration_time">${CURRENT_TIME}</override>
  <override column="timestamp_unix">${UNIX_TIMESTAMP}</override>
</columnOverrides>
```

#### 활용 사례
- 마이그레이션 플래그 설정
- 환경별 값 변경 (DEV → PROD)
- 감사 정보 추가
- 상태 값 업데이트
- 현재 시각 정보 추가

#### 지원되는 현재 시각 함수
| 함수명 | 설명 | 예시 출력 |
|--------|------|-----------|
| `${CURRENT_TIMESTAMP}` | 현재 날짜와 시간 | 2024-12-01 15:30:45 |
| `${CURRENT_DATETIME}` | CURRENT_TIMESTAMP와 동일 | 2024-12-01 15:30:45 |
| `${NOW}` | 현재 날짜와 시간 | 2024-12-01 15:30:45 |
| `${CURRENT_DATE}` | 현재 날짜만 | 2024-12-01 |
| `${CURRENT_TIME}` | 현재 시간만 | 15:30:45 |
| `${UNIX_TIMESTAMP}` | Unix 타임스탬프 (초) | 1701434445 |
| `${TIMESTAMP_MS}` | 밀리초 타임스탬프 | 1701434445712 |
| `${ISO_TIMESTAMP}` | ISO 8601 형식 | 2024-12-01T15:30:45.712Z |
| `${GETDATE}` | SQL Server 형식 | 2024-12-01 15:30:45 |

### 2. 전처리/후처리 (Pre/Post Processing)

#### 전역 전처리/후처리
전체 이관 프로세스 전후에 실행됩니다.

```xml
<globalProcesses>
  <preProcess description="성능 최적화">
    <![CDATA[
      -- 인덱스 비활성화
      ALTER INDEX ALL ON users DISABLE;
      
      -- 제약조건 비활성화  
      ALTER TABLE users NOCHECK CONSTRAINT ALL;
      
      -- 통계 업데이트
      UPDATE STATISTICS users;
    ]]>
  </preProcess>
  
  <postProcess description="시스템 복구">
    <![CDATA[
      -- 인덱스 재구성
      ALTER INDEX ALL ON users REBUILD;
      
      -- 제약조건 활성화
      ALTER TABLE users CHECK CONSTRAINT ALL;
      
      -- 완료 로그 기록
      INSERT INTO migration_log VALUES ('COMPLETED', GETDATE());
    ]]>
  </postProcess>
</globalProcesses>
```

#### 개별 쿼리 전처리/후처리
특정 쿼리 실행 전후에만 실행됩니다.

```xml
<query id="migrate_users" ...>
  <preProcess description="사용자 백업">
    <![CDATA[
      -- 백업 테이블 생성
      INSERT INTO users_backup SELECT *, GETDATE() FROM users;
      
      -- 임시 테이블 생성
      CREATE TABLE #temp_users (user_id INT, status VARCHAR(50));
    ]]>
  </preProcess>
  
  <!-- 이관 로직 -->
  
  <postProcess description="검증 및 정리">
    <![CDATA[
      -- 데이터 검증
      DECLARE @count INT;
      SELECT @count = COUNT(*) FROM users WHERE migration_date = '${migrationTimestamp}';
      
      IF @count = 0
        INSERT INTO migration_errors VALUES ('migrate_users', 'No data migrated', GETDATE());
      
      -- 임시 테이블 정리
      DROP TABLE #temp_users;
    ]]>
  </postProcess>
</query>
```

### 3. 동적 변수 (Dynamic Variables)

실행 시점에 데이터베이스에서 값을 추출하여 변수로 사용합니다.

```xml
<dynamicVariables>
  <!-- 단일 컬럼 추출 -->
  <dynamicVar id="extract_active_users"
              variableName="activeUserIds" 
              extractType="single_column"
              columnName="user_id"
              enabled="true">
    <![CDATA[
      SELECT user_id FROM users WHERE status = 'ACTIVE'
    ]]>
  </dynamicVar>
  
  <!-- 키-값 쌍 추출 -->
  <dynamicVar id="extract_company_mapping"
              variableName="companyMapping"
              extractType="key_value_pairs"
              enabled="true">
    <![CDATA[
      SELECT company_code, company_name FROM companies WHERE status = 'ACTIVE'
    ]]>
  </dynamicVar>
  
  <!-- 다중 컬럼 값 추출 (multiple_columns) -->
  <dynamicVar id="extract_all_entity_ids"
              variableName="allEntityIds"
              extractType="multiple_columns"
              columns="user_id,department_id,manager_id"
              enabled="true">
    <![CDATA[
      SELECT DISTINCT
        u.user_id,
        u.department_id,
        d.manager_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.status = 'ACTIVE'
        AND u.user_id IS NOT NULL
        AND u.department_id IS NOT NULL
        AND d.manager_id IS NOT NULL
    ]]>
  </dynamicVar>
  
  <!-- 단일 값 추출 -->
  <dynamicVar id="extract_max_id"
              variableName="maxOrderId"
              extractType="single_value"
              enabled="true">
    <![CDATA[
      SELECT MAX(order_id) FROM orders
    ]]>
  </dynamicVar>
</dynamicVariables>
```

#### 동적 변수 extractType 종류

| extractType | 설명 | 결과 형태 | 사용 예시 |
|-------------|------|-----------|-----------|
| `single_column` | 지정된 단일 컬럼의 모든 값을 배열로 추출 | `[값1, 값2, 값3]` | IN절에서 사용 |
| `multiple_columns` | 지정된 여러 컬럼의 모든 값을 하나의 배열로 통합 | `[컬럼1값들..., 컬럼2값들..., 컬럼3값들...]` | 여러 테이블 ID 통합 |
| `column_identified` | 컬럼별로 식별 가능한 객체 구조로 추출 | `{컬럼1: [값들], 컬럼2: [값들]}` | **컬럼별 개별 접근** |
| `key_value_pairs` | 두 컬럼을 키-값 쌍 객체로 추출 | `{키1: 값1, 키2: 값2}` | 코드-이름 매핑 |
| `single_value` | 단일 값만 추출 (첫 번째 행의 첫 번째 컬럼) | `값` | MAX, COUNT 결과 |

#### multiple_columns 상세 설명

`extractType="multiple_columns"`는 여러 컬럼의 값들을 하나의 배열로 통합하는 기능입니다.

**동작 방식:**
```sql
-- 쿼리 결과
user_id | department_id | manager_id
--------|---------------|----------
   100  |      10       |    5
   101  |      20       |    6
   102  |      10       |    5

-- multiple_columns로 추출 시 (columns="user_id,department_id,manager_id")
결과: [100, 101, 102, 10, 20, 10, 5, 6, 5]
```

**활용 사례:**
- 여러 테이블의 관련 ID들을 하나의 IN절로 통합 검색
- 승인 관련 모든 코드들(승인자, 요청자, 제품코드)을 통합 추출
- 오류 로그의 다양한 식별자들을 통합 필터링

**실제 사용 예시:**
```xml
<!-- 1. 여러 ID를 통합 추출 -->
<dynamicVar id="extract_all_ids"
            variableName="allEntityIds"
            extractType="multiple_columns"
            columns="user_id,department_id,manager_id"
            enabled="true">
  <![CDATA[
    SELECT DISTINCT u.user_id, u.department_id, d.manager_id
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.department_id
    WHERE u.status = 'ACTIVE'
  ]]>
</dynamicVar>

<!-- 2. 통합된 ID들을 쿼리에서 사용 -->
<query id="migrate_related_data">
  <sourceQuery>
    <![CDATA[
      SELECT * FROM entity_relationships
      WHERE entity_id IN (${allEntityIds})
         OR related_entity_id IN (${allEntityIds})
    ]]>
  </sourceQuery>
</query>
```

**multiple_columns vs single_column 비교:**
```xml
<!-- single_column: 하나의 컬럼만 추출 -->
<dynamicVar extractType="single_column" columns="user_id">
  <!-- 결과: [100, 101, 102] -->
</dynamicVar>

<!-- multiple_columns: 여러 컬럼 통합 추출 -->
<dynamicVar extractType="multiple_columns" columns="user_id,department_id">
  <!-- 결과: [100, 101, 102, 10, 20, 10] -->
</dynamicVar>
```

#### column_identified 상세 설명 ⭐ NEW!

`extractType="column_identified"`는 컬럼별로 식별 가능한 객체 구조로 데이터를 추출하는 새로운 기능입니다.

**동작 방식:**
```sql
-- 쿼리 결과
approver_code | requester_code | product_code
--------------|----------------|-------------
     MGR01    |     USR01      |    PRD01
     MGR02    |     USR02      |    PRD02
     MGR01    |     USR03      |    PRD01

-- column_identified로 추출 시
결과: {
  "approver_code": ["MGR01", "MGR02"],
  "requester_code": ["USR01", "USR02", "USR03"], 
  "product_code": ["PRD01", "PRD02"]
}
```

**사용 패턴:**
```xml
<!-- 1. 컬럼별 식별 추출 정의 -->
<dynamicVar id="extract_approval_codes"
            variableName="approvalCodesById"
            extractType="column_identified"
            columns="approver_code,requester_code,product_code">
  <![CDATA[
    SELECT DISTINCT approver_code, requester_code, product_code
    FROM approval_requests
    WHERE status = 'ACTIVE'
  ]]>
</dynamicVar>

<!-- 2. 쿼리에서 컬럼별 개별 접근 -->
<sourceQuery>
  <![CDATA[
    SELECT * FROM audit_logs 
    WHERE (
      -- 승인자 코드만 사용
      user_code IN (${approvalCodesById.approver_code})
      OR 
      -- 요청자 코드만 사용
      user_code IN (${approvalCodesById.requester_code})
      OR
      -- 제품 코드만 사용
      entity_code IN (${approvalCodesById.product_code})
    )
  ]]>
</sourceQuery>

<!-- 3. 전체 값 통합 사용 -->
<sourceQuery>
  <![CDATA[
    SELECT * FROM related_data
    WHERE entity_id IN (${approvalCodesById})  -- 모든 컬럼의 모든 값
  ]]>
</sourceQuery>
```

**주요 장점:**
- ✅ **컬럼별 개별 접근**: `${변수명.컬럼명}` 패턴으로 특정 컬럼 값만 사용
- ✅ **통합 접근**: `${변수명}` 패턴으로 모든 컬럼의 모든 값 사용
- ✅ **의미있는 필터링**: 각 컬럼의 의미에 맞는 조건문 작성 가능
- ✅ **중복 제거**: 각 컬럼별로 자동 중복 제거

**활용 사례:**
- 승인 시스템에서 승인자/요청자/제품별 개별 필터링
- 권한 시스템에서 사용자/역할/리소스별 구분 접근
- 로그 분석에서 사용자/액션/엔티티별 분류

#### key_value_pairs 상세 설명 📋

`extractType="key_value_pairs"`는 두 컬럼을 키-값 쌍으로 매핑하는 기능입니다.

**동작 방식:**
```sql
-- 쿼리 결과
company_code | company_name
-------------|-------------
   COMP01    | Samsung Electronics
   COMP02    | LG Electronics  
   COMP03    | SK Hynix

-- key_value_pairs로 추출 시
결과: {
  "COMP01": "Samsung Electronics",
  "COMP02": "LG Electronics",
  "COMP03": "SK Hynix"
}
```

**사용 패턴:**
```xml
<!-- 1. 코드-이름 매핑 정의 -->
<dynamicVar id="extract_company_mapping"
            variableName="companyMapping"
            extractType="key_value_pairs"
            enabled="true">
  <![CDATA[
    SELECT company_code, company_name 
    FROM companies 
    WHERE status = 'ACTIVE'
  ]]>
</dynamicVar>

<!-- 2. 개별 키 접근 -->
<sourceQuery>
  <![CDATA[
    SELECT 
      u.user_id,
      u.username,
      u.company_code,
      -- 특정 키의 값 조회
      CASE u.company_code
        WHEN 'COMP01' THEN ${companyMapping.COMP01}
        WHEN 'COMP02' THEN ${companyMapping.COMP02}
        ELSE 'Unknown'
      END as company_name
    FROM users u
  ]]>
</sourceQuery>

<!-- 3. 전체 키들을 IN절에서 사용 -->
<sourceQuery>
  <![CDATA[
    SELECT * FROM transactions
    WHERE company_code IN (${companyMapping})  -- 모든 키 값들
  ]]>
</sourceQuery>
```

**주요 장점:**
- ✅ **코드-이름 매핑**: 코드 테이블을 동적으로 조회하여 매핑
- ✅ **개별 키 접근**: `${변수명.키}` 패턴으로 특정 값만 조회
- ✅ **IN절 필터링**: `${변수명}` 패턴으로 모든 키를 조건절에 사용
- ✅ **동적 참조**: 런타임에 매핑 테이블 값 변경 반영

**실제 활용 사례:**
- 회사/부서/카테고리 코드-이름 매핑
- 상태 코드-설명 매핑
- 사용자 역할-권한 매핑
- 지역 코드-지역명 매핑

**다른 extractType과의 비교:**
```xml
<!-- key_value_pairs: 키-값 매핑 -->
<dynamicVar extractType="key_value_pairs">
  <!-- 결과: {"COMP01": "Samsung", "COMP02": "LG"} -->
  <!-- 사용: ${mapping.COMP01} → "Samsung" -->
</dynamicVar>

<!-- single_column: 단일 컬럼 배열 -->
<dynamicVar extractType="single_column" columnName="company_code">
  <!-- 결과: ["COMP01", "COMP02"] -->
  <!-- 사용: ${codes} → "'COMP01', 'COMP02'" -->
</dynamicVar>
```

### 4. 변수 치환

설정된 변수들은 `${변수명}` 형태로 사용할 수 있습니다.

```xml
<!-- 변수 정의 -->
<variables>
  <var name="startDate">2024-01-01</var>
  <var name="companyCode">COMPANY01</var>
</variables>

<!-- 변수 사용 -->
<sourceQuery>
  <![CDATA[
    SELECT * FROM users 
    WHERE created_date >= '${startDate}' 
      AND company_code = '${companyCode}'
  ]]>
</sourceQuery>

<columnOverrides>
  <override column="migration_batch">${companyCode}_${startDate}</override>
</columnOverrides>
```

## 📝 예시

### 1. 기본 이관 예시

```xml
<query id="migrate_users"
       description="사용자 데이터 이관"
       targetTable="users"
       targetColumns="user_id,username,email,status,created_date"
       primaryKey="user_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT user_id, username, email, created_date
      FROM users 
      WHERE created_date >= '2024-01-01'
      ORDER BY user_id
    ]]>
  </sourceQuery>
  
  <columnOverrides>
    <override column="status">MIGRATED</override>
  </columnOverrides>
  
  <!-- deleteWhere 기능 제거: deleteBeforeInsert=true시 PK 기준으로 자동 삭제됨 -->
</query>
```

### 2. SELECT * 사용 예시

```xml
<query id="migrate_products"
       description="상품 전체 데이터 이관"
       targetTable="products"
       targetColumns=""
       primaryKey="product_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT * FROM products WHERE status = 'ACTIVE'
    ]]>
  </sourceQuery>
  
  <columnOverrides>
    <override column="migration_source">LEGACY_SYSTEM</override>
    <override column="status">MIGRATED</override>
    <override column="last_updated">GETDATE()</override>
    <override column="processed_at">${CURRENT_TIMESTAMP}</override>
    <override column="process_date">${CURRENT_DATE}</override>
  </columnOverrides>
</query>
```

### 3. 현재 시각 함수 활용 예시

```xml
<query id="migrate_audit_log"
       description="감사 로그 데이터 이관 (현재 시각 추가)"
       targetTable="audit_log"
       primaryKey="log_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT log_id, user_id, action, description
      FROM audit_log
      WHERE created_date >= '2024-01-01'
    ]]>
  </sourceQuery>
  
  <columnOverrides>
    <!-- 다양한 시각 형식으로 컬럼 추가 -->
    <override column="migrated_at">${CURRENT_TIMESTAMP}</override>
    <override column="migration_date">${CURRENT_DATE}</override>
    <override column="migration_time">${CURRENT_TIME}</override>
    <override column="unix_timestamp">${UNIX_TIMESTAMP}</override>
    <override column="iso_timestamp">${ISO_TIMESTAMP}</override>
    <override column="process_id">${UNIX_TIMESTAMP}_${CURRENT_DATE}</override>
  </columnOverrides>
</query>
```

## 📈 진행 상황 관리

v2.1부터 실시간 진행 상황 추적 및 모니터링 기능이 추가되었습니다.

### 1. 자동 진행 상황 추적

모든 마이그레이션은 자동으로 진행 상황이 추적되며, 다음 정보가 기록됩니다:

- **마이그레이션 기본 정보**: ID, 시작/종료 시간, 상태
- **페이즈별 진행 상황**: 연결, 전처리, 마이그레이션, 후처리 등
- **쿼리별 상세 정보**: 각 쿼리의 실행 상태 및 처리 행 수
- **배치별 진행률**: 실시간 배치 처리 상황
- **성능 메트릭**: 처리 속도, 예상 완료 시간 등
- **오류 정보**: 발생한 오류의 상세 내역

### 2. 진행 상황 파일

진행 상황은 `logs/progress-{migration-id}.json` 파일에 자동 저장됩니다:

```json
{
  "migrationId": "migration-2024-12-01-15-30-00",
  "status": "RUNNING",
  "totalQueries": 5,
  "completedQueries": 2,
  "totalRows": 10000,
  "processedRows": 4500,
  "performance": {
    "avgRowsPerSecond": 850,
    "estimatedTimeRemaining": 6.47
  }
}
```

### 3. 진행 상황 조회 명령어

#### 진행 상황 목록 조회
```bash
node src/progress-cli.js list
```

#### 특정 마이그레이션 상세 조회
```bash
node src/progress-cli.js show migration-2024-12-01-15-30-00
```

#### 실시간 모니터링
```bash
node src/progress-cli.js monitor migration-2024-12-01-15-30-00
```

#### 재시작 정보 조회
```bash
node src/progress-cli.js resume migration-2024-12-01-15-30-00
```

#### 전체 요약
```bash
node src/progress-cli.js summary
```

#### 오래된 진행 상황 파일 정리
```bash
node src/progress-cli.js cleanup 7  # 7일 이전 완료 파일 삭제
```

### 4. 진행 상황 상태

| 상태 | 설명 | 아이콘 |
|------|------|-------|
| `INITIALIZING` | 초기화 중 | ⚡ |
| `RUNNING` | 실행 중 | 🔄 |
| `COMPLETED` | 완료 | ✅ |
| `FAILED` | 실패 | ❌ |
| `PAUSED` | 일시정지 | ⏸️ |

### 5. 실시간 모니터링 화면

```
================================================================================
📊 Migration Progress: migration-2024-12-01-15-30-00
================================================================================
Status: RUNNING | Phase: MIGRATING
Current Query: migrate_users

Queries: [████████████████████          ] 65.0% (13/20)
Rows:    [██████████████████████████    ] 87.3% (87,300/100,000)

Duration: 2m 15s
Speed: 647 rows/sec
ETA: 18s
================================================================================
```

### 6. 배치 처리 추적

각 쿼리의 배치 처리 상황도 실시간으로 추적됩니다:

```
배치 진행 상황:
  현재 배치: 15/25 (60.0%)
  배치 크기: 1000행
  처리된 행: 15,000/25,000
```

### 7. 성능 메트릭

- **평균 처리 속도**: 초당 처리 행 수
- **예상 완료 시간**: 현재 속도 기준 남은 시간
- **전체 실행 시간**: 마이그레이션 시작부터 경과 시간
- **페이즈별 소요 시간**: 각 단계별 처리 시간

### 8. 오류 추적

오류 발생 시 상세 정보가 기록됩니다:

```json
{
  "errors": [
    {
      "timestamp": 1701434445000,
      "queryId": "migrate_orders",
      "error": "Connection timeout",
      "phase": "MIGRATING"
    }
  ]
}
```

### 9. 활용 팁

- **장시간 실행 마이그레이션**: `monitor` 명령으로 실시간 추적
- **배치 실행**: `list` 명령으로 전체 상황 한눈에 파악
- **오류 분석**: `show` 명령으로 상세 오류 정보 확인
- **성능 튜닝**: 처리 속도 메트릭을 통한 최적화 지점 파악
- **재시작 판단**: 실패한 마이그레이션의 상세 정보로 재시작 여부 결정

### 3. 동적 변수 활용 예시

```xml
<!-- 활성 사용자 추출 -->
<dynamicVar id="get_active_users"
            variableName="activeUsers"
            extractType="single_column"
            columnName="user_id">
  <![CDATA[
    SELECT user_id FROM users WHERE status = 'ACTIVE'
  ]]>
</dynamicVar>

<!-- 추출된 변수 사용 -->
<query id="migrate_orders" ...>
  <sourceQuery>
    <![CDATA[
      SELECT order_id, user_id, order_date, amount
      FROM orders 
      WHERE user_id IN (${activeUsers})
    ]]>
  </sourceQuery>
</query>
```

### 4. 전처리/후처리 활용 예시

```xml
<query id="migrate_large_table" ...>
  <preProcess description="성능 최적화">
    <![CDATA[
      -- 인덱스 비활성화
      ALTER INDEX ALL ON large_table DISABLE;
      
      -- 백업 생성
      SELECT * INTO large_table_backup FROM large_table WHERE 1=0;
    ]]>
  </preProcess>
  
  <sourceQuery>
    <![CDATA[
      SELECT * FROM large_table
    ]]>
  </sourceQuery>
  
  <postProcess description="후처리 작업">
    <![CDATA[
      -- 인덱스 재구성
      ALTER INDEX ALL ON large_table REBUILD;
      
      -- 통계 업데이트
      UPDATE STATISTICS large_table;
      
      -- 검증
      DECLARE @count INT;
      SELECT @count = COUNT(*) FROM large_table;
      INSERT INTO migration_log VALUES ('large_table', @count, GETDATE());
    ]]>
  </postProcess>
</query>
```

## 🔍 문제 해결

### 1. 일반적인 오류

#### 연결 오류
```
❌ 타겟 DB '...'는 읽기 전용 데이터베이스입니다.
```
**해결방법**: `config/dbinfo.json`에서 타겟 DB의 `isWritable`을 `true`로 설정

#### 설정 파일 오류
```
❌ 쿼리문정의 파일을 찾을 수 없습니다.
```
**해결방법**: 파일 경로 확인 및 XML 구문 검증

#### 메모리 부족
```
❌ JavaScript heap out of memory
```
**해결방법**: 배치 크기 감소, Node.js 메모리 증가
```bash
node --max-old-space-size=4096 src/migrate-cli.js migrate ...
```

### 2. 성능 최적화

#### 대용량 데이터 처리
- 배치 크기 조정 (500-2000 권장)
- 인덱스 비활성화/재구성
- 트랜잭션 격리 수준 조정

#### 네트워크 최적화
- 연결 풀 크기 조정
- 타임아웃 설정 증가
- 압축 활성화

### 3. 디버깅 팁

#### 상세 로깅 활성화
```bash
ENABLE_LOGGING=true node src/migrate-cli.js migrate ...
```

#### DRY RUN으로 테스트
```bash
node src/migrate-cli.js migrate --query ./queries/test.xml --dry-run
```

#### 개별 쿼리 테스트
- `enabled="false"`로 다른 쿼리 비활성화
- 작은 데이터셋으로 테스트

### 4. 모니터링

#### 로그 확인
- `logs/` 디렉토리의 로그 파일 확인
- SQL Server 로그 모니터링
- 시스템 리소스 사용량 확인

#### 진행률 추적
- 콘솔 출력으로 실시간 진행률 확인
- 배치별 처리 시간 모니터링

## 🔄 마이그레이션 재시작

v2.1부터 네트워크 오류나 시스템 장애로 인해 중단된 마이그레이션을 중단된 지점에서 재시작할 수 있습니다.

### 1. 재시작 가능 조건

다음 상태의 마이그레이션은 재시작이 가능합니다:

- **FAILED**: 오류로 인해 실패한 마이그레이션
- **PAUSED**: 일시정지된 마이그레이션  
- **RUNNING**: 5분 이상 업데이트가 없는 실행 중 상태 (네트워크 끊김 등)

### 2. 재시작 동작 방식

#### 지능적 재시작
- ✅ **완료된 쿼리는 건너뛰기**: 이미 처리된 데이터는 재처리하지 않음
- 🔄 **실패한 쿼리부터 재실행**: 오류가 발생한 지점부터 정확히 재시작
- 📊 **통계 정보 보존**: 이전 실행의 성과는 그대로 유지
- 🔢 **재시작 횟수 추적**: 몇 번째 재시작인지 기록

#### 데이터 안전성
- 중복 처리 방지: 완료된 작업은 절대 재실행되지 않음
- 무결성 보장: 여러 번 재시작해도 데이터 일관성 유지
- 트랜잭션 안전: 각 쿼리는 독립적으로 커밋됨

### 3. 사용 방법

#### 단계 1: 재시작 정보 확인
```bash
node src/progress-cli.js resume migration-2024-12-01-15-30-00
```

**출력 예시:**
```
📋 재시작 상태
   재시작 가능: ✅ 예
   현재 상태: ❌ FAILED
   
📊 진행 상황
   완료된 쿼리: 2개 (migrate_users, migrate_products)
   실패한 쿼리: 1개 (migrate_orders - Connection timeout)
   남은 쿼리: 3개
   완료율: 40.0%

🚀 재시작 명령어
   node src/migrate-cli.js resume migration-2024-12-01-15-30-00
```

#### 단계 2: 실제 재시작 실행
```bash
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml
```

### 4. 실제 사용 시나리오

#### 네트워크 장애 복구 시나리오
```bash
# 1. 대용량 마이그레이션 실행 중 네트워크 오류로 중단
node src/migrate-cli.js migrate --query ./queries/large-migration.xml
# ❌ 네트워크 오류로 실패

# 2. 재시작 정보 확인
node src/progress-cli.js resume migration-2024-12-01-15-30-00
# ✅ 재시작 가능, 완료된 쿼리: 15/30

# 3. 중단된 지점에서 재시작
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/large-migration.xml
# 🔄 16번째 쿼리부터 재실행
```

#### 시스템 장애 복구 시나리오
```bash
# 시스템 재부팅 후 마이그레이션 목록 확인
node src/progress-cli.js list

# 중단된 마이그레이션 찾기
node src/progress-cli.js summary

# 재시작 가능 여부 확인
node src/progress-cli.js resume migration-2024-12-01-15-30-00

# 재시작 실행
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml
```

### 5. 주의사항

- **쿼리 파일 일치**: 재시작 시 원래 사용했던 쿼리 파일과 동일한 파일을 사용해야 함
- **데이터베이스 연결**: 소스 및 타겟 데이터베이스 연결 정보가 동일해야 함
- **권한 확인**: 재시작 시에도 적절한 데이터베이스 권한이 필요함
- **진행 상황 파일**: `logs/progress-*.json` 파일이 삭제되면 재시작 불가

### 8. 실시간 모니터링 (Interactive Monitoring)

마이그레이션 진행 상황을 실시간으로 모니터링하고 키보드로 제어할 수 있습니다.

#### 실시간 모니터링 시작
```bash
# 마이그레이션과 동시에 실시간 모니터링 시작
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# 별도 터미널에서 모니터링만 실행
node src/progress-cli.js monitor migration-2024-12-01-15-30-00 --watch-only
```

#### 키보드 컨트롤
| 키 | 기능 |
|---|------|
| `q` | 모니터링 종료 |
| `p` | 일시정지/재개 |
| `d` | 상세/간단 모드 전환 |
| `+` | 새로고침 빠르게 |
| `-` | 새로고침 느리게 |
| `r` | 즉시 새로고침 |
| `e` | 오류 로그 보기 |
| `s` | 통계 보기 |
| `l` | 로그 스트림 보기 |
| `c` | 화면 클리어 |
| `h` | 도움말 |
| `ESC` | 메뉴 |

#### 디스플레이 모드
- **간단 모드**: 기본 진행률과 성능 지표
- **상세 모드**: 활성 쿼리, 완료된 쿼리, 오류 정보
- **오류 로그**: 최근 오류와 오류 통계
- **통계 보기**: 전체 마이그레이션 통계
- **로그 스트림**: 실시간 로그와 시스템 성능

#### 알림 시스템
```bash
# 알림 임계값 설정
ERROR_THRESHOLD=5 SLOW_QUERY_THRESHOLD=30 node src/progress-cli.js monitor migration-id

# Windows Toast 알림 활성화
ENABLE_TOAST_NOTIFICATIONS=true node src/progress-cli.js monitor migration-id
```

### 9. SELECT * 자동 확장

전/후처리 스크립트에서도 `SELECT *`를 사용하면 자동으로 명시적 컬럼명으로 확장됩니다.

#### 기본 사용법
```xml
<preProcess description="백업 생성">
  <![CDATA[
    -- 자동으로 모든 컬럼명으로 확장됨
    INSERT INTO users_backup 
    SELECT * FROM users WHERE status = 'ACTIVE';
    
    -- 테이블 별칭도 지원
    INSERT INTO audit_backup
    SELECT u.* FROM users u 
    LEFT JOIN departments d ON u.dept_id = d.id
    WHERE u.created_date >= '2024-01-01';
  ]]>
</preProcess>
```

#### 지원하는 SQL 패턴
- 기본 SELECT *: `SELECT * FROM table_name`
- 테이블 별칭: `SELECT t.* FROM table_name t`
- 복잡한 JOIN: `SELECT u.* FROM users u LEFT JOIN ...`
- WHERE/ORDER BY: `SELECT * FROM table WHERE ... ORDER BY ...`

#### 환경 변수 제어
```bash
# SELECT * 처리 비활성화
PROCESS_SELECT_STAR=false node src/migrate-cli.js migrate queries.xml

# 디버그 모드로 SELECT * 처리 과정 확인
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

### 10. 전/후처리 컬럼 오버라이드

전/후처리 스크립트의 INSERT/UPDATE 문에도 columnOverrides가 자동으로 적용됩니다.

#### 자동 적용 예시
```xml
<query id="audit_migration" ...>
  <preProcess description="감사 로그 생성">
    <![CDATA[
      -- 이 INSERT문에 migration_user, migration_date가 자동 추가됨
      INSERT INTO audit_log (operation_type, start_time)
      VALUES ('DATA_MIGRATION', GETDATE());
      
      -- 이 UPDATE문에 updated_by, updated_date가 자동 추가됨
      UPDATE migration_status 
      SET status = 'IN_PROGRESS'
      WHERE migration_id = 'audit_migration';
    ]]>
  </preProcess>
  
  <columnOverrides>
    <override column="migration_user">${migrationUser}</override>
    <override column="migration_date">GETDATE()</override>
    <override column="updated_by">${migrationUser}</override>
    <override column="updated_date">GETDATE()</override>
  </columnOverrides>
</query>
```

#### 변환 결과
**변환 전:**
```sql
INSERT INTO audit_log (operation_type, start_time)
VALUES ('DATA_MIGRATION', GETDATE());
```

**변환 후:**
```sql
INSERT INTO audit_log (operation_type, start_time, migration_user, migration_date)
VALUES ('DATA_MIGRATION', GETDATE(), 'admin', GETDATE());
```

#### 지원 구문
- `INSERT INTO ... VALUES (...)`
- `INSERT INTO ... SELECT ...`
- `UPDATE ... SET ... WHERE ...`

#### 디버깅
```bash
# 컬럼 오버라이드 처리 과정 확인
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

### 11. 고급 SQL 파싱 및 주석 처리

복잡한 SQL 구문과 주석을 정확하게 처리합니다.

#### 지원하는 주석 형태
```sql
-- 라인 주석
/* 블록 주석 */
/* 
   여러 줄
   블록 주석
*/

-- 문자열 내 주석은 보호됨
INSERT INTO log VALUES ('-- 이것은 주석이 아님');
INSERT INTO log VALUES ('/* 이것도 주석이 아님 */');
```

#### 변수 처리 개선
- **처리 순서**: 동적 변수 → 정적 변수 → 타임스탬프 함수 → 환경 변수
- **충돌 방지**: 상위 우선순위 변수가 처리된 경우 하위에서 덮어쓰지 않음
- **디버깅**: 상세한 변수 치환 과정 추적

#### 디버깅 옵션
```bash
# 변수 치환 과정 상세 로그
DEBUG_VARIABLES=true node src/migrate-cli.js migrate queries.xml

# 주석 제거 과정 확인
DEBUG_COMMENTS=true node src/migrate-cli.js migrate queries.xml

# 스크립트 전체 처리 과정 확인
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

## 📞 지원
- Site Url : sql2db.com 
- Contact to sql2db.nodejs@gmail.com


### 로그 파일 위치
- 일반 로그: `logs/migration-YYYY-MM-DD.log`
- 오류 로그: 콘솔 출력 및 로그 파일

### 버전 확인
```bash
node src/migrate-cli.js --version
```

### 도움말
```bash
node src/migrate-cli.js help
```

---

**📝 버전**: v2.3.0  
**📅 최종 업데이트**: 2025-08-08
**🔧 주요 기능**: 컬럼 오버라이드, 전처리/후처리, 동적 변수, 배치 처리