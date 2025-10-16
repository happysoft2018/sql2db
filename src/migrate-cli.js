#!/usr/bin/env node

// 모듈화된 버전 사용 (권장)
const MSSQLDataMigrator = require('./mssql-data-migrator-modular');
// 레거시 버전: const MSSQLDataMigrator = require('./mssql-data-migrator');

const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// 명령줄 인수 파싱
const args = process.argv.slice(2);
const command = args[0];


// 도움말 표시
function showHelp() {
    console.log(`
MSSQL 데이터 이관 도구 v2.1
사용법: node src/migrate-cli.js <명령> [옵션]

명령:
  validate                   쿼리문정의 파일 검증
  list-dbs                   데이터베이스 목록 표시 (연결 가능 여부 포함)
  migrate                    데이터 이관 실행
  resume <migration-id>      중단된 마이그레이션 재시작
  help                       도움말 표시

옵션:
  --query, -q <파일경로>     사용자 정의 쿼리문정의 파일 경로 (XML)
  --dry-run                  실제 이관 없이 시뮬레이션만 실행

예시:
  node src/migrate-cli.js validate --query ./queries/migration-queries.xml
  node src/migrate-cli.js list-dbs
  node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
  node src/migrate-cli.js resume migration-2024-12-01-15-30-00 --query ./queries/migration-queries.xml

진행 상황 관리:
  node src/progress-cli.js list                     - 진행 상황 목록
  node src/progress-cli.js show <migration-id>      - 상세 정보
  node src/progress-cli.js monitor <migration-id>   - 실시간 모니터링
  node src/progress-cli.js resume <migration-id>    - 재시작 정보

환경 변수 설정:
  .env 파일 또는 시스템 환경 변수로 데이터베이스 연결 정보를 설정하세요.
  자세한 내용은 queries/env.example 파일을 참고하세요.
`);
}

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
            logger.error('쿼리문정의 파일이 지정되지 않았습니다.');
            console.log('사용법:');
            console.log('  --query, -q <파일경로>  : 사용자 정의 쿼리문정의 파일 사용');
            process.exit(1);
        }
        
        // list-dbs 명령은 쿼리 파일 없이 실행
        const migrator = command === 'list-dbs' ? new MSSQLDataMigrator() : new MSSQLDataMigrator(options.queryFilePath);
        
        logger.info('MSSQL 데이터 이관 도구 시작', {
            version: 'v1.0.0',
            queryFilePath: options.queryFilePath || 'N/A (list-dbs 명령)'
        });
        
        console.log('MSSQL 데이터 이관 도구 v1.0.0');
        console.log('=====================================');
        
        // 사용 중인 쿼리문정의 파일 정보 표시 (list-dbs 명령 제외)
        if (command !== 'list-dbs') {
            console.log(`📁 쿼리문정의 파일 : ${options.queryFilePath}`);
            console.log('');
        }
        
        switch (command) {
            case 'migrate':
                console.log('데이터 이관을 시작합니다...\n');
                
                if (options.dryRun) {
                    console.log('*** DRY RUN 모드 - 실제 데이터 변경 없음 ***\n');
                    
                    const dryRunMigrator = new MSSQLDataMigrator(options.queryFilePath, true);
                    const result = await dryRunMigrator.executeDryRun();
                    
                    if (result.success) {
                        console.log('\n✅ DRY RUN 시뮬레이션이 성공적으로 완료되었습니다!');
                        process.exit(0);
                    } else {
                        console.log('\n❌ DRY RUN 시뮬레이션 중 오류가 발생했습니다.');
                        process.exit(1);
                    }
                }
                
                const result = await migrator.executeMigration();
                
                if (result.success) {
                    console.log('\n✅ 데이터 이관이 성공적으로 완료되었습니다!');
                    console.log(`📊 Migration ID: ${result.migrationId}`);
                    console.log(`📁 진행 상황 파일: ${result.progressFile}`);
                    process.exit(0);
                } else {
                    console.log('\n❌ 데이터 이관 중 오류가 발생했습니다.');
                    if (result.migrationId) {
                        console.log(`📊 Migration ID: ${result.migrationId}`);
                        console.log(`📁 진행 상황 파일: ${result.progressFile}`);
                        console.log(`🔄 재시작 명령어: node src/migrate-cli.js resume ${result.migrationId}`);
                    }
                    process.exit(1);
                }
                break;
                
            case 'resume':
                const migrationId = options.queryFilePath; // resume 명령어에서는 migration ID를 받음
                if (!migrationId) {
                    console.log('Migration ID를 지정해주세요.');
                    console.log('사용법: node src/migrate-cli.js resume <migration-id> --query <쿼리파일>');
                    process.exit(1);
                }
                
                console.log(`마이그레이션 재시작: ${migrationId}\n`);
                
                // 진행 상황 정보 먼저 표시
                const ProgressManager = require('./progress-manager');
                const progressManager = ProgressManager.loadProgress(migrationId);
                
                if (!progressManager) {
                    console.log(`❌ 진행 상황을 찾을 수 없습니다: ${migrationId}`);
                    process.exit(1);
                }
                
                if (!progressManager.canResume()) {
                    console.log(`❌ 마이그레이션을 재시작할 수 없습니다. 상태: ${progressManager.progressData.status}`);
                    console.log('재시작 가능 여부를 확인하려면: node src/progress-cli.js resume ' + migrationId);
                    process.exit(1);
                }
                
                const resumeInfo = progressManager.getResumeInfo();
                console.log(`📊 완료된 쿼리: ${resumeInfo.completedQueries.length}/${resumeInfo.totalQueries}`);
                console.log(`🔄 남은 쿼리: ${resumeInfo.remainingQueries}개\n`);
                
                const resumeResult = await migrator.executeMigration(migrationId);
                
                if (resumeResult.success) {
                    console.log('\n✅ 마이그레이션 재시작이 성공적으로 완료되었습니다!');
                    console.log(`📊 Migration ID: ${resumeResult.migrationId}`);
                    process.exit(0);
                } else {
                    console.log('\n❌ 마이그레이션 재시작 중 오류가 발생했습니다.');
                    console.log(`📊 Migration ID: ${resumeResult.migrationId}`);
                    console.log(`🔄 다시 재시작: node src/migrate-cli.js resume ${resumeResult.migrationId}`);
                    process.exit(1);
                }
                break;
                
            case 'validate':
                console.log('쿼리문정의 파일 검증 중...\n');
                try {
                    const isValid = await migrator.validateConfiguration();
                    
                    if (isValid) {
                        console.log('✅ 쿼리문정의 파일이 유효합니다.');
                        process.exit(0);
                    } else {
                        console.log('❌ 쿼리문정의 파일에 오류가 있습니다.');
                        process.exit(1);
                    }
                } catch (error) {
                    console.error('❌ 쿼리문정의 파일 검증 실패:', error.message);
                    process.exit(1);
                }
                break;
                
            case 'list-dbs':
                console.log('사용 가능한 데이터베이스 목록을 조회합니다...\n');
                try {
                    const tempMigrator = new MSSQLDataMigrator();
                    await tempMigrator.loadDbInfo();
                    
                    if (!tempMigrator.dbInfo) {
                        console.log('❌ config/dbinfo.json 파일을 찾을 수 없거나 DB 정보가 없습니다.');
                        console.log('환경 변수(.env) 방식을 사용 중입니다.');
                        process.exit(1);
                    }
                    
                    const dbs = tempMigrator.dbInfo;
                    const dbList = Object.keys(dbs);
                    
                    console.log('📊 데이터베이스 목록 및 연결 상태');
                    console.log('=' .repeat(80));
                    console.log(`총 ${dbList.length}개의 데이터베이스가 정의되어 있습니다.\n`);
                    
                    // 각 DB의 연결 상태 테스트
                    console.log('🔍 연결 상태 테스트 중...\n');
                    const connectionResults = {};
                    
                    for (const dbId of dbList) {
                        const db = dbs[dbId];
                        process.stdout.write(`  테스트: ${dbId} (${db.server}:${db.port || 1433}/${db.database}) ... `);
                        
                        const dbConfig = tempMigrator.getDbConfigById(dbId);
                        const result = await tempMigrator.testSingleDbConnection(dbConfig);
                        connectionResults[dbId] = result;
                        
                        if (result.success) {
                            console.log('✅ 연결 성공');
                        } else {
                            console.log(`❌ 연결 실패: ${result.message}`);
                        }
                    }
                    
                    console.log('');
                    
                    console.log('상세 목록 ');
                    console.log('-' .repeat(50));
                    for (const dbId of dbList) {
                        const db = dbs[dbId];
                            const connectionStatus = connectionResults[dbId];
                            const statusIcon = connectionStatus.success ? '🟢' : '🔴';
                            const statusText = connectionStatus.success ? '연결 가능' : '연결 불가';
                            
                            console.log(`  📝 ${dbId} ${statusIcon} ${statusText}`);
                            console.log(`     서버: ${db.server}:${db.port || 1433}`);
                            console.log(`     데이터베이스: ${db.database}`);
                            console.log(`     쓰기 여부: ${db.isWritable}`);
                            console.log(`     설명: ${db.description || '설명 없음'}`);
                            console.log(`     사용자: ${db.user}`);
                            if (!connectionStatus.success) {
                                console.log(`     ⚠️ 오류: ${connectionStatus.message}`);
                            }
                            console.log('');
                        }
                    
                    // 연결 상태 요약
                    const successCount = Object.values(connectionResults).filter(r => r.success).length;
                    const failureCount = dbList.length - successCount;
                    
                    console.log('📈 연결 상태 요약');
                    console.log('-' .repeat(50));
                    console.log(`✅ 연결 성공: ${successCount}개`);
                    console.log(`❌ 연결 실패: ${failureCount}개`);
                    console.log('');
                    
                    console.log('💡 사용법:');
                    console.log('  - 소스 DB: 연결 가능한 모든 DB 사용 가능');
                    console.log('  - 타겟 DB: isWritable=true이고 연결 가능한 DB만 사용 가능');
                    console.log('  - 설정 변경: config/dbinfo.json에서 isWritable 속성 수정');
                    console.log('  - 연결 문제: 서버 주소, 포트, 자격증명, 네트워크 상태 확인');
                    
                    process.exit(0);
                } catch (error) {
                    console.error('❌ 데이터베이스 목록 조회 실패:', error.message);
                    process.exit(1);
                }
                break;
                
            default:
                console.log(`알 수 없는 명령: ${command}`);
                console.log('사용 가능한 명령을 보려면 "help"를 실행하세요.');
                process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ 오류가 발생했습니다:', error.message);
        console.error('스택 트레이스:', error.stack);
        process.exit(1);
    }
}

// 예외 처리
process.on('unhandledRejection', (reason, promise) => {
    console.error('처리되지 않은 Promise 거부:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('처리되지 않은 예외:', error);
    process.exit(1);
});

// CLI 실행
if (require.main === module) {
    main();
}

module.exports = { main, showHelp }; 