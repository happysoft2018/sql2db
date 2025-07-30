@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   DB ID 참조 방식 마이그레이션 테스트
echo =========================================
echo.

echo [정보] config/dbinfo.json에 정의된 DB ID를 참조하는 방식을 테스트합니다.
echo [정보] 설정 파일에서 DB 연결 정보를 직접 정의하지 않고 DB ID만 지정합니다.
echo.

echo [선택] 테스트할 환경을 선택하세요:
echo [1] 개발 환경 (dev-migration.json)
echo [2] 운영 환경 (prod-migration.xml)
echo [3] 기본 설정 (migration-queries.json)
echo [4] 기본 설정 (migration-queries.xml)
echo.
set /p env_choice="선택 (1-4): "

if "!env_choice!"=="1" (
    set "config_file=queries/dev-migration.json"
    set "env_name=개발 환경"
    set "format_name=JSON"
) else if "!env_choice!"=="2" (
    set "config_file=queries/prod-migration.xml"
    set "env_name=운영 환경"
    set "format_name=XML"
) else if "!env_choice!"=="3" (
    set "config_file=queries/migration-queries.json"
    set "env_name=기본 설정"
    set "format_name=JSON"
) else if "!env_choice!"=="4" (
    set "config_file=queries/migration-queries.xml"
    set "env_name=기본 설정"
    set "format_name=XML"
) else (
    echo [오류] 잘못된 선택입니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [정보] 선택된 환경: !env_name! (!format_name! 형식)
echo [정보] 설정 파일: !config_file!
echo.

:: 1. DB 정보 파일 확인
echo [0단계] config/dbinfo.json 파일 확인...
if not exist "config/dbinfo.json" (
    echo [오류] config/dbinfo.json 파일을 찾을 수 없습니다.
    echo [참고] 이 파일에는 DB 연결 정보가 정의되어야 합니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)
echo [성공] config/dbinfo.json 파일이 존재합니다.
echo.

:: 2. 설정 파일 검증
echo [1단계] 설정 파일 검증 중...
node src/migrate-cli.js validate --config !config_file!
if errorlevel 1 (
    echo.
    echo [오류] 설정 파일 검증에 실패했습니다.
    echo [참고] 설정 파일에서 참조하는 DB ID가 config/dbinfo.json에 정의되어 있는지 확인하세요.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [성공] 설정 파일 검증이 완료되었습니다.
echo [정보] DB ID 참조가 올바르게 파싱되었습니다.
echo.

:: 3. 데이터베이스 연결 테스트
echo [2단계] 데이터베이스 연결 테스트 중...
echo [정보] config/dbinfo.json에서 DB ID로 조회한 연결 정보를 테스트합니다.
node src/migrate-cli.js test --config !config_file!
if errorlevel 1 (
    echo.
    echo [오류] 데이터베이스 연결 테스트에 실패했습니다.
    echo [참고] config/dbinfo.json의 DB 연결 정보를 확인하세요:
    echo        - 서버 주소 및 포트가 올바른지 확인
    echo        - 데이터베이스 이름이 정확한지 확인
    echo        - 사용자 계정 및 비밀번호가 유효한지 확인
    echo        - 네트워크 연결 상태 확인
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [성공] 데이터베이스 연결 테스트가 완료되었습니다.
echo [정보] DB ID 참조를 통한 연결이 정상적으로 작동합니다.
echo.

:: 4. 실제 이관 실행 확인
echo [3단계] 데이터 이관을 실행하시겠습니까?
echo [주의] config/dbinfo.json에 정의된 타겟 DB에 실제 데이터가 변경됩니다.
echo [환경] !env_name! (!format_name! 형식)
set /p confirm="실제 데이터 이관을 실행하려면 'Y'를 입력하세요 (Y/N): "

if /i "!confirm!"=="Y" (
    echo.
    echo [3단계] DB ID 참조 방식을 사용한 데이터 이관 실행 중...
    node src/migrate-cli.js migrate --config !config_file!
    
    if errorlevel 1 (
        echo.
        echo [오류] 데이터 이관 실행 중 오류가 발생했습니다.
        echo.
        echo 아무 키나 누르면 창이 닫힙니다...
        pause >nul
        exit /b 1
    )
    
    echo.
    echo [성공] DB ID 참조 방식을 사용한 데이터 이관이 완료되었습니다!
    echo [정보] config/dbinfo.json에서 조회한 DB 정보로 이관이 성공적으로 완료되었습니다.
    echo.
) else (
    echo.
    echo [정보] 데이터 이관을 건너뛰었습니다.
    echo.
)

echo =========================================
echo   DB ID 참조 방식 테스트 완료
echo =========================================
echo.
echo [참고] DB ID 참조 방식의 장점:
echo        ✅ 중앙 집중식 DB 연결 정보 관리
echo        ✅ 설정 파일 간소화 (DB ID만 지정)
echo        ✅ 보안 향상 (민감한 정보를 별도 파일에서 관리)
echo        ✅ 재사용성 (동일한 DB를 여러 설정에서 활용)
echo        ✅ 환경별 분리 (dev, prod 등 환경별 DB 설정)
echo.
echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 