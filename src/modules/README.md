# MSSQL Data Migrator - 모듈화된 구조

기존의 거대한 단일 클래스였던 `mssql-data-migrator.js`를 기능별로 모듈화하여 유지보수성과 확장성을 개선했습니다.

## 📁 모듈 구조

```
modules/
├── database-config-manager.js    # 데이터베이스 설정 관리
├── config-parser.js              # 설정 파일 파싱 (XML/JSON)
├── variable-manager.js           # 변수 관리 (정적/동적 변수)
├── query-executor.js             # 쿼리 실행 및 데이터 마이그레이션
├── script-processor.js           # 전처리/후처리 스크립트 실행
└── index.js                      # 모듈 인덱스
```

## 🔧 주요 모듈 설명

### 1. DatabaseConfigManager
- **역할**: 데이터베이스 설정 정보 관리
- **주요 기능**:
  - `dbinfo.json` 파일 로드
  - DB ID로 연결 정보 조회
  - 사용 가능한 DB 목록 제공
  - 쓰기 권한 확인

```javascript
const dbManager = new DatabaseConfigManager();
await dbManager.loadDbInfo();
const config = dbManager.getDbConfigById('sourceDb');
const availableDbs = dbManager.getAvailableDbs();
```

### 2. ConfigParser
- **역할**: XML/JSON 형태의 쿼리 정의 파일 파싱
- **주요 기능**:
  - XML/JSON 자동 감지 및 파싱
  - 전역 변수 파싱
  - 동적 변수 파싱
  - 전처리/후처리 그룹 파싱
  - 컬럼 오버라이드 파싱

```javascript
const parser = new ConfigParser();
const config = await parser.loadConfig('migration.xml');
```

### 3. VariableManager
- **역할**: 정적 변수와 동적 변수 관리
- **주요 기능**:
  - 정적 변수 설정/조회
  - 동적 변수 로드 (DB 쿼리 결과)
  - 문자열 변수 치환 (`${변수명}` 형태)
  - 변수 의존성 검증
  - 변수 통계 정보 제공

```javascript
const varManager = new VariableManager();
varManager.setVariables({ startDate: '2024-01-01' });
await varManager.loadDynamicVariables();
const result = varManager.replaceVariables('SELECT * FROM table WHERE date >= ${startDate}');
```

### 4. QueryExecutor
- **역할**: 실제 데이터 마이그레이션 쿼리 실행
- **주요 기능**:
  - 소스 데이터 조회
  - 타겟 테이블에 데이터 삽입
  - 배치 처리 지원
  - 트랜잭션 관리
  - DRY RUN 모드 지원
  - 테이블 truncate 처리

```javascript
const executor = new QueryExecutor(connectionManager, variableManager);
executor.setDryRun(true);
const result = await executor.executeQuery(queryConfig, progressManager);
```

### 5. ScriptProcessor
- **역할**: 전처리/후처리 스크립트 실행
- **주요 기능**:
  - 전역 전처리/후처리 그룹 실행
  - 쿼리별 전처리/후처리 그룹 실행
  - SQL 스크립트 파싱 및 실행
  - 트랜잭션 관리
  - 임시 테이블 사용 감지

```javascript
const processor = new ScriptProcessor(connectionManager, variableManager);
const result = await processor.executeGlobalPreProcessGroups(preGroups, targetDb);
```

## 🚀 사용법

### 전체 마이그레이션 실행 (권장)

```javascript
const MSSQLDataMigrator = require('./mssql-data-migrator-refactored');

const migrator = new MSSQLDataMigrator('migration.xml', false);
await migrator.initialize();
const result = await migrator.execute();
await migrator.cleanup();
```

### 개별 모듈 사용

```javascript
const {
    DatabaseConfigManager,
    ConfigParser,
    VariableManager,
    QueryExecutor,
    ScriptProcessor
} = require('./modules');

// 각 모듈을 독립적으로 사용
const dbManager = new DatabaseConfigManager();
const parser = new ConfigParser();
// ...
```

## 🎯 모듈화의 장점

### 1. **단일 책임 원칙 (SRP)**
- 각 모듈이 하나의 명확한 책임을 가짐
- 코드 이해도 향상
- 버그 발생 시 원인 파악 용이

### 2. **유지보수성 향상**
- 특정 기능 수정 시 해당 모듈만 수정
- 코드 재사용성 증대
- 테스트 작성 용이

### 3. **확장성 개선**
- 새로운 기능 추가 시 새 모듈로 분리 가능
- 기존 코드에 미치는 영향 최소화
- 플러그인 방식의 확장 가능

### 4. **테스트 용이성**
- 각 모듈별 단위 테스트 작성 가능
- 모킹(Mocking) 용이
- 통합 테스트 시나리오 구성 용이

## 🔄 마이그레이션 가이드

### 기존 코드에서 새 모듈화 코드로 전환

#### Before (기존 코드)
```javascript
const MSSQLDataMigrator = require('./mssql-data-migrator');
const migrator = new MSSQLDataMigrator('config.xml');
```

#### After (모듈화된 코드)
```javascript
const MSSQLDataMigrator = require('./mssql-data-migrator-refactored');
const migrator = new MSSQLDataMigrator('config.xml');
await migrator.initialize(); // 추가된 초기화 단계
```

### 주요 변경사항

1. **초기화 단계 추가**: `initialize()` 메서드 호출 필요
2. **모듈별 설정**: 각 모듈의 설정을 개별적으로 조정 가능
3. **에러 처리**: 더 세분화된 에러 정보 제공
4. **진행 상황**: 더 상세한 진행 상황 모니터링 가능

## 📝 예제

자세한 사용 예제는 `examples/modular-usage-example.js` 파일을 참조하세요.

## 🧪 테스트

각 모듈별 테스트 파일을 작성하여 개별 기능을 검증할 수 있습니다:

```
tests/
├── database-config-manager.test.js
├── config-parser.test.js
├── variable-manager.test.js
├── query-executor.test.js
└── script-processor.test.js
```

## 🔧 설정

환경 변수를 통해 각 모듈의 동작을 제어할 수 있습니다:

```bash
ENABLE_LOGGING=true          # 로깅 활성화
ENABLE_TRANSACTION=true      # 트랜잭션 사용
```

## 🚨 주의사항

1. **하위 호환성**: 기존 설정 파일과 완전 호환
2. **성능**: 모듈화로 인한 성능 저하는 미미함
3. **메모리**: 각 모듈이 독립적으로 메모리 관리
4. **의존성**: 모듈 간 순환 의존성 없음

## 🤝 기여

새로운 모듈 추가나 기존 모듈 개선 시 다음 가이드라인을 따라주세요:

1. 단일 책임 원칙 준수
2. 명확한 인터페이스 정의
3. 적절한 에러 처리
4. 로깅 추가
5. 문서화

---

**모듈화된 MSSQL Data Migrator**로 더욱 안정적이고 확장 가능한 데이터 마이그레이션을 경험하세요! 🚀
