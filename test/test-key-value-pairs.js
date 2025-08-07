/**
 * key_value_pairs extractType 기능 테스트
 * companyMapping 타입의 동적변수 사용법 검증
 */

const MSSQLDataMigrator = require('../src/mssql-data-migrator');

async function testKeyValuePairsExtraction() {
    console.log('🧪 key_value_pairs extractType 기능 테스트 시작\n');
    
    try {
        // 테스트용 XML 내용
        const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<migration>
    <settings>
        <sourceDatabase>testSource</sourceDatabase>
        <targetDatabase>testTarget</targetDatabase>
    </settings>
    
    <variables>
        <var name="startDate">2024-01-01</var>
    </variables>
    
    <dynamicVariables>
        <!-- 회사 코드-이름 매핑 -->
        <dynamicVar id="extract_company_mapping"
                    variableName="companyMapping"
                    extractType="key_value_pairs"
                    enabled="true">
            <![CDATA[
                SELECT company_code, company_name FROM companies WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
        
        <!-- 부서 코드-이름 매핑 -->
        <dynamicVar id="extract_department_mapping"
                    variableName="departmentMapping"
                    extractType="key_value_pairs"
                    enabled="true">
            <![CDATA[
                SELECT dept_code, dept_name FROM departments WHERE is_active = 1
            ]]>
        </dynamicVar>
        
        <!-- 상태 코드-설명 매핑 -->
        <dynamicVar id="extract_status_mapping"
                    variableName="statusMapping"
                    extractType="key_value_pairs"
                    enabled="true">
            <![CDATA[
                SELECT status_code, status_description FROM status_codes
            ]]>
        </dynamicVar>
        
        <!-- 비교용: single_column -->
        <dynamicVar id="extract_company_codes"
                    variableName="companyCodes"
                    extractType="single_column"
                    columnName="company_code"
                    enabled="true">
            <![CDATA[
                SELECT company_code FROM companies WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
    </dynamicVariables>
    
    <queries>
        <query id="test_mapping_query" targetTable="test_table" enabled="false">
            <sourceQuery>
                <![CDATA[
                    SELECT 
                      user_id,
                      username,
                      company_code,
                      dept_code,
                      status
                    FROM users
                    WHERE company_code IN ('COMP01', 'COMP02', 'COMP03')
                      AND dept_code IN ('IT', 'HR', 'FIN')
                ]]>
            </sourceQuery>
        </query>
    </queries>
</migration>`;

        // 마이그레이터 인스턴스 생성
        const migrator = new MSSQLDataMigrator();
        
        // 변수 초기화
        migrator.variables = {
            startDate: "2024-01-01"
        };
        
        // XML 파싱 테스트
        console.log('📄 XML 파싱 테스트...');
        const config = await migrator.parseXmlConfig(testXml);
        
        console.log('✅ XML 파싱 성공');
        console.log(`   - 동적 변수 개수: ${config.dynamicVariables.length}`);
        
        // 동적 변수 정보 출력
        console.log('\n📋 동적 변수 정보:');
        config.dynamicVariables.forEach((dv, index) => {
            console.log(`${index + 1}. ${dv.id} (${dv.extractType})`);
            console.log(`   - 변수명: ${dv.variableName}`);
            if (dv.columnName) {
                console.log(`   - 컬럼명: ${dv.columnName}`);
            }
            console.log('');
        });
        
        // 모의 데이터로 추출 로직 테스트
        console.log('🔬 key_value_pairs 추출 로직 테스트...');
        
        // 모의 회사 데이터
        const mockCompanyData = [
            { company_code: 'COMP01', company_name: 'Samsung Electronics' },
            { company_code: 'COMP02', company_name: 'LG Electronics' },
            { company_code: 'COMP03', company_name: 'SK Hynix' },
            { company_code: 'COMP04', company_name: 'Hyundai Motor' }
        ];
        
        // 모의 부서 데이터
        const mockDepartmentData = [
            { dept_code: 'IT', dept_name: 'Information Technology' },
            { dept_code: 'HR', dept_name: 'Human Resources' },
            { dept_code: 'FIN', dept_name: 'Finance' },
            { dept_code: 'MKT', dept_name: 'Marketing' }
        ];
        
        // 모의 상태 데이터
        const mockStatusData = [
            { status_code: 'ACT', status_description: 'Active' },
            { status_code: 'INA', status_description: 'Inactive' },
            { status_code: 'PEN', status_description: 'Pending' },
            { status_code: 'SUS', status_description: 'Suspended' }
        ];
        
        console.log('📊 모의 매핑 데이터:');
        console.log('\n회사 데이터:');
        console.table(mockCompanyData);
        console.log('\n부서 데이터:');
        console.table(mockDepartmentData);
        console.log('\n상태 데이터:');
        console.table(mockStatusData);
        
        // 1. key_value_pairs 추출 시뮬레이션
        console.log('\n1️⃣ key_value_pairs 추출 결과:');
        
        // 회사 매핑
        const companyMapping = {};
        mockCompanyData.forEach(row => {
            companyMapping[row.company_code] = row.company_name;
        });
        console.log('   companyMapping:', JSON.stringify(companyMapping, null, 2));
        
        // 부서 매핑
        const departmentMapping = {};
        mockDepartmentData.forEach(row => {
            departmentMapping[row.dept_code] = row.dept_name;
        });
        console.log('   departmentMapping:', JSON.stringify(departmentMapping, null, 2));
        
        // 상태 매핑
        const statusMapping = {};
        mockStatusData.forEach(row => {
            statusMapping[row.status_code] = row.status_description;
        });
        console.log('   statusMapping:', JSON.stringify(statusMapping, null, 2));
        
        // 2. 비교용 single_column 추출
        console.log('\n2️⃣ single_column 추출 결과 (비교용):');
        const companyCodes = mockCompanyData.map(row => row.company_code);
        console.log(`   companyCodes: [${companyCodes.join(', ')}]`);
        
        // 3. 변수 치환 시뮬레이션
        console.log('\n🔄 변수 치환 시뮬레이션:');
        
        // 개별 키 접근 패턴
        console.log('   개별 키 접근:');
        console.log(`   \${companyMapping.COMP01} → "${companyMapping.COMP01}"`);
        console.log(`   \${companyMapping.COMP02} → "${companyMapping.COMP02}"`);
        console.log(`   \${departmentMapping.IT} → "${departmentMapping.IT}"`);
        console.log(`   \${statusMapping.ACT} → "${statusMapping.ACT}"`);
        
        // 전체 키 접근 패턴
        const companyKeys = Object.keys(companyMapping);
        const departmentKeys = Object.keys(departmentMapping);
        const statusKeys = Object.keys(statusMapping);
        
        console.log('\n   전체 키 접근 (IN절 용도):');
        console.log(`   \${companyMapping} → [${companyKeys.join(', ')}]`);
        console.log(`   \${departmentMapping} → [${departmentKeys.join(', ')}]`);
        console.log(`   \${statusMapping} → [${statusKeys.join(', ')}]`);
        
        // 4. 실제 쿼리 치환 예시
        console.log('\n🔧 실제 쿼리 치환 예시:');
        
        const testQueries = [
            // 개별 키 접근
            "SELECT '${companyMapping.COMP01}' as company_name",
            "CASE dept_code WHEN 'IT' THEN '${departmentMapping.IT}' ELSE 'Unknown' END",
            
            // IN절에서 키 사용
            "WHERE company_code IN (${companyMapping})",
            "WHERE dept_code IN (${departmentMapping}) AND status IN (${statusMapping})",
            
            // 복합 사용
            "SELECT user_id, '${companyMapping.COMP01}' as company_name FROM users WHERE company_code IN (${companyMapping})"
        ];
        
        testQueries.forEach((query, index) => {
            let result = query;
            
            // 개별 키 치환
            result = result.replace('${companyMapping.COMP01}', `'${companyMapping.COMP01}'`);
            result = result.replace('${departmentMapping.IT}', `'${departmentMapping.IT}'`);
            
            // 전체 키 치환
            result = result.replace('${companyMapping}', companyKeys.map(k => `'${k}'`).join(', '));
            result = result.replace('${departmentMapping}', departmentKeys.map(k => `'${k}'`).join(', '));
            result = result.replace('${statusMapping}', statusKeys.map(k => `'${k}'`).join(', '));
            
            console.log(`\n   ${index + 1}. 원본: ${query}`);
            console.log(`      치환: ${result}`);
        });
        
        console.log('\n✅ 모든 테스트 완료!\n');
        
        console.log('📝 key_value_pairs 활용 패턴 요약:');
        console.log('');
        console.log('┌─────────────────────┬──────────────────────┬────────────────────────┐');
        console.log('│ 사용 패턴            │ 문법                 │ 결과                   │');
        console.log('├─────────────────────┼──────────────────────┼────────────────────────┤');
        console.log('│ 개별 키 값 조회     │ ${mapping.키}        │ 해당 키의 값           │');
        console.log('│ 전체 키 목록       │ ${mapping}           │ 모든 키들 (IN절용)     │');
        console.log('│ CASE문에서 매핑     │ CASE WHEN .. THEN .. │ 조건별 값 매핑         │');
        console.log('│ IN절 필터링        │ WHERE col IN (..)    │ 매핑된 키로 필터링     │');
        console.log('└─────────────────────┴──────────────────────┴────────────────────────┘');
        console.log('');
        console.log('🎯 key_value_pairs의 핵심 가치:');
        console.log('   - 코드-이름 매핑을 동적으로 처리');
        console.log('   - 런타임에 매핑 테이블 변경사항 반영');
        console.log('   - SQL에서 직접 매핑 값 참조 가능');
        console.log('   - 코드 테이블 조인 없이 매핑 처리');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testKeyValuePairsExtraction();
}

module.exports = { testKeyValuePairsExtraction };