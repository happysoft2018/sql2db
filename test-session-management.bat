@echo off
chcp 65001 >nul
echo ========================================
echo 세션 관리 기능 테스트
echo ========================================
echo.

echo 데이터베이스 연결 설정을 확인합니다...
if not exist "config\dbinfo.json" (
    echo ❌ config\dbinfo.json 파일이 없습니다.
    echo 데이터베이스 연결 정보를 설정해주세요.
    pause
    exit /b 1
)

echo ✅ 설정 파일 확인 완료
echo.

echo 세션 관리 기능 테스트를 시작합니다...
node test\test-session-management.js

echo.
echo 테스트 완료. 아무 키나 누르면 종료됩니다.
pause >nul
