@echo off
echo ===============================================
echo 동적 변수 디버그 테스트
echo ===============================================

REM 환경 변수 설정
set DEBUG_VARIABLES=true
set ENABLE_LOGGING=true

echo 환경 변수 설정:
echo   DEBUG_VARIABLES=%DEBUG_VARIABLES%
echo   ENABLE_LOGGING=%ENABLE_LOGGING%

echo.
echo 동적 변수 추출 테스트 시작...
node test/test-dynamic-variables.js

echo.
echo 테스트 완료
pause
