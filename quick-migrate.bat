@echo off
chcp 65001 > nul
color 0F

echo.
echo ══════════════════════════════════════════════════════════════════
echo                     빠른 데이터 이관 실행                           
echo ══════════════════════════════════════════════════════════════════
echo.

:: 기본 검증
echo 1단계: 설정 파일 검증 중...
npm run validate
if %errorlevel% neq 0 (
    echo ❌ 설정 파일 검증 실패
    pause
    exit /b 1
)
echo ✅ 설정 파일 검증 완료

echo.
echo 2단계: 데이터베이스 연결 테스트 중...
npm run test-connections
if %errorlevel% neq 0 (
    echo ❌ 데이터베이스 연결 실패
    pause
    exit /b 1
)
echo ✅ 데이터베이스 연결 완료

echo.
echo 3단계: 데이터 이관 실행 중...
echo ⚠️  대상 데이터베이스가 백업되었는지 확인하세요!
echo.
echo 계속하시겠습니까? (Y/N)
set /p confirm=
if /i "%confirm%" neq "Y" (
    echo 이관이 취소되었습니다.
    pause
    exit /b 0
)

echo.
echo 데이터 이관을 시작합니다...
npm run migrate

if %errorlevel% equ 0 (
    echo.
    echo ✅ 데이터 이관이 성공적으로 완료되었습니다!
) else (
    echo.
    echo ❌ 데이터 이관 중 오류가 발생했습니다.
)

echo.
pause 