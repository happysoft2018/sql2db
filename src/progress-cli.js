const ProgressManager = require('./progress-manager');
const fs = require('fs');
const path = require('path');
const { format } = require('./modules/i18n');

// 언어 설정 (환경 변수 사용, 기본값 영어)
const LANGUAGE = process.env.LANGUAGE || 'en';

// 다국어 메시지  
const messages = {
    en: {
        // Help menu
        helpTitle: 'Progress Management Commands:',
        helpList: '  list                    - List progress files',
        helpShow: '  show <migration-id>     - Show detailed progress for a specific migration',
        helpMonitor: '  monitor <migration-id>  - Real-time progress monitoring',
        helpResume: '  resume <migration-id>   - Show resume information for interrupted migration',
        helpCleanup: '  cleanup [days]          - Clean up completed progress files (default: 7 days)',
        helpSummary: '  summary                 - Recent migration summary',
        helpExamples: 'Examples:',
        
        // List progress
        noProgressFiles: 'No progress files found.',
        progressList: '📊 Migration Progress List',
        status: 'Status',
        start: 'Start',
        end: 'End',
        modified: 'Modified',
        queries: 'Queries',
        failed: 'Failed',
        listError: 'Failed to list progress:',
        
        // Show progress detail
        progressNotFound: 'Progress not found: {id}',
        progressDetail: '📊 Migration Detailed Progress: {id}',
        basicInfo: '📋 Basic Information',
        idLabel: 'ID',
        statusLabel: 'Status',
        currentPhase: 'Current Phase',
        currentQuery: 'Current Query',
        startTime: 'Start Time',
        endTime: 'End Time',
        executionTime: 'Execution Time',
        progressRate: '📈 Progress',
        performance: '⚡ Performance',
        avgSpeed: 'Average Speed',
        estimatedRemaining: 'Estimated Remaining',
        phaseStatus: '🔄 Phase Status',
        queryStatus: '📝 Query Status',
        description: 'Description',
        processed: 'Processed',
        batch: 'Batch',
        errors: 'Errors',
        errorInfo: '⚠️  Error Information',
        detailError: 'Failed to show progress detail:',
        
        // Monitor
        monitorNotFound: 'Progress not found: {id}',
        monitorStart: '🔍 Real-time Monitoring Started: {id}',
        keyboardCommands: '⌨️  Keyboard Commands:',
        keyQuit: '[q] Quit',
        keyPause: '[p] Pause/Resume',
        keyDetailed: '[d] Detailed/Simple mode',
        keyError: '[e] Error log',
        keyStats: '[s] Statistics',
        keyLogStream: '[l] Log stream',
        keyFaster: '[+] Faster refresh',
        keySlower: '[-] Slower refresh',
        keyRefresh: '[r] Refresh now',
        keyClear: '[c] Clear screen',
        keyNotifications: '[n] Toggle notifications',
        keyHelp: '[h] Help',
        keyEsc: '[ESC] Menu',
        monitoringQuit: '\n👋 Monitoring stopped.',
        migrationComplete: '🎉 Migration completed successfully!',
        migrationFailed: '❌ Migration failed.',
        processedRows: '📊 Processed rows',
        executionTimeLabel: '⏱️  Execution time',
        errorCount: '⚠️  Errors',
        pressAnyKey: 'Press any key to exit...',
        monitorError: 'Real-time monitoring failed:',
        
        // Statistics
        statisticsTitle: '📊 Detailed Statistics and Analysis',
        basicStats: '📈 Basic Statistics',
        migrationId: 'Migration ID',
        currentStatus: 'Current Status',
        queryStats: '📝 Query Statistics',
        totalQueries: 'Total Queries',
        completed: 'Completed',
        running: 'Running',
        failedQuery: 'Failed',
        waiting: 'Waiting',
        rowStats: '📊 Row Processing Statistics',
        totalRows: 'Total Rows',
        processedRowsLabel: 'Processed Rows',
        remainingRows: 'Remaining Rows',
        performanceStats: '⚡ Performance Statistics',
        expectedCompletion: 'Expected Completion',
        estimatedCompletionTime: 'Estimated Completion Time',
        phaseStats: '🔄 Phase Statistics',
        topPerformance: '🏆 Top Performance Queries (by processed rows)',
        errorSummary: '⚠️  Error Summary',
        totalErrors: 'Total Errors',
        recentErrors: 'Recent Errors',
        
        // Cleanup
        cleanupSuccess: 'Deleted {count} completed progress files older than {days} days.',
        cleanupError: 'Failed to clean up progress files:',
        
        // Summary
        summaryTitle: '📊 Migration Summary',
        overallStats: '📈 Overall Statistics',
        totalMigrations: 'Total Migrations',
        completedLabel: 'Completed',
        failedLabel: 'Failed',
        runningLabel: 'Running',
        pausedLabel: 'Paused',
        initializingLabel: 'Initializing',
        totalQueriesLabel: 'Total Queries',
        totalProcessedRows: 'Total Processed Rows',
        totalExecutionTime: 'Total Execution Time',
        recentMigrations: '🕒 Recent Migrations',
        summaryError: 'Failed to show summary:',
        
        // Resume
        resumeTitle: '🔄 Migration Resume Information: {id}',
        resumeStatus: '📋 Resume Status',
        canResume: 'Can Resume',
        isStale: 'Stale',
        resumeCount: 'Resume Count',
        completedQueries: 'Completed Queries',
        failedQueries: 'Failed Queries',
        remainingQueries: 'Remaining Queries',
        completionRate: 'Completion Rate',
        lastActivity: '🕒 Last Activity',
        time: 'Time',
        elapsed: 'Elapsed',
        completedQueriesList: '✅ Completed Queries',
        failedQueriesList: '❌ Failed Queries',
        resumeCommand: '🚀 Resume Command',
        resumeNote: '💡 Note: When resuming, completed queries will be skipped and failed queries will be re-executed.',
        cannotResume: '⚠️  Cannot Resume',
        cannotResumeReason: 'This migration cannot be resumed.',
        reasonCompleted: 'Reason: Migration already completed.',
        reasonRunning: 'Reason: Migration currently running.',
        resumeError: 'Failed to show resume information:',
        
        // Common
        rows: 'rows',
        yes: 'Yes',
        no: 'No',
        none: 'None',
        staleWarning: '⚠️ Yes (no update for more than 5 minutes)',
        times: 'times'
    },
    kr: {
        // Help menu
        helpTitle: '진행 상황 관리 명령어:',
        helpList: '  list                    - 진행 상황 파일 목록 조회',
        helpShow: '  show <migration-id>     - 특정 마이그레이션 진행 상황 상세 조회',
        helpMonitor: '  monitor <migration-id>  - 실시간 진행 상황 모니터링',
        helpResume: '  resume <migration-id>   - 중단된 마이그레이션 재시작 정보 조회',
        helpCleanup: '  cleanup [days]          - 완료된 진행 상황 파일 정리 (기본: 7일)',
        helpSummary: '  summary                 - 최근 마이그레이션 요약',
        helpExamples: '예시:',
        
        // List progress
        noProgressFiles: '진행 상황 파일이 없습니다.',
        progressList: '📊 마이그레이션 진행 상황 목록',
        status: '상태',
        start: '시작',
        end: '종료',
        modified: '수정',
        queries: '쿼리',
        failed: '실패',
        listError: '진행 상황 목록 조회 실패:',
        
        // Show progress detail
        progressNotFound: '진행 상황을 찾을 수 없습니다: {id}',
        progressDetail: '📊 마이그레이션 상세 진행 상황: {id}',
        basicInfo: '📋 기본 정보',
        idLabel: 'ID',
        statusLabel: '상태',
        currentPhase: '현재 페이즈',
        currentQuery: '현재 쿼리',
        startTime: '시작 시간',
        endTime: '종료 시간',
        executionTime: '실행 시간',
        progressRate: '📈 진행률',
        performance: '⚡ 성능',
        avgSpeed: '평균 속도',
        estimatedRemaining: '예상 남은 시간',
        phaseStatus: '🔄 페이즈별 상태',
        queryStatus: '📝 쿼리별 상태',
        description: '설명',
        processed: '처리',
        batch: '배치',
        errors: '오류',
        errorInfo: '⚠️  오류 정보',
        detailError: '진행 상황 상세 조회 실패:',
        
        // Monitor
        monitorNotFound: '진행 상황을 찾을 수 없습니다: {id}',
        monitorStart: '🔍 실시간 모니터링 시작: {id}',
        keyboardCommands: '⌨️  키보드 명령어:',
        keyQuit: '[q] 종료',
        keyPause: '[p] 일시정지/재개',
        keyDetailed: '[d] 상세/간단 모드',
        keyError: '[e] 오류 로그',
        keyStats: '[s] 통계 보기',
        keyLogStream: '[l] 로그 스트림',
        keyFaster: '[+] 빠르게 새로고침',
        keySlower: '[-] 느리게 새로고침',
        keyRefresh: '[r] 즉시 새로고침',
        keyClear: '[c] 화면 클리어',
        keyNotifications: '[n] 알림 토글',
        keyHelp: '[h] 도움말',
        keyEsc: '[ESC] 메뉴',
        monitoringQuit: '\n👋 모니터링을 종료합니다.',
        migrationComplete: '🎉 마이그레이션이 성공적으로 완료되었습니다!',
        migrationFailed: '❌ 마이그레이션이 실패했습니다.',
        processedRows: '📊 처리된 행',
        executionTimeLabel: '⏱️  실행 시간',
        errorCount: '⚠️  오류 수',
        pressAnyKey: '아무 키나 누르면 종료됩니다...',
        monitorError: '실시간 모니터링 실패:',
        
        // Statistics
        statisticsTitle: '📊 상세 통계 및 분석',
        basicStats: '📈 기본 통계',
        migrationId: '마이그레이션 ID',
        currentStatus: '현재 상태',
        queryStats: '📝 쿼리 통계',
        totalQueries: '총 쿼리',
        completed: '완료',
        running: '실행 중',
        failedQuery: '실패',
        waiting: '대기',
        rowStats: '📊 행 처리 통계',
        totalRows: '총 행',
        processedRowsLabel: '처리된 행',
        remainingRows: '남은 행',
        performanceStats: '⚡ 성능 통계',
        expectedCompletion: '예상 완료',
        estimatedCompletionTime: '완료 예정 시간',
        phaseStats: '🔄 페이즈별 통계',
        topPerformance: '🏆 상위 성능 쿼리 (처리 행 수 기준)',
        errorSummary: '⚠️  오류 요약',
        totalErrors: '총 오류',
        recentErrors: '최근 오류',
        
        // Cleanup
        cleanupSuccess: '{days}일 이전의 완료된 진행 상황 파일 {count}개를 삭제했습니다.',
        cleanupError: '진행 상황 파일 정리 실패:',
        
        // Summary
        summaryTitle: '📊 마이그레이션 요약',
        overallStats: '📈 전체 통계',
        totalMigrations: '총 마이그레이션',
        completedLabel: '완료',
        failedLabel: '실패',
        runningLabel: '실행 중',
        pausedLabel: '일시정지',
        initializingLabel: '초기화 중',
        totalQueriesLabel: '총 쿼리 수',
        totalProcessedRows: '총 처리 행',
        totalExecutionTime: '총 실행 시간',
        recentMigrations: '🕒 최근 마이그레이션',
        summaryError: '요약 조회 실패:',
        
        // Resume
        resumeTitle: '🔄 마이그레이션 재시작 정보: {id}',
        resumeStatus: '📋 재시작 상태',
        canResume: '재시작 가능',
        isStale: '오래된 상태',
        resumeCount: '재시작 횟수',
        completedQueries: '완료된 쿼리',
        failedQueries: '실패한 쿼리',
        remainingQueries: '남은 쿼리',
        completionRate: '완료율',
        lastActivity: '🕒 마지막 활동',
        time: '시간',
        elapsed: '경과',
        completedQueriesList: '✅ 완료된 쿼리',
        failedQueriesList: '❌ 실패한 쿼리',
        resumeCommand: '🚀 재시작 명령어',
        resumeNote: '💡 참고: 재시작 시 완료된 쿼리는 건너뛰고 실패한 쿼리부터 재실행됩니다.',
        cannotResume: '⚠️  재시작 불가',
        cannotResumeReason: '이 마이그레이션은 재시작할 수 없습니다.',
        reasonCompleted: '이유: 이미 완료된 마이그레이션입니다.',
        reasonRunning: '이유: 현재 실행 중인 마이그레이션입니다.',
        resumeError: '재시작 정보 조회 실패:',
        
        // Common
        rows: '행',
        yes: '예',
        no: '아니오',
        none: 'None',
        staleWarning: '⚠️ 예 (5분 이상 업데이트 없음)',
        times: '회'
    }
};

const msg = messages[LANGUAGE] || messages.en;

class ProgressCLI {
    static showHelp() {
        console.log(msg.helpTitle);
        console.log('');
        console.log(msg.helpList);
        console.log(msg.helpShow);
        console.log(msg.helpMonitor);
        console.log(msg.helpResume);
        console.log(msg.helpCleanup);
        console.log(msg.helpSummary);
        console.log('');
        console.log(msg.helpExamples);
        console.log('  node src/progress-cli.js list');
        console.log('  node src/progress-cli.js show migration-2024-12-01-15-30-00');
        console.log('  node src/progress-cli.js monitor migration-2024-12-01-15-30-00');
        console.log('  node src/progress-cli.js resume migration-2024-12-01-15-30-00');
        console.log('  node src/progress-cli.js cleanup 3');
    }

    static async listProgressFiles() {
        try {
            const progressFiles = ProgressManager.listProgressFiles();
            
            if (progressFiles.length === 0) {
                console.log(msg.noProgressFiles);
                return;
            }

            console.log('='.repeat(80));
            console.log(msg.progressList);
            console.log('='.repeat(80));
            console.log();

            progressFiles.forEach((progress, index) => {
                const startTime = new Date(progress.startTime).toLocaleString('ko-KR');
                const endTime = progress.endTime ? new Date(progress.endTime).toLocaleString('ko-KR') : 'N/A';
                const lastModified = progress.lastModified.toLocaleString('ko-KR');
                
                console.log(`${index + 1}. ${progress.migrationId}`);
                console.log(`   ${msg.status}: ${this.getStatusIcon(progress.status)} ${progress.status}`);
                console.log(`   ${msg.start}: ${startTime}`);
                console.log(`   ${msg.end}: ${endTime}`);
                console.log(`   ${msg.modified}: ${lastModified}`);
                
                if (progress.totalQueries) {
                    const completionRate = progress.totalQueries > 0 
                        ? (progress.completedQueries / progress.totalQueries * 100).toFixed(1)
                        : 0;
                    console.log(`   ${msg.queries}: ${progress.completedQueries}/${progress.totalQueries} (${completionRate}%)`);
                }
                
                if (progress.failedQueries > 0) {
                    const failedLabel = LANGUAGE === 'kr' ? `${progress.failedQueries}개` : `${progress.failedQueries}`;
                    console.log(`   ⚠️  ${msg.failed}: ${failedLabel}`);
                }
                
                console.log();
            });
        } catch (error) {
            console.error(msg.listError, error.message);
        }
    }

    static async showProgressDetail(migrationId) {
        try {
            const progressManager = ProgressManager.loadProgress(migrationId);
            
            if (!progressManager) {
                console.log(format(msg.progressNotFound, { id: migrationId }));

                return;
            }

            const summary = progressManager.getProgressSummary();
            const detailed = progressManager.getDetailedProgress();

            console.log('='.repeat(80));
            console.log(format(msg.progressDetail, { id: migrationId }));

            console.log('='.repeat(80));
            console.log();

            // 기본 정보
            console.log(msg.basicInfo);
            console.log(`   ${msg.idLabel}: ${summary.migrationId}`);
            console.log(`   ${msg.statusLabel}: ${this.getStatusIcon(summary.status)} ${summary.status}`);
            console.log(`   ${msg.currentPhase}: ${summary.currentPhase}`);
            console.log(`   ${msg.currentQuery.replace('{query}', summary.currentQuery || msg.none)}`);

            console.log(`   ${msg.startTime}: ${new Date(detailed.startTime).toLocaleString('ko-KR')}`);
            if (detailed.endTime) {
                console.log(`   ${msg.endTime}: ${new Date(detailed.endTime).toLocaleString('ko-KR')}`);
            }
            console.log(`   ${msg.executionTime}: ${this.formatDuration(summary.duration)}`);
            console.log();

            // 진행률
            console.log(msg.progressRate);
            const queryProgressBar = this.createProgressBar(summary.totalProgress);
            const rowProgressBar = this.createProgressBar(summary.rowProgress);
            console.log(`   쿼리: ${queryProgressBar} ${summary.totalProgress.toFixed(1)}% (${summary.queries.completed}/${summary.queries.total})`);
            console.log(`   행:   ${rowProgressBar} ${summary.rowProgress.toFixed(1)}% (${summary.rows.processed.toLocaleString()}/${summary.rows.total.toLocaleString()})`);
            console.log();

            // 성능
            console.log(msg.performance);
            console.log(`   ${msg.avgSpeed}: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
            if (summary.performance.estimatedTimeRemaining > 0) {
                console.log(`   ${msg.estimatedRemaining}: ${this.formatDuration(summary.performance.estimatedTimeRemaining)}`);
            }
            console.log();

            // 페이즈별 상태
            if (Object.keys(detailed.phases).length > 0) {
                console.log(msg.phaseStatus);
                Object.values(detailed.phases).forEach(phase => {
                    const duration = phase.endTime ? (phase.endTime - phase.startTime) / 1000 : 0;
                    console.log(`   ${this.getStatusIcon(phase.status)} ${phase.name}: ${phase.status} ${duration > 0 ? `(${duration.toFixed(1)}s)` : ''}`);
                    if (phase.description) {
                        console.log(`     ${phase.description}`);
                    }
                });
                console.log();
            }

            // 쿼리별 상태
            if (Object.keys(detailed.queries).length > 0) {
                console.log(msg.queryStatus);
                Object.values(detailed.queries).forEach(query => {
                    const duration = query.endTime ? (query.endTime - query.startTime) / 1000 : 0;
                    console.log(`   ${this.getStatusIcon(query.status)} ${query.id}: ${query.status}`);
                    console.log(`     ${msg.description}: ${query.description}`);
                    const rowsText = LANGUAGE === 'kr' ? `${query.processedRows.toLocaleString()}행` : `${query.processedRows.toLocaleString()} ${msg.rows}`;
                    console.log(`     ${msg.processed}: ${rowsText} ${duration > 0 ? `(${duration.toFixed(1)}s)` : ''}`);
                    
                    if (query.currentBatch && query.totalBatches) {
                        const batchProgress = (query.currentBatch / query.totalBatches * 100).toFixed(1);
                        console.log(`     ${msg.batch}: ${query.currentBatch}/${query.totalBatches} (${batchProgress}%)`);
                    }
                    
                    if (query.errors && query.errors.length > 0) {
                        const errorLabel = LANGUAGE === 'kr' ? `${query.errors.length}개` : `${query.errors.length}`;
                        console.log(`     ⚠️  ${msg.errors}: ${errorLabel}`);
                        query.errors.forEach(error => {
                            console.log(`       - ${error.message}`);
                        });
                    }
                });
                console.log();
            }

            // 오류 정보
            if (summary.errors > 0) {
                console.log(msg.errorInfo);
                detailed.errors.forEach(error => {
                    const timestamp = new Date(error.timestamp).toLocaleString('ko-KR');
                    console.log(`   [${timestamp}] ${error.queryId || 'GLOBAL'}: ${error.error}`);
                });
                console.log();
            }

        } catch (error) {
            console.error(msg.detailError, error.message);
        }
    }

    static async monitorProgress(migrationId, options = {}) {
        try {
            let progressManager = ProgressManager.loadProgress(migrationId);
            
            if (!progressManager) {
                console.log(format(msg.monitorNotFound, { id: migrationId }));

                return;
            }

            // 키보드 입력 처리를 위한 설정
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            let isPaused = false;
            let showDetailed = false;
            let showErrorLog = false;
            let showStatistics = false;
            let showLogStream = false;
            let refreshRate = options.refreshRate || 2000; // 기본 2초
            
            // 알림 설정
            let notifications = {
                enabled: true,
                errorThreshold: 5,          // 5개 이상 오류 시 알림
                slowQueryThreshold: 300,    // 5분 이상 실행 시 알림
                stuckThreshold: 600,        // 10분간 진행 없으면 알림
                completionNotify: true      // 완료 시 알림
            };
            
            let lastProgress = 0;
            let lastProgressTime = Date.now();
            let notificationHistory = [];

            console.log(format(msg.monitorStart, { id: migrationId }));

            console.log('━'.repeat(80));
            console.log(msg.keyboardCommands);
            const line1 = `   ${msg.keyQuit}           ${msg.keyPause}     ${msg.keyDetailed}`;
            const line2 = `   ${msg.keyFaster}  ${msg.keySlower}    ${msg.keyRefresh}`;
            const line3 = `   ${msg.keyError}       ${msg.keyStats}         ${msg.keyHelp}`;
            const line4 = `   ${msg.keyClear}     ${msg.keyNotifications}         ${msg.keyLogStream}`;
            const line5 = `   ${msg.keyEsc}`;
            console.log(line1);
            console.log(line2);
            console.log(line3);
            console.log(line4);
            console.log(line5);
            console.log('━'.repeat(80));
            console.log();

            const displayCurrentTime = () => {
                return `⏰ ${new Date().toLocaleString('ko-KR')}`;
            };

            const showNotification = (type, title, message) => {
                if (!notifications.enabled) return;
                
                const notification = {
                    type,
                    title,
                    message,
                    timestamp: Date.now()
                };
                
                notificationHistory.unshift(notification);
                if (notificationHistory.length > 50) {
                    notificationHistory = notificationHistory.slice(0, 50);
                }
                
                // 화면 상단에 알림 표시
                const timestamp = new Date().toLocaleTimeString('ko-KR');
                const icon = type === 'error' ? '🚨' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '📢';
                
                console.log(`\n${icon} [${timestamp}] ${title}: ${message}\n`);
                
                // Windows에서 시스템 알림 (선택사항)
                if (process.platform === 'win32') {
                    // Windows Toast 알림을 위한 명령어 (PowerShell 사용)
                    try {
                        const { exec } = require('child_process');
                        const powershellCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', 'OK', 'Information')`;
                        // 백그라운드에서 실행 (비차단)
                        exec(`powershell -Command "${powershellCmd}"`, () => {});
                    } catch (error) {
                        // 시스템 알림 실패 시 무시
                    }
                }
            };

            const checkForAlerts = (summary, detailed) => {
                const now = Date.now();
                
                // 오류 임계값 확인
                if (detailed.errors && detailed.errors.length >= notifications.errorThreshold) {
                    const recentErrors = detailed.errors.filter(e => (now - e.timestamp) < 300000); // 5분 내
                    if (recentErrors.length >= 3) {
                        showNotification('error', '오류 급증 감지', `최근 5분간 ${recentErrors.length}개의 오류가 발생했습니다.`);
                    }
                }
                
                // 느린 쿼리 확인
                const activeQueries = Object.values(detailed.queries).filter(q => q.status === 'RUNNING');
                activeQueries.forEach(query => {
                    if (query.startTime) {
                        const duration = (now - query.startTime) / 1000;
                        if (duration > notifications.slowQueryThreshold) {
                            showNotification('warning', '느린 쿼리 감지', `쿼리 ${query.id}가 ${Math.round(duration/60)}분째 실행 중입니다.`);
                        }
                    }
                });
                
                // 진행 정체 확인
                if (summary.totalProgress > lastProgress) {
                    lastProgress = summary.totalProgress;
                    lastProgressTime = now;
                } else if ((now - lastProgressTime) > notifications.stuckThreshold * 1000) {
                    showNotification('warning', '진행 정체 감지', `${Math.round((now - lastProgressTime)/60000)}분간 진행이 없습니다.`);
                    lastProgressTime = now; // 중복 알림 방지
                }
                
                // 성능 저하 확인
                if (summary.performance.avgRowsPerSecond < 100 && summary.totalProgress > 10) {
                    showNotification('info', '성능 주의', `현재 처리 속도가 ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec로 낮습니다.`);
                }
            };

            const displayMonitoringStatus = () => {
                const refreshRateText = `🔄 ${refreshRate/1000}초마다 업데이트`;
                let modeText = '📈 간단 모드';
                if (showDetailed) modeText = '📊 상세 모드';
                if (showErrorLog) modeText = '⚠️  오류 로그';
                if (showStatistics) modeText = '📊 통계 보기';
                if (showLogStream) modeText = '📜 로그 스트림';
                
                const statusText = isPaused ? '⏸️  일시정지' : '▶️  실행 중';
                console.log(`${displayCurrentTime()} | ${refreshRateText} | ${modeText} | ${statusText}`);
                console.log('─'.repeat(80));
            };

            const displayProgress = () => {
                // 화면 클리어 (Windows 호환)
                console.clear();
                
                console.log(`🔍 실시간 모니터링: ${migrationId}`);
                console.log('━'.repeat(80));
                
                displayMonitoringStatus();
                console.log();

                // 진행 상황 파일 다시 로드
                progressManager = ProgressManager.loadProgress(migrationId);
                
                if (!progressManager) {
                    console.log('❌ 진행 상황 파일을 찾을 수 없습니다.');
                    return false;
                }

                const summary = progressManager.getProgressSummary();
                const detailed = progressManager.getDetailedProgress();
                
                // 알림 체크
                checkForAlerts(summary, detailed);
                
                // 알림 히스토리 표시 (최근 3개)
                if (notificationHistory.length > 0) {
                    console.log('🔔 최근 알림:');
                    notificationHistory.slice(0, 3).forEach(notif => {
                        const timeAgo = this.formatTimeSince(notif.timestamp);
                        const icon = notif.type === 'error' ? '🚨' : notif.type === 'warning' ? '⚠️' : notif.type === 'success' ? '✅' : '📢';
                        console.log(`   ${icon} ${notif.title} (${timeAgo})`);
                    });
                    console.log();
                }

                if (showLogStream) {
                    // 로그 스트림 모드
                    this.displayLogStream(progressManager);
                } else if (showErrorLog) {
                    // 오류 로그 모드
                    this.displayErrorLog(progressManager);
                } else if (showStatistics) {
                    // 통계 모드
                    this.displayStatistics(progressManager);
                } else if (showDetailed) {
                    // 상세 모드
                    this.displayDetailedProgress(progressManager);
                } else {
                    // 간단 모드
                    this.displaySimpleProgress(progressManager);
                }

                return true;
            };

            const showHelpMenu = () => {
                console.clear();
                console.log('🔍 실시간 모니터링 도움말');
                console.log('━'.repeat(80));
                console.log();
                console.log('⌨️  키보드 명령어:');
                console.log('   [q]      - 모니터링 종료');
                console.log('   [p]      - 일시정지/재개');
                console.log('   [d]      - 상세/간단 모드 전환');
                console.log('   [e]      - 오류 로그 보기');
                console.log('   [s]      - 통계 보기');
                console.log('   [+]      - 새로고침 주기 단축 (빠르게)');
                console.log('   [-]      - 새로고침 주기 연장 (느리게)');
                console.log('   [r]      - 즉시 새로고침');
                console.log('   [c]      - 화면 클리어');
                console.log('   [n]      - 알림 활성화/비활성화');
                console.log('   [l]      - 로그 스트림 보기');
                console.log('   [h]      - 이 도움말 보기');
                console.log('   [ESC]    - 메인 모니터링으로 돌아가기');
                console.log();
                console.log('📊 모드 설명:');
                console.log('   간단 모드  - 기본 진행률과 성능 정보');
                console.log('   상세 모드  - 활성 쿼리, 완료된 쿼리, 성능 차트');
                console.log('   오류 로그  - 실시간 오류 및 경고 메시지');
                console.log('   통계 보기  - 전체 통계 및 분석 정보');
                console.log('   로그 스트림 - 실시간 로그 메시지 및 시스템 상태');
                console.log();
                console.log('아무 키나 눌러서 모니터링으로 돌아가기...');
            };

            // 키보드 입력 처리
            process.stdin.on('data', (key) => {
                const keyCode = key.charCodeAt(0);
                
                // ESC 키 (27)
                if (keyCode === 27) {
                    showLogStream = false;
                    showErrorLog = false;
                    showStatistics = false;
                    showDetailed = false;
                    displayProgress();
                    return;
                }
                
                switch (key.toLowerCase()) {
                    case 'q':
                        console.log('\n👋 모니터링을 종료합니다.');
                        process.exit(0);
                        break;
                    case 'p':
                        isPaused = !isPaused;
                        displayProgress();
                        break;
                    case 'd':
                        showLogStream = false;
                        showErrorLog = false;
                        showStatistics = false;
                        showDetailed = !showDetailed;
                        displayProgress();
                        break;
                    case 'e':
                        showLogStream = false;
                        showDetailed = false;
                        showStatistics = false;
                        showErrorLog = !showErrorLog;
                        displayProgress();
                        break;
                    case 's':
                        showLogStream = false;
                        showDetailed = false;
                        showErrorLog = false;
                        showStatistics = !showStatistics;
                        displayProgress();
                        break;
                    case 'l':
                        showDetailed = false;
                        showErrorLog = false;
                        showStatistics = false;
                        showLogStream = !showLogStream;
                        displayProgress();
                        break;
                    case '+':
                        if (refreshRate > 500) {
                            refreshRate = Math.max(500, refreshRate - 500);
                            displayProgress();
                        }
                        break;
                    case '-':
                        if (refreshRate < 10000) {
                            refreshRate = Math.min(10000, refreshRate + 500);
                            displayProgress();
                        }
                        break;
                    case 'r':
                        displayProgress();
                        break;
                    case 'c':
                        console.clear();
                        displayProgress();
                        break;
                    case 'n':
                        notifications.enabled = !notifications.enabled;
                        showNotification('info', '알림 설정', `알림이 ${notifications.enabled ? '활성화' : '비활성화'}되었습니다.`);
                        displayProgress();
                        break;
                    case 'h':
                        showHelpMenu();
                        break;
                    default:
                        // 도움말 모드에서 아무 키나 누르면 돌아가기
                        if (process.stdout.isTTY) {
                            displayProgress();
                        }
                        break;
                }
            });

            // 초기 표시
            if (!displayProgress()) {
                return;
            }

            const monitorInterval = setInterval(() => {
                if (isPaused) return;

                if (!displayProgress()) {
                    clearInterval(monitorInterval);
                    return;
                }

                // 완료 또는 실패 시 모니터링 중지
                const summary = progressManager.getProgressSummary();
                if (summary.status === 'COMPLETED' || summary.status === 'FAILED') {
                    clearInterval(monitorInterval);
                    
                    // 완료 알림
                    if (notifications.completionNotify) {
                        const duration = this.formatDuration(summary.duration);
                        const completedRows = summary.rows.processed.toLocaleString();
                        const status = summary.status === 'COMPLETED' ? '성공적으로 완료' : '실패로 중단';
                        
                        showNotification(
                            summary.status === 'COMPLETED' ? 'success' : 'error',
                            '마이그레이션 완료',
                            `${status}되었습니다. 실행시간: ${duration}, 처리행: ${completedRows}행`
                        );
                    }
                    
                    console.log();
                    if (summary.status === 'COMPLETED') {
                        console.log('🎉 마이그레이션이 성공적으로 완료되었습니다!');
                        console.log(`📊 처리된 행: ${summary.rows.processed.toLocaleString()}행`);
                        console.log(`⏱️  실행 시간: ${this.formatDuration(summary.duration)}`);
                    } else {
                        console.log('❌ 마이그레이션이 실패했습니다.');
                        console.log(`⚠️  오류 수: ${summary.errors}개`);
                    }
                    console.log('아무 키나 누르면 종료됩니다...');
                    
                    process.stdin.once('data', () => {
                        process.exit(0);
                    });
                }
            }, refreshRate);

            // Ctrl+C 처리
            process.on('SIGINT', () => {
                clearInterval(monitorInterval);
                console.log('\n👋 모니터링이 중지되었습니다.');
                process.exit(0);
            });

        } catch (error) {
            console.error('실시간 모니터링 실패:', error.message);
        }
    }

    static displaySimpleProgress(progressManager) {
        const summary = progressManager.getProgressSummary();
        
        console.log(`📊 상태: ${this.getStatusIcon(summary.status)} ${summary.status}`);
        console.log(`📝 페이즈: ${summary.currentPhase}`);
        if (summary.currentQuery) {
            console.log(`🔄 현재 쿼리: ${summary.currentQuery}`);
        }
        console.log();

        // 전체 진행률 - 향상된 차트
        console.log('📈 진행 상황:');
        const progressChart = this.createProgressChart(summary, 60);
        console.log(`   ${progressChart}`);
        console.log(`   완료: ${summary.queries.completed} | 실행중: ${summary.queries.running || 0} | 실패: ${summary.queries.failed || 0} | 대기: ${summary.queries.total - summary.queries.completed - (summary.queries.running || 0) - (summary.queries.failed || 0)}`);
        console.log();
        
        console.log('📊 처리량:');
        const queryProgress = this.createProgressBar(summary.totalProgress, 40);
        const rowProgress = this.createProgressBar(summary.rowProgress, 40);
        console.log(`   쿼리: ${queryProgress} ${summary.totalProgress.toFixed(1)}% (${summary.queries.completed}/${summary.queries.total})`);
        console.log(`   행:   ${rowProgress} ${summary.rowProgress.toFixed(1)}% (${summary.rows.processed.toLocaleString()}/${summary.rows.total.toLocaleString()})`);
        console.log();

        // 성능 정보
        console.log('⚡ 성능:');
        console.log(`   평균 속도: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
        console.log(`   실행 시간: ${this.formatDuration(summary.duration)}`);
        if (summary.performance.estimatedTimeRemaining > 0) {
            console.log(`   예상 남은 시간: ${this.formatDuration(summary.performance.estimatedTimeRemaining)}`);
        }

        // 오류 정보
        if (summary.errors > 0) {
            console.log();
            console.log(`⚠️  오류: ${summary.errors}개`);
        }

        console.log();
        console.log('💡 Tip: [d] 키를 눌러 상세 모드로 전환하세요.');
    }

    static displayDetailedProgress(progressManager) {
        const summary = progressManager.getProgressSummary();
        const detailed = progressManager.getDetailedProgress();

        console.log(`📊 상태: ${this.getStatusIcon(summary.status)} ${summary.status}`);
        console.log(`📝 페이즈: ${summary.currentPhase}`);
        console.log(`🔄 현재 쿼리: ${summary.currentQuery || 'None'}`);
        console.log(`⏱️  실행 시간: ${this.formatDuration(summary.duration)}`);
        console.log();

        // 진행률 섹션
        console.log('📈 진행 상황:');
        const queryProgressBar = this.createProgressBar(summary.totalProgress, 40);
        const rowProgressBar = this.createProgressBar(summary.rowProgress, 40);
        console.log(`   쿼리: ${queryProgressBar} ${summary.totalProgress.toFixed(1)}% (${summary.queries.completed}/${summary.queries.total})`);
        console.log(`   행:   ${rowProgressBar} ${summary.rowProgress.toFixed(1)}% (${summary.rows.processed.toLocaleString()}/${summary.rows.total.toLocaleString()})`);
        console.log();

        // 성능 정보와 차트
        console.log('⚡ 성능:');
        console.log(`   평균 속도: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
        console.log(`   실행 시간: ${this.formatDuration(summary.duration)}`);
        if (summary.performance.estimatedTimeRemaining > 0) {
            console.log(`   예상 남은 시간: ${this.formatDuration(summary.performance.estimatedTimeRemaining)}`);
        }
        
        // 성능 차트 추가
        const performanceChart = this.createPerformanceChart(progressManager, 40);
        if (performanceChart !== '📊 성능 차트: (데이터 부족)') {
            console.log();
            console.log(performanceChart);
        }
        console.log();

        // 활성 쿼리 정보
        const activeQueries = Object.values(detailed.queries).filter(q => q.status === 'RUNNING');
        if (activeQueries.length > 0) {
            console.log('🔄 활성 쿼리:');
            activeQueries.slice(0, 3).forEach(query => {
                const duration = query.startTime ? ((Date.now() - query.startTime) / 1000) : 0;
                console.log(`   • ${query.id} - ${query.processedRows.toLocaleString()}행 (${duration.toFixed(1)}s)`);
                if (query.currentBatch && query.totalBatches) {
                    const batchProgress = (query.currentBatch / query.totalBatches * 100).toFixed(1);
                    console.log(`     배치: ${query.currentBatch}/${query.totalBatches} (${batchProgress}%)`);
                }
            });
            console.log();
        }

        // 최근 완료된 쿼리
        const completedQueries = Object.values(detailed.queries)
            .filter(q => q.status === 'COMPLETED')
            .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
            .slice(0, 3);
        
        if (completedQueries.length > 0) {
            console.log('✅ 최근 완료:');
            completedQueries.forEach(query => {
                const duration = query.duration ? (query.duration / 1000).toFixed(1) : 'N/A';
                console.log(`   • ${query.id} - ${query.processedRows.toLocaleString()}행 (${duration}s)`);
            });
            console.log();
        }

        // 오류 정보
        if (summary.errors > 0) {
            console.log('⚠️  최근 오류:');
            detailed.errors.slice(-3).forEach(error => {
                const timestamp = new Date(error.timestamp).toLocaleTimeString('ko-KR');
                console.log(`   [${timestamp}] ${error.queryId || 'GLOBAL'}: ${error.error}`);
            });
            console.log();
        }

        console.log('💡 Tip: [d] 키를 눌러 간단 모드로 전환하세요.');
    }

    static displayErrorLog(progressManager) {
        const detailed = progressManager.getDetailedProgress();
        const summary = progressManager.getProgressSummary();

        console.log('⚠️  오류 로그 및 경고');
        console.log('━'.repeat(80));
        console.log();

        if (!detailed.errors || detailed.errors.length === 0) {
            console.log('✅ 현재 오류가 없습니다!');
            console.log();
            console.log(`📊 상태: ${this.getStatusIcon(summary.status)} ${summary.status}`);
            console.log(`🔄 진행률: ${summary.totalProgress.toFixed(1)}%`);
            console.log();
            console.log('💡 Tip: 오류가 발생하면 여기에 실시간으로 표시됩니다.');
            return;
        }

        // 최근 오류들 표시
        const recentErrors = detailed.errors.slice(-20); // 최근 20개 오류
        console.log(`📊 총 오류: ${detailed.errors.length}개 (최근 ${recentErrors.length}개 표시)`);
        console.log();

        recentErrors.forEach((error, index) => {
            const timestamp = new Date(error.timestamp).toLocaleString('ko-KR');
            const timeAgo = this.formatTimeSince(error.timestamp);
            
            console.log(`${recentErrors.length - index}. [${timestamp}] (${timeAgo})`);
            console.log(`    쿼리: ${error.queryId || 'GLOBAL'}`);
            console.log(`    오류: ${error.error}`);
            
            if (error.details) {
                console.log(`    상세: ${error.details}`);
            }
            console.log();
        });

        // 오류 유형별 통계
        const errorTypes = {};
        detailed.errors.forEach(error => {
            const type = this.categorizeError(error.error);
            errorTypes[type] = (errorTypes[type] || 0) + 1;
        });

        console.log('📈 오류 유형별 통계:');
        Object.entries(errorTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}개`);
        });

        console.log();
        console.log('💡 Tip: [ESC] 키를 눌러 메인 화면으로 돌아가세요.');
    }

    static displayStatistics(progressManager) {
        const summary = progressManager.getProgressSummary();
        const detailed = progressManager.getDetailedProgress();

        console.log('📊 상세 통계 및 분석');
        console.log('━'.repeat(80));
        console.log();

        // 기본 통계
        console.log('📈 기본 통계:');
        console.log(`   마이그레이션 ID: ${summary.migrationId}`);
        console.log(`   시작 시간: ${new Date(detailed.startTime).toLocaleString('ko-KR')}`);
        console.log(`   실행 시간: ${this.formatDuration(summary.duration)}`);
        console.log(`   현재 상태: ${this.getStatusIcon(summary.status)} ${summary.status}`);
        console.log();

        // 쿼리 통계
        console.log('📝 쿼리 통계:');
        console.log(`   총 쿼리: ${summary.queries.total}개`);
        console.log(`   완료: ${summary.queries.completed}개 (${(summary.queries.completed / summary.queries.total * 100).toFixed(1)}%)`);
        console.log(`   실행 중: ${summary.queries.running || 0}개`);
        console.log(`   실패: ${summary.queries.failed || 0}개`);
        console.log(`   대기: ${summary.queries.total - summary.queries.completed - (summary.queries.running || 0) - (summary.queries.failed || 0)}개`);
        console.log();

        // 행 처리 통계
        console.log('📊 행 처리 통계:');
        console.log(`   총 행: ${summary.rows.total.toLocaleString()}행`);
        console.log(`   처리된 행: ${summary.rows.processed.toLocaleString()}행 (${summary.rowProgress.toFixed(1)}%)`);
        console.log(`   남은 행: ${(summary.rows.total - summary.rows.processed).toLocaleString()}행`);
        console.log();

        // 성능 통계
        console.log('⚡ 성능 통계:');
        console.log(`   평균 속도: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
        if (summary.performance.estimatedTimeRemaining > 0) {
            console.log(`   예상 완료: ${this.formatDuration(summary.performance.estimatedTimeRemaining)} 후`);
            const completionTime = new Date(Date.now() + summary.performance.estimatedTimeRemaining * 1000);
            console.log(`   완료 예정 시간: ${completionTime.toLocaleString('ko-KR')}`);
        }
        console.log();

        // 페이즈별 통계
        if (Object.keys(detailed.phases).length > 0) {
            console.log('🔄 페이즈별 통계:');
            Object.values(detailed.phases).forEach(phase => {
                const duration = phase.endTime ? (phase.endTime - phase.startTime) / 1000 : 0;
                const status = this.getStatusIcon(phase.status);
                console.log(`   ${status} ${phase.name}: ${phase.status} ${duration > 0 ? `(${duration.toFixed(1)}s)` : ''}`);
            });
            console.log();
        }

        // 상위 성능 쿼리
        const queries = Object.values(detailed.queries).filter(q => q.processedRows > 0);
        if (queries.length > 0) {
            console.log('🏆 상위 성능 쿼리 (처리 행 수 기준):');
            queries
                .sort((a, b) => b.processedRows - a.processedRows)
                .slice(0, 5)
                .forEach((query, index) => {
                    const duration = query.duration ? (query.duration / 1000).toFixed(1) : 'N/A';
                    const speed = query.duration ? (query.processedRows / (query.duration / 1000)).toFixed(0) : 'N/A';
                    console.log(`   ${index + 1}. ${query.id}: ${query.processedRows.toLocaleString()}행 (${duration}s, ${speed} rows/sec)`);
                });
            console.log();
        }

        // 오류 요약
        if (detailed.errors && detailed.errors.length > 0) {
            console.log('⚠️  오류 요약:');
            console.log(`   총 오류: ${detailed.errors.length}개`);
            
            const recentErrors = detailed.errors.slice(-5);
            console.log(`   최근 오류 (${recentErrors.length}개):`);
            recentErrors.forEach(error => {
                const timeAgo = this.formatTimeSince(error.timestamp);
                console.log(`     • ${error.queryId || 'GLOBAL'}: ${error.error.substring(0, 50)}... (${timeAgo})`);
            });
            console.log();
        }

        console.log('💡 Tip: [e] 키로 오류 로그, [ESC] 키로 메인 화면으로 이동하세요.');
    }

    static categorizeError(errorMessage) {
        const msg = errorMessage.toLowerCase();
        
        if (msg.includes('timeout') || msg.includes('시간초과')) return '🕐 타임아웃';
        if (msg.includes('connection') || msg.includes('연결')) return '🔌 연결 오류';
        if (msg.includes('syntax') || msg.includes('구문')) return '📝 구문 오류';
        if (msg.includes('permission') || msg.includes('권한')) return '🔒 권한 오류';
        if (msg.includes('memory') || msg.includes('메모리')) return '💾 메모리 오류';
        if (msg.includes('disk') || msg.includes('디스크')) return '💽 디스크 오류';
        if (msg.includes('foreign key') || msg.includes('constraint')) return '🔗 제약조건 오류';
        if (msg.includes('deadlock')) return '🔄 데드락';
        
        return '❓ 기타 오류';
    }

    static displayLogStream(progressManager) {
        const detailed = progressManager.getDetailedProgress();
        const summary = progressManager.getProgressSummary();
        
        console.log('📜 실시간 로그 스트림');
        console.log('━'.repeat(80));
        console.log();

        // 현재 진행 상황 요약
        console.log(`📊 진행 상황: ${summary.totalProgress.toFixed(1)}% | 상태: ${this.getStatusIcon(summary.status)} ${summary.status}`);
        console.log(`🔄 현재 쿼리: ${summary.currentQuery || 'None'}`);
        console.log();

        // 활성 쿼리 로그
        const activeQueries = Object.values(detailed.queries).filter(q => q.status === 'RUNNING');
        if (activeQueries.length > 0) {
            console.log('🔄 활성 쿼리 로그:');
            activeQueries.forEach(query => {
                const duration = query.startTime ? ((Date.now() - query.startTime) / 1000) : 0;
                const timestamp = new Date().toLocaleTimeString('ko-KR');
                
                console.log(`   [${timestamp}] 실행 중: ${query.id}`);
                console.log(`   └─ 진행: ${query.processedRows.toLocaleString()}행 처리 (${duration.toFixed(1)}s)`);
                
                if (query.currentBatch && query.totalBatches) {
                    const batchProgress = (query.currentBatch / query.totalBatches * 100).toFixed(1);
                    console.log(`   └─ 배치: ${query.currentBatch}/${query.totalBatches} (${batchProgress}%)`);
                }
                
                // 최근 로그 메시지들 (가상)
                const logMessages = this.generateLogMessages(query);
                logMessages.forEach(msg => {
                    console.log(`   └─ ${msg}`);
                });
                console.log();
            });
        }

        // 최근 완료된 쿼리 로그
        const recentCompleted = Object.values(detailed.queries)
            .filter(q => q.status === 'COMPLETED' && q.endTime)
            .sort((a, b) => b.endTime - a.endTime)
            .slice(0, 5);

        if (recentCompleted.length > 0) {
            console.log('✅ 최근 완료 로그:');
            recentCompleted.forEach(query => {
                const endTime = new Date(query.endTime).toLocaleTimeString('ko-KR');
                const duration = query.duration ? (query.duration / 1000).toFixed(1) : 'N/A';
                
                console.log(`   [${endTime}] 완료: ${query.id}`);
                console.log(`   └─ 처리: ${query.processedRows.toLocaleString()}행 (${duration}s)`);
            });
            console.log();
        }

        // 시스템 로그 (성능, 메모리 등)
        console.log('🖥️  시스템 로그:');
        const timestamp = new Date().toLocaleTimeString('ko-KR');
        console.log(`   [${timestamp}] 성능: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
        
        if (process.memoryUsage) {
            const memUsage = process.memoryUsage();
            const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
            const heapTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(1);
            console.log(`   [${timestamp}] 메모리: ${heapUsed}MB / ${heapTotal}MB`);
        }
        
        // 최근 오류 로그
        if (detailed.errors && detailed.errors.length > 0) {
            const recentErrors = detailed.errors.slice(-3);
            console.log();
            console.log('⚠️  최근 오류 로그:');
            recentErrors.forEach(error => {
                const errorTime = new Date(error.timestamp).toLocaleTimeString('ko-KR');
                console.log(`   [${errorTime}] 오류: ${error.queryId || 'SYSTEM'}`);
                console.log(`   └─ ${error.error}`);
            });
        }

        console.log();
        console.log('💡 Tip: 로그가 실시간으로 업데이트됩니다. [ESC] 키로 메인 화면으로 이동하세요.');
    }

    static generateLogMessages(query) {
        const messages = [];
        const now = new Date().toLocaleTimeString('ko-KR');
        
        // 실제 환경에서는 실제 로그 파일이나 로그 시스템에서 가져올 수 있습니다
        if (query.currentBatch && query.totalBatches) {
            messages.push(`배치 ${query.currentBatch} 처리 중...`);
        }
        
        if (query.processedRows > 0) {
            const rate = query.startTime ? (query.processedRows / ((Date.now() - query.startTime) / 1000)) : 0;
            messages.push(`처리 속도: ${rate.toFixed(0)} rows/sec`);
        }
        
        // 가상의 SQL 실행 로그
        messages.push('SQL 실행: INSERT INTO target_table...');
        
        return messages;
    }

    static async cleanupOldProgress(days = 7) {
        try {
            const deletedCount = ProgressManager.cleanupOldProgress(days);
            console.log(msg.cleanupSuccess.replace('{days}', days).replace('{count}', deletedCount));
        } catch (error) {
            console.error(msg.cleanupError, error.message);
        }
    }

    static async showSummary() {
        try {
            const progressFiles = ProgressManager.listProgressFiles();
            
            if (progressFiles.length === 0) {
                console.log(msg.noProgressFiles);
                return;
            }

            console.log('='.repeat(80));
            console.log(msg.summaryTitle);
            console.log('='.repeat(80));
            console.log();

            const statusCounts = {
                COMPLETED: 0,
                FAILED: 0,
                RUNNING: 0,
                PAUSED: 0,
                INITIALIZING: 0
            };

            let totalQueries = 0;
            let totalRows = 0;
            let totalDuration = 0;

            progressFiles.forEach(progress => {
                if (statusCounts.hasOwnProperty(progress.status)) {
                    statusCounts[progress.status]++;
                }
                
                if (progress.totalQueries) {
                    totalQueries += progress.totalQueries;
                }

                // 상세 정보 로드
                try {
                    const manager = ProgressManager.loadProgress(progress.migrationId);
                    if (manager) {
                        const detailed = manager.getDetailedProgress();
                        if (detailed.totalRows) totalRows += detailed.totalRows;
                        if (detailed.performance && detailed.performance.totalDuration) {
                            totalDuration += detailed.performance.totalDuration;
                        }
                    }
                } catch (error) {
                    // 오류 무시
                }
            });

            console.log(msg.overallStats);
            const itemSuffix = LANGUAGE === 'kr' ? '개' : '';
            console.log(`   ${msg.totalMigrations}: ${progressFiles.length}${itemSuffix}`);
            console.log(`   ${msg.completedLabel}: ${statusCounts.COMPLETED}${itemSuffix}`);
            console.log(`   ${msg.failedLabel}: ${statusCounts.FAILED}${itemSuffix}`);
            console.log(`   ${msg.runningLabel}: ${statusCounts.RUNNING}${itemSuffix}`);
            console.log(`   ${msg.pausedLabel}: ${statusCounts.PAUSED}${itemSuffix}`);
            console.log(`   ${msg.initializingLabel}: ${statusCounts.INITIALIZING}${itemSuffix}`);
            console.log();
            const querySuffix = LANGUAGE === 'kr' ? '개' : '';
            const rowSuffix = LANGUAGE === 'kr' ? '행' : ` ${msg.rows}`;
            console.log(`   ${msg.totalQueriesLabel}: ${totalQueries.toLocaleString()}${querySuffix}`);
            console.log(`   ${msg.totalProcessedRows}: ${totalRows.toLocaleString()}${rowSuffix}`);
            console.log(`   ${msg.totalExecutionTime}: ${this.formatDuration(totalDuration)}`);
            console.log();

            // 최근 마이그레이션 (최대 5개)
            console.log(msg.recentMigrations);
            progressFiles.slice(0, 5).forEach((progress, index) => {
                const startTime = new Date(progress.startTime).toLocaleString('ko-KR');
                console.log(`   ${index + 1}. ${progress.migrationId} - ${this.getStatusIcon(progress.status)} ${progress.status} (${startTime})`);
            });

        } catch (error) {
            console.error(msg.summaryError, error.message);
        }
    }

    static async showResumeInfo(migrationId) {
        try {
            const progressManager = ProgressManager.loadProgress(migrationId);
            
            if (!progressManager) {
                console.log(msg.progressNotFound.replace('{id}', migrationId));
                return;
            }

            const resumeInfo = progressManager.getResumeInfo();
            const detailed = progressManager.getDetailedProgress();

            console.log('='.repeat(80));
            console.log(msg.resumeTitle.replace('{id}', migrationId));
            console.log('='.repeat(80));
            console.log();

            // 재시작 가능 여부
            console.log(msg.resumeStatus);
            const canResumeText = resumeInfo.canResume ? `✅ ${msg.yes}` : `❌ ${msg.no}`;
            const isStaleText = resumeInfo.isStale ? msg.staleWarning : `✅ ${msg.no}`;
            const countSuffix = LANGUAGE === 'kr' ? '회' : ` ${msg.times}`;
            console.log(`   ${msg.canResume}: ${canResumeText}`);
            console.log(`   ${msg.statusLabel}: ${this.getStatusIcon(resumeInfo.status)} ${resumeInfo.status}`);
            console.log(`   ${msg.isStale}: ${isStaleText}`);
            console.log(`   ${msg.resumeCount}: ${resumeInfo.resumeCount}${countSuffix}`);
            console.log();

            // 진행 상황
            const itemSuffix = LANGUAGE === 'kr' ? '개' : '';
            console.log(msg.progressRate);
            console.log(`   ${msg.completedQueries}: ${resumeInfo.completedQueries.length}${itemSuffix}`);
            console.log(`   ${msg.failedQueries}: ${resumeInfo.failedQueries.length}${itemSuffix}`);
            console.log(`   ${msg.remainingQueries}: ${resumeInfo.remainingQueries}${itemSuffix}`);
            console.log(`   ${msg.totalQueries}: ${resumeInfo.totalQueries}${itemSuffix}`);
            
            const completionRate = resumeInfo.totalQueries > 0 
                ? (resumeInfo.completedQueries.length / resumeInfo.totalQueries * 100).toFixed(1)
                : 0;
            console.log(`   ${msg.completionRate}: ${completionRate}%`);
            console.log();

            // 마지막 활동
            const lastActivity = new Date(resumeInfo.lastActivity);
            console.log(msg.lastActivity);
            console.log(`   ${msg.time}: ${lastActivity.toLocaleString('ko-KR')}`);
            console.log(`   ${msg.elapsed}: ${this.formatTimeSince(resumeInfo.lastActivity)}`);
            console.log();

            // 완료된 쿼리 목록
            if (resumeInfo.completedQueries.length > 0) {
                console.log(msg.completedQueriesList);
                resumeInfo.completedQueries.forEach((queryId, index) => {
                    const queryData = detailed.queries[queryId];
                    const duration = queryData && queryData.duration ? (queryData.duration / 1000).toFixed(1) + 's' : 'N/A';
                    const rows = queryData && queryData.processedRows ? queryData.processedRows.toLocaleString() : '0';
                    console.log(`   ${index + 1}. ${queryId} - ${rows}행 (${duration})`);
                });
                console.log();
            }

            // 실패한 쿼리 목록
            if (resumeInfo.failedQueries.length > 0) {
                console.log(msg.failedQueriesList);
                resumeInfo.failedQueries.forEach((queryId, index) => {
                    const queryData = detailed.queries[queryId];
                    const lastError = queryData && queryData.errors && queryData.errors.length > 0 
                        ? queryData.errors[queryData.errors.length - 1].message 
                        : 'Unknown error';
                    console.log(`   ${index + 1}. ${queryId} - ${lastError}`);
                });
                console.log();
            }

            // 재시작 명령어
            if (resumeInfo.canResume) {
                console.log(msg.resumeCommand);
                console.log(`   node src/migrate-cli.js resume ${migrationId}`);
                console.log();
                console.log(msg.resumeNote);
            } else {
                console.log(msg.cannotResume);
                console.log(`   ${msg.cannotResumeReason}`);
                if (resumeInfo.status === 'COMPLETED') {
                    console.log(`   ${msg.reasonCompleted}`);
                } else if (resumeInfo.status === 'RUNNING' && !resumeInfo.isStale) {
                    console.log(`   ${msg.reasonRunning}`);
                }
            }

        } catch (error) {
            console.error(msg.resumeError, error.message);
        }
    }

    static formatTimeSince(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}일 전`;
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        return `${seconds}초 전`;
    }

    static getStatusIcon(status) {
        const icons = {
            'COMPLETED': '✅',
            'FAILED': '❌', 
            'RUNNING': '🔄',
            'PAUSED': '⏸️',
            'INITIALIZING': '⚡',
            'PENDING': '⏳'
        };
        return icons[status] || '❓';
    }

    static createProgressBar(percentage, length = 30) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    }

    static formatDuration(seconds) {
        if (seconds < 60) return `${seconds.toFixed(0)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${(seconds % 60).toFixed(0)}s`;
    }

    static createPerformanceChart(progressManager, width = 60) {
        const detailed = progressManager.getDetailedProgress();
        const performanceHistory = detailed.performanceHistory || [];
        
        if (performanceHistory.length < 2) {
            return '📊 성능 차트: (데이터 부족)';
        }

        const maxRate = Math.max(...performanceHistory.map(p => p.rowsPerSecond));
        const minRate = Math.min(...performanceHistory.map(p => p.rowsPerSecond));
        const range = maxRate - minRate || 1;

        let chart = '📊 성능 차트 (rows/sec):\n';
        chart += `   최대: ${maxRate.toFixed(0)} | 최소: ${minRate.toFixed(0)}\n`;
        chart += '   ';

        const recentData = performanceHistory.slice(-width);
        recentData.forEach(point => {
            const normalized = (point.rowsPerSecond - minRate) / range;
            const height = Math.round(normalized * 8);
            const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            chart += bars[Math.min(height, 7)] || '▁';
        });

        return chart;
    }

    static createProgressChart(summary, width = 50) {
        const totalSegments = width;
        const completedSegments = Math.round((summary.totalProgress / 100) * totalSegments);
        const failedSegments = summary.queries.failed > 0 ? Math.round((summary.queries.failed / summary.queries.total) * totalSegments) : 0;
        const runningSegments = Math.min(1, Math.max(0, totalSegments - completedSegments - failedSegments));
        const pendingSegments = totalSegments - completedSegments - failedSegments - runningSegments;

        let chart = '';
        chart += '🟩'.repeat(completedSegments);      // 완료
        chart += '🟨'.repeat(runningSegments);        // 실행 중
        chart += '🟥'.repeat(failedSegments);         // 실패
        chart += '⬜'.repeat(pendingSegments);        // 대기

        return chart;
    }

    static displayMiniGraph(data, width = 20, height = 5) {
        if (!data || data.length < 2) return '데이터 없음';

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        let graph = '';
        for (let row = height - 1; row >= 0; row--) {
            let line = '';
            const threshold = min + (range * row / (height - 1));
            
            data.slice(-width).forEach(value => {
                if (value >= threshold) {
                    line += '█';
                } else {
                    line += ' ';
                }
            });
            graph += line + '\n';
        }
        
        return graph.trimEnd();
    }
}

// CLI 실행
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'list':
            await ProgressCLI.listProgressFiles();
            break;
            
        case 'show':
            if (!args[1]) {
                console.log('Migration ID를 지정해주세요.');
                console.log('사용법: node src/progress-cli.js show <migration-id>');
                process.exit(1);
            }
            await ProgressCLI.showProgressDetail(args[1]);
            break;
            
        case 'monitor':
            if (!args[1]) {
                console.log('Migration ID를 지정해주세요.');
                console.log('사용법: node src/progress-cli.js monitor <migration-id>');
                process.exit(1);
            }
            await ProgressCLI.monitorProgress(args[1]);
            break;
            
        case 'resume':
            if (!args[1]) {
                console.log('Migration ID를 지정해주세요.');
                console.log('사용법: node src/progress-cli.js resume <migration-id>');
                process.exit(1);
            }
            await ProgressCLI.showResumeInfo(args[1]);
            break;
            
        case 'cleanup':
            const days = parseInt(args[1]) || 7;
            await ProgressCLI.cleanupOldProgress(days);
            break;
            
        case 'summary':
            await ProgressCLI.showSummary();
            break;
            
        default:
            ProgressCLI.showHelp();
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('명령 실행 실패:', error.message);
        process.exit(1);
    });
}

module.exports = ProgressCLI;