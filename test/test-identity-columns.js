const MSSQLDataMigrator = require('../src/mssql-data-migrator');
const path = require('path');

async function testIdentityColumns() {
    console.log('=== IDENTITY 컬럼 조회 테스트 ===');
    
    try {
        // 마이그레이터 인스턴스 생성
        const queryFilePath = path.join(__dirname, '../queries/migration-queries.xml');
        const migrator = new MSSQLDataMigrator(queryFilePath, true); // DRY RUN 모드
        
        // 설정 로드
        await migrator.loadConfig();
        
        // 데이터베이스 연결
        await migrator.connectionManager.connectBoth();
        
        // products 테이블의 IDENTITY 컬럼 조회
        console.log('\n--- products 테이블 IDENTITY 컬럼 조회 ---');
        const identityColumns = await migrator.getIdentityColumns('products', 'target');
        console.log('IDENTITY 컬럼 목록:', identityColumns);
        
        // products 테이블의 모든 컬럼 조회
        console.log('\n--- products 테이블 모든 컬럼 조회 ---');
        const allColumns = await migrator.getTableColumns('products', 'target');
        console.log('모든 컬럼 목록:', allColumns);
        
        // category_id가 IDENTITY인지 확인
        console.log('\n--- category_id 컬럼 상세 정보 ---');
        const categoryIdQuery = `
            SELECT 
                c.name AS column_name,
                c.is_identity,
                c.is_nullable,
                t.name AS data_type,
                c.precision,
                c.scale
            FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
            WHERE t.name = 'products' AND c.name = 'category_id'
        `;
        
        const result = await migrator.connectionManager.executeQueryOnTarget(categoryIdQuery);
        if (result && result.recordset && result.recordset.length > 0) {
            const columnInfo = result.recordset[0];
            console.log('category_id 컬럼 정보:', columnInfo);
            console.log(`is_identity: ${columnInfo.is_identity}`);
        } else {
            console.log('category_id 컬럼을 찾을 수 없습니다.');
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
    testIdentityColumns();
}

module.exports = { testIdentityColumns };
