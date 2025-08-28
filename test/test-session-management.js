const MSSQLDataMigrator = require('../src/mssql-data-migrator');
const path = require('path');

async function testSessionManagement() {
    console.log('=== 세션 관리 기능 테스트 시작 ===\n');
    
    try {
        // 마이그레이터 인스턴스 생성
        const migrator = new MSSQLDataMigrator();
        
        // 설정 파일 로드
        const configPath = path.join(__dirname, '..', 'config', 'dbinfo.json');
        await migrator.loadConfiguration(configPath);
        
        // 연결 테스트
        console.log('1. 데이터베이스 연결 테스트...');
        await migrator.connectionManager.connectBoth();
        console.log('✅ 연결 성공\n');
        
        // 세션 관리 기능 테스트
        console.log('2. 세션 관리 기능 테스트...');
        
        // 세션 시작
        console.log('   - 세션 시작...');
        await migrator.connectionManager.beginSession('target');
        console.log('   ✅ 세션 시작 성공');
        
        // temp 테이블 생성
        console.log('   - temp 테이블 생성...');
        const createTempTableSQL = `
            IF OBJECT_ID('tempdb..#test_temp') IS NOT NULL DROP TABLE #test_temp;
            CREATE TABLE #test_temp (id INT, name VARCHAR(50));
            INSERT INTO #test_temp VALUES (1, 'Test1'), (2, 'Test2'), (3, 'Test3');
        `;
        await migrator.connectionManager.executeQueryInSession(createTempTableSQL, 'target');
        console.log('   ✅ temp 테이블 생성 성공');
        
        // temp 테이블 조회
        console.log('   - temp 테이블 조회...');
        const selectSQL = 'SELECT * FROM #test_temp';
        const result = await migrator.connectionManager.executeQueryInSession(selectSQL, 'target');
        console.log(`   ✅ temp 테이블 조회 성공 (${result.recordset.length}행)`);
        
        // temp 테이블 수정
        console.log('   - temp 테이블 수정...');
        const updateSQL = 'UPDATE #test_temp SET name = name + \'_updated\' WHERE id = 1';
        await migrator.connectionManager.executeQueryInSession(updateSQL, 'target');
        console.log('   ✅ temp 테이블 수정 성공');
        
        // 수정된 데이터 확인
        console.log('   - 수정된 데이터 확인...');
        const updatedResult = await migrator.connectionManager.executeQueryInSession(selectSQL, 'target');
        console.log('   ✅ 수정된 데이터 확인 성공');
        console.log('   📊 데이터:', updatedResult.recordset);
        
        // 세션 종료
        console.log('   - 세션 종료...');
        await migrator.connectionManager.endSession('target');
        console.log('   ✅ 세션 종료 성공');
        
        console.log('\n✅ 세션 관리 기능 테스트 완료\n');
        
        // temp 테이블 감지 기능 테스트
        console.log('3. temp 테이블 감지 기능 테스트...');
        
        const testQueryConfig = {
            id: 'test_query',
            preProcess: {
                script: `
                    IF OBJECT_ID('tempdb..#temp_products') IS NOT NULL DROP TABLE #temp_products;
                    CREATE TABLE #temp_products (product_id INT);
                    INSERT INTO #temp_products VALUES (1), (2), (3);
                `
            },
            sourceQuery: 'SELECT * FROM products WHERE product_id IN (SELECT product_id FROM #temp_products)',
            postProcess: {
                script: 'IF OBJECT_ID(\'tempdb..#temp_products\') IS NOT NULL DROP TABLE #temp_products;'
            }
        };
        
        const hasTempTables = migrator.detectTempTableUsage(testQueryConfig);
        console.log(`   - temp 테이블 감지 결과: ${hasTempTables ? '감지됨' : '감지되지 않음'}`);
        console.log(`   ✅ temp 테이블 감지 기능 테스트 완료\n`);
        
        console.log('=== 모든 테스트 완료 ===');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

// 테스트 실행
testSessionManagement();
