# SQL2DB Migration Tool 업데이트 로그

## 🔧 v0.7.1 - 다중 데이터베이스 동적변수 지원 확장 (2025-09-01)

### ✨ 새로운 기능

#### dbinfo.json 모든 데이터베이스에서 동적변수 추출 지원
- **전체 DB 지원**: dbinfo.json에 정의된 모든 데이터베이스에서 동적변수 추출 가능
- **자동 연결 관리**: 각 DB별로 별도의 연결 풀 생성 및 관리
- **에러 처리 강화**: 잘못된 DB 지정 시 사용 가능한 DB 목록 표시

#### 지원하는 데이터베이스
| 데이터베이스 | 설명 | 사용 예시 |
|-------------|------|-----------|
| `sourceDB` | 소스 데이터베이스 (읽기 전용) | 운영 환경에서 마스터 데이터 추출 |
| `targetDB` | 타겟 데이터베이스 (읽기/쓰기) | 개발 환경에서 참조 데이터 추출 |
| `sampleDB` | 샘플 데이터베이스 | 테스트 데이터 또는 메타데이터 추출 |
| 기타 DB | dbinfo.json에 정의된 모든 DB | 사용자 정의 데이터베이스에서 데이터 추출 |

#### 사용 예시
```xml
<!-- 여러 DB에서 동적변수 추출 -->
<dynamicVariables>
  <!-- 소스 DB에서 사용자 목록 -->
  <dynamicVar variableName="sourceUsers" database="sourceDB">
    SELECT user_id FROM users WHERE status = 'ACTIVE'
  </dynamicVar>
  
  <!-- 타겟 DB에서 부서 정보 -->
  <dynamicVar variableName="targetDepts" database="targetDB">
    SELECT dept_id FROM departments WHERE is_active = 1
  </dynamicVar>
  
  <!-- 샘플 DB에서 회사 정보 -->
  <dynamicVar variableName="companyInfo" database="sampleDB">
    SELECT company_code, company_name FROM companies
  </dynamicVar>
</dynamicVariables>
```

### 🔄 개선 사항

#### Connection Manager 확장
- **loadDBConfigs()**: dbinfo.json에서 DB 설정 자동 로드
- **connectToDB(dbKey)**: 특정 DB에 연결
- **queryDB(dbKey, query)**: 특정 DB에서 쿼리 실행
- **getAvailableDBKeys()**: 사용 가능한 모든 DB 키 목록 반환
- **disconnectDB(dbKey)**: 특정 DB 연결 해제
- **disconnectAllDBs()**: 모든 DB 연결 해제

#### 동적변수 추출 로직 개선
- **데이터베이스 유효성 검사**: 지정된 DB가 dbinfo.json에 존재하는지 확인
- **자동 연결**: 동적변수 추출 시 필요한 DB에 자동 연결
- **에러 메시지 개선**: 사용 가능한 DB 목록과 함께 명확한 에러 정보 제공

### 🛠️ 기술적 개선사항
- **연결 풀 관리**: 각 DB별로 독립적인 연결 풀 생성 및 관리
- **메모리 최적화**: 불필요한 연결은 자동으로 해제
- **에러 복구**: DB 연결 실패 시 적절한 에러 처리 및 복구

### 📊 활용 사례
- **복잡한 마이그레이션**: 여러 DB에서 조건 데이터 추출 후 통합 마이그레이션
- **교차 DB 참조**: 소스에서 마스터 데이터, 타겟에서 매핑 정보 추출
- **테스트 환경**: 샘플 DB에서 테스트 데이터 추출하여 마이그레이션 검증

---

## 🔧 v0.7 - 동적 변수 및 SQL 처리 개선 (2025-08-29)

### ✨ 새로운 기능

#### 동적 변수 데이터베이스 지정 기능
- **데이터베이스 선택**: 동적 변수에서 `database` 속성으로 소스/타겟 DB 선택 가능
- **기본값 제공**: 속성 미지정 시 `sourceDB`를 기본값으로 사용
- **교차 DB 활용**: 소스에서 조건 추출 후 타겟에서 관련 데이터 조회 가능

#### 사용 예시
```xml
<!-- 소스 DB에서 사용자 ID 추출 -->
<dynamicVar id="extract_source_users"
            variableName="sourceUserIds"
            extractType="single_column"
            columnName="user_id"
            database="sourceDB">
  <![CDATA[SELECT user_id FROM users WHERE status = 'ACTIVE']]>
</dynamicVar>

<!-- 타겟 DB에서 매핑 정보 추출 -->
<dynamicVar id="extract_target_mapping"
            variableName="targetMapping"
            extractType="key_value_pairs"
            database="targetDB">
  <![CDATA[SELECT old_id, new_id FROM id_mapping]]>
</dynamicVar>
```

### 🔄 개선 사항

#### SELECT * 패턴 개선
- **정확한 별칭 감지**: SQL 키워드(WHERE, GROUP, HAVING 등)를 별칭으로 오인하지 않음
- **안전한 패턴 매칭**: 더 정확한 정규식 패턴으로 테이블 별칭 추출
- **오류 방지**: 잘못된 컬럼명 생성으로 인한 SQL 오류 방지

**개선 전후 비교:**
```sql
-- 개선 전 (문제 상황)
SELECT * FROM products WHERE status = 'ACTIVE'
-- 잘못된 변환: SELECT WHERE.product_name, WHERE.product_code FROM products WHERE status = 'ACTIVE'

-- 개선 후 (정상 동작)
SELECT * FROM products WHERE status = 'ACTIVE'
-- 정상 변환: SELECT product_name, product_code, category_id FROM products WHERE status = 'ACTIVE'
```

#### DRY RUN 모드 강화
- **실제 동적 변수 추출**: DRY RUN에서도 동적 변수를 실제로 추출하여 저장
- **정확한 쿼리 시뮬레이션**: 추출된 동적 변수 값을 사용한 정확한 쿼리 검증
- **오류 사전 감지**: 동적 변수 관련 오류를 DRY RUN 단계에서 미리 발견

#### 오류 처리 및 안정성 개선
- **안전한 변수 치환**: 동적 변수가 아직 추출되지 않은 상태에서도 안전하게 처리
- **Graceful Fallback**: 기능 실패 시 원본 데이터로 안전하게 복구
- **상세한 오류 메시지**: 문제 발생 시 더 명확한 오류 정보 제공

### 🛠️ 디버깅 지원
```bash
# 동적 변수 처리 과정 상세 로그
DEBUG_VARIABLES=true node src/migrate-cli.js migrate queries.xml

# SELECT * 처리 과정 확인
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

### 📊 활용 사례
- **소스 DB 추출**: 마이그레이션 대상 데이터 식별
- **타겟 DB 추출**: 기존 매핑 정보나 참조 데이터 조회
- **교차 DB 활용**: 소스에서 조건 추출 후 타겟에서 관련 데이터 조회

---

## 🔧 v0.6 - 처리 단계별 컬럼 오버라이드 제어 (2024-08-14)

### ✨ 새로운 기능

#### 처리 단계별 applyGlobalColumns 제어
- **세분화된 제어**: preProcess, sourceQuery, postProcess 각 단계별로 개별 applyGlobalColumns 설정 가능
- **유연한 컬럼 적용**: 단계별 목적에 맞게 필요한 전역 컬럼만 선택적 적용
- **성능 최적화**: 불필요한 컬럼 처리 생략으로 성능 향상

#### 단계별 설정 방식
```xml
<query id="migrate_users" targetTable="users" ...>
  <preProcess description="백업" applyGlobalColumns="created_by,updated_by">
    <![CDATA[INSERT INTO user_backup SELECT * FROM users;]]>
  </preProcess>
  
  <sourceQuery applyGlobalColumns="all">
    <![CDATA[SELECT user_id, username, email FROM users_source;]]>
  </sourceQuery>
  
  <postProcess description="로그" applyGlobalColumns="migration_date">
    <![CDATA[INSERT INTO migration_log VALUES ('users', GETDATE());]]>
  </postProcess>
</query>
```

### 🔄 변경 사항
- **기존**: query 레벨에서 단일 applyGlobalColumns 설정
- **신규**: 각 처리 단계별로 독립적인 applyGlobalColumns 설정

### 📝 사용 예시

#### 단계별 컬럼 적용
- **preProcess**: 백업 테이블에는 생성자 정보만 (`created_by`)
- **sourceQuery**: 실제 데이터 이관에는 모든 컬럼 (`all`)
- **postProcess**: 로그 테이블에는 타임스탬프만 (`migration_date`)

이를 통해 각 단계의 목적에 맞는 최적화된 컬럼 오버라이드 적용이 가능합니다.

## 🎯 v0.5 - 전역 전/후처리 그룹 관리 (2024-08-14)

### ✨ 새로운 기능

#### 전역 전/후처리 그룹 시스템
- **간단한 그룹화**: globalProcesses 내에서 전/후처리를 기능별 그룹으로 관리
- **순차 실행**: 정의된 순서대로 그룹별 실행
- **개별 제어**: 각 그룹별 활성화/비활성화 설정
- **완전한 동적 변수 지원**: 모든 그룹에서 동적 변수 사용 가능

#### 기본 제공 그룹 예시
1. **performance_setup**: 성능 최적화 설정 (인덱스/제약조건 비활성화)
2. **logging**: 마이그레이션 로그 초기화
3. **validation**: 데이터 검증 및 품질 체크
4. **performance_restore**: 성능 최적화 복원 (인덱스/제약조건 재활성화)
5. **verification**: 이관 후 데이터 검증
6. **completion**: 완료 로그 및 통계

### 🔄 실행 순서
1. **전역 전처리 그룹들** (정의된 순서대로)
2. 동적 변수 추출
3. 개별 쿼리 마이그레이션
4. **전역 후처리 그룹들** (정의된 순서대로)

### 🛡️ 오류 처리
- **전처리 그룹 오류**: 마이그레이션 전체 중단
- **후처리 그룹 오류**: 경고 로그 후 다음 그룹 계속 진행

### 📝 사용 예시

#### XML 그룹 설정
```xml
<globalProcesses>
  <preProcessGroups>
    <group id="performance_setup" description="성능 최적화 설정" enabled="true">
      <![CDATA[
        -- 인덱스 비활성화
        ALTER INDEX ALL ON users DISABLE;
        ALTER INDEX ALL ON products DISABLE;
        
        -- 제약조건 비활성화
        ALTER TABLE users NOCHECK CONSTRAINT ALL;
        ALTER TABLE products NOCHECK CONSTRAINT ALL;
      ]]>
    </group>
    
    <group id="validation" description="데이터 검증" enabled="true">
      <![CDATA[
        -- 중복 데이터 체크 (동적 변수 사용)
        IF EXISTS (SELECT user_id, COUNT(*) FROM users_source GROUP BY user_id HAVING COUNT(*) > 1)
        BEGIN
          RAISERROR('중복된 사용자 ID가 발견되었습니다.', 16, 1);
        END
        
        -- 활성 사용자 검증
        INSERT INTO validation_log 
        SELECT 'ACTIVE_USER_CHECK', COUNT(*), GETDATE()
        FROM users_source WHERE user_id IN (${activeUserIds});
      ]]>
    </group>
  </preProcessGroups>
  
  <postProcessGroups>
    <group id="performance_restore" description="성능 최적화 복원" enabled="true">
      <![CDATA[
        -- 제약조건 재활성화
        ALTER TABLE users WITH CHECK CHECK CONSTRAINT ALL;
        ALTER TABLE products WITH CHECK CHECK CONSTRAINT ALL;
        
        -- 인덱스 재활성화
        ALTER INDEX ALL ON users REBUILD;
        ALTER INDEX ALL ON products REBUILD;
      ]]>
    </group>
    
    <group id="completion" description="완료 로깅" enabled="true">
      <![CDATA[
        -- 최종 통계
        INSERT INTO migration_completion_log 
        SELECT 'MIGRATION_COMPLETE', GETDATE(), 
               (SELECT COUNT(*) FROM users),
               (SELECT COUNT(*) FROM products);
      ]]>
    </group>
  </postProcessGroups>
</globalProcesses>
```

## 🔄 v0.4 - 동적 변수 시스템 개선 (2024-08-13)

### ✨ 새로운 기능

#### 향상된 동적 변수 시스템
- **기본 타입 단순화**: `extractType`이 지정되지 않으면 자동으로 `column_identified` 동작으로 기본 설정
- **개선된 변수 타입**: 사용성을 위해 3개 타입에서 2개 타입으로 간소화
- **향상된 오류 처리**: 해결되지 않은 변수와 엣지 케이스에 대한 더 나은 처리

### 🔄 변경 사항

#### 기본 타입 동작
- **이전**: 명시적인 `extractType` 지정 필요
- **신규**: `extractType`이 생략되면 `column_identified`로 기본 설정

#### 변수 타입 단순화
| 타입 | 설명 | 접근 패턴 | 기본값 |
|------|-------------|----------------|---------|
| `column_identified` | 모든 컬럼을 컬럼명으로 키를 가진 배열로 추출 | `${varName.columnName}` | ✅ 예 |
| `key_value_pairs` | 처음 두 컬럼을 키-값 쌍으로 추출 | `${varName.key}` | 아니오 |

### 📝 사용 예시

#### 간소화된 설정
```xml
<dynamicVariables>
  <!-- column_identified 사용 (기본값) - extractType 불필요 -->
  <dynamicVar id="customer_data" description="고객 정보">
    <query>SELECT CustomerID, CustomerName, Region FROM Customers</query>
  </dynamicVar>
  
  <!-- key_value_pairs 사용 - 명시적 지정 필요 -->
  <dynamicVar id="status_mapping" description="상태 매핑">
    <query>SELECT StatusCode, StatusName FROM StatusCodes</query>
    <extractType>key_value_pairs</extractType>
  </dynamicVar>
</dynamicVariables>
```

### 🔧 개선사항
- **사용성 향상**: `column_identified`를 기본값으로 설정하여 설정 복잡성 감소
- **일관성**: 도구 간 일관성을 위해 sql2excel 동작과 정렬
- **문서화**: 새로운 기본 동작을 반영하여 모든 문서 업데이트

## 📈 v0.3.0 - 진행 상황 관리 시스템 (2024-08-12)

### ✨ 새로운 기능

#### 실시간 진행 상황 추적
- **라이브 모니터링**: 실시간 마이그레이션 진행 상황 모니터링
- **성능 메트릭**: 처리 속도 및 예상 완료 시간
- **상세 분석**: 단계, 쿼리, 배치 레벨 상세 정보
- **중단 복구**: 완료된 지점에서 중단된 마이그레이션 재개
- **영구 저장**: 이력 관리를 위한 진행 상황 파일
- **CLI 도구**: 다양한 쿼리 및 관리 명령어

### 🛠️ 진행 상황 관리 명령어
```bash
# 모든 마이그레이션 목록
node src/progress-cli.js list

# 특정 마이그레이션 상세 정보
node src/progress-cli.js show migration-2024-12-01-15-30-00

# 실시간 모니터링
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# 재개 정보
node src/progress-cli.js resume migration-2024-12-01-15-30-00

# 중단된 마이그레이션 재시작
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml

# 전체 요약
node src/progress-cli.js summary

# 오래된 파일 정리
node src/progress-cli.js cleanup 7
```

### 📊 진행 상황 파일 구조
```json
{
  "migrationId": "migration-2024-12-01-15-30-00",
  "startTime": "2024-12-01T15:30:00.000Z",
  "status": "IN_PROGRESS",
  "totalQueries": 5,
  "completedQueries": 2,
  "currentQuery": "migrate_users",
  "currentBatch": 1500,
  "totalBatches": 5000,
  "progress": {
    "percentage": 40.0,
    "estimatedCompletion": "2024-12-01T16:45:00.000Z"
  }
}
```

## ⭐ v0.2.3 - SELECT * 자동 처리 (2024-08-11)

### ✨ 새로운 기능

#### SELECT * 자동 처리
- **자동 감지**: `SELECT * FROM table_name` 패턴 자동 감지
- **IDENTITY 컬럼 제외**: 타겟 테이블의 IDENTITY 컬럼을 자동으로 식별하고 제외
- **자동 컬럼 목록 생성**: `targetColumns` 자동 설정
- **소스 쿼리 변환**: `SELECT *`를 명시적 컬럼 목록으로 변환

### 📝 사용 예시
```xml
<query id="migrate_users" targetTable="users" enabled="true">
  <sourceQuery>
    <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
  </sourceQuery>
  <!-- targetColumns 자동 설정 (IDENTITY 컬럼 제외) -->
</query>
```

### 🔄 처리 단계
1. `SELECT *` 패턴 감지
2. 타겟 테이블의 모든 컬럼 조회
3. IDENTITY 컬럼 식별 및 제외
4. `targetColumns` 자동 설정
5. 소스 쿼리를 명시적 컬럼 목록으로 변환

### 📋 로그 예시
```
SELECT * 감지됨. 테이블 users의 컬럼 정보를 자동으로 가져오는 중.
IDENTITY 컬럼 자동 제외: id
자동 설정된 컬럼 목록 (15개 컬럼, IDENTITY 제외): name, email, status, created_date, ...
수정된 소스 쿼리: SELECT name, email, status, created_date, ... FROM users WHERE status = 'ACTIVE'
```

## 🔧 v0.2.1 - 컬럼 오버라이드 개선 (2024-08-10)

### ✨ 새로운 기능

#### 향상된 컬럼 오버라이드 시스템
- **전역 컬럼 오버라이드**: 모든 쿼리에 오버라이드 적용
- **전/후처리 오버라이드**: 전/후처리 스크립트에서 오버라이드 적용
- **고급 SQL 파싱**: 주석이 포함된 복잡한 SQL 문 지원
- **개선된 오류 처리**: 더 나은 오류 메시지 및 복구

### 📝 사용 예시

#### 전역 컬럼 오버라이드
```xml
<!-- 간단한 값 -->
<globalColumnOverrides>
  <override column="created_by">SYSTEM</override>
  <override column="created_date">${CURRENT_TIMESTAMP}</override>
  <override column="migration_source">LEGACY_SYSTEM</override>
</globalColumnOverrides>

<!-- JSON 값 -->
<globalColumnOverrides>
  <override column="data_version">{"users": "2.1", "orders": "2.2", "products": "2.3", "default": "2.0"}</override>
  <override column="migration_date">{"sourceDB": "${CURRENT_DATE}", "targetDB": "2024-12-31", "default": "${CURRENT_DATE}"}</override>
</globalColumnOverrides>
```

#### 전/후처리 오버라이드
```xml
<preProcess description="오버라이드와 함께 백업" applyGlobalColumns="all">
  <![CDATA[
    INSERT INTO backup_table (id, name, created_by, created_date)
    SELECT id, name, 'BACKUP_SYSTEM', GETDATE()
    FROM target_table;
  ]]>
</preProcess>
```

## 🔄 v0.2.0 - 동적 변수 시스템 (2024-08-09)

### ✨ 새로운 기능

#### 동적 변수 시스템
- **런타임 데이터 추출**: 런타임에 데이터베이스에서 데이터 추출
- **변수 타입**: `column_identified` 및 `key_value_pairs` 타입 지원
- **쿼리 통합**: 마이그레이션 쿼리에서 동적 변수 사용
- **오류 처리**: 변수 해결 실패에 대한 우아한 처리
- **데이터베이스 선택**: 소스 또는 타겟 데이터베이스 지정을 위한 `database` 속성 지원

### 📝 사용 예시

#### 동적 변수 정의
```xml
<dynamicVariables>
  <dynamicVar id="active_customers" description="활성 고객 목록">
    <query>SELECT CustomerID FROM Customers WHERE IsActive = 1</query>
    <extractType>column_identified</extractType>
    <database>sourceDB</database>
  </dynamicVar>
  
  <dynamicVar id="status_mapping" description="상태 매핑">
    <query>SELECT StatusCode, StatusName FROM StatusCodes</query>
    <extractType>key_value_pairs</extractType>
    <database>sourceDB</database>
  </dynamicVar>
  
  <dynamicVar id="max_order_id" description="최대 주문 ID">
    <query>SELECT MAX(OrderID) as max_id FROM Orders</query>
    <extractType>single_value</extractType>
    <database>targetDB</database>
  </dynamicVar>
</dynamicVariables>
```

#### 쿼리에서 사용
```sql
SELECT * FROM Orders 
WHERE CustomerID IN (${active_customers.CustomerID})
  AND Status IN (${status_mapping.StatusCode})
```

## 📋 v0.1.9 - 로깅 및 모니터링 (2024-08-08)

### ✨ 새로운 기능

#### 향상된 로깅 시스템
- **5단계 로깅**: DEBUG, INFO, WARN, ERROR, FATAL
- **구조화된 로그**: 더 나은 파싱을 위한 JSON 형식
- **로그 로테이션**: 자동 로그 파일 로테이션
- **성능 메트릭**: 상세한 성능 추적

#### 실시간 모니터링
- **라이브 진행 상황**: 실시간 마이그레이션 진행 상황 표시
- **성능 차트**: 시각적 성능 메트릭
- **인터랙티브 인터페이스**: 키보드 기반 모니터링 인터페이스

### 📊 로그 레벨
- **DEBUG**: 상세한 디버깅 정보
- **INFO**: 일반적인 마이그레이션 진행 상황 정보
- **WARN**: 경고 메시지 (비중요한 문제)
- **ERROR**: 오류 메시지 (마이그레이션 계속 가능)
- **FATAL**: 치명적인 오류 (마이그레이션 중단)

## 🛠️ v0.1.8 - CLI 및 배치 개선 (2024-08-07)

### ✨ 새로운 기능

#### 향상된 CLI 인터페이스
- **인터랙티브 메뉴**: 사용자 친화적인 인터랙티브 메뉴 시스템
- **명령어 검증**: 개선된 명령어 검증 및 오류 메시지
- **도움말 시스템**: 포괄적인 도움말 문서
- **배치 파일 지원**: 쉬운 실행을 위한 Windows 배치 파일

#### 새로운 명령어
```bash
# 인터랙티브 메뉴
migrate.bat

# 설정 검증
node src/migrate-cli.js validate --query ./queries/migration-queries.xml

# 데이터베이스 연결 테스트
node src/migrate-cli.js list-dbs

# 드라이 런 시뮬레이션
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run
```

## 🔄 v0.1.7 - 트랜잭션 및 오류 처리 (2024-08-06)

### ✨ 새로운 기능

#### 트랜잭션 지원
- **자동 트랜잭션**: 자동 트랜잭션 관리
- **오류 시 롤백**: 마이그레이션 오류 시 자동 롤백
- **커밋 제어**: 수동 커밋 제어 옵션
- **격리 수준**: 설정 가능한 트랜잭션 격리 수준

#### 향상된 오류 처리
- **상세한 오류 메시지**: 포괄적인 오류 정보
- **오류 복구**: 자동 오류 복구 메커니즘
- **재시도 로직**: 일시적 오류에 대한 자동 재시도
- **오류 로깅**: 상세한 오류 로깅 및 보고

## 📊 v0.1.6 - 성능 최적화 (2024-08-05)

### ✨ 새로운 기능

#### 성능 개선
- **배치 처리**: 대용량 데이터셋을 위한 최적화된 배치 처리
- **메모리 관리**: 개선된 메모리 사용 및 가비지 컬렉션
- **연결 풀링**: 향상된 연결 풀 관리
- **쿼리 최적화**: 자동 쿼리 최적화

#### 설정 옵션
```xml
<settings>
  <batchSize>1000</batchSize>
  <connectionPool>
    <min>5</min>
    <max>20</max>
    <acquireTimeout>60000</acquireTimeout>
  </connectionPool>
  <performance>
    <enableQueryOptimization>true</enableQueryOptimization>
    <enableBatchProcessing>true</enableBatchProcessing>
  </performance>
</settings>
```

## 🔧 v0.1.5 - 설정 개선 (2024-08-04)

### ✨ 새로운 기능

#### 향상된 설정
- **JSON 지원**: 완전한 JSON 설정 지원
- **환경 변수**: 환경 변수 치환
- **설정 검증**: 포괄적인 설정 검증
- **기본값**: 모든 설정에 대한 합리적인 기본값

#### 설정 예시
```json
{
  "databases": {
    "source": "sourceDB",
    "target": "targetDB"
  },
  "settings": {
    "batchSize": 1000,
    "logLevel": "INFO"
  },
  "queries": [
    {
      "id": "migrate_users",
      "sourceQuery": "SELECT * FROM users WHERE status = 'ACTIVE'",
      "targetTable": "users",
      "enabled": true
    }
  ]
}
```

## 📋 v0.1.4 - 문서 및 예시 (2024-08-03)

### ✨ 새로운 기능

#### 포괄적인 문서
- **사용자 매뉴얼**: 예시가 포함된 완전한 사용자 매뉴얼
- **API 문서**: 상세한 API 문서
- **설정 가이드**: 단계별 설정 가이드
- **문제 해결 가이드**: 일반적인 문제 및 해결책

#### 예시 파일
- **샘플 설정**: XML 및 JSON 예시 파일
- **데이터베이스 스크립트**: 샘플 데이터베이스 생성 스크립트
- **테스트 데이터**: 테스트용 샘플 데이터
- **마이그레이션 예시**: 실제 마이그레이션 예시

## 🔄 v0.1.3 - 핵심 마이그레이션 엔진 (2024-08-02)

### ✨ 새로운 기능

#### 핵심 마이그레이션 엔진
- **기본 마이그레이션**: 핵심 데이터 마이그레이션 기능
- **컬럼 매핑**: 자동 컬럼 매핑
- **데이터 타입 처리**: 포괄적인 데이터 타입 지원
- **오류 처리**: 기본 오류 처리 및 보고

#### 초기 기능
- XML 설정 지원
- 기본 SQL Server 연결
- 간단한 데이터 전송
- 기본 로깅

## 📊 v0.1.2 - 기반 (2024-08-01)

### ✨ 새로운 기능

#### 프로젝트 기반
- **프로젝트 구조**: 초기 프로젝트 구조
- **의존성**: 핵심 Node.js 의존성
- **기본 설정**: 초기 설정 시스템
- **문서**: 기본 프로젝트 문서

## 🔧 v0.1.1 - 초기 릴리스 (2024-07-31)

### ✨ 새로운 기능

#### 초기 릴리스
- **기본 기능**: 핵심 마이그레이션 도구 기능
- **SQL Server 지원**: SQL Server 데이터베이스 지원
- **Node.js 플랫폼**: Node.js 기반 구현
- **오픈 소스**: MIT 라이선스

---

**연락처**: sql2db.nodejs@gmail.com  
**웹사이트**: sql2db.com  
**라이선스**: MIT License