# SQL2DB Migration Tool 업데이트 로그

## 🔧 v2.7.1 - 다중 데이터베이스 동적변수 지원 확장 (2025-09-01)

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

## 🔧 v2.7 - 동적 변수 및 SQL 처리 개선 (2025-08-29)

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

## 🔧 v2.6 - 처리 단계별 컬럼 오버라이드 제어 (2024-08-14)

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

## 🎯 v2.5 - 전역 전/후처리 그룹 관리 기능 (2024-08-14)

### ✨ 새로운 기능

#### 전역 전/후처리 그룹 시스템
- **간단한 그룹화**: globalProcesses 내에서 전/후처리를 기능별 그룹으로 관리
- **순차 실행**: 정의된 순서대로 그룹별 실행
- **개별 제어**: 각 그룹별 활성화/비활성화 설정
- **동적변수 완전 지원**: 모든 그룹에서 동적변수 사용 가능

#### 기본 제공 그룹 예시
1. **performance_setup**: 성능 최적화 설정 (인덱스/제약조건 비활성화)
2. **logging**: 마이그레이션 로그 초기화
3. **validation**: 데이터 검증 및 품질 체크
4. **performance_restore**: 성능 최적화 복원 (인덱스/제약조건 재활성화)
5. **verification**: 이관 후 데이터 검증
6. **completion**: 완료 로그 및 통계

### 🔄 실행 순서
1. **전역 전처리 그룹들** (정의된 순서대로)
2. 동적변수 추출
3. 개별 쿼리 마이그레이션
4. **전역 후처리 그룹들** (정의된 순서대로)

### 🛡️ 오류 처리
- **전처리 그룹 오류**: 마이그레이션 전체 중단
- **후처리 그룹 오류**: 경고 로그 후 다음 그룹 계속 진행

### 📝 사용법 예시

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
        -- 중복 데이터 체크 (동적변수 사용)
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
        -- 인덱스 재구성
        ALTER INDEX ALL ON users REBUILD;
        ALTER INDEX ALL ON products REBUILD;
      ]]>
    </group>
  </postProcessGroups>
</globalProcesses>
```

## 🔄 v2.4 - columnOverrides 기능 개선 (2024-08-14)

### ✨ 새로운 기능

#### 선택적 전역 컬럼 오버라이드 적용
- **applyGlobalColumns 속성 추가**: 각 쿼리에서 필요한 전역 컬럼만 선택적으로 적용 가능
- **유연한 설정 옵션**: `all`, `none`, 개별 컬럼명, 쉼표로 구분된 여러 컬럼 지원
- **스마트 검증**: 존재하지 않는 컬럼 지정 시 경고 메시지 출력
- **성능 최적화**: 필요한 컬럼만 처리하여 성능 향상

#### 개선된 행 수 추정 시스템
- **안전한 변수 치환**: 행 수 추정 시 변수 값이 2개 이상이어도 오류 없이 처리
- **COUNT 쿼리 최적화**: 서브쿼리를 사용한 효율적인 행 수 계산
- **Graceful Fallback**: COUNT 쿼리 실패 시 원본 쿼리로 안전하게 대체
- **SQL 파일 지원**: sourceQueryFile 사용 시에도 정확한 행 수 추정

### ⚠️ 주요 변경사항

#### columnOverrides 기능 단순화
- **개별 쿼리 columnOverrides 제거**: 각 쿼리의 `<columnOverrides>` 설정 완전 제거
- **globalColumnOverrides 중심**: 전역 설정을 정의하고 각 쿼리에서 선택적 적용  
- **코드 간소화**: 복잡한 병합 로직 제거로 성능 향상 및 유지보수성 개선
- **유연성 향상**: 쿼리별로 필요한 컬럼만 적용하여 더욱 세밀한 제어

### 📋 마이그레이션 가이드

기존 XML 파일을 수정하여 개별 쿼리의 `<columnOverrides>` 섹션을 제거하고, 
필요한 경우 `<globalColumnOverrides>`에 추가하시기 바랍니다.

**변경 전:**
```xml
<query id="example">
  <columnOverrides>
    <override column="status">MIGRATED</override>
  </columnOverrides>
</query>
```

**변경 후:**
```xml
<!-- globalColumnOverrides에 통합 -->
<globalColumnOverrides>
  <override column="status">MIGRATED</override>
  <override column="created_by">SYSTEM</override>
  <override column="updated_by">SYSTEM</override>
</globalColumnOverrides>

<query id="example" applyGlobalColumns="status">
  <!-- 필요한 전역 컬럼만 선택적 적용 -->
</query>

<query id="another" applyGlobalColumns="all">
  <!-- 모든 전역 컬럼 적용 -->
</query>

<query id="minimal" applyGlobalColumns="none">
  <!-- 전역 컬럼 적용 안함 -->
</query>
```

---

## 🌟 v2.3 - 고급 기능 대폭 강화 (2025-08-11)

### ✨ 새로운 기능

#### 🖥️ 실시간 인터랙티브 모니터링
- **키보드 컨트롤**: 실시간 모니터링 중 키보드로 모드 전환 및 제어
- **다중 디스플레이 모드**: 간단/상세/오류로그/통계/로그스트림 모드 지원
- **실시간 차트**: 텍스트 기반 성능 차트 및 진행률 시각화
- **스마트 알림**: 오류 임계값, 느린 쿼리, 정체 상황 자동 감지 및 알림
- **Windows Toast 알림**: 시스템 알림으로 중요 이벤트 통지

#### ⭐ 전/후처리 스크립트 SELECT * 자동 확장
- **스마트 컬럼 확장**: 전/후처리 스크립트의 `SELECT *`를 테이블 스키마 기반으로 자동 확장
- **테이블 별칭 지원**: `SELECT u.* FROM users u` 형태의 별칭 처리
- **복잡한 SQL 지원**: JOIN, WHERE, ORDER BY와 함께 사용 가능
- **오류 처리**: 스키마 조회 실패 시 원본 쿼리 유지

#### 🎨 전/후처리 columnOverrides 자동 적용
- **INSERT 문 지원**: `VALUES (...)` 및 `SELECT ...` 형태 모두 지원
- **UPDATE 문 지원**: 기존 SET 절에 새로운 컬럼 할당 자동 추가
- **스마트 충돌 방지**: 이미 존재하는 컬럼은 중복 추가하지 않음
- **변수 치환**: columnOverrides 값에도 동적 변수 치환 적용

#### 📝 고급 SQL 파싱 및 주석 처리
- **정확한 주석 제거**: 라인 주석(`--`)과 블록 주석(`/* */`) 정확한 파싱
- **문자열 리터럴 보호**: 문자열 내 주석 패턴은 주석으로 처리하지 않음
- **이스케이프 처리**: 이스케이프된 따옴표 정확한 처리
- **멀티라인 지원**: 여러 줄에 걸친 복잡한 SQL 구문 지원

#### 🔧 변수 시스템 강화
- **처리 우선순위 개선**: 동적 변수 → 정적 변수 → 타임스탬프 함수 → 환경 변수
- **충돌 방지**: 상위 우선순위로 처리된 변수를 하위에서 덮어쓰지 않음
- **상세 디버깅**: `DEBUG_VARIABLES=true`로 변수 치환 과정 추적
- **오류 복구**: 개별 변수 치환 실패가 전체에 영향주지 않음

### 🚀 성능 및 안정성 개선

#### 처리 순서 최적화
```
변수 치환 → SELECT * 확장 → columnOverrides 적용 → 주석 제거 → SQL 실행
```

#### 오류 처리 강화
- **단계별 오류 격리**: 각 처리 단계의 실패가 다른 단계에 영향주지 않음
- **Graceful Degradation**: 기능 실패 시 원본 데이터로 안전하게 fallback
- **상세 로깅**: 각 단계별 처리 결과와 오류 정보 제공

### 🛠️ 새로운 환경 변수

#### 디버깅 옵션
```bash
DEBUG_VARIABLES=true    # 변수 치환 과정 상세 로그
DEBUG_COMMENTS=true     # 주석 제거 과정 확인  
DEBUG_SCRIPTS=true      # 스크립트 전체 처리 과정 확인
```

#### 기능 제어
```bash
PROCESS_SELECT_STAR=false        # SELECT * 처리 비활성화
ERROR_THRESHOLD=5                # 오류 알림 임계값
SLOW_QUERY_THRESHOLD=30          # 느린 쿼리 알림 임계값 (초)
ENABLE_TOAST_NOTIFICATIONS=true  # Windows Toast 알림 활성화
```

### 📊 실시간 모니터링 키보드 컨트롤

| 키 | 기능 |
|---|------|
| `q` | 모니터링 종료 |
| `p` | 일시정지/재개 |
| `d` | 상세/간단 모드 전환 |
| `+/-` | 새로고침 속도 조절 |
| `r` | 즉시 새로고침 |
| `e` | 오류 로그 보기 |
| `s` | 통계 보기 |
| `l` | 로그 스트림 보기 |
| `c` | 화면 클리어 |
| `h` | 도움말 |

### 🎯 사용법 예시

#### 실시간 모니터링
```bash
# 마이그레이션과 함께 모니터링 시작
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# 별도 터미널에서 모니터링
node src/progress-cli.js monitor migration-id --watch-only
```

#### 전/후처리에서 SELECT * 사용
```xml
<preProcess description="백업 생성">
  <![CDATA[
    -- 자동으로 모든 컬럼명으로 확장됨
    INSERT INTO users_backup 
    SELECT * FROM users WHERE status = 'ACTIVE';
  ]]>
</preProcess>
```

#### 전/후처리 columnOverrides
```xml
<query id="audit_migration">
  <preProcess description="감사 로그">
    <![CDATA[
      -- migration_user, migration_date 자동 추가
      INSERT INTO audit_log (operation_type, start_time)
      VALUES ('MIGRATION', GETDATE());
    ]]>
  </preProcess>
  
  <columnOverrides>
    <override column="migration_user">${migrationUser}</override>
    <override column="migration_date">GETDATE()</override>
  </columnOverrides>
</query>
```

### 🔍 향후 계획
- 더 많은 SQL 패턴 지원 확장
- 데이터베이스 종류별 최적화
- 성능 모니터링 메트릭 추가
- 웹 기반 모니터링 대시보드

---

## 🆕 v2.2 - 전역 컬럼 오버라이드 기능 추가 (2025-08-07)

### ✨ 새로운 기능

#### 전역 columnOverrides 지원
- **상위 레벨 설정**: 모든 쿼리에 공통으로 적용되는 전역 컬럼 오버라이드 정의 가능
- **설정 병합**: 전역 설정과 개별 쿼리 설정의 지능적 병합
- **우선순위 처리**: 개별 쿼리 설정이 전역 설정을 덮어쓰는 방식

#### 주요 장점
- **코드 중복 제거**: 공통 컬럼 설정을 한 곳에서 관리
- **일관성 보장**: 마이그레이션 메타데이터 일관성 유지
- **유지보수성 향상**: 전역 변경 시 한 번의 수정으로 모든 쿼리에 적용

#### 사용 예시
```xml
<migration>
  <!-- 전역 컬럼 오버라이드 -->
  <globalColumnOverrides>
    <override column="created_by">SYSTEM_MIGRATOR</override>
    <override column="migration_date">${migrationTimestamp}</override>
    <override column="data_version">2.2</override>
  </globalColumnOverrides>
  
  <queries>
    <query id="migrate_users">
      <!-- 개별 설정은 전역 설정과 병합됨 -->
      <columnOverrides>
        <override column="status">MIGRATED</override>
      </columnOverrides>
    </query>
  </queries>
</migration>
```

### 🔧 개선사항
- XML 파싱 로직에 전역 columnOverrides 처리 추가
- 컬럼 오버라이드 병합 알고리즘 구현
- 디버그 로깅으로 적용된 오버라이드 추적 지원
- 사용자 매뉴얼에 상세한 병합 규칙 설명 추가

---

## 📋 v2.1 - 진행 상황 관리 및 재시작 기능 추가

## 🎯 개요

SQL2DB 마이그레이션 도구에 실시간 진행 상황 추적 및 모니터링 기능과 중단된 마이그레이션 재시작 기능이 추가되었습니다. 이제 대용량 데이터 마이그레이션의 진행 상황을 실시간으로 모니터링하고, 성능 메트릭을 확인하며, 네트워크 오류 등으로 중단된 작업을 완료된 지점에서 재시작할 수 있습니다.

## 🚀 주요 기능

### 1. 자동 진행 상황 추적
- 마이그레이션 시작부터 완료까지 모든 단계 자동 추적
- 고유한 Migration ID로 각 작업 식별
- JSON 형태로 실시간 상태 저장

### 2. 다차원 모니터링
- **페이즈별 추적**: 연결, 전처리, 마이그레이션, 후처리
- **쿼리별 상세 정보**: 각 쿼리의 실행 상태 및 처리량
- **배치별 진행률**: 실시간 배치 처리 상황
- **성능 메트릭**: 처리 속도, 예상 완료 시간

### 3. 마이그레이션 재시작 (신규)
- **지능적 재시작**: 완료된 쿼리는 건너뛰고 실패한 지점부터 재실행
- **상태 기반 재시작**: FAILED, PAUSED, 오래된 RUNNING 상태에서 재시작 가능
- **데이터 안전성**: 중복 처리 방지 및 트랜잭션 무결성 보장
- **재시작 횟수 추적**: 시도 횟수 및 이력 관리

### 4. 실시간 CLI 모니터링
- 진행 상황 목록 조회
- 특정 마이그레이션 상세 모니터링
- 실시간 진행률 표시
- 성능 지표 및 오류 추적

## 📋 새로 추가된 파일

### 1. `src/progress-manager.js`
진행 상황 관리의 핵심 클래스:

```javascript
class ProgressManager {
    constructor(migrationId = null)
    startMigration(totalQueries, totalRows)
    updatePhase(phaseName, status, description)
    startQuery(queryId, description, estimatedRows)
    updateBatchProgress(queryId, batchNumber, totalBatches, batchSize)
    completeQuery(queryId, finalStats)
    completeMigration()
    // ... 기타 메서드
}
```

**주요 기능:**
- 실시간 진행 상황 추적
- JSON 파일 자동 저장 (5초 간격)
- 성능 메트릭 계산
- 오류 정보 수집
- 진행률 및 예상 시간 계산

### 2. `src/progress-cli.js`
진행 상황 조회 및 모니터링을 위한 CLI 도구:

```bash
# 사용 가능한 명령어
node src/progress-cli.js list                    # 목록 조회
node src/progress-cli.js show <migration-id>     # 상세 정보
node src/progress-cli.js monitor <migration-id>  # 실시간 모니터링
node src/progress-cli.js summary                 # 전체 요약
node src/progress-cli.js cleanup [days]          # 파일 정리
```

## 🔧 기존 코드 수정사항

### 1. `src/mssql-data-migrator.js`
**추가된 기능:**
- ProgressManager 인스턴스 생성 및 관리
- 각 페이즈별 진행 상황 업데이트
- 쿼리별 시작/완료 추적
- 최종 결과에 진행 상황 정보 포함

**주요 수정 부분:**
```javascript
// 생성자에 진행 상황 관리자 추가
this.progressManager = null;

// 마이그레이션 시작 시 초기화
this.progressManager = new ProgressManager();

// 각 페이즈마다 상태 업데이트
this.progressManager.updatePhase('CONNECTING', 'RUNNING', 'Connecting to databases');
this.progressManager.updatePhase('MIGRATING', 'RUNNING', 'Migrating data');

// 쿼리별 추적
this.progressManager.startQuery(queryConfig.id, queryConfig.description, 0);
this.progressManager.completeQuery(queryConfig.id, { processedRows: result.rowsProcessed });
```

### 2. `insertDataInBatches` 메서드 개선
**배치 진행 상황 추적 추가:**
```javascript
// 배치 진행 상황 업데이트
if (this.progressManager && queryId) {
    this.progressManager.updateBatchProgress(
        queryId, batchNumber, totalBatches, batchSize, i + batch.length
    );
}
```

## 📊 진행 상황 데이터 구조

### 저장 파일 위치
```
logs/progress-{migration-id}.json
```

### 데이터 구조
```json
{
  "migrationId": "migration-2024-12-01-15-30-00",
  "status": "RUNNING",
  "startTime": 1701434445000,
  "endTime": null,
  "totalQueries": 5,
  "completedQueries": 2,
  "failedQueries": 0,
  "totalRows": 10000,
  "processedRows": 4500,
  "currentQuery": "migrate_users",
  "currentPhase": "MIGRATING",
  "phases": {
    "CONNECTING": {
      "status": "COMPLETED",
      "startTime": 1701434445000,
      "endTime": 1701434446000,
      "description": "Database connections established"
    }
  },
  "queries": {
    "migrate_users": {
      "status": "RUNNING",
      "startTime": 1701434447000,
      "processedRows": 2500,
      "currentBatch": 3,
      "totalBatches": 10
    }
  },
  "performance": {
    "avgRowsPerSecond": 850,
    "estimatedTimeRemaining": 6.47,
    "totalDuration": 5.29
  },
  "errors": []
}
```

## 🎨 사용자 인터페이스

### 1. 실시간 모니터링 화면
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

### 2. 목록 조회 화면
```
================================================================================
📊 마이그레이션 진행 상황 목록
================================================================================

1. migration-2024-12-01-15-30-00
   상태: ✅ COMPLETED
   시작: 2024. 12. 1. 오후 3:30:00
   종료: 2024. 12. 1. 오후 3:45:30
   수정: 2024. 12. 1. 오후 3:45:30
   쿼리: 20/20 (100.0%)

2. migration-2024-12-01-14-15-00
   상태: 🔄 RUNNING
   시작: 2024. 12. 1. 오후 2:15:00
   종료: N/A
   수정: 2024. 12. 1. 오후 3:00:00
   쿼리: 15/25 (60.0%)
```

### 3. 상세 정보 화면
```
================================================================================
📊 마이그레이션 상세 진행 상황: migration-2024-12-01-15-30-00
================================================================================

📋 기본 정보
   ID: migration-2024-12-01-15-30-00
   상태: ✅ COMPLETED
   현재 페이즈: POST_PROCESSING
   현재 쿼리: None
   시작 시간: 2024. 12. 1. 오후 3:30:00
   종료 시간: 2024. 12. 1. 오후 3:45:30
   실행 시간: 15m 30s

📈 진행률
   쿼리: [██████████████████████████████] 100.0% (20/20)
   행:   [██████████████████████████████] 100.0% (1,000,000/1,000,000)

⚡ 성능
   평균 속도: 1,075 rows/sec

🔄 페이즈별 상태
   ✅ CONNECTING: COMPLETED (0.5s)
   ✅ PRE_PROCESSING: COMPLETED (2.1s)
   ✅ MIGRATING: COMPLETED (14.2s)
   ✅ POST_PROCESSING: COMPLETED (0.7s)

📝 쿼리별 상태
   ✅ migrate_users: COMPLETED
     설명: 사용자 데이터 이관
     처리: 250,000행 (3.5s)
     배치: 250/250 (100.0%)
   
   ✅ migrate_orders: COMPLETED
     설명: 주문 데이터 이관
     처리: 500,000행 (7.2s)
     배치: 500/500 (100.0%)
```

## 🔍 성능 메트릭

### 1. 실시간 계산 지표
- **평균 처리 속도**: `processedRows / elapsedSeconds`
- **예상 완료 시간**: `remainingRows / avgRowsPerSecond`
- **전체 진행률**: `completedQueries / totalQueries * 100`
- **행 처리율**: `processedRows / totalRows * 100`

### 2. 배치별 성능 추적
```javascript
// 배치 진행 상황 업데이트
updateBatchProgress(queryId, batchNumber, totalBatches, batchSize, processedInBatch)
```

## 🛡️ 오류 처리

### 1. 오류 정보 수집
```json
{
  "errors": [
    {
      "timestamp": 1701434445000,
      "queryId": "migrate_orders",
      "error": "Connection timeout",
      "phase": "MIGRATING",
      "stack": "Error: Connection timeout\n    at ..."
    }
  ]
}
```

### 2. 자동 복구 및 추적
- 연결 오류 시 재시도 로직
- 오류 발생 시 상세 정보 기록
- 실패한 쿼리별 오류 추적

## 📁 파일 관리

### 1. 자동 저장
- 5초마다 자동 저장
- 마이그레이션 완료/실패 시 최종 저장
- 프로세스 종료 시 안전한 저장

### 2. 파일 정리
```bash
# 7일 이전 완료된 파일 자동 정리
node src/progress-cli.js cleanup 7
```

### 3. 파일 명명 규칙
```
progress-migration-YYYY-MM-DD-HH-mm-ss.json
```

## 🎯 활용 시나리오

### 1. 대용량 데이터 마이그레이션
```bash
# 1단계: 마이그레이션 실행
node src/migrate-cli.js migrate --query queries/large-migration.xml

# 2단계: 별도 터미널에서 실시간 모니터링
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# 3단계: 완료 후 상세 분석
node src/progress-cli.js show migration-2024-12-01-15-30-00
```

### 2. 배치 작업 관리
```bash
# 전체 마이그레이션 현황 파악
node src/progress-cli.js summary

# 실패한 작업 분석
node src/progress-cli.js list | grep FAILED

# 오래된 로그 정리
node src/progress-cli.js cleanup 30
```

### 3. 성능 튜닝
```bash
# 진행 중인 작업의 성능 메트릭 확인
node src/progress-cli.js show migration-2024-12-01-15-30-00

# 처리 속도가 낮은 쿼리 식별
# 배치 크기 조정으로 성능 최적화
```

## 🔄 기존 기능과의 호환성

### 1. 기존 로깅 시스템
- 기존 로그 파일과 별도로 진행 상황 추적
- 로그 레벨 설정과 독립적으로 동작
- 기존 로그 포맷 유지

### 2. DRY RUN 모드
- DRY RUN 모드에서도 진행 상황 추적 가능
- 실제 데이터 변경 없이 성능 테스트 가능

### 3. 트랜잭션 모드
- 트랜잭션 사용 여부와 관계없이 진행 상황 추적
- 롤백 시에도 진행 상황 정보 보존

## 🔄 재시작 기능 (신규)

### 1. 재시작 명령어
```bash
# 재시작 정보 확인
node src/progress-cli.js resume migration-2024-12-01-15-30-00

# 실제 재시작 실행
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml
```

### 2. 재시작 동작 방식
- **완료된 쿼리 건너뛰기**: 이미 성공한 쿼리는 재실행하지 않음
- **실패 지점부터 재시작**: 실패한 쿼리부터 정확히 재실행
- **통계 정보 보존**: 이전 실행 결과를 최종 결과에 포함
- **안전성 보장**: 중복 처리 방지 및 데이터 무결성 유지

### 3. 사용 시나리오
- **네트워크 장애**: 연결 끊김으로 중단된 마이그레이션 재시작
- **시스템 재부팅**: 서버 재시작 후 미완료 작업 이어서 진행
- **메모리 부족**: 리소스 부족으로 실패한 작업 재시도
- **타임아웃 오류**: 대용량 쿼리 타임아웃 후 재시작

## 🚀 향후 확장 계획

### 1. 웹 기반 모니터링
- 웹 대시보드를 통한 실시간 모니터링
- 여러 마이그레이션 동시 모니터링
- 알림 및 경고 기능

### 2. 성능 분석
- 과거 마이그레이션 성능 비교
- 병목 지점 자동 분석
- 최적화 제안 기능

### 3. 자동화 연동
- CI/CD 파이프라인 연동
- 스케줄러와 연동한 배치 작업
- 외부 모니터링 시스템 연동

## 📊 결론

진행 상황 관리 및 재시작 기능의 추가로 SQL2DB 마이그레이션 도구는 다음과 같은 이점을 제공합니다:

1. **투명성**: 마이그레이션 과정의 모든 단계가 투명하게 공개
2. **예측 가능성**: 정확한 완료 시간 예측으로 계획 수립 지원
3. **문제 해결**: 오류 발생 시 빠른 원인 파악 및 해결
4. **성능 최적화**: 실시간 메트릭을 통한 성능 튜닝 지원
5. **이력 관리**: 과거 마이그레이션 이력을 통한 개선점 도출
6. **복원력**: 중단된 작업을 완료된 지점에서 안전하게 재시작
7. **시간 절약**: 처음부터 다시 시작할 필요 없이 중단 지점부터 재개

이러한 기능들을 통해 대용량 데이터 마이그레이션 작업을 보다 안전하고 효율적으로 수행할 수 있으며, 네트워크 불안정이나 시스템 장애에도 안정적으로 대응할 수 있습니다.