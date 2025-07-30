@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   MSSQL 데이터 이관 도구 - DRY RUN 테스트
echo =========================================
echo.

echo [정보] DRY RUN 모드로 데이터 마이그레이션 시뮬레이션을 실행합니다.
echo [정보] 실제 데이터 변경은 일어나지 않으며, 소스 DB에서만 데이터를 읽습니다.
echo.

echo [선택] 테스트할 설정을 선택하세요:
echo [1] 기본 설정 (queries/migration-queries.json)
echo [2] 기본 설정 (queries/migration-queries.xml)
echo [3] 사용자 정의 설정 파일 입력
echo [4] 작업별 설정 파일 선택
echo.
set /p choice="선택하세요 (1-4): "

if "%choice%"=="1" (
    set "config_file=queries/migration-queries.json"
    set "description=JSON 기본 설정"
) else if "%choice%"=="2" (
    set "config_file=queries/migration-queries.xml"
    set "description=XML 기본 설정"
) else if "%choice%"=="3" (
    echo.
    set /p config_file="설정 파일 경로를 입력하세요: "
    set "description=사용자 정의 설정"
) else if "%choice%"=="4" (
    echo.
    echo 사용 가능한 작업별 설정:
    if exist "queries\configs\user-migration.json" echo   - user (사용자 데이터)
    if exist "queries\configs\order-migration.json" echo   - order (주문 데이터)
    if exist "queries\configs\product-migration.json" echo   - product (상품 데이터)
    echo.
    set /p job_name="작업명을 입력하세요: "
    set "description=작업별 설정: !job_name!"
) else (
    echo [오류] 잘못된 선택입니다.
    pause
    exit /b 1
)

echo.
echo =========================================
echo   DRY RUN 시뮬레이션 실행
echo =========================================
echo [설정] !description!
if defined config_file echo [파일] !config_file!
if defined job_name echo [작업] !job_name!
echo.

echo [1단계] DRY RUN 시뮬레이션 실행 중...
echo.

if defined job_name (
    node src/migrate-cli.js migrate --job !job_name! --dry-run
) else (
    node src/migrate-cli.js migrate --config "!config_file!" --dry-run
)

if errorlevel 1 (
    echo.
    echo [오류] DRY RUN 시뮬레이션이 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo =========================================
echo   DRY RUN 완료
echo =========================================
echo [성공] 시뮬레이션이 성공적으로 완료되었습니다.
echo [참고] 실제 데이터 변경은 일어나지 않았습니다.
echo [실행] 실제 마이그레이션을 원하면 --dry-run 옵션을 제거하고 실행하세요.
echo.

echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 