@echo off
chcp 65001 > nul
color 0F

echo.
echo ══════════════════════════════════════════════════════════════════
echo                        쿼리문정의 파일 검증                             
echo ══════════════════════════════════════════════════════════════════
echo.

echo 쿼리문정의 파일 을 검증하고 있습니다...
echo.

npm run validate

if %errorlevel% equ 0 (
    echo.
    echo ✅ 쿼리문정의 파일 검증이 완료되었습니다!
    echo    - 환경 변수 설정 확인 완료
    echo    - 쿼리 쿼리문정의 파일 확인 완료
    echo    - 모든 필수 설정 확인 완료
) else (
    echo.
    echo ❌ 쿼리문정의 파일에 오류가 있습니다.
    echo.
    echo 확인할 항목:
    echo    - .env 파일 존재 여부
    echo    - 필수 환경 변수 설정
    echo    - 쿼리문정의 파일 구문 (JSON 또는 XML)
    echo    - 활성화된 쿼리 존재 여부
)

echo.
pause 