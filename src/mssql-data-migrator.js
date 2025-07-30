const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const MSSQLConnectionManager = require('./mssql-connection-manager');
require('dotenv').config();

class MSSQLDataMigrator {
    constructor(configPath, dbInfoPath) {
        this.configPath = configPath || path.join(__dirname, '../queries/migration-queries.json');
        this.dbInfoPath = dbInfoPath || path.join(__dirname, '../config/dbinfo.json');
        this.connectionManager = new MSSQLConnectionManager();
        this.config = null;
        this.dbInfo = null;
        this.variables = {};
        this.dynamicVariables = {}; // 동적 변수 저장소
        this.logFile = null;
        this.enableLogging = process.env.ENABLE_LOGGING === 'true';
        this.enableTransaction = process.env.ENABLE_TRANSACTION === 'true';
    }

    // DB 정보 파일 로드
    async loadDbInfo() {
        try {
            if (!fs.existsSync(this.dbInfoPath)) {
                console.log(`DB 정보 파일을 찾을 수 없습니다: ${this.dbInfoPath}`);
                console.log('환경 변수(.env)를 사용합니다.');
                return null;
            }

            const dbInfoData = fs.readFileSync(this.dbInfoPath, 'utf8');
            this.dbInfo = JSON.parse(dbInfoData);
            
            console.log('DB 정보 파일 로드 완료:', this.dbInfoPath);
            console.log('사용 가능한 DB 목록:', Object.keys(this.dbInfo.dbs || {}));
            
            return this.dbInfo;
        } catch (error) {
            console.error('DB 정보 파일 로드 실패:', error.message);
            console.log('환경 변수(.env)를 사용합니다.');
            return null;
        }
    }

    // DB ID로 연결 정보 조회
    getDbConfigById(dbId) {
        if (!this.dbInfo || !this.dbInfo.dbs || !this.dbInfo.dbs[dbId]) {
            throw new Error(`DB ID '${dbId}'를 dbinfo.json에서 찾을 수 없습니다. 사용 가능한 DB: ${Object.keys(this.dbInfo?.dbs || {}).join(', ')}`);
        }
        
        const dbConfig = this.dbInfo.dbs[dbId];
        return {
            id: dbId,
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
            }
        };
    }

    // 설정 파일 로드 및 파싱
    async loadConfig() {
        try {
            // DB 정보 파일 먼저 로드
            await this.loadDbInfo();
            
            if (!fs.existsSync(this.configPath)) {
                throw new Error(`설정 파일을 찾을 수 없습니다: ${this.configPath}`);
            }

            const configData = fs.readFileSync(this.configPath, 'utf8');
            
            // 파일 확장자로 형식 판단
            const isXmlFile = this.configPath.toLowerCase().endsWith('.xml');
            
            if (isXmlFile) {
                this.config = await this.parseXmlConfig(configData);
            } else {
                this.config = JSON.parse(configData);
            }
            
            this.variables = this.config.variables || {};
            
            // 설정 파일에 DB 설정이 있으면 연결 관리자에 적용
            if (this.config.databases) {
                console.log('설정 파일에서 DB 연결 정보를 발견했습니다.');
                
                let sourceConfig = null;
                let targetConfig = null;
                
                // DB ID 문자열인 경우 dbinfo.json에서 조회
                if (typeof this.config.databases.source === 'string') {
                    const sourceId = this.config.databases.source;
                    sourceConfig = this.getDbConfigById(sourceId);
                    console.log('소스 DB ID:', sourceId, '→', sourceConfig.database, '@', sourceConfig.server);
                } else if (this.config.databases.source) {
                    // 기존 방식 (직접 설정)
                    sourceConfig = this.config.databases.source;
                    console.log('소스 DB:', sourceConfig.database, '@', sourceConfig.server);
                }
                
                if (typeof this.config.databases.target === 'string') {
                    const targetId = this.config.databases.target;
                    targetConfig = this.getDbConfigById(targetId);
                    console.log('타겟 DB ID:', targetId, '→', targetConfig.database, '@', targetConfig.server);
                } else if (this.config.databases.target) {
                    // 기존 방식 (직접 설정)
                    targetConfig = this.config.databases.target;
                    console.log('타겟 DB:', targetConfig.database, '@', targetConfig.server);
                }
                
                this.connectionManager.setCustomDatabaseConfigs(sourceConfig, targetConfig);
            } else {
                console.log('환경 변수(.env)에서 DB 연결 정보를 사용합니다.');
            }
            
            console.log('설정 파일 로드 완료:', this.configPath);
            console.log('파일 형식:', isXmlFile ? 'XML' : 'JSON');
            console.log('정의된 변수:', this.variables);
            console.log('활성화된 쿼리 수:', this.config.queries.filter(q => q.enabled).length);
            
            return this.config;
        } catch (error) {
            console.error('설정 파일 로드 실패:', error.message);
            throw new Error(`설정 파일 로드 실패: ${error.message}`);
        }
    }

    // XML 설정 파일 파싱
    async parseXmlConfig(xmlData) {
        try {
            const parser = new xml2js.Parser({
                trim: true,
                explicitArray: false,
                ignoreAttrs: false,
                mergeAttrs: true
            });
            
            const result = await parser.parseStringPromise(xmlData);
            const migration = result.migration;
            
            const config = {
                databases: {},
                variables: {},
                dynamicVariables: [],
                queries: []
            };
            
            // 데이터베이스 설정 파싱
            if (migration.databases) {
                if (migration.databases.source) {
                    // 단순 문자열인 경우 DB ID로 처리
                    if (typeof migration.databases.source === 'string') {
                        config.databases.source = migration.databases.source;
                    } else {
                        // 기존 방식 (상세 설정 객체)
                        const source = migration.databases.source;
                        config.databases.source = {
                            id: source.id,
                            server: source.server,
                            port: parseInt(source.port) || 1433,
                            database: source.database,
                            user: source.user,
                            password: source.password,
                            options: {}
                        };
                        
                        // options 파싱
                        if (source.options) {
                            config.databases.source.options = {
                                encrypt: source.options.encrypt === 'true' || source.options.encrypt === true,
                                trustServerCertificate: source.options.trustServerCertificate === 'true' || source.options.trustServerCertificate === true,
                                enableArithAbort: source.options.enableArithAbort === 'true' || source.options.enableArithAbort === true,
                                requestTimeout: parseInt(source.options.requestTimeout) || 300000,
                                connectionTimeout: parseInt(source.options.connectionTimeout) || 30000
                            };
                        }
                    }
                }
                
                if (migration.databases.target) {
                    // 단순 문자열인 경우 DB ID로 처리
                    if (typeof migration.databases.target === 'string') {
                        config.databases.target = migration.databases.target;
                    } else {
                        // 기존 방식 (상세 설정 객체)
                        const target = migration.databases.target;
                        config.databases.target = {
                            id: target.id,
                            server: target.server,
                            port: parseInt(target.port) || 1433,
                            database: target.database,
                            user: target.user,
                            password: target.password,
                            options: {}
                        };
                        
                        // options 파싱
                        if (target.options) {
                            config.databases.target.options = {
                                encrypt: target.options.encrypt === 'true' || target.options.encrypt === true,
                                trustServerCertificate: target.options.trustServerCertificate === 'true' || target.options.trustServerCertificate === true,
                                enableArithAbort: target.options.enableArithAbort === 'true' || target.options.enableArithAbort === true,
                                requestTimeout: parseInt(target.options.requestTimeout) || 300000,
                                connectionTimeout: parseInt(target.options.connectionTimeout) || 30000
                            };
                        }
                    }
                }
            }
            
            // 전역 변수 파싱
            if (migration.variables && migration.variables.var) {
                const vars = Array.isArray(migration.variables.var) 
                    ? migration.variables.var 
                    : [migration.variables.var];
                    
                vars.forEach(v => {
                    if (v.name && v._) {
                        let value = v._;
                        // 배열 형태 문자열을 실제 배열로 변환
                        if (value.startsWith('[') && value.endsWith(']')) {
                            try {
                                value = JSON.parse(value);
                            } catch (e) {
                                // JSON 파싱 실패 시 문자열 그대로 사용
                            }
                        }
                        // boolean 값 처리
                        if (value === 'true') value = true;
                        if (value === 'false') value = false;
                        // 숫자 값 처리
                        if (!isNaN(value) && !isNaN(parseFloat(value))) {
                            value = parseFloat(value);
                        }
                        
                        config.variables[v.name] = value;
                    }
                });
            }
            
            // 동적 변수 파싱
            if (migration.dynamicVariables && migration.dynamicVariables.dynamicVar) {
                const dynamicVars = Array.isArray(migration.dynamicVariables.dynamicVar)
                    ? migration.dynamicVariables.dynamicVar
                    : [migration.dynamicVariables.dynamicVar];
                    
                dynamicVars.forEach(dv => {
                    const dynamicVar = {
                        id: dv.id,
                        description: dv.description,
                        variableName: dv.variableName,
                        query: dv._?.trim() || '',
                        extractType: dv.extractType,
                        enabled: dv.enabled === 'true'
                    };
                    
                    // extractType별 추가 속성
                    if (dv.columnName) dynamicVar.columnName = dv.columnName;
                    if (dv.columns) {
                        dynamicVar.columns = dv.columns.split(',').map(c => c.trim());
                    }
                    
                    config.dynamicVariables.push(dynamicVar);
                });
            }
            
            // 쿼리 파싱
            if (migration.queries && migration.queries.query) {
                const queries = Array.isArray(migration.queries.query)
                    ? migration.queries.query
                    : [migration.queries.query];
                    
                queries.forEach(q => {
                    const query = {
                        id: q.id,
                        description: q.description,
                        targetTable: q.targetTable,
                        targetColumns: q.targetColumns ? q.targetColumns.split(',').map(c => c.trim()) : [],
                        batchSize: q.batchSize,
                        primaryKey: q.primaryKey,
                        deleteBeforeInsert: q.deleteBeforeInsert === 'true',
                        enabled: q.enabled === 'true'
                    };
                    
                    // sourceQuery 또는 sourceQueryFile 처리
                    if (q.sourceQueryFile) {
                        query.sourceQueryFile = q.sourceQueryFile;
                    } else if (q.sourceQuery) {
                        query.sourceQuery = q.sourceQuery._.trim();
                    }
                    
                    // deleteWhere 처리
                    if (q.deleteWhere && q.deleteWhere._) {
                        query.deleteWhere = q.deleteWhere._.trim();
                    }
                    
                    config.queries.push(query);
                });
            }
            
            return config;
        } catch (error) {
            throw new Error(`XML 파싱 실패: ${error.message}`);
        }
    }

    // 로그 파일 초기화
    initializeLogging() {
        if (!this.enableLogging) return;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFileName = `migration-log-${timestamp}.txt`;
        this.logFile = path.join(__dirname, '../logs', logFileName);
        
        // logs 디렉토리 생성
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        this.log(`데이터 이관 시작: ${new Date().toISOString()}`);
    }

    // 로그 기록
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        console.log(logMessage);
        
        if (this.enableLogging && this.logFile) {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        }
    }

    // 변수 치환
    replaceVariables(text) {
        let result = text;
        
        // 동적 변수 치환 (우선순위 높음)
        Object.entries(this.dynamicVariables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            
            // 배열 타입인 경우 IN절 처리
            if (Array.isArray(value)) {
                const inClause = value.map(v => {
                    if (typeof v === 'string') {
                        return `'${v.replace(/'/g, "''")}'`;
                    }
                    return v;
                }).join(', ');
                result = result.replace(pattern, inClause);
            } else {
                result = result.replace(pattern, value);
            }
        });
        
        // 설정 파일의 변수 치환
        Object.entries(this.variables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            
            // 배열 타입인 경우 IN절 처리
            if (Array.isArray(value)) {
                // 문자열 배열인 경우 따옴표로 감싸기
                const inClause = value.map(v => {
                    if (typeof v === 'string') {
                        return `'${v.replace(/'/g, "''")}'`; // SQL 인젝션 방지를 위한 따옴표 이스케이핑
                    }
                    return v;
                }).join(', ');
                result = result.replace(pattern, inClause);
            } else {
                // 기존 방식: 단일 값 치환
                result = result.replace(pattern, value);
            }
        });
        
        // 환경 변수 치환 (BATCH_SIZE 등)
        const envPattern = /\$\{(\w+)\}/g;
        result = result.replace(envPattern, (match, varName) => {
            const envValue = process.env[varName];
            if (!envValue) return match;
            
            // 환경 변수가 배열 형태인지 확인 (JSON 형태로 저장된 경우)
            try {
                const parsed = JSON.parse(envValue);
                if (Array.isArray(parsed)) {
                    const inClause = parsed.map(v => {
                        if (typeof v === 'string') {
                            return `'${v.replace(/'/g, "''")}'`;
                        }
                        return v;
                    }).join(', ');
                    return inClause;
                }
                return envValue;
            } catch (e) {
                // JSON 파싱 실패 시 원본 값 사용
                return envValue;
            }
        });
        
        return result;
    }

    // 동적 변수 설정
    setDynamicVariable(key, value) {
        this.dynamicVariables[key] = value;
        this.log(`동적 변수 설정: ${key} = ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
    }

    // 소스 DB에서 데이터 추출하여 동적 변수로 설정
    async extractDataToVariable(extractConfig) {
        try {
            this.log(`\n=== 동적 변수 추출 시작: ${extractConfig.variableName} ===`);
            this.log(`추출 쿼리: ${extractConfig.query}`);
            
            // 변수 치환 적용
            const processedQuery = this.replaceVariables(extractConfig.query);
            this.log(`변수 치환 후 쿼리: ${processedQuery}`);
            
            // 소스 DB에서 데이터 조회
            const data = await this.connectionManager.querySource(processedQuery);
            this.log(`추출된 행 수: ${data.length}`);
            
            if (data.length === 0) {
                this.log(`⚠️ 추출된 데이터가 없습니다. 변수 ${extractConfig.variableName}는 빈 배열로 설정됩니다.`);
                this.setDynamicVariable(extractConfig.variableName, []);
                return [];
            }
            
            // 추출 타입에 따른 처리
            let extractedValue;
            
            switch (extractConfig.extractType) {
                case 'single_value':
                    // 첫 번째 행의 첫 번째 컬럼 값
                    const firstRow = data[0];
                    const firstColumn = Object.keys(firstRow)[0];
                    extractedValue = firstRow[firstColumn];
                    this.log(`단일 값 추출: ${extractedValue}`);
                    break;
                    
                case 'single_column':
                    // 지정된 컬럼의 모든 값을 배열로
                    const columnName = extractConfig.columnName || Object.keys(data[0])[0];
                    extractedValue = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
                    this.log(`단일 컬럼 추출 (${columnName}): ${extractedValue.length}개 값`);
                    break;
                    
                case 'multiple_columns':
                    // 지정된 여러 컬럼의 값들을 배열로
                    const columns = extractConfig.columns || Object.keys(data[0]);
                    extractedValue = [];
                    data.forEach(row => {
                        columns.forEach(col => {
                            if (row[col] !== null && row[col] !== undefined) {
                                extractedValue.push(row[col]);
                            }
                        });
                    });
                    this.log(`다중 컬럼 추출 (${columns.join(', ')}): ${extractedValue.length}개 값`);
                    break;
                    
                case 'key_value_pairs':
                    // 키-값 쌍으로 추출 (첫 번째 컬럼을 키, 두 번째 컬럼을 값으로)
                    const keys = Object.keys(data[0]);
                    if (keys.length < 2) {
                        throw new Error('key_value_pairs 타입은 최소 2개의 컬럼이 필요합니다.');
                    }
                    extractedValue = {};
                    data.forEach(row => {
                        const key = row[keys[0]];
                        const value = row[keys[1]];
                        if (key !== null && key !== undefined) {
                            extractedValue[key] = value;
                        }
                    });
                    this.log(`키-값 쌍 추출: ${Object.keys(extractedValue).length}개 쌍`);
                    break;
                    
                default:
                    // 기본값: 단일 컬럼 추출
                    const defaultColumn = Object.keys(data[0])[0];
                    extractedValue = data.map(row => row[defaultColumn]).filter(val => val !== null && val !== undefined);
                    this.log(`기본 추출 (${defaultColumn}): ${extractedValue.length}개 값`);
                    break;
            }
            
            // 동적 변수 설정
            this.setDynamicVariable(extractConfig.variableName, extractedValue);
            
            this.log(`=== 동적 변수 추출 완료: ${extractConfig.variableName} ===\n`);
            return extractedValue;
            
        } catch (error) {
            this.log(`동적 변수 추출 실패: ${extractConfig.variableName} - ${error.message}`);
            throw error;
        }
    }

    // FK 참조 순서를 고려한 삭제 처리
    async handleForeignKeyDeletions(enabledQueries) {
        try {
            // deleteBeforeInsert가 true인 쿼리들만 필터링
            const deletionQueries = enabledQueries.filter(q => q.deleteBeforeInsert);
            
            if (deletionQueries.length === 0) {
                this.log('삭제할 테이블이 없습니다.');
                return;
            }

            this.log(`\n=== FK 참조 순서를 고려한 삭제 처리 시작 ===`);
            
            // 삭제할 테이블 목록 추출
            const tablesToDelete = deletionQueries.map(q => q.targetTable);
            this.log(`삭제 대상 테이블: ${tablesToDelete.join(', ')}`);
            
            // 테이블 삭제 순서 계산
            const deletionOrder = await this.connectionManager.calculateTableDeletionOrder(tablesToDelete, false);
            
            if (deletionOrder.hasCircularReference) {
                this.log(`⚠️ 순환 참조 감지: ${deletionOrder.circularTables.join(', ')}`);
                this.log('FK 제약 조건을 일시적으로 비활성화합니다.');
                await this.connectionManager.toggleForeignKeyConstraints(false, false);
            }
            
            // 계산된 순서대로 테이블 삭제
            for (const tableName of deletionOrder.order) {
                const queryConfig = deletionQueries.find(q => q.targetTable === tableName);
                if (queryConfig && queryConfig.deleteWhere) {
                    this.log(`테이블 삭제 중: ${tableName}`);
                    
                    // 변수 치환 적용
                    const processedDeleteWhere = this.replaceVariables(queryConfig.deleteWhere);
                    
                    try {
                        await this.connectionManager.deleteFromTarget(tableName, processedDeleteWhere);
                    } catch (error) {
                        this.log(`⚠️ 테이블 ${tableName} 삭제 중 오류: ${error.message}`);
                        // 오류가 발생해도 계속 진행 (데이터가 없을 수 있음)
                    }
                }
            }
            
            // FK 제약 조건이 비활성화되었다면 다시 활성화
            if (deletionOrder.hasCircularReference) {
                this.log('FK 제약 조건을 다시 활성화합니다.');
                await this.connectionManager.toggleForeignKeyConstraints(true, false);
            }
            
            this.log(`=== FK 참조 순서를 고려한 삭제 처리 완료 ===\n`);
            
        } catch (error) {
            this.log(`FK 삭제 처리 중 오류: ${error.message}`);
            // 오류가 발생해도 이관 프로세스는 계속 진행
        }
    }

    // 쿼리 실행 및 데이터 조회
    async executeSourceQuery(query) {
        try {
            this.log(`소스 쿼리 실행: ${query}`);
            
            const data = await this.connectionManager.querySource(query);
            this.log(`조회된 행 수: ${data.length}`);
            
            return data;
        } catch (error) {
            this.log(`소스 쿼리 실행 실패: ${error.message}`);
            throw error;
        }
    }

    // 배치 단위로 데이터 삽입
    async insertDataInBatches(tableName, columns, data, batchSize) {
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
                insertedRows += result.rowsAffected[0];
                
                // 진행률 표시
                const progress = ((i + batch.length) / totalRows * 100).toFixed(1);
                this.log(`진행률: ${progress}% (${i + batch.length}/${totalRows})`);
            }
            
            this.log(`총 ${insertedRows}행 삽입 완료`);
            return insertedRows;
        } catch (error) {
            this.log(`배치 삽입 실패: ${error.message}`);
            throw error;
        }
    }

    // 외부 SQL 파일에서 쿼리 로드
    async loadQueryFromFile(filePath) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // 상대 경로인 경우 설정 파일 기준으로 해석
            const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(path.dirname(this.configPath), filePath);
            
            this.log(`SQL 파일에서 쿼리 로드 중: ${fullPath}`);
            const queryContent = await fs.readFile(fullPath, 'utf8');
            
            // 주석 제거 (-- 또는 /* */ 스타일)
            const cleanedQuery = queryContent
                .replace(/--.*$/gm, '')  // 한 줄 주석 제거
                .replace(/\/\*[\s\S]*?\*\//g, '')  // 블록 주석 제거
                .replace(/\s+/g, ' ')  // 여러 공백을 하나로
                .trim();
            
            if (!cleanedQuery) {
                throw new Error(`SQL 파일이 비어있거나 유효한 쿼리가 없습니다: ${filePath}`);
            }
            
            this.log(`SQL 파일 로드 완료: ${cleanedQuery.substring(0, 100)}${cleanedQuery.length > 100 ? '...' : ''}`);
            return cleanedQuery;
        } catch (error) {
            this.log(`SQL 파일 로드 실패: ${filePath} - ${error.message}`);
            throw new Error(`SQL 파일 로드 실패: ${error.message}`);
        }
    }

    // 쿼리 설정에서 SELECT * 처리 및 컬럼 자동 설정
    async processQueryConfig(queryConfig) {
        try {
            // SQL 파일에서 쿼리 로드
            if (queryConfig.sourceQueryFile) {
                this.log(`외부 SQL 파일 사용: ${queryConfig.sourceQueryFile}`);
                const fileQuery = await this.loadQueryFromFile(queryConfig.sourceQueryFile);
                
                // 변수 치환 적용
                queryConfig.sourceQuery = this.replaceVariables(fileQuery);
                this.log(`파일에서 로드된 쿼리 (변수 치환 후): ${queryConfig.sourceQuery.substring(0, 200)}${queryConfig.sourceQuery.length > 200 ? '...' : ''}`);
            } else if (queryConfig.sourceQuery) {
                // 기존 방식: sourceQuery 직접 사용
                queryConfig.sourceQuery = this.replaceVariables(queryConfig.sourceQuery);
            } else {
                throw new Error('sourceQuery 또는 sourceQueryFile 중 하나는 반드시 지정해야 합니다.');
            }
            
            // SELECT * 패턴 감지 (대소문자 무관, 공백 허용)
            const selectAllPattern = /SELECT\s+\*\s+FROM\s+(\w+)/i;
            const match = queryConfig.sourceQuery.match(selectAllPattern);
            
            if (match) {
                const tableName = match[1];
                this.log(`SELECT * 감지됨. 테이블 ${tableName}의 컬럼 정보를 자동으로 가져옵니다.`);
                
                // 대상 테이블의 컬럼 정보 조회
                const columns = await this.connectionManager.getTableColumns(queryConfig.targetTable, false);
                
                if (columns.length === 0) {
                    throw new Error(`대상 테이블 ${queryConfig.targetTable}의 컬럼 정보를 찾을 수 없습니다.`);
                }
                
                // targetColumns 자동 설정
                const columnNames = columns.map(col => col.name);
                queryConfig.targetColumns = columnNames;
                
                this.log(`자동 설정된 컬럼 목록 (${columnNames.length}개): ${columnNames.join(', ')}`);
                
                // sourceQuery도 컬럼명으로 변경 (옵션)
                const explicitColumns = columnNames.join(', ');
                queryConfig.sourceQuery = queryConfig.sourceQuery.replace(/SELECT\s+\*/i, `SELECT ${explicitColumns}`);
                this.log(`변경된 소스 쿼리: ${queryConfig.sourceQuery}`);
            }
            
            return queryConfig;
        } catch (error) {
            this.log(`쿼리 설정 처리 중 오류: ${error.message}`);
            throw error;
        }
    }

    // 개별 쿼리 이관 실행
    async executeQueryMigration(queryConfig) {
        try {
            this.log(`\n=== 쿼리 이관 시작: ${queryConfig.id} ===`);
            this.log(`설명: ${queryConfig.description}`);
            
            // 배치 크기 결정
            let batchSize = parseInt(process.env.BATCH_SIZE) || 1000;
            if (queryConfig.batchSize) {
                const processedBatchSize = this.replaceVariables(queryConfig.batchSize.toString());
                batchSize = parseInt(processedBatchSize) || batchSize;
            }
            
            // FK 순서 기능이 비활성화된 경우 개별적으로 삭제 처리
            if (queryConfig.deleteBeforeInsert && 
                (!this.config.variables || !this.config.variables.enableForeignKeyOrder)) {
                this.log(`이관 전 대상 테이블 데이터 삭제: ${queryConfig.targetTable}`);
                const processedDeleteWhere = this.replaceVariables(queryConfig.deleteWhere);
                await this.connectionManager.deleteFromTarget(queryConfig.targetTable, processedDeleteWhere);
            }
            
            // 소스 데이터 조회
            const sourceData = await this.executeSourceQuery(queryConfig.sourceQuery);
            
            if (sourceData.length === 0) {
                this.log('조회된 데이터가 없습니다. 이관을 건너뜁니다.');
                return { success: true, rowsProcessed: 0 };
            }
            
            // 데이터 삽입
            const insertedRows = await this.insertDataInBatches(
                queryConfig.targetTable,
                queryConfig.targetColumns,
                sourceData,
                batchSize
            );
            
            this.log(`=== 쿼리 이관 완료: ${queryConfig.id} (${insertedRows}행 처리) ===\n`);
            
            return { success: true, rowsProcessed: insertedRows };
        } catch (error) {
            this.log(`=== 쿼리 이관 실패: ${queryConfig.id} - ${error.message} ===\n`);
            return { success: false, error: error.message, rowsProcessed: 0 };
        }
    }

    // 전체 이관 프로세스 실행
    async executeMigration() {

        const startTime = Date.now();
        let duration = 0;
        let totalProcessed = 0;
        let successCount = 0;
        let failureCount = 0;
        const results = [];
        
        try {
            this.initializeLogging();
            this.log('MSSQL 데이터 이관 프로세스 시작');
            
            // 설정 파일 로드
            await this.loadConfig();
            
            // 데이터베이스 연결
            this.log('데이터베이스 연결 중...');
            await this.connectionManager.connectBoth();
            
            // 동적 변수 추출 실행
            if (this.config.dynamicVariables && this.config.dynamicVariables.length > 0) {
                this.log(`동적 변수 추출 시작: ${this.config.dynamicVariables.length}개`);
                
                for (const extractConfig of this.config.dynamicVariables) {
                    if (extractConfig.enabled !== false) {
                        await this.extractDataToVariable(extractConfig);
                    }
                }
                
                this.log('모든 동적 변수 추출 완료');
                this.log(`현재 동적 변수 목록: ${Object.keys(this.dynamicVariables).join(', ')}`);
            }
            
            // 활성화된 쿼리만 필터링
            const enabledQueries = this.config.queries.filter(query => query.enabled);
            this.log(`실행할 쿼리 수: ${enabledQueries.length}`);
            
            // FK 참조 순서를 고려한 삭제 처리 (옵션)
            if (this.config.variables && this.config.variables.enableForeignKeyOrder) {
                await this.handleForeignKeyDeletions(enabledQueries);
            } else {
                this.log('FK 순서 고려 기능이 비활성화되어 있습니다. 개별 쿼리에서 삭제를 처리합니다.');
            }
            
            // 트랜잭션 시작 (옵션)
            let transaction = null;
            if (this.enableTransaction) {
                this.log('트랜잭션 시작');
                transaction = await this.connectionManager.beginTransaction();
            }
            
            try {
                // 각 쿼리 실행
                for (const queryConfig of enabledQueries) {
                    // SELECT * 감지 및 자동 컬럼 설정
                    const processedQueryConfig = await this.processQueryConfig(queryConfig);
                    const result = await this.executeQueryMigration(processedQueryConfig);
                    results.push({
                        queryId: queryConfig.id,
                        description: queryConfig.description,
                        ...result
                    });
                    
                    totalProcessed += result.rowsProcessed;
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        failureCount++;
                        
                        // 트랜잭션 사용 시 실패하면 롤백
                        if (this.enableTransaction && transaction) {
                            this.log('오류 발생으로 인한 트랜잭션 롤백');
                            await transaction.rollback();
                            throw new Error(`쿼리 실행 실패: ${queryConfig.id}`);
                        }
                    }
                }
                
                // 트랜잭션 커밋
                if (this.enableTransaction && transaction) {
                    this.log('트랜잭션 커밋');
                    await transaction.commit();
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
            throw error;
            
        } finally {
            // 연결 정리
            await this.connectionManager.closeConnections();
            
            // 최종 결과 리포트
            const endTime = Date.now();
            duration = (endTime - startTime) / 1000;
            
            this.log('\n=== 이관 프로세스 완료 ===');
            this.log(`총 실행 시간: ${duration.toFixed(2)}초`);
            this.log(`성공한 쿼리: ${successCount}`);
            this.log(`실패한 쿼리: ${failureCount}`);
            this.log(`총 처리된 행: ${totalProcessed}`);
            
            // 각 쿼리별 결과
            this.log('\n=== 쿼리별 결과 ===');
            results.forEach(result => {
                const status = result.success ? '성공' : '실패';
                this.log(`${result.queryId}: ${status} (${result.rowsProcessed}행) - ${result.description}`);
                if (!result.success) {
                    this.log(`  오류: ${result.error}`);
                }
            });
            
            if (this.enableLogging) {
                this.log(`\n상세 로그는 다음 파일에서 확인하세요: ${this.logFile}`);
            }
        }
        
        return {
            success: failureCount === 0,
            duration,
            totalProcessed,
            successCount,
            failureCount,
            results
        };
    }

    // 설정 검증
    async validateConfiguration() {
        try {
            await this.loadConfig();
            
            // 필수 환경 변수 확인
            const requiredEnvVars = [
                'SOURCE_DB_SERVER', 'SOURCE_DB_DATABASE', 'SOURCE_DB_USER', 'SOURCE_DB_PASSWORD',
                'TARGET_DB_SERVER', 'TARGET_DB_DATABASE', 'TARGET_DB_USER', 'TARGET_DB_PASSWORD'
            ];
            
            const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
            if (missingVars.length > 0) {
                throw new Error(`필수 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`);
            }
            
            // 쿼리 설정 검증
            const enabledQueries = this.config.queries.filter(q => q.enabled);
            if (enabledQueries.length === 0) {
                throw new Error('활성화된 쿼리가 없습니다.');
            }
            
            for (const query of enabledQueries) {
                if (!query.id || (!query.sourceQuery && !query.sourceQueryFile) || !query.targetTable) {
                    throw new Error(`쿼리 설정이 불완전합니다: ${query.id || '이름 없음'}`);
                }
            }
            
            console.log('설정 검증 완료');
            return true;
            
        } catch (error) {
            console.error('설정 검증 실패:', error.message);
            return false;
        }
    }

    // 연결 테스트
    async testConnections() {
        try {
            console.log('데이터베이스 연결 테스트 중...');
            
            await this.connectionManager.connectSource();
            console.log('✓ 소스 데이터베이스 연결 성공');
            
            await this.connectionManager.connectTarget();
            console.log('✓ 대상 데이터베이스 연결 성공');
            
            await this.connectionManager.closeConnections();
            console.log('연결 테스트 완료');
            
            return true;
        } catch (error) {
            console.error('연결 테스트 실패:', error.message);
            return false;
        }
    }
}

module.exports = MSSQLDataMigrator;