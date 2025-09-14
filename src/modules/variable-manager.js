const logger = require('../logger');

/**
 * 변수 관리 모듈
 * 정적 변수, 동적 변수, 변수 치환 기능을 담당
 */
class VariableManager {
    constructor() {
        this.variables = {};
        this.dynamicVariables = {};
        this.connectionManager = null;
    }

    /**
     * 연결 관리자 설정
     * @param {Object} connectionManager - 연결 관리자 인스턴스
     */
    setConnectionManager(connectionManager) {
        this.connectionManager = connectionManager;
    }

    /**
     * 정적 변수 설정
     * @param {Object} variables - 변수 객체
     */
    setVariables(variables) {
        this.variables = { ...variables };
    }

    /**
     * 동적 변수 설정
     * @param {Object} dynamicVariables - 동적 변수 객체
     */
    setDynamicVariables(dynamicVariables) {
        this.dynamicVariables = { ...dynamicVariables };
    }

    /**
     * 동적 변수 값 로드
     * @returns {Promise<void>}
     */
    async loadDynamicVariables() {
        if (!this.connectionManager) {
            throw new Error('연결 관리자가 설정되지 않았습니다.');
        }

        for (const [varName, varConfig] of Object.entries(this.dynamicVariables)) {
            try {
                logger.info(`동적 변수 로드 중: ${varName}`, {
                    sourceDb: varConfig.sourceDb,
                    description: varConfig.description
                });

                const pool = await this.connectionManager.getConnection(varConfig.sourceDb);
                const request = pool.request();
                const result = await request.query(varConfig.sourceQuery);

                if (result.recordset && result.recordset.length > 0) {
                    const record = result.recordset[0];
                    const keys = Object.keys(record);
                    
                    if (keys.length === 1) {
                        // 단일 컬럼인 경우 값만 저장
                        this.variables[varName] = record[keys[0]];
                    } else {
                        // 다중 컬럼인 경우 객체로 저장
                        this.variables[varName] = record;
                    }

                    logger.info(`동적 변수 로드 완료: ${varName}`, {
                        value: this.variables[varName],
                        type: typeof this.variables[varName]
                    });
                } else {
                    logger.warn(`동적 변수 ${varName}에 대한 결과가 없습니다.`);
                    this.variables[varName] = null;
                }
            } catch (error) {
                logger.error(`동적 변수 ${varName} 로드 실패`, error);
                this.variables[varName] = null;
            }
        }
    }

    /**
     * 문자열에서 변수 치환
     * @param {string} str - 치환할 문자열
     * @param {Object} additionalVars - 추가 변수 (선택적)
     * @returns {string} 치환된 문자열
     */
    replaceVariables(str, additionalVars = {}) {
        if (!str || typeof str !== 'string') {
            return str;
        }

        const allVars = { ...this.variables, ...additionalVars };
        let result = str;

        // ${변수명} 형태의 변수 치환
        result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            if (varName in allVars) {
                const value = allVars[varName];
                if (value === null || value === undefined) {
                    return 'NULL';
                }
                if (typeof value === 'string') {
                    return value;
                }
                if (Array.isArray(value)) {
                    return value.map(v => `'${v}'`).join(',');
                }
                return String(value);
            }
            return match; // 변수를 찾지 못한 경우 원본 유지
        });

        return result;
    }

    /**
     * 변수 값 가져오기
     * @param {string} varName - 변수명
     * @param {*} defaultValue - 기본값
     * @returns {*} 변수 값
     */
    getVariable(varName, defaultValue = null) {
        return this.variables.hasOwnProperty(varName) ? this.variables[varName] : defaultValue;
    }

    /**
     * 변수 값 설정
     * @param {string} varName - 변수명
     * @param {*} value - 변수 값
     */
    setVariable(varName, value) {
        this.variables[varName] = value;
    }

    /**
     * 모든 변수 가져오기
     * @returns {Object} 모든 변수
     */
    getAllVariables() {
        return { ...this.variables };
    }

    /**
     * 변수 존재 여부 확인
     * @param {string} varName - 변수명
     * @returns {boolean} 존재 여부
     */
    hasVariable(varName) {
        return this.variables.hasOwnProperty(varName);
    }

    /**
     * 변수 삭제
     * @param {string} varName - 변수명
     */
    removeVariable(varName) {
        delete this.variables[varName];
    }

    /**
     * 모든 변수 초기화
     */
    clearVariables() {
        this.variables = {};
    }

    /**
     * 변수 통계 정보
     * @returns {Object} 통계 정보
     */
    getVariableStats() {
        const staticCount = Object.keys(this.variables).length - Object.keys(this.dynamicVariables).length;
        const dynamicCount = Object.keys(this.dynamicVariables).length;
        
        return {
            total: Object.keys(this.variables).length,
            static: Math.max(0, staticCount),
            dynamic: dynamicCount,
            variables: Object.keys(this.variables)
        };
    }

    /**
     * 문자열에서 사용된 변수 추출
     * @param {string} str - 분석할 문자열
     * @returns {Array} 사용된 변수명 배열
     */
    extractVariables(str) {
        if (!str || typeof str !== 'string') {
            return [];
        }

        const matches = str.match(/\$\{([^}]+)\}/g);
        if (!matches) {
            return [];
        }

        return matches.map(match => match.slice(2, -1)); // ${} 제거
    }

    /**
     * 변수 의존성 검증
     * @param {string} str - 검증할 문자열
     * @returns {Object} 검증 결과
     */
    validateVariableDependencies(str) {
        const usedVars = this.extractVariables(str);
        const missingVars = usedVars.filter(varName => !this.hasVariable(varName));
        
        return {
            isValid: missingVars.length === 0,
            usedVariables: usedVars,
            missingVariables: missingVars,
            availableVariables: Object.keys(this.variables)
        };
    }
}

module.exports = VariableManager;
