const MSSQLDataMigrator = require('../src/mssql-data-migrator');
const path = require('path');

async function testProductsSelectStar() {
    console.log('=== products 테이블 SELECT * IDENTITY 컬럼 제외 테스트 ===');
    
    try {
        // 마이그레이터 인스턴스 생성
        const queryFilePath = path.join(__dirname, '../queries/migration-queries.xml');
        const migrator = new MSSQLDataMigrator(queryFilePath, true); // DRY RUN 모드
        
        // 설정 로드
        await migrator.loadConfig();
        
        // 데이터베이스 연결
        await migrator.connectionManager.connectBoth();
        
        // 테스트용 쿼리 설정
        const testQueryConfig = {
            id: 'test_products_select_star',
            description: 'products 테이블 SELECT * IDENTITY 컬럼 제외 테스트',
            sourceQuery: 'SELECT * FROM products',
            targetTable: 'products'
        };
        
        console.log('\n--- 테스트 쿼리 설정 ---');
        console.log('원본 쿼리:', testQueryConfig.sourceQuery);
        console.log('대상 테이블:', testQueryConfig.targetTable);
        
        // processQueryConfig 실행
        console.log('\n--- processQueryConfig 실행 ---');
        const processedConfig = await migrator.processQueryConfig(testQueryConfig);
        
        console.log('\n--- 처리 결과 ---');
        console.log('변경된 소스 쿼리:', processedConfig.sourceQuery);
        console.log('대상 컬럼 목록:', processedConfig.targetColumns);
        console.log('대상 컬럼 수:', processedConfig.targetColumns.length);
        
        // category_id가 포함되어 있는지 확인
        const hasCategoryId = processedConfig.targetColumns.includes('category_id');
        console.log('\n--- category_id 포함 여부 ---');
        console.log('category_id 포함됨:', hasCategoryId);
        
        if (!hasCategoryId) {
            console.log('❌ 문제: category_id가 제외되었습니다. (IDENTITY 컬럼이 아닌데도 제외됨)');
        } else {
            console.log('✅ 정상: category_id가 포함되었습니다.');
        }
        
        // 연결 종료
        await migrator.connectionManager.closeConnections();
        
        console.log('\n✅ 테스트 완료');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testProductsSelectStar();
}

module.exports = { testProductsSelectStar };
