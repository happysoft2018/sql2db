const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 언어 설정 (명령줄 인수에서 가져오기)
const args = process.argv.slice(2);
const langArg = args.find(arg => arg.startsWith('--lang='));
const LANGUAGE = langArg ? langArg.split('=')[1] : 'en';

// 다국어 메시지
const messages = {
    en: {
        title: 'MSSQL Data Migration Tool v1.0',
        menuTitle: 'Menu Selection',
        menu1: '1. Validate Query Definition File',
        menu2: '2. Test Database Connection',
        menu3: '3. Execute Data Migration',
        menu4: '4. Show Help',
        menu0: '0. Exit',
        selectPrompt: 'Please select (0-4): ',
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
        
        // Help
        helpTitle: 'Help',
        additionalInfo: 'Additional Information:',
        helpQueryFiles: '- Query Definition Files: Create XML or JSON files in queries/ folder',
        helpDbConfig: '- Database Configuration: Configure in config/dbinfo.json',
        helpProgress: '- Check Progress: node src/progress-cli.js list',
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
        title: 'MSSQL 데이터 이관 도구 v1.0',
        menuTitle: '메뉴 선택',
        menu1: '1. 쿼리문정의 파일 Syntax검증',
        menu2: '2. DB연결 테스트 (연결 가능 여부 포함)',
        menu3: '3. 데이터 이관 실행',
        menu4: '4. 도움말 보기',
        menu0: '0. 종료',
        selectPrompt: '선택하세요 (0-4): ',
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
        
        // Help
        helpTitle: '도움말',
        additionalInfo: '추가 정보:',
        helpQueryFiles: '- 쿼리문정의 파일: queries/ 폴더에 XML 또는 JSON 형식으로 작성',
        helpDbConfig: '- DB 연결 설정: config/dbinfo.json 파일에서 설정',
        helpProgress: '- 진행 상황 확인: node src/progress-cli.js list',
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
 * Show title
 */
function showTitle() {
    console.log(colors.cyan + colors.bright);
    console.log('=========================================');
    console.log(`  ${msg.title}`);
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
    console.log(msg.menu0);
    console.log(colors.yellow + '=========================================' + colors.reset);
    console.log();
}

/**
 * Get query files from queries folder
 */
function getQueryFiles() {
    const queriesDir = path.join(__dirname, 'queries');
    const files = [];
    
    try {
        if (!fs.existsSync(queriesDir)) {
            return files;
        }
        
        const allFiles = fs.readdirSync(queriesDir);
        
        // XML files
        allFiles.filter(f => f.endsWith('.xml')).forEach(f => {
            files.push({
                path: path.join('queries', f),
                name: f,
                type: 'XML'
            });
        });
        
        // JSON files
        allFiles.filter(f => f.endsWith('.json')).forEach(f => {
            files.push({
                path: path.join('queries', f),
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
        console.log(`  ${colors.bright}${index + 1}.${colors.reset} ${file.name} ${typeColor}[${file.type}]${colors.reset}`);
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
        execSync(`node src/migrate-cli.js validate --query "${filePath}"`, {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        console.log();
        console.log(colors.green + msg.validationCompleted + colors.reset);
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
        execSync('node src/migrate-cli.js list-dbs', {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        console.log();
        console.log(colors.green + msg.connectionSuccess + colors.reset);
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
        execSync(`node src/migrate-cli.js migrate --query "${filePath}"`, {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        const endTime = new Date();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log();
        console.log(colors.green + msg.migrationSuccess + colors.reset);
        console.log(colors.dim + `${msg.executionTime} ${duration}s` + colors.reset);
    } catch (error) {
        console.log();
        console.log(colors.red + msg.migrationFailed + colors.reset);
    }
    
    console.log();
    await prompt(msg.pressEnter);
}

/**
 * 4. Show help
 */
async function showHelp() {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + `  ${msg.helpTitle}` + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    
    try {
        execSync('node src/migrate-cli.js help', {
            stdio: 'inherit',
            cwd: __dirname
        });
    } catch (error) {
        // Ignore errors in help
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

