const fs = require('fs');
const xml2js = require('xml2js');
const logger = require('../logger');

/**
 * 설정 파일 파서 모듈
 * XML 및 JSON 형태의 쿼리 정의 파일을 파싱하는 기능을 담당
 */
class ConfigParser {
    constructor() {
        this.variables = {};
        this.dynamicVariables = {};
    }

    /**
     * 설정 파일 로드 및 파싱
     * @param {string} queryFilePath - 쿼리 파일 경로
     * @returns {Promise<Object>} 파싱된 설정 객체
     */
    async loadConfig(queryFilePath) {
        try {
            if (!fs.existsSync(queryFilePath)) {
                throw new Error(`쿼리문정의 파일을 찾을 수 없습니다: ${queryFilePath}`);
            }

            const configData = fs.readFileSync(queryFilePath, 'utf8');
            
            // 파일 확장자로 형식 판단
            const isXmlFile = queryFilePath.toLowerCase().endsWith('.xml');
            
            let config;
            if (isXmlFile) {
                config = await this.parseXmlConfig(configData);
            } else {
                config = JSON.parse(configData);
            }
            
            this.variables = config.variables || {};
            
            logger.info('설정 파일 로드 완료', {
                path: queryFilePath,
                format: isXmlFile ? 'XML' : 'JSON',
                queriesCount: config.queries?.length || 0,
                variablesCount: Object.keys(this.variables).length
            });
            
            return config;
        } catch (error) {
            logger.error('설정 파일 로드 실패', error);
            throw error;
        }
    }

    /**
     * XML 설정 파일 파싱
     * @param {string} xmlData - XML 데이터
     * @returns {Promise<Object>} 파싱된 설정 객체
     */
    async parseXmlConfig(xmlData) {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        if (!result.migration) {
            throw new Error('XML 파일에 migration 루트 엘리먼트가 없습니다.');
        }
        
        const migration = result.migration;
        const config = {
            variables: {},
            dynamicVariables: {},
            globalProcesses: {
                preProcessGroups: [],
                postProcessGroups: []
            },
            globalColumnOverrides: new Map(),
            queries: []
        };

        // 전역 전처리/후처리 그룹 파싱
        this.parseGlobalProcesses(migration, config);
        
        // 전역 변수 파싱
        this.parseGlobalVariables(migration, config);
        
        // 전역 columnOverrides 파싱
        this.parseGlobalColumnOverrides(migration, config);
        
        // 동적 변수 파싱
        this.parseDynamicVariables(migration, config);
        
        // 쿼리 파싱
        this.parseQueries(migration, config);
        
        return config;
    }

    /**
     * 전역 전처리/후처리 그룹 파싱
     * @param {Object} migration - 마이그레이션 객체
     * @param {Object} config - 설정 객체
     */
    parseGlobalProcesses(migration, config) {
        if (!migration.globalProcesses) return;

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

    /**
     * 전역 변수 파싱
     * @param {Object} migration - 마이그레이션 객체
     * @param {Object} config - 설정 객체
     */
    parseGlobalVariables(migration, config) {
        if (!migration.variables || !migration.variables.var) return;

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

    /**
     * 전역 컬럼 오버라이드 파싱
     * @param {Object} migration - 마이그레이션 객체
     * @param {Object} config - 설정 객체
     */
    parseGlobalColumnOverrides(migration, config) {
        if (!migration.globalColumnOverrides || !migration.globalColumnOverrides.override) return;

        const globalOverrides = Array.isArray(migration.globalColumnOverrides.override) 
            ? migration.globalColumnOverrides.override 
            : [migration.globalColumnOverrides.override];
        
        globalOverrides.forEach(override => {
            if (override.column && override._) {
                config.globalColumnOverrides.set(override.column, override._);
            }
        });
        
        logger.info('전역 columnOverrides 로드됨', {
            count: config.globalColumnOverrides.size,
            columns: Array.from(config.globalColumnOverrides.keys())
        });
    }

    /**
     * 동적 변수 파싱
     * @param {Object} migration - 마이그레이션 객체
     * @param {Object} config - 설정 객체
     */
    parseDynamicVariables(migration, config) {
        if (!migration.dynamicVariables || !migration.dynamicVariables.dynamicVar) return;

        const dynamicVars = Array.isArray(migration.dynamicVariables.dynamicVar)
            ? migration.dynamicVariables.dynamicVar
            : [migration.dynamicVariables.dynamicVar];
            
        dynamicVars.forEach(dv => {
            if (dv.name && dv.sourceDb && dv.sourceQuery) {
                config.dynamicVariables[dv.name] = {
                    sourceDb: dv.sourceDb,
                    sourceQuery: dv.sourceQuery._,
                    description: dv.description || `동적 변수 ${dv.name}`
                };
            }
        });
    }

    /**
     * 쿼리 파싱
     * @param {Object} migration - 마이그레이션 객체
     * @param {Object} config - 설정 객체
     */
    parseQueries(migration, config) {
        if (!migration.queries || !migration.queries.query) return;

        const queries = Array.isArray(migration.queries.query) 
            ? migration.queries.query 
            : [migration.queries.query];
        
        queries.forEach(q => {
            if (q.id) {
                const queryConfig = {
                    id: q.id,
                    description: q.description || `쿼리 ${q.id}`,
                    enabled: q.enabled !== 'false' && q.enabled !== false,
                    sourceDb: q.sourceDb,
                    targetDb: q.targetDb,
                    sourceQuery: q.sourceQuery?._?.trim() || '',
                    targetTable: q.targetTable,
                    batchSize: parseInt(q.batchSize) || 1000,
                    truncateTarget: q.truncateTarget === 'true' || q.truncateTarget === true,
                    preProcessGroups: [],
                    postProcessGroups: [],
                    columnOverrides: new Map()
                };

                // 전처리/후처리 그룹 파싱
                this.parseQueryProcessGroups(q, queryConfig);
                
                // 컬럼 오버라이드 파싱
                this.parseQueryColumnOverrides(q, queryConfig);

                config.queries.push(queryConfig);
            }
        });
    }

    /**
     * 쿼리별 전처리/후처리 그룹 파싱
     * @param {Object} query - 쿼리 객체
     * @param {Object} queryConfig - 쿼리 설정 객체
     */
    parseQueryProcessGroups(query, queryConfig) {
        // 전처리 그룹
        if (query.preProcessGroups && query.preProcessGroups.group) {
            const preGroups = Array.isArray(query.preProcessGroups.group) 
                ? query.preProcessGroups.group 
                : [query.preProcessGroups.group];
            
            preGroups.forEach(group => {
                if (group.id && group._) {
                    queryConfig.preProcessGroups.push({
                        id: group.id,
                        description: group.description || `전처리 그룹 ${group.id}`,
                        enabled: group.enabled === 'true' || group.enabled === true,
                        script: group._.trim()
                    });
                }
            });
        }
        
        // 후처리 그룹
        if (query.postProcessGroups && query.postProcessGroups.group) {
            const postGroups = Array.isArray(query.postProcessGroups.group) 
                ? query.postProcessGroups.group 
                : [query.postProcessGroups.group];
            
            postGroups.forEach(group => {
                if (group.id && group._) {
                    queryConfig.postProcessGroups.push({
                        id: group.id,
                        description: group.description || `후처리 그룹 ${group.id}`,
                        enabled: group.enabled === 'true' || group.enabled === true,
                        script: group._.trim()
                    });
                }
            });
        }
    }

    /**
     * 쿼리별 컬럼 오버라이드 파싱
     * @param {Object} query - 쿼리 객체
     * @param {Object} queryConfig - 쿼리 설정 객체
     */
    parseQueryColumnOverrides(query, queryConfig) {
        if (!query.columnOverrides || !query.columnOverrides.override) return;

        const overrides = Array.isArray(query.columnOverrides.override) 
            ? query.columnOverrides.override 
            : [query.columnOverrides.override];
        
        overrides.forEach(override => {
            if (override.column && override._) {
                queryConfig.columnOverrides.set(override.column, override._);
            }
        });
    }
}

module.exports = ConfigParser;
