const MSSQLDataMigrator = require('../src/mssql-data-migrator-modular.js');
const fs = require('fs');
const xml2js = require('xml2js');

async function testXmlParsingDebug() {
    try {
        console.log('🔍 XML 파싱 디버깅 시작...');
        
        // XML 파일 직접 읽기
        const xmlContent = fs.readFileSync('queries/migration-queries.xml', 'utf8');
        
        // xml2js로 파싱
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true
        });
        
        const result = await parser.parseStringPromise(xmlContent);
        
        console.log('\n📋 XML 파싱 결과:');
        
        // migrate_users 쿼리 확인
        const usersQuery = result.migration.queries.query.find(q => q.id === 'migrate_users');
        if (usersQuery) {
            console.log('\n✅ migrate_users 쿼리 원본 데이터:');
            console.log('   id:', usersQuery.id);
            console.log('   description:', usersQuery.description);
            console.log('   targetTable:', usersQuery.targetTable);
            console.log('   targetColumns:', usersQuery.targetColumns);
            console.log('   identityColumns:', usersQuery.identityColumns);
            console.log('   sourceQuery 타입:', typeof usersQuery.sourceQuery);
            
            if (typeof usersQuery.sourceQuery === 'object') {
                console.log('   sourceQuery 객체 속성들:');
                Object.keys(usersQuery.sourceQuery).forEach(key => {
                    console.log(`     ${key}:`, usersQuery.sourceQuery[key]);
                });
            } else {
                console.log('   sourceQuery 문자열:', usersQuery.sourceQuery);
            }
        }
        
        // migrate_products_all 쿼리 확인
        const productsQuery = result.migration.queries.query.find(q => q.id === 'migrate_products_all');
        if (productsQuery) {
            console.log('\n✅ migrate_products_all 쿼리 원본 데이터:');
            console.log('   id:', productsQuery.id);
            console.log('   description:', productsQuery.description);
            console.log('   targetTable:', productsQuery.targetTable);
            console.log('   targetColumns:', productsQuery.targetColumns);
            console.log('   identityColumns:', productsQuery.identityColumns);
            console.log('   sourceQuery 타입:', typeof productsQuery.sourceQuery);
            
            if (typeof productsQuery.sourceQuery === 'object') {
                console.log('   sourceQuery 객체 속성들:');
                Object.keys(productsQuery.sourceQuery).forEach(key => {
                    console.log(`     ${key}:`, productsQuery.sourceQuery[key]);
                });
            } else {
                console.log('   sourceQuery 문자열:', productsQuery.sourceQuery);
            }
        }
        
        console.log('\n🎉 XML 파싱 디버깅 완료!');
        
    } catch (error) {
        console.error('❌ 디버깅 실패:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testXmlParsingDebug();
}

module.exports = { testXmlParsingDebug };
