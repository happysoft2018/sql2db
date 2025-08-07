const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const MSSQLConnectionManager = require('./mssql-connection-manager');
const ProgressManager = require('./progress-manager');
const logger = require('./logger');
require('dotenv').config();

class MSSQLDataMigrator {
    constructor(queryFilePath, dryRun = false) {
        // list-dbs 명령 등에서는 쿼리 파일이 필요하지 않을 수 있음
        this.queryFilePath = queryFilePath;
        this.dbInfoPath = path.join(__dirname, '../config/dbinfo.json');
        this.connectionManager = new MSSQLConnectionManager();
        this.config = null;
        this.dbInfo = null;
        this.variables = {};
        this.dynamicVariables = {}; // 동적 변수 저장소
        this.logFile = null;
        this.enableLogging = process.env.ENABLE_LOGGING === 'true';
        this.enableTransaction = process.env.ENABLE_TRANSACTION === 'true';
        this.dryRun = dryRun; // DRY RUN 모드
        this.progressManager = null; // 진행 상황 관리자
    }

    // DB 정보 파일 로드
    async loadDbInfo() {
        try {
            if (!fs.existsSync(this.dbInfoPath)) {
                logger.warn(`DB 정보 파일을 찾을 수 없습니다: ${this.dbInfoPath}`);
                return null;
            }

            const dbInfoData = fs.readFileSync(this.dbInfoPath, 'utf8');
            this.dbInfo = JSON.parse(dbInfoData);
            
            logger.info('DB 정보 파일 로드 완료', {
                path: this.dbInfoPath,
                availableDbs: Object.keys(this.dbInfo.dbs || {})
            });
            
            return this.dbInfo;
        } catch (error) {
            logger.error('DB 정보 파일 로드 실패', error);
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
            isWritable: dbConfig.isWritable ?? false, // 기본값은 읽기 전용
            description: dbConfig.description || `${dbId} 데이터베이스`,
            options: {
                encrypt: dbConfig.options?.encrypt ?? true,
                trustServerCertificate: dbConfig.options?.trustServerCertificate ?? true,
                enableArithAbort: dbConfig.options?.enableArithAbort ?? true,
                requestTimeout: dbConfig.options?.requestTimeout ?? 300000,
                connectionTimeout: dbConfig.options?.connectionTimeout ?? 30000
            }
        };
    }

    // 쿼리문정의 파일 로드 및 파싱
    async loadConfig() {
        try {
            // DB 정보 파일 먼저 로드
            await this.loadDbInfo();
            
            if (!fs.existsSync(this.queryFilePath)) {
                throw new Error(`쿼리문정의 파일 을 찾을 수 없습니다: ${this.queryFilePath}`);
            }

            const configData = fs.readFileSync(this.queryFilePath, 'utf8');
            
            // 파일 확장자로 형식 판단
            const isXmlFile = this.queryFilePath.toLowerCase().endsWith('.xml');
            
            if (isXmlFile) {
                this.config = await this.parseXmlConfig(configData);
            } else {
                this.config = JSON.parse(configData);
            }
            
            this.variables = this.config.variables || {};
            
            // 쿼리문정의 파일에 DB 설정이 있으면 연결 관리자에 적용
            if (this.config.settings) {
                logger.info('쿼리문정의 파일에서 DB 연결 정보를 발견했습니다.');
                
                let sourceConfig = null;
                let targetConfig = null;
                
                // DB ID 문자열인 경우 dbinfo.json에서 조회
                if (typeof this.config.settings.sourceDatabase === 'string') {
                    const sourceId = this.config.settings.sourceDatabase;
                    sourceConfig = this.getDbConfigById(sourceId);
                    logger.info('소스 DB 설정(DB ID)', sourceConfig);
                } else if (this.config.settings.sourceDatabase) {
                    // 기존 방식 (직접 설정)
                    sourceConfig = this.config.settings.sourceDatabase;
                    sourceConfig.description = sourceConfig.description || '직접 설정된 소스 데이터베이스';
                    logger.info('소스 DB 설정 (직접)', {
                        database: sourceConfig.database,
                        server: sourceConfig.server
                    });
                }
                
                if (typeof this.config.settings.targetDatabase === 'string') {
                    const targetId = this.config.settings.targetDatabase;
                    targetConfig = this.getDbConfigById(targetId);
                    
                    // 타겟 DB의 isWritable 속성 검증
                    if (!targetConfig.isWritable) {
                        throw new Error(`타겟 DB '${targetId}'는 읽기 전용 데이터베이스입니다. isWritable=true인 DB만 타겟으로 사용할 수 있습니다.\n` +
                                      `DB 설명: ${targetConfig.description}\n` +
                                      `쓰기 가능한 DB를 선택하거나 config/dbinfo.json에서 isWritable 속성을 true로 변경하세요.`);
                    }
                    
                    logger.info('타겟 DB 설정 (DB ID)', targetConfig);
                } else if (this.config.settings.targetDatabase) {
                    // 기존 방식 (직접 설정) - 기본적으로 쓰기 가능으로 간주
                    targetConfig = this.config.settings.targetDatabase;
                    targetConfig.isWritable = targetConfig.isWritable ?? true; // 명시되지 않은 경우 쓰기 가능으로 간주
                    targetConfig.description = targetConfig.description || '직접 설정된 타겟 데이터베이스';
                    logger.info('타겟 DB 설정 (직접)', {
                        database: targetConfig.database,
                        server: targetConfig.server,
                        isWritable: targetConfig.isWritable
                    });
                }
                
                this.connectionManager.setCustomDatabaseConfigs(sourceConfig, targetConfig);
            } else {
                logger.info('환경 변수(.env)에서 DB 연결 정보를 사용합니다.');
            }
            
            logger.info('쿼리문정의 파일 로드 완료', {
                path: this.queryFilePath,
                format: isXmlFile ? 'XML' : 'JSON',
                variables: this.variables,
                enabledQueries: this.config.queries.filter(q => q.enabled).length
            });
            
            return this.config;
        } catch (error) {
            logger.error('쿼리문정의 파일 로드 실패', error);
            throw new Error(`쿼리문정의 파일 로드 실패: ${error.message}`);
        }
    }

    // XML 쿼리문정의 파일 파싱
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
                settings: {},
                variables: {},
                dynamicVariables: [],
                globalProcesses: {},
                globalColumnOverrides: {}, // 전역 columnOverrides 추가
                queries: []
            };
            
            // 설정 파싱 (데이터베이스 연결 및 기본 설정)
            if (migration.settings) {
                // 데이터베이스 연결 설정
                if (migration.settings.sourceDatabase) {
                    // 단순 문자열인 경우 DB ID로 처리
                    if (typeof migration.settings.sourceDatabase === 'string') {
                        config.settings.sourceDatabase = migration.settings.sourceDatabase;
                    } else {
                        // 기존 방식 (상세 설정 객체)
                        const source = migration.settings.sourceDatabase;
                        config.settings.sourceDatabase = {
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
                            config.settings.sourceDatabase.options = {
                                encrypt: source.options.encrypt === 'true' || source.options.encrypt === true,
                                trustServerCertificate: source.options.trustServerCertificate === 'true' || source.options.trustServerCertificate === true,
                                enableArithAbort: source.options.enableArithAbort === 'true' || source.options.enableArithAbort === true,
                                requestTimeout: parseInt(source.options.requestTimeout) || 300000,
                                connectionTimeout: parseInt(source.options.connectionTimeout) || 30000
                            };
                        }
                    }
                }
                
                if (migration.settings.targetDatabase) {
                    // 단순 문자열인 경우 DB ID로 처리
                    if (typeof migration.settings.targetDatabase === 'string') {
                        config.settings.targetDatabase = migration.settings.targetDatabase;
                    } else {
                        // 기존 방식 (상세 설정 객체)
                        const target = migration.settings.targetDatabase;
                        config.settings.targetDatabase = {
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
                            config.settings.targetDatabase.options = {
                                encrypt: target.options.encrypt === 'true' || target.options.encrypt === true,
                                trustServerCertificate: target.options.trustServerCertificate === 'true' || target.options.trustServerCertificate === true,
                                enableArithAbort: target.options.enableArithAbort === 'true' || target.options.enableArithAbort === true,
                                requestTimeout: parseInt(target.options.requestTimeout) || 300000,
                                connectionTimeout: parseInt(target.options.connectionTimeout) || 30000
                            };
                        }
                    }
                }
                
                // 기본 이관 설정 파싱
                if (migration.settings.batchSize) {
                    config.settings.batchSize = migration.settings.batchSize;
                }
                if (migration.settings.deleteBeforeInsert) {
                    config.settings.deleteBeforeInsert = migration.settings.deleteBeforeInsert === 'true';
                }
            }
            
            // 전역 전처리/후처리 파싱
            if (migration.globalProcesses) {
                if (migration.globalProcesses.preProcess) {
                    config.globalProcesses.preProcess = {
                        description: migration.globalProcesses.preProcess.description || '전역 전처리',
                        script: migration.globalProcesses.preProcess._.trim()
                    };
                }
                if (migration.globalProcesses.postProcess) {
                    config.globalProcesses.postProcess = {
                        description: migration.globalProcesses.postProcess.description || '전역 후처리',
                        script: migration.globalProcesses.postProcess._.trim()
                    };
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
            
            // 전역 columnOverrides 파싱 추가
            if (migration.globalColumnOverrides && migration.globalColumnOverrides.override) {
                const globalOverrides = Array.isArray(migration.globalColumnOverrides.override) 
                    ? migration.globalColumnOverrides.override 
                    : [migration.globalColumnOverrides.override];
                
                globalOverrides.forEach(override => {
                    if (override.column && override._) {
                        config.globalColumnOverrides[override.column] = override._;
                    }
                });
                
                logger.info('전역 columnOverrides 로드됨', {
                    count: Object.keys(config.globalColumnOverrides).length,
                    columns: Object.keys(config.globalColumnOverrides)
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
                        batchSize: q.batchSize || config.settings.batchSize,  // 개별 설정이 없으면 글로벌 설정 사용
                        primaryKey: q.primaryKey,
                        deleteBeforeInsert: q.deleteBeforeInsert !== undefined ? (q.deleteBeforeInsert === 'true') : config.settings.deleteBeforeInsert,  // 개별 설정이 없으면 글로벌 설정 사용
                        enabled: q.enabled === 'true'
                    };
                    
                    // sourceQuery 또는 sourceQueryFile 처리
                    if (q.sourceQueryFile) {
                        query.sourceQueryFile = q.sourceQueryFile;
                    } else if (q.sourceQuery) {
                        // query.sourceQuery = q.sourceQuery._.trim();
                        query.sourceQuery = q.sourceQuery.trim();
                    }
                    
                    // columnOverrides 처리 (전역 + 개별 병합)
                    query.columnOverrides = { ...config.globalColumnOverrides }; // 전역 설정으로 시작
                    
                    if (q.columnOverrides && q.columnOverrides.override) {
                        const overrides = Array.isArray(q.columnOverrides.override) 
                            ? q.columnOverrides.override 
                            : [q.columnOverrides.override];
                        
                        overrides.forEach(override => {
                            if (override.column && override._) {
                                query.columnOverrides[override.column] = override._; // 개별 설정이 전역 설정을 덮어씀
                            }
                        });
                    }
                    
                    // columnOverrides 로깅 (개발/디버그용)
                    if (Object.keys(query.columnOverrides).length > 0) {
                        logger.debug(`[${query.id}] columnOverrides 적용됨`, {
                            columns: Object.keys(query.columnOverrides),
                            globalOverrides: Object.keys(config.globalColumnOverrides),
                            localOverrides: q.columnOverrides ? Object.keys(q.columnOverrides.override ? 
                                (Array.isArray(q.columnOverrides.override) ? q.columnOverrides.override : [q.columnOverrides.override])
                                .reduce((acc, o) => { if (o.column) acc.push(o.column); return acc; }, []) : []) : []
                        });
                    }
                    
                    // 개별 쿼리 전처리/후처리 파싱
                    if (q.preProcess) {
                        query.preProcess = {
                            description: q.preProcess.description || `${query.id} 전처리`,
                            script: q.preProcess._.trim()
                        };
                    }
                    if (q.postProcess) {
                        query.postProcess = {
                            description: q.postProcess.description || `${query.id} 후처리`,
                            script: q.postProcess._.trim()
                        };
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
            } 
            // 객체 타입인 경우 (column_identified 또는 key_value_pairs)
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // ${변수명.키} 패턴 처리 (column_identified와 key_value_pairs 모두 지원)
                Object.keys(value).forEach(keyName => {
                    const keyPattern = new RegExp(`\\$\\{${key}\\.${keyName}\\}`, 'g');
                    const keyValue = value[keyName];
                    
                    if (Array.isArray(keyValue)) {
                        // column_identified: 배열 값을 IN절로 변환
                        const inClause = keyValue.map(v => {
                            if (typeof v === 'string') {
                                return `'${v.replace(/'/g, "''")}'`;
                            }
                            return v;
                        }).join(', ');
                        result = result.replace(keyPattern, inClause);
                    } else {
                        // key_value_pairs: 단일 값을 그대로 치환
                        const replacementValue = typeof keyValue === 'string' ? `'${keyValue.replace(/'/g, "''")}'` : keyValue;
                        result = result.replace(keyPattern, replacementValue);
                    }
                });
                
                // ${변수명} 패턴 처리
                const allValues = Object.values(value);
                if (allValues.every(v => Array.isArray(v))) {
                    // column_identified: 모든 배열 값을 통합하여 IN절로
                    const flatValues = allValues.flat();
                    const inClause = flatValues.map(v => {
                        if (typeof v === 'string') {
                            return `'${v.replace(/'/g, "''")}'`;
                        }
                        return v;
                    }).join(', ');
                    result = result.replace(pattern, inClause);
                } else {
                    // key_value_pairs: 모든 값들을 IN절로
                    const inClause = allValues.map(v => {
                        if (typeof v === 'string') {
                            return `'${v.replace(/'/g, "''")}'`;
                        }
                        return v;
                    }).join(', ');
                    result = result.replace(pattern, inClause);
                }
            } 
            else {
                result = result.replace(pattern, value);
            }
        });
        
        // 쿼리문정의 파일 의 변수 치환
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
        
        // 현재 시각 함수 치환 (CURRENT_TIMESTAMP, NOW 등)
        const timestampFunctions = {
            'CURRENT_TIMESTAMP': () => new Date().toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:mm:ss
            'CURRENT_DATETIME': () => new Date().toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:mm:ss
            'NOW': () => new Date().toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:mm:ss
            'CURRENT_DATE': () => new Date().toISOString().slice(0, 10), // YYYY-MM-DD
            'CURRENT_TIME': () => new Date().toTimeString().slice(0, 8), // HH:mm:ss
            'UNIX_TIMESTAMP': () => Math.floor(Date.now() / 1000), // Unix timestamp
            'TIMESTAMP_MS': () => Date.now(), // Milliseconds timestamp
            'ISO_TIMESTAMP': () => new Date().toISOString(), // ISO 8601 format
            'GETDATE': () => new Date().toISOString().slice(0, 19).replace('T', ' ') // SQL Server GETDATE() equivalent
        };
        
        // 현재 시각 함수 패턴 매칭 및 치환
        Object.entries(timestampFunctions).forEach(([funcName, funcImpl]) => {
            const pattern = new RegExp(`\\$\\{${funcName}\\}`, 'g');
            result = result.replace(pattern, funcImpl());
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
                    
                case 'column_identified':
                    // 컬럼별로 식별 가능한 구조로 추출
                    const identifiedColumns = extractConfig.columns || Object.keys(data[0]);
                    extractedValue = {};
                    identifiedColumns.forEach(col => {
                        extractedValue[col] = [];
                    });
                    
                    data.forEach(row => {
                        identifiedColumns.forEach(col => {
                            if (row[col] !== null && row[col] !== undefined) {
                                extractedValue[col].push(row[col]);
                            }
                        });
                    });
                    
                    // 중복 제거
                    Object.keys(extractedValue).forEach(col => {
                        extractedValue[col] = [...new Set(extractedValue[col])];
                    });
                    
                    const totalValues = Object.values(extractedValue).reduce((sum, arr) => sum + arr.length, 0);
                    this.log(`컬럼별 식별 추출 (${identifiedColumns.join(', ')}): ${totalValues}개 값 (${Object.keys(extractedValue).length}개 컬럼)`);
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

    // 컬럼 오버라이드 적용
    applyColumnOverrides(sourceData, columnOverrides) {
        try {
            if (!columnOverrides || Object.keys(columnOverrides).length === 0) {
                this.log('컬럼 오버라이드가 없습니다. 원본 데이터를 그대로 사용합니다.');
                return sourceData;
            }
            
            this.log(`컬럼 오버라이드 적용 중: ${Object.keys(columnOverrides).join(', ')}`);
            
            const processedData = sourceData.map(row => {
                const newRow = { ...row }; // 원본 데이터 복사
                
                // 각 오버라이드 적용
                Object.entries(columnOverrides).forEach(([column, value]) => {
                    // 변수 치환 적용
                    const processedValue = this.replaceVariables(value);
                    newRow[column] = processedValue;
                    
                    // 로그에서 자주 출력되는 것을 방지하기 위해 첫 번째 행에서만 로그 출력
                    if (sourceData.indexOf(row) === 0) {
                        this.log(`  ${column}: "${processedValue}" 적용`);
                    }
                });
                
                return newRow;
            });
            
            this.log(`${sourceData.length}행에 컬럼 오버라이드 적용 완료`);
            return processedData;
            
        } catch (error) {
            this.log(`컬럼 오버라이드 적용 실패: ${error.message}`);
            throw error;
        }
    }

    // 전처리/후처리 SQL 실행
    async executeProcessScript(scriptConfig, database = 'target') {
        try {
            if (!scriptConfig || !scriptConfig.script) {
                this.log('실행할 스크립트가 없습니다.');
                return { success: true };
            }
            
            this.log(`${scriptConfig.description} 실행 중...`);
            
            // 변수 치환
            const processedScript = this.replaceVariables(scriptConfig.script);
            
            // 스크립트를 세미콜론으로 분할하여 개별 SQL 문으로 실행
            const sqlStatements = processedScript
                .split(';')
                .map(sql => sql.trim())
                .filter(sql => sql.length > 0 && !sql.match(/^\s*--/)); // 빈 문장과 주석 제거
            
            if (sqlStatements.length === 0) {
                this.log('실행할 SQL 문이 없습니다.');
                return { success: true };
            }
            
            this.log(`총 ${sqlStatements.length}개의 SQL 문 실행 중...`);
            
            let executedCount = 0;
            for (const sql of sqlStatements) {
                try {
                    if (database === 'source') {
                        await this.connectionManager.executeQueryOnSource(sql);
                    } else {
                        await this.connectionManager.executeQueryOnTarget(sql);
                    }
                    executedCount++;
                } catch (sqlError) {
                    this.log(`SQL 실행 경고 (계속 진행): ${sqlError.message}`);
                    this.log(`실패한 SQL: ${sql.substring(0, 100)}...`);
                    // 개별 SQL 실패는 경고로 처리하고 계속 진행
                }
            }
            
            this.log(`${scriptConfig.description} 완료: ${executedCount}/${sqlStatements.length}개 SQL 문 실행`);
            return { success: true, executedCount };
            
        } catch (error) {
            this.log(`${scriptConfig.description} 실행 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // 배치 단위로 데이터 삽입
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
                
                // 진행률 표시
                const progress = ((i + batch.length) / totalRows * 100).toFixed(1);
                this.log(`진행률: ${progress}% (${i + batch.length}/${totalRows})`);
                
                // 배치 진행 상황 업데이트
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

    // 외부 SQL 파일에서 쿼리 로드
    async loadQueryFromFile(filePath) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // 상대 경로인 경우 쿼리문정의 파일 기준으로 해석
            const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(path.dirname(this.queryFilePath), filePath);
            
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
            
            // 개별 쿼리 전처리 실행
            if (queryConfig.preProcess) {
                this.log(`--- ${queryConfig.id} 전처리 실행 ---`);
                const preResult = await this.executeProcessScript(queryConfig.preProcess, 'target');
                if (!preResult.success) {
                    throw new Error(`${queryConfig.id} 전처리 실행 실패: ${preResult.error}`);
                }
                this.log(`--- ${queryConfig.id} 전처리 완료 ---`);
            }
            
            // 배치 크기 결정
            let batchSize = parseInt(process.env.BATCH_SIZE) || 1000;
            if (queryConfig.batchSize) {
                const processedBatchSize = this.replaceVariables(queryConfig.batchSize.toString());
                batchSize = parseInt(processedBatchSize) || batchSize;
            }
            
            // 소스 데이터 조회
            const sourceData = await this.executeSourceQuery(queryConfig.sourceQuery);
            
            // PK 기준 삭제 처리
            if (queryConfig.deleteBeforeInsert) {
                this.log(`이관 전 대상 테이블 PK 기준 데이터 삭제: ${queryConfig.targetTable}`);
                if (sourceData && sourceData.length > 0) {
                    // Primary Key가 콤마로 구분된 문자열인 경우 배열로 변환
                    const primaryKeys = typeof queryConfig.primaryKey === 'string' && queryConfig.primaryKey.includes(',')
                        ? queryConfig.primaryKey.split(',').map(pk => pk.trim())
                        : queryConfig.primaryKey;
                    await this.connectionManager.deleteFromTargetByPK(queryConfig.targetTable, primaryKeys, sourceData);
                } else {
                    this.log(`소스 데이터가 없어 ${queryConfig.targetTable} 테이블 삭제를 건너뜁니다.`);
                }
            }
            
            if (sourceData.length === 0) {
                this.log('조회된 데이터가 없습니다. 이관을 건너뜁니다.');
                return { success: true, rowsProcessed: 0 };
            }
            
            // columnOverrides 적용
            const processedData = this.applyColumnOverrides(sourceData, queryConfig.columnOverrides);
            
            // 데이터 삽입
            const insertedRows = await this.insertDataInBatches(
                queryConfig.targetTable,
                queryConfig.targetColumns,
                processedData,
                batchSize,
                queryConfig.id
            );
            
            // 개별 쿼리 후처리 실행
            if (queryConfig.postProcess) {
                this.log(`--- ${queryConfig.id} 후처리 실행 ---`);
                const postResult = await this.executeProcessScript(queryConfig.postProcess, 'target');
                if (!postResult.success) {
                    this.log(`${queryConfig.id} 후처리 실행 실패: ${postResult.error}`);
                    // 후처리 실패는 경고로 처리하고 계속 진행
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

    // 전체 이관 프로세스 실행
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
            
            // 진행 상황 관리자 초기화 또는 재시작
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
                
                const resumeInfo = this.progressManager.getResumeInfo();
                this.log(`완료된 쿼리: ${resumeInfo.completedQueries.length}/${resumeInfo.totalQueries}`);
                this.log(`남은 쿼리: ${resumeInfo.remainingQueries}개`);
                this.log(`재시작 횟수: ${resumeInfo.resumeCount}`);
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
            
            // 전역 전처리 실행
            if (this.config.globalProcesses && this.config.globalProcesses.preProcess) {
                this.log('\n=== 전역 전처리 실행 ===');
                this.progressManager.updatePhase('PRE_PROCESSING', 'RUNNING', 'Executing global pre-processing scripts');
                const preResult = await this.executeProcessScript(this.config.globalProcesses.preProcess, 'target');
                if (!preResult.success) {
                    throw new Error(`전역 전처리 실행 실패: ${preResult.error}`);
                }
                this.progressManager.updatePhase('PRE_PROCESSING', 'COMPLETED', 'Global pre-processing completed');
                this.log('=== 전역 전처리 완료 ===\n');
            }
            
            // 동적 변수 추출 실행
            if (this.config.dynamicVariables && this.config.dynamicVariables.length > 0) {
                this.log(`동적 변수 추출 시작: ${this.config.dynamicVariables.length}개`);
                this.progressManager.updatePhase('EXTRACTING_VARIABLES', 'RUNNING', `Extracting ${this.config.dynamicVariables.length} dynamic variables`);
                
                for (const extractConfig of this.config.dynamicVariables) {
                    if (extractConfig.enabled !== false) {
                        await this.extractDataToVariable(extractConfig);
                    }
                }
                
                this.progressManager.updatePhase('EXTRACTING_VARIABLES', 'COMPLETED', 'Dynamic variable extraction completed');
                this.log('모든 동적 변수 추출 완료');
                this.log(`현재 동적 변수 목록: ${Object.keys(this.dynamicVariables).join(', ')}`);
            }
            
            // 활성화된 쿼리만 필터링
            let enabledQueries = this.config.queries.filter(query => query.enabled);
            
            // 재시작인 경우 완료된 쿼리 필터링
            if (isResuming) {
                const completedQueries = this.progressManager.getCompletedQueries();
                const originalCount = enabledQueries.length;
                enabledQueries = enabledQueries.filter(query => !completedQueries.includes(query.id));
                this.log(`전체 쿼리: ${originalCount}개, 완료된 쿼리: ${completedQueries.length}개, 실행할 쿼리: ${enabledQueries.length}개`);
                
                // 완료된 쿼리들의 결과를 기존 데이터에서 복원
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
            
            // 전체 행 수 추정 (남은 쿼리들만)
            let totalEstimatedRows = 0;
            if (!isResuming) {
                for (const query of enabledQueries) {
                    try {
                        const sourceData = await this.executeSourceQuery(query.sourceQuery);
                        totalEstimatedRows += sourceData.length;
                    } catch (error) {
                        this.log(`쿼리 ${query.id} 행 수 추정 실패: ${error.message}`);
                    }
                }
                
                // 진행 상황 관리자 시작
                this.progressManager.startMigration(this.config.queries.filter(query => query.enabled).length, totalEstimatedRows);
            } else {
                // 재시작인 경우 기존 totalRows 값 사용
                totalEstimatedRows = this.progressManager.progressData.totalRows || 0;
                this.log(`기존 예상 행 수: ${totalEstimatedRows.toLocaleString()}행`);
            }
            
            // 트랜잭션 시작 (옵션)
            let transaction = null;
            if (this.enableTransaction) {
                this.log('트랜잭션 시작');
                transaction = await this.connectionManager.beginTransaction();
            }
            
            try {
                // 마이그레이션 페이즈 시작
                this.progressManager.updatePhase('MIGRATING', 'RUNNING', 'Migrating data');
                
                // 각 쿼리 실행
                for (const queryConfig of enabledQueries) {
                    // SELECT * 감지 및 자동 컬럼 설정
                    const processedQueryConfig = await this.processQueryConfig(queryConfig);
                    
                    // 쿼리 시작 추적
                    this.progressManager.startQuery(
                        queryConfig.id, 
                        queryConfig.description, 
                        0 // 행 수는 실행 중에 업데이트됨
                    );
                    
                    const result = await this.executeQueryMigration(processedQueryConfig);
                    results.push({
                        queryId: queryConfig.id,
                        description: queryConfig.description,
                        ...result
                    });
                    
                    totalProcessed += result.rowsProcessed;
                    
                    if (result.success) {
                        successCount++;
                        // 쿼리 완료 추적
                        this.progressManager.completeQuery(queryConfig.id, {
                            processedRows: result.rowsProcessed,
                            insertedRows: result.rowsProcessed
                        });
                    } else {
                        failureCount++;
                        
                        // 쿼리 실패 추적
                        this.progressManager.failQuery(queryConfig.id, new Error(result.error || 'Unknown error'));
                        
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
                
                // 전역 후처리 실행
                if (this.config.globalProcesses && this.config.globalProcesses.postProcess) {
                    this.log('\n=== 전역 후처리 실행 ===');
                    this.progressManager.updatePhase('POST_PROCESSING', 'RUNNING', 'Executing global post-processing scripts');
                    const postResult = await this.executeProcessScript(this.config.globalProcesses.postProcess, 'target');
                    if (!postResult.success) {
                        this.log(`전역 후처리 실행 실패: ${postResult.error}`);
                        this.progressManager.updatePhase('POST_PROCESSING', 'FAILED', `Post-processing failed: ${postResult.error}`);
                        // 후처리 실패는 경고로 처리하고 계속 진행
                    } else {
                        this.progressManager.updatePhase('POST_PROCESSING', 'COMPLETED', 'Global post-processing completed');
                    }
                    this.log('=== 전역 후처리 완료 ===\n');
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
            
            // 진행 상황 관리자에 실패 추적
            if (this.progressManager) {
                this.progressManager.failMigration(error);
            }
            
            throw error;
            
        } finally {
            // 연결 정리
            await this.connectionManager.closeConnections();
            
            // 최종 결과 리포트
            const endTime = Date.now();
            duration = (endTime - startTime) / 1000;
            
            // 성공한 경우 진행 상황 관리자에 완료 추적
            if (this.progressManager && failureCount === 0) {
                this.progressManager.completeMigration();
            }
            
            this.log('\n=== 이관 프로세스 완료 ===');
            this.log(`총 실행 시간: ${duration.toFixed(2)}초`);
            this.log(`성공한 쿼리: ${successCount}`);
            this.log(`실패한 쿼리: ${failureCount}`);
            this.log(`총 처리된 행: ${totalProcessed}`);
            
            // 진행 상황 요약 출력
            if (this.progressManager) {
                const summary = this.progressManager.getProgressSummary();
                this.log(`\n=== 진행 상황 요약 ===`);
                this.log(`Migration ID: ${summary.migrationId}`);
                this.log(`최종 상태: ${summary.status}`);
                this.log(`전체 진행률: ${summary.totalProgress.toFixed(1)}%`);
                this.log(`행 처리율: ${summary.rowProgress.toFixed(1)}%`);
                this.log(`평균 처리 속도: ${summary.performance.avgRowsPerSecond.toFixed(0)} rows/sec`);
                if (summary.errors > 0) {
                    this.log(`오류 수: ${summary.errors}`);
                }
            }
            
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
            
            if (this.progressManager) {
                this.log(`\n진행 상황 파일: ${this.progressManager.progressFile}`);
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
        
        // 진행 상황 관리자 정보 추가
        if (this.progressManager) {
            migrationResult.migrationId = this.progressManager.migrationId;
            migrationResult.progressFile = this.progressManager.progressFile;
            migrationResult.progressSummary = this.progressManager.getProgressSummary();
        }
        
        return migrationResult;
    }

    // 설정 검증
    async validateConfiguration() {
        try {
            await this.loadConfig();
            
            // 쿼리문정의 파일에 DB 정보가 없는 경우에만 환경 변수 확인
            if (!this.config.settings) {
                // 필수 환경 변수 확인
                const requiredEnvVars = [
                    'SOURCE_DB_SERVER', 'SOURCE_DB_DATABASE', 'SOURCE_DB_USER', 'SOURCE_DB_PASSWORD',
                    'TARGET_DB_SERVER', 'TARGET_DB_DATABASE', 'TARGET_DB_USER', 'TARGET_DB_PASSWORD'
                ];
                
                const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
                if (missingVars.length > 0) {
                    throw new Error(`필수 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`);
                }
            }
            
            // 쿼리 설정 검증
            const enabledQueries = this.config.queries ? this.config.queries.filter(q => q.enabled !== false) : [];
            if (enabledQueries.length === 0) {
                console.log('⚠️ 활성화된 쿼리가 없습니다. (쿼리문정의 파일 구조 검증은 성공)');
            }
            
            if (enabledQueries.length > 0) {
                for (const query of enabledQueries) {
                    if (!query.id || (!query.sourceQuery && !query.sourceQueryFile) || !query.targetTable) {
                        throw new Error(`쿼리 설정이 불완전합니다: ${query.id || '이름 없음'}`);
                    }
                }
            }
            
            console.log('설정 검증 완료');
            return true;
            
        } catch (error) {
            console.error('설정 검증 실패:', error.message);
            return false;
        }
    }

    // 개별 DB 연결 테스트
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

    // 연결 테스트
    async testConnections() {
        try {
            console.log('데이터베이스 연결 테스트 중...');

            this.connectionManager.setCustomDatabaseConfigs(sourceConfig, targetConfig);
            
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

    // DRY RUN 모드로 마이그레이션 시뮬레이션 실행
    async executeDryRun() {
        console.log('🧪 DRY RUN 모드: 데이터 마이그레이션 시뮬레이션\n');
        
        const startTime = Date.now();
        let totalQueries = 0;
        let totalRows = 0;
        const results = [];
        
        try {
            // 쿼리문정의 파일 로드
            await this.loadConfig();
            
            // 소스 데이터베이스만 연결 (읽기 전용)
            console.log('📡 소스 데이터베이스 연결 중...');
            await this.connectionManager.connectSource();
            
            // 동적 변수 추출 시뮬레이션
            if (this.config.dynamicVariables && this.config.dynamicVariables.length > 0) {
                console.log(`\n🔍 동적 변수 추출 시뮬레이션: ${this.config.dynamicVariables.length}개`);
                
                for (const extractConfig of this.config.dynamicVariables) {
                    if (extractConfig.enabled !== false) {
                        console.log(`  • ${extractConfig.id}: ${extractConfig.description || '설명 없음'}`);
                        
                        try {
                            const processedQuery = this.replaceVariables(extractConfig.query);
                            console.log(`    쿼리: ${processedQuery.substring(0, 100)}${processedQuery.length > 100 ? '...' : ''}`);
                            
                            const data = await this.connectionManager.querySource(processedQuery);
                            console.log(`    ✅ ${data.length}개 값 추출 예정 → 변수: ${extractConfig.variableName}`);
                        } catch (error) {
                            console.log(`    ❌ 추출 실패: ${error.message}`);
                        }
                    }
                }
            }
            
            // 쿼리 시뮬레이션
            const enabledQueries = this.config.queries.filter(q => q.enabled !== false);
            console.log(`\n📋 마이그레이션 쿼리 시뮬레이션: ${enabledQueries.length}개`);
            console.log('=' .repeat(80));
            
            for (let i = 0; i < enabledQueries.length; i++) {
                const queryConfig = enabledQueries[i];
                console.log(`\n${i + 1}. 쿼리 ID: ${queryConfig.id}`);
                console.log(`   설명: ${queryConfig.description || '설명 없음'}`);
                console.log(`   대상 테이블: ${queryConfig.targetTable}`);
                
                try {
                    // 소스 쿼리 처리
                    let sourceQuery = queryConfig.sourceQuery;
                    if (queryConfig.sourceQueryFile) {
                        console.log(`   소스 파일: ${queryConfig.sourceQueryFile}`);
                        sourceQuery = await this.loadQueryFromFile(queryConfig.sourceQueryFile);
                    }
                    
                    const processedQuery = this.replaceVariables(sourceQuery);
                    console.log(`   처리된 쿼리: ${processedQuery.substring(0, 100)}${processedQuery.length > 100 ? '...' : ''}`);
                    
                    // 데이터 건수 확인
                    const sourceData = await this.connectionManager.querySource(processedQuery);
                    const rowCount = sourceData.length;
                    totalRows += rowCount;
                    totalQueries++;
                    
                    console.log(`   📊 이관 예정 데이터: ${rowCount}행`);
                    
                    if (queryConfig.deleteBeforeInsert) {
                        console.log(`   🗑️ 삭제 방식: PK(${queryConfig.primaryKey}) 기준 삭제`);
                    }
                    
                    // 대상 컬럼 정보
                    if (queryConfig.targetColumns) {
                        console.log(`   📝 대상 컬럼: ${queryConfig.targetColumns.join(', ')}`);
                    } else if (sourceData.length > 0) {
                        const sourceColumns = Object.keys(sourceData[0]);
                        console.log(`   📝 자동 감지 컬럼: ${sourceColumns.join(', ')}`);
                    }
                    
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
            
            console.log('\n' + '=' .repeat(80));
            console.log('🎯 DRY RUN 시뮬레이션 결과 요약');
            console.log('=' .repeat(80));
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
            console.log('실제 마이그레이션을 실행하려면 --dry-run 옵션을 제거하고 다시 실행하세요.');
            
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
}

module.exports = MSSQLDataMigrator;