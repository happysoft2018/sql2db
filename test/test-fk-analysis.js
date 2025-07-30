const MSSQLConnectionManager = require('../src/mssql-connection-manager');
require('dotenv').config();

// FK 관계 분석 테스트
async function testForeignKeyAnalysis() {
    console.log('🔍 FK 참조 관계 분석 테스트 시작\n');
    
    const connectionManager = new MSSQLConnectionManager();
    
    try {
        console.log('1. 데이터베이스 연결 테스트...');
        
        // 대상 데이터베이스 연결 (FK 관계 분석용)
        await connectionManager.connectTarget();
        console.log('✅ 대상 데이터베이스 연결 성공\n');
        
        console.log('2. FK 참조 관계 조회 중...');
        const fkRelations = await connectionManager.getForeignKeyRelations(false);
        
        if (fkRelations.length === 0) {
            console.log('❌ FK 관계가 발견되지 않았습니다.');
            console.log('테스트용 FK 관계를 생성하거나 다른 데이터베이스를 사용해주세요.\n');
        } else {
            console.log(`✅ ${fkRelations.length}개의 FK 관계 발견\n`);
            
            console.log('📋 발견된 FK 관계들:');
            console.log('=' .repeat(80));
            fkRelations.forEach((rel, index) => {
                console.log(`${index + 1}. ${rel.parentTable}.${rel.parentColumn} → ${rel.referencedTable}.${rel.referencedColumn}`);
                console.log(`   FK 이름: ${rel.foreignKeyName}`);
                console.log(`   삭제 규칙: ${rel.deleteAction}`);
                console.log(`   업데이트 규칙: ${rel.updateAction}\n`);
            });
        }
        
        console.log('3. 테이블 삭제 순서 계산 테스트...');
        
        // 테스트용 테이블 목록 (실제 존재하는 테이블들로 구성)
        const testTables = [...new Set([
            ...fkRelations.map(rel => rel.parentTable),
            ...fkRelations.map(rel => rel.referencedTable)
        ])];
        
        if (testTables.length === 0) {
            // FK 관계가 없는 경우 일반적인 테이블 이름들로 테스트
            testTables.push('users', 'orders', 'order_items', 'products', 'categories');
            console.log('FK 관계가 없으므로 가상 테이블로 테스트합니다.');
        }
        
        console.log(`테스트 대상 테이블: ${testTables.join(', ')}\n`);
        
        const deletionOrder = await connectionManager.calculateTableDeletionOrder(testTables, false);
        
        console.log('📊 계산 결과:');
        console.log('=' .repeat(50));
        console.log(`삭제 순서: ${deletionOrder.order.join(' → ')}`);
        console.log(`순환 참조 여부: ${deletionOrder.hasCircularReference ? 'Yes' : 'No'}`);
        
        if (deletionOrder.hasCircularReference) {
            console.log(`순환 참조 테이블: ${deletionOrder.circularTables.join(', ')}`);
        }
        
        console.log(`관련 FK 관계 수: ${deletionOrder.fkRelations.length}`);
        
        console.log('\n4. FK 제약 조건 토글 테스트...');
        
        // FK 제약 조건 비활성화 테스트 (실제로는 실행하지 않음)
        console.log('⚠️ FK 제약 조건 토글은 데이터베이스에 영향을 주므로 실제 실행하지 않습니다.');
        console.log('실제 환경에서는 다음과 같이 사용합니다:');
        console.log('  await connectionManager.toggleForeignKeyConstraints(false, false); // 비활성화');
        console.log('  await connectionManager.toggleForeignKeyConstraints(true, false);  // 활성화');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
        console.error('스택 트레이스:', error.stack);
    } finally {
        await connectionManager.closeConnections();
        console.log('\n✅ 연결 종료 완료');
    }
}

// 토폴로지 정렬 알고리즘 단위 테스트
function testTopologicalSort() {
    console.log('\n🧮 토폴로지 정렬 알고리즘 단위 테스트');
    console.log('=' .repeat(50));
    
    // 테스트 케이스 1: 단순한 의존성 체인
    console.log('\n테스트 케이스 1: 단순한 의존성 체인');
    console.log('categories ← products ← order_items ← orders ← users');
    
    const testCase1 = {
        tables: ['users', 'orders', 'order_items', 'products', 'categories'],
        relations: [
            { parentTable: 'orders', referencedTable: 'users' },
            { parentTable: 'order_items', referencedTable: 'orders' },
            { parentTable: 'order_items', referencedTable: 'products' },
            { parentTable: 'products', referencedTable: 'categories' }
        ]
    };
    
    const result1 = simulateTopologicalSort(testCase1.tables, testCase1.relations);
    console.log(`예상 순서: order_items → orders → products → users → categories`);
    console.log(`계산 결과: ${result1.join(' → ')}`);
    
    // 테스트 케이스 2: 순환 참조
    console.log('\n테스트 케이스 2: 순환 참조');
    console.log('A → B → C → A (순환)');
    
    const testCase2 = {
        tables: ['A', 'B', 'C'],
        relations: [
            { parentTable: 'A', referencedTable: 'B' },
            { parentTable: 'B', referencedTable: 'C' },
            { parentTable: 'C', referencedTable: 'A' }
        ]
    };
    
    const result2 = simulateTopologicalSort(testCase2.tables, testCase2.relations);
    console.log(`예상 결과: 순환 참조 감지`);
    console.log(`계산 결과: ${result2.length === testCase2.tables.length ? '정상 처리' : '순환 참조 감지'}`);
}

// 토폴로지 정렬 시뮬레이션 함수
function simulateTopologicalSort(tableNames, relations) {
    const dependencies = new Map();
    const inDegree = new Map();
    
    // 초기화
    tableNames.forEach(table => {
        dependencies.set(table, []);
        inDegree.set(table, 0);
    });
    
    // 의존성 그래프 구성
    relations.forEach(rel => {
        dependencies.get(rel.referencedTable).push(rel.parentTable);
        inDegree.set(rel.parentTable, inDegree.get(rel.parentTable) + 1);
    });
    
    // 토폴로지 정렬
    const result = [];
    const queue = [];
    
    inDegree.forEach((degree, table) => {
        if (degree === 0) {
            queue.push(table);
        }
    });
    
    while (queue.length > 0) {
        const currentTable = queue.shift();
        result.push(currentTable);
        
        dependencies.get(currentTable).forEach(dependentTable => {
            inDegree.set(dependentTable, inDegree.get(dependentTable) - 1);
            if (inDegree.get(dependentTable) === 0) {
                queue.push(dependentTable);
            }
        });
    }
    
    return result;
}

// FK 관계 시각화
function visualizeForeignKeyRelations(relations) {
    console.log('\n📊 FK 관계 시각화');
    console.log('=' .repeat(50));
    
    if (relations.length === 0) {
        console.log('표시할 FK 관계가 없습니다.');
        return;
    }
    
    const tables = new Set();
    relations.forEach(rel => {
        tables.add(rel.parentTable);
        tables.add(rel.referencedTable);
    });
    
    console.log(`테이블 수: ${tables.size}`);
    console.log(`FK 관계 수: ${relations.length}\n`);
    
    // 테이블별 참조 관계 표시
    Array.from(tables).sort().forEach(table => {
        const outgoing = relations.filter(rel => rel.parentTable === table);
        const incoming = relations.filter(rel => rel.referencedTable === table);
        
        console.log(`📋 ${table}:`);
        if (outgoing.length > 0) {
            console.log(`  참조하는 테이블: ${outgoing.map(rel => rel.referencedTable).join(', ')}`);
        }
        if (incoming.length > 0) {
            console.log(`  참조되는 테이블: ${incoming.map(rel => rel.parentTable).join(', ')}`);
        }
        if (outgoing.length === 0 && incoming.length === 0) {
            console.log(`  독립적인 테이블 (FK 관계 없음)`);
        }
        console.log();
    });
}

// 실행
if (require.main === module) {
    testForeignKeyAnalysis()
        .then(() => testTopologicalSort())
        .catch(console.error);
}

module.exports = { testForeignKeyAnalysis, testTopologicalSort, visualizeForeignKeyRelations }; 