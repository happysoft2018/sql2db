const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// pkg 실행 파일 경로 처리
const APP_ROOT = process.pkg ? path.dirname(process.execPath) : __dirname;

// pkg 환경에서는 migrate-cli.js를 직접 require
const MSSQLDataMigrator = process.pkg ? require('./src/mssql-data-migrator-modular') : null;

// ANSI 색상 코드
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// 간단한 CLI 인수 파서 및 언어 설정
function parseArgs(argv) {
    const out = {};
    for (const a of argv.slice(2)) {
        if (!a.startsWith('--')) continue;
        const i = a.indexOf('=');
        if (i === -1) {
            out[a.slice(2)] = true;
        } else {
            out[a.slice(2, i)] = a.slice(i + 1);
        }
    }
    return out;
}
const ARGS = parseArgs(process.argv);
if (ARGS.lang) process.env.LANGUAGE = ARGS.lang;

// 언어 설정 (환경 변수 사용, 기본값 영어)
const LANGUAGE = process.env.LANGUAGE || 'en';

// 다국어 메시지
const messages = {
    en: {
        title: 'MSSQL Data Migration Tool',
        menuTitle: 'Menu Selection',
        menu1: '1. Validate Query Definition File',
        menu2: '2. Test Database Connection',
        menu3: '3. Execute Data Migration',
        menu4: '4. Check Migration Progress',
        menu5: '5. Show Help',
        menu0: '0. Exit',
        selectPrompt: 'Please select (0-5): ',
        invalidSelection: 'Invalid selection. Please try again.',
        
        // File selection
        selectFile: 'Select Query Definition File',
        availableFiles: 'Available query definition files:',
        selectFilePrompt: 'Select file number',
        noFilesFound: '(No query definition files found)',
        fileNotEntered: 'File number not entered.',
        invalidFileNumber: 'Invalid file number. Please enter a number between',
        selectedFile: 'Selected file:',
        
        // Validate
        validateTitle: 'Validate Query Definition File',
        validating: 'Validating query definition file...',
        validationCompleted: '✅ Query definition file validation completed.',
        validationFailed: '❌ Query definition file has errors.',
        
        // Test connection
        testConnectionTitle: 'Database Connection Test',
        testingConnection: 'Testing database connections...',
        connectionSuccess: '✅ Database connection test successful.',
        connectionFailed: '❌ Database connection failed.',
        checkConfig: 'Please check connection information in config/dbinfo.json.',
        
        // Migration
        migrationTitle: 'Execute Data Migration',
        confirmMigration: 'Are you sure you want to execute data migration? (Y/N): ',
        migrationCancelled: 'Migration cancelled.',
        startingMigration: 'Starting data migration...',
        migrationSuccess: '✅ Data migration completed successfully!',
        migrationFailed: '❌ Error occurred during data migration.',
        executionTime: 'Execution time:',
        
        // Progress
        progressTitle: 'Migration Progress',
        noProgressFiles: 'No migration progress files found.',
        progressListHeaderRecent: 'Migration History (Recent 3):',
        progressListHeaderAll: 'Migration History (All):',
        selectMigration: "Enter number to view details, 'A' for all, or '0' to go back: ",
        invalidNumber: 'Invalid number.',
        invalidInput: 'Invalid input.',
        progressDetails: 'Migration Details',
        detailMigrationId: 'Migration ID:',
        detailStatus: 'Status:',
        detailStartTime: 'Start Time:',
        detailEndTime: 'End Time:',
        detailDuration: 'Duration:',
        detailTotalQueries: 'Total Queries:',
        detailCompletedQueries: 'Completed Queries:',
        detailFailedQueries: 'Failed Queries:',
        detailTotalRows: 'Total Rows:',
        detailProcessedRows: 'Processed Rows:',
        detailCurrentPhase: 'Current Phase:',
        detailQueryList: 'Query Status:',
        detailErrors: 'Errors:',
        detailNoErrors: 'No errors',
        
        // Help
        helpTitle: 'Help',
        additionalInfo: 'Additional Information:',
        helpQueryFiles: '- Query Definition Files: Create XML or JSON files in queries/ folder',
        helpDbConfig: '- Database Configuration: Configure in config/dbinfo.json',
        helpProgress: '- Check Progress: Use menu option 4',
        helpLogs: '- Detailed Logs: Check logs/ folder',
        
        // Common
        pressEnter: 'Press Enter to continue...',
        exiting: 'Exiting MSSQL Data Migration Tool.',
        starting: 'Starting MSSQL Data Migration Tool...',
        interrupted: 'Program interrupted by user.',
        errorOccurred: 'Error occurred:',
        nodeVersionError: 'Node.js 14.0 or higher is required.',
        currentVersion: 'Current version:',
        installNodeJs: 'Please install the latest version from https://nodejs.org'
    },
    kr: {
        title: 'MSSQL 데이터 이관 도구',
        menuTitle: '메뉴 선택',
        menu1: '1. 쿼리문정의 파일 Syntax검증',
        menu2: '2. DB연결 테스트 (연결 가능 여부 포함)',
        menu3: '3. 데이터 이관 실행',
        menu4: '4. 이관 진행 상황 조회',
        menu5: '5. 도움말 보기',
        menu0: '0. 종료',
        selectPrompt: '선택하세요 (0-5): ',
        invalidSelection: '잘못된 선택입니다. 다시 선택해주세요.',
        
        // File selection
        selectFile: '쿼리문정의 파일 선택',
        availableFiles: '사용 가능한 쿼리문정의 파일들:',
        selectFilePrompt: '파일 번호를 선택하세요',
        noFilesFound: '(쿼리문정의 파일을 찾을 수 없습니다)',
        fileNotEntered: '파일 번호가 입력되지 않았습니다.',
        invalidFileNumber: '잘못된 파일 번호입니다. 다음 범위의 숫자를 입력하세요',
        selectedFile: '선택된 파일:',
        
        // Validate
        validateTitle: '쿼리문정의 파일 검증',
        validating: '쿼리문정의 파일을 검증하고 있습니다...',
        validationCompleted: '✅ 쿼리문정의 파일 검증이 완료되었습니다.',
        validationFailed: '❌ 쿼리문정의 파일에 오류가 있습니다.',
        
        // Test connection
        testConnectionTitle: '데이터베이스 연결 테스트',
        testingConnection: '데이터베이스 연결을 테스트하고 있습니다...',
        connectionSuccess: '✅ 데이터베이스 연결 테스트가 성공했습니다.',
        connectionFailed: '❌ 데이터베이스 연결에 실패했습니다.',
        checkConfig: 'config/dbinfo.json 파일의 연결 정보를 확인해주세요.',
        
        // Migration
        migrationTitle: '데이터 이관 실행',
        confirmMigration: '정말로 데이터 이관을 실행하시겠습니까? (Y/N): ',
        migrationCancelled: '이관이 취소되었습니다.',
        startingMigration: '데이터 이관을 시작합니다...',
        migrationSuccess: '✅ 데이터 이관이 성공적으로 완료되었습니다!',
        migrationFailed: '❌ 데이터 이관 중 오류가 발생했습니다.',
        executionTime: '실행 시간:',
        
        // Progress
        progressTitle: '이관 진행 상황',
        noProgressFiles: '진행 상황 파일이 없습니다.',
        progressListHeaderRecent: '이관 작업 이력 (최근 3개):',
        progressListHeaderAll: '이관 작업 이력 (전체):',
        selectMigration: "상세 정보를 볼 번호를 입력하세요 ('A': 전체보기, '0': 뒤로가기): ",
        invalidNumber: '잘못된 번호입니다.',
        invalidInput: '잘못된 입력입니다.',
        progressDetails: '이관 상세 정보',
        detailMigrationId: 'Migration ID:',
        detailStatus: '상태:',
        detailStartTime: '시작 시간:',
        detailEndTime: '종료 시간:',
        detailDuration: '소요 시간:',
        detailTotalQueries: '전체 쿼리:',
        detailCompletedQueries: '완료된 쿼리:',
        detailFailedQueries: '실패한 쿼리:',
        detailTotalRows: '전체 행 수:',
        detailProcessedRows: '처리된 행 수:',
        detailCurrentPhase: '현재 단계:',
        detailQueryList: '쿼리 상태:',
        detailErrors: '오류:',
        detailNoErrors: '오류 없음',
        
        // Help
        helpTitle: '도움말',
        additionalInfo: '추가 정보:',
        helpQueryFiles: '- 쿼리문정의 파일: queries/ 폴더에 XML 또는 JSON 형식으로 작성',
        helpDbConfig: '- DB 연결 설정: config/dbinfo.json 파일에서 설정',
        helpProgress: '- 진행 상황 확인: 메뉴 4번 이용',
        helpLogs: '- 상세 로그: logs/ 폴더 확인',
        
        // Common
        pressEnter: 'Enter를 눌러 계속...',
        exiting: 'MSSQL 데이터 이관 도구를 종료합니다.',
        starting: 'MSSQL 데이터 이관 도구를 시작합니다...',
        interrupted: '프로그램이 사용자에 의해 중단되었습니다.',
        errorOccurred: '오류 발생:',
        nodeVersionError: 'Node.js 14.0 이상이 필요합니다.',
        currentVersion: '현재 버전:',
        installNodeJs: 'https://nodejs.org 에서 최신 버전을 설치해주세요.'
    }
};

/**
 * 비대화형 CLI 실행 경로 처리
 */
async function maybeRunFromCliArgs() {
    const mode = ARGS.mode; // validate | test | migrate | progress | help
    if (!mode && !ARGS.help) return false;

    // 제목 출력
    clearScreen();
    showTitle();

    try {
        if (ARGS.help || mode === 'help') {
            if (!process.pkg) {
                try {
                    execSync('node src/migrate-cli.js help', { stdio: 'inherit', cwd: APP_ROOT });
                } catch (_) {}
            }
            console.log();
            console.log('Examples:');
            console.log('  node app.js --lang=kr --mode=validate --query=queries/sample.xml');
            console.log('  node app.js --lang=kr --mode=test');
            console.log('  node app.js --lang=kr --mode=migrate --query=queries/sample.xml');
            return true;
        }

        switch (mode) {
            case 'validate': {
                const query = ARGS.query || ARGS.file;
                if (!query) {
                    console.error('❌ Missing --query path');
                    return true;
                }
                const queryPath = path.isAbsolute(query) ? query : path.join(APP_ROOT, query);
                if (process.pkg) {
                    const migrator = new MSSQLDataMigrator(queryPath);
                    const ok = await migrator.validateConfiguration();
                    console.log(ok ? msg.validationCompleted : msg.validationFailed);
                } else {
                    execSync(`node src/migrate-cli.js validate --query "${queryPath}"`, { stdio: 'inherit', cwd: APP_ROOT });
                }
                return true;
            }
            case 'test': {
                if (process.pkg) {
                    const ConfigManager = require('./src/modules/config-manager');
                    const configManager = new ConfigManager();
                    await configManager.loadDbInfo();
                    const dbInfo = configManager.getDbInfo();
                    if (!dbInfo || Object.keys(dbInfo).length === 0) {
                        console.log(msg.connectionFailed);
                        console.log(msg.checkConfig);
                    } else {
                        console.log('Available databases:');
                        for (const [dbId, dbConfig] of Object.entries(dbInfo)) {
                            console.log(`${dbId}: ${dbConfig.server}/${dbConfig.database}`);
                        }
                        console.log(msg.connectionSuccess);
                    }
                } else {
                    execSync('node src/migrate-cli.js list-dbs', { stdio: 'inherit', cwd: APP_ROOT });
                }
                return true;
            }
            case 'migrate': {
                const query = ARGS.query || ARGS.file;
                if (!query) {
                    console.error('❌ Missing --query path');
                    return true;
                }
                const queryPath = path.isAbsolute(query) ? query : path.join(APP_ROOT, query);
                if (process.pkg) {
                    const migrator = new MSSQLDataMigrator(queryPath);
                    const result = await migrator.executeMigration();
                    console.log(result && result.success ? msg.migrationSuccess : msg.migrationFailed);
                } else {
                    execSync(`node src/migrate-cli.js migrate --query "${queryPath}"`, { stdio: 'inherit', cwd: APP_ROOT });
                }
                return true;
            }
            default: {
                console.error(`❌ Unknown mode: ${mode}`);
                console.log('Use --help to see usage.');
                return true;
            }
        }
    } catch (error) {
        console.error(msg.errorOccurred, error.message || error);
        return true;
    }
}

// 현재 언어의 메시지 가져오기
const msg = messages[LANGUAGE] || messages.en;

// 콘솔 인터페이스 생성
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * 프롬프트 함수
 */
function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * 화면 지우기
 */
function clearScreen() {
    console.clear();
}

/**
 * Get application version
 */
function getAppVersion() {
    // 1) Build-time/runtime injected env (release.bat or CI can set this)
    if (process.env.PKG_VERSION && process.env.PKG_VERSION.trim()) {
        return process.env.PKG_VERSION.trim();
    }

    // 2) Bundled package.json via pkg snapshot (require works if referenced)
    try {
        // This require ensures pkg includes package.json in the snapshot
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const bundledPkg = require('./package.json');
        if (bundledPkg && bundledPkg.version) return bundledPkg.version;
    } catch (_) { /* ignore */ }

    // 3) Filesystem package.json next to executable (dev or release folder)
    try {
        const pkgPath = path.join(APP_ROOT, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg && pkg.version) return pkg.version;
        }
    } catch (_) { /* ignore */ }

    // 4) npm-provided env in dev
    if (process.env.npm_package_version) return process.env.npm_package_version;

    // 5) Fallback
    return '0.0.0';
}

/**
 * Show title
 */
function showTitle() {
    console.log(colors.cyan + colors.bright);
    console.log('=========================================');
    const version = getAppVersion();
    console.log(`  ${msg.title} v${version}`);
    console.log('=========================================');
    console.log(colors.reset);
}

/**
 * Show menu
 */
function showMenu() {
    console.log(colors.yellow);
    console.log('=========================================');
    console.log(`  ${msg.menuTitle}`);
    console.log('=========================================');
    console.log(colors.reset);
    console.log(msg.menu1);
    console.log(msg.menu2);
    console.log(msg.menu3);
    console.log(msg.menu4);
    console.log(msg.menu5);
    console.log(msg.menu0);
    console.log(colors.yellow + '=========================================' + colors.reset);
    console.log();
}

/**
 * Get query files from queries folder
 */
function getQueryFiles() {
    const queriesDir = path.join(APP_ROOT, 'queries');
    const files = [];
    
    try {
        if (!fs.existsSync(queriesDir)) {
            console.error(colors.red + `Queries directory not found: ${queriesDir}` + colors.reset);
            return files;
        }
        
        const allFiles = fs.readdirSync(queriesDir);
        
        // XML files
        allFiles.filter(f => f.endsWith('.xml')).forEach(f => {
            files.push({
                path: path.join(queriesDir, f),
                name: f,
                type: 'XML'
            });
        });
        
        // JSON files
        allFiles.filter(f => f.endsWith('.json')).forEach(f => {
            files.push({
                path: path.join(queriesDir, f),
                name: f,
                type: 'JSON'
            });
        });
        
        return files;
    } catch (error) {
        console.error(colors.red + `Failed to get file list: ${error.message}` + colors.reset);
        return files;
    }
}

/**
 * Display file selection menu and get selection
 */
async function selectQueryFile(title = null) {
    const displayTitle = title || msg.selectFile;
    
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + `  ${displayTitle}` + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    
    const files = getQueryFiles();
    
    if (files.length === 0) {
        console.log(colors.red + `  ${msg.noFilesFound}` + colors.reset);
        console.log();
        await prompt(msg.pressEnter);
        return null;
    }
    
    console.log(msg.availableFiles);
    console.log();
    
    files.forEach((file, index) => {
        const typeColor = file.type === 'XML' ? colors.blue : colors.green;
        console.log(`  ${colors.bright}${index + 1}.${colors.reset} ${file.name}`);
    });
    
    console.log();
    
    while (true) {
        const answer = await prompt(`${msg.selectFilePrompt} (1-${files.length}): `);
        
        if (answer === '') {
            console.log(colors.red + msg.fileNotEntered + colors.reset);
            console.log();
            continue;
        }
        
        const num = parseInt(answer);
        
        if (isNaN(num) || num < 1 || num > files.length) {
            console.log(colors.red + `${msg.invalidFileNumber} 1-${files.length}.` + colors.reset);
            console.log();
            continue;
        }
        
        const selectedFile = files[num - 1];
        console.log();
        console.log(colors.green + `${msg.selectedFile} ${selectedFile.path}` + colors.reset);
        console.log();
        
        return selectedFile.path;
    }
}

/**
 * 1. Validate query definition file
 */
async function validateQueryFile() {
    const filePath = await selectQueryFile(msg.validateTitle);
    
    if (!filePath) {
        return;
    }
    
    console.log(msg.validating);
    console.log();
    
    try {
        if (process.pkg) {
            // pkg 환경: 직접 모듈 사용
            const migrator = new MSSQLDataMigrator(filePath);
            const isValid = await migrator.validateConfiguration();
            
            if (isValid) {
                console.log();
                console.log(colors.green + msg.validationCompleted + colors.reset);
            } else {
                console.log();
                console.log(colors.red + msg.validationFailed + colors.reset);
            }
        } else {
            // Node.js 환경: CLI 실행
            execSync(`node src/migrate-cli.js validate --query "${filePath}"`, {
                stdio: 'inherit',
                cwd: APP_ROOT
            });
            
            console.log();
            console.log(colors.green + msg.validationCompleted + colors.reset);
        }
    } catch (error) {
        console.log();
        console.log(colors.red + msg.validationFailed + colors.reset);
    }
    
    console.log();
    await prompt(msg.pressEnter);
}

/**
 * 2. Test database connection
 */
async function testDatabaseConnection() {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + `  ${msg.testConnectionTitle}` + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    console.log(msg.testingConnection);
    console.log();
    
    try {
        if (process.pkg) {
            // pkg 환경: 직접 모듈 사용
            const ConfigManager = require('./src/modules/config-manager');
            const configManager = new ConfigManager();
            await configManager.loadDbInfo();
            
            const dbInfo = configManager.getDbInfo();
            if (!dbInfo || Object.keys(dbInfo).length === 0) {
                console.log(colors.red + msg.connectionFailed + colors.reset);
                console.log(colors.yellow + msg.checkConfig + colors.reset);
            } else {
                console.log('Available databases:');
                console.log();
                for (const [dbId, dbConfig] of Object.entries(dbInfo)) {
                    console.log(`${colors.cyan}${dbId}${colors.reset}: ${dbConfig.server}/${dbConfig.database}`);
                    console.log(`  - ${dbConfig.description || 'No description'}`);
                    console.log(`  - Writable: ${dbConfig.isWritable ? colors.green + 'Yes' : colors.yellow + 'No'}${colors.reset}`);
                    console.log();
                }
                console.log();
                console.log(colors.green + msg.connectionSuccess + colors.reset);
            }
        } else {
            // Node.js 환경: CLI 실행
            execSync('node src/migrate-cli.js list-dbs', {
                stdio: 'inherit',
                cwd: APP_ROOT
            });
            
            console.log();
            console.log(colors.green + msg.connectionSuccess + colors.reset);
        }
    } catch (error) {
        console.log();
        console.log(colors.red + msg.connectionFailed + colors.reset);
        console.log(colors.yellow + msg.checkConfig + colors.reset);
    }
    
    console.log();
    await prompt(msg.pressEnter);
}

/**
 * 3. Execute data migration
 */
async function executeMigration() {
    const filePath = await selectQueryFile(msg.migrationTitle);
    
    if (!filePath) {
        return;
    }
    
    // Confirmation
    const confirm = await prompt(colors.yellow + msg.confirmMigration + colors.reset);
    
    if (confirm.toUpperCase() !== 'Y') {
        console.log(colors.yellow + msg.migrationCancelled + colors.reset);
        console.log();
        await prompt(msg.pressEnter);
        return;
    }
    
    console.log();
    console.log(msg.startingMigration);
    console.log();
    
    const startTime = new Date();
    
    try {
        if (process.pkg) {
            // pkg 환경: 직접 모듈 사용
            const migrator = new MSSQLDataMigrator(filePath);
            const result = await migrator.executeMigration();
            
            const endTime = new Date();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            if (result.success) {
                console.log();
                console.log(colors.green + msg.migrationSuccess + colors.reset);
                console.log(colors.dim + `${msg.executionTime} ${duration}s` + colors.reset);
                if (result.migrationId) {
                    console.log(`📊 Migration ID: ${result.migrationId}`);
                }
            } else {
                console.log();
                console.log(colors.red + msg.migrationFailed + colors.reset);
                if (result.migrationId) {
                    console.log(`📊 Migration ID: ${result.migrationId}`);
                }
            }
        } else {
            // Node.js 환경: CLI 실행
            execSync(`node src/migrate-cli.js migrate --query "${filePath}"`, {
                stdio: 'inherit',
                cwd: APP_ROOT
            });
            
            const endTime = new Date();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log();
            console.log(colors.green + msg.migrationSuccess + colors.reset);
            console.log(colors.dim + `${msg.executionTime} ${duration}s` + colors.reset);
        }
    } catch (error) {
        console.log();
        console.log(colors.red + msg.migrationFailed + colors.reset);
        if (error.message) {
            console.log(colors.yellow + error.message + colors.reset);
        }
    }
    
    console.log();
    await prompt(msg.pressEnter);
}

/**
 * 4. Check migration progress
 */
async function checkProgress() {
    let showAll = false;
    
    while (true) {
        console.log();
        console.log(colors.cyan + '=========================================' + colors.reset);
        console.log(colors.bright + `  ${msg.progressTitle}` + colors.reset);
        console.log(colors.cyan + '=========================================' + colors.reset);
        console.log();
        
        try {
            const ProgressManager = require('./src/progress-manager');
            const allProgressFiles = ProgressManager.listProgressFiles();
            
            if (allProgressFiles.length === 0) {
                console.log(colors.yellow + msg.noProgressFiles + colors.reset);
                console.log();
                await prompt(msg.pressEnter);
                return;
            }
            
            // 최근 3개 또는 전체 표시
            const progressFiles = showAll ? allProgressFiles : allProgressFiles.slice(0, 3);
            
            console.log(showAll ? msg.progressListHeaderAll : msg.progressListHeaderRecent);
            console.log();
            
            progressFiles.forEach((progress, index) => {
                const statusColor = 
                    progress.status === 'COMPLETED' ? colors.green :
                    progress.status === 'FAILED' ? colors.red :
                    progress.status === 'RUNNING' ? colors.cyan :
                    progress.status === 'PAUSED' ? colors.yellow :
                    colors.white;
                
                console.log(`${colors.bright}${index + 1}. ${progress.migrationId}${colors.reset}`);
                console.log(`   Status: ${statusColor}${progress.status}${colors.reset}`);
                
                if (progress.startTime) {
                    const startDate = new Date(progress.startTime);
                    console.log(`   Started: ${startDate.toLocaleString()}`);
                }
                
                if (progress.totalQueries) {
                    console.log(`   Progress: ${progress.completedQueries}/${progress.totalQueries} queries`);
                    if (progress.failedQueries > 0) {
                        console.log(`   ${colors.red}Failed: ${progress.failedQueries}${colors.reset}`);
                    }
                }
                
                if (progress.endTime) {
                    const endDate = new Date(progress.endTime);
                    const duration = ((progress.endTime - progress.startTime) / 1000).toFixed(0);
                    console.log(`   Completed: ${endDate.toLocaleString()} (${duration}s)`);
                }
                
                console.log();
            });
            
            if (!showAll && allProgressFiles.length > 3) {
                console.log(colors.dim + `Showing 3 of ${allProgressFiles.length} migration(s)` + colors.reset);
            } else {
                console.log(colors.dim + `Total: ${progressFiles.length} migration(s)` + colors.reset);
            }
            console.log();
            
            // 상세 정보 선택 또는 전체 보기
            const selection = await prompt(msg.selectMigration);
            
            if (selection === '0' || selection === '') {
                return;
            }
            
            // 전체 보기 옵션
            if (selection.toUpperCase() === 'A') {
                if (showAll) {
                    // 이미 전체를 보고 있으면 최근 3개로 돌아감
                    showAll = false;
                } else {
                    // 전체 보기로 전환
                    showAll = true;
                }
                continue;
            }
            
            // 숫자 입력 처리
            const selectionNum = parseInt(selection);
            if (isNaN(selectionNum) || selectionNum < 1 || selectionNum > progressFiles.length) {
                console.log(colors.red + msg.invalidInput + colors.reset);
                await new Promise(resolve => setTimeout(resolve, 1500));
                continue;
            }
            
            // 상세 정보 표시
            const selectedProgress = progressFiles[selectionNum - 1];
            await showProgressDetails(selectedProgress);
            
        } catch (error) {
            console.log(colors.red + `Error loading progress: ${error.message}` + colors.reset);
            console.log();
            await prompt(msg.pressEnter);
            return;
        }
    }
}

/**
 * Show detailed progress information
 */
async function showProgressDetails(progressInfo) {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + `  ${msg.progressDetails}` + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    
    try {
        const fs = require('fs');
        const progressData = JSON.parse(fs.readFileSync(progressInfo.filePath, 'utf8'));
        
        // 기본 정보
        console.log(`${colors.bright}${msg.detailMigrationId}${colors.reset} ${progressData.migrationId}`);
        
        const statusColor = 
            progressData.status === 'COMPLETED' ? colors.green :
            progressData.status === 'FAILED' ? colors.red :
            progressData.status === 'RUNNING' ? colors.cyan :
            progressData.status === 'PAUSED' ? colors.yellow :
            colors.white;
        console.log(`${colors.bright}${msg.detailStatus}${colors.reset} ${statusColor}${progressData.status}${colors.reset}`);
        
        if (progressData.startTime) {
            console.log(`${colors.bright}${msg.detailStartTime}${colors.reset} ${new Date(progressData.startTime).toLocaleString()}`);
        }
        
        if (progressData.endTime) {
            console.log(`${colors.bright}${msg.detailEndTime}${colors.reset} ${new Date(progressData.endTime).toLocaleString()}`);
        }
        
        if (progressData.startTime) {
            const endTime = progressData.endTime || Date.now();
            const duration = ((endTime - progressData.startTime) / 1000).toFixed(1);
            console.log(`${colors.bright}${msg.detailDuration}${colors.reset} ${duration}s`);
        }
        
        console.log();
        
        // 진행 상황
        console.log(`${colors.bright}${msg.detailTotalQueries}${colors.reset} ${progressData.totalQueries || 0}`);
        console.log(`${colors.bright}${msg.detailCompletedQueries}${colors.reset} ${colors.green}${progressData.completedQueries || 0}${colors.reset}`);
        
        if (progressData.failedQueries > 0) {
            console.log(`${colors.bright}${msg.detailFailedQueries}${colors.reset} ${colors.red}${progressData.failedQueries}${colors.reset}`);
        }
        
        if (progressData.totalRows) {
            console.log(`${colors.bright}${msg.detailTotalRows}${colors.reset} ${progressData.totalRows.toLocaleString()}`);
        }
        
        if (progressData.processedRows) {
            console.log(`${colors.bright}${msg.detailProcessedRows}${colors.reset} ${progressData.processedRows.toLocaleString()}`);
        }
        
        if (progressData.currentPhase) {
            console.log(`${colors.bright}${msg.detailCurrentPhase}${colors.reset} ${progressData.currentPhase}`);
        }
        
        // 쿼리별 상태
        if (progressData.queries && Object.keys(progressData.queries).length > 0) {
            console.log();
            console.log(`${colors.bright}${msg.detailQueryList}${colors.reset}`);
            console.log();
            
            let queryIndex = 1;
            for (const [queryId, queryData] of Object.entries(progressData.queries)) {
                const queryStatusColor = 
                    queryData.status === 'COMPLETED' ? colors.green :
                    queryData.status === 'FAILED' ? colors.red :
                    queryData.status === 'RUNNING' ? colors.cyan :
                    colors.yellow;
                
                console.log(`  ${queryIndex}. ${queryId}`);
                console.log(`     Status: ${queryStatusColor}${queryData.status}${colors.reset}`);
                
                if (queryData.processedRows) {
                    console.log(`     Rows: ${queryData.processedRows.toLocaleString()}`);
                }
                
                if (queryData.error) {
                    console.log(`     ${colors.red}Error: ${queryData.error}${colors.reset}`);
                }
                
                queryIndex++;
            }
        }
        
        // 오류 정보
        if (progressData.errors && progressData.errors.length > 0) {
            console.log();
            console.log(`${colors.bright}${colors.red}${msg.detailErrors}${colors.reset}`);
            progressData.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.message || error}`);
                if (error.queryId) {
                    console.log(`     Query: ${error.queryId}`);
                }
            });
        } else {
            console.log();
            console.log(`${colors.green}${msg.detailNoErrors}${colors.reset}`);
        }
        
    } catch (error) {
        console.log(colors.red + `Error loading details: ${error.message}` + colors.reset);
    }
    
    console.log();
    await prompt(msg.pressEnter);
}

/**
 * 5. Show help
 */
async function showHelp() {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + `  ${msg.helpTitle}` + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    
    if (!process.pkg) {
        try {
            execSync('node src/migrate-cli.js help', {
                stdio: 'inherit',
                cwd: APP_ROOT
            });
        } catch (error) {
            // Ignore errors in help
        }
    }
    
    console.log();
    console.log(colors.bright + msg.additionalInfo + colors.reset);
    console.log(msg.helpQueryFiles);
    console.log(msg.helpDbConfig);
    console.log(msg.helpProgress);
    console.log(msg.helpLogs);
    console.log();
    
    await prompt(msg.pressEnter);
}

/**
 * Main loop
 */
async function main() {
    console.log();
    // 비대화형 실행 경로 우선 처리
    const handled = await maybeRunFromCliArgs();
    if (handled) {
        rl.close();
        process.exit(0);
        return;
    }

    while (true) {
        clearScreen();
        showTitle();
        showMenu();
        
        const choice = await prompt(msg.selectPrompt);
        
        switch (choice) {
            case '1':
                await validateQueryFile();
                break;
                
            case '2':
                await testDatabaseConnection();
                break;
                
            case '3':
                await executeMigration();
                break;
                
            case '4':
                await checkProgress();
                break;
                
            case '5':
                await showHelp();
                break;
                
            case '0':
                console.log();
                console.log(colors.cyan + msg.exiting + colors.reset);
                console.log();
                rl.close();
                process.exit(0);
                
            default:
                console.log(colors.red + msg.invalidSelection + colors.reset);
                await new Promise(resolve => setTimeout(resolve, 1500));
                break;
        }
    }
}

// Node.js 버전 체크
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 14) {
    console.error(colors.red + `❌ ${msg.nodeVersionError}` + colors.reset);
    console.error(colors.yellow + `${msg.currentVersion} ${nodeVersion}` + colors.reset);
    console.error(colors.cyan + msg.installNodeJs + colors.reset);
    process.exit(1);
}

// Start program
console.log(colors.dim + msg.starting + colors.reset);

// Exception handling
process.on('SIGINT', () => {
    console.log();
    console.log(colors.yellow + `\n${msg.interrupted}` + colors.reset);
    rl.close();
    process.exit(0);
});

// Execute main function
main().catch(error => {
    console.error(colors.red + `\n${msg.errorOccurred}`, error.message + colors.reset);
    rl.close();
    process.exit(1);
});

