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
 * 타이틀 표시
 */
function showTitle() {
    console.log(colors.cyan + colors.bright);
    console.log('=========================================');
    console.log('  MSSQL 데이터 이관 도구 v1.0');
    console.log('=========================================');
    console.log(colors.reset);
}

/**
 * 메뉴 표시
 */
function showMenu() {
    console.log(colors.yellow);
    console.log('=========================================');
    console.log('  메뉴 선택');
    console.log('=========================================');
    console.log(colors.reset);
    console.log('1. 쿼리문정의 파일 Syntax검증');
    console.log('2. DB연결 테스트 (연결 가능 여부 포함)');
    console.log('3. 데이터 이관 실행');
    console.log('4. 도움말 보기');
    console.log('0. 종료');
    console.log(colors.yellow + '=========================================' + colors.reset);
    console.log();
}

/**
 * queries 폴더에서 XML/JSON 파일 목록 가져오기
 */
function getQueryFiles() {
    const queriesDir = path.join(__dirname, 'queries');
    const files = [];
    
    try {
        if (!fs.existsSync(queriesDir)) {
            return files;
        }
        
        const allFiles = fs.readdirSync(queriesDir);
        
        // XML 파일
        allFiles.filter(f => f.endsWith('.xml')).forEach(f => {
            files.push({
                path: path.join('queries', f),
                name: f,
                type: 'XML'
            });
        });
        
        // JSON 파일
        allFiles.filter(f => f.endsWith('.json')).forEach(f => {
            files.push({
                path: path.join('queries', f),
                name: f,
                type: 'JSON'
            });
        });
        
        return files;
    } catch (error) {
        console.error(colors.red + `파일 목록 조회 실패: ${error.message}` + colors.reset);
        return files;
    }
}

/**
 * 파일 선택 메뉴 표시 및 선택
 */
async function selectQueryFile(title = '쿼리문정의 파일 선택') {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + `  ${title}` + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    
    const files = getQueryFiles();
    
    if (files.length === 0) {
        console.log(colors.red + '  (쿼리문정의 파일을 찾을 수 없습니다)' + colors.reset);
        console.log();
        await prompt('Enter를 눌러 계속...');
        return null;
    }
    
    console.log('사용 가능한 쿼리문정의 파일들:');
    console.log();
    
    files.forEach((file, index) => {
        const typeColor = file.type === 'XML' ? colors.blue : colors.green;
        console.log(`  ${colors.bright}${index + 1}.${colors.reset} ${file.name} ${typeColor}[${file.type}]${colors.reset}`);
    });
    
    console.log();
    
    while (true) {
        const answer = await prompt(`파일 번호를 선택하세요 (1-${files.length}): `);
        
        if (answer === '') {
            console.log(colors.red + '파일 번호가 입력되지 않았습니다.' + colors.reset);
            console.log();
            continue;
        }
        
        const num = parseInt(answer);
        
        if (isNaN(num) || num < 1 || num > files.length) {
            console.log(colors.red + `잘못된 파일 번호입니다. 1-${files.length} 사이의 숫자를 입력하세요.` + colors.reset);
            console.log();
            continue;
        }
        
        const selectedFile = files[num - 1];
        console.log();
        console.log(colors.green + `선택된 파일: ${selectedFile.path}` + colors.reset);
        console.log();
        
        return selectedFile.path;
    }
}

/**
 * 1. 쿼리문정의 파일 검증
 */
async function validateQueryFile() {
    const filePath = await selectQueryFile('쿼리문정의 파일 검증');
    
    if (!filePath) {
        return;
    }
    
    console.log('쿼리문정의 파일을 검증하고 있습니다...');
    console.log();
    
    try {
        execSync(`node src/migrate-cli.js validate --query "${filePath}"`, {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        console.log();
        console.log(colors.green + '✅ 쿼리문정의 파일 검증이 완료되었습니다.' + colors.reset);
    } catch (error) {
        console.log();
        console.log(colors.red + '❌ 쿼리문정의 파일에 오류가 있습니다.' + colors.reset);
    }
    
    console.log();
    await prompt('Enter를 눌러 계속...');
}

/**
 * 2. DB 연결 테스트
 */
async function testDatabaseConnection() {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + '  데이터베이스 연결 테스트' + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    console.log('데이터베이스 연결을 테스트하고 있습니다...');
    console.log();
    
    try {
        execSync('node src/migrate-cli.js list-dbs', {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        console.log();
        console.log(colors.green + '✅ 데이터베이스 연결 테스트가 성공했습니다.' + colors.reset);
    } catch (error) {
        console.log();
        console.log(colors.red + '❌ 데이터베이스 연결에 실패했습니다.' + colors.reset);
        console.log(colors.yellow + 'config/dbinfo.json 파일의 연결 정보를 확인해주세요.' + colors.reset);
    }
    
    console.log();
    await prompt('Enter를 눌러 계속...');
}

/**
 * 3. 데이터 이관 실행
 */
async function executeMigration() {
    const filePath = await selectQueryFile('데이터 이관 실행');
    
    if (!filePath) {
        return;
    }
    
    // 확인
    const confirm = await prompt(colors.yellow + '정말로 데이터 이관을 실행하시겠습니까? (Y/N): ' + colors.reset);
    
    if (confirm.toUpperCase() !== 'Y') {
        console.log(colors.yellow + '이관이 취소되었습니다.' + colors.reset);
        console.log();
        await prompt('Enter를 눌러 계속...');
        return;
    }
    
    console.log();
    console.log('데이터 이관을 시작합니다...');
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
        console.log(colors.green + '✅ 데이터 이관이 성공적으로 완료되었습니다!' + colors.reset);
        console.log(colors.dim + `실행 시간: ${duration}초` + colors.reset);
    } catch (error) {
        console.log();
        console.log(colors.red + '❌ 데이터 이관 중 오류가 발생했습니다.' + colors.reset);
    }
    
    console.log();
    await prompt('Enter를 눌러 계속...');
}

/**
 * 4. 도움말 표시
 */
async function showHelp() {
    console.log();
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log(colors.bright + '  도움말' + colors.reset);
    console.log(colors.cyan + '=========================================' + colors.reset);
    console.log();
    
    try {
        execSync('node src/migrate-cli.js help', {
            stdio: 'inherit',
            cwd: __dirname
        });
    } catch (error) {
        // 도움말은 오류가 발생해도 무시
    }
    
    console.log();
    console.log(colors.bright + '추가 정보:' + colors.reset);
    console.log('- 쿼리문정의 파일: queries/ 폴더에 XML 또는 JSON 형식으로 작성');
    console.log('- DB 연결 설정: config/dbinfo.json 파일에서 설정');
    console.log('- 진행 상황 확인: node src/progress-cli.js list');
    console.log('- 상세 로그: logs/ 폴더 확인');
    console.log();
    
    await prompt('Enter를 눌러 계속...');
}

/**
 * 메인 루프
 */
async function main() {
    console.log();
    
    while (true) {
        clearScreen();
        showTitle();
        showMenu();
        
        const choice = await prompt('선택하세요 (0-4): ');
        
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
                console.log(colors.cyan + 'MSSQL 데이터 이관 도구를 종료합니다.' + colors.reset);
                console.log();
                rl.close();
                process.exit(0);
                
            default:
                console.log(colors.red + '잘못된 선택입니다. 다시 선택해주세요.' + colors.reset);
                await new Promise(resolve => setTimeout(resolve, 1500));
                break;
        }
    }
}

// Node.js 버전 체크
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 14) {
    console.error(colors.red + '❌ Node.js 14.0 이상이 필요합니다.' + colors.reset);
    console.error(colors.yellow + `현재 버전: ${nodeVersion}` + colors.reset);
    console.error(colors.cyan + 'https://nodejs.org 에서 최신 버전을 설치해주세요.' + colors.reset);
    process.exit(1);
}

// 프로그램 시작
console.log(colors.dim + 'MSSQL 데이터 이관 도구를 시작합니다...' + colors.reset);

// 예외 처리
process.on('SIGINT', () => {
    console.log();
    console.log(colors.yellow + '\n프로그램이 사용자에 의해 중단되었습니다.' + colors.reset);
    rl.close();
    process.exit(0);
});

// 메인 함수 실행
main().catch(error => {
    console.error(colors.red + '\n오류 발생:', error.message + colors.reset);
    rl.close();
    process.exit(1);
});

