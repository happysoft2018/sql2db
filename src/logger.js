const fs = require('fs');
const path = require('path');
const { getAppRoot } = require('./modules/paths');

// 언어 설정 (환경 변수 사용, 기본값 영어)
const LANGUAGE = process.env.LANGUAGE || 'en';

// 다국어 메시지
const messages = {
    en: {
        logDirCreateFailed: 'Could not create logs directory: {message}',
        logDirCreateFailedFallback: 'Could not create logs directory even in fallback location: {message}',
        logFileWriteFailed: 'Failed to write to log file: {message}',
        queryExecution: 'Query execution: {queryId}',
        dbConnectionSuccess: 'Database connection successful: {database}@{server}',
        dbConnectionFailed: 'Database connection failed: {database}@{server}',
        configLoadSuccess: 'Query definition file loaded successfully: {path}',
        configLoadFailed: 'Query definition file load failed: {path}',
        batchProcessing: 'Batch processing: {batch}/{totalBatches} ({batchPct}%) - {processed}/{total} rows ({pct}%)',
        operationCompleted: '{operation} completed ({duration}ms)',
        variableReplacement: 'Variable replacement',
        dynamicVariableExtraction: 'Dynamic variable extraction: {name}',
        fkAnalysis: 'FK relationship analysis: {table}',
        transactionSuccess: 'Transaction {action} successful',
        transactionFailed: 'Transaction {action} failed',
        memoryUsage: 'Memory usage',
        loggerInitialized: 'Logger initialized'
    },
    kr: {
        logDirCreateFailed: '로그 디렉토리 생성 실패: {message}',
        logDirCreateFailedFallback: '대체 위치에서도 로그 디렉토리 생성 실패: {message}',
        logFileWriteFailed: '로그 파일 쓰기 실패: {message}',
        queryExecution: '쿼리 실행: {queryId}',
        dbConnectionSuccess: '데이터베이스 연결 성공: {database}@{server}',
        dbConnectionFailed: '데이터베이스 연결 실패: {database}@{server}',
        configLoadSuccess: '쿼리문정의 파일 로드 성공: {path}',
        configLoadFailed: '쿼리문정의 파일 로드 실패: {path}',
        batchProcessing: '배치 처리: {batch}/{totalBatches} ({batchPct}%) - {processed}/{total} 행 ({pct}%)',
        operationCompleted: '{operation} 완료 ({duration}ms)',
        variableReplacement: '변수 치환',
        dynamicVariableExtraction: '동적 변수 추출: {name}',
        fkAnalysis: 'FK 관계 분석: {table}',
        transactionSuccess: '트랜잭션 {action} 성공',
        transactionFailed: '트랜잭션 {action} 실패',
        memoryUsage: '메모리 사용량',
        loggerInitialized: '로거 초기화 완료'
    }
};

const msg = messages[LANGUAGE] || messages.en;

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
            ERROR: '\x1b[31m',
            WARN: '\x1b[33m',
            INFO: '\x1b[36m',
            DEBUG: '\x1b[35m',
            TRACE: '\x1b[90m',
            RESET: '\x1b[0m'
        };
        
        const appRoot = getAppRoot();
        this.logDir = path.join(appRoot, 'logs');
        
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.warn(msg.logDirCreateFailed.replace('{message}', error.message));
            this.logDir = path.join(process.cwd(), 'logs');
            try {
                if (!fs.existsSync(this.logDir)) {
                    fs.mkdirSync(this.logDir, { recursive: true });
                }
            } catch (fallbackError) {
                console.error(msg.logDirCreateFailedFallback.replace('{message}', fallbackError.message));
            }
        }
        
        const now = new Date();
        const localDate = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0');
        this.logFile = path.join(this.logDir, `migration-${localDate}.log`);
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
    
    maskSensitiveData(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }
        
        const masked = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const lowerKey = key.toLowerCase();
                
                // password, pwd, passwd 등의 키를 마스킹
                if (lowerKey.includes('password') || lowerKey.includes('pwd') || lowerKey.includes('passwd')) {
                    masked[key] = '********';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    // 중첩된 객체도 재귀적으로 마스킹
                    masked[key] = this.maskSensitiveData(obj[key]);
                } else {
                    masked[key] = obj[key];
                }
            }
        }
        
        return masked;
    }
    
    formatMessage(level, message, data = null) {
        // 현지 시각으로 타임스탬프 생성
        const now = new Date();
        const timestamp = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0') + 'T' +
                         String(now.getHours()).padStart(2, '0') + ':' +
                         String(now.getMinutes()).padStart(2, '0') + ':' +
                         String(now.getSeconds()).padStart(2, '0') + '.' +
                         String(now.getMilliseconds()).padStart(3, '0');
        const levelName = this.logLevelNames[level];
        const color = this.colors[levelName] || '';
        const reset = this.colors.RESET;
        
        let formattedMessage = `[${timestamp}] ${color}${levelName}${reset}: ${message}`;
        
        if (data !== null) {
            if (typeof data === 'object') {
                const maskedData = this.maskSensitiveData(data);
                formattedMessage += `\n${JSON.stringify(maskedData, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }
    
    writeToFile(message) {
        try {
            const fileMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
            fs.appendFileSync(this.logFile, fileMessage + '\n');
        } catch (error) {
            console.error(msg.logFileWriteFailed.replace('{message}', error.message));
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
    
    logQuery(queryId, query, params = null) {
        this.debug(msg.queryExecution.replace('{queryId}', queryId), {
            query: query,
            params: params
        });
    }
    
    logConnection(server, database, success, error = null) {
        if (success) {
            this.info(msg.dbConnectionSuccess
                .replace('{database}', database)
                .replace('{server}', server));
        } else {
            this.error(msg.dbConnectionFailed
                .replace('{database}', database)
                .replace('{server}', server), error);
        }
    }
    
    logConfig(queryFilePath, success, error = null) {
        if (success) {
            this.info(msg.configLoadSuccess.replace('{path}', queryFilePath));
        } else {
            this.error(msg.configLoadFailed.replace('{path}', queryFilePath), error);
        }
    }
    
    logBatch(batchNumber, totalBatches, processedRows, totalRows) {
        const percentage = Math.round((processedRows / totalRows) * 100);
        const batchPercentage = Math.round((batchNumber / totalBatches) * 100);
        this.debug(msg.batchProcessing
            .replace('{batch}', batchNumber)
            .replace('{totalBatches}', totalBatches)
            .replace('{batchPct}', batchPercentage)
            .replace('{processed}', processedRows)
            .replace('{total}', totalRows)
            .replace('{pct}', percentage));
    }
    
    logPerformance(operation, startTime, endTime, additionalInfo = null) {
        const duration = endTime - startTime;
        const message = msg.operationCompleted
            .replace('{operation}', operation)
            .replace('{duration}', duration);
        this.info(message, additionalInfo);
    }
    
    logVariableReplacement(original, replaced, variables) {
        this.trace(msg.variableReplacement, {
            original: original,
            replaced: replaced,
            variables: variables
        });
    }
    
    logDynamicVariableExtraction(variableName, query, extractedValue) {
        this.debug(msg.dynamicVariableExtraction.replace('{name}', variableName), {
            query: query,
            extractedValue: extractedValue
        });
    }
    
    logFkAnalysis(table, fkRelations) {
        this.debug(msg.fkAnalysis.replace('{table}', table), {
            fkRelations: fkRelations
        });
    }
    
    logTransaction(action, success, error = null) {
        if (success) {
            this.info(msg.transactionSuccess.replace('{action}', action));
        } else {
            this.error(msg.transactionFailed.replace('{action}', action), error);
        }
    }
    
    logMemoryUsage() {
        const memUsage = process.memoryUsage();
        this.debug(msg.memoryUsage, {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        });
    }
    
    logLevelInfo() {
        this.info(msg.loggerInitialized, {
            currentLevel: this.logLevelNames[this.logLevel],
            logFile: this.logFile,
            availableLevels: this.logLevelNames
        });
    }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

module.exports = logger; 