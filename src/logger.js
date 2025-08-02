const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = this.getLogLevel();
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        this.logLevelNames = {
            0: 'ERROR',
            1: 'WARN', 
            2: 'INFO',
            3: 'DEBUG',
            4: 'TRACE'
        };
        
        this.colors = {
            ERROR: '\x1b[31m', // 빨간색
            WARN: '\x1b[33m',  // 노란색
            INFO: '\x1b[36m',  // 청록색
            DEBUG: '\x1b[35m', // 자홍색
            TRACE: '\x1b[90m', // 회색
            RESET: '\x1b[0m'   // 리셋
        };
        
        // 로그 디렉토리 생성
        this.logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.logFile = path.join(this.logDir, `migration-${new Date().toISOString().split('T')[0]}.log`);
    }
    
    getLogLevel() {
        const envLogLevel = process.env.LOG_LEVEL || 'INFO';
        const levelMap = {
            'ERROR': 0,
            'WARN': 1,
            'INFO': 2,
            'DEBUG': 3,
            'TRACE': 4
        };
        
        return levelMap[envLogLevel.toUpperCase()] || 2; // 기본값: INFO
    }
    
    shouldLog(level) {
        return level <= this.logLevel;
    }
    
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const levelName = this.logLevelNames[level];
        const color = this.colors[levelName] || '';
        const reset = this.colors.RESET;
        
        let formattedMessage = `[${timestamp}] ${color}${levelName}${reset}: ${message}`;
        
        if (data !== null) {
            if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }
    
    writeToFile(message) {
        try {
            const fileMessage = message.replace(/\x1b\[[0-9;]*m/g, ''); // ANSI 색상 코드 제거
            fs.appendFileSync(this.logFile, fileMessage + '\n');
        } catch (error) {
            console.error('로그 파일 쓰기 실패:', error.message);
        }
    }
    
    log(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return;
        }
        
        const formattedMessage = this.formatMessage(level, message, data);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    
    error(message, data = null) {
        this.log(0, message, data);
    }
    
    warn(message, data = null) {
        this.log(1, message, data);
    }
    
    info(message, data = null) {
        this.log(2, message, data);
    }
    
    debug(message, data = null) {
        this.log(3, message, data);
    }
    
    trace(message, data = null) {
        this.log(4, message, data);
    }
    
    // 마이그레이션 진행 상황 로깅
    logMigrationProgress(step, total, description, data = null) {
        const percentage = Math.round((step / total) * 100);
        const progressBar = this.createProgressBar(percentage);
        const message = `[${step}/${total}] ${progressBar} ${percentage}% - ${description}`;
        this.info(message, data);
    }
    
    createProgressBar(percentage) {
        const barLength = 20;
        const filledLength = Math.round((percentage / 100) * barLength);
        const emptyLength = barLength - filledLength;
        
        const filled = '█'.repeat(filledLength);
        const empty = '░'.repeat(emptyLength);
        
        return `[${filled}${empty}]`;
    }
    
    // 쿼리 실행 로깅
    logQuery(queryId, query, params = null) {
        this.debug(`쿼리 실행: ${queryId}`, {
            query: query,
            params: params
        });
    }
    
    // 데이터베이스 연결 로깅
    logConnection(server, database, success, error = null) {
        if (success) {
            this.info(`데이터베이스 연결 성공: ${database}@${server}`);
        } else {
            this.error(`데이터베이스 연결 실패: ${database}@${server}`, error);
        }
    }
    
    // 쿼리문정의 파일 로깅
    logConfig(queryFilePath, success, error = null) {
        if (success) {
            this.info(`쿼리문정의 파일 로드 성공: ${queryFilePath}`);
        } else {
            this.error(`쿼리문정의 파일 로드 실패: ${queryFilePath}`, error);
        }
    }
    
    // 배치 처리 로깅
    logBatch(batchNumber, totalBatches, processedRows, totalRows) {
        const percentage = Math.round((processedRows / totalRows) * 100);
        const batchPercentage = Math.round((batchNumber / totalBatches) * 100);
        this.debug(`배치 처리: ${batchNumber}/${totalBatches} (${batchPercentage}%) - ${processedRows}/${totalRows} 행 (${percentage}%)`);
    }
    
    // 성능 측정 로깅
    logPerformance(operation, startTime, endTime, additionalInfo = null) {
        const duration = endTime - startTime;
        const message = `${operation} 완료 (${duration}ms)`;
        this.info(message, additionalInfo);
    }
    
    // 변수 치환 로깅
    logVariableReplacement(original, replaced, variables) {
        this.trace('변수 치환', {
            original: original,
            replaced: replaced,
            variables: variables
        });
    }
    
    // 동적 변수 추출 로깅
    logDynamicVariableExtraction(variableName, query, extractedValue) {
        this.debug(`동적 변수 추출: ${variableName}`, {
            query: query,
            extractedValue: extractedValue
        });
    }
    
    // FK 관계 분석 로깅
    logFkAnalysis(table, fkRelations) {
        this.debug(`FK 관계 분석: ${table}`, {
            fkRelations: fkRelations
        });
    }
    
    // 트랜잭션 로깅
    logTransaction(action, success, error = null) {
        if (success) {
            this.info(`트랜잭션 ${action} 성공`);
        } else {
            this.error(`트랜잭션 ${action} 실패`, error);
        }
    }
    
    // 메모리 사용량 로깅
    logMemoryUsage() {
        const memUsage = process.memoryUsage();
        this.debug('메모리 사용량', {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        });
    }
    
    // 로그 레벨 정보 출력
    logLevelInfo() {
        this.info('로거 초기화 완료', {
            currentLevel: this.logLevelNames[this.logLevel],
            logFile: this.logFile,
            availableLevels: this.logLevelNames
        });
    }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

module.exports = logger; 