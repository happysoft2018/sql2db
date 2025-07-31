#!/usr/bin/env node

const MSSQLDataMigrator = require('./mssql-data-migrator');
const path = require('path');
const fs = require('fs');

// 명령줄 인수 파싱
const args = process.argv.slice(2);
const command = args[0];

// 도움말 표시
function showHelp() {
    console.log(`
MSSQL 데이터 이관 도구
사용법: node src/migrate-cli.js <명령> [옵션]

명령:
  migrate                    데이터 이관 실행
  validate                   설정 파일 검증
  test                       데이터베이스 연결 테스트
  list                       사용 가능한 작업 설정 파일 목록 표시
  list-dbs                   사용 가능한 데이터베이스 목록 표시 (isWritable 정보 포함)
  help                       도움말 표시

옵션:
  --config <파일경로>        사용자 정의 설정 파일 경로 (JSON 또는 XML)
  --job <작업명>             작업별 설정 파일 사용 (예: user, order, product)
  --dry-run                  실제 이관 없이 시뮬레이션만 실행

예시:
  node src/migrate-cli.js migrate
  node src/migrate-cli.js migrate --config ./my-config.json
  node src/migrate-cli.js migrate --config ./my-config.xml
  node src/migrate-cli.js migrate --job user
  node src/migrate-cli.js migrate --job order
  node src/migrate-cli.js list
  node src/migrate-cli.js list-dbs
  node src/migrate-cli.js validate --job product
  node src/migrate-cli.js test

작업별 설정 파일:
  queries/ 디렉토리에 있는 작업별 설정 파일을 사용할 수 있습니다.
  - user-migration.json     : 사용자 데이터 이관
  - order-migration.json    : 주문 데이터 이관
  - product-migration.json  : 상품 데이터 이관

환경 변수 설정:
  .env 파일 또는 시스템 환경 변수로 데이터베이스 연결 정보를 설정하세요.
  자세한 내용은 queries/env.example 파일을 참고하세요.
`);
}

// 사용 가능한 작업 설정 파일 목록 표시
function listJobConfigs() {
    const configsDir = path.join(__dirname, '../queries');
    
    if (!fs.existsSync(configsDir)) {
        console.log('❌ 작업 설정 파일 디렉토리가 없습니다:', configsDir);
        return;
    }
    
    console.log('📋 사용 가능한 작업 설정 파일:');
    console.log('=' .repeat(50));
    
    const files = fs.readdirSync(configsDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
        console.log('사용 가능한 작업 설정 파일이 없습니다.');
        return;
    }
    
    files.forEach(file => {
        const filePath = path.join(configsDir, file);
        try {
            const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const jobName = file.replace('-migration.json', '');
            console.log(`\n🔧 ${jobName}`);
            console.log(`   이름: ${config.name}`);
            console.log(`   설명: ${config.description}`);
            console.log(`   버전: ${config.version}`);
            console.log(`   파일: ${file}`);
            console.log(`   쿼리 수: ${config.queries?.length || 0}`);
            console.log(`   동적 변수 수: ${config.dynamicVariables?.length || 0}`);
            console.log(`   사용법: --job ${jobName}`);
        } catch (error) {
            console.log(`\n❌ ${file}: 설정 파일 읽기 실패 - ${error.message}`);
        }
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log('사용 예시:');
    console.log('  node src/migrate-cli.js migrate --job user');
    console.log('  node src/migrate-cli.js validate --job order');
}

// 작업별 설정 파일 경로 해석
function resolveConfigPath(jobName) {
    if (!jobName) return null;
    
    const configsDir = path.join(__dirname, '../queries');
    const configFile = `${jobName}-migration.json`;
    const configPath = path.join(configsDir, configFile);
    
    if (!fs.existsSync(configPath)) {
        throw new Error(`작업 설정 파일을 찾을 수 없습니다: ${configPath}`);
    }
    
    return configPath;
}

// 옵션 파싱
function parseOptions(args) {
    const options = {
        configPath: null,
        jobName: null,
        dryRun: false
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--config':
                options.configPath = args[i + 1];
                i++; // 다음 인수 건너뛰기
                break;
            case '--job':
                options.jobName = args[i + 1];
                i++; // 다음 인수 건너뛰기
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
        }
    }
    
    // 작업명이 지정된 경우 해당 설정 파일 경로 설정
    if (options.jobName && !options.configPath) {
        options.configPath = resolveConfigPath(options.jobName);
    }
    
    return options;
}

// 메인 실행 함수
async function main() {
    try {
        if (!command || command === 'help') {
            showHelp();
            return;
        }

        console.log('--------------- Arguments ----------------------');
        console.log(args);
        console.log('------------------------------------------------');
        
        const options = parseOptions(args.slice(1));
        
        // list 명령은 migrator 객체 없이 실행
        if (command === 'list') {
            listJobConfigs();
            return;
        }
        
        const migrator = new MSSQLDataMigrator(options.configPath);
        
        console.log('MSSQL 데이터 이관 도구 v1.0.0');
        console.log('=====================================');
        
        // 사용 중인 설정 파일 정보 표시
        if (options.jobName) {
            console.log(`📋 작업: ${options.jobName}`);
            console.log(`📁 설정 파일: ${options.configPath}`);
        } else if (options.configPath) {
            console.log(`📁 설정 파일: ${options.configPath}`);
        } else {
            console.log('📁 설정 파일: 기본 설정 (queries/migration-queries.xml)');
        }
        console.log('');
        
        switch (command) {
            case 'migrate':
                console.log('데이터 이관을 시작합니다...\n');
                
                if (options.dryRun) {
                    console.log('*** DRY RUN 모드 - 실제 데이터 변경 없음 ***\n');
                    
                    const dryRunMigrator = new MSSQLDataMigrator(options.config, null, true);
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
                    process.exit(0);
                } else {
                    console.log('\n❌ 데이터 이관 중 오류가 발생했습니다.');
                    process.exit(1);
                }
                break;
                
            case 'validate':
                console.log('설정 파일 검증 중...\n');
                try {
                    const isValid = await migrator.validateConfiguration();
                    
                    if (isValid) {
                        console.log('✅ 설정 파일이 유효합니다.');
                        process.exit(0);
                    } else {
                        console.log('❌ 설정 파일에 오류가 있습니다.');
                        process.exit(1);
                    }
                } catch (error) {
                    console.error('❌ 설정 파일 검증 실패:', error.message);
                    process.exit(1);
                }
                break;
                
            case 'test':
                console.log('데이터베이스 연결 테스트 중...\n');
                const connectionOk = await migrator.testConnections();
                
                if (connectionOk) {
                    console.log('✅ 모든 데이터베이스 연결이 정상입니다.');
                    process.exit(0);
                } else {
                    console.log('❌ 데이터베이스 연결에 실패했습니다.');
                    process.exit(1);
                }
                break;
                
            case 'list':
                // 이미 위에서 처리됨
                break;
                
            case 'list-dbs':
                console.log('사용 가능한 데이터베이스 목록을 조회합니다...\n');
                try {
                    const tempMigrator = new MSSQLDataMigrator();
                    await tempMigrator.loadDbInfo();
                    
                    if (!tempMigrator.dbInfo || !tempMigrator.dbInfo.dbs) {
                        console.log('❌ config/dbinfo.json 파일을 찾을 수 없거나 DB 정보가 없습니다.');
                        console.log('환경 변수(.env) 방식을 사용 중입니다.');
                        process.exit(1);
                    }
                    
                    const dbs = tempMigrator.dbInfo.dbs;
                    const dbList = Object.keys(dbs);
                    
                    console.log('📊 데이터베이스 목록 및 권한 정보');
                    console.log('=' .repeat(80));
                    console.log(`총 ${dbList.length}개의 데이터베이스가 정의되어 있습니다.\n`);
                    
                    // 쓰기 가능한 DB (타겟 DB로 사용 가능)
                    const writableDbs = dbList.filter(id => dbs[id].isWritable);
                    const readOnlyDbs = dbList.filter(id => !dbs[id].isWritable);
                    
                    console.log('🟢 타겟 DB로 사용 가능 (isWritable: true)');
                    console.log('-' .repeat(50));
                    if (writableDbs.length > 0) {
                        writableDbs.forEach(id => {
                            const db = dbs[id];
                            console.log(`  📝 ${id}`);
                            console.log(`     서버: ${db.server}:${db.port || 1433}`);
                            console.log(`     데이터베이스: ${db.database}`);
                            console.log(`     설명: ${db.description || '설명 없음'}`);
                            console.log(`     사용자: ${db.user}`);
                            console.log('');
                        });
                    } else {
                        console.log('  ⚠️ 쓰기 가능한 데이터베이스가 없습니다.');
                        console.log('');
                    }
                    
                    console.log('🔶 읽기 전용 (isWritable: false)');
                    console.log('-' .repeat(50));
                    if (readOnlyDbs.length > 0) {
                        readOnlyDbs.forEach(id => {
                            const db = dbs[id];
                            console.log(`  📖 ${id}`);
                            console.log(`     서버: ${db.server}:${db.port || 1433}`);
                            console.log(`     데이터베이스: ${db.database}`);
                            console.log(`     설명: ${db.description || '설명 없음'}`);
                            console.log(`     사용자: ${db.user}`);
                            console.log('');
                        });
                    } else {
                        console.log('  📝 모든 데이터베이스가 쓰기 가능합니다.');
                        console.log('');
                    }
                    
                    console.log('💡 사용법:');
                    console.log('  - 소스 DB: 모든 DB 사용 가능');
                    console.log('  - 타겟 DB: isWritable=true인 DB만 사용 가능');
                    console.log('  - 설정 변경: config/dbinfo.json에서 isWritable 속성 수정');
                    
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