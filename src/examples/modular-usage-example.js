/**
 * 모듈화된 MSSQL Data Migrator 사용 예제
 */

const path = require('path');
const MSSQLDataMigrator = require('../mssql-data-migrator-refactored');

// 개별 모듈 사용 예제
const {
    DatabaseConfigManager,
    ConfigParser,
    VariableManager,
    QueryExecutor,
    ScriptProcessor
} = require('../modules');

/**
 * 기본 사용법 - 전체 마이그레이션 실행
 */
async function basicUsageExample() {
    console.log('=== 기본 사용법 예제 ===');
    
    const queryFilePath = path.join(__dirname, '../../config/sample-migration.xml');
    const migrator = new MSSQLDataMigrator(queryFilePath, false); // dryRun = false
    
    try {
        // 초기화
        const initialized = await migrator.initialize();
        if (!initialized) {
            throw new Error('초기화 실패');
        }
        
        // 설정 검증
        const validation = migrator.validateConfig();
        if (!validation.isValid) {
            console.error('설정 검증 실패:', validation.issues);
            return;
        }
        
        // 마이그레이션 실행
        const result = await migrator.execute();
        
        console.log('마이그레이션 결과:', {
            success: result.success,
            executedQueries: result.executedQueries,
            totalSourceRows: result.statistics.totalSourceRows,
            totalInsertedRows: result.statistics.totalInsertedRows,
            executionTime: `${result.totalExecutionTime}ms`
        });
        
    } catch (error) {
        console.error('마이그레이션 실행 실패:', error);
    } finally {
        await migrator.cleanup();
    }
}

/**
 * DRY RUN 모드 사용법
 */
async function dryRunExample() {
    console.log('=== DRY RUN 모드 예제 ===');
    
    const queryFilePath = path.join(__dirname, '../../config/sample-migration.xml');
    const migrator = new MSSQLDataMigrator(queryFilePath, true); // dryRun = true
    
    try {
        await migrator.initialize();
        
        const result = await migrator.execute();
        
        console.log('DRY RUN 결과:', {
            success: result.success,
            queriesAnalyzed: result.totalQueries,
            estimatedSourceRows: result.statistics.totalSourceRows
        });
        
    } catch (error) {
        console.error('DRY RUN 실행 실패:', error);
    } finally {
        await migrator.cleanup();
    }
}

/**
 * 개별 모듈 사용 예제
 */
async function individualModuleExample() {
    console.log('=== 개별 모듈 사용 예제 ===');
    
    try {
        // 1. 데이터베이스 설정 관리자
        const dbConfigManager = new DatabaseConfigManager();
        await dbConfigManager.loadDbInfo();
        
        const availableDbs = dbConfigManager.getAvailableDbs();
        console.log('사용 가능한 DB:', availableDbs.map(db => db.id));
        
        // 2. 설정 파서
        const configParser = new ConfigParser();
        const queryFilePath = path.join(__dirname, '../../config/sample-migration.xml');
        
        if (require('fs').existsSync(queryFilePath)) {
            const config = await configParser.loadConfig(queryFilePath);
            console.log('로드된 쿼리 수:', config.queries?.length || 0);
        }
        
        // 3. 변수 관리자
        const variableManager = new VariableManager();
        variableManager.setVariables({
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            batchSize: 1000
        });
        
        const testString = 'SELECT * FROM table WHERE date >= ${startDate} AND date <= ${endDate}';
        const processedString = variableManager.replaceVariables(testString);
        console.log('변수 치환 결과:', processedString);
        
        // 4. 변수 의존성 검증
        const validation = variableManager.validateVariableDependencies(testString);
        console.log('변수 검증 결과:', validation.isValid ? '통과' : '실패');
        
    } catch (error) {
        console.error('개별 모듈 사용 실패:', error);
    }
}

/**
 * 데이터베이스 연결 테스트 예제
 */
async function connectionTestExample() {
    console.log('=== 데이터베이스 연결 테스트 예제 ===');
    
    const migrator = new MSSQLDataMigrator(null); // 쿼리 파일 없이 생성
    
    try {
        await migrator.initialize();
        
        const databases = await migrator.listDatabases();
        
        for (const db of databases) {
            console.log(`${db.id} 연결 테스트 중...`);
            const testResult = await migrator.testConnection(db.id);
            
            console.log(`${db.id}: ${testResult.success ? '성공' : '실패'}`);
            if (!testResult.success) {
                console.log(`  오류: ${testResult.error}`);
            }
        }
        
    } catch (error) {
        console.error('연결 테스트 실패:', error);
    } finally {
        await migrator.cleanup();
    }
}

/**
 * 진행 상황 모니터링 예제
 */
async function progressMonitoringExample() {
    console.log('=== 진행 상황 모니터링 예제 ===');
    
    const queryFilePath = path.join(__dirname, '../../config/sample-migration.xml');
    const migrator = new MSSQLDataMigrator(queryFilePath, false);
    
    try {
        await migrator.initialize();
        
        // 진행 상황 모니터링을 위한 인터벌 설정
        const progressInterval = setInterval(() => {
            const progress = migrator.getProgress();
            const currentQuery = migrator.getCurrentQuery();
            
            if (progress) {
                console.log(`진행률: ${progress.percentage}% (${progress.completedQueries}/${progress.totalQueries})`);
                
                if (currentQuery) {
                    console.log(`현재 실행 중: ${currentQuery.id}`);
                }
            }
        }, 1000);
        
        // 마이그레이션 실행
        const result = await migrator.execute();
        
        clearInterval(progressInterval);
        
        console.log('최종 결과:', {
            success: result.success,
            executionTime: `${result.totalExecutionTime}ms`
        });
        
    } catch (error) {
        console.error('진행 상황 모니터링 실패:', error);
    } finally {
        await migrator.cleanup();
    }
}

/**
 * 모든 예제 실행
 */
async function runAllExamples() {
    console.log('MSSQL Data Migrator 모듈화 예제 시작\n');
    
    try {
        await basicUsageExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        await dryRunExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        await individualModuleExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        await connectionTestExample();
        console.log('\n' + '='.repeat(50) + '\n');
        
        // 진행 상황 모니터링은 실제 마이그레이션이 있을 때만 의미가 있으므로 주석 처리
        // await progressMonitoringExample();
        
    } catch (error) {
        console.error('예제 실행 중 오류:', error);
    }
    
    console.log('\n모든 예제 실행 완료');
}

// 스크립트가 직접 실행될 때만 예제 실행
if (require.main === module) {
    runAllExamples();
}

module.exports = {
    basicUsageExample,
    dryRunExample,
    individualModuleExample,
    connectionTestExample,
    progressMonitoringExample,
    runAllExamples
};
