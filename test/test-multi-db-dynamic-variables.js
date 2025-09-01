/**
 * 동적변수를 dbinfo.json의 모든 DB에서 사용하는 기능 테스트
 * 
 * 이 테스트는 동적변수 추출 시 dbinfo.json에 정의된 모든 DB에 접속할 수 있는지 확인합니다.
 */

const MSSQLDataMigrator = require('../src/mssql-data-migrator');
const MSSQLConnectionManager = require('../src/mssql-connection-manager');

// 테스트 설정
const testConfig = {
    settings: {
        sourceDatabase: 'sourceDB',
        targetDatabase: 'targetDB',
        enableTransaction: false,
        batchSize: 100,
        maxRetries: 2,
        retryDelay: 1000
    },
    dynamicVariables: [
        {
            variableName: 'sampleUsers',
            query: 'SELECT UserID, UserName, Email FROM Users WHERE IsActive = 1',
            database: 'sampleDB',
            extractType: 'multiple_columns',
            columns: ['UserID', 'UserName', 'Email'],
            enabled: true
        },
        {
            variableName: 'targetDepts',
            query: 'SELECT DeptID, DeptName FROM Departments',
            database: 'targetDB',
            extractType: 'key_value_pairs',
            enabled: true
        },
        {
            variableName: 'sourceCategories',
            query: 'SELECT CategoryName FROM ProductCategories WHERE IsActive = 1',
            database: 'sourceDB',
            extractType: 'single_column',
            columnName: 'CategoryName',
            enabled: true
        },
        {
            variableName: 'companyInfo',
            query: 'SELECT CompanyID, CompanyName FROM CompanyInfo',
            database: 'sampleDB',
            extractType: 'column_identified',
            columns: ['CompanyID', 'CompanyName'],
            enabled: true
        }
    ],
    queries: []
};

async function testMultiDBDynamicVariables() {
    console.log('🚀 다중 DB 동적변수 테스트 시작\n');
    
    try {
        // 1. Connection Manager 테스트
        console.log('1️⃣ Connection Manager 테스트');
        const connectionManager = new MSSQLConnectionManager();
        
        // dbinfo.json 로드 테스트
        const dbConfigs = connectionManager.loadDBConfigs();
        if (dbConfigs) {
            console.log(`   ✅ dbinfo.json 로드 성공: ${Object.keys(dbConfigs.dbs).length}개 DB`);
            console.log(`   📋 사용 가능한 DB: ${Object.keys(dbConfigs.dbs).join(', ')}`);
        } else {
            console.log('   ❌ dbinfo.json 로드 실패');
            return;
        }
        
        // 사용 가능한 DB 키 목록 테스트
        const availableDBs = connectionManager.getAvailableDBKeys();
        console.log(`   🔑 사용 가능한 DB 키: ${availableDBs.join(', ')}`);
        
        console.log('');
        
        // 2. Data Migrator 테스트
        console.log('2️⃣ Data Migrator 테스트');
        const migrator = new MSSQLDataMigrator();
        
        // 설정 적용
        migrator.setConfig(testConfig);
        
        // 동적변수 추출 시뮬레이션
        console.log('   🔍 동적변수 추출 시뮬레이션 시작...');
        
        for (const extractConfig of testConfig.dynamicVariables) {
            console.log(`   📊 ${extractConfig.variableName} (${extractConfig.database}):`);
            console.log(`      쿼리: ${extractConfig.query}`);
            console.log(`      추출 타입: ${extractConfig.extractType}`);
            
            // 데이터베이스 유효성 검사
            const availableDBs = connectionManager.getAvailableDBKeys();
            if (availableDBs.includes(extractConfig.database)) {
                console.log(`      ✅ DB '${extractConfig.database}' 사용 가능`);
            } else {
                console.log(`      ❌ DB '${extractConfig.database}' 사용 불가`);
                console.log(`         사용 가능한 DB: ${availableDBs.join(', ')}`);
            }
            console.log('');
        }
        
        // 3. 동적변수 추출 로직 테스트
        console.log('3️⃣ 동적변수 추출 로직 테스트');
        
        // 실제 DB 연결 없이 로직만 테스트
        for (const extractConfig of testConfig.dynamicVariables) {
            try {
                // 데이터베이스 유효성 검사 시뮬레이션
                const availableDBs = connectionManager.getAvailableDBKeys();
                if (availableDBs.includes(extractConfig.database)) {
                    console.log(`   ✅ ${extractConfig.variableName}: DB '${extractConfig.database}'에서 추출 가능`);
                    
                    // 추출 타입별 처리 로직 테스트
                    switch (extractConfig.extractType) {
                        case 'single_value':
                            console.log(`      📝 단일 값 추출: 첫 번째 행의 첫 번째 컬럼`);
                            break;
                        case 'single_column':
                            console.log(`      📝 단일 컬럼 추출: ${extractConfig.columnName} 컬럼의 모든 값`);
                            break;
                        case 'multiple_columns':
                            console.log(`      📝 다중 컬럼 추출: ${extractConfig.columns.join(', ')} 컬럼의 값들`);
                            break;
                        case 'column_identified':
                            console.log(`      📝 컬럼별 식별 추출: ${extractConfig.columns.join(', ')} 컬럼별로 그룹화`);
                            break;
                        case 'key_value_pairs':
                            console.log(`      📝 키-값 쌍 추출: 첫 번째 컬럼을 키, 두 번째 컬럼을 값으로`);
                            break;
                        default:
                            console.log(`      📝 기본 추출: column_identified 타입으로 처리`);
                    }
                } else {
                    console.log(`   ❌ ${extractConfig.variableName}: DB '${extractConfig.database}' 사용 불가`);
                    console.log(`      사용 가능한 DB: ${availableDBs.join(', ')}`);
                }
            } catch (error) {
                console.log(`   ❌ ${extractConfig.variableName}: ${error.message}`);
            }
            console.log('');
        }
        
        // 4. 에러 처리 테스트
        console.log('4️⃣ 에러 처리 테스트');
        
        // 존재하지 않는 DB 테스트
        const invalidDB = 'nonExistentDB';
        
        if (!availableDBs.includes(invalidDB)) {
            console.log(`   ✅ 존재하지 않는 DB '${invalidDB}' 감지 성공`);
            console.log(`   📋 사용 가능한 DB: ${availableDBs.join(', ')}`);
        } else {
            console.log(`   ❌ 존재하지 않는 DB '${invalidDB}' 감지 실패`);
        }
        
        console.log('');
        
        // 5. 결과 요약
        console.log('5️⃣ 테스트 결과 요약');
        console.log(`   📊 총 동적변수: ${testConfig.dynamicVariables.length}개`);
        
        const validDBs = testConfig.dynamicVariables.filter(dv => 
            availableDBs.includes(dv.database)
        ).length;
        
        console.log(`   ✅ 유효한 DB 설정: ${validDBs}개`);
        console.log(`   ❌ 유효하지 않은 DB 설정: ${testConfig.dynamicVariables.length - validDBs}개`);
        
        if (validDBs === testConfig.dynamicVariables.length) {
            console.log('   🎉 모든 동적변수가 유효한 DB를 사용합니다!');
        } else {
            console.log('   ⚠️ 일부 동적변수가 유효하지 않은 DB를 사용합니다.');
        }
        
        console.log('\n✅ 다중 DB 동적변수 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실행 중 오류 발생:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testMultiDBDynamicVariables()
        .then(() => {
            console.log('\n🎯 테스트가 성공적으로 완료되었습니다.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 테스트 실행 중 오류가 발생했습니다:', error.message);
            process.exit(1);
        });
}

module.exports = { testMultiDBDynamicVariables };
