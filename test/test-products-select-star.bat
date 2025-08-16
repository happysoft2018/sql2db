@echo off
echo ===============================================
echo products 테이블 SELECT * IDENTITY 컬럼 제외 테스트
echo ===============================================

echo.
echo 테스트 시작...
node test/test-products-select-star.js

echo.
echo 테스트 완료
pause
