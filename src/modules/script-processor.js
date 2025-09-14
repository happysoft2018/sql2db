const logger = require('../logger');

/**
 * 스크립트 프로세서 모듈
 * 전처리/후처리 스크립트 실행을 담당
 */
class ScriptProcessor {
    constructor(connectionManager, variableManager) {
        this.connectionManager = connectionManager;
        this.variableManager = variableManager;
        this.enableTransaction = process.env.ENABLE_TRANSACTION === 'true';
        this.dryRun = false;
    }

    /**
     * DRY RUN 모드 설정
     * @param {boolean} dryRun - DRY RUN 모드 여부
     */
    setDryRun(dryRun) {
        this.dryRun = dryRun;
    }

    /**
     * 전역 전처리 그룹 실행
     * @param {Array} preProcessGroups - 전처리 그룹 배열
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @returns {Promise<Object>} 실행 결과
     */
    async executeGlobalPreProcessGroups(preProcessGroups, targetDb) {
        return await this.executeProcessGroups(preProcessGroups, targetDb, '전역 전처리');
    }

    /**
     * 전역 후처리 그룹 실행
     * @param {Array} postProcessGroups - 후처리 그룹 배열
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @returns {Promise<Object>} 실행 결과
     */
    async executeGlobalPostProcessGroups(postProcessGroups, targetDb) {
        return await this.executeProcessGroups(postProcessGroups, targetDb, '전역 후처리');
    }

    /**
     * 쿼리별 전처리 그룹 실행
     * @param {Array} preProcessGroups - 전처리 그룹 배열
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @param {string} queryId - 쿼리 ID
     * @returns {Promise<Object>} 실행 결과
     */
    async executeQueryPreProcessGroups(preProcessGroups, targetDb, queryId) {
        return await this.executeProcessGroups(preProcessGroups, targetDb, `쿼리 ${queryId} 전처리`);
    }

    /**
     * 쿼리별 후처리 그룹 실행
     * @param {Array} postProcessGroups - 후처리 그룹 배열
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @param {string} queryId - 쿼리 ID
     * @returns {Promise<Object>} 실행 결과
     */
    async executeQueryPostProcessGroups(postProcessGroups, targetDb, queryId) {
        return await this.executeProcessGroups(postProcessGroups, targetDb, `쿼리 ${queryId} 후처리`);
    }

    /**
     * 프로세스 그룹 실행
     * @param {Array} processGroups - 프로세스 그룹 배열
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @param {string} processType - 프로세스 타입 (로깅용)
     * @returns {Promise<Object>} 실행 결과
     */
    async executeProcessGroups(processGroups, targetDb, processType) {
        const results = {
            success: true,
            processType: processType,
            totalGroups: processGroups.length,
            executedGroups: 0,
            skippedGroups: 0,
            failedGroups: 0,
            groupResults: [],
            totalExecutionTime: 0
        };

        const startTime = Date.now();

        try {
            logger.info(`${processType} 시작`, {
                totalGroups: processGroups.length,
                enabledGroups: processGroups.filter(g => g.enabled).length
            });

            for (const group of processGroups) {
                if (!group.enabled) {
                    logger.info(`${processType} 그룹 건너뜀: ${group.id} (비활성화)`);
                    results.skippedGroups++;
                    results.groupResults.push({
                        groupId: group.id,
                        success: true,
                        skipped: true,
                        message: '비활성화됨'
                    });
                    continue;
                }

                try {
                    const groupResult = await this.executeProcessGroup(group, targetDb, processType);
                    results.groupResults.push(groupResult);
                    results.executedGroups++;

                    if (!groupResult.success) {
                        results.failedGroups++;
                        results.success = false;
                    }

                } catch (error) {
                    logger.error(`${processType} 그룹 실행 실패: ${group.id}`, error);
                    results.groupResults.push({
                        groupId: group.id,
                        success: false,
                        skipped: false,
                        error: error.message,
                        message: '실행 중 오류 발생'
                    });
                    results.failedGroups++;
                    results.success = false;
                }
            }

            results.totalExecutionTime = Date.now() - startTime;

            logger.info(`${processType} 완료`, {
                success: results.success,
                executedGroups: results.executedGroups,
                skippedGroups: results.skippedGroups,
                failedGroups: results.failedGroups,
                totalExecutionTime: `${results.totalExecutionTime}ms`
            });

            return results;

        } catch (error) {
            results.success = false;
            results.totalExecutionTime = Date.now() - startTime;
            
            logger.error(`${processType} 전체 실행 실패`, error);
            
            return {
                ...results,
                error: error.message,
                message: '전체 실행 중 오류 발생'
            };
        }
    }

    /**
     * 단일 프로세스 그룹 실행
     * @param {Object} group - 프로세스 그룹
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @param {string} processType - 프로세스 타입
     * @returns {Promise<Object>} 실행 결과
     */
    async executeProcessGroup(group, targetDb, processType) {
        const startTime = Date.now();
        
        try {
            logger.info(`${processType} 그룹 실행 시작: ${group.id}`, {
                description: group.description
            });

            // 변수 치환된 스크립트
            const processedScript = this.variableManager.replaceVariables(group.script);

            if (this.dryRun) {
                logger.info(`DRY RUN 모드: ${processType} 그룹 스크립트 실행을 건너뜁니다.`, {
                    groupId: group.id,
                    scriptLength: processedScript.length
                });

                return {
                    groupId: group.id,
                    success: true,
                    skipped: false,
                    dryRun: true,
                    executionTime: Date.now() - startTime,
                    message: 'DRY RUN 모드로 건너뜀'
                };
            }

            // 스크립트 실행
            const executionResult = await this.executeScript(processedScript, targetDb, group.id);

            const executionTime = Date.now() - startTime;

            logger.info(`${processType} 그룹 실행 완료: ${group.id}`, {
                success: executionResult.success,
                affectedRows: executionResult.affectedRows,
                executionTime: `${executionTime}ms`
            });

            return {
                groupId: group.id,
                success: executionResult.success,
                skipped: false,
                dryRun: false,
                affectedRows: executionResult.affectedRows,
                executionTime: executionTime,
                message: executionResult.message || '성공적으로 실행됨'
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            logger.error(`${processType} 그룹 실행 실패: ${group.id}`, error);
            
            return {
                groupId: group.id,
                success: false,
                skipped: false,
                dryRun: false,
                executionTime: executionTime,
                error: error.message,
                message: '실행 중 오류 발생'
            };
        }
    }

    /**
     * SQL 스크립트 실행
     * @param {string} script - 실행할 스크립트
     * @param {string} targetDb - 타겟 데이터베이스 ID
     * @param {string} groupId - 그룹 ID (로깅용)
     * @returns {Promise<Object>} 실행 결과
     */
    async executeScript(script, targetDb, groupId) {
        if (!script || script.trim().length === 0) {
            return {
                success: true,
                affectedRows: 0,
                message: '빈 스크립트'
            };
        }

        const pool = await this.connectionManager.getConnection(targetDb);
        let transaction = null;
        let totalAffectedRows = 0;

        try {
            // 트랜잭션 시작 (필요한 경우)
            if (this.enableTransaction && this.detectTempTableUsageInScript(script)) {
                transaction = new pool.transaction();
                await transaction.begin();
                logger.info(`스크립트 트랜잭션 시작: ${groupId}`);
            }

            // SQL 문 분리 및 실행
            const sqlStatements = this.splitSqlStatements(script);
            
            for (let i = 0; i < sqlStatements.length; i++) {
                const statement = sqlStatements[i].trim();
                if (statement.length === 0) continue;

                const request = transaction ? transaction.request() : pool.request();
                const result = await request.query(statement);
                
                if (result.rowsAffected && result.rowsAffected.length > 0) {
                    totalAffectedRows += result.rowsAffected.reduce((sum, rows) => sum + (rows || 0), 0);
                }

                logger.debug(`스크립트 문 실행 완료: ${groupId}`, {
                    statementIndex: i + 1,
                    totalStatements: sqlStatements.length,
                    affectedRows: result.rowsAffected
                });
            }

            // 트랜잭션 커밋
            if (transaction) {
                await transaction.commit();
                logger.info(`스크립트 트랜잭션 커밋: ${groupId}`);
            }

            return {
                success: true,
                affectedRows: totalAffectedRows,
                statementsExecuted: sqlStatements.length,
                message: `${sqlStatements.length}개 문 실행 완료`
            };

        } catch (error) {
            // 트랜잭션 롤백
            if (transaction) {
                try {
                    await transaction.rollback();
                    logger.info(`스크립트 트랜잭션 롤백: ${groupId}`);
                } catch (rollbackError) {
                    logger.error(`스크립트 트랜잭션 롤백 실패: ${groupId}`, rollbackError);
                }
            }

            throw error;
        }
    }

    /**
     * SQL 스크립트를 개별 문으로 분리
     * @param {string} script - SQL 스크립트
     * @returns {Array} SQL 문 배열
     */
    splitSqlStatements(script) {
        // GO 문으로 분리
        let statements = script.split(/\bGO\b/gi);
        
        // 각 블록을 세미콜론으로 다시 분리
        const result = [];
        statements.forEach(block => {
            const blockStatements = block.split(';');
            blockStatements.forEach(stmt => {
                const trimmed = stmt.trim();
                if (trimmed.length > 0) {
                    result.push(trimmed);
                }
            });
        });

        return result;
    }

    /**
     * 스크립트에서 임시 테이블 사용 감지
     * @param {string} script - SQL 스크립트
     * @returns {boolean} 임시 테이블 사용 여부
     */
    detectTempTableUsageInScript(script) {
        const tempTablePatterns = [
            /#\w+/g,           // #temp_table
            /##\w+/g,          // ##global_temp_table
            /CREATE\s+TABLE\s+#/gi,
            /DROP\s+TABLE\s+#/gi,
            /INSERT\s+INTO\s+#/gi,
            /UPDATE\s+#/gi,
            /DELETE\s+FROM\s+#/gi
        ];

        return tempTablePatterns.some(pattern => pattern.test(script));
    }

    /**
     * 스크립트 유효성 검증
     * @param {string} script - 검증할 스크립트
     * @returns {Object} 검증 결과
     */
    validateScript(script) {
        if (!script || typeof script !== 'string') {
            return {
                isValid: false,
                message: '스크립트가 비어있거나 문자열이 아닙니다.'
            };
        }

        const trimmedScript = script.trim();
        if (trimmedScript.length === 0) {
            return {
                isValid: false,
                message: '스크립트가 비어있습니다.'
            };
        }

        // 기본적인 SQL 구문 검증
        const dangerousPatterns = [
            /DROP\s+DATABASE/gi,
            /SHUTDOWN/gi,
            /xp_cmdshell/gi
        ];

        const foundDangerous = dangerousPatterns.find(pattern => pattern.test(script));
        if (foundDangerous) {
            return {
                isValid: false,
                message: `위험한 SQL 구문이 감지되었습니다: ${foundDangerous.source}`
            };
        }

        return {
            isValid: true,
            message: '스크립트 검증 통과'
        };
    }

    /**
     * 스크립트 실행 통계
     * @param {Array} groupResults - 그룹 실행 결과 배열
     * @returns {Object} 통계 정보
     */
    getExecutionStats(groupResults) {
        const stats = {
            total: groupResults.length,
            successful: 0,
            failed: 0,
            skipped: 0,
            totalAffectedRows: 0,
            totalExecutionTime: 0
        };

        groupResults.forEach(result => {
            if (result.skipped) {
                stats.skipped++;
            } else if (result.success) {
                stats.successful++;
                stats.totalAffectedRows += result.affectedRows || 0;
            } else {
                stats.failed++;
            }
            
            stats.totalExecutionTime += result.executionTime || 0;
        });

        return stats;
    }
}

module.exports = ScriptProcessor;
