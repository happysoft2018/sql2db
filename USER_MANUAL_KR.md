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
- 🎛️ **유연한 설정**: XML 기반 설정
- 🔧 **컬럼 오버라이드**: 이관 시 특정 컬럼값 변경/추가
- ⚙️ **전처리/후처리**: 이관 전후 SQL 스크립트 실행
- 📊 **동적 변수**: 실행 시점 데이터 추출 및 활용
- 🗄️ **다중 DB 동적변수**: dbinfo.json의 모든 DB에서 동적변수 추출 가능
- 🚦 **트랜잭션 지원**: 데이터 일관성 보장
- 📋 **상세 로깅**: 비밀번호 마스킹을 포함한 이관 과정 추적 및 디버깅
- 📈 **실시간 진행 관리**: 작업 진행 상태 추적 및 모니터링
- 🔄 **중단 재시작**: 네트워크 오류 등으로 중단된 마이그레이션을 완료된 지점에서 재시작
- 🔍 **현재 시각 함수**: 다양한 형식의 타임스탬프 지원
- 🖥️ **실시간 모니터링**: 키보드 인터랙티브 모니터링 및 차트
- ⭐ **SELECT * 자동 확장**: 전/후처리 스크립트에서도 컬럼 자동 확장
- 🎨 **전/후처리 컬럼 오버라이드**: INSERT/UPDATE 문에 자동 컬럼 추가
- 📝 **고급 SQL 파싱**: 주석 처리 및 복잡한 SQL 구문 지원
- 🆕 **대소문자 구분 없는 컬럼 매칭**: 컬럼명 대소문자에 관계없이 자동 매칭
- 🆕 **대량 데이터 지원**: SQL Server 2100 파라미터 제한 자동 처리
- 🆕 **향상된 디버깅**: 삭제 작업 문제 해결을 위한 상세 진단

### 🆕 v0.9.0 주요 변경
- **전역 컬럼 오버라이드 선택 적용 강화**: XML `applyGlobalColumns` 정책을 먼저 적용(정책 단계) → 각 행에 실제 존재하는 컬럼에만 안전 적용(행 단계)
- **컬럼 메타 일관화**: `getTableColumns()`가 `{ name }[]`로 반환되어 SELECT * 확장 및 스키마 매칭의 일관성 향상
- **선택 적용 로직 견고화**: `{name}`/문자열 혼재 컬럼 배열도 안전하게 처리하도록 선택 적용 로직 보강
- **후처리 통계 갱신 권장**: `ALTER DATABASE ... SET AUTO_UPDATE_STATISTICS ON` 대신 `EXEC sp_updatestats;` 또는 `UPDATE STATISTICS ... WITH FULLSCAN;` 권장

## 🛠️ 설치 및 설정

### 1. 환경 요구사항

#### 독립 실행 파일 사용자
- Windows 7 이상 (64비트)
- SQL Server 2012 이상 (소스/타겟)
- 적절한 데이터베이스 권한
- **Node.js 설치 불필요**

#### Node.js 소스 사용자
- Windows 7 이상 (64비트)
- **Node.js 14.0 이상** (18.x 권장)
- npm 6.0 이상
- SQL Server 2012 이상 (소스/타겟)
- 적절한 데이터베이스 권한

### 2. 설치

#### 옵션 1: 독립 실행 파일 (일반 사용자용)

**적합한 사용자:**
- Node.js 없이 빠른 설치를 원하는 사용자
- 운영 환경
- Node.js에 익숙하지 않은 사용자

**설치 단계:**
1. 릴리스 페이지에서 `sql2db-v0.8.7-bin.zip` 다운로드
2. 원하는 위치에 압축 해제 (예: `C:\Tools\sql2db\`)
3. 추가 설치 불필요 - 바로 사용 가능!

**패키지 내용:**
```
sql2db-v0.8.7/
├── sql2db.exe              # 메인 실행 파일 (Node.js 불필요)
├── run.bat                 # 영문 실행 스크립트
├── 실행하기.bat             # 한글 실행 스크립트
├── config/
│   └── dbinfo.json         # 데이터베이스 설정
├── queries/                # 쿼리문정의 파일
│   └── (사용자 XML 파일)
├── resources/              # SQL 리소스 파일
│   ├── create_sample_tables.sql
│   └── insert_sample_data.sql
├── user_manual/            # 완전한 문서
│   ├── USER_MANUAL.md
│   ├── USER_MANUAL_KR.md
│   ├── CHANGELOG.md
│   └── CHANGELOG_KR.md
├── logs/                   # 로그 출력 디렉토리 (자동 생성)
└── results/                # 이관 결과 (자동 생성)
```

**장점:**
- ✅ Node.js 설치 불필요
- ✅ 단일 실행 파일
- ✅ 빠른 시작
- ✅ ~50MB 모든 의존성 포함 완전한 패키지
- ✅ 간편한 배포

#### 옵션 2: Node.js 소스 버전 (개발자용)

**적합한 사용자:**
- 소스 코드 수정이 필요한 개발자
- CI/CD 파이프라인
- 커스텀 통합
- 개발 및 테스트

**설치 단계:**

1. **Node.js 설치**
   ```bash
   # https://nodejs.org/ 에서 다운로드
   # 설치 확인
   node --version  # v14.0 이상 표시되어야 함
   npm --version   # v6.0 이상 표시되어야 함
   ```

2. **소스 코드 받기**
   ```bash
   # 방법 A: 저장소에서 클론
   git clone https://github.com/your-repo/sql2db.git
   cd sql2db
   
   # 방법 B: 소스 zip 다운로드 및 압축 해제
   # sql2db-source-v0.8.4.zip 압축 해제
   cd sql2db
   ```

3. **의존성 설치**
   ```bash
   npm install
   ```

4. **설치 확인**
   ```bash
   npm start
   # 대화형 메뉴가 실행되어야 함
   ```

**프로젝트 구조:**
```
sql2db/
├── app.js                  # 메인 대화형 인터페이스
├── package.json            # 프로젝트 설정
├── src/                    # 소스 코드
│   ├── migrate-cli.js      # CLI 진입점
│   ├── mssql-data-migrator-modular.js
│   ├── logger.js
│   ├── progress-manager.js
│   └── modules/            # 모듈화된 컴포넌트
│       ├── config-manager.js
│       ├── variable-manager.js
│       ├── query-processor.js
│       └── script-processor.js
├── config/
│   └── dbinfo.json         # 데이터베이스 설정
├── queries/                # 쿼리문정의 파일
├── resources/              # SQL 리소스 파일
├── test/                   # 테스트 파일
├── logs/                   # 로그 출력
└── dist/                   # 빌드된 실행 파일 (npm run build 후)
```

**개발 명령어:**
```bash
# 대화형 인터페이스 실행
npm start              # 영문
npm run start:kr       # 한글

# 직접 CLI 사용
npm run migrate        # 쿼리 파일로 이관
npm run validate       # 설정 검증
npm run dry-run        # 시뮬레이션 모드
npm run list-dbs       # 데이터베이스 목록

# 독립 실행 파일 빌드
npm run build          # dist/sql2db.exe 생성

# 배포 패키지 생성
npm run release        # 완전한 배포 패키지 생성

# 빌드 아티팩트 정리
npm run clean          # dist/ 및 release/ 제거
```

**장점:**
- ✅ 완전한 소스 코드 접근
- ✅ 커스터마이징 및 확장 가능
- ✅ 쉬운 디버깅 및 테스트
- ✅ 커스텀 실행 파일 빌드 가능
- ✅ 기존 Node.js 프로젝트와 통합

### 3. 데이터베이스 연결 설정
`config/dbinfo.json` 파일 편집:
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

## 방법 1: 독립 실행 파일 사용

### 대화형 인터페이스 실행

#### Windows 탐색기
1. 압축 해제한 폴더로 이동
2. `run.bat` (영문) 또는 `실행하기.bat` (한글) 더블클릭

#### 명령줄
```bash
# 설치 디렉토리로 이동
cd C:\Tools\sql2db

# 영문 버전
run.bat

# 한글 버전
실행하기.bat

# 또는 환경 변수로 언어 설정하여 직접 실행
set LANGUAGE=en && sql2db.exe
set LANGUAGE=kr && sql2db.exe
```

### 대화형 메뉴
```
=========================================
  MSSQL 데이터 이관 도구
  버전 0.8.4
=========================================

1. 쿼리문정의 파일 Syntax검증
2. DB연결 테스트 (연결 가능 여부 포함)
3. 데이터 이관 실행
4. 이관 진행 상황 조회
5. 도움말 보기
0. 종료

선택하세요 (0-5):
```

### 메뉴 옵션 상세 설명

#### 옵션 1: 쿼리문정의 파일 Syntax검증
**목적:** 이관 전 설정 파일의 오류 확인

**검사 항목:**
- ✅ XML/JSON 구문 유효성
- ✅ 속성명 정확성
- ✅ 필수 필드 존재 여부
- ✅ 데이터베이스 참조 유효성
- ✅ 쿼리 구조 무결성

**사용 단계:**
1. 메뉴 옵션 `1` 선택
2. 번호로 쿼리문정의 파일 선택
3. 검증 결과 확인
4. 표시된 오류 수정

**출력 예시:**
```
✅ 설정 검증 성공!
   - Settings: 유효
   - Queries: 5개 발견
   - Dynamic Variables: 3개 발견
   - Global Processes: 2개 그룹 발견
```

#### 옵션 2: DB연결 테스트
**목적:** 이관 전 데이터베이스 연결 확인

**테스트 항목:**
- ✅ 서버 연결
- ✅ 인증 자격 증명
- ✅ 데이터베이스 접근성
- ✅ 읽기/쓰기 권한

**사용 단계:**
1. 메뉴 옵션 `2` 선택
2. 모든 데이터베이스 연결 테스트 결과 확인
3. 모든 연결 성공 확인

**출력 예시:**
```
데이터베이스 연결 테스트 중...

✅ sourceDB
   서버: prod-db-01.company.com
   데이터베이스: production_db
   상태: 연결됨
   
✅ targetDB
   서버: dev-db-01.company.com
   데이터베이스: development_db
   상태: 연결됨
```

#### 옵션 3: 데이터 이관 실행
**목적:** 실제 데이터 이관 실행

**프로세스:**
1. 쿼리문정의 파일 선택
2. 이관 요약 검토
3. 실행 확인
4. 실시간 진행 상황 모니터링
5. 완료 요약 확인

**사용 단계:**
1. 메뉴 옵션 `3` 선택
2. 번호로 쿼리문정의 파일 선택
3. 'Y' 입력하여 이관 확인
4. 완료될 때까지 대기
5. 상세 내용은 로그 확인

**출력 예시:**
```
데이터 이관을 시작합니다...

✅ Query 1/5: migrate_users
   처리됨: 10,000행 5.2초 (1,923 행/초)

✅ Query 2/5: migrate_orders
   처리됨: 50,000행 24.5초 (2,041 행/초)

...

✅ 데이터 이관이 성공적으로 완료되었습니다!
   총 시간: 2분 15초
   총 행 수: 150,000
```

#### 옵션 4: 이관 진행 상황 조회
**목적:** 과거 이관 작업의 이력 및 상세 정보 조회

**기능:**
- 기본적으로 최근 3개 이관 작업 표시
- 전체 이관 이력 접근 ('A' 입력)
- 모든 이관 작업의 상세 상태 조회
- 쿼리별 진행 상황 확인
- 오류 정보 검토

**사용 단계:**
1. 메뉴 옵션 `4` 선택
2. 이관 목록 확인
3. 상세 정보를 볼 번호 입력
4. 'A' 입력하여 모든 이관 작업 보기
5. '0' 입력하여 메인 메뉴로 돌아가기

**출력 예시:**
```
이관 작업 이력 (최근 3개):

1. migration-2025-10-11-01-45-35
   상태: COMPLETED
   시작: 2025-10-11 오전 1:45:35
   진행: 25/25 queries
   완료: 2025-10-11 오전 1:48:20 (165초)

2. migration-2025-10-11-01-39-47
   상태: FAILED
   시작: 2025-10-11 오전 1:39:47
   진행: 15/25 queries
   실패: 3개

상세 정보를 볼 번호를 입력하세요 ('A': 전체보기, '0': 뒤로가기):
```

#### 옵션 5: 도움말 보기
**목적:** 사용 정보 및 예제 표시

**제공 정보:**
- 명령어 예제
- 설정 팁
- 문서 링크
- 일반적인 문제 해결

---

## 방법 2: Node.js 소스 사용

### 대화형 인터페이스

#### 명령줄에서 실행
```bash
# 프로젝트 디렉토리로 이동
cd /path/to/sql2db

# 영문 버전
npm start
# 출력: 대화형 메뉴 실행

# 한글 버전
npm run start:kr
# 출력: 대화형 메뉴 실행
```

대화형 메뉴는 독립 실행 파일 버전과 동일합니다.

### 명령줄 인터페이스 (CLI)

#### 설정 검증
```bash
# 특정 쿼리 파일 검증
node src/migrate-cli.js validate --query ./queries/migration-queries.xml

# 출력 예시:
# ✅ 설정 검증 성공!
#    Settings: 유효
#    Queries: 5개 발견
```

#### 데이터베이스 연결 테스트
```bash
# 모든 설정된 데이터베이스 테스트
node src/migrate-cli.js test

# 사용 가능한 모든 데이터베이스 목록
node src/migrate-cli.js list-dbs

# 특정 데이터베이스 연결 테스트
node src/migrate-cli.js list-dbs --test sourceDB
```

#### 데이터 이관 실행
```bash
# 일반 이관
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# 시뮬레이션 모드 (DRY RUN) - 실제 변경 없음
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run

# 커스텀 배치 크기로 실행
BATCH_SIZE=2000 node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

#### 중단된 이관 재시작
```bash
# 재시작 가능한 이관 목록
node src/progress-cli.js list

# 재시작 정보 확인
node src/progress-cli.js resume migration-2025-10-11-01-45-35

# 마지막 완료 지점부터 이관 재시작
node src/migrate-cli.js resume migration-2025-10-11-01-45-35 --query ./queries/migration-queries.xml
```

#### 이관 진행 상황 모니터링
```bash
# 모든 이관 목록
node src/progress-cli.js list

# 특정 이관 상세 정보
node src/progress-cli.js show migration-2025-10-11-01-45-35

# 실시간 모니터링 (이관이 실행 중이어야 함)
node src/progress-cli.js monitor migration-2025-10-11-01-45-35

# 모든 이관의 요약 표시
node src/progress-cli.js summary

# 오래된 진행 상황 파일 정리 (7일 이상)
node src/progress-cli.js cleanup 7
```

### 개발 명령어

#### 독립 실행 파일 빌드
```bash
# 실행 파일 빌드 (dist/sql2db.exe 생성)
npm run build

# 출력:
# > pkg . --public --no-native-build --compress GZip
# ✅ 빌드 완료: dist/sql2db.exe
```

#### 배포 패키지 생성
```bash
# 완전한 배포 패키지 생성
npm run release

# 출력:
# - 실행 파일 빌드
# - 배포 디렉토리 구조 생성
# - 필요한 파일 모두 복사
# - 문서 생성
# - ZIP 아카이브 생성
# 결과: release/sql2db-v0.8.0-bin.zip
```

#### 테스트 실행
```bash
# 모든 테스트 파일 실행
cd test
node test-basic-migration.js
node test-column-overrides.js
node test-dynamic-variables.js
# ... 등

# 또는 특정 테스트 실행
node test/test-dry-run.js
```

#### 환경 변수
```bash
# 배치 크기 설정
set BATCH_SIZE=2000
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# 상세 로깅 활성화
set ENABLE_LOGGING=true
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# 트랜잭션 지원 활성화
set ENABLE_TRANSACTION=true
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml

# 디버그 모드
set DEBUG_VARIABLES=true
set DEBUG_SCRIPTS=true
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

### npm 스크립트 참조

| 명령어 | 설명 |
|--------|------|
| `npm start` | 대화형 인터페이스 실행 (영문) |
| `npm run start:kr` | 대화형 인터페이스 실행 (한글) |
| `npm run migrate` | 이관 실행 (프롬프트 포함) |
| `npm run dry-run` | 시뮬레이션 모드 실행 (프롬프트 포함) |
| `npm run validate` | 설정 검증 (프롬프트 포함) |
| `npm run resume` | 중단된 이관 재시작 (프롬프트 포함) |
| `npm run progress` | 진행 상황 정보 표시 (프롬프트 포함) |
| `npm run test-connections` | 모든 데이터베이스 연결 테스트 |
| `npm run list-dbs` | 설정된 모든 데이터베이스 목록 |
| `npm run help` | 도움말 정보 표시 |
| `npm run build` | 독립 실행 파일 빌드 |
| `npm run release` | 완전한 배포 패키지 생성 |
| `npm run clean` | 빌드 아티팩트 제거 |

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

      <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->

      <!-- deleteWhere 기능은 제거됨 - deleteBeforeInsert=true시 identityColumns 기준으로 자동 삭제 -->

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
  - `true`: 소스 데이터의 비즈니스 키 값에 해당하는 타겟 데이터를 삭제 후 이관
    - ⚠️ **중요**: 삭제 시 기준이 되는 컬럼값을 각 쿼리의 `identityColumns` 속성에 명시해야 합니다
  - `false`: 삭제 없이 바로 이관 (UPSERT 형태)

### 3. 쿼리 속성

#### 필수 속성
- `id`: 쿼리 고유 식별자
- `description`: 쿼리 설명
- `targetTable`: 타겟 테이블명
- `identityColumns`: 데이터 행을 고유하게 식별하는 비즈니스 키 컬럼명 (데이터 삭제 및 동기화 기준)
  - 💡 **설명**: 데이터베이스의 물리적 Primary Key가 아닌, 비즈니스적으로 각 데이터 행을 유니크하게 구분할 수 있는 컬럼을 의미합니다
  - ⚠️ **중요**: IDENTITY(자동증가) 컬럼은 `identityColumns`에 사용할 수 없습니다
  - **사용 불가 이유**:
    1. **값 불일치**: IDENTITY 컬럼은 소스와 타겟에서 서로 다른 값으로 자동 생성되므로 동일한 레코드라도 ID 값이 다릅니다
    2. **삭제 오류**: `deleteBeforeInsert=true`일 때 소스의 ID로 타겟 레코드를 찾을 수 없어 삭제가 실패하거나 잘못된 데이터가 삭제됩니다
    3. **데이터 중복**: 동일한 비즈니스 데이터가 서로 다른 ID로 반복 삽입되어 중복 데이터가 생성됩니다
  - **해결방법**: 
    - 비즈니스 키를 사용하세요 (예: 사용자코드, 주문번호, 상품코드 등)
    - 복합키를 사용할 수 있습니다 (예: `identityColumns="user_code,region_code"`)
    - 필요시 별도의 고유 식별 컬럼을 테이블에 추가하세요
- `enabled`: 실행 여부 (true/false)

#### 선택적 속성
- `targetColumns`: 타겟 컬럼 목록 (공백시 소스와 동일)
- `batchSize`: 개별 배치 크기 (글로벌 설정 오버라이드)
- `deleteBeforeInsert`: 개별 삭제 설정 (글로벌 설정 오버라이드)
  - `true`: 소스 데이터의 비즈니스 키 값으로 타겟 데이터 삭제 후 이관
    - ⚠️ **중요**: 삭제 시 기준이 되는 컬럼값을 `identityColumns` 속성에 반드시 명시해야 합니다
  - `false`: 삭제 없이 바로 이관

### 4. 데이터 삭제 방식

v0.2부터 `deleteWhere` 기능이 제거되고, `deleteBeforeInsert`가 `true`일 때 자동으로 `identityColumns`에 지정된 비즈니스 키 기준으로 삭제됩니다.

#### 삭제 동작 방식
1. **FK 순서 고려 활성화된 경우** (`enableForeignKeyOrder: true`)
   - 모든 테이블을 FK 참조 순서에 따라 전체 삭제
   - 순환 참조 시 FK 제약조건을 일시 비활성화

2. **FK 순서 고려 비활성화된 경우** (`enableForeignKeyOrder: false`)
   - 각 쿼리별로 소스 데이터의 비즈니스 키 값에 해당하는 타겟 데이터만 삭제
   - 더 정확하고 안전한 삭제 방식

#### 예시
```xml
<!-- 단일 비즈니스 키인 경우 -->
<query identityColumns="user_id" deleteBeforeInsert="true">
  <!-- 소스에서 user_id가 1,2,3인 데이터가 조회되면 -->
  <!-- 타겟에서 user_id IN (1,2,3)인 행들을 먼저 삭제 -->
</query>

<!-- 복합 비즈니스 키인 경우 -->
<query identityColumns="order_id,line_no" deleteBeforeInsert="true">
  <!-- 소스에서 (order_id=100, line_no=1), (order_id=100, line_no=2) 조회되면 -->
  <!-- 타겟에서 해당 복합 비즈니스 키 조합의 행들을 먼저 삭제 -->
</query>
```

## 🚀 고급 기능

### 1. 글로벌 타임존 시스템 및 날짜/시간 변수

도구는 전 세계 22개 타임존을 지원하는 포괄적인 날짜/시간 변수를 지원하여 다양한 타임존의 타임스탬프를 사용할 수 있습니다.

#### 기본 구문

**타임존 지정 형식:**
```
${DATE.TIMEZONE:format}
```

**로컬 시간 형식:**
```
${DATE:format}
```

**참고:** 타임존을 지정하지 않으면 서버의 로컬 타임존이 사용됩니다. 글로벌 일관성을 위해 타임존을 명시적으로 지정하는 것을 권장합니다.

#### 지원 타임존 (총 22개)

| 타임존 | 설명 | UTC 오프셋 | 지역 |
|--------|------|------------|------|
| **UTC** | 협정 세계시 | UTC+0 | 글로벌 표준 |
| **GMT** | 그리니치 표준시 | UTC+0 | 영국 |
| **KST** | 한국 표준시 | UTC+9 | 대한민국 |
| **JST** | 일본 표준시 | UTC+9 | 일본 |
| **CST** | 중국 표준시 | UTC+8 | 중국 |
| **SGT** | 싱가포르 표준시 | UTC+8 | 싱가포르 |
| **PHT** | 필리핀 표준시 | UTC+8 | 필리핀 |
| **AEST** | 호주 동부 표준시 | UTC+10 | 호주 (동부) |
| **ICT** | 인도차이나 표준시 | UTC+7 | 태국, 베트남 |
| **IST** | 인도 표준시 | UTC+5:30 | 인도 |
| **GST** | 걸프 표준시 | UTC+4 | UAE, 오만 |
| **CET** | 중앙 유럽 표준시 | UTC+1 | 독일, 프랑스, 이탈리아, 폴란드 |
| **EET** | 동유럽 표준시 | UTC+2 | 동유럽 |
| **EST** | 미국 동부 표준시 | UTC-5 | 미국 동부 해안 |
| **AST** | 대서양 표준시 | UTC-4 | 캐나다 동부 |
| **CST_US** | 미국 중부 표준시 | UTC-6 | 미국, 캐나다, 멕시코 중부 |
| **MST** | 미국 산악 표준시 | UTC-7 | 미국 산악 지역 |
| **PST** | 미국 서부 표준시 | UTC-8 | 미국 서부 해안 |
| **AKST** | 알래스카 표준시 | UTC-9 | 알래스카 |
| **HST** | 하와이 표준시 | UTC-10 | 하와이 |
| **BRT** | 브라질 표준시 | UTC-3 | 브라질 |
| **ART** | 아르헨티나 표준시 | UTC-3 | 아르헨티나 |

#### 포맷 토큰

대문자 및 소문자 토큰 모두 지원:

| 토큰 | 설명 | 예시 |
|------|------|------|
| `yyyy` 또는 `YYYY` | 4자리 연도 | 2025 |
| `yy` 또는 `YY` | 2자리 연도 | 25 |
| `MM` | 2자리 월 | 01, 12 |
| `M` | 월 (1-2자리) | 1, 12 |
| `dd` 또는 `DD` | 2자리 일 | 01, 31 |
| `d` 또는 `D` | 일 (1-2자리) | 1, 31 |
| `HH` | 2자리 시간 (24시간) | 00, 23 |
| `H` | 시간 (1-2자리) | 0, 23 |
| `mm` | 2자리 분 | 00, 59 |
| `m` | 분 (1-2자리) | 0, 59 |
| `ss` | 2자리 초 | 00, 59 |
| `s` | 초 (1-2자리) | 0, 59 |
| `SSS` | 밀리초 | 000, 999 |

#### 사용 예시

**1. 타임존이 포함된 테이블명:**
```xml
<query id="backup_data" targetTable="users_backup_${DATE.UTC:yyyyMMdd}" enabled="true">
  <sourceQuery>SELECT * FROM users</sourceQuery>
</query>

<query id="log_migration" targetTable="migration_log_${DATE.KST:yyyy_MM_dd}" enabled="true">
  <sourceQuery>SELECT * FROM migration_data</sourceQuery>
</query>
```

**2. 여러 타임존을 사용한 컬럼 오버라이드:**
```xml
<columnOverrides>
  <override column="created_at_utc">${DATE.UTC:yyyy-MM-DD HH:mm:ss}</override>
  <override column="created_at_kst">${DATE.KST:yyyy-MM-DD HH:mm:ss}</override>
  <override column="created_at_est">${DATE.EST:yyyy-MM-DD HH:mm:ss}</override>
  <override column="migration_id">${DATE.UTC:yyyyMMddHHmmss}</override>
</columnOverrides>
```

**3. 로컬 시간 (서버 타임존):**
```xml
<columnOverrides>
  <override column="processed_at">${DATE:yyyy-MM-DD HH:mm:ss}</override>
  <override column="batch_id">${DATE:yyyyMMdd_HHmmss}</override>
</columnOverrides>
```

**4. 타임존이 포함된 WHERE 조건:**
```xml
<sourceQuery>
  <![CDATA[
    SELECT * FROM orders 
    WHERE order_date >= '${DATE.KST:yyyy-MM-DD}' 
      AND status = 'COMPLETED'
  ]]>
</sourceQuery>
```

**5. 전역 컬럼 오버라이드:**
```xml
<globalColumnOverrides>
  <override column="migration_date_utc">${DATE.UTC:yyyy-MM-DD}</override>
  <override column="migration_timestamp">${DATE.KST:yyyy-MM-DD HH:mm:ss}</override>
  <override column="created_by">MIGRATION_TOOL</override>
</globalColumnOverrides>
```

**6. 전/후처리:**
```xml
<preProcess description="타임스탬프와 함께 백업">
  <![CDATA[
    INSERT INTO backup_table_${DATE.UTC:yyyyMMdd} 
    SELECT *, '${DATE.UTC:yyyy-MM-DD HH:mm:ss}' as backup_time 
    FROM target_table;
  ]]>
</preProcess>

<postProcess description="완료 로깅">
  <![CDATA[
    INSERT INTO migration_log (table_name, completed_at_kst, completed_at_utc)
    VALUES ('target_table', '${DATE.KST:yyyy-MM-DD HH:mm:ss}', '${DATE.UTC:yyyy-MM-DD HH:mm:ss}');
  ]]>
</postProcess>
```

**7. 다중 타임존 이관 예시:**
```xml
<query id="global_migration" targetTable="users_${DATE.UTC:yyyyMMdd}" enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT user_id, user_name, email 
      FROM users 
      WHERE created_at >= '${DATE.KST:yyyy-MM-DD 00:00:00}'
    ]]>
  </sourceQuery>
  
  <columnOverrides>
    <override column="migration_timestamp_utc">${DATE.UTC:yyyy-MM-DD HH:mm:ss}</override>
    <override column="migration_timestamp_kst">${DATE.KST:yyyy-MM-DD HH:mm:ss}</override>
    <override column="migration_timestamp_est">${DATE.EST:yyyy-MM-DD HH:mm:ss}</override>
    <override column="migration_timestamp_cet">${DATE.CET:yyyy-MM-DD HH:mm:ss}</override>
  </columnOverrides>
</query>
```

#### 레거시 타임스탬프 함수

하위 호환성을 위해 여전히 지원되는 함수들:

| 함수 | 설명 | 형식 |
|------|------|------|
| `${CURRENT_TIMESTAMP}` | 현재 타임스탬프 | 2025-10-21 14:30:45 |
| `${CURRENT_DATETIME}` | 현재 날짜시간 | 2025-10-21 14:30:45 |
| `${NOW}` | 현재 날짜시간 | 2025-10-21 14:30:45 |
| `${CURRENT_DATE}` | 현재 날짜만 | 2025-10-21 |
| `${CURRENT_TIME}` | 현재 시간만 | 14:30:45 |
| `${UNIX_TIMESTAMP}` | 유닉스 타임스탬프 (초) | 1729507845 |
| `${TIMESTAMP_MS}` | 유닉스 타임스탬프 (밀리초) | 1729507845123 |
| `${ISO_TIMESTAMP}` | ISO 8601 형식 | 2025-10-21T14:30:45.123Z |
| `${GETDATE}` | SQL Server 형식 | 2025-10-21 14:30:45 |

**마이그레이션 예시:**
```xml
<!-- 이전 형식 (여전히 작동) -->
<override column="created_at">${CURRENT_TIMESTAMP}</override>

<!-- 새로운 형식 (권장) -->
<override column="created_at">${DATE.UTC:yyyy-MM-DD HH:mm:ss}</override>
<override column="created_at_kst">${DATE.KST:yyyy-MM-DD HH:mm:ss}</override>
```

### 2. 전역 컬럼 오버라이드 (globalColumnOverrides)

특정 컬럼에 고정값 또는 동적값을 설정합니다. 전역 설정을 정의하고, 각 쿼리에서 필요한 컬럼만 선택적으로 적용할 수 있습니다.

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
  
</query>
```

#### 선택적 적용 (applyGlobalColumns)

각 쿼리에서 `applyGlobalColumns` 속성을 사용하여 전역 컬럼 오버라이드를 선택적으로 적용할 수 있습니다.

**사용 가능한 값:**
- `all`: 모든 전역 컬럼 오버라이드 적용 (기본값) - 실제 데이터에 존재하는 컬럼만 적용됨
- `none`: 전역 컬럼 오버라이드 적용 안함
- `컬럼명`: 특정 컬럼만 적용 (예: `created_by`)
- `컬럼명1,컬럼명2`: 여러 컬럼 선택적 적용 (예: `created_by,updated_by`)

**사용 예시:**
```xml
<!-- 전역 컬럼 오버라이드 설정 -->
<globalColumnOverrides>
  <override column="created_by">SYSTEM</override>
  <override column="updated_by">SYSTEM</override>
  <override column="migration_date">${DATE.UTC:yyyy-MM-DD}</override>
  <override column="processed_at">${DATE.KST:yyyy-MM-DD HH:mm:ss}</override>
  <override column="data_version">2.1</override>
</globalColumnOverrides>

<!-- 모든 전역 컬럼 적용 - 실제 데이터에 존재하는 컬럼만 오버라이드됨 -->
<query id="migrate_users" applyGlobalColumns="all">
  <sourceQuery targetTable="users" ...>
    SELECT * FROM users WHERE status = 'ACTIVE'
  </sourceQuery>
  <!-- 
    users 테이블에 created_by, updated_by, migration_date만 존재하는 경우
    로그 출력: "전역 컬럼 오버라이드 적용 중: created_by, updated_by, migration_date"
    (processed_at, data_version은 적용되지 않음)
  -->
</query>

<!-- 특정 컬럼만 적용 - 지정된 컬럼 중 실제 존재하는 컬럼만 오버라이드됨 -->
<query id="migrate_products" applyGlobalColumns="created_by,updated_by">
  <sourceQuery targetTable="products" ...>
    SELECT * FROM products WHERE status = 'ACTIVE'
  </sourceQuery>
  <!-- 
    products 테이블에 created_by만 존재하는 경우
    로그 출력: "전역 컬럼 오버라이드 선택 적용: created_by"
    (updated_by는 테이블에 없으므로 적용되지 않음)
  -->
</query>

<!-- 전역 컬럼 적용 안함 -->
<query id="migrate_logs" applyGlobalColumns="none">
  <!-- 결과: 전역 컬럼 오버라이드 적용 안함 -->
</query>
```

**중요:** 
- 지정된 컬럼이 실제 소스 데이터에 존재하지 않으면 자동으로 무시됩니다.
- 로그에는 실제로 오버라이드가 적용된 컬럼명만 표시됩니다.
- 대소문자 구분 없이 컬럼명을 매칭합니다 (예: `Created_By`, `created_by`, `CREATED_BY` 모두 동일하게 인식).

#### 기본 문법

```xml
<globalColumnOverrides>
  <!-- 고정값 설정 -->
  <override column="migration_flag">1</override>
  
  <!-- 변수 사용 -->
  <override column="updated_by">${migrationUser}</override>
  
  <!-- 현재 시각 함수 사용 -->
  <override column="processed_at">${CURRENT_TIMESTAMP}</override>
  <override column="migration_date">${CURRENT_DATE}</override>
  <override column="migration_time">${CURRENT_TIME}</override>
  <override column="timestamp_unix">${UNIX_TIMESTAMP}</override>
</globalColumnOverrides>
```

#### JSON 매핑을 통한 값 변환

전역 컬럼 오버라이드에서 JSON 형식을 사용하여 원본 데이터 값을 다른 값으로 매핑할 수 있습니다.

**기본 문법:**
```xml
<override column="컬럼명">{"원본값1":"변환값1", "원본값2":"변환값2"}</override>
```

**동작 방식:**
- 원본 데이터의 컬럼 값이 JSON 키에 존재하면 → 해당 값으로 변환
- 원본 데이터의 컬럼 값이 JSON 키에 없으면 → **원본 값 유지** (변환하지 않음)
- 원본 데이터의 컬럼 값이 null/undefined/빈 문자열이면 → 원본 값 유지
- 공백이 포함된 값도 자동으로 trim하여 매칭

**사용 예시:**

```xml
<globalColumnOverrides>
  <!-- 상태 코드 변환 -->
  <override column="status">{"COMPLETED":"FINISHED", "PENDING":"WAITING", "PROCESSING":"GOING"}</override>
  
  <!-- 회사 코드 변환 -->
  <override column="company_code">{"COMPANY01":"APPLE", "COMPANY02":"AMAZON", "COMPANY03":"GOOGLE"}</override>
  
  <!-- 결제 수단 변환 -->
  <override column="payment_method">{"신용카드":"[신용카드]현대카드", "계좌이체":"[계좌이체]카카오뱅크"}</override>
  
  <!-- 이메일 주소 변환 -->
  <override column="email">{"old@company.com":"new@company.com", "admin@old.com":"admin@new.com"}</override>
</globalColumnOverrides>
```

**변환 예시:**

| 컬럼명 | 원본 값 | JSON 매핑 | 결과 값 | 설명 |
|--------|---------|-----------|---------|------|
| status | `COMPLETED` | `{"COMPLETED":"FINISHED"}` | `FINISHED` | ✅ 매핑 성공 |
| status | `PENDING` | `{"COMPLETED":"FINISHED"}` | `PENDING` | ⚠️ 매핑 없음, 원본 유지 |
| status | `ACTIVE ` | `{"ACTIVE":"ING"}` | `ING` | ✅ 공백 자동 trim |
| status | `null` | `{"COMPLETED":"FINISHED"}` | `null` | ⚠️ null은 변환 안함 |
| company_code | `COMPANY01` | `{"COMPANY01":"APPLE"}` | `APPLE` | ✅ 매핑 성공 |
| company_code | `COMPANY99` | `{"COMPANY01":"APPLE"}` | `COMPANY99` | ⚠️ 매핑 없음, 원본 유지 |

**중요 사항:**
- ✅ **원본 값 유지**: JSON에 매핑이 없는 값은 자동으로 원본 값을 유지합니다.
- ✅ **대소문자 구분**: JSON 키는 대소문자를 구분합니다.
- ✅ **공백 처리**: 원본 값의 앞뒤 공백은 자동으로 제거됩니다.
- ⚠️ **null 처리**: null, undefined, 빈 문자열은 변환하지 않고 원본 유지합니다.
- ⚠️ **첫 번째 값 사용 안함**: 매핑 실패 시 JSON의 첫 번째 값을 사용하지 않고 원본 값을 유지합니다.

**실제 사용 예시:**

```xml
<!-- 소스 데이터 -->
<!-- 
  orders 테이블:
  order_id | status      | payment_method | company_code
  1        | COMPLETED   | 신용카드        | COMPANY01
  2        | PENDING     | 계좌이체        | COMPANY02
  3        | SHIPPED     | 현금           | COMPANY99
-->

<globalColumnOverrides>
  <override column="status">{"COMPLETED":"FINISHED", "PENDING":"WAITING", "PROCESSING":"GOING"}</override>
  <override column="payment_method">{"신용카드":"[신용카드]현대카드", "계좌이체":"[계좌이체]카카오뱅크"}</override>
  <override column="company_code">{"COMPANY01":"APPLE", "COMPANY02":"AMAZON"}</override>
</globalColumnOverrides>

<!-- 결과 데이터 -->
<!--
  order_id | status    | payment_method        | company_code
  1        | FINISHED  | [신용카드]현대카드     | APPLE
  2        | WAITING   | [계좌이체]카카오뱅크   | AMAZON
  3        | SHIPPED   | 현금                  | COMPANY99
  
  설명:
  - order 1: status, payment_method, company_code 모두 변환됨
  - order 2: status, payment_method, company_code 모두 변환됨
  - order 3: status, payment_method, company_code 모두 원본 유지 (JSON에 매핑 없음)
-->
```

#### 활용 사례
- 마이그레이션 플래그 설정
- 환경별 값 변환 (DEV → PROD)
- 감사 정보 추가
- 상태 값 업데이트
- 현재 시각 정보 추가
- **코드 값 매핑** (상태 코드, 회사 코드 등)
- **레거시 데이터 정규화** (오래된 값을 새로운 표준으로 변환)
- **다국어 지원** (언어별 값 변환)

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

#### 전역 전처리/후처리 그룹
전체 이관 프로세스 전후에 실행됩니다. 여러 그룹으로 나누어 기능별로 관리할 수 있습니다.

```xml
<globalProcesses>
  <!-- 전처리 그룹들 -->
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
    
    <group id="logging" description="마이그레이션 로그 초기화" enabled="true">
      <![CDATA[
        -- 마이그레이션 시작 로그
        INSERT INTO migration_log (migration_date, status, description) 
        VALUES (GETDATE(), 'STARTED', 'Migration started');
      ]]>
    </group>
  </preProcessGroups>
  
  <!-- 후처리 그룹들 -->
  <postProcessGroups>
    <group id="performance_restore" description="성능 최적화 복원" enabled="true">
      <![CDATA[
        -- 인덱스 재구성
        ALTER INDEX ALL ON users REBUILD;
        ALTER INDEX ALL ON products REBUILD;
        
        -- 제약조건 활성화
        ALTER TABLE users WITH CHECK CHECK CONSTRAINT ALL;
        ALTER TABLE products WITH CHECK CHECK CONSTRAINT ALL;
      ]]>
    </group>
    
    <group id="completion" description="완료 로그" enabled="true">
      <![CDATA[
        -- 이관 완료 로그 기록
        INSERT INTO migration_log (migration_date, status, description) 
        VALUES (GETDATE(), 'COMPLETED', 'Data migration completed successfully');
      ]]>
    </group>
  </postProcessGroups>
</globalProcesses>
```

**그룹 속성:**
- `id`: 그룹의 고유 식별자
- `description`: 그룹 설명
- `enabled`: 그룹 활성화 여부 (true/false)

**실행 순서:**
1. 전역 전처리 그룹들 (정의된 순서대로)
2. 동적변수 추출
3. 개별 쿼리 마이그레이션
4. 전역 후처리 그룹들 (정의된 순서대로)

💡 **상세한 그룹 시스템 설명**: 이 문서의 "11. 전역 전/후처리 그룹" 섹션을 참조하세요.

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

실행 시점에 데이터베이스에서 값을 추출하여 변수로 사용합니다. **dbinfo.json에 정의된 모든 데이터베이스에서 동적변수를 추출할 수 있습니다.**

#### 🗄️ 데이터베이스 선택 기능

동적변수 추출 시 `database` 속성을 사용하여 특정 데이터베이스를 지정할 수 있습니다:

- **지정하지 않은 경우**: 기본값으로 `sourceDatabase` 사용
- **`sourceDB`**: 소스 데이터베이스에서 추출
- **`targetDB`**: 타겟 데이터베이스에서 추출  
- **`sampleDB`**: dbinfo.json에 정의된 샘플 데이터베이스에서 추출
- **기타 DB**: dbinfo.json에 정의된 모든 데이터베이스 사용 가능

```xml
<dynamicVariables>
  <!-- 단일 컬럼 추출 (소스 DB에서) -->
  <dynamicVar id="extract_active_users"
              variableName="activeUserIds" 
              extractType="single_column"
              columnName="user_id"
              database="sourceDB"
              enabled="true">
    <![CDATA[
      SELECT user_id FROM users WHERE status = 'ACTIVE'
    ]]>
  </dynamicVar>
  
  <!-- 키-값 쌍 추출 (타겟 DB에서) -->
  <dynamicVar id="extract_company_mapping"
              variableName="companyMapping"
              extractType="key_value_pairs"
              database="targetDB"
              enabled="true">
    <![CDATA[
      SELECT company_code, company_name FROM companies WHERE status = 'ACTIVE'
    ]]>
  </dynamicVar>
  
  <!-- 다중 컬럼 값 추출 (샘플 DB에서) -->
  <dynamicVar id="extract_all_entity_ids"
              variableName="allEntityIds"
              extractType="multiple_columns"
              columns="user_id,department_id,manager_id"
              database="sampleDB"
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
  
  <!-- 단일 값 추출 (타겟 DB에서) -->
  <dynamicVar id="extract_max_id"
              variableName="maxOrderId"
              extractType="single_value"
              database="targetDB"
              enabled="true">
    <![CDATA[
      SELECT MAX(order_id) FROM orders
    ]]>
  </dynamicVar>
</dynamicVariables>
```

#### 동적 변수 속성

| 속성명 | 필수 | 설명 | 기본값 |
|--------|------|------|--------|
| `id` | ✅ | 동적변수 고유 식별자 | - |
| `variableName` | ✅ | 변수명 (쿼리에서 `${변수명}` 형태로 사용) | - |
| `extractType` | ✅ | 데이터 추출 방식 | `column_identified` |
| `database` | ❌ | 데이터 추출할 데이터베이스 (dbinfo.json의 DB 키) | `sourceDatabase` |
| `enabled` | ❌ | 활성화 여부 | `true` |
| `columnName` | ❌ | `single_column` 타입에서 사용할 컬럼명 | 첫 번째 컬럼 |
| `columns` | ❌ | `multiple_columns`, `column_identified` 타입에서 사용할 컬럼 목록 | 모든 컬럼 |

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

<!-- 전역 컬럼 오버라이드 사용:
<globalColumnOverrides>
  <override column="migration_batch">${companyCode}_${startDate}</override>
</globalColumnOverrides>
-->
```

## 📝 예시

### 1. 기본 이관 예시

```xml
<query id="migrate_users"
       description="사용자 데이터 이관"
       targetTable="users"
       targetColumns="user_id,username,email,status,created_date"
       identityColumns="user_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT user_id, username, email, created_date
      FROM users 
      WHERE created_date >= '2024-01-01'
      ORDER BY user_id
    ]]>
  </sourceQuery>
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
  
  <!-- deleteWhere 기능 제거: deleteBeforeInsert=true시 identityColumns 기준으로 자동 삭제됨 -->
</query>
```

⚠️ **주의사항**: 
- 위 예시에서 `user_id`는 IDENTITY 타입이 **아닌** 비즈니스 키입니다
- 만약 `user_id`가 IDENTITY(자동증가) 컬럼이라면 `identityColumns`로 사용할 수 없습니다
- IDENTITY 컬럼이 있는 경우, 대신 `user_code`와 같은 비즈니스 키를 사용하세요

### 2. SELECT * 사용 예시

```xml
<query id="migrate_products"
       description="상품 전체 데이터 이관"
       targetTable="products"
       targetColumns=""
       identityColumns="product_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT * FROM products WHERE status = 'ACTIVE'
    ]]>
  </sourceQuery>
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
</query>
```

### 3. 현재 시각 함수 활용 예시

```xml
<query id="migrate_audit_log"
       description="감사 로그 데이터 이관 (현재 시각 추가)"
       targetTable="audit_log"
       identityColumns="audit_code"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT audit_code, user_id, action, description
      FROM audit_log
      WHERE created_date >= '2024-01-01'
    ]]>
  </sourceQuery>
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
</query>
```

⚠️ **주의**: 
- 위 예시에서 `log_id`를 `audit_code`로 변경했습니다
- 만약 `log_id`가 IDENTITY 타입이라면 `identityColumns`에 사용할 수 없기 때문입니다
- 감사 로그와 같은 테이블에서는 타임스탬프와 사용자 ID 조합 등을 고유 키로 사용하거나, 별도의 비즈니스 키를 추가하는 것을 권장합니다

## 📈 진행 상황 관리

v0.1부터 실시간 진행 상황 추적 및 모니터링 기능이 추가되었습니다.

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

#### 기본 사용법 (소스 DB에서 추출)

```xml
<!-- 활성 사용자 추출 (소스 DB에서) -->
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

#### 다중 데이터베이스 활용 예시

```xml
<!-- 1. 소스 DB에서 사용자 목록 추출 -->
<dynamicVar id="extract_source_users"
            variableName="sourceUserIds"
            extractType="single_column"
            columnName="user_id"
            database="sourceDB">
  <![CDATA[
    SELECT user_id FROM users WHERE status = 'ACTIVE'
  ]]>
</dynamicVar>

<!-- 2. 타겟 DB에서 부서 정보 추출 -->
<dynamicVar id="extract_target_departments"
            variableName="targetDeptIds"
            extractType="single_column"
            columnName="dept_id"
            database="targetDB">
  <![CDATA[
    SELECT dept_id FROM departments WHERE is_active = 1
  ]]>
</dynamicVar>

<!-- 3. 샘플 DB에서 회사 정보 추출 -->
<dynamicVar id="extract_company_info"
            variableName="companyCodes"
            extractType="key_value_pairs"
            database="sampleDB">
  <![CDATA[
    SELECT company_code, company_name FROM companies WHERE status = 'ACTIVE'
  ]]>
</dynamicVar>

<!-- 4. 여러 DB에서 추출한 변수들을 활용한 마이그레이션 -->
<query id="migrate_user_departments" ...>
  <sourceQuery>
    <![CDATA[
      SELECT 
        u.user_id,
        u.user_name,
        d.dept_name,
        c.company_name
      FROM users u
      LEFT JOIN departments d ON u.dept_id = d.dept_id
      LEFT JOIN companies c ON u.company_code = c.company_code
      WHERE u.user_id IN (${sourceUserIds})
        AND d.dept_id IN (${targetDeptIds})
        AND c.company_code IN (${companyCodes.company_code})
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

## 🔧 최근 개선사항 (v0.6 이후)

### 1. 동적 변수 데이터베이스 지정 기능

동적 변수에서 데이터를 추출할 데이터베이스를 명시적으로 지정할 수 있습니다.

#### 주요 개선사항
- **데이터베이스 선택**: `database` 속성으로 소스/타겟 DB 선택 가능
- **기본값 제공**: 속성 미지정 시 `sourceDB`를 기본값으로 사용
- **교차 DB 활용**: 소스에서 조건 추출 후 타겟에서 관련 데이터 조회 가능
- **dbinfo.json 모든 DB 지원**: dbinfo.json에 정의된 모든 데이터베이스에서 동적변수 추출 가능

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

### 2. SELECT * 패턴 개선

SQL 키워드를 테이블 별칭으로 잘못 인식하는 문제를 해결했습니다.

#### 개선된 기능
- **정확한 별칭 감지**: SQL 키워드(WHERE, GROUP, HAVING 등)를 별칭으로 오인하지 않음
- **안전한 패턴 매칭**: 더 정확한 정규식 패턴으로 테이블 별칭 추출
- **오류 방지**: 잘못된 컬럼명 생성으로 인한 SQL 오류 방지

#### 개선 전후 비교
**개선 전 (문제 상황):**
```sql
-- 원본 쿼리
SELECT * FROM products WHERE status = 'ACTIVE'

-- 잘못된 변환 결과
SELECT WHERE.product_name, WHERE.product_code, WHERE.category_id FROM products WHERE status = 'ACTIVE'
```

**개선 후 (정상 동작):**
```sql
-- 원본 쿼리
SELECT * FROM products WHERE status = 'ACTIVE'

-- 정상 변환 결과
SELECT product_name, product_code, category_id, price, cost FROM products WHERE status = 'ACTIVE'
```

### 3. DRY RUN 모드 강화

DRY RUN 모드에서 동적 변수를 실제로 추출하여 더 정확한 시뮬레이션을 제공합니다.

#### 개선된 기능
- **실제 동적 변수 추출**: DRY RUN에서도 동적 변수를 실제로 추출하여 저장
- **정확한 쿼리 시뮬레이션**: 추출된 동적 변수 값을 사용한 정확한 쿼리 검증
- **오류 사전 감지**: 동적 변수 관련 오류를 DRY RUN 단계에서 미리 발견

#### 사용 예시
```bash
# DRY RUN으로 동적 변수 포함 쿼리 검증
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml --dry-run
```

**출력 예시:**
```
🧪 DRY RUN 모드: 데이터 마이그레이션 시뮬레이션

🔍 동적 변수 추출 시뮬레이션: 3개
  • extract_active_users: 활성 사용자 ID 추출
    쿼리: SELECT user_id FROM users WHERE status = 'ACTIVE'
    데이터베이스: sourceDB
    추출된 값: [1001, 1002, 1003, 1005, 1008] (5개)
  
  • extract_company_mapping: 회사 코드 매핑
    쿼리: SELECT company_code, company_name FROM companies
    데이터베이스: targetDB
    추출된 값: {"COMP01": "Samsung", "COMP02": "LG"} (2개 쌍)

📊 쿼리 시뮬레이션 결과:
  ✅ migrate_users: 예상 처리 행 수 5개
  ✅ migrate_orders: 예상 처리 행 수 25개
  ✅ migrate_products: 예상 처리 행 수 150개
```

### 4. 오류 처리 및 안정성 개선

#### 주요 개선사항
- **안전한 변수 치환**: 동적 변수가 아직 추출되지 않은 상태에서도 안전하게 처리
- **Graceful Fallback**: 기능 실패 시 원본 데이터로 안전하게 복구
- **상세한 오류 메시지**: 문제 발생 시 더 명확한 오류 정보 제공

#### 디버깅 지원
```bash
# 동적 변수 처리 과정 상세 로그
DEBUG_VARIABLES=true node src/migrate-cli.js migrate queries.xml

# SELECT * 처리 과정 확인
DEBUG_SCRIPTS=true node src/migrate-cli.js migrate queries.xml
```

## 📝 예시

### 1. 기본 이관 예시

```xml
<query id="migrate_users"
       description="사용자 데이터 이관"
       targetTable="users"
       targetColumns="user_id,username,email,status,created_date"
       identityColumns="user_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT user_id, username, email, created_date
      FROM users 
      WHERE created_date >= '2024-01-01'
      ORDER BY user_id
    ]]>
  </sourceQuery>
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
  
  <!-- deleteWhere 기능 제거: deleteBeforeInsert=true시 identityColumns 기준으로 자동 삭제됨 -->
</query>
```

⚠️ **주의사항**: 
- 위 예시에서 `user_id`는 IDENTITY 타입이 **아닌** 비즈니스 키입니다
- 만약 `user_id`가 IDENTITY(자동증가) 컬럼이라면 `identityColumns`로 사용할 수 없습니다
- IDENTITY 컬럼이 있는 경우, 대신 `user_code`와 같은 비즈니스 키를 사용하세요

### 2. SELECT * 사용 예시

```xml
<query id="migrate_products"
       description="상품 전체 데이터 이관"
       targetTable="products"
       targetColumns=""
       identityColumns="product_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT * FROM products WHERE status = 'ACTIVE'
    ]]>
  </sourceQuery>
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
</query>
```

### 3. 현재 시각 함수 활용 예시

```xml
<query id="migrate_audit_log"
       description="감사 로그 데이터 이관 (현재 시각 추가)"
       targetTable="audit_log"
                  identityColumns="log_id"
       enabled="true">
  <sourceQuery>
    <![CDATA[
      SELECT log_id, user_id, action, description
      FROM audit_log
      WHERE created_date >= '2024-01-01'
    ]]>
  </sourceQuery>
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
</query>
```

## 📈 진행 상황 관리

v0.1부터 실시간 진행 상황 추적 및 모니터링 기능이 추가되었습니다.

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

#### 동적변수 데이터베이스 오류
```
❌ 알 수 없는 데이터베이스: unknownDB. 사용 가능한 DB: sampleDB, targetDB, sourceDB
```
**해결방법**: 
1. `config/dbinfo.json`에 해당 DB가 정의되어 있는지 확인
2. 동적변수의 `database` 속성에 올바른 DB 키를 지정
3. 사용 가능한 DB 목록 확인: `node src/migrate-cli.js list-dbs`

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

v0.1부터 네트워크 오류나 시스템 장애로 인해 중단된 마이그레이션을 중단된 지점에서 재시작할 수 있습니다.

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

### 10. 전/후처리에서 동적변수 사용

전/후처리 스크립트에서도 동적변수를 사용할 수 있습니다. 동적변수는 마이그레이션 시작 시 추출되어 전체 과정에서 사용 가능합니다.

#### 사용 가능한 동적변수 타입

1. **single_column**: 단일 컬럼 값들을 배열로 사용
2. **key_value_pairs**: 키-값 쌍을 매핑으로 사용  
3. **column_identified**: 컬럼별로 식별된 값들 사용
4. **multiple_columns**: 여러 컬럼 값들을 통합 배열로 사용

#### 전처리에서 동적변수 사용 예시

```xml
<preProcess description="동적변수 활용 전처리">
  <![CDATA[
    -- 활성 사용자만 백업 (single_column 동적변수)
    INSERT INTO user_backup 
    SELECT * FROM users 
    WHERE user_id IN (${activeUserIds})
      AND created_date >= '${startDate}';
    
    -- 회사별 통계 생성 (key_value_pairs 동적변수)
    INSERT INTO company_stats (company_code, company_name)
    SELECT company_code, 
           CASE company_code 
             WHEN 'COMP01' THEN ${companyMapping.COMP01}
             WHEN 'COMP02' THEN ${companyMapping.COMP02}
             ELSE 'Unknown'
           END,
           COUNT(*)
    FROM users 
    WHERE company_code IN (${companyMapping})
    GROUP BY company_code;
  ]]>
</preProcess>
```

#### 후처리에서 동적변수 사용 예시

```xml
<postProcess description="동적변수 활용 후처리">
  <![CDATA[
    -- 활성 사용자 통계 업데이트
    UPDATE user_statistics 
    SET migration_count = (
      SELECT COUNT(*) FROM users 
      WHERE user_id IN (${activeUserIds})
        AND migration_date = '${migrationTimestamp}'
    )
    WHERE stat_type = 'ACTIVE_USERS';
    
    -- 부서별 완료 알림 (multiple_columns 동적변수)
    INSERT INTO notification_queue (target_id, message_type, message)
    SELECT DISTINCT department_id, 
           'MIGRATION_COMPLETE',
           'Department migration completed for ' + CAST(COUNT(*) AS VARCHAR) + ' users'
    FROM users 
    WHERE user_id IN (${allEntityIds})
    GROUP BY department_id;
  ]]>
</postProcess>
```

### 11. 전역 전/후처리 그룹

전역 전처리와 후처리를 여러 그룹으로 나누어 기능별로 관리할 수 있습니다.

#### 그룹 정의

```xml
<globalProcesses>
  <!-- 전처리 그룹들 -->
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
    
    <group id="logging" description="마이그레이션 로그 초기화" enabled="true">
      <![CDATA[
        -- 마이그레이션 시작 로그
        INSERT INTO migration_log (migration_date, status, description, user_name) 
        VALUES (GETDATE(), 'STARTED', 'Migration started', '${migrationUser}');
      ]]>
    </group>
    
    <group id="validation" description="데이터 검증" enabled="true">
      <![CDATA[
        -- 소스 데이터 기본 검증
        IF EXISTS (SELECT 1 FROM users_source WHERE username IS NULL OR email IS NULL)
        BEGIN
          INSERT INTO validation_errors (error_type, message, created_date)
          VALUES ('NULL_REQUIRED_FIELDS', 'Required fields contain NULL values', GETDATE());
        END
        
        -- 중복 데이터 체크
        IF EXISTS (SELECT user_id, COUNT(*) FROM users_source GROUP BY user_id HAVING COUNT(*) > 1)
        BEGIN
          RAISERROR('중복된 사용자 ID가 발견되었습니다. 마이그레이션을 중단합니다.', 16, 1);
        END
      ]]>
    </group>
  </preProcessGroups>
  
  <!-- 후처리 그룹들 -->
  <postProcessGroups>
    <group id="performance_restore" description="성능 최적화 복원" enabled="true">
      <![CDATA[
        -- 인덱스 재구성
        ALTER INDEX ALL ON users REBUILD;
        ALTER INDEX ALL ON products REBUILD;
        
        -- 제약조건 활성화
        ALTER TABLE users WITH CHECK CHECK CONSTRAINT ALL;
        ALTER TABLE products WITH CHECK CHECK CONSTRAINT ALL;
      ]]>
    </group>
    
    <group id="verification" description="데이터 검증" enabled="true">
      <![CDATA[
        -- 이관 후 데이터 개수 검증
        DECLARE @source_count INT, @target_count INT;
        SELECT @source_count = COUNT(*) FROM users_source;
        SELECT @target_count = COUNT(*) FROM users WHERE migration_date = '${migrationTimestamp}';
        
        IF @source_count != @target_count
        BEGIN
          INSERT INTO validation_errors (error_type, message, source_count, target_count, created_date)
          VALUES ('COUNT_MISMATCH', 'Source and target counts do not match', @source_count, @target_count, GETDATE());
        END
      ]]>
    </group>
    
    <group id="completion" description="완료 로그" enabled="true">
      <![CDATA[
        -- 이관 완료 로그 기록
        INSERT INTO migration_log (migration_date, status, description, total_rows) 
        VALUES (GETDATE(), 'COMPLETED', 'Data migration completed successfully', 
                (SELECT COUNT(*) FROM users WHERE migration_date = '${migrationTimestamp}'));
      ]]>
    </group>
  </postProcessGroups>
</globalProcesses>
```

#### 그룹 속성

- **id**: 그룹의 고유 식별자
- **description**: 그룹 설명
- **enabled**: 그룹 활성화 여부 (true/false)

#### 실행 순서

1. **전역 전처리 그룹들** (정의된 순서대로)
2. 동적변수 추출
3. 개별 쿼리 마이그레이션
4. **전역 후처리 그룹들** (정의된 순서대로)

#### 동적변수 사용

그룹 스크립트에서도 모든 동적변수를 사용할 수 있습니다:

```xml
<group id="audit_logging" description="감사 로그" enabled="true">
  <![CDATA[
    -- 활성 사용자 로그 (동적변수 사용)
    INSERT INTO migration_user_tracking (user_id, tracking_type)
    SELECT user_id, 'ACTIVE_USER'
    FROM users_source 
    WHERE user_id IN (${activeUserIds});
    
    -- 회사별 통계 (key_value_pairs 동적변수)
    INSERT INTO company_stats (company_code, company_name)
    SELECT 'COMP01', '${companyMapping.COMP01}'
    UNION ALL
    SELECT 'COMP02', '${companyMapping.COMP02}';
  ]]>
</group>
```

#### 오류 처리

- **전처리 그룹 오류**: 마이그레이션 전체 중단
- **후처리 그룹 오류**: 경고 로그 후 다음 그룹 계속 진행

### 12. 처리 단계별 컬럼 오버라이드 제어

각 처리 단계(preProcess, sourceQuery, postProcess)에서 개별적으로 어떤 전역 컬럼 오버라이드를 적용할지 선택할 수 있습니다.

#### 단계별 applyGlobalColumns 설정

```xml
<query id="migrate_users" targetTable="users" ...>
  <!-- 전처리에서는 created_by, updated_by만 적용 -->
  <preProcess description="사용자 백업" applyGlobalColumns="created_by,updated_by">
    <![CDATA[
      INSERT INTO user_backup SELECT * FROM users WHERE id > 100;
    ]]>
  </preProcess>
  
  <!-- 소스쿼리에서는 모든 전역 컬럼 적용 -->
  <sourceQuery applyGlobalColumns="created_by,updated_by,migration_date,processed_at">
    <![CDATA[
      SELECT user_id, username, email, status 
      FROM users_source 
      WHERE created_date >= '${startDate}'
    ]]>
  </sourceQuery>
  
  <!-- 후처리에서는 migration_date만 적용 -->
  <postProcess description="마이그레이션 로그" applyGlobalColumns="migration_date">
    <![CDATA[
      INSERT INTO migration_log (table_name, count) 
      VALUES ('users', (SELECT COUNT(*) FROM users WHERE migration_date = '${migrationTimestamp}'));
    ]]>
  </postProcess>
</query>
```

#### 선택 가능한 값

각 단계에서 다음 값들을 사용할 수 있습니다:

- **`all`**: 모든 globalColumnOverrides 적용 (기본값)
- **`none`**: globalColumnOverrides 적용하지 않음
- **`컬럼명`**: 단일 컬럼만 적용
- **`컬럼1,컬럼2,...`**: 쉼표로 구분된 여러 컬럼 적용

#### 실제 사용 예시

```xml
<globalColumnOverrides>
  <override column="created_by">${migrationUser}</override>
  <override column="updated_by">${migrationUser}</override>
  <override column="migration_date">${migrationTimestamp}</override>
  <override column="processed_at">GETDATE()</override>
  <override column="data_version">2.1</override>
</globalColumnOverrides>

<query id="step_by_step_example" targetTable="users" ...>
  <!-- 백업용 - 생성자 정보만 -->
  <preProcess description="기존 데이터 백업" applyGlobalColumns="created_by">
    <![CDATA[
      INSERT INTO users_backup 
      SELECT * FROM users WHERE status = 'ACTIVE';
    ]]>
  </preProcess>
  
  <!-- 실제 이관 - 모든 컬럼 -->
  <sourceQuery applyGlobalColumns="created_by,updated_by,migration_date,processed_at">
    <![CDATA[
      SELECT user_id, username, email, status 
      FROM users_source 
      WHERE created_date >= '${startDate}'
    ]]>
  </sourceQuery>
  
  <!-- 검증용 로그 - 날짜만 -->
  <postProcess description="검증 및 로그" applyGlobalColumns="migration_date">
    <![CDATA[
      INSERT INTO validation_log (table_name, migrated_count, check_date)
      SELECT 'users', COUNT(*), GETDATE()
      FROM users 
      WHERE migration_date = '${migrationTimestamp}';
    ]]>
  </postProcess>
</query>
```

#### 장점

1. **세밀한 제어**: 각 단계의 목적에 맞게 필요한 컬럼만 적용
2. **성능 최적화**: 불필요한 컬럼 처리 생략
3. **명확한 의도**: 각 단계별로 어떤 컬럼이 필요한지 명시적 표현

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
  
  <!-- 전역 컬럼 오버라이드가 자동으로 적용됨 -->
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
