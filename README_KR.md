# MSSQL 데이터 이관 도구

대화형 인터페이스와 독립 실행 파일을 지원하는 MSSQL 데이터베이스 간 데이터 이관을 위한 Node.js 기반 솔루션입니다.

## 주요 기능

- ✅ **대화형 인터페이스**: 쉬운 조작을 위한 사용자 친화적 메뉴 시스템
- ✅ **독립 실행 파일**: Node.js 설치 없이 실행 가능
- ✅ **다국어 지원**: 영어 및 한글 인터페이스
- ✅ **진행 상황 모니터링**: 상세 이력이 포함된 실시간 이관 진행 상황 추적
- ✅ **MSSQL 간 데이터 이관**: 고성능 배치 처리
- ✅ **XML 설정 지원**: 유연한 XML 기반 설정
- ✅ **컬럼 오버라이드**: 이관 시 컬럼값 변경/추가
- ✅ **전처리/후처리**: 이관 전후 SQL 스크립트 실행
- ✅ **동적 변수**: 실행 시점 데이터 추출 및 활용
- ✅ **트랜잭션 지원**: 데이터 일관성 보장
- ✅ **상세 로깅**: 5단계 로그 레벨 시스템
- ✅ **DRY RUN 모드**: 실제 변경 없이 시뮬레이션
- ✅ **SELECT * 자동 처리**: IDENTITY 컬럼 자동 제외

## 빠른 시작

### 옵션 1: 독립 실행 파일 사용 (권장)

1. **배포 패키지 다운로드**
   - `sql2db-v0.8.1-bin.zip` 다운로드
   - 원하는 위치에 압축 해제

2. **데이터베이스 연결 설정**
   - `config/dbinfo.json` 파일을 데이터베이스 설정으로 편집
   - `queries/` 폴더에 쿼리문정의 파일 추가

3. **실행**
   ```bash
   # 영문 버전
   run.bat
   
   # 한글 버전
   실행하기.bat
   
   # 또는 직접 실행
   sql2db.exe --lang=en
   sql2db.exe --lang=kr
   ```

### 옵션 2: Node.js 사용

### 1. 설치
```bash
npm install
```

### 2. 데이터베이스 연결 설정
`config/dbinfo.json` 파일 생성:
```json
{
  "dbs": {
    "sourceDB": {
      "server": "source-server.com",
      "database": "source_db",
      "user": "username",
      "password": "password",
      "isWritable": false
    },
    "targetDB": {
      "server": "target-server.com",
      "database": "target_db", 
      "user": "username",
      "password": "password",
      "isWritable": true
    }
  }
}
```

### 3. 기본 실행

#### 대화형 인터페이스 (권장)
```bash
# 영문 버전
npm start
# 또는
run.bat

# 한글 버전
npm run start:kr
# 또는
실행하기.bat
```

#### 커맨드라인 인터페이스
```bash
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

## 대화형 메뉴 기능

```
=========================================
  MSSQL 데이터 이관 도구
  버전 0.8.1
=========================================

1. 쿼리문정의 파일 Syntax검증
2. DB연결 테스트 (연결 가능 여부 포함)
3. 데이터 이관 실행
4. 이관 진행 상황 조회
5. 도움말 보기
0. 종료

선택하세요 (0-5):
```

### 메뉴 옵션

1. **쿼리문정의 파일 Syntax검증**: XML 구문 및 속성명 검사
2. **DB연결 테스트**: 데이터베이스 연결 확인
3. **데이터 이관 실행**: 선택한 쿼리 파일로 데이터 이관 실행
4. **이관 진행 상황 조회**: 이관 이력 및 상세 상태 보기
   - 기본적으로 최근 3개 이관 작업 표시
   - 'A' 입력하여 모든 이관 작업 보기
   - 번호 입력하여 상세 진행 정보 조회
5. **도움말 보기**: 사용 정보 표시

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm start` 또는 `run.bat` | 대화형 메뉴 (영문) |
| `npm run start:kr` 또는 `실행하기.bat` | 대화형 메뉴 (한글) |
| `node src/migrate-cli.js validate` | 설정 검증 |
| `node src/migrate-cli.js test` | 연결 테스트 |
| `node src/migrate-cli.js migrate --dry-run` | 시뮬레이션 실행 |
| `node src/migrate-cli.js list-dbs` | DB 목록 조회 |
| `npm run build` | 독립 실행 파일 빌드 |
| `npm run release` | 배포 패키지 생성 |

## 설정 파일 형식

### XML 형식
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <settings>
    <sourceDatabase>sourceDB</sourceDatabase>
    <targetDatabase>targetDB</targetDatabase>
    <batchSize>1000</batchSize>
  </settings>
  
  <queries>
    <query id="migrate_users" targetTable="users" enabled="true">
      <sourceQuery>
        <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
      </sourceQuery>
      
      <columnOverrides>
        <override column="migration_flag">1</override>
        <override column="updated_by">MIGRATION_TOOL</override>
        <override column="processed_at">${CURRENT_TIMESTAMP}</override>
        <override column="migration_date">${CURRENT_DATE}</override>
      </columnOverrides>
    </query>
  </queries>
</migration>
```

## 문서

- 📖 **[사용자 매뉴얼](USER_MANUAL.md)**: 완전한 사용 가이드
- 📋 **[설치 가이드](INSTALLATION_GUIDE.md)**: 상세 설치 방법
- 🔄 **[변경 이력](CHANGELOG.md)**: 버전별 변경사항
- 🏗️ **[구현 요약](IMPLEMENTATION_SUMMARY.md)**: 기술적 구현 내용

## 데이터베이스 스크립트

프로젝트에는 다양한 데이터베이스 스크립트가 포함되어 있습니다:

- 📊 **[create-sample-tables.sql](resources/create-sample-tables.sql)**: 테스트용 샘플 테이블들 생성
- 📝 **[create-example-table.sql](resources/create-example-table.sql)**: 다양한 데이터 타입을 포함한 예시 테이블 생성
- 📋 **[insert-sample-data.sql](resources/insert-sample-data.sql)**: 샘플 데이터 삽입

### Example Table 사용법

마이그레이션 테스트를 위한 다양한 데이터 타입과 제약조건을 포함한 예시 테이블을 생성하려면:

```sql
-- SQL Server Management Studio에서 실행
-- 또는 명령줄에서 실행
sqlcmd -S your-server -d your-database -i resources/create-example-table.sql
```

이 테이블은 다음 특징을 포함합니다:
- 다양한 데이터 타입 (문자열, 숫자, 날짜, 불린, JSON, 바이너리)
- 계산된 컬럼 (full_name, age_group)
- 체크 제약조건 (나이, 급여, 이메일 형식 등)
- 성능 최적화 인덱스
- 유용한 뷰와 저장 프로시저
- 한국어 샘플 데이터 포함

## 📈 진행 상황 관리

v0.1부터 실시간 진행 상황 추적 및 모니터링 기능이 추가되었습니다:

```bash
# 진행 상황 목록 조회
node src/progress-cli.js list

# 특정 마이그레이션 상세 조회
node src/progress-cli.js show migration-2024-12-01-15-30-00

# 실시간 모니터링
node src/progress-cli.js monitor migration-2024-12-01-15-30-00

# 재시작 정보 조회
node src/progress-cli.js resume migration-2024-12-01-15-30-00

# 중단된 마이그레이션 재시작
node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml

# 전체 요약
node src/progress-cli.js summary

# 오래된 파일 정리
node src/progress-cli.js cleanup 7
```

### 주요 기능
- ⚡ **실시간 추적**: 마이그레이션 진행 상황 실시간 모니터링
- 📊 **성능 메트릭**: 처리 속도, 예상 완료 시간 제공
- 🔍 **상세 분석**: 페이즈별, 쿼리별, 배치별 상세 정보
- 🔄 **중단 재시작**: 네트워크 오류 등으로 중단된 마이그레이션을 완료된 지점에서 재시작
- 💾 **영구 저장**: 진행 상황 파일로 이력 관리
- 🛠️ **CLI 도구**: 다양한 조회 및 관리 명령어

## SELECT * 자동 처리

`SELECT *`를 사용할 때 IDENTITY 컬럼을 자동으로 제외하는 기능이 추가되었습니다:

### 기능 설명
- **자동 감지**: `SELECT * FROM table_name` 패턴을 자동으로 감지
- **IDENTITY 컬럼 제외**: 대상 테이블의 IDENTITY 컬럼을 자동으로 식별하고 제외
- **컬럼 목록 자동 생성**: `targetColumns`를 자동으로 설정
- **소스 쿼리 변환**: `SELECT *`를 명시적 컬럼 목록으로 변환

### 사용 예시
```xml
<query id="migrate_users" targetTable="users" enabled="true">
  <sourceQuery>
    <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
  </sourceQuery>
  <!-- targetColumns는 자동으로 설정됩니다 (IDENTITY 컬럼 제외) -->
</query>
```

### 처리 과정
1. `SELECT *` 패턴 감지
2. 대상 테이블의 모든 컬럼 조회
3. IDENTITY 컬럼 식별 및 제외
4. `targetColumns` 자동 설정
5. 소스 쿼리를 명시적 컬럼 목록으로 변환

### 로그 예시
```
SELECT * 감지됨. 테이블 users의 컬럼 정보를 자동으로 가져옵니다.
IDENTITY 컬럼 자동 제외: id
자동 설정된 컬럼 목록 (15개, IDENTITY 제외): name, email, status, created_date, ...
변경된 소스 쿼리: SELECT name, email, status, created_date, ... FROM users WHERE status = 'ACTIVE'
```

## 테스트

프로젝트에는 다양한 기능을 테스트할 수 있는 배치 파일들이 포함되어 있습니다:

```bash
test-xml-migration.bat      # XML 설정 테스트
test-dry-run.bat           # DRY RUN 모드 테스트
test-dbid-migration.bat    # DB ID 참조 테스트
test-log-levels.bat        # 로그 레벨 테스트
test-select-star-identity.bat  # SELECT * IDENTITY 제외 테스트
```

## 독립 실행 파일 빌드

### 사전 준비
```bash
npm install
```

### 빌드
```bash
npm run build
```

이 명령은 `dist/` 디렉토리에 독립 실행 파일을 생성합니다:
- `dist/sql2db.exe` (Windows 64비트)

### 빌드 설정
빌드 프로세스는 `pkg`를 사용하여 Node.js 애플리케이션을 번들링합니다:
- **타겟**: Windows x64 (Node.js 18)
- **압축**: GZip
- **포함된 에셋**:
  - 모든 소스 파일 (`src/**/*.js`)
  - 설정 파일 (`config/**/*.json`)
  - 쿼리 정의 파일 (`queries/**/*.xml`, `queries/**/*.json`, `queries/**/*.sql`)
  - 예제 파일 (`examples/**/*.xml`)
  - 리소스 파일 (`resources/**/*.sql`)
  - 문서 파일 (README, USER_MANUAL, CHANGELOG)

### 실행 파일 실행
```bash
# 실행 파일 직접 실행
dist\sql2db.exe

# 또는 언어 옵션과 함께 실행
dist\sql2db.exe --lang=kr
```

독립 실행 파일은 Node.js 설치 없이 애플리케이션을 실행하는 데 필요한 모든 것을 포함합니다.

## 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 지원

- 💬 **이슈 리포트**: [GitHub Issues](https://github.com/mrjung72/sql2db-nodejs/issues)
- 📚 **문서**: 프로젝트 루트의 문서들 참조
- 🔧 **버그 수정**: Pull Request로 기여

## 라이선스

MIT License

Copyright (c) 2024 MSSQL 데이터 이관 도구

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

- Contact to sql2db.nodejs@gmail.com
- Site sql2db.com
