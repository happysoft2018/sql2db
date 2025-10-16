# SQL2DB 모듈 아키텍처

## 📋 개요

SQL2DB의 핵심 기능을 역할별로 분리한 모듈화 아키텍처입니다. 각 모듈은 단일 책임 원칙(Single Responsibility Principle)에 따라 설계되었습니다.

## 🏗️ 모듈 구조

```
src/
├── modules/
│   ├── config-manager.js        # 설정 파일 로드 및 파싱
│   ├── variable-manager.js      # 변수 치환 및 동적 변수 처리
│   ├── query-processor.js       # 쿼리 처리 및 변환
│   ├── script-processor.js      # 전/후처리 스크립트 실행
│   └── index.js                 # 모듈 통합 export
│
├── mssql-data-migrator-modular.js  # 모듈화된 메인 클래스 (권장)
├── mssql-data-migrator.js          # 레거시 모놀리식 클래스
├── mssql-connection-manager.js     # DB 연결 관리
├── progress-manager.js             # 진행 상황 관리
├── logger.js                       # 로깅 유틸리티
└── migrate-cli.js                  # CLI 인터페이스
```

## 📦 모듈 상세

### 1. ConfigManager (config-manager.js)

**책임**: 설정 파일 로드 및 파싱

**주요 기능**:
- `loadDbInfo()` - DB 정보 파일 로드
- `getDbConfigById(dbId)` - DB ID로 연결 정보 조회
- `loadConfig(queryFilePath)` - 쿼리 설정 파일 로드
- `parseXmlConfig(xmlData)` - XML 설정 파싱
- `parseSettings(settingsXml)` - 설정 섹션 파싱
- `parseVariables(varsXml)` - 변수 섹션 파싱
- `parseGlobalColumnOverrides(overridesXml)` - 전역 컬럼 오버라이드 파싱
- `parseGlobalProcesses(processesXml)` - 전역 전/후처리 그룹 파싱
- `parseDynamicVariables(dynamicVarsXml)` - 동적 변수 파싱
- `parseQueries(queriesXml, settings)` - 쿼리 섹션 파싱

**의존성**: logger

### 2. VariableManager (variable-manager.js)

**책임**: 변수 치환 및 동적 변수 처리

**주요 기능**:
- `setVariables(variables)` - 일반 변수 설정
- `setDynamicVariable(key, value)` - 동적 변수 설정
- `extractDataToVariable(extractConfig)` - 동적 변수 추출
- `extractByType(data, extractConfig)` - 타입별 데이터 추출
- `replaceVariables(text)` - 변수 치환
- `replaceDynamicVariables(text)` - 동적 변수 치환
- `replaceStaticVariables(text)` - 일반 변수 치환
- `replaceTimestampFunctions(text)` - 타임스탬프 함수 치환
- `replaceEnvironmentVariables(text)` - 환경 변수 치환
- `resolveJsonValue(value, context)` - JSON 값 해석
- `applyGlobalColumnOverrides(sourceData, globalColumnOverrides)` - 전역 컬럼 오버라이드 적용
- `getAllVariables()` - 모든 변수 정보 조회

**의존성**: connectionManager, logger

### 3. QueryProcessor (query-processor.js)

**책임**: 쿼리 처리 및 변환

**주요 기능**:
- `clearTableColumnCache()` - 테이블 컬럼 캐시 초기화
- `getTableColumns(tableName, database)` - 테이블 컬럼 목록 조회
- `getIdentityColumns(tableName, database)` - IDENTITY 컬럼 조회
- `loadQueryFromFile(filePath, queryFilePath)` - 외부 SQL 파일 로드
- `removeComments(script)` - SQL 주석 제거
- `processQueryConfig(queryConfig, queryFilePath)` - 쿼리 설정 처리 (SELECT * 자동 변환)
- `validateSingleSqlStatement(sourceQuery)` - 단일 SQL 문 검증
- `estimateQueryRowCount(queryConfig, queryFilePath)` - 행 수 추정
- `processInsertSelectColumnAlignment(script, database)` - INSERT SELECT 컬럼 맞춤

**의존성**: connectionManager, variableManager, logger

### 4. ScriptProcessor (script-processor.js)

**책임**: 전/후처리 스크립트 실행

**주요 기능**:
- `executeGlobalProcessGroups(phase, config, progressManager)` - 전역 전/후처리 그룹 실행
- `executeProcessScript(scriptConfig, database, useSession)` - 전/후처리 스크립트 실행
- `detectTempTableUsageInScript(script)` - temp 테이블 사용 여부 감지

**의존성**: connectionManager, variableManager, queryProcessor, logger

## 🔄 사용 방법

### 모듈화된 버전 사용 (권장)

```javascript
const MSSQLDataMigrator = require('./mssql-data-migrator-modular');

const migrator = new MSSQLDataMigrator('queries/migration-queries.xml', false);
const result = await migrator.executeMigration();
```

### 개별 모듈 사용

```javascript
const {
    ConfigManager,
    VariableManager,
    QueryProcessor,
    ScriptProcessor
} = require('./modules');

const configManager = new ConfigManager();
const config = await configManager.loadConfig('queries/migration-queries.xml');
```

## ✨ 장점

### 1. **유지보수성 향상**
- 각 모듈이 명확한 역할을 가짐
- 코드 변경 시 영향 범위가 제한적
- 3098줄 → 각 모듈 200-400줄로 분리

### 2. **테스트 용이성**
- 각 모듈을 독립적으로 테스트 가능
- Mock 객체 주입이 쉬움
- 단위 테스트 작성이 간편

### 3. **재사용성**
- 다른 프로젝트에서 모듈 재사용 가능
- 필요한 모듈만 선택적으로 사용 가능

### 4. **확장성**
- 새로운 기능 추가 시 새 모듈로 분리 가능
- 기존 코드 수정 최소화

## 🔧 마이그레이션 가이드

### 기존 코드 (레거시)

```javascript
const MSSQLDataMigrator = require('./mssql-data-migrator');
const migrator = new MSSQLDataMigrator('config.xml');
const result = await migrator.executeMigration();
```

### 새로운 모듈화 코드 (권장)

```javascript
const MSSQLDataMigrator = require('./mssql-data-migrator-modular');
const migrator = new MSSQLDataMigrator('config.xml');
const result = await migrator.executeMigration();
```

**API는 완전히 호환됩니다!** 단순히 require 경로만 변경하면 됩니다.

## 📊 코드 통계

| 구분 | 레거시 | 모듈화 | 개선 |
|------|--------|--------|------|
| **파일 수** | 1개 | 5개 | 관심사 분리 |
| **총 라인 수** | 3098줄 | ~1500줄 | -51% |
| **평균 파일 크기** | 3098줄 | ~300줄 | -90% |
| **테스트 가능성** | 어려움 | 쉬움 | ✅ |
| **재사용성** | 낮음 | 높음 | ✅ |

## 🚀 향후 계획

- [ ] 각 모듈에 대한 단위 테스트 추가
- [ ] TypeScript로 전환 고려
- [ ] 추가 모듈 분리 (DataInserter, ValidationManager 등)
- [ ] 레거시 코드 완전 제거 (v1.0.0)

## 📞 지원

문의사항이 있으시면 연락주세요:
- 이메일: sql2db@happysoft.com

