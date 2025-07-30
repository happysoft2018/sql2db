const MSSQLDataMigrator = require('../src/mssql-data-migrator');
const path = require('path');

// 테스트용 설정
const testConfig = {
    variables: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        categoryIds: [1, 2, 3]
    },
    dynamicVariables: [
        {
            id: "test_single_value",
            description: "단일 값 추출 테스트",
            variableName: "testSingleValue",
            query: "SELECT 'TEST_VALUE' as test_value",
            extractType: "single_value",
            enabled: true
        },
        {
            id: "test_single_column",
            description: "단일 컬럼 추출 테스트",
            variableName: "testIds",
            query: "SELECT 1 as id UNION SELECT 2 UNION SELECT 3",
            extractType: "single_column",
            columnName: "id",
            enabled: true
        },
        {
            id: "test_multiple_columns",
            description: "다중 컬럼 추출 테스트",
            variableName: "testMultipleValues",
            query: "SELECT 'A' as col1, 'B' as col2 UNION SELECT 'C', 'D'",
            extractType: "multiple_columns",
            columns: ["col1", "col2"],
            enabled: true
        },
        {
            id: "test_key_value_pairs",
            description: "키-값 쌍 추출 테스트",
            variableName: "testMapping",
            query: "SELECT 'key1' as key, 'value1' as value UNION SELECT 'key2', 'value2'",
            extractType: "key_value_pairs",
            enabled: true
        }
    ]
};

// 테스트 쿼리들
const testQueries = [
    "SELECT * FROM test WHERE id = '${testSingleValue}'",
    "SELECT * FROM test WHERE id IN (${testIds})",
    "SELECT * FROM test WHERE col IN (${testMultipleValues})",
    "SELECT * FROM test WHERE key = '${testMapping.key1}'"
];

async function testDynamicVariables() {
    console.log('🧪 동적 변수 추출 기능 테스트 시작\n');
    
    try {
        const migrator = new MSSQLDataMigrator();
        migrator.config = testConfig;
        migrator.variables = testConfig.variables;
        
        console.log('📋 기본 변수들:');
        Object.entries(testConfig.variables).forEach(([key, value]) => {
            console.log(`  ${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
        });
        
        console.log('\n🔄 동적 변수 추출 시뮬레이션:');
        console.log('=' .repeat(80));
        
        // 각 동적 변수 추출 시뮬레이션
        for (const extractConfig of testConfig.dynamicVariables) {
            console.log(`\n${extractConfig.id}:`);
            console.log(`  설명: ${extractConfig.description}`);
            console.log(`  쿼리: ${extractConfig.query}`);
            console.log(`  추출 타입: ${extractConfig.extractType}`);
            
            // 모의 데이터 생성
            let mockData = [];
            let extractedValue;
            
            switch (extractConfig.extractType) {
                case 'single_value':
                    mockData = [{ test_value: 'TEST_VALUE' }];
                    extractedValue = 'TEST_VALUE';
                    break;
                    
                case 'single_column':
                    mockData = [{ id: 1 }, { id: 2 }, { id: 3 }];
                    extractedValue = [1, 2, 3];
                    break;
                    
                case 'multiple_columns':
                    mockData = [{ col1: 'A', col2: 'B' }, { col1: 'C', col2: 'D' }];
                    extractedValue = ['A', 'B', 'C', 'D'];
                    break;
                    
                case 'key_value_pairs':
                    mockData = [{ key: 'key1', value: 'value1' }, { key: 'key2', value: 'value2' }];
                    extractedValue = { key1: 'value1', key2: 'value2' };
                    break;
            }
            
            // 동적 변수 설정
            migrator.setDynamicVariable(extractConfig.variableName, extractedValue);
            
            console.log(`  추출된 값: ${JSON.stringify(extractedValue)}`);
        }
        
        console.log('\n🔄 변수 치환 테스트:');
        console.log('=' .repeat(80));
        
        testQueries.forEach((query, index) => {
            console.log(`\n${index + 1}. 원본 쿼리:`);
            console.log(`   ${query}`);
            
            const replacedQuery = migrator.replaceVariables(query);
            console.log(`   변환된 쿼리:`);
            console.log(`   ${replacedQuery}`);
        });
        
        console.log('\n📊 현재 변수 상태:');
        console.log('기본 변수:', Object.keys(migrator.variables).join(', '));
        console.log('동적 변수:', Object.keys(migrator.dynamicVariables).join(', '));
        
        console.log('\n✅ 모든 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    }
}

// 실제 데이터베이스 연결 없이 추출 로직 테스트
async function testExtractionLogic() {
    console.log('\n🔬 추출 로직 단위 테스트');
    console.log('=' .repeat(50));
    
    const migrator = new MSSQLDataMigrator();
    
    // 각 추출 타입별 테스트 데이터
    const testCases = [
        {
            name: 'single_value',
            data: [{ max_id: 100 }],
            config: { extractType: 'single_value' },
            expected: 100
        },
        {
            name: 'single_column',
            data: [{ user_id: 1 }, { user_id: 2 }, { user_id: 3 }],
            config: { extractType: 'single_column', columnName: 'user_id' },
            expected: [1, 2, 3]
        },
        {
            name: 'multiple_columns',
            data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
            config: { extractType: 'multiple_columns', columns: ['id', 'name'] },
            expected: [1, 'A', 2, 'B']
        },
        {
            name: 'key_value_pairs',
            data: [{ code: 'IT', name: 'Information Technology' }, { code: 'HR', name: 'Human queries' }],
            config: { extractType: 'key_value_pairs' },
            expected: { IT: 'Information Technology', HR: 'Human queries' }
        }
    ];
    
    testCases.forEach(testCase => {
        console.log(`\n${testCase.name} 테스트:`);
        console.log(`  입력 데이터: ${JSON.stringify(testCase.data)}`);
        
        let result;
        const data = testCase.data;
        
        switch (testCase.config.extractType) {
            case 'single_value':
                const firstRow = data[0];
                const firstColumn = Object.keys(firstRow)[0];
                result = firstRow[firstColumn];
                break;
                
            case 'single_column':
                const columnName = testCase.config.columnName || Object.keys(data[0])[0];
                result = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
                break;
                
            case 'multiple_columns':
                const columns = testCase.config.columns || Object.keys(data[0]);
                result = [];
                data.forEach(row => {
                    columns.forEach(col => {
                        if (row[col] !== null && row[col] !== undefined) {
                            result.push(row[col]);
                        }
                    });
                });
                break;
                
            case 'key_value_pairs':
                const keys = Object.keys(data[0]);
                result = {};
                data.forEach(row => {
                    const key = row[keys[0]];
                    const value = row[keys[1]];
                    if (key !== null && key !== undefined) {
                        result[key] = value;
                    }
                });
                break;
        }
        
        console.log(`  추출 결과: ${JSON.stringify(result)}`);
        console.log(`  예상 결과: ${JSON.stringify(testCase.expected)}`);
        console.log(`  테스트 결과: ${JSON.stringify(result) === JSON.stringify(testCase.expected) ? '✅ 성공' : '❌ 실패'}`);
    });
}

// 실행
if (require.main === module) {
    testDynamicVariables()
        .then(() => testExtractionLogic())
        .catch(console.error);
}

module.exports = { testDynamicVariables, testExtractionLogic }; 