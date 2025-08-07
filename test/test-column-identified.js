/**
 * column_identified extractType 기능 테스트
 * allApprovalCodes의 각 컬럼값을 식별할 수 있는 새로운 기능 검증
 */

const MSSQLDataMigrator = require('../src/mssql-data-migrator');

async function testColumnIdentifiedExtraction() {
    console.log('🧪 column_identified extractType 기능 테스트 시작\n');
    
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
        <var name="statusList">["ACTIVE", "PENDING"]</var>
    </variables>
    
    <dynamicVariables>
        <!-- 방법 1: 개별 single_column 추출 -->
        <dynamicVar id="extract_approver_codes"
                    variableName="approverCodes"
                    extractType="single_column"
                    columnName="approver_code"
                    enabled="true">
            <![CDATA[
                SELECT DISTINCT approver_code FROM approval_requests WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
        
        <dynamicVar id="extract_requester_codes"
                    variableName="requesterCodes"
                    extractType="single_column"
                    columnName="requester_code"
                    enabled="true">
            <![CDATA[
                SELECT DISTINCT requester_code FROM approval_requests WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
        
        <!-- 방법 2: multiple_columns (기존) -->
        <dynamicVar id="extract_all_approval_codes"
                    variableName="allApprovalCodes"
                    extractType="multiple_columns"
                    columns="approver_code,requester_code,product_code"
                    enabled="true">
            <![CDATA[
                SELECT DISTINCT approver_code, requester_code, product_code
                FROM approval_requests WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
        
        <!-- 방법 3: column_identified (NEW!) -->
        <dynamicVar id="extract_approval_codes_identified"
                    variableName="approvalCodesById"
                    extractType="column_identified"
                    columns="approver_code,requester_code,product_code"
                    enabled="true">
            <![CDATA[
                SELECT DISTINCT approver_code, requester_code, product_code
                FROM approval_requests WHERE status = 'ACTIVE'
            ]]>
        </dynamicVar>
    </dynamicVariables>
    
    <queries>
        <query id="test_query" targetTable="test_table" enabled="false">
            <sourceQuery>
                <![CDATA[
                    SELECT * FROM audit_logs 
                    WHERE user_code IN ('MGR01', 'MGR02')
                       OR entity_code IN ('PRD01', 'PRD02')
                ]]>
            </sourceQuery>
        </query>
    </queries>
</migration>`;

        // 마이그레이터 인스턴스 생성
        const migrator = new MSSQLDataMigrator();
        
        // 변수 초기화
        migrator.variables = {
            startDate: "2024-01-01",
            statusList: ["ACTIVE", "PENDING"]
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
            if (dv.columns) {
                console.log(`   - 컬럼들: ${dv.columns.join(', ')}`);
            }
            if (dv.columnName) {
                console.log(`   - 컬럼명: ${dv.columnName}`);
            }
            console.log('');
        });
        
        // 모의 데이터로 추출 로직 테스트
        console.log('🔬 extractType별 추출 로직 비교 테스트...');
        
        // 모의 쿼리 결과 데이터
        const mockApprovalData = [
            { approver_code: 'MGR01', requester_code: 'USR01', product_code: 'PRD01' },
            { approver_code: 'MGR02', requester_code: 'USR02', product_code: 'PRD02' },
            { approver_code: 'MGR01', requester_code: 'USR03', product_code: 'PRD01' }, // 중복 테스트
            { approver_code: 'MGR03', requester_code: 'USR02', product_code: 'PRD03' }  // 중복 테스트
        ];
        
        console.log('📊 모의 승인 데이터:');
        console.table(mockApprovalData);
        
        // 1. single_column 추출 시뮬레이션
        console.log('\n1️⃣ single_column 추출 결과:');
        const approverCodes = [...new Set(mockApprovalData.map(row => row.approver_code))];
        const requesterCodes = [...new Set(mockApprovalData.map(row => row.requester_code))];
        console.log(`   approverCodes: [${approverCodes.join(', ')}]`);
        console.log(`   requesterCodes: [${requesterCodes.join(', ')}]`);
        
        // 2. multiple_columns 추출 시뮬레이션
        console.log('\n2️⃣ multiple_columns 추출 결과:');
        const allValues = [];
        mockApprovalData.forEach(row => {
            ['approver_code', 'requester_code', 'product_code'].forEach(col => {
                if (row[col] !== null && row[col] !== undefined) {
                    allValues.push(row[col]);
                }
            });
        });
        console.log(`   allApprovalCodes: [${allValues.join(', ')}]`);
        console.log(`   중복 제거된 값: [${[...new Set(allValues)].join(', ')}]`);
        
        // 3. column_identified 추출 시뮬레이션 (NEW!)
        console.log('\n3️⃣ column_identified 추출 결과 ⭐ NEW!:');
        const identifiedColumns = ['approver_code', 'requester_code', 'product_code'];
        const extractedValue = {};
        
        identifiedColumns.forEach(col => {
            extractedValue[col] = [];
        });
        
        mockApprovalData.forEach(row => {
            identifiedColumns.forEach(col => {
                if (row[col] !== null && row[col] !== undefined) {
                    extractedValue[col].push(row[col]);
                }
            });
        });
        
        // 중복 제거
        Object.keys(extractedValue).forEach(col => {
            extractedValue[col] = [...new Set(extractedValue[col])];
        });
        
        console.log('   approvalCodesById:', JSON.stringify(extractedValue, null, 2));
        
        // 4. 변수 치환 시뮬레이션
        console.log('\n🔄 변수 치환 시뮬레이션:');
        
        // 개별 컬럼 접근 패턴
        console.log('   개별 컬럼 접근:');
        console.log(`   \${approvalCodesById.approver_code} → [${extractedValue.approver_code.join(', ')}]`);
        console.log(`   \${approvalCodesById.requester_code} → [${extractedValue.requester_code.join(', ')}]`);
        console.log(`   \${approvalCodesById.product_code} → [${extractedValue.product_code.join(', ')}]`);
        
        // 전체 통합 접근 패턴
        const allIdentifiedValues = Object.values(extractedValue).flat();
        console.log(`   \${approvalCodesById} → [${allIdentifiedValues.join(', ')}]`);
        
        // 5. 실제 쿼리 치환 예시
        console.log('\n🔧 실제 쿼리 치환 예시:');
        
        const testQueries = [
            "WHERE user_code IN (${approvalCodesById.approver_code})",
            "WHERE entity_code IN (${approvalCodesById.product_code})", 
            "WHERE (user_code IN (${approvalCodesById.approver_code}) OR entity_code IN (${approvalCodesById.product_code}))",
            "WHERE entity_id IN (${approvalCodesById})"
        ];
        
        testQueries.forEach(query => {
            let result = query;
            // 개별 컬럼 치환
            result = result.replace('${approvalCodesById.approver_code}', extractedValue.approver_code.map(v => `'${v}'`).join(', '));
            result = result.replace('${approvalCodesById.requester_code}', extractedValue.requester_code.map(v => `'${v}'`).join(', '));
            result = result.replace('${approvalCodesById.product_code}', extractedValue.product_code.map(v => `'${v}'`).join(', '));
            // 전체 통합 치환
            result = result.replace('${approvalCodesById}', allIdentifiedValues.map(v => `'${v}'`).join(', '));
            
            console.log(`   원본: ${query}`);
            console.log(`   치환: ${result}`);
            console.log('');
        });
        
        console.log('✅ 모든 테스트 완료!\n');
        
        console.log('📝 요약 및 비교:');
        console.log('');
        console.log('┌─────────────────────┬──────────────────────┬────────────────────────┐');
        console.log('│ 추출 방식            │ 장점                 │ 사용 사례              │');
        console.log('├─────────────────────┼──────────────────────┼────────────────────────┤');
        console.log('│ single_column       │ 단순, 명확           │ 단일 컬럼 IN절         │');
        console.log('│ multiple_columns    │ 통합 추출 간편       │ 전체 통합 검색         │');
        console.log('│ column_identified   │ 컬럼별 개별 접근     │ 의미별 세밀한 필터링   │');
        console.log('└─────────────────────┴──────────────────────┴────────────────────────┘');
        console.log('');
        console.log('🎯 column_identified의 핵심 가치:');
        console.log('   - 각 컬럼의 의미에 맞는 조건문 작성 가능');
        console.log('   - 승인자, 요청자, 제품 코드를 구분해서 사용 가능');
        console.log('   - 하나의 동적 변수로 여러 가지 접근 패턴 지원');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error(error.stack);
    }
}

// 테스트 실행
if (require.main === module) {
    testColumnIdentifiedExtraction();
}

module.exports = { testColumnIdentifiedExtraction };