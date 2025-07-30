const MSSQLDataMigrator = require('../src/mssql-data-migrator');
const path = require('path');
const fs = require('fs');

// 작업별 설정 파일 테스트
async function testJobConfigs() {
    console.log('🧪 작업별 설정 파일 기능 테스트 시작\n');
    
    const configsDir = path.join(__dirname, '../queries');
    
    if (!fs.existsSync(configsDir)) {
        console.log('❌ 설정 파일 디렉토리가 없습니다:', configsDir);
        return;
    }
    
    const configFiles = fs.readdirSync(configsDir).filter(file => file.endsWith('.json'));
    
    if (configFiles.length === 0) {
        console.log('❌ 테스트할 설정 파일이 없습니다.');
        return;
    }
    
    console.log(`📋 발견된 설정 파일: ${configFiles.length}개`);
    console.log('=' .repeat(80));
    
    for (const configFile of configFiles) {
        const configPath = path.join(configsDir, configFile);
        const jobName = configFile.replace('-migration.json', '');
        
        console.log(`\n🔧 작업: ${jobName}`);
        console.log(`📁 파일: ${configFile}`);
        
        try {
            // 설정 파일 로드 테스트
            const migrator = new MSSQLDataMigrator(configPath);
            await migrator.loadConfig();
            
            const config = migrator.config;
            
            console.log(`✅ 설정 파일 로드 성공`);
            console.log(`   이름: ${config.name}`);
            console.log(`   설명: ${config.description}`);
            console.log(`   버전: ${config.version}`);
            console.log(`   변수 수: ${Object.keys(config.variables || {}).length}`);
            console.log(`   동적 변수 수: ${config.dynamicVariables?.length || 0}`);
            console.log(`   쿼리 수: ${config.queries?.length || 0}`);
            
            // 활성화된 쿼리 확인
            const enabledQueries = config.queries?.filter(q => q.enabled) || [];
            console.log(`   활성화된 쿼리: ${enabledQueries.length}개`);
            
            // 동적 변수 확인
            const enabledDynamicVars = config.dynamicVariables?.filter(dv => dv.enabled !== false) || [];
            console.log(`   활성화된 동적 변수: ${enabledDynamicVars.length}개`);
            
            // 변수 치환 테스트
            if (config.variables) {
                console.log(`   📊 변수 치환 테스트:`);
                Object.entries(config.variables).forEach(([key, value]) => {
                    const testQuery = `SELECT * FROM test WHERE field = '\${${key}}'`;
                    const replacedQuery = migrator.replaceVariables(testQuery);
                    console.log(`      ${key}: ${testQuery} → ${replacedQuery}`);
                });
            }
            
        } catch (error) {
            console.log(`❌ 설정 파일 로드 실패: ${error.message}`);
        }
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('✅ 모든 작업별 설정 파일 테스트 완료!');
}

// CLI 옵션 파싱 테스트
function testCliOptions() {
    console.log('\n🔧 CLI 옵션 파싱 테스트');
    console.log('=' .repeat(50));
    
    const testCases = [
        { args: ['--job', 'user'], expected: { jobName: 'user' } },
        { args: ['--job', 'order'], expected: { jobName: 'order' } },
        { args: ['--job', 'product'], expected: { jobName: 'product' } },
        { args: ['--config', './custom.json'], expected: { configPath: './custom.json' } },
        { args: ['--job', 'user', '--dry-run'], expected: { jobName: 'user', dryRun: true } },
    ];
    
    // 간단한 옵션 파싱 함수 (CLI 모듈에서 가져온 로직)
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
                    i++;
                    break;
                case '--job':
                    options.jobName = args[i + 1];
                    i++;
                    break;
                case '--dry-run':
                    options.dryRun = true;
                    break;
            }
        }
        
        return options;
    }
    
    testCases.forEach((testCase, index) => {
        console.log(`\n${index + 1}. 인수: ${testCase.args.join(' ')}`);
        const result = parseOptions(testCase.args);
        
        let success = true;
        Object.entries(testCase.expected).forEach(([key, expectedValue]) => {
            if (result[key] !== expectedValue) {
                success = false;
                console.log(`   ❌ ${key}: 예상 ${expectedValue}, 실제 ${result[key]}`);
            }
        });
        
        if (success) {
            console.log(`   ✅ 파싱 성공: ${JSON.stringify(result)}`);
        }
    });
}

// 설정 파일 구조 검증
function validateConfigStructure() {
    console.log('\n🔍 설정 파일 구조 검증');
    console.log('=' .repeat(50));
    
    const configsDir = path.join(__dirname, '../queries');
    const configFiles = fs.readdirSync(configsDir).filter(file => file.endsWith('.json'));
    
    const requiredFields = ['name', 'description', 'version', 'variables', 'queries'];
    const optionalFields = ['dynamicVariables'];
    
    configFiles.forEach(configFile => {
        const configPath = path.join(configsDir, configFile);
        console.log(`\n📋 검증 중: ${configFile}`);
        
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // 필수 필드 검증
            const missingFields = requiredFields.filter(field => !config[field]);
            if (missingFields.length > 0) {
                console.log(`   ❌ 누락된 필수 필드: ${missingFields.join(', ')}`);
            } else {
                console.log(`   ✅ 모든 필수 필드 존재`);
            }
            
            // 쿼리 구조 검증
            if (config.queries && Array.isArray(config.queries)) {
                const invalidQueries = config.queries.filter(q => 
                    !q.id || (!q.sourceQuery && !q.sourceQueryFile) || !q.targetTable
                );
                
                if (invalidQueries.length > 0) {
                    console.log(`   ❌ 잘못된 쿼리 구조: ${invalidQueries.length}개`);
                } else {
                    console.log(`   ✅ 모든 쿼리 구조 유효`);
                }
            }
            
            // 동적 변수 구조 검증
            if (config.dynamicVariables && Array.isArray(config.dynamicVariables)) {
                const invalidDynamicVars = config.dynamicVariables.filter(dv => 
                    !dv.id || !dv.variableName || !dv.query || !dv.extractType
                );
                
                if (invalidDynamicVars.length > 0) {
                    console.log(`   ❌ 잘못된 동적 변수 구조: ${invalidDynamicVars.length}개`);
                } else {
                    console.log(`   ✅ 모든 동적 변수 구조 유효`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ JSON 파싱 실패: ${error.message}`);
        }
    });
}

// 실행
if (require.main === module) {
    testJobConfigs()
        .then(() => testCliOptions())
        .then(() => validateConfigStructure())
        .catch(console.error);
}

module.exports = { testJobConfigs, testCliOptions, validateConfigStructure }; 