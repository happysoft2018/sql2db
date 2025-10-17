const logger = require('../logger');

/**
 * 변수 치환 및 동적 변수 처리 담당 모듈
 */
class VariableManager {
    constructor(connectionManager, logFunction) {
        this.connectionManager = connectionManager;
        this.log = logFunction || console.log;
        this.variables = {};
        this.dynamicVariables = {};
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
        this.log(`동적 변수 설정: ${key} = ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
    }

    /**
     * 동적 변수 추출
     */
    async extractDataToVariable(extractConfig) {
        try {
            this.log(`\n=== 동적 변수 추출 시작: ${extractConfig.variableName} ===`);
            this.log(`추출 쿼리: ${extractConfig.query}`);
            
            // 변수 치환 적용
            const processedQuery = this.replaceVariables(extractConfig.query);
            this.log(`변수 치환 후 쿼리: ${processedQuery}`);
            
            const database = extractConfig.database;
            this.log(`데이터베이스: ${database}`);
            
            // 데이터 조회
            const availableDBs = this.connectionManager.getAvailableDBKeys();
            if (!availableDBs.includes(database)) {
                throw new Error(`알 수 없는 데이터베이스: ${database}. 사용 가능한 DB: ${availableDBs.join(', ')}`);
            }
            
            const data = await this.connectionManager.queryDB(database, processedQuery);
            this.log(`추출된 행 수: ${data.length}`);
            
            if (data.length === 0) {
                this.log(`⚠️ 추출된 데이터가 없습니다. 변수 ${extractConfig.variableName}는 빈 배열로 설정됩니다.`);
                this.setDynamicVariable(extractConfig.variableName, []);
                return [];
            }
            
            // 추출 타입에 따른 처리
            const extractedValue = this.extractByType(data, extractConfig);
            
            // 동적 변수 설정
            this.setDynamicVariable(extractConfig.variableName, extractedValue);
            
            this.log(`=== 동적 변수 추출 완료: ${extractConfig.variableName} ===\n`);
            return extractedValue;
            
        } catch (error) {
            this.log(`동적 변수 추출 실패: ${extractConfig.variableName} - ${error.message}`);
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
                this.log(`단일 값 추출: ${value}`);
                return value;
                
            case 'single_column':
                const columnName = extractConfig.columnName || Object.keys(data[0])[0];
                const values = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
                this.log(`단일 컬럼 추출 (${columnName}): ${values.length}개 값`);
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
                this.log(`다중 컬럼 추출 (${columns.join(', ')}): ${allValues.length}개 값`);
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
                this.log(`컬럼별 식별 추출 (${identifiedColumns.join(', ')}): ${totalValues}개 값 (${Object.keys(identified).length}개 컬럼)`);
                return identified;
                
            case 'key_value_pairs':
                const keys = Object.keys(data[0]);
                if (keys.length < 2) {
                    throw new Error('key_value_pairs 타입은 최소 2개의 컬럼이 필요합니다.');
                }
                const pairs = {};
                data.forEach(row => {
                    const key = row[keys[0]];
                    const val = row[keys[1]];
                    if (key !== null && key !== undefined) {
                        pairs[key] = val;
                    }
                });
                this.log(`키-값 쌍 추출: ${Object.keys(pairs).length}개 쌍`);
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
                this.log(`기본 추출 (column_identified): ${defaultTotalValues}개 값 (${Object.keys(defaultIdentified).length}개 컬럼)`);
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
            this.log(`변수 치환 시작: ${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}`);
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
            this.log(`치환되지 않은 변수들: ${unresolvedVariables.map(m => m[1]).join(', ')}`);
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
                    if (value.length === 0) {
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
                    
                    if (debug && beforeReplace !== result) {
                        this.log(`동적 변수 [${key}] 치환: 배열 ${value.length}개 → IN절`);
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
                this.log(`동적 변수 [${key}] 치환 중 오류: ${error.message}`);
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
                        this.log(`일반 변수 [${key}] 치환: 배열 ${value.length}개 → IN절`);
                    }
                } else {
                    result = result.replace(pattern, value);
                    
                    if (debug && beforeReplace !== result) {
                        this.log(`일반 변수 [${key}] 치환: ${value}`);
                    }
                }
            } catch (error) {
                this.log(`일반 변수 [${key}] 치환 중 오류: ${error.message}`);
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
                    this.log(`시각 함수 [${funcName}] 치환: ${funcImpl()}`);
                }
            } catch (error) {
                this.log(`시각 함수 [${funcName}] 치환 중 오류: ${error.message}`);
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
                            this.log(`환경 변수 [${varName}] 치환: 배열 ${parsed.length}개 → IN절`);
                        }
                    } else {
                        result = result.replace(fullMatch, envValue);
                        
                        if (debug) {
                            this.log(`환경 변수 [${varName}] 치환: ${envValue}`);
                        }
                    }
                } catch (e) {
                    result = result.replace(fullMatch, envValue);
                    
                    if (debug) {
                        this.log(`환경 변수 [${varName}] 치환: ${envValue} (단순 문자열)`);
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
                this.log(`JSON 파싱 오류: ${error.message}`, 'ERROR');
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
                this.log('전역 컬럼 오버라이드가 없습니다. 원본 데이터를 그대로 사용합니다.');
                return sourceData;
            }
           
            this.log(`전역 컬럼 오버라이드 적용 중: ${Array.from(globalColumnOverrides.keys()).join(', ')}`);
            
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
            
            this.log(`${sourceData.length}행에 전역 컬럼 오버라이드 적용 완료`);
            return processedData;
            
        } catch (error) {
            this.log(`전역 컬럼 오버라이드 적용 실패: ${error.message}`);
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

