const logger = require('../logger');

// 언어 설정 (환경 변수 사용, 기본값 영어)
const LANGUAGE = process.env.LANGUAGE || 'en';

// 다국어 메시지
const messages = {
    en: {
        dynamicVarSet: 'Dynamic variable set:',
        dynamicVarExtractStart: '=== Dynamic variable extraction started:',
        extractQuery: 'Extract query:',
        queryAfterVarSubst: 'Query after variable substitution:',
        database: 'Database:',
        unknownDatabase: 'Unknown database: {db}. Available DBs: {dbs}',
        extractedRowsCount: 'Extracted rows count:',
        noDataExtracted: 'No data extracted. Variable {var} will be set to empty array.',
        dynamicVarExtractComplete: '=== Dynamic variable extraction completed:',
        dynamicVarExtractFailed: 'Dynamic variable extraction failed: {var} - {error}',
        singleValueExtract: 'Single value extracted: {value}',
        singleColumnExtract: 'Single column extracted ({col}): {count} values',
        multiColumnExtract: 'Multiple columns extracted ({cols}): {count} values',
        identifiedColumnExtract: 'Column-identified extraction ({cols}): {count} values ({colCount} columns)',
        keyValuePairExtract: 'Key-value pair extracted: {count} pairs',
        defaultExtract: 'Default extraction (column_identified): {count} values ({colCount} columns)',
        keyValuePairsNeedTwoCols: 'key_value_pairs type requires at least 2 columns.',
        varSubstStart: 'Variable substitution started:',
        unresolvedVars: 'Unresolved variables:',
        dynamicVarSubst: 'Dynamic variable [{key}] substituted: array {count} → IN clause',
        dynamicVarSubstError: 'Error substituting dynamic variable [{key}]: {error}',
        staticVarSubst: 'Static variable [{key}] substituted: array {count} → IN clause',
        staticVarSubstSimple: 'Static variable [{key}] substituted: {value}',
        staticVarSubstError: 'Error substituting static variable [{key}]: {error}',
        timeFuncSubst: 'Time function [{func}] substituted: {value}',
        timeFuncSubstError: 'Error substituting time function [{func}]: {error}',
        envVarSubst: 'Environment variable [{key}] substituted: array {count} → IN clause',
        envVarSubstSimple: 'Environment variable [{key}] substituted: {value} (simple string)',
        jsonParseError: 'JSON parsing error: {error}',
        noGlobalColOverride: 'No global column overrides. Using original data as is.',
        globalColOverrideApplying: 'Applying global column overrides:',
        globalColOverrideComplete: 'Global column override applied to {count} rows',
        globalColOverrideFailed: 'Failed to apply global column override: {error}'
    },
    kr: {
        dynamicVarSet: '동적 변수 설정:',
        dynamicVarExtractStart: '=== 동적 변수 추출 시작:',
        extractQuery: '추출 쿼리:',
        queryAfterVarSubst: '변수 치환 후 쿼리:',
        database: '데이터베이스:',
        unknownDatabase: '알 수 없는 데이터베이스: {db}. 사용 가능한 DB: {dbs}',
        extractedRowsCount: '추출된 행 수:',
        noDataExtracted: '추출된 데이터가 없습니다. 변수 {var}는 빈 배열로 설정됩니다.',
        dynamicVarExtractComplete: '=== 동적 변수 추출 완료:',
        dynamicVarExtractFailed: '동적 변수 추출 실패: {var} - {error}',
        singleValueExtract: '단일 값 추출: {value}',
        singleColumnExtract: '단일 컬럼 추출 ({col}): {count}개 값',
        multiColumnExtract: '다중 컬럼 추출 ({cols}): {count}개 값',
        identifiedColumnExtract: '컬럼별 식별 추출 ({cols}): {count}개 값 ({colCount}개 컬럼)',
        keyValuePairExtract: '키-값 쌍 추출: {count}개 쌍',
        defaultExtract: '기본 추출 (column_identified): {count}개 값 ({colCount}개 컬럼)',
        keyValuePairsNeedTwoCols: 'key_value_pairs 타입은 최소 2개의 컬럼이 필요합니다.',
        varSubstStart: '변수 치환 시작:',
        unresolvedVars: '치환되지 않은 변수들:',
        dynamicVarSubst: '동적 변수 [{key}] 치환: 배열 {count}개 → IN절',
        dynamicVarSubstError: '동적 변수 [{key}] 치환 중 오류: {error}',
        staticVarSubst: '일반 변수 [{key}] 치환: 배열 {count}개 → IN절',
        staticVarSubstSimple: '일반 변수 [{key}] 치환: {value}',
        staticVarSubstError: '일반 변수 [{key}] 치환 중 오류: {error}',
        timeFuncSubst: '시각 함수 [{func}] 치환: {value}',
        timeFuncSubstError: '시각 함수 [{func}] 치환 중 오류: {error}',
        envVarSubst: '환경 변수 [{key}] 치환: 배열 {count}개 → IN절',
        envVarSubstSimple: '환경 변수 [{key}] 치환: {value} (단순 문자열)',
        jsonParseError: 'JSON 파싱 오류: {error}',
        noGlobalColOverride: '전역 컬럼 오버라이드가 없습니다. 원본 데이터를 그대로 사용합니다.',
        globalColOverrideApplying: '전역 컬럼 오버라이드 적용 중:',
        globalColOverrideComplete: '{count}행에 전역 컬럼 오버라이드 적용 완료',
        globalColOverrideFailed: '전역 컬럼 오버라이드 적용 실패: {error}'
    }
};

const msg = messages[LANGUAGE] || messages.en;

/**
 * 변수 치환 및 동적 변수 처리 담당 모듈
 */
class VariableManager {
    constructor(connectionManager, logFunction) {
        this.connectionManager = connectionManager;
        this.log = logFunction || console.log;
        this.variables = {};
        this.dynamicVariables = {};
        this.msg = msg;
    }

    /**
     * 일반 변수 설정
     */
    setVariables(variables) {
        this.variables = variables || {};
    }

    /**
     * 동적 변수 설정
     */
    setDynamicVariable(key, value) {
        this.dynamicVariables[key] = value;
        this.log(`${this.msg.dynamicVarSet} ${key} = ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
    }

    /**
     * 동적 변수 추출
     */
    async extractDataToVariable(extractConfig) {
        try {
            this.log(`\n${this.msg.dynamicVarExtractStart} ${extractConfig.variableName} ===`);
            this.log(`${this.msg.extractQuery} ${extractConfig.query}`);
            
            // 변수 치환 적용
            const processedQuery = this.replaceVariables(extractConfig.query);
            this.log(`${this.msg.queryAfterVarSubst} ${processedQuery}`);
            
            const database = extractConfig.database;
            this.log(`${this.msg.database} ${database}`);
            
            // 데이터 조회
            const availableDBs = this.connectionManager.getAvailableDBKeys();
            if (!availableDBs.includes(database)) {
                throw new Error(this.msg.unknownDatabase.replace('{db}', database).replace('{dbs}', availableDBs.join(', ')));
            }
            
            const data = await this.connectionManager.queryDB(database, processedQuery);
            this.log(`${this.msg.extractedRowsCount} ${data.length}`);
            
            if (data.length === 0) {
                this.log(`⚠️ ${this.msg.noDataExtracted.replace('{var}', extractConfig.variableName)}`);
                this.setDynamicVariable(extractConfig.variableName, []);
                return [];
            }
            
            // 추출 타입에 따른 처리
            const extractedValue = this.extractByType(data, extractConfig);
            
            // 동적 변수 설정
            this.setDynamicVariable(extractConfig.variableName, extractedValue);
            
            this.log(`${this.msg.dynamicVarExtractComplete} ${extractConfig.variableName} ===\n`);
            return extractedValue;
            
        } catch (error) {
            this.log(this.msg.dynamicVarExtractFailed.replace('{var}', extractConfig.variableName).replace('{error}', error.message));
            throw error;
        }
    }

    /**
     * 타입별 데이터 추출
     */
    extractByType(data, extractConfig) {
        switch (extractConfig.extractType) {
            case 'single_value':
                const firstRow = data[0];
                const firstColumn = Object.keys(firstRow)[0];
                const value = firstRow[firstColumn];
                this.log(this.msg.singleValueExtract.replace('{value}', value));
                return value;
                
            case 'single_column':
                const columnName = extractConfig.columnName || Object.keys(data[0])[0];
                const values = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
                this.log(this.msg.singleColumnExtract.replace('{col}', columnName).replace('{count}', values.length + (LANGUAGE === 'kr' ? '개' : '')));
                return values;
                
            case 'multiple_columns':
                const columns = extractConfig.columns || Object.keys(data[0]);
                const allValues = [];
                data.forEach(row => {
                    columns.forEach(col => {
                        if (row[col] !== null && row[col] !== undefined) {
                            allValues.push(row[col]);
                        }
                    });
                });
                this.log(this.msg.multiColumnExtract.replace('{cols}', columns.join(', ')).replace('{count}', allValues.length + (LANGUAGE === 'kr' ? '개' : '')));
                return allValues;
                
            case 'column_identified':
                const identifiedColumns = extractConfig.columns || Object.keys(data[0]);
                const identified = {};
                identifiedColumns.forEach(col => {
                    identified[col] = [];
                });
                
                data.forEach(row => {
                    identifiedColumns.forEach(col => {
                        if (row[col] !== null && row[col] !== undefined) {
                            identified[col].push(row[col]);
                        }
                    });
                });
                
                // 중복 제거
                Object.keys(identified).forEach(col => {
                    identified[col] = [...new Set(identified[col])];
                });
                
                const totalValues = Object.values(identified).reduce((sum, arr) => sum + arr.length, 0);
                this.log(this.msg.identifiedColumnExtract
                    .replace('{cols}', identifiedColumns.join(', '))
                    .replace('{count}', totalValues + (LANGUAGE === 'kr' ? '개' : ''))
                    .replace('{colCount}', Object.keys(identified).length + (LANGUAGE === 'kr' ? '개' : '')));
                return identified;
                
            case 'key_value_pairs':
                const keys = Object.keys(data[0]);
                if (keys.length < 2) {
                    throw new Error(this.msg.keyValuePairsNeedTwoCols);
                }
                const pairs = {};
                data.forEach(row => {
                    const key = row[keys[0]];
                    const val = row[keys[1]];
                    if (key !== null && key !== undefined) {
                        pairs[key] = val;
                    }
                });
                this.log(this.msg.keyValuePairExtract.replace('{count}', Object.keys(pairs).length + (LANGUAGE === 'kr' ? '개' : '')));
                return pairs;
                
            default:
                // 기본값: column_identified
                const defaultColumns = Object.keys(data[0]);
                const defaultIdentified = {};
                defaultColumns.forEach(col => {
                    defaultIdentified[col] = [];
                });
                
                data.forEach(row => {
                    defaultColumns.forEach(col => {
                        if (row[col] !== null && row[col] !== undefined) {
                            defaultIdentified[col].push(row[col]);
                        }
                    });
                });
                
                // 중복 제거
                Object.keys(defaultIdentified).forEach(col => {
                    defaultIdentified[col] = [...new Set(defaultIdentified[col])];
                });
                
                const defaultTotalValues = Object.values(defaultIdentified).reduce((sum, arr) => sum + arr.length, 0);
                this.log(this.msg.defaultExtract
                    .replace('{count}', defaultTotalValues + (LANGUAGE === 'kr' ? '개' : ''))
                    .replace('{colCount}', Object.keys(defaultIdentified).length + (LANGUAGE === 'kr' ? '개' : '')));
                return defaultIdentified;
        }
    }

    /**
     * 변수 치환
     */
    replaceVariables(text) {
        let result = text;
        const originalText = text;
        const debugVariables = process.env.DEBUG_VARIABLES === 'true';
        
        if (debugVariables) {
            this.log(`${this.msg.varSubstStart} ${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}`);
        }
        
        // 1. 동적 변수 치환 (우선순위 높음)
        result = this.replaceDynamicVariables(result, debugVariables);
        
        // 2. 일반 변수 치환
        result = this.replaceStaticVariables(result, debugVariables);
        
        // 3. 시간 함수 치환
        result = this.replaceTimestampFunctions(result, debugVariables);
        
        // 4. 환경 변수 치환
        result = this.replaceEnvironmentVariables(result, debugVariables);
        
        // 치환되지 않은 변수 확인
        const unresolvedVariables = [...result.matchAll(/\$\{(\w+(?:\.\w+)?)\}/g)];
        if (unresolvedVariables.length > 0 && debugVariables) {
            this.log(`${this.msg.unresolvedVars} ${unresolvedVariables.map(m => m[1]).join(', ')}`);
        }
        
        return result;
    }

    /**
     * 동적 변수 치환
     */
    replaceDynamicVariables(text, debug = false) {
        let result = text;
        
        Object.entries(this.dynamicVariables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            const beforeReplace = result;
            
            try {
                // 배열 타입
                if (Array.isArray(value)) {
                    // 값이 없을 경우 NULL로 대체 (IN 절에서 숫자/문자열 타입 모두 안전)
                    if (value.length === 0) {
                        result = result.replace(pattern, "NULL");
                    } else {
                        const inClause = value.map(v => {
                            if (typeof v === 'string') {
                                return `'${v.replace(/'/g, "''")}'`;
                            }
                            return v;
                        }).join(', ');
                        result = result.replace(pattern, inClause);
                    }
                    
                    if (debug && beforeReplace !== result) {
                        this.log(this.msg.dynamicVarSubst.replace('{key}', key).replace('{count}', value.length));
                    }
                } 
                // 객체 타입 (column_identified 또는 key_value_pairs)
                else if (typeof value === 'object' && value !== null) {
                    // ${변수명.키} 패턴 처리
                    Object.keys(value).forEach(keyName => {
                        const keyPattern = new RegExp(`\\$\\{${key}\\.${keyName}\\}`, 'g');
                        const keyValue = value[keyName];
                        
                        if (Array.isArray(keyValue)) {
                            const inClause = keyValue.map(v => {
                                if (typeof v === 'string') {
                                    return `'${v.replace(/'/g, "''")}'`;
                                }
                                return v;
                            }).join(', ');
                            result = result.replace(keyPattern, inClause);
                        } else {
                            const replacementValue = typeof keyValue === 'string' 
                                ? `'${keyValue.replace(/'/g, "''")}'` 
                                : keyValue;
                            result = result.replace(keyPattern, replacementValue);
                        }
                    });
                    
                    // ${변수명} 패턴 처리
                    const allValues = Object.values(value);
                    const inClause = (allValues.every(v => Array.isArray(v)) 
                        ? allValues.flat() 
                        : allValues
                    ).map(v => {
                        if (typeof v === 'string') {
                            return `'${v.replace(/'/g, "''")}'`;
                        }
                        return v;
                    }).join(', ');
                    result = result.replace(pattern, inClause);
                } 
                else {
                    result = result.replace(pattern, value);
                }
            } catch (error) {
                this.log(this.msg.dynamicVarSubstError.replace('{key}', key).replace('{error}', error.message));
            }
        });
        
        return result;
    }

    /**
     * 일반 변수 치환
     */
    replaceStaticVariables(text, debug = false) {
        let result = text;
        
        Object.entries(this.variables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            const beforeReplace = result;
            
            try {
                if (Array.isArray(value)) {
                    const inClause = value.map(v => {
                        if (typeof v === 'string') {
                            return `'${v.replace(/'/g, "''")}'`;
                        }
                        return v;
                    }).join(', ');
                    result = result.replace(pattern, inClause);
                    
                    if (debug && beforeReplace !== result) {
                        this.log(this.msg.staticVarSubst.replace('{key}', key).replace('{count}', value.length));
                    }
                } else {
                    result = result.replace(pattern, value);
                    
                    if (debug && beforeReplace !== result) {
                        this.log(this.msg.staticVarSubstSimple.replace('{key}', key).replace('{value}', value));
                    }
                }
            } catch (error) {
                this.log(this.msg.staticVarSubstError.replace('{key}', key).replace('{error}', error.message));
            }
        });
        
        return result;
    }

    /**
     * 타임스탬프 함수 치환
     */
    replaceTimestampFunctions(text, debug = false) {
        let result = text;
        
        const timestampFunctions = {
            'CURRENT_TIMESTAMP': () => new Date().toISOString().slice(0, 19).replace('T', ' '),
            'CURRENT_DATETIME': () => new Date().toISOString().slice(0, 19).replace('T', ' '),
            'NOW': () => new Date().toISOString().slice(0, 19).replace('T', ' '),
            'CURRENT_DATE': () => new Date().toISOString().slice(0, 10),
            'CURRENT_TIME': () => new Date().toTimeString().slice(0, 8),
            'UNIX_TIMESTAMP': () => Math.floor(Date.now() / 1000),
            'TIMESTAMP_MS': () => Date.now(),
            'ISO_TIMESTAMP': () => new Date().toISOString(),
            'GETDATE': () => new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        
        Object.entries(timestampFunctions).forEach(([funcName, funcImpl]) => {
            const pattern = new RegExp(`\\$\\{${funcName}\\}`, 'g');
            const beforeReplace = result;
            
            try {
                result = result.replace(pattern, funcImpl());
                
                if (debug && beforeReplace !== result) {
                    this.log(this.msg.timeFuncSubst.replace('{func}', funcName).replace('{value}', funcImpl()));
                }
            } catch (error) {
                this.log(this.msg.timeFuncSubstError.replace('{func}', funcName).replace('{error}', error.message));
            }
        });
        
        return result;
    }

    /**
     * 환경 변수 치환
     */
    replaceEnvironmentVariables(text, debug = false) {
        let result = text;
        const envPattern = /\$\{(\w+)\}/g;
        const remainingMatches = [...result.matchAll(envPattern)];
        
        remainingMatches.forEach(match => {
            const fullMatch = match[0];
            const varName = match[1];
            
            // 이미 처리된 변수들과 중복되지 않는 경우만 환경 변수로 치환
            const isAlreadyProcessed = 
                this.dynamicVariables.hasOwnProperty(varName) ||
                this.variables.hasOwnProperty(varName);
                
            if (!isAlreadyProcessed && process.env[varName]) {
                const envValue = process.env[varName];
                
                try {
                    const parsed = JSON.parse(envValue);
                    if (Array.isArray(parsed)) {
                        const inClause = parsed.map(v => {
                            if (typeof v === 'string') {
                                return `'${v.replace(/'/g, "''")}'`;
                            }
                            return v;
                        }).join(', ');
                        result = result.replace(fullMatch, inClause);
                        
                        if (debug) {
                            this.log(this.msg.envVarSubst.replace('{key}', varName).replace('{count}', parsed.length));
                        }
                    } else {
                        result = result.replace(fullMatch, envValue);
                        
                        if (debug) {
                            this.log(this.msg.staticVarSubstSimple.replace('{key}', varName).replace('{value}', envValue));
                        }
                    }
                } catch (e) {
                    result = result.replace(fullMatch, envValue);
                    
                    if (debug) {
                        this.log(this.msg.envVarSubstSimple.replace('{key}', varName).replace('{value}', envValue));
                    }
                }
            }
        });
        
        return result;
    }

    /**
     * JSON 값 해석
     */
    resolveJsonValue(value, context = {}) {
        if (!value || typeof value !== 'string') {
            return value;
        }
        
        if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
            try {
                const jsonObj = JSON.parse(value);
                
                if (context.tableName && jsonObj.hasOwnProperty(context.tableName)) {
                    return jsonObj[context.tableName];
                }
                
                if (context.database && jsonObj.hasOwnProperty(context.database)) {
                    return jsonObj[context.database];
                }
                
                if (jsonObj.hasOwnProperty('default')) {
                    return jsonObj.default;
                }
                
                const firstKey = Object.keys(jsonObj)[0];
                return firstKey ? jsonObj[firstKey] : value;
                
            } catch (error) {
                this.log(this.msg.jsonParseError.replace('{error}', error.message), 'ERROR');
                return value;
            }
        }
        
        return value;
    }

    /**
     * 전역 컬럼 오버라이드 데이터 적용
     */
    applyGlobalColumnOverrides(sourceData, globalColumnOverrides) {
        try {
            if (!globalColumnOverrides || globalColumnOverrides.size === 0) {
                this.log(this.msg.noGlobalColOverride);
                return sourceData;
            }
           
            this.log(`${this.msg.globalColOverrideApplying} ${Array.from(globalColumnOverrides.keys()).join(', ')}`);
            
            const processedData = sourceData.map(row => {
                const newRow = { ...row };
                
                // row의 컬럼명을 대소문자 구분 없이 찾기 위한 Map 생성
                const rowColumnMap = new Map();
                Object.keys(row).forEach(key => {
                    rowColumnMap.set(key.toLowerCase(), key);
                });
                
                globalColumnOverrides.forEach((value, column) => {
                    let processedValue = this.replaceVariables(value);
                    
                    // 대소문자 구분 없이 실제 컬럼명 찾기
                    const actualColumnName = rowColumnMap.get(column.toLowerCase()) || column;
                    
                    // JSON 매핑 처리
                    if (typeof processedValue === 'string' && processedValue.trim().startsWith('{') && processedValue.trim().endsWith('}')) {
                        try {
                            const parsedJson = JSON.parse(processedValue);
                            const originalValue = row[actualColumnName];
                            if (originalValue && parsedJson[originalValue]) {
                                processedValue = parsedJson[originalValue];
                            } else {
                                processedValue = originalValue || Object.values(parsedJson)[0] || '';
                            }
                        } catch (jsonError) {
                            // JSON 파싱 실패 시 원본 문자열 사용
                        }
                    }
                    
                    // 실제 컬럼명으로 값 설정
                    newRow[actualColumnName] = processedValue;
                });
                
                return newRow;
            });
            
            this.log(this.msg.globalColOverrideComplete.replace('{count}', sourceData.length));
            return processedData;
            
        } catch (error) {
            this.log(this.msg.globalColOverrideFailed.replace('{error}', error.message));
            throw error;
        }
    }

    /**
     * 모든 변수 정보 조회
     */
    getAllVariables() {
        return {
            static: this.variables,
            dynamic: this.dynamicVariables
        };
    }
}

module.exports = VariableManager;

