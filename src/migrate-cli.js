#!/usr/bin/env node

// 모듈화된 버전 사용 (권장)
const MSSQLDataMigrator = require('./mssql-data-migrator-modular');
// 레거시 버전: const MSSQLDataMigrator = require('./mssql-data-migrator');

const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { format } = require('./modules/i18n');

// 언어 설정 (환경 변수 사용, 기본값 영어)
const LANGUAGE = process.env.LANGUAGE || 'en';

// 다국어 메시지
const messages = {
    en: {
        toolVersion: 'MSSQL Data Migration Tool v2.1',
        usage: 'Usage: node src/migrate-cli.js <command> [options]',
        commands: 'Commands:',
        validate: '  validate                   Validate query definition file',
        listDbs: '  list-dbs                   Show database list (with connection status)',
        migrate: '  migrate                    Execute data migration',
        resume: '  resume <migration-id>      Resume interrupted migration',
        help: '  help                       Show help',
        options: 'Options:',
        queryOption: '  --query, -q <path>         Query definition file path (XML)',
        dryRunOption: '  --dry-run                  Run simulation without actual migration',
        examples: 'Examples:',
        example1: '  node src/migrate-cli.js validate --query ./queries/migration-queries.xml',
        example2: '  node src/migrate-cli.js list-dbs',
        example3: '  node src/migrate-cli.js migrate --query ./queries/migration-queries.xml',
        example4: '  node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml',
        progressMgmt: 'Progress Management:',
        progressList: '  node src/progress-cli.js list                     - Progress list',
        progressShow: '  node src/progress-cli.js show <migration-id>      - Detailed info',
        progressMonitor: '  node src/progress-cli.js monitor <migration-id>   - Real-time monitoring',
        progressResume: '  node src/progress-cli.js resume <migration-id>    - Resume info',
        envVars: 'Environment Variables:',
        envVarsDesc: '  Set database connection info in .env file or system environment variables.\n  See queries/env.example for details.',
        queryFileNotSpecified: 'Query definition file not specified.',
        usageInfo: 'Usage:',
        queryFileUsage: '  --query, -q <path>  : Use custom query definition file',
        toolStart: 'Starting MSSQL Data Migration Tool',
        separator: '=====================================',
        queryDefFile: 'Query definition file',
        startMigration: 'Starting data migration...',
        dryRunMode: '*** DRY RUN Mode - No actual data changes ***',
        dryRunSuccess: 'DRY RUN simulation completed successfully!',
        dryRunError: 'Error occurred during DRY RUN simulation.',
        migrationSuccess: 'Data migration completed successfully!',
        migrationError: 'Error occurred during data migration.',
        migrationId: 'Migration ID',
        progressFile: 'Progress file',
        resumeCommand: 'Resume command',
        resumeMigration: 'Resuming migration',
        specifyMigrationId: 'Please specify Migration ID.',
        resumeUsage: 'Usage: node src/migrate-cli.js resume <migration-id> --query <query-file>',
        completedQueries: 'Completed queries',
        remainingQueries: 'Remaining queries',
        resumeSuccess: 'Migration resume completed successfully!',
        resumeError: 'Error occurred during migration resume.',
        restartCommand: 'Resume again',
        validatingQueryFile: 'Validating query definition file...',
        validQueryFile: 'Query definition file is valid.',
        invalidQueryFile: 'Query definition file has errors.',
        validationFailed: 'Query definition file validation failed',
        listingDatabases: 'Listing available databases...',
        dbInfoNotFound: 'config/dbinfo.json file not found or no DB info.\nUsing environment variables (.env) mode.',
        databaseListTitle: 'Database List and Connection Status',
        totalDatabases: 'Total {count} databases defined.',
        testingConnection: 'Testing connection status...',
        testing: 'Testing',
        connectionSuccess: 'Connection successful',
        connectionFailed: 'Connection failed',
        detailList: 'Detailed List',
        connectionAvailable: 'Available',
        connectionUnavailable: 'Unavailable',
        server: 'Server',
        database: 'Database',
        writable: 'Writable',
        description: 'Description',
        noDescription: 'No description',
        user: 'User',
        error: 'Error',
        connectionSummary: 'Connection Summary',
        usageInfo2: 'Usage Info:',
        sourceDbInfo: '  - Source DB: All available DBs can be used',
        targetDbInfo: '  - Target DB: Only available DBs with isWritable=true can be used',
        configChangeInfo: '  - Config change: Modify isWritable property in config/dbinfo.json',
        troubleshootInfo: '  - Connection issues: Check server address, port, credentials, network status',
        dbListError: 'Failed to list databases',
        invalidCommand: 'Invalid command: {command}',
        seeHelp: 'Type "help" to see available commands.',
        errorOccurred: 'Error occurred:',
        stackTrace: 'Stack trace:',
        unhandledRejection: 'Unhandled Promise rejection:',
        uncaughtException: 'Uncaught exception:',
        progressNotFound: 'Progress not found: {id}',
        cannotResume: 'Cannot resume migration. Status: {status}\nTo check if resumable: node src/progress-cli.js resume {id}'
    },
    kr: {
        toolVersion: 'MSSQL 데이터 이관 도구 v2.1',
        usage: '사용법: node src/migrate-cli.js <명령> [옵션]',
        commands: '명령:',
        validate: '  validate                   쿼리문정의 파일 검증',
        listDbs: '  list-dbs                   데이터베이스 목록 표시 (연결 가능 여부 포함)',
        migrate: '  migrate                    데이터 이관 실행',
        resume: '  resume <migration-id>      중단된 마이그레이션 재시작',
        help: '  help                       도움말 표시',
        options: '옵션:',
        queryOption: '  --query, -q <파일경로>     사용자 정의 쿼리문정의 파일 경로 (XML)',
        dryRunOption: '  --dry-run                  실제 이관 없이 시뮬레이션만 실행',
        examples: '예시:',
        example1: '  node src/migrate-cli.js validate --query ./queries/migration-queries.xml',
        example2: '  node src/migrate-cli.js list-dbs',
        example3: '  node src/migrate-cli.js migrate --query ./queries/migration-queries.xml',
        example4: '  node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml',
        progressMgmt: '진행 상황 관리:',
        progressList: '  node src/progress-cli.js list                     - 진행 상황 목록',
        progressShow: '  node src/progress-cli.js show <migration-id>      - 상세 정보',
        progressMonitor: '  node src/progress-cli.js monitor <migration-id>   - 실시간 모니터링',
        progressResume: '  node src/progress-cli.js resume <migration-id>    - 재시작 정보',
        envVars: '환경 변수 설정:',
        envVarsDesc: '  .env 파일 또는 시스템 환경 변수로 데이터베이스 연결 정보를 설정하세요.\n  자세한 내용은 queries/env.example 파일을 참고하세요.',
        queryFileNotSpecified: '쿼리문정의 파일이 지정되지 않았습니다.',
        usageInfo: '사용법:',
        queryFileUsage: '  --query, -q <파일경로>  : 사용자 정의 쿼리문정의 파일 사용',
        toolStart: 'MSSQL 데이터 이관 도구 시작',
        separator: '=====================================',
        queryDefFile: '쿼리문정의 파일',
        startMigration: '데이터 이관을 시작합니다...',
        dryRunMode: '*** DRY RUN 모드 - 실제 데이터 변경 없음 ***',
        dryRunSuccess: 'DRY RUN 시뮬레이션이 성공적으로 완료되었습니다!',
        dryRunError: 'DRY RUN 시뮬레이션 중 오류가 발생했습니다.',
        migrationSuccess: '데이터 이관이 성공적으로 완료되었습니다!',
        migrationError: '데이터 이관 중 오류가 발생했습니다.',
        migrationId: 'Migration ID',
        progressFile: '진행 상황 파일',
        resumeCommand: '재시작 명령어',
        resumeMigration: '마이그레이션 재시작',
        specifyMigrationId: 'Migration ID를 지정해주세요.',
        resumeUsage: '사용법: node src/migrate-cli.js resume <migration-id> --query <쿼리파일>',
        completedQueries: '완료된 쿼리',
        remainingQueries: '남은 쿼리',
        resumeSuccess: '마이그레이션 재시작이 성공적으로 완료되었습니다!',
        resumeError: '마이그레이션 재시작 중 오류가 발생했습니다.',
        restartCommand: '다시 재시작',
        validatingQueryFile: '쿼리문정의 파일 검증 중...',
        validQueryFile: '쿼리문정의 파일이 유효합니다.',
        invalidQueryFile: '쿼리문정의 파일에 오류가 있습니다.',
        validationFailed: '쿼리문정의 파일 검증 실패',
        listingDatabases: '사용 가능한 데이터베이스 목록을 조회합니다...',
        dbInfoNotFound: 'config/dbinfo.json 파일을 찾을 수 없거나 DB 정보가 없습니다.\n환경 변수(.env) 방식을 사용 중입니다.',
        databaseListTitle: '데이터베이스 목록 및 연결 상태',
        totalDatabases: '총 {count}개의 데이터베이스가 정의되어 있습니다.',
        testingConnection: '연결 상태 테스트 중...',
        testing: '테스트',
        connectionSuccess: '연결 성공',
        connectionFailed: '연결 실패',
        detailList: '상세 목록',
        connectionAvailable: '연결 가능',
        connectionUnavailable: '연결 불가',
        server: '서버',
        database: '데이터베이스',
        writable: '쓰기 여부',
        description: '설명',
        noDescription: '설명 없음',
        user: '사용자',
        error: '오류',
        connectionSummary: '연결 상태 요약',
        usageInfo2: '사용법:',
        sourceDbInfo: '  - 소스 DB: 연결 가능한 모든 DB 사용 가능',
        targetDbInfo: '  - 타겟 DB: isWritable=true이고 연결 가능한 DB만 사용 가능',
        configChangeInfo: '  - 설정 변경: config/dbinfo.json에서 isWritable 속성 수정',
        troubleshootInfo: '  - 연결 문제: 서버 주소, 포트, 자격증명, 네트워크 상태 확인',
        dbListError: '데이터베이스 목록 조회 실패',
        invalidCommand: '알 수 없는 명령: {command}',
        seeHelp: '사용 가능한 명령을 보려면 "help"를 실행하세요.',
        errorOccurred: '오류가 발생했습니다:',
        stackTrace: '스택 트레이스:',
        unhandledRejection: '처리되지 않은 Promise 거부:',
        uncaughtException: '처리되지 않은 예외:',
        progressNotFound: '진행 상황을 찾을 수 없습니다: {id}',
        cannotResume: '마이그레이션을 재시작할 수 없습니다. 상태: {status}\n재시작 가능 여부를 확인하려면: node src/progress-cli.js resume {id}'
    }
};

const msg = messages[LANGUAGE] || messages.en;

// 도움말 표시
function showHelp() {
    console.log(`
${msg.toolVersion}
${msg.usage}

${msg.commands}
${msg.validate}
${msg.listDbs}
${msg.migrate}
${msg.resume}
${msg.help}

${msg.options}
${msg.queryOption}
${msg.dryRunOption}

${msg.examples}
${msg.example1}
${msg.example2}
${msg.example3}
${msg.example4}

${msg.progressMgmt}
${msg.progressList}
${msg.progressShow}
${msg.progressMonitor}
${msg.progressResume}

${msg.envVars}
${msg.envVarsDesc}
`);
}

// 명령줄 인수 파싱
const args = process.argv.slice(2);
const command = args[0];

// 옵션 파싱
function parseOptions(args) {
    const options = {
        queryFilePath: null,
        dryRun: false
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--query':
            case '-q':
                options.queryFilePath = args[i + 1];
                i++; // 다음 인수 건너뛰기
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
        }
    }
    
    return options;
}

// 메인 실행 함수
async function main() {
    try {
        // 로거 초기화
        logger.logLevelInfo();
        
        if (!command || command === 'help') {
            showHelp();
            return;
        }
        console.log('--------------> args', args);
        
        const options = parseOptions(args.slice(1));
        console.log('--------------> options', options);
        
        // list-dbs 명령은 쿼리 파일이 필요하지 않음
        if (!options.queryFilePath && command !== 'list-dbs') {
            logger.error(msg.queryFileNotSpecified);
            console.log(msg.usageInfo);
            console.log(msg.queryFileUsage);
            process.exit(1);
        }
        
        // list-dbs 명령은 쿼리 파일 없이 실행
        const migrator = command === 'list-dbs' ? new MSSQLDataMigrator() : new MSSQLDataMigrator(options.queryFilePath);
        
        logger.info(msg.toolStart, {
            version: 'v1.0.0',
            queryFilePath: options.queryFilePath || `N/A (list-dbs ${msg.command})`
        });
        
        console.log('MSSQL Data Migration Tool v1.0.0');
        console.log(msg.separator);
        
        // 사용 중인 쿼리문정의 파일 정보 표시 (list-dbs 명령 제외)
        if (command !== 'list-dbs') {
            console.log(`📁 ${msg.queryDefFile} : ${options.queryFilePath}`);
            console.log('');
        }
        
        switch (command) {
            case 'migrate':
                console.log(`${msg.startMigration}\n`);
                
                if (options.dryRun) {
                    console.log(`${msg.dryRunMode}\n`);
                    
                    const dryRunMigrator = new MSSQLDataMigrator(options.queryFilePath, true);
                    const result = await dryRunMigrator.executeDryRun();
                    
                    if (result.success) {
                        console.log(`\n✅ ${msg.dryRunSuccess}`);
                        process.exit(0);
                    } else {
                        console.log(`\n❌ ${msg.dryRunError}`);
                        process.exit(1);
                    }
                }
                
                const result = await migrator.executeMigration();
                
                if (result.success) {
                    console.log(`\n✅ ${msg.migrationSuccess}`);
                    console.log(`📊 ${msg.migrationId}: ${result.migrationId}`);
                    console.log(`📁 ${msg.progressFile}: ${result.progressFile}`);
                    process.exit(0);
                } else {
                    console.log(`\n❌ ${msg.migrationError}`);
                    if (result.migrationId) {
                        console.log(`📊 ${msg.migrationId}: ${result.migrationId}`);
                        console.log(`📁 ${msg.progressFile}: ${result.progressFile}`);
                        console.log(`🔄 ${msg.resumeCommand}: node src/migrate-cli.js resume ${result.migrationId}`);
                    }
                    process.exit(1);
                }
                break;
                
            case 'resume':
                const migrationId = options.queryFilePath; // resume 명령어에서는 migration ID를 받음
                if (!migrationId) {
                    console.log(msg.specifyMigrationId);
                    console.log(msg.resumeUsage);
                    process.exit(1);
                }
                
                console.log(`${msg.resumeMigration}: ${migrationId}\n`);
                
                // 진행 상황 정보 먼저 표시
                const ProgressManager = require('./progress-manager');
                const progressManager = ProgressManager.loadProgress(migrationId);
                
                if (!progressManager) {
                    console.log(`❌ ${format(msg.progressNotFound, { id: migrationId })}`);
                    process.exit(1);
                }
                
                if (!progressManager.canResume()) {
                    console.log(`❌ ${format(msg.cannotResume, { status: progressManager.progressData.status, id: migrationId })}`);
                    process.exit(1);
                }
                
                const resumeInfo = progressManager.getResumeInfo();
                console.log(`📊 ${msg.completedQueries}: ${resumeInfo.completedQueries.length}/${resumeInfo.totalQueries}`);
                console.log(`🔄 ${msg.remainingQueries}: ${resumeInfo.remainingQueries}${LANGUAGE === 'kr' ? '개' : ''}\n`);
                
                const resumeResult = await migrator.executeMigration(migrationId);
                
                if (resumeResult.success) {
                    console.log(`\n✅ ${msg.resumeSuccess}`);
                    console.log(`📊 ${msg.migrationId}: ${resumeResult.migrationId}`);
                    process.exit(0);
                } else {
                    console.log(`\n❌ ${msg.resumeError}`);
                    console.log(`📊 ${msg.migrationId}: ${resumeResult.migrationId}`);
                    console.log(`🔄 ${msg.restartCommand}: node src/migrate-cli.js resume ${resumeResult.migrationId}`);
                    process.exit(1);
                }
                break;
                
            case 'validate':
                console.log(`${msg.validatingQueryFile}\n`);
                try {
                    const isValid = await migrator.validateConfiguration();
                    
                    if (isValid) {
                        console.log(`✅ ${msg.validQueryFile}`);
                        process.exit(0);
                    } else {
                        console.log(`❌ ${msg.invalidQueryFile}`);
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(`❌ ${msg.validationFailed}:`, error.message);
                    process.exit(1);
                }
                break;
                
            case 'list-dbs':
                console.log(`${msg.listingDatabases}\n`);
                try {
                    const tempMigrator = new MSSQLDataMigrator();
                    await tempMigrator.loadDbInfo();
                    
                    if (!tempMigrator.dbInfo) {
                        console.log(`❌ ${msg.dbInfoNotFound}`);
                        process.exit(1);
                    }
                    
                    const dbs = tempMigrator.dbInfo;
                    const dbList = Object.keys(dbs);
                    
                    console.log(`📊 ${msg.databaseListTitle}`);
                    console.log('=' .repeat(80));
                    console.log(format(msg.totalDatabases, { count: dbList.length }) + '\n');
                    
                    // 각 DB의 연결 상태 테스트
                    console.log(`🔍 ${msg.testingConnection}\n`);
                    const connectionResults = {};
                    
                    for (const dbId of dbList) {
                        const db = dbs[dbId];
                        process.stdout.write(`  ${msg.testing}: ${dbId} (${db.server}:${db.port || 1433}/${db.database}) ... `);
                        
                        const dbConfig = tempMigrator.getDbConfigById(dbId);
                        const result = await tempMigrator.testSingleDbConnection(dbConfig);
                        connectionResults[dbId] = result;
                        
                        if (result.success) {
                            console.log(`✅ ${msg.connectionSuccess}`);
                        } else {
                            console.log(`❌ ${msg.connectionFailed}: ${result.message}`);
                        }
                    }
                    
                    console.log('');
                    
                    console.log(`${msg.detailList} `);
                    console.log('-' .repeat(50));
                    for (const dbId of dbList) {
                        const db = dbs[dbId];
                            const connectionStatus = connectionResults[dbId];
                            const statusIcon = connectionStatus.success ? '🟢' : '🔴';
                            const statusText = connectionStatus.success ? msg.connectionAvailable : msg.connectionUnavailable;
                            
                            console.log(`  📝 ${dbId} ${statusIcon} ${statusText}`);
                            console.log(`     ${msg.server}: ${db.server}:${db.port || 1433}`);
                            console.log(`     ${msg.database}: ${db.database}`);
                            console.log(`     ${msg.writable}: ${db.isWritable}`);
                            console.log(`     ${msg.description}: ${db.description || msg.noDescription}`);
                            console.log(`     ${msg.user}: ${db.user}`);
                            if (!connectionStatus.success) {
                                console.log(`     ⚠️ ${msg.error}: ${connectionStatus.message}`);
                            }
                            console.log('');
                        }
                    
                    // 연결 상태 요약
                    const successCount = Object.values(connectionResults).filter(r => r.success).length;
                    const failureCount = dbList.length - successCount;
                    
                    console.log(`📈 ${msg.connectionSummary}`);
                    console.log('-' .repeat(50));
                    console.log(`✅ ${msg.connectionSuccess}: ${successCount}${LANGUAGE === 'kr' ? '개' : ''}`);
                    console.log(`❌ ${msg.connectionFailed}: ${failureCount}${LANGUAGE === 'kr' ? '개' : ''}`);
                    console.log('');
                    
                    console.log(`💡 ${msg.usageInfo2}`);
                    console.log(msg.sourceDbInfo);
                    console.log(msg.targetDbInfo);
                    console.log(msg.configChangeInfo);
                    console.log(msg.troubleshootInfo);
                    
                    process.exit(0);
                } catch (error) {
                    console.error(`❌ ${msg.dbListError}:`, error.message);
                    process.exit(1);
                }
                break;
                
            default:
                console.log(format(msg.invalidCommand, { command }));
                console.log(msg.seeHelp);
                process.exit(1);
        }
        
    } catch (error) {
        console.error(`\n❌ ${msg.errorOccurred}`, error.message);
        console.error(`${msg.stackTrace}:`, error.stack);
        process.exit(1);
    }
}

// 예외 처리
process.on('unhandledRejection', (reason, promise) => {
    console.error(`${msg.unhandledRejection}`, reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error(`${msg.uncaughtException}:`, error);
    process.exit(1);
});

// CLI 실행
if (require.main === module) {
    main();
}

module.exports = { main, showHelp };
