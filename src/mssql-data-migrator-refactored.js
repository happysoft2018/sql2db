const fs = require('fs');
const path = require('path');
const MSSQLConnectionManager = require('./mssql-connection-manager');
const ProgressManager = require('./progress-manager');
const logger = require('./logger');

// 모듈화된 컴포넌트들
const DatabaseConfigManager = require('./modules/database-config-manager');
const ConfigParser = require('./modules/config-parser');
const VariableManager = require('./modules/variable-manager');
const QueryExecutor = require('./modules/query-executor');
const ScriptProcessor = require('./modules/script-processor');

require('dotenv').config();

/**
 * 모듈화된 MSSQL 데이터 마이그레이터
 * 기능별로 분리된 모듈을 사용하여 데이터 마이그레이션을 수행
 */
class MSSQLDataMigrator {
    constructor(queryFilePath, dryRun = false) {
        this.queryFilePath = queryFilePath;
        this.dryRun = dryRun;
        this.enableLogging = process.env.ENABLE_LOGGING === 'true';
        this.enableTransaction = process.env.ENABLE_TRANSACTION === 'true';
        
        // 기존 컴포넌트
        this.connectionManager = new MSSQLConnectionManager();
        this.progressManager = null;
        this.currentQuery = null;
        
        // 모듈화된 컴포넌트들
        this.databaseConfigManager = new DatabaseConfigManager();
        this.configParser = new ConfigParser();
        this.variableManager = new VariableManager();
        this.queryExecutor = new QueryExecutor(this.connectionManager, this.variableManager);
        this.scriptProcessor = new ScriptProcessor(this.connectionManager, this.variableManager);
        
        // 설정
        this.config = null;
        
        // 모듈 간 의존성 설정
        this.setupModuleDependencies();
    }

    /**
     * 모듈 간 의존성 설정
     */
    setupModuleDependencies() {
        this.variableManager.setConnectionManager(this.connectionManager);
        this.queryExecutor.setDryRun(this.dryRun);
        this.scriptProcessor.setDryRun(this.dryRun);
    }

    /**
     * 초기화 및 설정 로드
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async initialize() {
        try {
            // 1. 데이터베이스 정보 로드
            await this.databaseConfigManager.loadDbInfo();
            
            // 2. 쿼리 파일이 있는 경우에만 설정 로드
            if (this.queryFilePath) {
                this.config = await this.configParser.loadConfig(this.queryFilePath);
                
                // 3. 변수 설정
                this.variableManager.setVariables(this.config.variables || {});
                this.variableManager.setDynamicVariables(this.config.dynamicVariables || {});
                
                // 4. 동적 변수 로드
                if (Object.keys(this.config.dynamicVariables || {}).length > 0) {
                    await this.variableManager.loadDynamicVariables();
                }
                
                // 5. 연결 관리자에 DB 설정 적용
                if (this.config.sourceDb) {
                    const sourceConfig = this.databaseConfigManager.getDbConfigById(this.config.sourceDb);
                    await this.connectionManager.addConnection(this.config.sourceDb, sourceConfig);
                }
                
                if (this.config.targetDb) {
                    const targetConfig = this.databaseConfigManager.getDbConfigById(this.config.targetDb);
                    await this.connectionManager.addConnection(this.config.targetDb, targetConfig);
                }
                
                // 6. 진행 상황 관리자 초기화
                if (this.config.queries && this.config.queries.length > 0) {
                    this.progressManager = new ProgressManager(this.config.queries.length);
                }
            }
            
            logger.info('MSSQLDataMigrator 초기화 완료', {
                queryFilePath: this.queryFilePath,
                dryRun: this.dryRun,
                hasConfig: !!this.config,
                queriesCount: this.config?.queries?.length || 0,
                variablesCount: Object.keys(this.variableManager.getAllVariables()).length
            });
            
            return true;
            
        } catch (error) {
            logger.error('MSSQLDataMigrator 초기화 실패', error);
            return false;
        }
    }

    /**
     * 전체 마이그레이션 실행
     * @returns {Promise<Object>} 실행 결과
     */
    async execute() {
        const startTime = Date.now();
        
        try {
            if (!this.config) {
                throw new Error('설정이 로드되지 않았습니다. initialize()를 먼저 호출하세요.');
            }

            logger.info('데이터 마이그레이션 시작', {
                totalQueries: this.config.queries.length,
                dryRun: this.dryRun
            });

            const results = {
                success: true,
                totalQueries: this.config.queries.length,
                executedQueries: 0,
                skippedQueries: 0,
                failedQueries: 0,
                queryResults: [],
                globalPreProcessResult: null,
                globalPostProcessResult: null,
                totalExecutionTime: 0,
                statistics: {
                    totalSourceRows: 0,
                    totalInsertedRows: 0
                }
            };

            // 1. 전역 전처리 실행
            if (this.config.globalProcesses?.preProcessGroups?.length > 0) {
                const enabledPreGroups = this.config.globalProcesses.preProcessGroups.filter(g => g.enabled);
                if (enabledPreGroups.length > 0) {
                    results.globalPreProcessResult = await this.scriptProcessor.executeGlobalPreProcessGroups(
                        enabledPreGroups,
                        this.config.targetDb
                    );
                    
                    if (!results.globalPreProcessResult.success) {
                        logger.error('전역 전처리 실행 실패');
                        results.success = false;
                        return results;
                    }
                }
            }

            // 2. 쿼리별 실행
            for (let i = 0; i < this.config.queries.length; i++) {
                const queryConfig = this.config.queries[i];
                this.currentQuery = queryConfig;

                if (!queryConfig.enabled) {
                    logger.info(`쿼리 건너뜀: ${queryConfig.id} (비활성화)`);
                    results.skippedQueries++;
                    results.queryResults.push({
                        queryId: queryConfig.id,
                        success: true,
                        skipped: true,
                        message: '비활성화됨'
                    });
                    continue;
                }

                try {
                    // 쿼리별 전처리 실행
                    let queryPreProcessResult = null;
                    if (queryConfig.preProcessGroups?.length > 0) {
                        const enabledPreGroups = queryConfig.preProcessGroups.filter(g => g.enabled);
                        if (enabledPreGroups.length > 0) {
                            queryPreProcessResult = await this.scriptProcessor.executeQueryPreProcessGroups(
                                enabledPreGroups,
                                queryConfig.targetDb,
                                queryConfig.id
                            );
                        }
                    }

                    // 메인 쿼리 실행
                    const queryResult = await this.queryExecutor.executeQuery(queryConfig, this.progressManager);
                    queryResult.preProcessResult = queryPreProcessResult;

                    // 쿼리별 후처리 실행
                    let queryPostProcessResult = null;
                    if (queryConfig.postProcessGroups?.length > 0) {
                        const enabledPostGroups = queryConfig.postProcessGroups.filter(g => g.enabled);
                        if (enabledPostGroups.length > 0) {
                            queryPostProcessResult = await this.scriptProcessor.executeQueryPostProcessGroups(
                                enabledPostGroups,
                                queryConfig.targetDb,
                                queryConfig.id
                            );
                        }
                    }
                    queryResult.postProcessResult = queryPostProcessResult;

                    results.queryResults.push(queryResult);

                    if (queryResult.success) {
                        results.executedQueries++;
                        results.statistics.totalSourceRows += queryResult.sourceRows || 0;
                        results.statistics.totalInsertedRows += queryResult.insertedRows || 0;
                    } else {
                        results.failedQueries++;
                        results.success = false;
                    }

                } catch (error) {
                    logger.error(`쿼리 실행 실패: ${queryConfig.id}`, error);
                    results.queryResults.push({
                        queryId: queryConfig.id,
                        success: false,
                        skipped: false,
                        error: error.message,
                        message: '실행 중 오류 발생'
                    });
                    results.failedQueries++;
                    results.success = false;
                }
            }

            // 3. 전역 후처리 실행
            if (this.config.globalProcesses?.postProcessGroups?.length > 0) {
                const enabledPostGroups = this.config.globalProcesses.postProcessGroups.filter(g => g.enabled);
                if (enabledPostGroups.length > 0) {
                    results.globalPostProcessResult = await this.scriptProcessor.executeGlobalPostProcessGroups(
                        enabledPostGroups,
                        this.config.targetDb
                    );
                }
            }

            results.totalExecutionTime = Date.now() - startTime;

            logger.info('데이터 마이그레이션 완료', {
                success: results.success,
                executedQueries: results.executedQueries,
                skippedQueries: results.skippedQueries,
                failedQueries: results.failedQueries,
                totalSourceRows: results.statistics.totalSourceRows,
                totalInsertedRows: results.statistics.totalInsertedRows,
                totalExecutionTime: `${results.totalExecutionTime}ms`
            });

            return results;

        } catch (error) {
            const totalExecutionTime = Date.now() - startTime;
            
            logger.error('데이터 마이그레이션 실행 실패', error);
            
            return {
                success: false,
                totalQueries: this.config?.queries?.length || 0,
                executedQueries: 0,
                skippedQueries: 0,
                failedQueries: 0,
                queryResults: [],
                totalExecutionTime: totalExecutionTime,
                error: error.message,
                message: '마이그레이션 실행 중 오류 발생'
            };
        }
    }

    /**
     * 데이터베이스 목록 조회
     * @returns {Promise<Array>} 데이터베이스 목록
     */
    async listDatabases() {
        await this.databaseConfigManager.loadDbInfo();
        return this.databaseConfigManager.getAvailableDbs();
    }

    /**
     * 데이터베이스 연결 테스트
     * @param {string} dbId - 데이터베이스 ID
     * @returns {Promise<Object>} 연결 테스트 결과
     */
    async testConnection(dbId) {
        try {
            const dbConfig = this.databaseConfigManager.getDbConfigById(dbId);
            return await this.connectionManager.testConnection(dbConfig);
        } catch (error) {
            logger.error(`데이터베이스 연결 테스트 실패: ${dbId}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 변수 정보 조회
     * @returns {Object} 변수 정보
     */
    getVariableInfo() {
        return {
            variables: this.variableManager.getAllVariables(),
            statistics: this.variableManager.getVariableStats()
        };
    }

    /**
     * 진행 상황 조회
     * @returns {Object|null} 진행 상황 정보
     */
    getProgress() {
        return this.progressManager ? this.progressManager.getOverallProgress() : null;
    }

    /**
     * 현재 실행 중인 쿼리 정보
     * @returns {Object|null} 현재 쿼리 정보
     */
    getCurrentQuery() {
        return this.currentQuery;
    }

    /**
     * 리소스 정리
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            await this.connectionManager.closeAllConnections();
            this.currentQuery = null;
            this.progressManager = null;
            
            logger.info('MSSQLDataMigrator 리소스 정리 완료');
        } catch (error) {
            logger.error('리소스 정리 실패', error);
        }
    }

    /**
     * 설정 검증
     * @returns {Object} 검증 결과
     */
    validateConfig() {
        if (!this.config) {
            return {
                isValid: false,
                message: '설정이 로드되지 않았습니다.'
            };
        }

        const issues = [];

        // 쿼리 검증
        if (!this.config.queries || this.config.queries.length === 0) {
            issues.push('쿼리가 정의되지 않았습니다.');
        } else {
            this.config.queries.forEach((query, index) => {
                if (!query.id) {
                    issues.push(`쿼리 ${index + 1}: ID가 없습니다.`);
                }
                if (!query.sourceDb) {
                    issues.push(`쿼리 ${query.id || index + 1}: sourceDb가 없습니다.`);
                }
                if (!query.targetDb) {
                    issues.push(`쿼리 ${query.id || index + 1}: targetDb가 없습니다.`);
                }
                if (!query.sourceQuery) {
                    issues.push(`쿼리 ${query.id || index + 1}: sourceQuery가 없습니다.`);
                }
                if (!query.targetTable) {
                    issues.push(`쿼리 ${query.id || index + 1}: targetTable이 없습니다.`);
                }
            });
        }

        // 변수 의존성 검증
        if (this.config.queries) {
            this.config.queries.forEach(query => {
                if (query.sourceQuery) {
                    const validation = this.variableManager.validateVariableDependencies(query.sourceQuery);
                    if (!validation.isValid) {
                        issues.push(`쿼리 ${query.id}: 누락된 변수 - ${validation.missingVariables.join(', ')}`);
                    }
                }
            });
        }

        return {
            isValid: issues.length === 0,
            issues: issues,
            message: issues.length === 0 ? '설정 검증 통과' : `${issues.length}개의 문제가 발견되었습니다.`
        };
    }
}

module.exports = MSSQLDataMigrator;
