const MSSQLDataMigrator = require('../src/mssql-data-migrator-modular.js');

async function testSourceQueryProperties() {
    try {
        console.log('🔍 sourceQuery 속성 이동 테스트 시작...');
        
        const migrator = new MSSQLDataMigrator('queries/migration-queries.xml');
        
        // 설정 로드
        await migrator.loadConfig();
        
        // 쿼리 설정 확인
        const queries = migrator.config.queries;
        
        console.log('\n📋 파싱된 쿼리 목록:');
        queries.forEach((query, index) => {
            console.log(`\n${index + 1}. 쿼리 ID: ${query.id}`);
            console.log(`   설명: ${query.description}`);
            console.log(`   대상 테이블: ${query.targetTable}`);
            console.log(`   대상 컬럼: ${query.targetColumns ? query.targetColumns.join(', ') : '없음'}`);
            console.log(`   Identity 컬럼: ${query.identityColumns || '없음'}`);
            console.log(`   deleteBeforeInsert: ${query.sourceQueryDeleteBeforeInsert}`);
            console.log(`   applyGlobalColumns: ${query.sourceQueryApplyGlobalColumns}`);
            console.log(`   sourceQueryFile: ${query.sourceQueryFile || '없음'}`);
            console.log(`   sourceQuery: ${query.sourceQuery ? '있음' : '없음'}`);
        });
        
        // 특정 쿼리 상세 확인
        const usersQuery = queries.find(q => q.id === 'migrate_users');
        if (usersQuery) {
            console.log('\n✅ migrate_users 쿼리 상세 정보:');
            console.log(`   targetTable: ${usersQuery.targetTable}`);
            console.log(`   targetColumns: ${usersQuery.targetColumns.join(', ')}`);
            console.log(`   identityColumns: ${usersQuery.identityColumns}`);
            console.log(`   deleteBeforeInsert: ${usersQuery.sourceQueryDeleteBeforeInsert}`);
        }
        
        const productsQuery = queries.find(q => q.id === 'migrate_products_all');
        if (productsQuery) {
            console.log('\n✅ migrate_products_all 쿼리 상세 정보:');
            console.log(`   targetTable: ${productsQuery.targetTable}`);
            console.log(`   targetColumns: ${productsQuery.targetColumns.join(', ')}`);
            console.log(`   identityColumns: ${productsQuery.identityColumns}`);
            console.log(`   deleteBeforeInsert: ${productsQuery.sourceQueryDeleteBeforeInsert}`);
            console.log(`   applyGlobalColumns: ${productsQuery.sourceQueryApplyGlobalColumns}`);
        }
        
        console.log('\n🎉 sourceQuery 속성 이동 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testSourceQueryProperties();
}

module.exports = { testSourceQueryProperties };
