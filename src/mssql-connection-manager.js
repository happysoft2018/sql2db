const sql = require('mssql');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const MetadataCache = require('./db/metadata-cache');
const PKDeleter = require('./db/pk-deleter');
const { getAppRoot } = require('./modules/paths');
const { format } = require('./modules/i18n');
const FKAnalyzer = require('./db/fk-analyzer');
const QueryExecutor = require('./db/query-executor');

 

// Language setting (using environment variable, default to English)
const LANGUAGE = process.env.LANGUAGE || 'en';

// Multilingual messages
const messages = {
    en: {
        dbinfoLoaded: 'dbinfo.json loaded: {count} DB configs',
        dbinfoNotFound: 'dbinfo.json file not found.',
        dbinfoLoadFailed: 'Failed to load dbinfo.json: {message}',
        dbConfigNotFound: 'Configuration for DB key \'{key}\' not found.',
        dbConnecting: 'Connecting to DB \'{key}\'... ({server}:{port}/{database})',
        dbConnectionSuccess: 'DB \'{key}\' connection successful!',
        dbConnectionFailed: 'DB \'{key}\' connection failed: {message}',
        dbQueryFailed: 'DB \'{key}\' query execution failed: {message}',
        dbDisconnected: 'DB \'{key}\' disconnected',
        dbDisconnectFailed: 'DB \'{key}\' disconnect failed: {message}',
        allDbsDisconnected: 'All DBs disconnected',
        dbDisconnectError: 'DB disconnect failed: {message}',
        sourceDbAlreadyConnected: 'Source database is already connected.',
        sourceDbConnecting: 'Connecting to source database... ({server}:{port}/{database})',
        sourceDbConnectionSuccess: 'Source database connection successful!',
        sourceDbConnectionFailed: 'Source database connection failed: {message}',
        targetDbAlreadyConnected: 'Target database is already connected.',
        targetDbConnecting: 'Connecting to target database... ({server}:{port}/{database})',
        targetDbConnectionSuccess: 'Target database connection successful!',
        targetDbConnectionFailed: 'Target database connection failed: {message}',
        sessionStarted: '{type} DB session started (temp table available)',
        sessionStartFailed: 'Session start failed ({db}): {message}',
        sessionNotStarted: '{type} DB session not started. Call beginSession() first.',
        sessionQueryFailed: 'Session query execution failed ({db}): {message}',
        sessionEnded: '{type} DB session ended',
        sessionEndFailed: 'Session end failed ({db}): {message}',
        transactionStarted: '{type} DB transaction started',
        transactionStartFailed: 'Transaction start failed: {message}',
        transactionCommitted: '{type} DB transaction committed',
        transactionCommitFailed: 'Transaction commit failed: {message}',
        transactionRolledBack: '{type} DB transaction rolled back',
        transactionRollbackFailed: 'Transaction rollback failed: {message}',
        sourceDb: 'Source',
        targetDb: 'Target',
        dbType: 'DB',
        insertSuccess: 'Data inserted into target DB: {table} - {count} rows',
        insertFailed: 'Data insertion failed: {message}',
        deleteSuccess: 'Data deleted from target DB: {table} - {count} rows',
        deleteFailed: 'Data deletion failed: {message}',
        tableColumnsLoaded: 'Table \'{table}\' columns loaded and cached: {count} columns',
        tableColumnsLoadFailed: 'Failed to load columns for table \'{table}\': {message}',
        tableColumnsCacheMiss: 'Table column cache miss: {table}, loading...',
        tableColumnsCacheHit: 'Table column cache hit: {table}',
        identityColumnFound: 'Identity column found for {table}: {column}',
        identityColumnNotFound: 'No identity column found for {table}',
        fkRelationsFound: 'FK relations found: {count}',
        fkRelationsCalculating: 'Calculating FK relations...',
        fkRelationsCalculated: 'FK relations calculated: {count} tables',
        tableDeletionOrder: 'Table deletion order: {tables}',
        tableDeletionOrderFailed: 'Failed to calculate table deletion order: {message}',
        sourceQueryFailed: 'Source database query execution failed: {message}',
        noDataToInsert: 'No data to insert.',
        targetInsertFailed: 'Target database insertion failed: {message}',
        cacheCleared: '🗑️ Table column cache cleared (excluding Identity columns)',
        cacheStats: '📊 Table column cache stats: {cachedTables} tables, {totalColumns} columns',
        cacheUsed: '📋 Using cached table column info: {table} ({db})',
        loadingColumns: '🔍 Loading table column info from {db} database: {table} - excluding Identity columns',
        cacheSaved: '💾 Table column info cached: {table} ({db}) - {count} columns',
        columnLoadFailed: 'Failed to load table column info ({table}): {message}',
        targetDb2: 'Target',
        noSourceData: 'No source data, skipping deletion for table {table}.',
        targetDbInfo: '🎯 [TARGET DB] Performing deletion on {server}/{database}',
        columnNameCorrected: 'ℹ️ identityColumns name auto-corrected: "{from}" → "{to}"',
        columnNotExists: '⚠️ Warning: identityColumns "{column}" does not exist in target table.',
        targetTableColumns: '   Target table columns: {columns}',
        noPkValues: '❌ No valid PK values, skipping deletion for table {table}.',
        identityColumnsInfo: '   identityColumns: {columns}',
        sourceDataRows: '   sourceData row count: {count}',
        firstRowColumns: '   First row columns: {columns}',
        pkExtracted: '✓ PK values extracted: {count} rows (identityColumns: {columns})',
        pkExtractedCorrected: '✓ PK values extracted: {count} rows (identityColumns: {from} → {to})',
        pkValues: '   PK values: {values}',
        pkValuesFirst10: '   PK values (first 10): {values}...',
        deletingChunk: 'Processing PK-based deletion chunk {current}/{total} ({count} rows)',
        deletingByPk: 'Deleting target table data by PK: {table} ({count} rows targeted)',
        deletingChunkExecute: 'Executing PK-based deletion chunk {current}/{total}...',
        deleteQuery: 'DELETE query: {query}',
        deletingPkValues: 'Target PK values for deletion: {values}',
        deletingPkValuesFirst5: 'Target PK values for deletion (first 5): {values}...',
        deleteComplete: 'Deletion complete: {count} rows deleted',
        chunkDeleteComplete: 'Chunk {current} deletion complete: {count} rows',
        targetTableEmpty: 'ℹ️ Target table is empty. No data to delete, proceeding with INSERT only.',
        noMatchingData: '⚠️ Target table has {totalRows} rows, but no matching data for source PK values ({count} values).',
        debugSampleQuery: '   [DEBUG] Sample PK query result: {count} rows',
        debugSamplePk: '   [DEBUG] Sample source PK: {value}',
        debugTargetPkSample: '   [DEBUG] Actual {column} samples in target: {values}',
        debugHint: '   For more details: Set LOG_LEVEL=DEBUG environment variable.',
        insertWillProceed: '   → INSERT will proceed normally.',
        noDeleteTarget: 'ℹ️ No deletion target ({message})',
        totalDeleted: 'Total deleted rows: {count}',
        pkDeleteFailed: 'Target database PK-based deletion failed: {message}',
        deletingAll: 'Deleting all data from target table: {query}',
        deletedRows: 'Deleted rows: {count}',
        deleteAllFailed: 'Target database full deletion failed: {message}',
        transactionBeginFailed: 'Transaction start failed: {message}',
        sourceDbClosed: 'Source database connection closed',
        targetDbClosed: 'Target database connection closed',
        closeConnectionError: 'Error closing database connections: {message}',
        fkQueryingDb: 'Querying FK relations in {db} DB...',
        fkFoundInDb: 'Found {count} FK relations in {db} DB',
        fkQueryFailed: '{db} FK relation query failed: {message}',
        calculatingDeletionOrder: 'Calculating table deletion order... (table count: {count})',
        relevantFkCount: 'Relevant FK relation count: {count}',
        calculatedDeletionOrder: 'Calculated table deletion order: {order}',
        circularRefDetected: '⚠️ Circular reference detected in tables: {tables}',
        circularRefWarning: 'These tables may require temporarily disabling FK constraints.',
        deletionOrderFailed: 'Failed to calculate table deletion order: {message}',
        togglingFk: '{action} FK constraints in {db} DB...',
        fkToggleComplete: 'FK constraints {action} complete in {db} DB',
        fkToggleFailed: 'FK constraint {action} failed: {message}',
        targetQueryFailed: 'Target DB query execution failed: {message}',
        sourceQueryExecuteFailed: 'Source DB query execution failed: {message}',
        fkEnable: 'Enabling',
        fkDisable: 'Disabling'
    },
    kr: {
        dbinfoLoaded: 'dbinfo.json 로드 완료: {count}개 DB 설정',
        dbinfoNotFound: 'dbinfo.json 파일을 찾을 수 없습니다.',
        dbinfoLoadFailed: 'dbinfo.json 로드 실패: {message}',
        dbConfigNotFound: 'DB 키 \'{key}\'에 대한 설정을 찾을 수 없습니다.',
        dbConnecting: 'DB \'{key}\'에 연결 중... ({server}:{port}/{database})',
        dbConnectionSuccess: 'DB \'{key}\' 연결 성공!',
        dbConnectionFailed: 'DB \'{key}\' 연결 실패: {message}',
        dbQueryFailed: 'DB \'{key}\' 쿼리 실행 실패: {message}',
        dbDisconnected: 'DB \'{key}\' 연결 해제 완료',
        dbDisconnectFailed: 'DB \'{key}\' 연결 해제 실패: {message}',
        allDbsDisconnected: '모든 DB 연결 해제 완료',
        dbDisconnectError: 'DB 연결 해제 실패: {message}',
        sourceDbAlreadyConnected: '소스 데이터베이스가 이미 연결되어 있습니다.',
        sourceDbConnecting: '소스 데이터베이스에 연결 중... ({server}:{port}/{database})',
        sourceDbConnectionSuccess: '소스 데이터베이스 연결 성공!',
        sourceDbConnectionFailed: '소스 데이터베이스 연결 실패: {message}',
        targetDbAlreadyConnected: '대상 데이터베이스가 이미 연결되어 있습니다.',
        targetDbConnecting: '대상 데이터베이스에 연결 중... ({server}:{port}/{database})',
        targetDbConnectionSuccess: '대상 데이터베이스 연결 성공!',
        targetDbConnectionFailed: '대상 데이터베이스 연결 실패: {message}',
        sessionStarted: '{type} DB 세션 시작됨 (temp 테이블 사용 가능)',
        sessionStartFailed: '세션 시작 실패 ({db}): {message}',
        sessionNotStarted: '{type} DB 세션이 시작되지 않았습니다. beginSession()을 먼저 호출하세요.',
        sessionQueryFailed: '세션 쿼리 실행 실패 ({db}): {message}',
        sessionEnded: '{type} DB 세션 종료됨',
        sessionEndFailed: '세션 종료 실패 ({db}): {message}',
        transactionStarted: '{type} DB 트랜잭션 시작됨',
        transactionStartFailed: '트랜잭션 시작 실패: {message}',
        transactionCommitted: '{type} DB 트랜잭션 커밋됨',
        transactionCommitFailed: '트랜잭션 커밋 실패: {message}',
        transactionRolledBack: '{type} DB 트랜잭션 롤백됨',
        transactionRollbackFailed: '트랜잭션 롤백 실패: {message}',
        sourceDb: '소스',
        targetDb: '대상',
        dbType: 'DB',
        insertSuccess: '대상 DB에 데이터 삽입 완료: {table} - {count}개 행',
        insertFailed: '데이터 삽입 실패: {message}',
        deleteSuccess: '대상 DB에서 데이터 삭제 완료: {table} - {count}개 행',
        deleteFailed: '데이터 삭제 실패: {message}',
        tableColumnsLoaded: '테이블 \'{table}\' 컬럼 정보 로드 및 캐시 완료: {count}개 컬럼',
        tableColumnsLoadFailed: '테이블 \'{table}\' 컬럼 로드 실패: {message}',
        tableColumnsCacheMiss: '테이블 컬럼 캐시 미스: {table}, 로딩 중...',
        tableColumnsCacheHit: '테이블 컬럼 캐시 히트: {table}',
        identityColumnFound: '{table}의 Identity 컬럼 발견: {column}',
        identityColumnNotFound: '{table}에 Identity 컬럼이 없습니다',
        fkRelationsFound: 'FK 관계 발견: {count}개',
        fkRelationsCalculating: 'FK 관계 분석 중...',
        fkRelationsCalculated: 'FK 관계 분석 완료: {count}개 테이블',
        tableDeletionOrder: '테이블 삭제 순서: {tables}',
        tableDeletionOrderFailed: '테이블 삭제 순서 계산 실패: {message}',
        sourceQueryFailed: '소스 데이터베이스 쿼리 실행 실패: {message}',
        noDataToInsert: '삽입할 데이터가 없습니다.',
        targetInsertFailed: '대상 데이터베이스 삽입 실패: {message}',
        cacheCleared: '🗑️ 테이블 컬럼 캐시 초기화 완료 (Identity Column 제외 적용)',
        cacheStats: '📊 테이블 컬럼 캐시 통계: {cachedTables}개 테이블, {totalColumns}개 컬럼',
        cacheUsed: '📋 캐시에서 테이블 컬럼 정보 사용: {table} ({db})',
        loadingColumns: '🔍 {db} 데이터베이스에서 테이블 컬럼 정보 조회: {table} - Identity Column 제외',
        cacheSaved: '💾 테이블 컬럼 정보 캐시 저장: {table} ({db}) - {count}개 컬럼',
        columnLoadFailed: '테이블 컬럼 정보 조회 실패 ({table}): {message}',
        targetDb2: '대상',
        noSourceData: '소스 데이터가 없어 {table} 테이블 삭제를 건너뜁니다.',
        targetDbInfo: '🎯 [TARGET DB] {server}/{database} 에서 삭제 작업 수행',
        columnNameCorrected: 'ℹ️ identityColumns 컬럼명 자동 보정: "{from}" → "{to}"',
        columnNotExists: '⚠️ 경고: identityColumns "{column}"이(가) 타겟 테이블에 존재하지 않습니다.',
        targetTableColumns: '   타겟 테이블 컬럼: {columns}',
        noPkValues: '❌ 유효한 PK 값이 없어 {table} 테이블 삭제를 건너뜁니다.',
        identityColumnsInfo: '   identityColumns: {columns}',
        sourceDataRows: '   sourceData 행 수: {count}',
        firstRowColumns: '   첫 번째 행의 컬럼: {columns}',
        pkExtracted: '✓ PK 값 추출 완료: {count}개 행 (identityColumns: {columns})',
        pkExtractedCorrected: '✓ PK 값 추출 완료: {count}개 행 (identityColumns: {from} → {to})',
        pkValues: '   PK 값: {values}',
        pkValuesFirst10: '   PK 값 (처음 10개): {values}...',
        deletingChunk: 'PK 기준 삭제 청크 {current}/{total} 처리 중 ({count}개 행)',
        deletingByPk: '대상 테이블 PK 기준 데이터 삭제 중: {table} ({count}개 행 대상)',
        deletingChunkExecute: 'PK 기준 삭제 청크 {current}/{total} 실행 중...',
        deleteQuery: 'DELETE 쿼리: {query}',
        deletingPkValues: '삭제 대상 PK 값: {values}',
        deletingPkValuesFirst5: '삭제 대상 PK 값 (처음 5개): {values}...',
        deleteComplete: '삭제 완료: {count}행 삭제됨',
        chunkDeleteComplete: '청크 {current} 삭제 완료: {count}행',
        targetTableEmpty: 'ℹ️ 타겟 테이블이 비어있습니다. 삭제할 데이터가 없으므로 INSERT만 진행합니다.',
        noMatchingData: '⚠️ 타겟 테이블에 {totalRows}행이 있지만, 소스 PK 값({count}개)과 일치하는 데이터가 없습니다.',
        debugSampleQuery: '   [DEBUG] 샘플 PK로 조회 결과: {count}행',
        debugSamplePk: '   [DEBUG] 샘플 소스 PK: {value}',
        debugTargetPkSample: '   [DEBUG] 타겟의 실제 {column} 샘플: {values}',
        debugHint: '   상세 정보를 보려면: LOG_LEVEL=DEBUG 환경 변수를 설정하세요.',
        insertWillProceed: '   → INSERT는 정상 진행됩니다.',
        noDeleteTarget: 'ℹ️ 삭제 대상 없음 ({message})',
        totalDeleted: '총 삭제된 행 수: {count}',
        pkDeleteFailed: '대상 데이터베이스 PK 기준 삭제 실패: {message}',
        deletingAll: '대상 테이블 전체 데이터 삭제 중: {query}',
        deletedRows: '삭제된 행 수: {count}',
        deleteAllFailed: '대상 데이터베이스 전체 삭제 실패: {message}',
        transactionBeginFailed: '트랜잭션 시작 실패: {message}',
        sourceDbClosed: '소스 데이터베이스 연결 종료',
        targetDbClosed: '대상 데이터베이스 연결 종료',
        closeConnectionError: '데이터베이스 연결 종료 중 오류: {message}',
        fkQueryingDb: '{db} DB의 FK 참조 관계 조회 중...',
        fkFoundInDb: '{db} DB에서 {count}개의 FK 관계 발견',
        fkQueryFailed: '{db} FK 관계 조회 실패: {message}',
        calculatingDeletionOrder: '테이블 삭제 순서 계산 중... (테이블 수: {count})',
        relevantFkCount: '관련 FK 관계 수: {count}',
        calculatedDeletionOrder: '계산된 테이블 삭제 순서: {order}',
        circularRefDetected: '⚠️ 순환 참조가 감지된 테이블들: {tables}',
        circularRefWarning: '이 테이블들은 FK 제약 조건을 일시적으로 비활성화해야 할 수 있습니다.',
        deletionOrderFailed: '테이블 삭제 순서 계산 실패: {message}',
        togglingFk: '{db} DB의 FK 제약 조건 {action} 중...',
        fkToggleComplete: '{db} DB의 FK 제약 조건 {action} 완료',
        fkToggleFailed: 'FK 제약 조건 {action} 실패: {message}',
        targetQueryFailed: '타겟 DB 쿼리 실행 실패: {message}',
        sourceQueryExecuteFailed: '소스 DB 쿼리 실행 실패: {message}',
        fkEnable: '활성화',
        fkDisable: '비활성화'
    }
};

const msg = messages[LANGUAGE] || messages.en;

class MSSQLConnectionManager {
    constructor() {
        this.sourcePool = null;
        this.targetPool = null;
        this.isSourceConnected = false;
        this.isTargetConnected = false;
        this.customSourceConfig = null;
        this.customTargetConfig = null;
        this.tableColumnCache = {}; // Table column information cache (deprecated: maintained in MetadataCache)
        
        // Session management attributes
        this.sourceSession = null;
        this.targetSession = null;
        this.sessionTransaction = null;
        
        // Attributes for all DB connections from dbinfo.json
        this.dbPools = {}; // Connection pool storage for each DB
        this.dbConnections = {}; // Connection status storage for each DB
        this.dbConfigs = null; // dbinfo.json configuration

        // Initialize helpers
        this.metadataCache = new MetadataCache({
            getPool: (isSource) => (isSource ? this.sourcePool : this.targetPool),
            ensureConnected: async (isSource) => (isSource ? this.connectSource() : this.connectTarget()),
            msg
        });

        this.pkDeleter = new PKDeleter({
            getTargetPool: () => this.targetPool,
            ensureTargetConnected: () => this.connectTarget(),
            getTableColumns: (tableName) => this.metadataCache.getTableColumns(tableName, false),
            msg
        });

        this.fkAnalyzer = new FKAnalyzer({
            getPool: (isSource) => (isSource ? this.sourcePool : this.targetPool),
            ensureConnected: async (isSource) => (isSource ? this.connectSource() : this.connectTarget()),
            msg
        });

        this.queryExecutor = new QueryExecutor({
            getSourcePool: () => this.sourcePool,
            getTargetPool: () => this.targetPool,
            ensureSourceConnected: () => this.connectSource(),
            ensureTargetConnected: () => this.connectTarget(),
            msg
        });
    }

    // Load DB configuration from dbinfo.json
    loadDBConfigs() {
        try {
            const appRoot = getAppRoot();
            const configPath = path.join(appRoot, 'config', 'dbinfo.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                this.dbConfigs = JSON.parse(configData);
                console.log(format(msg.dbinfoLoaded, { count: Object.keys(this.dbConfigs).length }));
                return this.dbConfigs;
            } else {
                console.warn(msg.dbinfoNotFound);
                return null;
            }
        } catch (error) {
            console.error(format(msg.dbinfoLoadFailed, { message: error.message }));
            return null;
        }
    }

    // Connect to specific DB
    async connectToDB(dbKey) {
        try {
            if (!this.dbConfigs) {
                this.loadDBConfigs();
            }
            
            if (!this.dbConfigs || !this.dbConfigs[dbKey]) {
                throw new Error(msg.dbConfigNotFound.replace('{key}', dbKey));
            }
            
            if (this.dbPools[dbKey] && this.dbConnections[dbKey]) {
                return this.dbPools[dbKey];
            }
            
            const dbConfig = this.dbConfigs[dbKey];
            const config = this.getDBConfig(dbConfig);
            
            console.log(format(msg.dbConnecting, { key: dbKey, server: config.server, port: config.port, database: config.database }));
            
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            
            this.dbPools[dbKey] = pool;
            this.dbConnections[dbKey] = true;
            
            console.log(format(msg.dbConnectionSuccess, { key: dbKey }));
            return pool;
            
        } catch (error) {
            console.error(format(msg.dbConnectionFailed, { key: dbKey, message: error.message }));
            throw new Error(format(msg.dbConnectionFailed, { key: dbKey, message: error.message }));
        }
    }

    // Execute query on specific DB
    async queryDB(dbKey, query) {
        try {
            const pool = await this.connectToDB(dbKey);
            const request = pool.request();
            const result = await request.query(query);
            return result.recordset || result;
        } catch (error) {
            console.error(format(msg.dbQueryFailed, { key: dbKey, message: error.message }));
            throw new Error(format(msg.dbQueryFailed, { key: dbKey, message: error.message }));
        }
    }

    // Return list of all available DB keys
    getAvailableDBKeys() {
        if (!this.dbConfigs) {
            this.loadDBConfigs();
        }
        
        if (!this.dbConfigs) {
            return [];
        }
        
        return Object.keys(this.dbConfigs);
    }

    // Disconnect specific DB
    async disconnectDB(dbKey) {
        try {
            if (this.dbPools[dbKey]) {
                await this.dbPools[dbKey].close();
                delete this.dbPools[dbKey];
                this.dbConnections[dbKey] = false;
                console.log(format(msg.dbDisconnected, { key: dbKey }));
            }
        } catch (error) {
            console.error(format(msg.dbDisconnectFailed, { key: dbKey, message: error.message }));
        }
    }

    async disconnectAllDBs() {
        try {
            const dbKeys = Object.keys(this.dbPools);
            for (const dbKey of dbKeys) {
                await this.disconnectDB(dbKey);
            }
            console.log(msg.allDbsDisconnected);
        } catch (error) {
            console.error(format(msg.dbDisconnectError, { message: error.message }));
        }
    }

    // Set custom DB configuration
    setCustomDatabaseConfigs(sourceConfig, targetConfig) {
        this.customSourceConfig = sourceConfig;
        this.customTargetConfig = targetConfig;
    }

    // Get source database connection configuration
    getDBConfig(dbConfig) {

        return {
            server: dbConfig.server,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.user,
            password: dbConfig.password,
            options: {
                encrypt: dbConfig.options?.encrypt ?? true,
                trustServerCertificate: dbConfig.options?.trustServerCertificate ?? true,
                enableArithAbort: dbConfig.options?.enableArithAbort ?? true,
                requestTimeout: dbConfig.options?.requestTimeout ?? 300000,
                connectionTimeout: dbConfig.options?.connectionTimeout ?? 30000
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };
    }

    // Connect to source database
    async connectSource() {
        try {
            if (this.sourcePool && this.isSourceConnected) {
                console.log(msg.sourceDbAlreadyConnected);
                return this.sourcePool;
            }

            const config = this.getDBConfig(this.customSourceConfig);
            console.log(format(msg.sourceDbConnecting, { server: config.server, port: config.port, database: config.database }));
            
            this.sourcePool = new sql.ConnectionPool(config);
            await this.sourcePool.connect();
            this.isSourceConnected = true;
            
            console.log(msg.sourceDbConnectionSuccess);
            return this.sourcePool;
        } catch (error) {
            console.error(format(msg.sourceDbConnectionFailed, { message: error.message }));
            throw new Error(format(msg.sourceDbConnectionFailed, { message: error.message }));
        }
    }

    async connectTarget() {
        try {
            if (this.targetPool && this.isTargetConnected) {
                console.log(msg.targetDbAlreadyConnected);
                return this.targetPool;
            }

            const config = this.getDBConfig(this.customTargetConfig);
            console.log(format(msg.targetDbConnecting, { server: config.server, port: config.port, database: config.database }));
            
            this.targetPool = new sql.ConnectionPool(config);
            await this.targetPool.connect();
            this.isTargetConnected = true;
            
            console.log(msg.targetDbConnectionSuccess);
            return this.targetPool;
        } catch (error) {
            console.error(format(msg.targetDbConnectionFailed, { message: error.message }));
            throw new Error(format(msg.targetDbConnectionFailed, { message: error.message }));
        }
    }

    // Connect to both databases
    async connectBoth() {
        await this.connectSource();
        await this.connectTarget();
        return {
            source: this.sourcePool,
            target: this.targetPool
        };
    }

    // Start session (for temp table usage)
    async beginSession(database = 'target') {
        try {
            const pool = database === 'source' ? this.sourcePool : this.targetPool;
            const connectionType = database === 'source' ? msg.sourceDb : msg.targetDb;
            
            if (!pool) {
                if (database === 'source') {
                    await this.connectSource();
                } else {
                    await this.connectTarget();
                }
            }
            
            // Start session
            const session = pool.request();
            if (database === 'source') {
                this.sourceSession = session;
            } else {
                this.targetSession = session;
            }
            
            console.log(format(msg.sessionStarted, { type: connectionType }));
            return session;
            
        } catch (error) {
            console.error(format(msg.sessionStartFailed, { db: database, message: error.message }));
            throw new Error(format(msg.sessionStartFailed, { db: database, message: error.message }));
        }
    }

    // Execute query in session
    async executeQueryInSession(query, database = 'target') {
        try {
            const session = database === 'source' ? this.sourceSession : this.targetSession;
            const connectionType = database === 'source' ? msg.sourceDb : msg.targetDb;
            
            if (!session) {
                throw new Error(format(msg.sessionNotStarted, { type: connectionType }));
            }
            
            const result = await session.query(query);
            return result;
            
        } catch (error) {
            console.error(format(msg.sessionQueryFailed, { db: database, message: error.message }));
            throw new Error(format(msg.sessionQueryFailed, { db: database, message: error.message }));
        }
    }

    // End session
    async endSession(database = 'target') {
        try {
            const connectionType = database === 'source' ? msg.sourceDb : msg.targetDb;
            
            if (database === 'source') {
                this.sourceSession = null;
            } else {
                this.targetSession = null;
            }
            
            console.log(format(msg.sessionEnded, { type: connectionType }));
            
        } catch (error) {
            console.error(format(msg.sessionEndFailed, { db: database, message: error.message }));
            throw new Error(format(msg.sessionEndFailed, { db: database, message: error.message }));
        }
    }

    // Begin transaction
    async beginTransaction(database = 'target') {
        try {
            const session = database === 'source' ? this.sourceSession : this.targetSession;
            const connectionType = database === 'source' ? msg.sourceDb : msg.targetDb;
            
            if (!session) {
                throw new Error(format(msg.sessionNotStarted, { type: connectionType }));
            }
            
            this.sessionTransaction = await session.beginTransaction();
            console.log(format(msg.transactionStarted, { type: connectionType }));
            
        } catch (error) {
            console.error(format(msg.transactionStartFailed, { message: error.message }));
            throw new Error(format(msg.transactionStartFailed, { message: error.message }));
        }
    }

    // Commit transaction
    async commitTransaction() {
        try {
            if (this.sessionTransaction) {
                await this.sessionTransaction.commit();
                this.sessionTransaction = null;
                console.log(format(msg.transactionCommitted, { type: '' }));
            }
        } catch (error) {
            console.error(format(msg.transactionCommitFailed, { message: error.message }));
            throw new Error(format(msg.transactionCommitFailed, { message: error.message }));
        }
    }

    // Rollback transaction
    async rollbackTransaction() {
        try {
            if (this.sessionTransaction) {
                await this.sessionTransaction.rollback();
                this.sessionTransaction = null;
                console.log(format(msg.transactionRolledBack, { type: '' }));
            }
        } catch (error) {
            console.error(format(msg.transactionRollbackFailed, { message: error.message }));
            throw new Error(format(msg.transactionRollbackFailed, { message: error.message }));
        }
    }

    // Insert data into target database
    async insertToTarget(tableName, columns, data) {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }

            if (!data || data.length === 0) {
                console.log(msg.noDataToInsert);
                return { rowsAffected: [0] };
            }

            const request = this.targetPool.request();
            const placeholders = columns.map((_, index) => `@param${index}`).join(', ');
            const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            let totalRowsAffected = 0;

            for (const row of data) {
                columns.forEach((column, index) => {
                    request.input(`param${index}`, row[column]);
                });

                const result = await request.query(insertQuery);
                totalRowsAffected += result.rowsAffected[0];

                request.parameters = {};
            }

            return { rowsAffected: [totalRowsAffected] };
        } catch (error) {
            console.error(format(msg.targetInsertFailed, { message: error.message }));
            throw new Error(format(msg.targetInsertFailed, { message: error.message }));
        }
    }

    // Clear table column cache
    clearTableColumnCache() {
        // Backward-compatible wrapper
        this.metadataCache.clear();
        // Keep local field in sync for any legacy access
        this.tableColumnCache = {};
    }

    // Get table column cache statistics
    getTableColumnCacheStats() {
        return this.metadataCache.getStats();
    }

    // Query table column information (with caching)
    async getTableColumns(tableName, isSource = false) {
        return this.metadataCache.getTableColumns(tableName, isSource);
    }

    // Delete table data from target database (by PK)
    async deleteFromTargetByPK(tableName, identityColumns, sourceData) {
        return this.pkDeleter.deleteFromTargetByPK(tableName, identityColumns, sourceData);
    }

    // Delete all data from target table (used when considering FK order)
    async deleteAllFromTarget(tableName) {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }

            const request = this.targetPool.request();
            const deleteQuery = `DELETE FROM ${tableName}`;
            
            console.log(format(msg.deletingAll, { query: deleteQuery }));
            const result = await request.query(deleteQuery);
            
            console.log(format(msg.deletedRows, { count: result.rowsAffected[0] }));
            return result;
        } catch (error) {
            console.error(format(msg.deleteAllFailed, { message: error.message }));
            throw new Error(format(msg.deleteAllFailed, { message: error.message }));
        }
    }

    // Begin transaction
    async beginTransaction() {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }
            
            const transaction = new sql.Transaction(this.targetPool);
            await transaction.begin();
            return transaction;
        } catch (error) {
            console.error(format(msg.transactionBeginFailed, { message: error.message }));
            throw new Error(format(msg.transactionBeginFailed, { message: error.message }));
        }
    }

    // Close connections
    async closeConnections() {
        try {
            if (this.sourcePool && this.isSourceConnected) {
                await this.sourcePool.close();
                this.isSourceConnected = false;
                console.log(msg.sourceDbClosed);
            }
            
            if (this.targetPool && this.isTargetConnected) {
                await this.targetPool.close();
                this.isTargetConnected = false;
                console.log(msg.targetDbClosed);
            }
        } catch (error) {
            console.error(format(msg.closeConnectionError, { message: error.message }));
        }
    }

    // Check connection status
    getConnectionStatus() {
        return {
            source: this.isSourceConnected,
            target: this.isTargetConnected
        };
    }

    // Query FK relations between tables
    async getForeignKeyRelations(isSource = false) {
        return this.fkAnalyzer.getForeignKeyRelations(isSource);
    }

    // Calculate table deletion order (topological sort)
    async calculateTableDeletionOrder(tableNames, isSource = false) {
        return this.fkAnalyzer.calculateTableDeletionOrder(tableNames, isSource);
    }

    // FK 제약 조건 비활성화/활성화
    async toggleForeignKeyConstraints(enable = true, isSource = false) {
        return this.fkAnalyzer.toggleForeignKeyConstraints(enable, isSource);
    }

    // 타겟 데이터베이스에서 SQL 실행 (전처리/후처리용)
    async executeQueryOnTarget(query) {
        return this.queryExecutor.executeOnTarget(query);
    }

    // 소스 데이터베이스에서 SQL 실행 (전처리/후처리용)
    async executeQueryOnSource(query) {
        return this.queryExecutor.executeOnSource(query);
    }

    // 호환 래퍼: 소스 DB에서 데이터 배열 반환
    async querySource(query) {
        const result = await this.executeQueryOnSource(query);
        return (result && result.recordset) ? result.recordset : [];
    }

    // 호환 래퍼: 타겟 DB에서 데이터 배열 반환
    async queryTarget(query) {
        const result = await this.executeQueryOnTarget(query);
        return (result && result.recordset) ? result.recordset : [];
    }
}

module.exports = MSSQLConnectionManager; 