@echo off
echo ===============================================
echo SELECT * IDENTITY 컬럼 자동 제외 테스트
echo ===============================================

echo.
echo 테스트 시작...
node test/test-select-star-identity.js

echo.
echo 테스트 완료
pause
