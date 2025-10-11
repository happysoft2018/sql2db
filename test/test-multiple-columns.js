/**
 * multiple_columns extractType 기능 테스트
 * 실제 DB 연결 없이 로직 검증
 */

const MSSQLDataMigrator = require('../src/mssql-data-migrator-modular');

async function testMultipleColumnsExtraction() {
    console.log('🧪 multiple_columns extractType 기능 테스트 시작\n');
    
    try {
        // 테스트용 XML 내용 (간단한 구조)
        const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<migration>
    <settings>
        <sourceDatabase>testSource</sourceDatabase>
        <targetDatabase>testTarget</targetDatabase>
    </settings>
    
    <variables>
        <var name="startDate">2024-01-01</var>
        <var name="statusList">["ACTIVE", "PENDING"]</var>
    </variables>
    
    <dynamicVariables>
        <dynamicVar id="test_multiple_columns"
                    description="여러 컬럼 값 통합 추출 테스트"
                    variableName="allEntityIds"
                    extractType="multiple_columns"
                    columns="user_id,department_id,manager_id"
                    enabled="true">
            <![CDATA[
                SELECT u.user_id, u.department_id, d.manager_id
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                WHERE u.status = 'ACTIVE'
            ]]>
        </dynamicVar>
        
        <dynamicVar id="test_single_column"
                    description="단일 컬럼 추출 비교용"
                    variableName="userIds"
                    extractType="single_column"
                    columnName="user_id"
                    enabled="true">
            <![CDATA[
                SELECT user_id FROM users WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
    </dynamicVariables>
    
    <queries>
        <query id="test_query"
               targetTable="test_table"
               enabled="false">
            <sourceQuery>
                <![CDATA[
                    SELECT * FROM related_data 
                    WHERE entity_id IN (100, 101, 102)
                ]]>
            </sourceQuery>
        </query>
    </queries>
</migration>`;

        // 마이그레이터 인스턴스 생성 (XML 문자열 직접 파싱)
        const migrator = new MSSQLDataMigrator();
        
        // 변수 초기화 (XML 파싱 전에 필요)
        migrator.variables = {
            startDate: "2024-01-01",
            statusList: ["ACTIVE", "PENDING"]
        };
        
        // XML 파싱 테스트
        console.log('📄 XML 파싱 테스트...');
        const config = await migrator.parseXmlConfig(testXml);
        
        console.log('✅ XML 파싱 성공');
        console.log(`   - 동적 변수 개수: ${config.dynamicVariables.length}`);
        console.log(`   - 쿼리 개수: ${config.queries.length}`);
        
        // 동적 변수 정보 출력
        console.log('\n📋 동적 변수 정보:');
        config.dynamicVariables.forEach((dv, index) => {
            console.log(`${index + 1}. ${dv.id}`);
            console.log(`   - 변수명: ${dv.variableName}`);
            console.log(`   - 추출 타입: ${dv.extractType}`);
            if (dv.columns) {
                console.log(`   - 컬럼들: ${dv.columns.join(', ')}`);
            }
            if (dv.columnName) {
                console.log(`   - 컬럼명: ${dv.columnName}`);
            }
            console.log(`   - 활성화: ${dv.enabled}`);
            console.log('');
        });
        
        // 모의 데이터로 추출 로직 테스트
        console.log('🔬 multiple_columns 추출 로직 테스트...');
        
        // 모의 쿼리 결과 데이터
        const mockData = [
            { user_id: 100, department_id: 10, manager_id: 5 },
            { user_id: 101, department_id: 20, manager_id: 6 },
            { user_id: 102, department_id: 10, manager_id: 5 },
            { user_id: 103, department_id: 30, manager_id: 7 }
        ];
        
        console.log('📊 모의 데이터:');
        console.table(mockData);
        
        // multiple_columns 추출 시뮬레이션
        const multipleColumnsConfig = config.dynamicVariables.find(dv => dv.extractType === 'multiple_columns');
        if (multipleColumnsConfig) {
            const columns = multipleColumnsConfig.columns;
            const extractedValues = [];
            
            mockData.forEach(row => {
                columns.forEach(col => {
                    if (row[col] !== null && row[col] !== undefined) {
                        extractedValues.push(row[col]);
                    }
                });
            });
            
            console.log(`\n✅ multiple_columns 추출 결과 (${columns.join(', ')}):`);
            console.log(`   배열: [${extractedValues.join(', ')}]`);
            console.log(`   총 ${extractedValues.length}개 값 추출됨`);
            console.log(`   중복 제거된 고유값: [${[...new Set(extractedValues)].join(', ')}]`);
        }
        
        // single_column 추출 비교
        const singleColumnConfig = config.dynamicVariables.find(dv => dv.extractType === 'single_column');
        if (singleColumnConfig) {
            const columnName = singleColumnConfig.columnName;
            const extractedValues = mockData.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
            
            console.log(`\n🔎 single_column 추출 결과 (${columnName}):`);
            console.log(`   배열: [${extractedValues.join(', ')}]`);
            console.log(`   총 ${extractedValues.length}개 값 추출됨`);
        }
        
        // IN절 변환 시뮬레이션
        console.log('\n🔄 IN절 변환 시뮬레이션:');
        const allValues = [];
        mockData.forEach(row => {
            ['user_id', 'department_id', 'manager_id'].forEach(col => {
                if (row[col] !== null && row[col] !== undefined) {
                    allValues.push(row[col]);
                }
            });
        });
        
        const inClause = allValues.join(', ');
        console.log(`   WHERE entity_id IN (${inClause})`);
        
        // 변수 치환 테스트
        console.log('\n🔧 변수 치환 테스트:');
        const testQuery = "SELECT * FROM related_data WHERE entity_id IN (${allEntityIds})";
        const replacedQuery = testQuery.replace('${allEntityIds}', inClause);
        console.log(`   원본: ${testQuery}`);
        console.log(`   치환: ${replacedQuery}`);
        
        console.log('\n✅ 모든 테스트 완료!');
        console.log('\n📝 요약:');
        console.log('   - multiple_columns는 여러 컬럼의 모든 값을 하나의 배열로 통합');
        console.log('   - single_column은 하나의 컬럼 값만 배열로 추출');
        console.log('   - IN절에서 여러 테이블의 관련 ID들을 통합 검색할 때 유용');
        console.log('   - NULL 값은 자동으로 필터링됨');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testMultipleColumnsExtraction();
}

module.exports = { testMultipleColumnsExtraction };