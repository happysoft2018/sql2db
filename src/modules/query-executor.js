const logger = require('../logger');

/**
 * 쿼리 실행 관리 모듈
 * 데이터 마이그레이션 쿼리 실행을 담당
 */
class QueryExecutor {
    constructor(connectionManager, variableManager) {
        this.connectionManager = connectionManager;
        this.variableManager = variableManager;
        this.enableTransaction = process.env.ENABLE_TRANSACTION === 'true';
        this.dryRun = false;
        this.tableColumnCache = {};
    }

    /**
     * DRY RUN 모드 설정
     * @param {boolean} dryRun - DRY RUN 모드 여부
     */
    setDryRun(dryRun) {
        this.dryRun = dryRun;
    }

    /**
     * 단일 쿼리 실행
     * @param {Object} queryConfig - 쿼리 설정
     * @param {Object} progressManager - 진행 상황 관리자
     * @returns {Promise<Object>} 실행 결과
     */
    async executeQuery(queryConfig, progressManager = null) {
        const startTime = Date.now();
        
        try {
            logger.info(`쿼리 실행 시작: ${queryConfig.id}`, {
                sourceDb: queryConfig.sourceDb,
                targetDb: queryConfig.targetDb,
                targetTable: queryConfig.targetTable,
                dryRun: this.dryRun
            });

            // 변수 치환된 소스 쿼리
            const processedSourceQuery = this.variableManager.replaceVariables(queryConfig.sourceQuery);
            
            // 소스 쿼리 검증
            const validation = this.validateSingleSqlStatement(processedSourceQuery);
            if (!validation.isValid) {
                throw new Error(`소스 쿼리 검증 실패: ${validation.message}`);
            }

            // 소스 데이터 조회
            const sourcePool = await this.connectionManager.getConnection(queryConfig.sourceDb);
            const sourceRequest = sourcePool.request();
            
            logger.info(`소스 데이터 조회 중: ${queryConfig.id}`);
            const sourceResult = await sourceRequest.query(processedSourceQuery);
            
            if (!sourceResult.recordset || sourceResult.recordset.length === 0) {
                logger.warn(`소스 쿼리 결과가 비어있습니다: ${queryConfig.id}`);
                return {
                    success: true,
                    queryId: queryConfig.id,
                    sourceRows: 0,
                    insertedRows: 0,
                    executionTime: Date.now() - startTime,
                    message: '소스 데이터가 없습니다.'
                };
            }

            const sourceRows = sourceResult.recordset;
            logger.info(`소스 데이터 조회 완료: ${queryConfig.id}`, {
                rowCount: sourceRows.length
            });

            if (this.dryRun) {
                logger.info(`DRY RUN 모드: 실제 데이터 삽입을 건너뜁니다.`, {
                    queryId: queryConfig.id,
                    wouldInsertRows: sourceRows.length
                });
                
                return {
                    success: true,
                    queryId: queryConfig.id,
                    sourceRows: sourceRows.length,
                    insertedRows: 0,
                    executionTime: Date.now() - startTime,
                    message: 'DRY RUN 모드로 실행됨'
                };
            }

            // 타겟 테이블에 데이터 삽입
            const insertedRows = await this.insertDataToTarget(
                queryConfig,
                sourceRows,
                progressManager
            );

            const executionTime = Date.now() - startTime;
            
            logger.info(`쿼리 실행 완료: ${queryConfig.id}`, {
                sourceRows: sourceRows.length,
                insertedRows: insertedRows,
                executionTime: `${executionTime}ms`
            });

            return {
                success: true,
                queryId: queryConfig.id,
                sourceRows: sourceRows.length,
                insertedRows: insertedRows,
                executionTime: executionTime,
                message: '성공적으로 실행됨'
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            logger.error(`쿼리 실행 실패: ${queryConfig.id}`, error);
            
            return {
                success: false,
                queryId: queryConfig.id,
                sourceRows: 0,
                insertedRows: 0,
                executionTime: executionTime,
                error: error.message,
                message: '실행 중 오류 발생'
            };
        }
    }

    /**
     * 타겟 테이블에 데이터 삽입
     * @param {Object} queryConfig - 쿼리 설정
     * @param {Array} sourceRows - 소스 데이터
     * @param {Object} progressManager - 진행 상황 관리자
     * @returns {Promise<number>} 삽입된 행 수
     */
    async insertDataToTarget(queryConfig, sourceRows, progressManager = null) {
        const targetPool = await this.connectionManager.getConnection(queryConfig.targetDb);
        let transaction = null;
        let insertedRows = 0;

        try {
            // 트랜잭션 시작
            if (this.enableTransaction) {
                transaction = new targetPool.transaction();
                await transaction.begin();
                logger.info(`트랜잭션 시작: ${queryConfig.id}`);
            }

            // 테이블 truncate (필요한 경우)
            if (queryConfig.truncateTarget) {
                await this.truncateTargetTable(queryConfig, targetPool, transaction);
            }

            // 테이블 컬럼 정보 조회
            const targetColumns = await this.getTableColumns(queryConfig.targetDb, queryConfig.targetTable);
            
            // 배치 단위로 데이터 삽입
            const batchSize = queryConfig.batchSize || 1000;
            const totalBatches = Math.ceil(sourceRows.length / batchSize);

            for (let i = 0; i < totalBatches; i++) {
                const batchStart = i * batchSize;
                const batchEnd = Math.min(batchStart + batchSize, sourceRows.length);
                const batch = sourceRows.slice(batchStart, batchEnd);

                const batchInsertedRows = await this.insertBatch(
                    queryConfig,
                    batch,
                    targetColumns,
                    targetPool,
                    transaction
                );

                insertedRows += batchInsertedRows;

                // 진행 상황 업데이트
                if (progressManager) {
                    const progress = Math.round(((i + 1) / totalBatches) * 100);
                    progressManager.updateProgress(queryConfig.id, progress, insertedRows);
                }

                logger.info(`배치 삽입 완료: ${queryConfig.id}`, {
                    batch: `${i + 1}/${totalBatches}`,
                    batchRows: batchInsertedRows,
                    totalInserted: insertedRows
                });
            }

            // 트랜잭션 커밋
            if (this.enableTransaction && transaction) {
                await transaction.commit();
                logger.info(`트랜잭션 커밋: ${queryConfig.id}`);
            }

            return insertedRows;

        } catch (error) {
            // 트랜잭션 롤백
            if (this.enableTransaction && transaction) {
                try {
                    await transaction.rollback();
                    logger.info(`트랜잭션 롤백: ${queryConfig.id}`);
                } catch (rollbackError) {
                    logger.error(`트랜잭션 롤백 실패: ${queryConfig.id}`, rollbackError);
                }
            }
            throw error;
        }
    }

    /**
     * 배치 데이터 삽입
     * @param {Object} queryConfig - 쿼리 설정
     * @param {Array} batch - 배치 데이터
     * @param {Array} targetColumns - 타겟 컬럼 정보
     * @param {Object} targetPool - 타겟 연결 풀
     * @param {Object} transaction - 트랜잭션 객체
     * @returns {Promise<number>} 삽입된 행 수
     */
    async insertBatch(queryConfig, batch, targetColumns, targetPool, transaction = null) {
        if (batch.length === 0) return 0;

        // INSERT 쿼리 생성
        const insertQuery = this.buildInsertQuery(queryConfig, batch[0], targetColumns);
        
        const request = transaction ? transaction.request() : targetPool.request();
        
        // 파라미터 바인딩
        batch.forEach((row, rowIndex) => {
            Object.keys(row).forEach(column => {
                const paramName = `param_${rowIndex}_${column}`;
                const value = this.processColumnValue(row[column], queryConfig, column);
                request.input(paramName, value);
            });
        });

        const result = await request.query(insertQuery);
        return result.rowsAffected[0] || 0;
    }

    /**
     * INSERT 쿼리 생성
     * @param {Object} queryConfig - 쿼리 설정
     * @param {Object} sampleRow - 샘플 행 데이터
     * @param {Array} targetColumns - 타겟 컬럼 정보
     * @returns {string} INSERT 쿼리
     */
    buildInsertQuery(queryConfig, sampleRow, targetColumns) {
        const columns = Object.keys(sampleRow);
        const columnList = columns.join(', ');
        
        // VALUES 절 생성 (배치 처리를 위해 동적으로 생성해야 함)
        // 실제 구현에서는 배치별로 별도 처리 필요
        const valuesList = `(@${columns.join(', @')})`;
        
        return `INSERT INTO ${queryConfig.targetTable} (${columnList}) VALUES ${valuesList}`;
    }

    /**
     * 컬럼 값 처리 (오버라이드 적용)
     * @param {*} value - 원본 값
     * @param {Object} queryConfig - 쿼리 설정
     * @param {string} columnName - 컬럼명
     * @returns {*} 처리된 값
     */
    processColumnValue(value, queryConfig, columnName) {
        // 컬럼 오버라이드 확인
        if (queryConfig.columnOverrides && queryConfig.columnOverrides.has(columnName)) {
            const overrideValue = queryConfig.columnOverrides.get(columnName);
            return this.variableManager.replaceVariables(overrideValue, { originalValue: value });
        }

        return value;
    }

    /**
     * 타겟 테이블 truncate
     * @param {Object} queryConfig - 쿼리 설정
     * @param {Object} targetPool - 타겟 연결 풀
     * @param {Object} transaction - 트랜잭션 객체
     */
    async truncateTargetTable(queryConfig, targetPool, transaction = null) {
        const truncateQuery = `TRUNCATE TABLE ${queryConfig.targetTable}`;
        const request = transaction ? transaction.request() : targetPool.request();
        
        await request.query(truncateQuery);
        logger.info(`테이블 truncate 완료: ${queryConfig.targetTable}`);
    }

    /**
     * 테이블 컬럼 정보 조회
     * @param {string} dbId - 데이터베이스 ID
     * @param {string} tableName - 테이블명
     * @returns {Promise<Array>} 컬럼 정보 배열
     */
    async getTableColumns(dbId, tableName) {
        const cacheKey = `${dbId}.${tableName}`;
        
        if (this.tableColumnCache[cacheKey]) {
            return this.tableColumnCache[cacheKey];
        }

        const pool = await this.connectionManager.getConnection(dbId);
        const request = pool.request();
        
        const query = `
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
        `;
        
        request.input('tableName', tableName);
        const result = await request.query(query);
        
        this.tableColumnCache[cacheKey] = result.recordset;
        return result.recordset;
    }

    /**
     * 단일 SQL 문 검증
     * @param {string} sourceQuery - 소스 쿼리
     * @returns {Object} 검증 결과
     */
    validateSingleSqlStatement(sourceQuery) {
        if (!sourceQuery || typeof sourceQuery !== 'string') {
            return { isValid: true, message: 'sourceQuery가 비어있거나 문자열이 아닙니다.' };
        }

        // 맨 마지막 세미콜론(;) 기호를 제거한다.
        sourceQuery = sourceQuery.trim().replace(/[;]+$/, '');

        // 세미콜론으로 구분된 문장 수 확인
        const semicolonMatches = sourceQuery.match(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/g);
        if (semicolonMatches) {
            return {
                isValid: false,
                message: `sourceQuery에는 세미콜론(;)이 허용되지 않습니다.(단 하나의 SELECT문만 허용)\n발견된 구분자: ${semicolonMatches.length}개의 세미콜론(;)`,
                statementCount: semicolonMatches.length
            };
        }

        // 주석 제거 후 실제 SQL 문 확인
        const cleanQuery = sourceQuery
            .replace(/--.*$/gm, '')  // 한 줄 주석 제거
            .replace(/\/\*[\s\S]*?\*\//g, '')  // 블록 주석 제거
            .trim();

        // INSERT, UPDATE, DELETE, CREATE, DROP, ALTER 등의 키워드 존재여부 확인
        const sqlKeywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'EXEC', 'EXECUTE'];
        let keywordCount = 0;
        let foundKeywords = [];

        sqlKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = cleanQuery.match(regex);
            if (matches) {
                keywordCount += matches.length;
                foundKeywords.push(`${keyword}: ${matches.length}개`);
            }
        });

        if (keywordCount > 0) {
            return {
                isValid: false,
                message: `sourceQuery에 SELECT 외 키워드는 허용되지 않습니다.\n발견된 SQL 키워드: ${foundKeywords.join(', ')}`,
                keywordCount: keywordCount
            };
        }

        return { isValid: true, message: 'sourceQuery가 단일 SQL 문으로 검증되었습니다.' };
    }
}

module.exports = QueryExecutor;
