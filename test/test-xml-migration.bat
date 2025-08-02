@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   MSSQL 데이터 이관 도구 - XML 테스트
echo =========================================
echo.

echo [정보] XML 쿼리문정의 파일 을 사용한 데이터 이관 테스트를 시작합니다.
echo.

:: 쿼리문정의 파일 경로 입력
echo 쿼리문정의 파일 경로를 입력하세요 (예: queries/my-config.xml):
set /p config_file=
if "!config_file!"=="" (
    echo 쿼리문정의 파일 경로가 입력되지 않았습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo [정보] 쿼리문정의 파일 : !config_file!
echo.

:: 1. 쿼리문정의 파일 검증
echo [1단계] 쿼리문정의 파일 검증 중...
node src/migrate-cli.js validate --query "!config_file!"
if errorlevel 1 (
    echo.
    echo [오류] 쿼리문정의 파일 검증에 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [성공] 쿼리문정의 파일 검증이 완료되었습니다.
echo.

:: 2. 데이터베이스 연결 테스트
echo [2단계] 데이터베이스 연결 테스트 중...
node src/migrate-cli.js test
if errorlevel 1 (
    echo.
    echo [오류] 데이터베이스 연결 테스트에 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [성공] 데이터베이스 연결 테스트가 완료되었습니다.
echo.

:: 3. 실제 이관 실행 확인
echo [3단계] 데이터 이관을 실행하시겠습니까?
set /p confirm="실제 데이터 이관을 실행하려면 'Y'를 입력하세요 (Y/N): "

if /i "!confirm!"=="Y" (
    echo.
    echo [3단계] XML 설정을 사용한 데이터 이관 실행 중...
    node src/migrate-cli.js migrate --query "!config_file!"
    
    if errorlevel 1 (
        echo.
        echo [오류] 데이터 이관 실행 중 오류가 발생했습니다.
        echo.
        echo 아무 키나 누르면 창이 닫힙니다...
        pause >nul
        exit /b 1
    )
    
    echo.
    echo [성공] XML 설정을 사용한 데이터 이관이 완료되었습니다!
    echo.
) else (
    echo.
    echo [정보] 데이터 이관을 건너뛰었습니다.
    echo.
)

echo =========================================
echo   XML 테스트 완료
echo =========================================
echo.
echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 