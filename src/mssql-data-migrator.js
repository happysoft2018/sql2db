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
        this.currentQuery = null; // 현재 실행 중인 쿼리 추적
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

    // 테이블의 실제 컬럼 목록 조회
    async getTableColumns(tableName, database = 'target') {
        try {
            const query = `
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${tableName}' 
                ORDER BY ORDINAL_POSITION
            `;
            
            let result;
            if (database === 'source') {
                result = await this.connectionManager.executeQueryOnSource(query);
            } else {
                result = await this.connectionManager.executeQueryOnTarget(query);
            }
            
            if (result && result.recordset) {
                return result.recordset.map(row => row.COLUMN_NAME);
            }
            
            return [];
        } catch (error) {
            this.log(`⚠️ 테이블 컬럼 조회 실패 (${tableName}): ${error.message}`);
            return [];
        }
    }

    // 테이블의 IDENTITY 컬럼 목록 조회
    async getIdentityColumns(tableName, database = 'target') {
        try {
            const query = `
                SELECT c.name AS COLUMN_NAME
                FROM sys.columns c
                INNER JOIN sys.tables t ON c.object_id = t.object_id
                WHERE t.name = '${tableName}'
                  AND c.is_identity = 1
                ORDER BY c.column_id
            `;
            
            let result;
            if (database === 'source') {
                result = await this.connectionManager.executeQueryOnSource(query);
            } else {
                result = await this.connectionManager.executeQueryOnTarget(query);
            }
            
            if (result && result.recordset) {
                const identityColumns = result.recordset.map(row => row.COLUMN_NAME);
                this.log(`IDENTITY 컬럼 조회 완료 (${tableName}): ${identityColumns.join(', ')}`);
                return identityColumns;
            }
            
            return [];
        } catch (error) {
            this.log(`⚠️ IDENTITY 컬럼 조회 실패 (${tableName}): ${error.message}`);
            return [];
        }
    }

    // applyGlobalColumns 설정에 따라 선택적으로 globalColumnOverrides 적용
    async selectivelyApplyGlobalColumnOverrides(globalColumnOverrides, applyGlobalColumns, tableName = null, database = 'target') {
        if (!globalColumnOverrides || Object.keys(globalColumnOverrides).length === 0) {
            return {};
        }
        
        // applyGlobalColumns가 명시되지 않았거나 값이 없으면 컬럼 오버라이드 적용 안함
        if (!applyGlobalColumns || applyGlobalColumns === '' || applyGlobalColumns === 'undefined') {
            return {};
        }
        
        // applyGlobalColumns 값에 따른 처리
        switch (applyGlobalColumns) {
            case 'all':
                // 모든 전역 컬럼 오버라이드 적용 (존재하는 컬럼만)
                if (tableName) {
                    // 테이블의 실제 컬럼 확인
                    const tableColumns = await this.getTableColumns(tableName, database);
                    const existingOverrides = {};
                    
                    Object.keys(globalColumnOverrides).forEach(column => {
                        if (tableColumns.includes(column)) {
                            existingOverrides[column] = globalColumnOverrides[column];
                        } else {
                            this.log(`⚠️ 컬럼 '${column}'이 테이블 '${tableName}'에 존재하지 않아 globalColumnOverrides에서 제외됩니다.`);
                        }
                    });
                    
                    return existingOverrides;
                } else {
                    // 테이블명이 없으면 모든 컬럼 적용 (기존 동작)
                    return { ...globalColumnOverrides };
                }
                
            case 'none':
                // 전역 컬럼 오버라이드 적용 안함
                return {};
                
            default:
                // 쉼표로 구분된 컬럼 목록에서 지정된 컬럼만 적용
                if (typeof applyGlobalColumns === 'string' && applyGlobalColumns.includes(',')) {
                    const selectedColumns = applyGlobalColumns.split(',').map(col => col.trim());
                    const selectedOverrides = {};
                    
                    selectedColumns.forEach(column => {
                        if (globalColumnOverrides.hasOwnProperty(column)) {
                            selectedOverrides[column] = globalColumnOverrides[column];
                        } else {
                            logger.warn(`지정된 컬럼 '${column}'이 globalColumnOverrides에 정의되지 않았습니다.`, {
                                availableColumns: Object.keys(globalColumnOverrides)
                            });
                        }
                    });
                    
                    return selectedOverrides;
                } else {
                    // 단일 컬럼 지정
                    const column = applyGlobalColumns.trim();
                    if (globalColumnOverrides.hasOwnProperty(column)) {
                        return { [column]: globalColumnOverrides[column] };
                    } else {
                        logger.warn(`지정된 컬럼 '${column}'이 globalColumnOverrides에 정의되지 않았습니다.`, {
                            availableColumns: Object.keys(globalColumnOverrides)
                        });
                        return {};
                    }
                }
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
            
            // 전역 전처리/후처리 그룹 파싱
            if (migration.globalProcesses) {
                config.globalProcesses.preProcessGroups = [];
                config.globalProcesses.postProcessGroups = [];
                
                // 전역 전처리 그룹들 파싱
                if (migration.globalProcesses.preProcessGroups && migration.globalProcesses.preProcessGroups.group) {
                    const preGroups = Array.isArray(migration.globalProcesses.preProcessGroups.group) 
                        ? migration.globalProcesses.preProcessGroups.group 
                        : [migration.globalProcesses.preProcessGroups.group];
                    
                    preGroups.forEach(group => {
                        if (group.id && group._) {
                            config.globalProcesses.preProcessGroups.push({
                                id: group.id,
                                description: group.description || `전처리 그룹 ${group.id}`,
                                enabled: group.enabled === 'true' || group.enabled === true,
                                script: group._.trim()
                            });
                        }
                    });
                }
                
                // 전역 후처리 그룹들 파싱
                if (migration.globalProcesses.postProcessGroups && migration.globalProcesses.postProcessGroups.group) {
                    const postGroups = Array.isArray(migration.globalProcesses.postProcessGroups.group) 
                        ? migration.globalProcesses.postProcessGroups.group 
                        : [migration.globalProcesses.postProcessGroups.group];
                    
                    postGroups.forEach(group => {
                        if (group.id && group._) {
                            config.globalProcesses.postProcessGroups.push({
                                id: group.id,
                                description: group.description || `후처리 그룹 ${group.id}`,
                                enabled: group.enabled === 'true' || group.enabled === true,
                                script: group._.trim()
                            });
                        }
                    });
                }
                
                logger.info('전역 전/후처리 그룹 로드됨', {
                    preProcessGroups: config.globalProcesses.preProcessGroups.length,
                    postProcessGroups: config.globalProcesses.postProcessGroups.length,
                    enabledPreGroups: config.globalProcesses.preProcessGroups.filter(g => g.enabled).map(g => g.id),
                    enabledPostGroups: config.globalProcesses.postProcessGroups.filter(g => g.enabled).map(g => g.id)
                });
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
                        identityColumns: q.identityColumns,
                        deleteBeforeInsert: q.deleteBeforeInsert !== undefined ? (q.deleteBeforeInsert === 'true') : config.settings.deleteBeforeInsert,  // 개별 설정이 없으면 글로벌 설정 사용
                        enabled: q.enabled === 'true'
                    };
                    
                    // sourceQuery 처리 및 개별 applyGlobalColumns 적용
                    if (q.sourceQueryFile) {
                        query.sourceQueryFile = q.sourceQueryFile;
                        query.sourceQueryApplyGlobalColumns = 'all'; // 파일 기반은 기본값
                    } else if (q.sourceQuery) {
                        // sourceQuery에서 applyGlobalColumns 속성 파싱
                        if (typeof q.sourceQuery === 'object' && q.sourceQuery.applyGlobalColumns) {
                            query.sourceQueryApplyGlobalColumns = q.sourceQuery.applyGlobalColumns;
                            query.sourceQuery = q.sourceQuery._.trim();
                        } else {
                            query.sourceQueryApplyGlobalColumns = 'all'; // 기본값
                            query.sourceQuery = q.sourceQuery.trim();
                        }
                    }
                    
                    // sourceQuery용 columnOverrides 적용 (비동기 처리 불가능하므로 기본값 사용)
                    query.columnOverrides = {};
                    if (query.sourceQueryApplyGlobalColumns && query.sourceQueryApplyGlobalColumns !== 'none') {
                        // 기본적으로 모든 컬럼 적용 (실제 테이블 검증은 나중에 수행)
                        query.columnOverrides = { ...config.globalColumnOverrides };
                    }
                    
                    // 적용된 columnOverrides 로깅 (개발/디버그용)
                    if (Object.keys(query.columnOverrides).length > 0) {
                        logger.debug(`[${query.id}] sourceQuery용 globalColumnOverrides 적용됨`, {
                            sourceQueryApplyGlobalColumns: query.sourceQueryApplyGlobalColumns,
                            appliedColumns: Object.keys(query.columnOverrides),
                            availableGlobalColumns: Object.keys(config.globalColumnOverrides)
                        });
                    }
                    
                    // 개별 쿼리 전처리/후처리 파싱 (각각의 applyGlobalColumns 포함)
                    if (q.preProcess) {
                        query.preProcess = {
                            description: q.preProcess.description || `${query.id} 전처리`,
                            script: q.preProcess._.trim(),
                            applyGlobalColumns: q.preProcess.applyGlobalColumns || undefined
                        };
                    }
                    if (q.postProcess) {
                        query.postProcess = {
                            description: q.postProcess.description || `${query.id} 후처리`,
                            script: q.postProcess._.trim(),
                            applyGlobalColumns: q.postProcess.applyGlobalColumns || undefined
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
        const originalText = text;
        
        // 디버그 로깅 활성화 여부
        const debugVariables = process.env.DEBUG_VARIABLES === 'true';
        
        if (debugVariables) {
            this.log(`변수 치환 시작: ${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}`);
        }
        
        // 동적 변수 치환 (우선순위 높음)
        Object.entries(this.dynamicVariables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            const beforeReplace = result;
            
            try {
                    // 배열 타입인 경우 IN절 처리
                    if (Array.isArray(value)) {
                        if (value.length === 0) {
                            // 빈 배열을 존재하지 않을 것 같은 값으로 치환
                            result = result.replace(pattern, "'^-_'");
                        } else {
                        const inClause = value.map(v => {
                            if (typeof v === 'string') {
                                return `'${v.replace(/'/g, "''")}'`;
                            }
                            return v;
                        }).join(', ');
                        result = result.replace(pattern, inClause);
                    }
                    
                    if (debugVariables && beforeReplace !== result) {
                        this.log(`동적 변수 [${key}] 치환: 배열 ${value.length}개 → IN절`);
                    }
                } 
                // 객체 타입인 경우 (column_identified 또는 key_value_pairs)
                else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // ${변수명.키} 패턴 처리 (column_identified와 key_value_pairs 모두 지원)
                    Object.keys(value).forEach(keyName => {
                        const keyPattern = new RegExp(`\\$\\{${key}\\.${keyName}\\}`, 'g');
                        const keyValue = value[keyName];
                        const beforeKeyReplace = result;
                        
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
                        
                        if (debugVariables && beforeKeyReplace !== result) {
                            this.log(`동적 변수 [${key}.${keyName}] 치환: ${Array.isArray(keyValue) ? `배열 ${keyValue.length}개` : keyValue}`);
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
                    
                    if (debugVariables && beforeReplace !== result) {
                        this.log(`동적 변수 [${key}] 치환: 객체 타입`);
                    }
                } 
                else {
                    result = result.replace(pattern, value);
                    
                    if (debugVariables && beforeReplace !== result) {
                        this.log(`동적 변수 [${key}] 치환: ${value}`);
                    }
                }
            } catch (error) {
                this.log(`동적 변수 [${key}] 치환 중 오류: ${error.message}`);
                // 오류 발생 시 원본 유지
            }
        });
        
        // 쿼리문정의 파일의 변수 치환
        Object.entries(this.variables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            const beforeReplace = result;
            
            try {
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
                    
                    if (debugVariables && beforeReplace !== result) {
                        this.log(`일반 변수 [${key}] 치환: 배열 ${value.length}개 → IN절`);
                    }
                } else {
                    // 기존 방식: 단일 값 치환
                    result = result.replace(pattern, value);
                    
                    if (debugVariables && beforeReplace !== result) {
                        this.log(`일반 변수 [${key}] 치환: ${value}`);
                    }
                }
            } catch (error) {
                this.log(`일반 변수 [${key}] 치환 중 오류: ${error.message}`);
                // 오류 발생 시 원본 유지
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
            const beforeReplace = result;
            
            try {
                result = result.replace(pattern, funcImpl());
                
                if (debugVariables && beforeReplace !== result) {
                    this.log(`시각 함수 [${funcName}] 치환: ${funcImpl()}`);
                }
            } catch (error) {
                this.log(`시각 함수 [${funcName}] 치환 중 오류: ${error.message}`);
                // 오류 발생 시 원본 유지
            }
        });
        
        // 환경 변수 치환 (BATCH_SIZE 등) - 이미 치환된 변수는 제외하고 처리
        const envPattern = /\$\{(\w+)\}/g;
        const remainingMatches = [...result.matchAll(envPattern)];
        
        remainingMatches.forEach(match => {
            const fullMatch = match[0];
            const varName = match[1];
            
            // 이미 처리된 변수들과 중복되지 않는 경우만 환경 변수로 치환
            const isAlreadyProcessed = 
                this.dynamicVariables.hasOwnProperty(varName) ||
                this.variables.hasOwnProperty(varName) ||
                timestampFunctions.hasOwnProperty(varName);
                
            if (!isAlreadyProcessed && process.env[varName]) {
                const envValue = process.env[varName];
                
                try {
                    // 환경 변수가 배열 형태인지 확인 (JSON 형태로 저장된 경우)
                    const parsed = JSON.parse(envValue);
                    if (Array.isArray(parsed)) {
                        const inClause = parsed.map(v => {
                            if (typeof v === 'string') {
                                return `'${v.replace(/'/g, "''")}'`;
                            }
                            return v;
                        }).join(', ');
                        result = result.replace(fullMatch, inClause);
                        
                        if (debugVariables) {
                            this.log(`환경 변수 [${varName}] 치환: 배열 ${parsed.length}개 → IN절`);
                        }
                    } else {
                        result = result.replace(fullMatch, envValue);
                        
                        if (debugVariables) {
                            this.log(`환경 변수 [${varName}] 치환: ${envValue}`);
                        }
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 원본 값 사용
                    result = result.replace(fullMatch, envValue);
                    
                    if (debugVariables) {
                        this.log(`환경 변수 [${varName}] 치환: ${envValue} (단순 문자열)`);
                    }
                }
            } else if (debugVariables && process.env[varName]) {
                this.log(`환경 변수 [${varName}] 건너뜀: 이미 처리된 변수`);
            }
        });
        
        // 치환되지 않은 변수 확인
        const unresolvedVariables = [...result.matchAll(/\$\{(\w+(?:\.\w+)?)\}/g)];
        if (unresolvedVariables.length > 0 && debugVariables) {
            this.log(`치환되지 않은 변수들: ${unresolvedVariables.map(m => m[1]).join(', ')}`);
        }
        
        if (debugVariables) {
            this.log(`변수 치환 완료: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
            if (originalText !== result) {
                this.log(`변수 치환 성공: ${originalText.length} → ${result.length} 문자`);
            } else {
                this.log('변수 치환 없음: 원본과 동일');
            }
        }
        
        return result;
    }

    // SQL 스크립트에서 주석 제거 (라인 주석과 블록 주석 모두 처리)
    removeComments(script) {
        let result = script;
        const debugComments = process.env.DEBUG_COMMENTS === 'true';
        
        if (debugComments) {
            this.log(`주석 제거 시작: ${script.length}문자`);
            const commentPatterns = [...script.matchAll(/--.*$|\/\*[\s\S]*?\*\//gm)];
            this.log(`발견된 주석 패턴: ${commentPatterns.length}개`);
        }
        
        try {
            // 1. 블록 주석 제거 (/* ... */)
            // 문자열 내부의 주석은 보호하면서 실제 주석만 제거
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // 2. 라인 주석 제거 (-- ...)
            // 각 라인에서 -- 이후의 내용 제거 (문자열 내부 제외)
            const lines = result.split('\n');
            const cleanedLines = lines.map(line => {
                // 문자열 내부의 --는 보호해야 함
                let inSingleQuote = false;
                let inDoubleQuote = false;
                let commentStart = -1;
                
                for (let i = 0; i < line.length - 1; i++) {
                    const char = line[i];
                    const nextChar = line[i + 1];
                    const prevChar = i > 0 ? line[i - 1] : '';
                    
                    // 문자열 상태 추적 (이스케이프 문자 고려)
                    if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
                        inSingleQuote = !inSingleQuote;
                    } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
                        inDoubleQuote = !inDoubleQuote;
                    }
                    // 문자열 외부에서 -- 발견
                    else if (char === '-' && nextChar === '-' && !inSingleQuote && !inDoubleQuote) {
                        commentStart = i;
                        break;
                    }
                }
                
                // 주석 시작점이 발견되면 그 이전까지만 반환
                if (commentStart >= 0) {
                    return line.substring(0, commentStart).trimEnd();
                }
                return line;
            });
            
            result = cleanedLines.join('\n');
            
            // 3. 빈 줄 정리 (연속된 빈 줄을 하나로)
            result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
            
            // 4. 앞뒤 공백 정리
            result = result.trim();
            
            if (debugComments) {
                this.log(`주석 제거 완료: ${script.length} → ${result.length}문자`);
                if (script !== result) {
                    this.log(`제거된 내용: ${script.length - result.length}문자`);
                } else {
                    this.log('제거된 주석 없음');
                }
            }
            
        } catch (error) {
            this.log(`주석 제거 중 오류 발생: ${error.message}`);
            this.log('원본 스크립트를 그대로 사용합니다.');
            return script;
        }
        
        return result;
    }

    // 전/후처리 스크립트에서 SELECT * 처리
    async processSelectStarInScript(script, database = 'target') {
        // 환경 변수로 비활성화 가능
        const processSelectStar = process.env.PROCESS_SELECT_STAR !== 'false';
        if (!processSelectStar) {
            return script;
        }
        
        try {
            // SELECT * 패턴을 찾아서 명시적 컬럼명으로 변경
            // JOIN, WHERE, GROUP BY, HAVING, ORDER BY 등을 고려한 복잡한 패턴
            const selectStarPattern = /SELECT\s+\*\s+FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?:\s+(?:LEFT|RIGHT|INNER|OUTER)?\s*JOIN\s+.*?)?(?:\s+WHERE\s+.*?)?(?:\s+GROUP\s+BY\s+.*?)?(?:\s+HAVING\s+.*?)?(?:\s+ORDER\s+BY\s+.*?)?(?=\s*[;\)]|$)/gi;
            let processedScript = script;
            const matches = [...script.matchAll(selectStarPattern)];
            
            if (matches.length === 0) {
                return script; // SELECT *가 없으면 원본 반환
            }
            
            this.log(`전/후처리 스크립트에서 ${matches.length}개의 SELECT * 패턴 발견`);
            
            // 각 SELECT * 패턴을 처리
            for (const match of matches) {
                const fullMatch = match[0];
                const tableName = match[1];
                const tableAlias = match[2]; // 테이블 별칭 (있는 경우)
                
                try {
                    this.log(`테이블 ${tableName}${tableAlias ? ` (별칭: ${tableAlias})` : ''}의 컬럼 정보 조회 중...`);
                    
                    // 테이블의 컬럼 정보 조회 (database 파라미터에 따라 소스 또는 타겟)
                    const columns = await this.connectionManager.getTableColumns(tableName, database === 'source');
                    
                    if (columns.length === 0) {
                        this.log(`⚠️ 테이블 ${tableName}의 컬럼 정보를 찾을 수 없습니다. 원본 쿼리를 유지합니다.`);
                        continue;
                    }
                    
                    // 컬럼명 목록 생성 (별칭이 있으면 별칭.컬럼명 형식으로)
                    let columnNames;
                    if (tableAlias) {
                        columnNames = columns.map(col => `${tableAlias}.${col.name}`);
                    } else {
                        columnNames = columns.map(col => col.name);
                    }
                    const explicitColumns = columnNames.join(', ');
                    
                    // SELECT * 를 명시적 컬럼명으로 교체
                    const replacedQuery = fullMatch.replace(/SELECT\s+\*/i, `SELECT ${explicitColumns}`);
                    processedScript = processedScript.replace(fullMatch, replacedQuery);
                    
                    this.log(`✅ ${tableName} 테이블: SELECT * → ${columnNames.length}개 컬럼 명시`);
                    this.log(`변경된 쿼리: ${replacedQuery.substring(0, 150)}${replacedQuery.length > 150 ? '...' : ''}`);
                    
                } catch (columnError) {
                    this.log(`⚠️ 테이블 ${tableName} 컬럼 조회 실패: ${columnError.message}`);
                    this.log(`원본 쿼리를 유지합니다: ${fullMatch}`);
                    // 오류 발생 시 해당 쿼리는 원본 유지하고 계속 진행
                }
            }
            
            return processedScript;
            
        } catch (error) {
            this.log(`SELECT * 처리 중 오류: ${error.message}`);
            this.log('원본 스크립트를 그대로 사용합니다.');
            return script;
        }
    }

    // 전/후처리 스크립트에서 globalColumnOverrides 처리
    processGlobalColumnOverridesInScript(script, globalColumnOverrides, database = 'target') {
        // globalColumnOverrides가 없으면 원본 반환
        if (!globalColumnOverrides || Object.keys(globalColumnOverrides).length === 0) {
            return script;
        }

        try {
            this.log(`전/후처리 스크립트에서 globalColumnOverrides 처리 중: ${Object.keys(globalColumnOverrides).join(', ')}`);
            
            let processedScript = script;
            
            // INSERT 문에서 globalColumnOverrides 적용
            processedScript = this.applyGlobalColumnOverridesToInsertStatements(processedScript, globalColumnOverrides);
            
            // UPDATE 문에서 globalColumnOverrides 적용
            processedScript = this.applyGlobalColumnOverridesToUpdateStatements(processedScript, globalColumnOverrides);
            
            return processedScript;
            
        } catch (error) {
            this.log(`globalColumnOverrides 처리 중 오류: ${error.message}`);
            this.log('원본 스크립트를 그대로 사용합니다.');
            return script;
        }
    }

    // INSERT 문에서 globalColumnOverrides 적용
    applyGlobalColumnOverridesToInsertStatements(script, globalColumnOverrides) {
        // INSERT INTO table_name (columns) VALUES (...) 패턴
        const insertPattern = /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s+(VALUES\s*\([^)]+\)|SELECT\s+[^;]+)/gi;
        
        return script.replace(insertPattern, (match, tableName, columnsPart, valuesPart) => {
            try {
                // 컬럼 목록 파싱
                const columns = columnsPart.split(',').map(col => col.trim());
                const originalColumns = [...columns];
                
                // globalColumnOverrides에서 추가할 컬럼들 확인
                const overrideColumns = Object.keys(globalColumnOverrides);
                const newColumns = overrideColumns.filter(col => !columns.includes(col));
                
                if (newColumns.length === 0) {
                    return match; // 추가할 컬럼이 없으면 원본 반환
                }
                
                // 새 컬럼들을 컬럼 목록에 추가
                const updatedColumns = [...columns, ...newColumns];
                const updatedColumnsPart = updatedColumns.join(', ');
                
                // VALUES 부분 처리
                let updatedValuesPart;
                if (valuesPart.toUpperCase().startsWith('VALUES')) {
                    // VALUES (...) 형태 처리
                    updatedValuesPart = valuesPart.replace(/VALUES\s*\(([^)]+)\)/gi, (valuesMatch, valuesList) => {
                        const values = valuesList.split(',').map(val => val.trim());
                        
                        // 새 컬럼들에 대한 값 추가
                        const newValues = newColumns.map(col => {
                            const overrideValue = globalColumnOverrides[col];
                            // 변수 치환 적용
                            const processedValue = this.replaceVariables(overrideValue);
                            // SQL에서 문자열은 따옴표로 감싸야 함
                            return this.formatSqlValue(processedValue);
                        });
                        
                        const updatedValues = [...values, ...newValues];
                        return `VALUES (${updatedValues.join(', ')})`;
                    });
                } else {
                    // SELECT 문 형태 처리
                    const selectPattern = /SELECT\s+(.+?)(\s+FROM\s+.+)/i;
                    updatedValuesPart = valuesPart.replace(selectPattern, (selectMatch, selectList, fromPart) => {
                        const selectColumns = selectList.split(',').map(col => col.trim());
                        
                        // 새 컬럼들에 대한 값 추가
                        const newSelectValues = newColumns.map(col => {
                            const overrideValue = globalColumnOverrides[col];
                            // 변수 치환 적용
                            const processedValue = this.replaceVariables(overrideValue);
                            return this.formatSqlValue(processedValue);
                        });
                        
                        const updatedSelectColumns = [...selectColumns, ...newSelectValues];
                        return `SELECT ${updatedSelectColumns.join(', ')}${fromPart}`;
                    });
                }
                
                const result = `INSERT INTO ${tableName} (${updatedColumnsPart}) ${updatedValuesPart}`;
                
                this.log(`✅ INSERT 문에 globalColumnOverrides 적용: ${tableName} 테이블에 ${newColumns.length}개 컬럼 추가`);
                this.log(`추가된 컬럼: ${newColumns.join(', ')}`);
                
                return result;
                
            } catch (error) {
                this.log(`⚠️ INSERT 문 globalColumnOverrides 처리 실패: ${error.message}`);
                return match; // 오류 시 원본 반환
            }
        });
    }

    // UPDATE 문에서 globalColumnOverrides 적용
    applyGlobalColumnOverridesToUpdateStatements(script, globalColumnOverrides) {
        // UPDATE table_name SET ... WHERE ... 패턴 (WHERE 절 포함)
        const updatePattern = /UPDATE\s+(\w+)\s+SET\s+(.*?)(\s+WHERE\s+[^;]+)?(?=\s*;|$)/gi;
        
        return script.replace(updatePattern, (match, tableName, setPart, wherePart = '') => {
            try {
                // 기존 SET 절 파싱
                const setAssignments = setPart.split(',').map(assignment => assignment.trim());
                const existingColumns = setAssignments.map(assignment => {
                    const eqIndex = assignment.indexOf('=');
                    return eqIndex > 0 ? assignment.substring(0, eqIndex).trim() : null;
                }).filter(col => col !== null);
                
                // globalColumnOverrides에서 추가할 컬럼들 확인
                const overrideColumns = Object.keys(globalColumnOverrides);
                const newColumns = overrideColumns.filter(col => !existingColumns.includes(col));
                
                if (newColumns.length === 0) {
                    return match; // 추가할 컬럼이 없으면 원본 반환
                }
                
                // 새 컬럼 할당 생성
                const newAssignments = newColumns.map(col => {
                    const overrideValue = globalColumnOverrides[col];
                    // 변수 치환 적용
                    const processedValue = this.replaceVariables(overrideValue);
                    return `${col} = ${this.formatSqlValue(processedValue)}`;
                });
                
                // 기존 SET 절과 새 할당 결합
                const updatedSetPart = [...setAssignments, ...newAssignments].join(', ');
                
                const result = `UPDATE ${tableName} SET ${updatedSetPart}${wherePart}`;
                
                this.log(`✅ UPDATE 문에 globalColumnOverrides 적용: ${tableName} 테이블에 ${newColumns.length}개 컬럼 추가`);
                this.log(`추가된 컬럼: ${newColumns.join(', ')}`);
                
                return result;
                
            } catch (error) {
                this.log(`⚠️ UPDATE 문 globalColumnOverrides 처리 실패: ${error.message}`);
                return match; // 오류 시 원본 반환
            }
        });
    }

    // SQL 값 포맷팅 (따옴표, NULL 처리 등)
    formatSqlValue(value) {
        if (value === null || value === undefined || value === 'NULL') {
            return 'NULL';
        }
        
        // 이미 따옴표가 있거나 숫자인 경우
        if (typeof value === 'string') {
            // 이미 따옴표로 감싸져 있는지 확인
            if ((value.startsWith("'") && value.endsWith("'")) || 
                (value.startsWith('"') && value.endsWith('"'))) {
                return value;
            }
            
            // 숫자인지 확인
            if (/^\d+(\.\d+)?$/.test(value.trim())) {
                return value;
            }
            
            // SQL 함수인지 확인 (GETDATE(), CURRENT_TIMESTAMP 등)
            if (/^[A-Z_]+\(\)$/.test(value.trim().toUpperCase()) || 
                /^CURRENT_/.test(value.trim().toUpperCase())) {
                return value;
            }
            
            // 기타 문자열은 단일 따옴표로 감싸기
            return `'${value.replace(/'/g, "''")}'`; // 작은따옴표 이스케이프
        }
        
        return value;
    }

    // 동적 변수 설정
    setDynamicVariable(key, value) {
        this.dynamicVariables[key] = value;
        this.log(`동적 변수 설정: ${key} = ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
    }

    // 현재 쿼리 설정
    setCurrentQuery(query) {
        this.currentQuery = query;
    }

    // 현재 쿼리 조회
    getCurrentQuery() {
        return this.currentQuery;
    }

    // 변수 상태 검증 및 디버그 정보 출력
    validateAndDebugVariables(text, context = '') {
        console.log('\n=== 변수 상태 디버그 정보 ===');
        console.log(`컨텍스트: ${context}`);
        console.log(`텍스트 길이: ${text.length}`);
        console.log(`텍스트 미리보기: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        
        // 텍스트에서 발견된 모든 변수 패턴 찾기
        const variablePattern = /\$\{([^}]+)\}/g;
        const foundVariables = [...text.matchAll(variablePattern)];
        
        console.log(`\n발견된 변수 패턴: ${foundVariables.length}개`);
        foundVariables.forEach((match, index) => {
            console.log(`  ${index + 1}. ${match[0]} (변수명: ${match[1]})`);
        });
        
        // 현재 사용 가능한 변수들
        console.log(`\n사용 가능한 동적 변수 (${Object.keys(this.dynamicVariables).length}개):`);
        Object.entries(this.dynamicVariables).forEach(([key, value]) => {
            const typeInfo = Array.isArray(value) ? `배열[${value.length}]` : 
                           typeof value === 'object' ? '객체' : 
                           typeof value;
            console.log(`  • ${key}: ${typeInfo}`);
        });
        
        console.log(`\n사용 가능한 일반 변수 (${Object.keys(this.variables).length}개):`);
        Object.entries(this.variables).forEach(([key, value]) => {
            const typeInfo = Array.isArray(value) ? `배열[${value.length}]` : 
                           typeof value === 'object' ? '객체' : 
                           typeof value;
            console.log(`  • ${key}: ${typeInfo} = ${Array.isArray(value) ? `[${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}]` : value}`);
        });
        
        // 현재 시각 함수들
        const timestampFunctions = [
            'CURRENT_TIMESTAMP', 'CURRENT_DATETIME', 'NOW', 'CURRENT_DATE', 
            'CURRENT_TIME', 'UNIX_TIMESTAMP', 'TIMESTAMP_MS', 'ISO_TIMESTAMP', 'GETDATE'
        ];
        console.log(`\n사용 가능한 시각 함수 (${timestampFunctions.length}개):`);
        timestampFunctions.forEach(func => {
            console.log(`  • ${func}`);
        });
        
        // 환경 변수에서 관련된 것들 찾기
        const envVars = Object.keys(process.env).filter(key => 
            foundVariables.some(match => match[1] === key)
        );
        if (envVars.length > 0) {
            console.log(`\n관련 환경 변수 (${envVars.length}개):`);
            envVars.forEach(key => {
                console.log(`  • ${key} = ${process.env[key]}`);
            });
        }
        
        // 해결되지 않을 변수들 예측
        const unresolvableVars = foundVariables.filter(match => {
            const varName = match[1];
            const hasValue = this.dynamicVariables.hasOwnProperty(varName) ||
                           this.variables.hasOwnProperty(varName) ||
                           timestampFunctions.includes(varName) ||
                           process.env.hasOwnProperty(varName);
            return !hasValue;
        });
        
        if (unresolvableVars.length > 0) {
            console.log(`\n⚠️  해결되지 않을 변수들 (${unresolvableVars.length}개):`);
            unresolvableVars.forEach(match => {
                console.log(`  • ${match[0]} (변수명: ${match[1]})`);
            });
        }
        
        console.log('=================================\n');
        
        return {
            foundVariables: foundVariables.length,
            availableDynamicVars: Object.keys(this.dynamicVariables).length,
            availableStaticVars: Object.keys(this.variables).length,
            unresolvableCount: unresolvableVars.length,
            unresolvableVars: unresolvableVars.map(m => m[1])
        };
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

    // 전역 컬럼 오버라이드 적용
    applyGlobalColumnOverrides(sourceData, globalColumnOverrides) {
        try {
            if (!globalColumnOverrides || Object.keys(globalColumnOverrides).length === 0) {
                this.log('전역 컬럼 오버라이드가 없습니다. 원본 데이터를 그대로 사용합니다.');
                return sourceData;
            }
            
            this.log(`전역 컬럼 오버라이드 적용 중: ${Object.keys(globalColumnOverrides).join(', ')}`);
            
            const processedData = sourceData.map(row => {
                const newRow = { ...row }; // 원본 데이터 복사
                
                // 각 오버라이드 적용
                Object.entries(globalColumnOverrides).forEach(([column, value]) => {
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
            
            this.log(`${sourceData.length}행에 전역 컬럼 오버라이드 적용 완료`);
            return processedData;
            
        } catch (error) {
            this.log(`전역 컬럼 오버라이드 적용 실패: ${error.message}`);
            throw error;
        }
    }

    // 전역 전/후처리 그룹 실행
    async executeGlobalProcessGroups(phase) {
        const groups = phase === 'preProcess' 
            ? this.config.globalProcesses.preProcessGroups 
            : this.config.globalProcesses.postProcessGroups;
        
        const enabledGroups = groups.filter(group => group.enabled);
        
        if (enabledGroups.length === 0) {
            this.log(`활성화된 전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹이 없습니다.`);
            return;
        }
        
        this.log(`\n=== 전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 실행 (${enabledGroups.length}개) ===`);
        this.progressManager.updatePhase(
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
                
                const result = await this.executeProcessScript(scriptConfig, 'target');
                
                if (!result.success) {
                    const errorMsg = `전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 [${group.id}] 실행 실패: ${result.error}`;
                    this.log(errorMsg);
                    
                    // 전처리 실패 시 마이그레이션 중단
                    if (phase === 'preProcess') {
                        this.progressManager.updatePhase('PRE_PROCESSING', 'FAILED', errorMsg);
                        throw new Error(errorMsg);
                    }
                    // 후처리 실패 시 경고만 기록하고 계속 진행
                    else {
                        this.log(`경고: ${errorMsg} - 다음 그룹 계속 진행`);
                    }
                } else {
                    // 그룹별 실행 결과 상세 표시
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
                    this.progressManager.updatePhase('PRE_PROCESSING', 'FAILED', errorMsg);
                    throw new Error(errorMsg);
                } else {
                    this.log(`경고: ${errorMsg} - 다음 그룹 계속 진행`);
                }
            }
        }
        
        this.progressManager.updatePhase(
            phase === 'preProcess' ? 'PRE_PROCESSING' : 'POST_PROCESSING', 
            'COMPLETED', 
            `Global ${phase === 'preProcess' ? 'pre' : 'post'}-processing groups completed`
        );
        this.log(`=== 전역 ${phase === 'preProcess' ? '전처리' : '후처리'} 그룹 완료 ===\n`);
    }

    // 전처리/후처리 SQL 실행
    async executeProcessScript(scriptConfig, database = 'target') {
        try {
            if (!scriptConfig || !scriptConfig.script) {
                this.log('실행할 스크립트가 없습니다.');
                return { success: true };
            }
            
            this.log(`${scriptConfig.description} 실행 중...`);
            
            // 디버그 모드에서 원본 스크립트 로깅
            const debugScripts = process.env.DEBUG_SCRIPTS === 'true';
            const debugVariables = process.env.DEBUG_VARIABLES === 'true';
            
            if (debugScripts) {
                this.log(`원본 스크립트: ${scriptConfig.script.substring(0, 300)}${scriptConfig.script.length > 300 ? '...' : ''}`);
            }
            
            // 변수 상태 디버깅 (요청된 경우)
            if (debugVariables) {
                this.validateAndDebugVariables(scriptConfig.script, `${scriptConfig.description} (전/후처리)`);
            }
            
            // 변수 치환
            const processedScript = this.replaceVariables(scriptConfig.script);
            
            if (debugScripts) {
                this.log(`처리된 스크립트: ${processedScript.substring(0, 300)}${processedScript.length > 300 ? '...' : ''}`);
            }
            
            // 변수 치환 후에도 남은 변수가 있는지 확인
            const remainingVars = [...processedScript.matchAll(/\$\{([^}]+)\}/g)];
            if (remainingVars.length > 0) {
                this.log(`⚠️  치환되지 않은 변수가 있습니다: ${remainingVars.map(m => m[0]).join(', ')}`);
                if (debugVariables) {
                    this.log(`치환되지 않은 변수 상세:`);
                    remainingVars.forEach(match => {
                        this.log(`  • ${match[0]} (변수명: ${match[1]})`);
                    });
                }
            }
            
            // SELECT * 처리 (변수 치환 후, 주석 제거 전)
            const selectStarProcessedScript = await this.processSelectStarInScript(processedScript, database);
            
            if (debugScripts && selectStarProcessedScript !== processedScript) {
                this.log(`SELECT * 처리 후 스크립트: ${selectStarProcessedScript.substring(0, 300)}${selectStarProcessedScript.length > 300 ? '...' : ''}`);
            }
            
            // globalColumnOverrides 처리 (SELECT * 처리 후, 주석 제거 전)
            // 단계별 applyGlobalColumns 설정 사용
            let globalColumnOverridesProcessedScript;
            if (scriptConfig.applyGlobalColumns) {
                // 현재 쿼리에서 테이블명 추출
                const currentQuery = this.getCurrentQuery();
                let tableName = null;
                
                if (currentQuery && currentQuery.sql) {
                    // INSERT 문에서 테이블명 추출
                    const insertMatch = currentQuery.sql.match(/INSERT\s+INTO\s+(\w+)/i);
                    if (insertMatch) {
                        tableName = insertMatch[1];
                    }
                }
                
                const stepColumnOverrides = await this.selectivelyApplyGlobalColumnOverrides(
                    this.config.globalColumnOverrides, 
                    scriptConfig.applyGlobalColumns,
                    tableName,
                    database
                );
                globalColumnOverridesProcessedScript = stepColumnOverrides && Object.keys(stepColumnOverrides).length > 0
                    ? this.processGlobalColumnOverridesInScript(selectStarProcessedScript, stepColumnOverrides, database)
                    : selectStarProcessedScript;
            } else {
                // applyGlobalColumns가 명시되지 않았으면 컬럼 오버라이드 적용 안함
                globalColumnOverridesProcessedScript = selectStarProcessedScript;
            }
            
            if (debugScripts && globalColumnOverridesProcessedScript !== selectStarProcessedScript) {
                this.log(`globalColumnOverrides 처리 후 스크립트: ${globalColumnOverridesProcessedScript.substring(0, 300)}${globalColumnOverridesProcessedScript.length > 300 ? '...' : ''}`);
            }
            
            // 스크립트 전처리: 주석 제거
            const cleanedScript = this.removeComments(globalColumnOverridesProcessedScript);
            
            if (debugScripts && cleanedScript !== selectStarProcessedScript) {
                this.log(`주석 제거 후 스크립트: ${cleanedScript.substring(0, 300)}${cleanedScript.length > 300 ? '...' : ''}`);
                this.log(`스크립트 길이 변화: ${selectStarProcessedScript.length} → ${cleanedScript.length} 문자`);
            }
            
            // 스크립트를 세미콜론으로 분할하여 개별 SQL 문으로 실행
            const sqlStatements = cleanedScript
                .split(';')
                .map(sql => sql.trim())
                .filter(sql => sql.length > 0); // 빈 문장만 제거
            
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
                    if (database === 'source') {
                        result = await this.connectionManager.executeQueryOnSource(sql);
                    } else {
                        result = await this.connectionManager.executeQueryOnTarget(sql);
                    }
                    executedCount++;
                    
                    // 실행 결과 상세 표시
                    if (result && result.rowsAffected && result.rowsAffected.length > 0) {
                        const affectedRows = result.rowsAffected.reduce((sum, count) => sum + count, 0);
                        if (affectedRows > 0) {
                            this.log(`  ✓ SQL 문 ${i + 1} 실행 성공: ${affectedRows}행 영향받음`);
                        } else {
                            this.log(`  ✓ SQL 문 ${i + 1} 실행 성공 (영향받은 행 없음)`);
                        }
                    } else if (result && result.recordset && result.recordset.length > 0) {
                        this.log(`  ✓ SQL 문 ${i + 1} 실행 성공: ${result.recordset.length}행 조회됨`);
                    } else {
                        this.log(`  ✓ SQL 문 ${i + 1} 실행 성공`);
                    }
                    
                    if (debugScripts) {
                        this.log(`SQL 문 ${i + 1} 실행 성공`);
                    }
                } catch (sqlError) {
                    const errorMsg = `SQL 실행 경고 (계속 진행): ${sqlError.message}`;
                    this.log(errorMsg);
                    this.log(`실패한 SQL: ${sql.substring(0, 100)}...`);
                    
                    errors.push({
                        sqlIndex: i + 1,
                        sql: sql.substring(0, 200),
                        error: sqlError.message
                    });
                    
                    // 개별 SQL 실패는 경고로 처리하고 계속 진행
                }
            }
            
            if (errors.length > 0) {
                this.log(`총 ${errors.length}개의 SQL 실행 오류가 발생했습니다.`);
            }
            
            // 전/후처리 실행 결과 상세 요약
            this.log(`\n📊 ${scriptConfig.description} 실행 결과:`);
            this.log(`  • 총 SQL 문: ${sqlStatements.length}개`);
            this.log(`  • 성공 실행: ${executedCount}개`);
            if (errors.length > 0) {
                this.log(`  • 실패: ${errors.length}개`);
                this.log(`  • 성공률: ${((executedCount / sqlStatements.length) * 100).toFixed(1)}%`);
            }
            this.log(`  • 실행 시간: ${new Date().toLocaleTimeString()}`);
            
            return { 
                success: true, 
                executedCount, 
                totalStatements: sqlStatements.length,
                errors: errors.length > 0 ? errors : undefined
            };
            
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
            
            // 정교한 주석 제거 (문자열 내부 주석 보호)
            const cleanedQuery = this.removeComments(queryContent);
            
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

    // 행 수 추정을 위한 안전한 쿼리 처리
    async estimateQueryRowCount(queryConfig) {
        try {
            let sourceQuery;
            
            // SQL 파일에서 쿼리 로드
            if (queryConfig.sourceQueryFile) {
                this.log(`행 수 추정용 SQL 파일 로드: ${queryConfig.sourceQueryFile}`);
                const fileQuery = await this.loadQueryFromFile(queryConfig.sourceQueryFile);
                sourceQuery = this.replaceVariables(fileQuery);
            } else if (queryConfig.sourceQuery) {
                // 기존 방식: sourceQuery 직접 사용
                sourceQuery = this.replaceVariables(queryConfig.sourceQuery);
            } else {
                throw new Error('sourceQuery 또는 sourceQueryFile 중 하나는 반드시 지정해야 합니다.');
            }
            
            // 행 수만 조회하기 위한 COUNT 쿼리로 변환 시도
            try {
                // 원본 쿼리를 서브쿼리로 감싸서 COUNT 쿼리 생성
                const countQuery = `SELECT COUNT(*) as row_count FROM (${sourceQuery}) as sub_query`;
                const countData = await this.connectionManager.querySource(countQuery);
                const rowCount = countData[0]?.row_count || 0;
                this.log(`쿼리 ${queryConfig.id} 예상 행 수: ${rowCount.toLocaleString()}`);
                return rowCount;
            } catch (countError) {
                // COUNT 쿼리 실패 시 원본 쿼리로 전체 데이터 조회 (fallback)
                this.log(`COUNT 쿼리 실패, 원본 쿼리로 fallback: ${countError.message}`);
                const sourceData = await this.connectionManager.querySource(sourceQuery);
                return sourceData.length;
            }
            
        } catch (error) {
            this.log(`쿼리 ${queryConfig.id} 행 수 추정 중 오류: ${error.message}`);
            return 0; // 추정 실패 시 0 반환
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
                
                // IDENTITY 컬럼 조회
                const identityColumns = await this.getIdentityColumns(queryConfig.targetTable, false);
                
                // targetColumns 자동 설정 (IDENTITY 컬럼 제외)
                const columnNames = columns.map(col => col.name);
                const filteredColumnNames = columnNames.filter(col => !identityColumns.includes(col));
                
                if (identityColumns.length > 0) {
                    this.log(`IDENTITY 컬럼 자동 제외: ${identityColumns.join(', ')}`);
                }
                
                queryConfig.targetColumns = filteredColumnNames;
                
                this.log(`자동 설정된 컬럼 목록 (${filteredColumnNames.length}개, IDENTITY 제외): ${filteredColumnNames.join(', ')}`);
                
                // sourceQuery도 컬럼명으로 변경 (IDENTITY 컬럼 제외)
                const explicitColumns = filteredColumnNames.join(', ');
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
                // 전처리 실행 결과 상세 표시
                if (preResult.executedCount !== undefined) {
                    this.log(`  📊 전처리 통계: ${preResult.executedCount}/${preResult.totalStatements}개 SQL 문 성공`);
                    if (preResult.errors && preResult.errors.length > 0) {
                        this.log(`  ⚠️  전처리 경고: ${preResult.errors.length}개 SQL 문에서 오류 발생`);
                    }
                }
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
                            const identityColumns = typeof queryConfig.identityColumns === 'string' && queryConfig.identityColumns.includes(',')
            ? queryConfig.identityColumns.split(',').map(pk => pk.trim())
            : queryConfig.identityColumns;
        await this.connectionManager.deleteFromTargetByPK(queryConfig.targetTable, identityColumns, sourceData);
                } else {
                    this.log(`소스 데이터가 없어 ${queryConfig.targetTable} 테이블 삭제를 건너뜁니다.`);
                }
            }
            
            if (sourceData.length === 0) {
                this.log('조회된 데이터가 없습니다. 이관을 건너뜁니다.');
                return { success: true, rowsProcessed: 0 };
            }
            
            // globalColumnOverrides 적용
            const processedData = this.applyGlobalColumnOverrides(sourceData, queryConfig.columnOverrides);
            
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
                // 후처리 실행 결과 상세 표시
                if (postResult.executedCount !== undefined) {
                    this.log(`  📊 후처리 통계: ${postResult.executedCount}/${postResult.totalStatements}개 SQL 문 성공`);
                    if (postResult.errors && postResult.errors.length > 0) {
                        this.log(`  ⚠️  후처리 경고: ${postResult.errors.length}개 SQL 문에서 오류 발생`);
                    }
                }
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
            
            // 전역 전처리 그룹 실행
            if (this.config.globalProcesses && this.config.globalProcesses.preProcessGroups) {
                await this.executeGlobalProcessGroups('preProcess');
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
                this.log('🔍 쿼리별 행 수 추정 시작...');
                for (const query of enabledQueries) {
                    const rowCount = await this.estimateQueryRowCount(query);
                    totalEstimatedRows += rowCount;
                }
                this.log(`📊 총 예상 이관 행 수: ${totalEstimatedRows.toLocaleString()}`);
                
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
                    // 현재 쿼리 설정 (전/후처리에서 columnOverrides 사용하기 위해)
                    this.setCurrentQuery(queryConfig);
                    
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
                    
                    // 쿼리 완료 후 현재 쿼리 초기화
                    this.setCurrentQuery(null);
                }
                
                // 트랜잭션 커밋
                if (this.enableTransaction && transaction) {
                    this.log('트랜잭션 커밋');
                    await transaction.commit();
                }
                
                // 전역 후처리 그룹 실행
                if (this.config.globalProcesses && this.config.globalProcesses.postProcessGroups) {
                    await this.executeGlobalProcessGroups('postProcess');
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
                    // 안전한 행 수 추정 사용
                    const rowCount = await this.estimateQueryRowCount(queryConfig);
                    totalRows += rowCount;
                    totalQueries++;
                    
                    console.log(`   📊 이관 예정 데이터: ${rowCount.toLocaleString()}행`);
                    
                    if (queryConfig.deleteBeforeInsert) {
                        console.log(`   🗑️ 삭제 방식: PK(${queryConfig.identityColumns}) 기준 삭제`);
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