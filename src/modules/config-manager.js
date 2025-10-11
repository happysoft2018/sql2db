const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const logger = require('../logger');

/**
 * 설정 파일 로드 및 파싱 담당 모듈
 */
class ConfigManager {
    constructor() {
        this.dbInfoPath = path.join(__dirname, '../../config/dbinfo.json');
        this.dbInfo = null;
    }

    /**
     * DB 정보 파일 로드
     */
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

    /**
     * DB ID로 연결 정보 조회
     */
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
            isWritable: dbConfig.isWritable ?? false,
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

    /**
     * 쿼리 설정 파일 로드 및 파싱
     */
    async loadConfig(queryFilePath) {
        try {
            await this.loadDbInfo();
            
            if (!fs.existsSync(queryFilePath)) {
                throw new Error(`쿼리문정의 파일을 찾을 수 없습니다: ${queryFilePath}`);
            }

            const configData = fs.readFileSync(queryFilePath, 'utf8');
            const isXmlFile = queryFilePath.toLowerCase().endsWith('.xml');
            
            let config;
            if (isXmlFile) {
                config = await this.parseXmlConfig(configData);
            } else {
                config = JSON.parse(configData);
            }
            
            logger.info('쿼리문정의 파일 로드 완료', {
                path: queryFilePath,
                format: isXmlFile ? 'XML' : 'JSON',
                enabledQueries: config.queries.filter(q => q.enabled).length
            });
            
            return config;
        } catch (error) {
            logger.error('쿼리문정의 파일 로드 실패', error);
            throw new Error(`쿼리문정의 파일 로드 실패: ${error.message}`);
        }
    }

    /**
     * XML 설정 파일 파싱
     */
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
                globalColumnOverrides: new Map(),
                queries: []
            };
            
            // 설정 파싱
            if (migration.settings) {
                config.settings = this.parseSettings(migration.settings);
            }
            
            // 전역 변수 파싱
            if (migration.variables && migration.variables.var) {
                config.variables = this.parseVariables(migration.variables.var);
            }
            
            // 전역 컬럼 오버라이드 파싱
            if (migration.globalColumnOverrides && migration.globalColumnOverrides.override) {
                config.globalColumnOverrides = this.parseGlobalColumnOverrides(migration.globalColumnOverrides.override);
            }
            
            // 전역 전/후처리 그룹 파싱
            if (migration.globalProcesses) {
                config.globalProcesses = this.parseGlobalProcesses(migration.globalProcesses);
            }
            
            // 동적 변수 파싱
            if (migration.dynamicVariables && migration.dynamicVariables.dynamicVar) {
                config.dynamicVariables = this.parseDynamicVariables(
                    migration.dynamicVariables.dynamicVar,
                    config.settings.sourceDatabase
                );
            }
            
            // 쿼리 파싱
            if (migration.queries && migration.queries.query) {
                config.queries = this.parseQueries(
                    migration.queries.query,
                    config.settings
                );
            }
            
            return config;
        } catch (error) {
            throw new Error(`XML 파싱 실패: ${error.message}`);
        }
    }

    /**
     * 설정 섹션 파싱
     */
    parseSettings(settingsXml) {
        const settings = {};
        
        // 데이터베이스 설정
        if (settingsXml.sourceDatabase) {
            settings.sourceDatabase = settingsXml.sourceDatabase;
        }
        if (settingsXml.targetDatabase) {
            settings.targetDatabase = settingsXml.targetDatabase;
        }
        
        // 기본 설정
        if (settingsXml.batchSize) {
            settings.batchSize = settingsXml.batchSize;
        }
        if (settingsXml.deleteBeforeInsert) {
            settings.deleteBeforeInsert = settingsXml.deleteBeforeInsert === 'true';
        }
        
        return settings;
    }

    /**
     * 변수 섹션 파싱
     */
    parseVariables(varsXml) {
        const variables = {};
        const vars = Array.isArray(varsXml) ? varsXml : [varsXml];
        
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
                
                variables[v.name] = value;
            }
        });
        
        return variables;
    }

    /**
     * 전역 컬럼 오버라이드 파싱
     */
    parseGlobalColumnOverrides(overridesXml) {
        const globalOverrides = new Map();
        const overrides = Array.isArray(overridesXml) ? overridesXml : [overridesXml];
        
        overrides.forEach(override => {
            if (override.column && override._) {
                globalOverrides.set(override.column, override._);
            }
        });
        
        logger.info('전역 columnOverrides 로드됨', {
            count: globalOverrides.size,
            columns: Array.from(globalOverrides.keys())
        });
        
        return globalOverrides;
    }

    /**
     * 전역 전/후처리 그룹 파싱
     */
    parseGlobalProcesses(processesXml) {
        const globalProcesses = {
            preProcessGroups: [],
            postProcessGroups: []
        };
        
        // 전역 전처리 그룹 파싱
        if (processesXml.preProcessGroups && processesXml.preProcessGroups.group) {
            const preGroups = Array.isArray(processesXml.preProcessGroups.group)
                ? processesXml.preProcessGroups.group
                : [processesXml.preProcessGroups.group];
            
            preGroups.forEach(group => {
                if (group.id && group._) {
                    globalProcesses.preProcessGroups.push({
                        id: group.id,
                        description: group.description || `전처리 그룹 ${group.id}`,
                        enabled: group.enabled === 'true' || group.enabled === true,
                        script: group._.trim()
                    });
                }
            });
        }
        
        // 전역 후처리 그룹 파싱
        if (processesXml.postProcessGroups && processesXml.postProcessGroups.group) {
            const postGroups = Array.isArray(processesXml.postProcessGroups.group)
                ? processesXml.postProcessGroups.group
                : [processesXml.postProcessGroups.group];
            
            postGroups.forEach(group => {
                if (group.id && group._) {
                    globalProcesses.postProcessGroups.push({
                        id: group.id,
                        description: group.description || `후처리 그룹 ${group.id}`,
                        enabled: group.enabled === 'true' || group.enabled === true,
                        script: group._.trim()
                    });
                }
            });
        }
        
        logger.info('전역 전/후처리 그룹 로드됨', {
            preProcessGroups: globalProcesses.preProcessGroups.length,
            postProcessGroups: globalProcesses.postProcessGroups.length,
            enabledPreGroups: globalProcesses.preProcessGroups.filter(g => g.enabled).map(g => g.id),
            enabledPostGroups: globalProcesses.postProcessGroups.filter(g => g.enabled).map(g => g.id)
        });
        
        return globalProcesses;
    }

    /**
     * 동적 변수 파싱
     */
    parseDynamicVariables(dynamicVarsXml, defaultDatabase) {
        const dynamicVariables = [];
        const dynamicVars = Array.isArray(dynamicVarsXml) ? dynamicVarsXml : [dynamicVarsXml];
        
        dynamicVars.forEach(dv => {
            const dynamicVar = {
                id: dv.id,
                description: dv.description,
                variableName: dv.variableName,
                query: dv._?.trim() || '',
                extractType: dv.extractType,
                database: dv.database || defaultDatabase,
                enabled: dv.enabled === 'true'
            };
            
            // extractType별 추가 속성
            if (dv.columnName) dynamicVar.columnName = dv.columnName;
            if (dv.columns) {
                dynamicVar.columns = dv.columns.split(',').map(c => c.trim());
            }
            
            dynamicVariables.push(dynamicVar);
        });
        
        return dynamicVariables;
    }

    /**
     * 쿼리 섹션 파싱
     */
    parseQueries(queriesXml, settings) {
        const queries = [];
        const queryList = Array.isArray(queriesXml) ? queriesXml : [queriesXml];
        
        // 허용되는 query 요소 속성
        const validQueryXmlAttrs = [
            'id', 'description', 'enabled', 'batchSize', 'deleteBeforeInsert',
            'sourceQuery', 'sourceQueryFile', 'targetTable', 'targetColumns', 
            'identityColumns', 'preProcess', 'postProcess'
        ];
        
        // 허용되는 sourceQuery 요소 속성
        const validSourceQueryXmlAttrs = [
            'targetTable', 'targetColumns', 'identityColumns', 'sourceQueryFile',
            'applyGlobalColumns', 'deleteBeforeInsert', '_' // _ 는 CDATA 내용
        ];
        
        // 허용되는 preProcess/postProcess 요소 속성
        const validProcessXmlAttrs = [
            'description', 'runInTransaction', 'database', 'applyGlobalColumns', '_'
        ];
        
        queryList.forEach((q, index) => {
            // query 요소 속성명 검증
            const queryAttrs = Object.keys(q);
            const invalidQueryAttrs = queryAttrs.filter(attr => !validQueryXmlAttrs.includes(attr));
            
            if (invalidQueryAttrs.length > 0) {
                const errorMsg = `❌ queries[${index}] (id: ${q.id || '미지정'})에 잘못된 속성이 있습니다: ${invalidQueryAttrs.join(', ')}\n` +
                                `   허용되는 속성: ${validQueryXmlAttrs.join(', ')}`;
                logger.error(errorMsg);
                throw new Error(`XML 파싱 오류: ${errorMsg}`);
            }
            
            const query = {
                id: q.id,
                description: q.description,
                batchSize: q.batchSize || settings.batchSize,
                enabled: q.enabled === 'true'
            };
            
            // sourceQuery 처리
            if (q.sourceQueryFile) {
                query.sourceQueryFile = q.sourceQueryFile;
                query.sourceQueryApplyGlobalColumns = 'all';
                query.sourceQueryDeleteBeforeInsert = q.deleteBeforeInsert !== undefined 
                    ? (q.deleteBeforeInsert === 'true') 
                    : settings.deleteBeforeInsert;
                query.targetTable = q.targetTable;
                query.targetColumns = q.targetColumns ? q.targetColumns.split(',').map(c => c.trim()) : [];
                query.identityColumns = q.identityColumns;
            } else if (q.sourceQuery) {
                if (typeof q.sourceQuery === 'object') {
                    // sourceQuery 요소 속성명 검증
                    const sourceQueryAttrs = Object.keys(q.sourceQuery);
                    const invalidSourceAttrs = sourceQueryAttrs.filter(attr => !validSourceQueryXmlAttrs.includes(attr));
                    
                    if (invalidSourceAttrs.length > 0) {
                        const errorMsg = `❌ queries[${index}] (id: ${q.id || '미지정'})의 sourceQuery에 잘못된 속성이 있습니다: ${invalidSourceAttrs.join(', ')}\n` +
                                        `   허용되는 속성: ${validSourceQueryXmlAttrs.filter(a => a !== '_').join(', ')}`;
                        logger.error(errorMsg);
                        throw new Error(`XML 파싱 오류: ${errorMsg}`);
                    }
                    
                    query.sourceQueryApplyGlobalColumns = q.sourceQuery.applyGlobalColumns || undefined;
                    query.sourceQueryDeleteBeforeInsert = q.sourceQuery.deleteBeforeInsert !== undefined
                        ? (q.sourceQuery.deleteBeforeInsert === 'true')
                        : settings.deleteBeforeInsert;
                    query.targetTable = q.sourceQuery.targetTable;
                    query.targetColumns = q.sourceQuery.targetColumns 
                        ? q.sourceQuery.targetColumns.split(',').map(c => c.trim()) 
                        : [];
                    query.identityColumns = q.sourceQuery.identityColumns;
                    query.sourceQueryFile = q.sourceQuery.sourceQueryFile;
                    query.sourceQuery = q.sourceQuery._ ? q.sourceQuery._.trim() : '';
                } else {
                    query.sourceQueryApplyGlobalColumns = undefined;
                    query.sourceQueryDeleteBeforeInsert = q.deleteBeforeInsert !== undefined
                        ? (q.deleteBeforeInsert === 'true')
                        : settings.deleteBeforeInsert;
                    query.targetTable = q.targetTable;
                    query.targetColumns = q.targetColumns ? q.targetColumns.split(',').map(c => c.trim()) : [];
                    query.identityColumns = q.identityColumns;
                    query.sourceQuery = q.sourceQuery.trim();
                }
            }
            
            // 전처리 파싱 및 속성명 검증
            if (q.preProcess) {
                if (typeof q.preProcess === 'object') {
                    const preProcessAttrs = Object.keys(q.preProcess);
                    const invalidPreAttrs = preProcessAttrs.filter(attr => !validProcessXmlAttrs.includes(attr));
                    
                    if (invalidPreAttrs.length > 0) {
                        const errorMsg = `❌ queries[${index}] (id: ${q.id || '미지정'})의 preProcess에 잘못된 속성이 있습니다: ${invalidPreAttrs.join(', ')}\n` +
                                        `   허용되는 속성: ${validProcessXmlAttrs.filter(a => a !== '_').join(', ')}`;
                        logger.error(errorMsg);
                        throw new Error(`XML 파싱 오류: ${errorMsg}`);
                    }
                }
                
                query.preProcess = {
                    description: q.preProcess.description || `${query.id} 전처리`,
                    script: q.preProcess._.trim(),
                    applyGlobalColumns: q.preProcess.applyGlobalColumns || undefined
                };
            }
            
            // 후처리 파싱 및 속성명 검증
            if (q.postProcess) {
                if (typeof q.postProcess === 'object') {
                    const postProcessAttrs = Object.keys(q.postProcess);
                    const invalidPostAttrs = postProcessAttrs.filter(attr => !validProcessXmlAttrs.includes(attr));
                    
                    if (invalidPostAttrs.length > 0) {
                        const errorMsg = `❌ queries[${index}] (id: ${q.id || '미지정'})의 postProcess에 잘못된 속성이 있습니다: ${invalidPostAttrs.join(', ')}\n` +
                                        `   허용되는 속성: ${validProcessXmlAttrs.filter(a => a !== '_').join(', ')}`;
                        logger.error(errorMsg);
                        throw new Error(`XML 파싱 오류: ${errorMsg}`);
                    }
                }
                
                query.postProcess = {
                    description: q.postProcess.description || `${query.id} 후처리`,
                    script: q.postProcess._.trim(),
                    applyGlobalColumns: q.postProcess.applyGlobalColumns || undefined
                };
            }
            
            queries.push(query);
        });
        
        logger.info('쿼리 파싱 완료', {
            totalQueries: queries.length,
            enabledQueries: queries.filter(q => q.enabled).length
        });
        
        return queries;
    }

    /**
     * DB 정보 조회
     */
    getDbInfo() {
        return this.dbInfo;
    }
}

module.exports = ConfigManager;

