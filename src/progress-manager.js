const fs = require('fs');
const path = require('path');
const { getAppRoot } = require('./modules/paths');
const { format } = require('./modules/i18n');

// 언어 설정 (환경 변수 사용, 기본값 영어)
const LANGUAGE = process.env.LANGUAGE || 'en';

// 다국어 메시지
const messages = {
    en: {
        logDirCreateFailed: 'Could not create logs directory: {message}',
        progressListenerError: 'Progress listener error: {message}',
        migrationPreparing: 'Migration preparation started',
        migrationCompleted: 'Migration completed successfully',
        migrationFailed: 'Migration failed: {message}',
        saveProgressFailed: 'Failed to save progress: {message}',
        loadProgressFailed: 'Failed to load progress: {message}',
        migrationProgress: '📊 Migration Progress: {migrationId}',
        status: 'Status: {status} | Phase: {phase}',
        currentQuery: 'Current Query: {query}',
        none: 'None',
        queries: 'Queries: {bar} {percent}% ({completed}/{total})',
        rows: 'Rows:    {bar} {percent}% ({processed}/{total})',
        duration: 'Duration: {duration}',
        speed: 'Speed: {speed} rows/sec',
        eta: 'ETA: {eta}',
        errors: '⚠️  Errors: {count}',
        listProgressFailed: 'Failed to list progress files: {message}',
        deleteFailed: 'Failed to delete {path}: {message}',
        cleanupFailed: 'Failed to cleanup old progress files: {message}'
    },
    kr: {
        logDirCreateFailed: '로그 디렉토리 생성 실패: {message}',
        progressListenerError: '진행 상황 리스너 오류: {message}',
        migrationPreparing: '마이그레이션 준비 시작',
        migrationCompleted: '마이그레이션 완료',
        migrationFailed: '마이그레이션 실패: {message}',
        saveProgressFailed: '진행 상황 저장 실패: {message}',
        loadProgressFailed: '진행 상황 로드 실패: {message}',
        migrationProgress: '📊 마이그레이션 진행 상황: {migrationId}',
        status: '상태: {status} | 단계: {phase}',
        currentQuery: '현재 쿼리: {query}',
        none: '없음',
        queries: '쿼리: {bar} {percent}% ({completed}/{total})',
        rows: '행:    {bar} {percent}% ({processed}/{total})',
        duration: '소요 시간: {duration}',
        speed: '속도: {speed} 행/초',
        eta: '예상 완료: {eta}',
        errors: '⚠️  오류: {count}개',
        listProgressFailed: '진행 상황 파일 목록 조회 실패: {message}',
        deleteFailed: '{path} 삭제 실패: {message}',
        cleanupFailed: '오래된 진행 상황 파일 정리 실패: {message}'
    }
};

const msg = messages[LANGUAGE] || messages.en;

class ProgressManager {
    constructor(migrationId = null) {
        this.migrationId = migrationId || this.generateMigrationId();
        this.startTime = Date.now();
        this.progressData = {
            migrationId: this.migrationId,
            status: 'INITIALIZING', // INITIALIZING, RUNNING, COMPLETED, FAILED, PAUSED
            startTime: this.startTime,
            endTime: null,
            totalQueries: 0,
            completedQueries: 0,
            failedQueries: 0,
            totalRows: 0,
            processedRows: 0,
            currentQuery: null,
            currentPhase: 'PREPARING', // PREPARING, EXTRACTING_VARIABLES, DELETING, MIGRATING, POST_PROCESSING
            phases: {},
            queries: {},
            errors: [],
            performance: {
                avgRowsPerSecond: 0,
                estimatedTimeRemaining: 0,
                totalDuration: 0
            }
        };
        
        // pkg 환경 고려
        const appRoot = getAppRoot();
        const logsDir = path.join(appRoot, 'logs');
        
        try {
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
        } catch (error) {
            console.warn(format(msg.logDirCreateFailed, { message: error.message }));
        }
        
        this.progressFile = path.join(logsDir, `progress-${this.migrationId}.json`);
        this.listeners = [];
        this.saveInterval = null;
        
        // 자동 저장 간격 (5초)
        this.startAutoSave();
        
        // 초기 상태 저장
        this.saveProgress();
    }

    // 고유한 마이그레이션 ID 생성
    generateMigrationId() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T');
        const datePart = timestamp[0];
        const timePart = timestamp[1].split('.')[0];
        return `migration-${datePart}-${timePart}`;
    }

    // 진행 상황 리스너 추가
    addProgressListener(listener) {
        this.listeners.push(listener);
    }

    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.getProgressSummary());
            } catch (error) {
                console.error(msg.progressListenerError.replace('{message}', error.message));
            }
        });
    }

    startMigration(totalQueries, totalRows = 0) {
        this.progressData.status = 'RUNNING';
        this.progressData.totalQueries = totalQueries;
        this.progressData.totalRows = totalRows;
        this.progressData.currentPhase = 'PREPARING';
        this.updatePhase('PREPARING', 'RUNNING', msg.migrationPreparing);
        this.saveProgress();
        this.notifyListeners();
    }

    // 페이즈 업데이트
    updatePhase(phaseName, status, description = '') {
        if (!this.progressData.phases[phaseName]) {
            this.progressData.phases[phaseName] = {
                name: phaseName,
                status: 'PENDING',
                startTime: null,
                endTime: null,
                description: '',
                rowsProcessed: 0
            };
        }
        
        const phase = this.progressData.phases[phaseName];
        
        if (status === 'RUNNING' && phase.status !== 'RUNNING') {
            phase.startTime = Date.now();
        } else if (status === 'COMPLETED' || status === 'FAILED') {
            phase.endTime = Date.now();
        }
        
        phase.status = status;
        if (description) phase.description = description;
        
        this.progressData.currentPhase = phaseName;
        this.saveProgress();
        this.notifyListeners();
    }

    // 쿼리 시작
    startQuery(queryId, description, estimatedRows = 0) {
        this.progressData.currentQuery = queryId;
        this.progressData.queries[queryId] = {
            id: queryId,
            description: description,
            status: 'RUNNING',
            startTime: Date.now(),
            endTime: null,
            estimatedRows: estimatedRows,
            processedRows: 0,
            deletedRows: 0,
            insertedRows: 0,
            errors: []
        };
        this.saveProgress();
        this.notifyListeners();
    }

    // 쿼리 진행 상황 업데이트
    updateQueryProgress(queryId, processedRows, phase = null) {
        if (this.progressData.queries[queryId]) {
            this.progressData.queries[queryId].processedRows = processedRows;
            this.progressData.processedRows += processedRows;
            
            if (phase) {
                this.progressData.queries[queryId].currentPhase = phase;
            }
            
            // 성능 메트릭 계산
            this.calculatePerformanceMetrics();
            this.saveProgress();
            this.notifyListeners();
        }
    }

    // 쿼리 완료
    completeQuery(queryId, finalStats = {}) {
        if (this.progressData.queries[queryId]) {
            const query = this.progressData.queries[queryId];
            query.status = 'COMPLETED';
            query.endTime = Date.now();
            query.duration = query.endTime - query.startTime;
            
            // 통계 업데이트
            if (finalStats.deletedRows) query.deletedRows = finalStats.deletedRows;
            if (finalStats.insertedRows) query.insertedRows = finalStats.insertedRows;
            if (finalStats.processedRows) query.processedRows = finalStats.processedRows;
            
            this.progressData.completedQueries++;
            this.progressData.currentQuery = null;
            
            this.calculatePerformanceMetrics();
            this.saveProgress();
            this.notifyListeners();
        }
    }

    // 쿼리 실패
    failQuery(queryId, error) {
        if (this.progressData.queries[queryId]) {
            const query = this.progressData.queries[queryId];
            query.status = 'FAILED';
            query.endTime = Date.now();
            query.duration = query.endTime - query.startTime;
            query.errors.push({
                timestamp: Date.now(),
                message: error.message || error,
                stack: error.stack
            });
            
            this.progressData.failedQueries++;
            this.progressData.errors.push({
                timestamp: Date.now(),
                queryId: queryId,
                error: error.message || error
            });
            
            this.saveProgress();
            this.notifyListeners();
        }
    }

    // 배치 진행 상황 업데이트
    updateBatchProgress(queryId, batchNumber, totalBatches, batchSize, processedInBatch) {
        if (this.progressData.queries[queryId]) {
            const query = this.progressData.queries[queryId];
            query.currentBatch = batchNumber;
            query.totalBatches = totalBatches;
            query.batchSize = batchSize;
            query.processedInCurrentBatch = processedInBatch;
            
            // 전체 처리된 행 수 업데이트
            const previousBatches = (batchNumber - 1) * batchSize;
            query.processedRows = previousBatches + processedInBatch;
            
            this.calculatePerformanceMetrics();
            this.saveProgress();
            this.notifyListeners();
        }
    }

    // 성능 메트릭 계산
    calculatePerformanceMetrics() {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - this.startTime) / 1000;
        
        this.progressData.performance.totalDuration = elapsedSeconds;
        
        if (elapsedSeconds > 0 && this.progressData.processedRows > 0) {
            this.progressData.performance.avgRowsPerSecond = this.progressData.processedRows / elapsedSeconds;
            
            // 남은 시간 추정
            const remainingRows = this.progressData.totalRows - this.progressData.processedRows;
            if (remainingRows > 0 && this.progressData.performance.avgRowsPerSecond > 0) {
                this.progressData.performance.estimatedTimeRemaining = remainingRows / this.progressData.performance.avgRowsPerSecond;
            }
        }
    }

    completeMigration() {
        this.progressData.status = 'COMPLETED';
        this.progressData.endTime = Date.now();
        this.progressData.performance.totalDuration = (this.progressData.endTime - this.startTime) / 1000;
        this.updatePhase(this.progressData.currentPhase, 'COMPLETED', msg.migrationCompleted);
        this.saveProgress();
        this.notifyListeners();
        this.stopAutoSave();
    }

    failMigration(error) {
        this.progressData.status = 'FAILED';
        this.progressData.endTime = Date.now();
        this.progressData.performance.totalDuration = (this.progressData.endTime - this.startTime) / 1000;
        this.progressData.errors.push({
            timestamp: Date.now(),
            type: 'MIGRATION_FAILURE',
            error: error.message || error
        });
        this.updatePhase(this.progressData.currentPhase, 'FAILED', msg.migrationFailed.replace('{message}', error.message));
        this.saveProgress();
        this.notifyListeners();
        this.stopAutoSave();
    }

    // 진행 상황 요약 반환
    getProgressSummary() {
        const totalProgress = this.progressData.totalQueries > 0 
            ? (this.progressData.completedQueries / this.progressData.totalQueries) * 100 
            : 0;
        
        const rowProgress = this.progressData.totalRows > 0 
            ? (this.progressData.processedRows / this.progressData.totalRows) * 100 
            : 0;

        return {
            migrationId: this.migrationId,
            status: this.progressData.status,
            currentPhase: this.progressData.currentPhase,
            currentQuery: this.progressData.currentQuery,
            totalProgress: Math.round(totalProgress * 100) / 100,
            rowProgress: Math.round(rowProgress * 100) / 100,
            queries: {
                total: this.progressData.totalQueries,
                completed: this.progressData.completedQueries,
                failed: this.progressData.failedQueries,
                remaining: this.progressData.totalQueries - this.progressData.completedQueries - this.progressData.failedQueries
            },
            rows: {
                total: this.progressData.totalRows,
                processed: this.progressData.processedRows,
                remaining: this.progressData.totalRows - this.progressData.processedRows
            },
            performance: this.progressData.performance,
            errors: this.progressData.errors.length,
            duration: this.progressData.performance.totalDuration
        };
    }

    // 상세 진행 상황 반환
    getDetailedProgress() {
        return { ...this.progressData };
    }

    saveProgress() {
        try {
            const logsDir = path.dirname(this.progressFile);
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progressData, null, 2));
        } catch (error) {
            console.error(msg.saveProgressFailed.replace('{message}', error.message));
        }
    }

    // 자동 저장 시작
    startAutoSave() {
        this.saveInterval = setInterval(() => {
            this.saveProgress();
        }, 5000); // 5초마다 저장
    }

    // 자동 저장 중지
    stopAutoSave() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
    }

    static loadProgress(migrationId) {
        try {
            const progressFile = path.join(__dirname, '../logs', `progress-${migrationId}.json`);
            if (fs.existsSync(progressFile)) {
                const data = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
                const manager = new ProgressManager(migrationId);
                manager.progressData = data;
                manager.migrationId = data.migrationId;
                manager.startTime = data.startTime;
                return manager;
            }
        } catch (error) {
            console.error(msg.loadProgressFailed.replace('{message}', error.message));
        }
        return null;
    }

    // 재시작 가능한지 확인
    canResume() {
        return this.progressData.status === 'FAILED' || 
               this.progressData.status === 'PAUSED' || 
               (this.progressData.status === 'RUNNING' && this.isStale());
    }

    // 진행 상황이 오래되었는지 확인 (5분 이상 업데이트 없음)
    isStale() {
        const lastUpdate = Math.max(
            this.progressData.startTime || 0,
            ...Object.values(this.progressData.queries || {}).map(q => q.endTime || q.startTime || 0),
            ...Object.values(this.progressData.phases || {}).map(p => p.endTime || p.startTime || 0)
        );
        return Date.now() - lastUpdate > 5 * 60 * 1000; // 5분
    }

    // 완료된 쿼리 목록 반환
    getCompletedQueries() {
        return Object.values(this.progressData.queries || {})
            .filter(query => query.status === 'COMPLETED')
            .map(query => query.id);
    }

    // 실패한 쿼리 목록 반환
    getFailedQueries() {
        return Object.values(this.progressData.queries || {})
            .filter(query => query.status === 'FAILED')
            .map(query => query.id);
    }

    // 미완료 쿼리 목록 반환 (실행되지 않았거나 실패한 쿼리)
    getPendingQueries(allQueryIds) {
        const completedQueries = this.getCompletedQueries();
        return allQueryIds.filter(queryId => !completedQueries.includes(queryId));
    }

    // 재시작을 위한 상태 준비
    prepareForResume() {
        this.progressData.status = 'RUNNING';
        this.progressData.currentPhase = 'MIGRATING';
        this.progressData.currentQuery = null;
        
        // 실패한 쿼리 상태를 PENDING으로 리셋
        Object.values(this.progressData.queries).forEach(query => {
            if (query.status === 'FAILED' || query.status === 'RUNNING') {
                query.status = 'PENDING';
                query.endTime = null;
                query.currentBatch = null;
                query.processedInCurrentBatch = null;
                // 에러 정보는 유지하되 새로운 시도 표시
                if (!query.retryAttempts) query.retryAttempts = 0;
                query.retryAttempts++;
            }
        });

        // 전역 에러 카운트는 유지하지만 재시작 표시
        this.progressData.resumedAt = Date.now();
        this.progressData.resumeCount = (this.progressData.resumeCount || 0) + 1;
        
        this.saveProgress();
        this.notifyListeners();
    }

    // 재시작 정보 반환
    getResumeInfo() {
        const completedQueries = this.getCompletedQueries();
        const failedQueries = this.getFailedQueries();
        
        return {
            canResume: this.canResume(),
            status: this.progressData.status,
            isStale: this.isStale(),
            completedQueries: completedQueries,
            failedQueries: failedQueries,
            totalQueries: this.progressData.totalQueries,
            remainingQueries: this.progressData.totalQueries - completedQueries.length,
            resumeCount: this.progressData.resumeCount || 0,
            lastActivity: this.getLastActivityTime()
        };
    }

    // 마지막 활동 시간 반환
    getLastActivityTime() {
        const times = [
            this.progressData.startTime || 0,
            ...Object.values(this.progressData.queries || {}).map(q => Math.max(q.startTime || 0, q.endTime || 0)),
            ...Object.values(this.progressData.phases || {}).map(p => Math.max(p.startTime || 0, p.endTime || 0))
        ];
        return Math.max(...times);
    }

    displayProgress() {
        const summary = this.getProgressSummary();
        const progressBar = this.createProgressBar(summary.totalProgress);
        const rowProgressBar = this.createProgressBar(summary.rowProgress);
        
        console.clear();
        console.log('='.repeat(80));
        console.log(msg.migrationProgress.replace('{migrationId}', this.migrationId));
        console.log('='.repeat(80));
        console.log(format(msg.status, { status: summary.status, phase: summary.currentPhase }));
        console.log(format(msg.currentQuery, { query: summary.currentQuery || msg.none }));
        console.log('');
        console.log(format(msg.queries, { bar: progressBar, percent: summary.totalProgress.toFixed(1), completed: summary.queries.completed, total: summary.queries.total }));
        console.log(format(msg.rows, { bar: rowProgressBar, percent: summary.rowProgress.toFixed(1), processed: summary.rows.processed.toLocaleString(), total: summary.rows.total.toLocaleString() }));
        console.log('');
        console.log(format(msg.duration, { duration: this.formatDuration(summary.duration) }));
        console.log(format(msg.speed, { speed: summary.performance.avgRowsPerSecond.toFixed(0) }));
        if (summary.performance.estimatedTimeRemaining > 0) {
            console.log(format(msg.eta, { eta: this.formatDuration(summary.performance.estimatedTimeRemaining) }));
        }
        if (summary.errors > 0) {
            console.log(format(msg.errors, { count: summary.errors }));
        }
        console.log('='.repeat(80));
    }

    // ...

    static listProgressFiles() {
        try {
            const appRoot = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
            const logsDir = path.join(appRoot, 'logs');
            if (!fs.existsSync(logsDir)) return [];
            
            return fs.readdirSync(logsDir)
                .filter(file => file.startsWith('progress-') && file.endsWith('.json'))
                .map(file => {
                    const migrationId = file.replace('progress-', '').replace('.json', '');
                    const filePath = path.join(logsDir, file);
                    const stats = fs.statSync(filePath);
                    
                    try {
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        return {
                            migrationId,
                            filePath,
                            lastModified: stats.mtime,
                            status: data.status,
                            startTime: data.startTime,
                            endTime: data.endTime,
                            totalQueries: data.totalQueries,
                            completedQueries: data.completedQueries,
                            failedQueries: data.failedQueries
                        };
                    } catch (error) {
                        return {
                            migrationId,
                            filePath,
                            lastModified: stats.mtime,
                            status: 'CORRUPTED',
                            error: error.message
                        };
                    }
                })
                .sort((a, b) => b.lastModified - a.lastModified);
        } catch (error) {
            console.error(format(msg.listProgressFailed, { message: error.message }));
            return [];
        }
    }

    static cleanupOldProgress(daysToKeep = 7) {
        try {
            const progressFiles = ProgressManager.listProgressFiles();
            const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            
            let deletedCount = 0;
            progressFiles.forEach(progress => {
                if (progress.status === 'COMPLETED' && progress.lastModified < cutoffTime) {
                    try {
                        fs.unlinkSync(progress.filePath);
                        deletedCount++;
                    } catch (error) {
                        console.error(format(msg.deleteFailed, { path: progress.filePath, message: error.message }));
                    }
                }
            });
            
            return deletedCount;
        } catch (error) {
            console.error(format(msg.cleanupFailed, { message: error.message }));
            return 0;
        }
    }
}

module.exports = ProgressManager;