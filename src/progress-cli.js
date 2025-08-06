const ProgressManager = require('./progress-manager');
const fs = require('fs');
const path = require('path');

class ProgressCLI {
    static showHelp() {
        console.log('진행 상황 관리 명령어:');
        console.log('');
        console.log('  list                    - 진행 상황 파일 목록 조회');
        console.log('  show <migration-id>     - 특정 마이그레이션 진행 상황 상세 조회');
        console.log('  monitor <migration-id>  - 실시간 진행 상황 모니터링');
        console.log('  resume <migration-id>   - 중단된 마이그레이션 재시작 정보 조회');
        console.log('  cleanup [days]          - 완료된 진행 상황 파일 정리 (기본: 7일)');
        console.log('  summary                 - 최근 마이그레이션 요약');
        console.log('');
        console.log('예시:');
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
                console.log('진행 상황 파일이 없습니다.');
                return;
            }

            console.log('='.repeat(80));
            console.log('📊 마이그레이션 진행 상황 목록');
            console.log('='.repeat(80));
            console.log();

            progressFiles.forEach((progress, index) => {
                const startTime = new Date(progress.startTime).toLocaleString('ko-KR');
                const endTime = progress.endTime ? new Date(progress.endTime).toLocaleString('ko-KR') : 'N/A';
                const lastModified = progress.lastModified.toLocaleString('ko-KR');
                
                console.log(`${index + 1}. ${progress.migrationId}`);
                console.log(`   상태: ${this.getStatusIcon(progress.status)} ${progress.status}`);
                console.log(`   시작: ${startTime}`);
                console.log(`   종료: ${endTime}`);
                console.log(`   수정: ${lastModified}`);
                
                if (progress.totalQueries) {
                    const completionRate = progress.totalQueries > 0 
                        ? (progress.completedQueries / progress.totalQueries * 100).toFixed(1)
                        : 0;
                    console.log(`   쿼리: ${progress.completedQueries}/${progress.totalQueries} (${completionRate}%)`);
                }
                
                if (progress.failedQueries > 0) {
                    console.log(`   ⚠️  실패: ${progress.failedQueries}개`);
                }
                
                console.log();
            });
        } catch (error) {
            console.error('진행 상황 목록 조회 실패:', error.message);
        }
    }

    static async showProgressDetail(migrationId) {
        try {
            const progressManager = ProgressManager.loadProgress(migrationId);
            
            if (!progressManager) {
                console.log(`진행 상황을 찾을 수 없습니다: ${migrationId}`);
                return;
            }

            const summary = progressManager.getProgressSummary();
            const detailed = progressManager.getDetailedProgress();

            console.log('='.repeat(80));
            console.log(`📊 마이그레이션 상세 진행 상황: ${migrationId}`);
            console.log('='.repeat(80));
            console.log();

            // 기본 정보
            console.log('📋 기본 정보');
            console.log(`   ID: ${summary.migrationId}`);
            console.log(`   상태: ${this.getStatusIcon(summary.status)} ${summary.status}`);
            console.log(`   현재 페이즈: ${summary.currentPhase}`);
            console.log(`   현재 쿼리: ${summary.currentQuery || 'None'}`);
            console.log(`   시작 시간: ${new Date(detailed.startTime).toLocaleString('ko-KR')}`);
            if (detailed.endTime) {
                console.log(`   종료 시간: ${new Date(detailed.endTime).toLocaleString('ko-KR')}`);
            }
            console.log(`   실행 시간: ${this.formatDuration(summary.duration)}`);
            console.log();

            // 진행률
            console.log('📈 진행률');
            const queryProgressBar = this.createProgressBar(summary.totalProgress);
            const rowProgressBar = this.createProgressBar(summary.rowProgress);
            console.log(`   쿼리: ${queryProgressBar} ${summary.totalProgress.toFixed(1)}% (${summary.queries.completed}/${summary.queries.total})`);
            console.log(`   행:   ${rowProgressBar} ${summary.rowProgress.toFixed(1)}% (${summary.rows.processed.toLocaleString()}/${summary.rows.total.toLocaleString()})`);
            console.log();

            // 성능
            console.log('⚡ 성능');
            console.log(`   평균 속도: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
            if (summary.performance.estimatedTimeRemaining > 0) {
                console.log(`   예상 남은 시간: ${this.formatDuration(summary.performance.estimatedTimeRemaining)}`);
            }
            console.log();

            // 페이즈별 상태
            if (Object.keys(detailed.phases).length > 0) {
                console.log('🔄 페이즈별 상태');
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
                console.log('📝 쿼리별 상태');
                Object.values(detailed.queries).forEach(query => {
                    const duration = query.endTime ? (query.endTime - query.startTime) / 1000 : 0;
                    console.log(`   ${this.getStatusIcon(query.status)} ${query.id}: ${query.status}`);
                    console.log(`     설명: ${query.description}`);
                    console.log(`     처리: ${query.processedRows.toLocaleString()}행 ${duration > 0 ? `(${duration.toFixed(1)}s)` : ''}`);
                    
                    if (query.currentBatch && query.totalBatches) {
                        const batchProgress = (query.currentBatch / query.totalBatches * 100).toFixed(1);
                        console.log(`     배치: ${query.currentBatch}/${query.totalBatches} (${batchProgress}%)`);
                    }
                    
                    if (query.errors && query.errors.length > 0) {
                        console.log(`     ⚠️  오류: ${query.errors.length}개`);
                        query.errors.forEach(error => {
                            console.log(`       - ${error.message}`);
                        });
                    }
                });
                console.log();
            }

            // 오류 정보
            if (summary.errors > 0) {
                console.log('⚠️  오류 정보');
                detailed.errors.forEach(error => {
                    const timestamp = new Date(error.timestamp).toLocaleString('ko-KR');
                    console.log(`   [${timestamp}] ${error.queryId || 'GLOBAL'}: ${error.error}`);
                });
                console.log();
            }

        } catch (error) {
            console.error('진행 상황 상세 조회 실패:', error.message);
        }
    }

    static async monitorProgress(migrationId) {
        try {
            let progressManager = ProgressManager.loadProgress(migrationId);
            
            if (!progressManager) {
                console.log(`진행 상황을 찾을 수 없습니다: ${migrationId}`);
                return;
            }

            console.log(`실시간 모니터링 시작: ${migrationId}`);
            console.log('모니터링을 중지하려면 Ctrl+C를 누르세요.');
            console.log();

            const monitorInterval = setInterval(() => {
                // 진행 상황 파일 다시 로드
                progressManager = ProgressManager.loadProgress(migrationId);
                
                if (!progressManager) {
                    console.log('진행 상황 파일을 찾을 수 없습니다. 모니터링을 중지합니다.');
                    clearInterval(monitorInterval);
                    return;
                }

                progressManager.displayProgress();

                // 완료 또는 실패 시 모니터링 중지
                const summary = progressManager.getProgressSummary();
                if (summary.status === 'COMPLETED' || summary.status === 'FAILED') {
                    console.log('\n마이그레이션이 완료되었습니다. 모니터링을 중지합니다.');
                    clearInterval(monitorInterval);
                }
            }, 2000); // 2초마다 업데이트

            // Ctrl+C 처리
            process.on('SIGINT', () => {
                clearInterval(monitorInterval);
                console.log('\n모니터링이 중지되었습니다.');
                process.exit(0);
            });

        } catch (error) {
            console.error('실시간 모니터링 실패:', error.message);
        }
    }

    static async cleanupOldProgress(days = 7) {
        try {
            const deletedCount = ProgressManager.cleanupOldProgress(days);
            console.log(`${days}일 이전의 완료된 진행 상황 파일 ${deletedCount}개를 삭제했습니다.`);
        } catch (error) {
            console.error('진행 상황 파일 정리 실패:', error.message);
        }
    }

    static async showSummary() {
        try {
            const progressFiles = ProgressManager.listProgressFiles();
            
            if (progressFiles.length === 0) {
                console.log('진행 상황 파일이 없습니다.');
                return;
            }

            console.log('='.repeat(80));
            console.log('📊 마이그레이션 요약');
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

            console.log('📈 전체 통계');
            console.log(`   총 마이그레이션: ${progressFiles.length}개`);
            console.log(`   완료: ${statusCounts.COMPLETED}개`);
            console.log(`   실패: ${statusCounts.FAILED}개`);
            console.log(`   실행 중: ${statusCounts.RUNNING}개`);
            console.log(`   일시정지: ${statusCounts.PAUSED}개`);
            console.log(`   초기화 중: ${statusCounts.INITIALIZING}개`);
            console.log();
            console.log(`   총 쿼리 수: ${totalQueries.toLocaleString()}개`);
            console.log(`   총 처리 행: ${totalRows.toLocaleString()}행`);
            console.log(`   총 실행 시간: ${this.formatDuration(totalDuration)}`);
            console.log();

            // 최근 마이그레이션 (최대 5개)
            console.log('🕒 최근 마이그레이션');
            progressFiles.slice(0, 5).forEach((progress, index) => {
                const startTime = new Date(progress.startTime).toLocaleString('ko-KR');
                console.log(`   ${index + 1}. ${progress.migrationId} - ${this.getStatusIcon(progress.status)} ${progress.status} (${startTime})`);
            });

        } catch (error) {
            console.error('요약 조회 실패:', error.message);
        }
    }

    static async showResumeInfo(migrationId) {
        try {
            const progressManager = ProgressManager.loadProgress(migrationId);
            
            if (!progressManager) {
                console.log(`진행 상황을 찾을 수 없습니다: ${migrationId}`);
                return;
            }

            const resumeInfo = progressManager.getResumeInfo();
            const detailed = progressManager.getDetailedProgress();

            console.log('='.repeat(80));
            console.log(`🔄 마이그레이션 재시작 정보: ${migrationId}`);
            console.log('='.repeat(80));
            console.log();

            // 재시작 가능 여부
            console.log('📋 재시작 상태');
            console.log(`   재시작 가능: ${resumeInfo.canResume ? '✅ 예' : '❌ 아니오'}`);
            console.log(`   현재 상태: ${this.getStatusIcon(resumeInfo.status)} ${resumeInfo.status}`);
            console.log(`   오래된 상태: ${resumeInfo.isStale ? '⚠️ 예 (5분 이상 업데이트 없음)' : '✅ 아니오'}`);
            console.log(`   재시작 횟수: ${resumeInfo.resumeCount}회`);
            console.log();

            // 진행 상황
            console.log('📊 진행 상황');
            console.log(`   완료된 쿼리: ${resumeInfo.completedQueries.length}개`);
            console.log(`   실패한 쿼리: ${resumeInfo.failedQueries.length}개`);
            console.log(`   남은 쿼리: ${resumeInfo.remainingQueries}개`);
            console.log(`   전체 쿼리: ${resumeInfo.totalQueries}개`);
            
            const completionRate = resumeInfo.totalQueries > 0 
                ? (resumeInfo.completedQueries.length / resumeInfo.totalQueries * 100).toFixed(1)
                : 0;
            console.log(`   완료율: ${completionRate}%`);
            console.log();

            // 마지막 활동
            const lastActivity = new Date(resumeInfo.lastActivity);
            console.log('🕒 마지막 활동');
            console.log(`   시간: ${lastActivity.toLocaleString('ko-KR')}`);
            console.log(`   경과: ${this.formatTimeSince(resumeInfo.lastActivity)}`);
            console.log();

            // 완료된 쿼리 목록
            if (resumeInfo.completedQueries.length > 0) {
                console.log('✅ 완료된 쿼리');
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
                console.log('❌ 실패한 쿼리');
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
                console.log('🚀 재시작 명령어');
                console.log(`   node src/migrate-cli.js resume ${migrationId}`);
                console.log();
                console.log('💡 참고: 재시작 시 완료된 쿼리는 건너뛰고 실패한 쿼리부터 재실행됩니다.');
            } else {
                console.log('⚠️  재시작 불가');
                console.log('   이 마이그레이션은 재시작할 수 없습니다.');
                if (resumeInfo.status === 'COMPLETED') {
                    console.log('   이유: 이미 완료된 마이그레이션입니다.');
                } else if (resumeInfo.status === 'RUNNING' && !resumeInfo.isStale) {
                    console.log('   이유: 현재 실행 중인 마이그레이션입니다.');
                }
            }

        } catch (error) {
            console.error('재시작 정보 조회 실패:', error.message);
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