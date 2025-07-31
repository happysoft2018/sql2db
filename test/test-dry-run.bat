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

echo 설정 파일 경로를 입력하세요 (예: queries/my-config.xml):
set /p config_file=
if "!config_file!"=="" (
    echo 설정 파일 경로가 입력되지 않았습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo =========================================
echo   DRY RUN 시뮬레이션 실행
echo =========================================
echo [설정] 사용자 정의 설정
echo [파일] !config_file!
echo.

echo [1단계] DRY RUN 시뮬레이션 실행 중...
echo.

node src/migrate-cli.js migrate --config "!config_file!" --dry-run

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