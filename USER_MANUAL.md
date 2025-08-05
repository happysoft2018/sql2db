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

      <!-- 삭제 조건 -->
      <deleteWhere>
        <![CDATA[ WHERE created_date >= '${startDate}' ]]>
      </deleteWhere>

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

## 🚀 고급 기능

### 1. 컬럼 오버라이드 (columnOverrides)

특정 컬럼에 고정값 또는 동적값을 설정합니다.

```xml
<columnOverrides>
  <!-- 고정값 설정 -->
  <override column="status">MIGRATED</override>
  <override column="migration_flag">1</override>
  
  <!-- 변수 사용 -->
  <override column="updated_by">${migrationUser}</override>
  <override column="migration_date">${migrationTimestamp}</override>
  
  <!-- SQL 함수 사용 -->
  <override column="created_date">GETDATE()</override>
</columnOverrides>
```

#### 활용 사례
- 마이그레이션 플래그 설정
- 환경별 값 변경 (DEV → PROD)
- 감사 정보 추가
- 상태 값 업데이트

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
      SELECT company_code, company_name FROM companies
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
  
  <deleteWhere>
    <![CDATA[
      WHERE created_date >= '2024-01-01'
    ]]>
  </deleteWhere>
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
  </columnOverrides>
</query>
```

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

## 📞 지원

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

**📝 버전**: v2.0.0  
**📅 최종 업데이트**: 2024-12-01  
**🔧 주요 기능**: 컬럼 오버라이드, 전처리/후처리, 동적 변수, 배치 처리