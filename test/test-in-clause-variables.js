const MSSQLDataMigrator = require('./src/mssql-data-migrator');
const path = require('path');

// 테스트용 설정
const testConfig = {
    variables: {
        statusList: ["ACTIVE", "PENDING", "APPROVED"],
        categoryIds: [1, 2, 3, 5, 8],
        departmentCodes: ["IT", "HR", "SALES"],
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        singleStatus: "ACTIVE"
    }
};

// 테스트 쿼리들
const testQueries = [
    "SELECT * FROM products WHERE status IN (${statusList})",
    "SELECT * FROM products WHERE category_id IN (${categoryIds})",
    "SELECT * FROM employees WHERE department_code IN (${departmentCodes})",
    "SELECT * FROM orders WHERE status IN (${statusList}) AND created_date >= '${startDate}'",
    "SELECT * FROM products WHERE status = '${singleStatus}' AND category_id IN (${categoryIds})"
];

async function testInClauseVariables() {
    console.log('🧪 IN절 변수 치환 기능 테스트 시작\n');
    
    try {
        const migrator = new MSSQLDataMigrator();
        migrator.variables = testConfig.variables;
        
        console.log('📋 정의된 변수들:');
        Object.entries(testConfig.variables).forEach(([key, value]) => {
            console.log(`  ${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
        });
        
        console.log('\n🔄 변수 치환 테스트:');
        console.log('=' .repeat(80));
        
        testQueries.forEach((query, index) => {
            console.log(`\n${index + 1}. 원본 쿼리:`);
            console.log(`   ${query}`);
            
            const replacedQuery = migrator.replaceVariables(query);
            console.log(`   변환된 쿼리:`);
            console.log(`   ${replacedQuery}`);
        });
        
        console.log('\n✅ 모든 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    }
}

// 환경 변수 테스트
async function testEnvironmentVariables() {
    console.log('\n🌍 환경 변수 IN절 테스트');
    console.log('=' .repeat(50));
    
    // 환경 변수 설정 (JSON 배열 형태)
    process.env.TEST_STATUS_LIST = '["ACTIVE", "PENDING"]';
    process.env.TEST_CATEGORY_IDS = '[1, 2, 3]';
    process.env.TEST_SINGLE_VALUE = 'ACTIVE';
    
    const migrator = new MSSQLDataMigrator();
    
    const envTestQueries = [
        "SELECT * FROM products WHERE status IN (${TEST_STATUS_LIST})",
        "SELECT * FROM products WHERE category_id IN (${TEST_CATEGORY_IDS})",
        "SELECT * FROM products WHERE status = '${TEST_SINGLE_VALUE}'"
    ];
    
    envTestQueries.forEach((query, index) => {
        console.log(`\n${index + 1}. 환경 변수 쿼리:`);
        console.log(`   ${query}`);
        
        const replacedQuery = migrator.replaceVariables(query);
        console.log(`   변환된 쿼리:`);
        console.log(`   ${replacedQuery}`);
    });
}

// 실행
if (require.main === module) {
    testInClauseVariables()
        .then(() => testEnvironmentVariables())
        .catch(console.error);
}

module.exports = { testInClauseVariables, testEnvironmentVariables }; 