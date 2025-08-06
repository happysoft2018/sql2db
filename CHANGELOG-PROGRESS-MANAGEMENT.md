# 진행 상황 관리 기능 추가 - v2.1

## 🎯 개요

SQL2DB 마이그레이션 도구에 실시간 진행 상황 추적 및 모니터링 기능이 추가되었습니다. 이제 대용량 데이터 마이그레이션의 진행 상황을 실시간으로 모니터링하고, 성능 메트릭을 확인하며, 오류 상황을 빠르게 파악할 수 있습니다.

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

### 3. 실시간 CLI 모니터링
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

진행 상황 관리 기능의 추가로 SQL2DB 마이그레이션 도구는 다음과 같은 이점을 제공합니다:

1. **투명성**: 마이그레이션 과정의 모든 단계가 투명하게 공개
2. **예측 가능성**: 정확한 완료 시간 예측으로 계획 수립 지원
3. **문제 해결**: 오류 발생 시 빠른 원인 파악 및 해결
4. **성능 최적화**: 실시간 메트릭을 통한 성능 튜닝 지원
5. **이력 관리**: 과거 마이그레이션 이력을 통한 개선점 도출

이러한 기능들을 통해 대용량 데이터 마이그레이션 작업을 보다 안전하고 효율적으로 수행할 수 있습니다.