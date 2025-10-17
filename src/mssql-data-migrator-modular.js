const fs = require('fs');
const path = require('path');
const MSSQLConnectionManager = require('./mssql-connection-manager');
const ProgressManager = require('./progress-manager');
const logger = require('./logger');

// 모듈화된 컴포넌트들
const ConfigManager = require('./modules/config-manager');
const VariableManager = require('./modules/variable-manager');
const QueryProcessor = require('./modules/query-processor');
const ScriptProcessor = require('./modules/script-processor');

require('dotenv').config();

/**
 * 모듈화된 MSSQL 데이터 마이그레이터
 */
class MSSQLDataMigrator {
    constructor(queryFilePath, dryRun = false) {
        this.queryFilePath = queryFilePath;
        this.dryRun = dryRun;
        this.enableLogging = process.env.ENABLE_LOGGING === 'true';
        this.enableTransaction = process.env.ENABLE_TRANSACTION === 'true';
        
        // 로그 파일
        this.logFile = null;
        
        // 현재 쿼리 추적
        this.currentQuery = null;
        
        // 기본 컴포넌트
        this.connectionManager = new MSSQLConnectionManager();
        this.progressManager = null;
        
        // 모듈화된 컴포넌트들
        this.configManager = new ConfigManager();
        this.variableManager = new VariableManager(this.connectionManager, this.log.bind(this));
        this.queryProcessor = new QueryProcessor(
            this.connectionManager,
            this.variableManager,
            this.log.bind(this)
        );
        this.scriptProcessor = new ScriptProcessor(
            this.connectionManager,
            this.variableManager,
            this.queryProcessor,
            this.log.bind(this)
        );
        
        // 설정
        this.config = null;
        this.dbInfo = null;
    }

    /**
     * 로그 기록
     */
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        console.log(logMessage);
        
        if (this.enableLogging && this.logFile) {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        }
    }

    /**
     * 로그 파일 초기화
     */
    initializeLogging() {
        if (!this.enableLogging) return;
        
        // pkg 환경 고려
        const appRoot = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFileName = `migration-log-${timestamp}.txt`;
        this.logFile = path.join(appRoot, 'logs', logFileName);
        
        const logsDir = path.dirname(this.logFile);
        try {
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
        } catch (error) {
            console.warn(`Could not create logs directory: ${error.message}`);
        }
        
        this.log(`데이터 이관 시작: ${new Date().toISOString()}`);
    }

    /**
     * DB 정보 파일 로드
     */
    async loadDbInfo() {
        this.dbInfo = await this.configManager.loadDbInfo();
        return this.dbInfo;
    }

    /**
     * DB ID로 연결 정보 조회
     */
    getDbConfigById(dbId) {
        return this.configManager.getDbConfigById(dbId);
    }

    /**
     * 쿼리문정의 파일 로드 및 파싱
     */
    async loadConfig() {
        try {
            // 설정 로드
            this.config = await this.configManager.loadConfig(this.queryFilePath);
            
            // 변수 설정
            this.variableManager.setVariables(this.config.variables || {});
            
            // DB 연결 정보 설정
            if (this.config.settings) {
                logger.info('쿼리문정의 파일에서 DB 연결 정보를 발견했습니다.');
                
                let sourceConfig = null;
                let targetConfig = null;
                
                if (typeof this.config.settings.sourceDatabase === 'string') {
                    const sourceId = this.config.settings.sourceDatabase;
                    sourceConfig = this.getDbConfigById(sourceId);
                    logger.info('소스 DB 설정(DB ID)', sourceConfig);
                } else if (this.config.settings.sourceDatabase) {
                    sourceConfig = this.config.settings.sourceDatabase;
                    sourceConfig.description = sourceConfig.description || '직접 설정된 소스 데이터베이스';
                }
                
                if (typeof this.config.settings.targetDatabase === 'string') {
                    const targetId = this.config.settings.targetDatabase;
                    targetConfig = this.getDbConfigById(targetId);
                    
                    if (!targetConfig.isWritable) {
                        throw new Error(`타겟 DB '${targetId}'는 읽기 전용 데이터베이스입니다. isWritable=true인 DB만 타겟으로 사용할 수 있습니다.`);
                    }
                    
                    logger.info('타겟 DB 설정 (DB ID)', targetConfig);
                } else if (this.config.settings.targetDatabase) {
                    targetConfig = this.config.settings.targetDatabase;
                    targetConfig.isWritable = targetConfig.isWritable ?? true;
                    targetConfig.description = targetConfig.description || '직접 설정된 타겟 데이터베이스';
                }
                
                this.connectionManager.setCustomDatabaseConfigs(sourceConfig, targetConfig);
            } else {
                logger.info('환경 변수(.env)에서 DB 연결 정보를 사용합니다.');
            }
            
            return this.config;
        } catch (error) {
            logger.error('쿼리문정의 파일 로드 실패', error);
            throw new Error(`쿼리문정의 파일 로드 실패: ${error.message}`);
        }
    }

    /**
     * 선택적으로 전역 컬럼 오버라이드 적용
     */
    async selectivelyApplyGlobalColumnOverrides(globalColumnOverrides, applyGlobalColumns, tableName = null, database = 'target') {
        if (!globalColumnOverrides || globalColumnOverrides.size === 0) {
            return {};
        }
        
        if (!applyGlobalColumns || applyGlobalColumns === '' || applyGlobalColumns === 'undefined') {
            return {};
        }
        
        // 대소문자 구분 없이 처리하기 위해 소문자로 변환
        const normalizedApplyGlobalColumns = applyGlobalColumns.toLowerCase().trim();
        
        // globalColumnOverrides의 키를 대소문자 구분 없이 검색하기 위한 Map 생성
        const columnMap = new Map();
        globalColumnOverrides.forEach((value, column) => {
            columnMap.set(column.toLowerCase(), { originalColumn: column, value: value });
        });
        
        switch (normalizedApplyGlobalColumns) {
            case 'all':
                if (tableName) {
                    const tableColumns = await this.queryProcessor.getTableColumns(tableName, database);
                    // 대소문자 구분 없이 비교하기 위해 소문자로 변환
                    const tableColumnsLower = tableColumns.map(col => col.toLowerCase());
                    const existingOverrides = {};
                    
                    globalColumnOverrides.forEach((value, column) => {
                        const columnLower = column.toLowerCase();
                        const matchIndex = tableColumnsLower.indexOf(columnLower);
                        
                        if (matchIndex !== -1) {
                            // 테이블의 실제 컬럼명 사용
                            const actualColumnName = tableColumns[matchIndex];
                            const resolvedValue = this.variableManager.resolveJsonValue(value, {
                                tableName: tableName,
                                database: database
                            });
                            existingOverrides[actualColumnName] = resolvedValue;
                        }
                    });
                    
                    const appliedColumns = Object.keys(existingOverrides);
                    if (appliedColumns.length > 0) {
                        this.log(`전역 컬럼 오버라이드 적용 (all): ${appliedColumns.join(', ')}`);
                    }
                    
                    return existingOverrides;
                } else {
                    const allOverrides = {};
                    globalColumnOverrides.forEach((value, column) => {
                        allOverrides[column] = this.variableManager.resolveJsonValue(value, {});
                    });
                    
                    const appliedColumns = Object.keys(allOverrides);
                    if (appliedColumns.length > 0) {
                        this.log(`전역 컬럼 오버라이드 적용 (all): ${appliedColumns.join(', ')}`);
                    }
                    
                    return allOverrides;
                }
                
            case 'none':
                this.log(`전역 컬럼 오버라이드 적용 안 함 (none)`);
                return {};
                
            default:
                if (normalizedApplyGlobalColumns.includes(',')) {
                    const selectedColumns = normalizedApplyGlobalColumns.split(',').map(col => col.trim());
                    const selectedOverrides = {};
                    
                    selectedColumns.forEach(column => {
                        const columnInfo = columnMap.get(column);
                        if (columnInfo) {
                            const resolvedValue = this.variableManager.resolveJsonValue(columnInfo.value, {
                                tableName: tableName,
                                database: database
                            });
                            selectedOverrides[columnInfo.originalColumn] = resolvedValue;
                        }
                    });
                    
                    const appliedColumns = Object.keys(selectedOverrides);
                    if (appliedColumns.length > 0) {
                        this.log(`전역 컬럼 오버라이드 선택 적용: ${appliedColumns.join(', ')}`);
                    } else {
                        this.log(`전역 컬럼 오버라이드: 요청된 컬럼(${applyGlobalColumns})이 전역 설정에 없음`);
                    }
                    
                    return selectedOverrides;
                } else {
                    const columnInfo = columnMap.get(normalizedApplyGlobalColumns);
                    if (columnInfo) {
                        const resolvedValue = this.variableManager.resolveJsonValue(columnInfo.value, {
                            tableName: tableName,
                            database: database
                        });
                        this.log(`전역 컬럼 오버라이드 적용: ${columnInfo.originalColumn}`);
                        return { 
                            [columnInfo.originalColumn]: resolvedValue
                        };
                    }
                    this.log(`전역 컬럼 오버라이드: 요청된 컬럼 '${applyGlobalColumns}'이 전역 설정에 없음`);
                    return {};
                }
        }
    }

    /**
     * 개별 쿼리 이관 실행
     */
    async executeQueryMigration(queryConfig) {
        try {
            this.log(`\n=== 쿼리 이관 시작: ${queryConfig.id} ===`);
            this.log(`설명: ${queryConfig.description}`);
            
            // 전처리 실행
            if (queryConfig.preProcess) {
                this.log(`--- ${queryConfig.id} 전처리 실행 ---`);
                const preProcessHasTempTables = this.scriptProcessor.detectTempTableUsageInScript(queryConfig.preProcess.script);
                const preResult = await this.scriptProcessor.executeProcessScript(
                    queryConfig.preProcess, 
                    'target', 
                    preProcessHasTempTables
                );
                
                if (!preResult.success) {
                    throw new Error(`${queryConfig.id} 전처리 실행 실패: ${preResult.error}`);
                }
                this.log(`--- ${queryConfig.id} 전처리 완료 ---`);
            }
            
            // 배치 크기 결정
            let batchSize = parseInt(process.env.BATCH_SIZE) || 1000;
            if (queryConfig.batchSize) {
                const processedBatchSize = this.variableManager.replaceVariables(queryConfig.batchSize.toString());
                batchSize = parseInt(processedBatchSize) || batchSize;
            }
            
            // sourceQuery 검증
            const validationResult = this.queryProcessor.validateSingleSqlStatement(queryConfig.sourceQuery);
            if (!validationResult.isValid) {
                throw new Error(`sourceQuery 검증 실패: ${validationResult.message}`);
            }
            this.log(`✅ sourceQuery 검증 통과: ${validationResult.message}`);

            // 소스 데이터 조회
            const sourceData = await this.connectionManager.querySource(queryConfig.sourceQuery);
            
            // PK 기준 삭제 처리
            if (queryConfig.sourceQueryDeleteBeforeInsert) {
                this.log(`이관 전 대상 테이블 PK 기준 데이터 삭제: ${queryConfig.targetTable}`);
                if (sourceData && sourceData.length > 0) {
                    const identityColumns = typeof queryConfig.identityColumns === 'string' && queryConfig.identityColumns.includes(',')
                        ? queryConfig.identityColumns.split(',').map(pk => pk.trim())
                        : queryConfig.identityColumns;
                    await this.connectionManager.deleteFromTargetByPK(queryConfig.targetTable, identityColumns, sourceData);
                }
            }
            
            if (sourceData.length === 0) {
                this.log('조회된 데이터가 없습니다. 이관을 건너뜁니다.');
                return { success: true, rowsProcessed: 0 };
            }
            
            // globalColumnOverrides 적용
            const processedData = this.variableManager.applyGlobalColumnOverrides(sourceData, queryConfig.columnOverrides);
            
            // 데이터 삽입
            const insertedRows = await this.insertDataInBatches(
                queryConfig.targetTable,
                queryConfig.targetColumns,
                processedData,
                batchSize,
                queryConfig.id
            );
            
            // 후처리 실행
            if (queryConfig.postProcess) {
                this.log(`--- ${queryConfig.id} 후처리 실행 ---`);
                const postProcessHasTempTables = this.scriptProcessor.detectTempTableUsageInScript(queryConfig.postProcess.script);
                const postResult = await this.scriptProcessor.executeProcessScript(
                    queryConfig.postProcess, 
                    'target', 
                    postProcessHasTempTables
                );
                
                if (!postResult.success) {
                    this.log(`${queryConfig.id} 후처리 실행 실패: ${postResult.error}`);
                }
                this.log(`--- ${queryConfig.id} 후처리 완료 ---`);
            }
            
            this.log(`=== 쿼리 이관 완료: ${queryConfig.id} (${insertedRows}행 처리) ===\n`);
            
            return { success: true, rowsProcessed: insertedRows };
        } catch (error) {
            this.log(`=== 쿼리 이관 실패: ${queryConfig.id} - ${error.message} ===\n`);
            return { success: false, error: error.message, rowsProcessed: 0 };
        }
    }

    /**
     * 배치 단위로 데이터 삽입
     */
    async insertDataInBatches(tableName, columns, data, batchSize, queryId = null) {
        try {
            if (!data || data.length === 0) {
                this.log('삽입할 데이터가 없습니다.');
                return 0;
            }

            const totalRows = data.length;
            let insertedRows = 0;
            
            this.log(`총 ${totalRows}행을 ${batchSize}개씩 배치로 삽입 시작`);
            
            for (let i = 0; i < totalRows; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(totalRows / batchSize);
             
                this.log(`배치 ${batchNumber}/${totalBatches} 처리 중 (${batch.length}행)`);
                
                const result = await this.connectionManager.insertToTarget(tableName, columns, batch);
                const batchInsertedRows = result.rowsAffected[0];
                insertedRows += batchInsertedRows;
                
                const progress = ((i + batch.length) / totalRows * 100).toFixed(1);
                this.log(`진행률: ${progress}% (${i + batch.length}/${totalRows})`);
                
                if (this.progressManager && queryId) {
                    this.progressManager.updateBatchProgress(
                        queryId, 
                        batchNumber, 
                        totalBatches, 
                        batchSize, 
                        i + batch.length
                    );
                }
            }
            
            this.log(`총 ${insertedRows}행 삽입 완료`);
            return insertedRows;
        } catch (error) {
            this.log(`배치 삽입 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * 전체 이관 프로세스 실행
     */
    async executeMigration(resumeMigrationId = null) {
        const startTime = Date.now();
        let duration = 0;
        let totalProcessed = 0;
        let successCount = 0;
        let failureCount = 0;
        const results = [];
        let isResuming = false;
        
        try {
            this.initializeLogging();
            this.log('MSSQL 데이터 이관 프로세스 시작');
            
            // 진행 상황 관리자 초기화
            if (resumeMigrationId) {
                this.progressManager = ProgressManager.loadProgress(resumeMigrationId);
                if (!this.progressManager) {
                    throw new Error(`재시작할 마이그레이션을 찾을 수 없습니다: ${resumeMigrationId}`);
                }
                
                if (!this.progressManager.canResume()) {
                    throw new Error(`마이그레이션을 재시작할 수 없습니다. 상태: ${this.progressManager.progressData.status}`);
                }
                
                isResuming = true;
                this.progressManager.prepareForResume();
                this.log(`마이그레이션 재시작: ${this.progressManager.migrationId}`);
            } else {
                this.progressManager = new ProgressManager();
                this.log(`Migration ID: ${this.progressManager.migrationId}`);
            }
            
            // 쿼리문정의 파일 로드
            await this.loadConfig();
            
            // 데이터베이스 연결
            this.log('데이터베이스 연결 중...');
            this.progressManager.updatePhase('CONNECTING', 'RUNNING', 'Connecting to databases');
            await this.connectionManager.connectBoth();
            
            // 전역 전처리 그룹 실행
            if (this.config.globalProcesses && this.config.globalProcesses.preProcessGroups) {
                await this.scriptProcessor.executeGlobalProcessGroups('preProcess', this.config, this.progressManager);
            }
            
            // 동적 변수 추출 실행
            if (this.config.dynamicVariables && this.config.dynamicVariables.length > 0) {
                this.log(`동적 변수 추출 시작: ${this.config.dynamicVariables.length}개`);
                this.progressManager.updatePhase('EXTRACTING_VARIABLES', 'RUNNING', `Extracting ${this.config.dynamicVariables.length} dynamic variables`);
                
                for (const extractConfig of this.config.dynamicVariables) {
                    if (extractConfig.enabled !== false) {
                        await this.variableManager.extractDataToVariable(extractConfig);
                    }
                }
                
                this.progressManager.updatePhase('EXTRACTING_VARIABLES', 'COMPLETED', 'Dynamic variable extraction completed');
                this.log('모든 동적 변수 추출 완료');
            }
            
            // 활성화된 쿼리 필터링
            let enabledQueries = this.config.queries.filter(query => query.enabled);
            
            // 재시작인 경우 완료된 쿼리 필터링
            if (isResuming) {
                const completedQueries = this.progressManager.getCompletedQueries();
                const originalCount = enabledQueries.length;
                enabledQueries = enabledQueries.filter(query => !completedQueries.includes(query.id));
                this.log(`전체 쿼리: ${originalCount}개, 완료된 쿼리: ${completedQueries.length}개, 실행할 쿼리: ${enabledQueries.length}개`);
                
                completedQueries.forEach(queryId => {
                    const queryData = this.progressManager.progressData.queries[queryId];
                    if (queryData && queryData.status === 'COMPLETED') {
                        results.push({
                            queryId: queryId,
                            description: queryData.description || '',
                            success: true,
                            rowsProcessed: queryData.processedRows || 0
                        });
                        totalProcessed += queryData.processedRows || 0;
                        successCount++;
                    }
                });
            } else {
                this.log(`실행할 쿼리 수: ${enabledQueries.length}`);
            }
            
            // 전체 행 수 추정
            let totalEstimatedRows = 0;
            if (!isResuming) {
                this.log('🔍 쿼리별 행 수 추정 시작...');
                for (const query of enabledQueries) {
                    const rowCount = await this.queryProcessor.estimateQueryRowCount(query, this.queryFilePath);
                    totalEstimatedRows += rowCount;
                }
                this.log(`📊 총 예상 이관 행 수: ${totalEstimatedRows.toLocaleString()}`);
                this.progressManager.startMigration(this.config.queries.filter(query => query.enabled).length, totalEstimatedRows);
            } else {
                totalEstimatedRows = this.progressManager.progressData.totalRows || 0;
                this.log(`기존 예상 행 수: ${totalEstimatedRows.toLocaleString()}행`);
            }
            
            // 트랜잭션 시작
            let transaction = null;
            if (this.enableTransaction) {
                this.log('트랜잭션 시작');
                transaction = await this.connectionManager.beginTransaction();
            }
            
            try {
                this.progressManager.updatePhase('MIGRATING', 'RUNNING', 'Migrating data');
                
                // 각 쿼리 실행
                for (const queryConfig of enabledQueries) {
                    this.currentQuery = queryConfig;
                    
                    // SELECT * 처리 및 컬럼 오버라이드 적용
                    const processedQueryConfig = await this.queryProcessor.processQueryConfig(queryConfig, this.queryFilePath);
                    
                    // columnOverrides 설정
                    processedQueryConfig.columnOverrides = new Map();
                    if (processedQueryConfig.sourceQueryApplyGlobalColumns && 
                        processedQueryConfig.sourceQueryApplyGlobalColumns !== 'none') {
                        processedQueryConfig.columnOverrides = new Map(this.config.globalColumnOverrides);
                    }
                    
                    this.progressManager.startQuery(queryConfig.id, queryConfig.description, 0);
                    
                    const result = await this.executeQueryMigration(processedQueryConfig);
                    results.push({
                        queryId: queryConfig.id,
                        description: queryConfig.description,
                        ...result
                    });
                    
                    totalProcessed += result.rowsProcessed;
                    
                    if (result.success) {
                        successCount++;
                        this.progressManager.completeQuery(queryConfig.id, {
                            processedRows: result.rowsProcessed,
                            insertedRows: result.rowsProcessed
                        });
                    } else {
                        failureCount++;
                        this.progressManager.failQuery(queryConfig.id, new Error(result.error || 'Unknown error'));
                        
                        if (this.enableTransaction && transaction) {
                            this.log('오류 발생으로 인한 트랜잭션 롤백');
                            await transaction.rollback();
                            throw new Error(`쿼리 실행 실패: ${queryConfig.id}`);
                        }
                    }
                    
                    this.currentQuery = null;
                }
                
                // 트랜잭션 커밋
                if (this.enableTransaction && transaction) {
                    this.log('트랜잭션 커밋');
                    await transaction.commit();
                }
                
                // 전역 후처리 그룹 실행
                if (this.config.globalProcesses && this.config.globalProcesses.postProcessGroups) {
                    await this.scriptProcessor.executeGlobalProcessGroups('postProcess', this.config, this.progressManager);
                }
                
            } catch (error) {
                if (this.enableTransaction && transaction) {
                    try {
                        await transaction.rollback();
                        this.log('트랜잭션 롤백 완료');
                    } catch (rollbackError) {
                        this.log(`트랜잭션 롤백 실패: ${rollbackError.message}`);
                    }
                }
                throw error;
            }
            
        } catch (error) {
            this.log(`이관 프로세스 오류: ${error.message}`);
            
            if (this.progressManager) {
                this.progressManager.failMigration(error);
            }
            
            throw error;
            
        } finally {
            await this.connectionManager.closeConnections();
            
            const endTime = Date.now();
            duration = (endTime - startTime) / 1000;
            
            if (this.progressManager && failureCount === 0) {
                this.progressManager.completeMigration();
            }
            
            this.log('\n=== 이관 프로세스 완료 ===');
            this.log(`총 실행 시간: ${duration.toFixed(2)}초`);
            this.log(`성공한 쿼리: ${successCount}`);
            this.log(`실패한 쿼리: ${failureCount}`);
            this.log(`총 처리된 행: ${totalProcessed}`);
            
            if (this.progressManager) {
                const summary = this.progressManager.getProgressSummary();
                this.log(`\n=== 진행 상황 요약 ===`);
                this.log(`Migration ID: ${summary.migrationId}`);
                this.log(`최종 상태: ${summary.status}`);
                this.log(`전체 진행률: ${summary.totalProgress.toFixed(1)}%`);
            }
            
            results.forEach(result => {
                const status = result.success ? '성공' : '실패';
                this.log(`${result.queryId}: ${status} (${result.rowsProcessed}행) - ${result.description}`);
            });
            
            if (this.enableLogging) {
                this.log(`\n상세 로그: ${this.logFile}`);
            }
            
            if (this.progressManager) {
                this.log(`진행 상황 파일: ${this.progressManager.progressFile}`);
            }
        }
        
        const migrationResult = {
            success: failureCount === 0,
            duration,
            totalProcessed,
            successCount,
            failureCount,
            results
        };
        
        if (this.progressManager) {
            migrationResult.migrationId = this.progressManager.migrationId;
            migrationResult.progressFile = this.progressManager.progressFile;
            migrationResult.progressSummary = this.progressManager.getProgressSummary();
        }
        
        return migrationResult;
    }

    /**
     * DRY RUN 모드
     */
    async executeDryRun() {
        console.log('🧪 DRY RUN 모드: 데이터 마이그레이션 시뮬레이션\n');
        
        const startTime = Date.now();
        let totalQueries = 0;
        let totalRows = 0;
        const results = [];
        
        try {
            await this.loadConfig();
            
            console.log('📡 소스 데이터베이스 연결 중...');
            await this.connectionManager.connectSource();
            
            // 동적 변수 추출
            if (this.config.dynamicVariables && this.config.dynamicVariables.length > 0) {
                console.log(`\n🔍 동적 변수 추출 시뮬레이션: ${this.config.dynamicVariables.length}개`);
                
                for (const extractConfig of this.config.dynamicVariables) {
                    if (extractConfig.enabled !== false) {
                        console.log(`  • ${extractConfig.id}: ${extractConfig.description || '설명 없음'}`);
                        
                        try {
                            await this.variableManager.extractDataToVariable(extractConfig);
                            console.log(`    ✅ 추출 완료 → 변수: ${extractConfig.variableName}`);
                        } catch (error) {
                            console.log(`    ❌ 추출 실패: ${error.message}`);
                        }
                    }
                }
            }
            
            // 쿼리 시뮬레이션
            const enabledQueries = this.config.queries.filter(q => q.enabled !== false);
            console.log(`\n📋 마이그레이션 쿼리 시뮬레이션: ${enabledQueries.length}개`);
            console.log('='.repeat(80));
            
            for (let i = 0; i < enabledQueries.length; i++) {
                const queryConfig = enabledQueries[i];
                console.log(`\n${i + 1}. 쿼리 ID: ${queryConfig.id}`);
                console.log(`   설명: ${queryConfig.description || '설명 없음'}`);
                console.log(`   대상 테이블: ${queryConfig.targetTable}`);
                
                try {
                    const rowCount = await this.queryProcessor.estimateQueryRowCount(queryConfig, this.queryFilePath);
                    totalRows += rowCount;
                    totalQueries++;
                    
                    console.log(`   📊 이관 예정 데이터: ${rowCount.toLocaleString()}행`);
                    
                    results.push({
                        id: queryConfig.id,
                        targetTable: queryConfig.targetTable,
                        rowCount: rowCount,
                        status: 'success'
                    });
                    
                    console.log(`   ✅ 시뮬레이션 성공`);
                    
                } catch (error) {
                    console.log(`   ❌ 시뮬레이션 실패: ${error.message}`);
                    results.push({
                        id: queryConfig.id,
                        targetTable: queryConfig.targetTable,
                        rowCount: 0,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            // 결과 요약
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const successCount = results.filter(r => r.status === 'success').length;
            const failureCount = results.filter(r => r.status === 'error').length;
            
            console.log('\n' + '='.repeat(80));
            console.log('🎯 DRY RUN 시뮬레이션 결과 요약');
            console.log('='.repeat(80));
            console.log(`⏱️  실행 시간: ${duration}초`);
            console.log(`📊 총 쿼리 수: ${totalQueries}개`);
            console.log(`📈 총 이관 예정 데이터: ${totalRows.toLocaleString()}행`);
            console.log(`✅ 성공한 쿼리: ${successCount}개`);
            console.log(`❌ 실패한 쿼리: ${failureCount}개`);
            
            if (failureCount > 0) {
                console.log('\n❌ 실패한 쿼리 목록:');
                results.filter(r => r.status === 'error').forEach(r => {
                    console.log(`  • ${r.id} (${r.targetTable}): ${r.error}`);
                });
            }
            
            console.log('\n💡 참고: DRY RUN 모드에서는 실제 데이터 변경이 일어나지 않습니다.');
            
            return {
                success: failureCount === 0,
                totalQueries,
                totalRows,
                successCount,
                failureCount,
                duration: parseFloat(duration),
                results
            };
            
        } catch (error) {
            console.error('❌ DRY RUN 실행 중 오류:', error.message);
            return {
                success: false,
                error: error.message,
                totalQueries: 0,
                totalRows: 0,
                successCount: 0,
                failureCount: 1,
                duration: ((Date.now() - startTime) / 1000).toFixed(2),
                results: []
            };
        } finally {
            await this.connectionManager.closeConnections();
        }
    }

    /**
     * 설정 검증
     */
    async validateConfiguration() {
        try {
            await this.loadConfig();
            
            // 허용되는 속성명 정의
            const validQueryAttributes = [
                'id', 'description', 'enabled', 'sourceQuery', 'sourceQueryFile', 
                'targetTable', 'targetColumns', 'identityColumns', 'batchSize',
                'deleteBeforeInsert', 'sourceQueryDeleteBeforeInsert', 
                'sourceQueryApplyGlobalColumns', 'applyGlobalColumns',
                'preProcess', 'postProcess', 'columnOverrides'
            ];
            
            const validDynamicVarAttributes = [
                'id', 'description', 'variableName', 'extractType', 'database',
                'enabled', 'columns', 'columnName'
            ];
            
            const validSettingsAttributes = [
                'sourceDatabase', 'targetDatabase', 'batchSize', 'deleteBeforeInsert'
            ];
            
            const validPrePostProcessAttributes = [
                'script', 'runInTransaction', 'database', 'description', 'applyGlobalColumns'
            ];
            
            const validGlobalProcessGroupAttributes = [
                'id', 'description', 'enabled'
            ];
            
            if (!this.config.settings) {
                const requiredEnvVars = [
                    'SOURCE_DB_SERVER', 'SOURCE_DB_DATABASE', 'SOURCE_DB_USER', 'SOURCE_DB_PASSWORD',
                    'TARGET_DB_SERVER', 'TARGET_DB_DATABASE', 'TARGET_DB_USER', 'TARGET_DB_PASSWORD'
                ];
                
                const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
                if (missingVars.length > 0) {
                    throw new Error(`필수 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`);
                }
            } else {
                // settings 속성명 검증
                const invalidSettingsAttrs = Object.keys(this.config.settings).filter(
                    attr => !validSettingsAttributes.includes(attr)
                );
                if (invalidSettingsAttrs.length > 0) {
                    console.warn(`⚠️ settings에 알 수 없는 속성이 있습니다: ${invalidSettingsAttrs.join(', ')}`);
                    console.warn(`   허용되는 속성: ${validSettingsAttributes.join(', ')}`);
                }
            }
            
            // dynamicVariables 속성명 검증
            if (this.config.dynamicVariables && Array.isArray(this.config.dynamicVariables)) {
                for (let i = 0; i < this.config.dynamicVariables.length; i++) {
                    const dynVar = this.config.dynamicVariables[i];
                    const invalidAttrs = Object.keys(dynVar).filter(
                        attr => !validDynamicVarAttributes.includes(attr) && attr !== 'query'
                    );
                    
                    if (invalidAttrs.length > 0) {
                        console.error(`❌ dynamicVariables[${i}] (id: ${dynVar.id || '미지정'})에 잘못된 속성이 있습니다: ${invalidAttrs.join(', ')}`);
                        console.error(`   허용되는 속성: ${validDynamicVarAttributes.join(', ')}`);
                        throw new Error(`dynamicVariables에 잘못된 속성명이 있습니다: ${invalidAttrs.join(', ')}`);
                    }
                }
            }
            
            // queries 속성명 검증
            const allQueries = this.config.queries || [];
            const enabledQueries = allQueries.filter(q => q.enabled !== false);
            
            if (enabledQueries.length === 0) {
                console.log('⚠️ 활성화된 쿼리가 없습니다. (쿼리문정의 파일 구조 검증은 성공)');
            }
            
            for (let i = 0; i < allQueries.length; i++) {
                const query = allQueries[i];
                
                // 속성명 검증
                const invalidAttrs = Object.keys(query).filter(
                    attr => !validQueryAttributes.includes(attr)
                );
                
                if (invalidAttrs.length > 0) {
                    console.error(`❌ queries[${i}] (id: ${query.id || '미지정'})에 잘못된 속성이 있습니다: ${invalidAttrs.join(', ')}`);
                    console.error(`   허용되는 속성: ${validQueryAttributes.join(', ')}`);
                    throw new Error(`쿼리에 잘못된 속성명이 있습니다: ${invalidAttrs.join(', ')}`);
                }
                
                // 필수 속성 검증
                if (!query.id) {
                    throw new Error(`queries[${i}]에 id 속성이 없습니다.`);
                }
                
                if (!query.sourceQuery && !query.sourceQueryFile) {
                    throw new Error(`쿼리 '${query.id}'에 sourceQuery 또는 sourceQueryFile이 없습니다.`);
                }
                
                if (!query.targetTable) {
                    throw new Error(`쿼리 '${query.id}'에 targetTable 속성이 없습니다.`);
                }
                
                // preProcess/postProcess 속성명 검증
                if (query.preProcess) {
                    const invalidPreAttrs = Object.keys(query.preProcess).filter(
                        attr => !validPrePostProcessAttributes.includes(attr)
                    );
                    if (invalidPreAttrs.length > 0) {
                        console.error(`❌ 쿼리 '${query.id}'의 preProcess에 잘못된 속성이 있습니다: ${invalidPreAttrs.join(', ')}`);
                        console.error(`   허용되는 속성: ${validPrePostProcessAttributes.join(', ')}`);
                        throw new Error(`preProcess에 잘못된 속성명이 있습니다: ${invalidPreAttrs.join(', ')}`);
                    }
                }
                
                if (query.postProcess) {
                    const invalidPostAttrs = Object.keys(query.postProcess).filter(
                        attr => !validPrePostProcessAttributes.includes(attr)
                    );
                    if (invalidPostAttrs.length > 0) {
                        console.error(`❌ 쿼리 '${query.id}'의 postProcess에 잘못된 속성이 있습니다: ${invalidPostAttrs.join(', ')}`);
                        console.error(`   허용되는 속성: ${validPrePostProcessAttributes.join(', ')}`);
                        throw new Error(`postProcess에 잘못된 속성명이 있습니다: ${invalidPostAttrs.join(', ')}`);
                    }
                }
            }
            
            // globalProcesses 속성명 검증
            if (this.config.globalProcesses) {
                if (this.config.globalProcesses.preProcessGroups) {
                    for (let i = 0; i < this.config.globalProcesses.preProcessGroups.length; i++) {
                        const group = this.config.globalProcesses.preProcessGroups[i];
                        const invalidAttrs = Object.keys(group).filter(
                            attr => !validGlobalProcessGroupAttributes.includes(attr) && attr !== 'script'
                        );
                        
                        if (invalidAttrs.length > 0) {
                            console.error(`❌ preProcessGroups[${i}] (id: ${group.id || '미지정'})에 잘못된 속성이 있습니다: ${invalidAttrs.join(', ')}`);
                            console.error(`   허용되는 속성: ${validGlobalProcessGroupAttributes.join(', ')}, script`);
                            throw new Error(`preProcessGroups에 잘못된 속성명이 있습니다: ${invalidAttrs.join(', ')}`);
                        }
                    }
                }
                
                if (this.config.globalProcesses.postProcessGroups) {
                    for (let i = 0; i < this.config.globalProcesses.postProcessGroups.length; i++) {
                        const group = this.config.globalProcesses.postProcessGroups[i];
                        const invalidAttrs = Object.keys(group).filter(
                            attr => !validGlobalProcessGroupAttributes.includes(attr) && attr !== 'script'
                        );
                        
                        if (invalidAttrs.length > 0) {
                            console.error(`❌ postProcessGroups[${i}] (id: ${group.id || '미지정'})에 잘못된 속성이 있습니다: ${invalidAttrs.join(', ')}`);
                            console.error(`   허용되는 속성: ${validGlobalProcessGroupAttributes.join(', ')}, script`);
                            throw new Error(`postProcessGroups에 잘못된 속성명이 있습니다: ${invalidAttrs.join(', ')}`);
                        }
                    }
                }
            }
            
            console.log('✅ 설정 검증 완료');
            console.log(`   - 전체 쿼리 수: ${allQueries.length}`);
            console.log(`   - 활성화된 쿼리 수: ${enabledQueries.length}`);
            if (this.config.dynamicVariables) {
                console.log(`   - 동적 변수 수: ${this.config.dynamicVariables.length}`);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ 설정 검증 실패:', error.message);
            return false;
        }
    }

    /**
     * 개별 DB 연결 테스트
     */
    async testSingleDbConnection(dbConfig) {
        const sql = require('mssql');
        let pool = null;
        
        try {
            pool = new sql.ConnectionPool(dbConfig);
            await pool.connect();
            await pool.close();
            
            return {
                success: true,
                message: '연결 성공',
                responseTime: null
            };
        } catch (error) {
            if (pool) {
                try {
                    await pool.close();
                } catch (closeError) {
                    // 무시
                }
            }
            
            return {
                success: false,
                message: error.message,
                error: error.code || 'UNKNOWN_ERROR'
            };
        }
    }

    /**
     * 현재 쿼리 조회
     */
    getCurrentQuery() {
        return this.currentQuery;
    }
}

module.exports = MSSQLDataMigrator;

