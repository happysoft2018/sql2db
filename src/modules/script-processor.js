const logger = require('../logger');

/**
 * 전/후처리 스크립트 실행 담당 모듈
 */
class ScriptProcessor {
    constructor(connectionManager, variableManager, queryProcessor, logFunction) {
        this.connectionManager = connectionManager;
        this.variableManager = variableManager;
        this.queryProcessor = queryProcessor;
        this.log = logFunction || console.log;
    }

    /**
     * 전역 전/후처리 그룹 실행
     */
    async executeGlobalProcessGroups(phase, config, progressManager) {
        const groups = phase === 'preProcess' 
            ? config.globalProcesses.preProcessGroups 
            : config.globalProcesses.postProcessGroups;
        
        const enabledGroups = groups.filter(group => group.enabled);
        
        if (enabledGroups.length === 0) {
            this.log(`활성화된 전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹이 없습니다.`);
            return;
        }
        
        this.log(`\n=== 전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 실행 (${enabledGroups.length}개) ===`);
        progressManager.updatePhase(
            phase === 'preProcess' ? 'PRE_PROCESSING' : 'POST_PROCESSING', 
            'RUNNING', 
            `Executing global ${phase === 'preProcess' ? 'pre' : 'post'}-processing groups`
        );
        
        for (const group of enabledGroups) {
            this.log(`\n--- [${group.id}] ${group.description} 실행 중 ---`);
            
            try {
                const scriptConfig = {
                    description: group.description,
                    script: group.script
                };
                
                const hasTempTables = this.detectTempTableUsageInScript(group.script);
                
                if (hasTempTables) {
                    this.log(`⚠️  전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 [${group.id}]에서 temp 테이블이 감지되어 세션 관리 모드로 실행합니다.`);
                }
                
                const result = await this.executeProcessScript(scriptConfig, 'target', hasTempTables);
                
                if (!result.success) {
                    const errorMsg = `전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 [${group.id}] 실행 실패: ${result.error}`;
                    this.log(errorMsg);
                    
                    if (phase === 'preProcess') {
                        progressManager.updatePhase('PRE_PROCESSING', 'FAILED', errorMsg);
                        throw new Error(errorMsg);
                    } else {
                        this.log(`경고: ${errorMsg} - 다음 그룹 계속 진행`);
                    }
                } else {
                    this.log(`--- [${group.id}] ${group.description} 완료 ---`);
                    if (result.executedCount !== undefined) {
                        this.log(`  📈 실행 통계: ${result.executedCount}/${result.totalStatements}개 SQL 문 성공`);
                        if (result.errors && result.errors.length > 0) {
                            this.log(`  ⚠️  경고: ${result.errors.length}개 SQL 문에서 오류 발생`);
                        }
                    }
                }
            } catch (error) {
                const errorMsg = `전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 [${group.id}] 실행 중 오류: ${error.message}`;
                this.log(errorMsg);
                
                if (phase === 'preProcess') {
                    progressManager.updatePhase('PRE_PROCESSING', 'FAILED', errorMsg);
                    throw new Error(errorMsg);
                } else {
                    this.log(`경고: ${errorMsg} - 다음 그룹 계속 진행`);
                }
            }
        }
        
        progressManager.updatePhase(
            phase === 'preProcess' ? 'PRE_PROCESSING' : 'POST_PROCESSING', 
            'COMPLETED', 
            `Global ${phase === 'preProcess' ? 'pre' : 'post'}-processing groups completed`
        );
        this.log(`=== 전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 완료 ===\n`);
    }

    /**
     * 전/후처리 스크립트 실행
     */
    async executeProcessScript(scriptConfig, database = 'target', useSession = false) {
        let sessionStarted = false;
        
        try {
            if (!scriptConfig || !scriptConfig.script) {
                this.log('실행할 스크립트가 없습니다.');
                return { success: true };
            }
            
            this.log(`${scriptConfig.description} 실행 중...`);
            
            if (useSession) {
                await this.connectionManager.beginSession(database);
                sessionStarted = true;
            }
            
            const debugScripts = process.env.DEBUG_SCRIPTS === 'true';
            
            // 변수 치환
            const processedScript = this.variableManager.replaceVariables(scriptConfig.script);
            
            // INSERT SELECT 컬럼 맞춤 처리
            const insertSelectAlignedScript = await this.queryProcessor.processInsertSelectColumnAlignment(
                processedScript, 
                database
            );
            
            // 주석 제거
            const cleanedScript = this.queryProcessor.removeComments(insertSelectAlignedScript);
            
            // 스크립트를 세미콜론으로 분할
            const sqlStatements = cleanedScript
                .split(';')
                .map(sql => sql.trim())
                .filter(sql => sql.length > 0);
            
            if (sqlStatements.length === 0) {
                this.log('실행할 SQL 문이 없습니다.');
                return { success: true };
            }
            
            this.log(`총 ${sqlStatements.length}개의 SQL 문 실행 중...`);
            
            let executedCount = 0;
            const errors = [];
            
            for (let i = 0; i < sqlStatements.length; i++) {
                const sql = sqlStatements[i];
                try {
                    if (debugScripts) {
                        this.log(`SQL 문 ${i + 1}/${sqlStatements.length} 실행: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
                    }
                    
                    let result;
                    if (useSession) {
                        result = await this.connectionManager.executeQueryInSession(sql, database);
                    } else {
                        if (database === 'source') {
                            result = await this.connectionManager.executeQueryOnSource(sql);
                        } else {
                            result = await this.connectionManager.executeQueryOnTarget(sql);
                        }
                    }
                    executedCount++;
                    
                    if (result && result.rowsAffected && result.rowsAffected.length > 0) {
                        const affectedRows = result.rowsAffected.reduce((sum, count) => sum + count, 0);
                        if (affectedRows > 0) {
                            this.log(`  ✓ SQL 문 ${i + 1} 실행 성공: ${affectedRows}행 영향받음`);
                        }
                    }
                    
                } catch (sqlError) {
                    const errorMsg = `SQL 실행 경고 (계속 진행): ${sqlError.message}`;
                    this.log(errorMsg);
                    
                    errors.push({
                        sqlIndex: i + 1,
                        sql: sql.substring(0, 200),
                        error: sqlError.message
                    });
                }
            }
            
            if (errors.length > 0) {
                this.log(`총 ${errors.length}개의 SQL 실행 오류가 발생했습니다.`);
            }
            
            this.log(`\n📊 ${scriptConfig.description} 실행 결과:`);
            this.log(`  • 총 SQL 문: ${sqlStatements.length}개`);
            this.log(`  • 성공 실행: ${executedCount}개`);
            if (errors.length > 0) {
                this.log(`  • 실패: ${errors.length}개`);
            }
            
            return { 
                success: true, 
                executedCount, 
                totalStatements: sqlStatements.length,
                errors: errors.length > 0 ? errors : undefined
            };
            
        } catch (error) {
            this.log(`${scriptConfig.description} 실행 실패: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            if (sessionStarted) {
                try {
                    await this.connectionManager.endSession(database);
                    this.log(`${scriptConfig.description} 세션 정리 완료`);
                } catch (sessionError) {
                    this.log(`${scriptConfig.description} 세션 정리 중 오류: ${sessionError.message}`);
                }
            }
        }
    }

    /**
     * temp 테이블 사용 여부 감지 (비활성화됨)
     */
    detectTempTableUsageInScript(script) {
        return false;
    }
}

module.exports = ScriptProcessor;

