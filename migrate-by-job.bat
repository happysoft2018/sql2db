@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo.
echo =====================================================
echo           MSSQL 데이터 이관 도구 (작업별)
echo =====================================================
echo.

REM 사용 가능한 작업 목록 표시
echo 📋 사용 가능한 작업 목록:
node src/migrate-cli.js list

echo.
echo =====================================================
echo.

REM 사용자 입력 받기
set /p JOB_NAME="실행할 작업명을 입력하세요 (예: user, order, product): "

if "%JOB_NAME%"=="" (
    echo ❌ 작업명을 입력해주세요.
    goto :error
)

echo.
echo 🚀 작업 '%JOB_NAME%' 데이터 이관을 시작합니다...
echo.

REM 실행 확인
set /p CONFIRM="정말로 실행하시겠습니까? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ 작업이 취소되었습니다.
    goto :end
)

echo.
echo ⏳ 데이터 이관 실행 중...
echo.

REM 데이터 이관 실행
node src/migrate-cli.js migrate --job %JOB_NAME%

if %errorlevel% equ 0 (
    echo.
    echo ✅ 데이터 이관이 성공적으로 완료되었습니다!
    echo.
) else (
    echo.
    echo ❌ 데이터 이관 중 오류가 발생했습니다.
    echo 로그를 확인하여 문제를 해결하세요.
    echo.
    goto :error
)

goto :end

:error
echo.
echo ❌ 작업 실행 중 오류가 발생했습니다.
echo.
echo 문제 해결 방법:
echo 1. 작업명이 올바른지 확인하세요 (user, order, product)
echo 2. 설정 파일이 존재하는지 확인하세요
echo 3. 환경 변수가 올바르게 설정되어 있는지 확인하세요
echo 4. 데이터베이스 연결 상태를 확인하세요
echo.
pause
exit /b 1

:end
echo.
echo 작업이 완료되었습니다.
echo.
pause
exit /b 0 