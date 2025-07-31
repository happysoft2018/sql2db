@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   설정 파일 DB 연결 정보 테스트
echo =========================================
echo.

echo [정보] 설정 파일에 포함된 DB 연결 정보를 사용한 마이그레이션 테스트입니다.
echo [정보] .env 파일의 DB 설정을 무시하고 설정 파일 내부의 DB 정보를 사용합니다.
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
echo [정보] 선택된 설정: 사용자 정의 형식 (!config_file!)
echo.

:: 1. 설정 파일 검증
echo [1단계] 설정 파일 검증 중...
node src/migrate-cli.js validate --config !config_file!
if errorlevel 1 (
    echo.
    echo [오류] 설정 파일 검증에 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [성공] 설정 파일 검증이 완료되었습니다.
echo [정보] 설정 파일 내부의 DB 연결 정보가 올바르게 파싱되었습니다.
echo.

:: 2. 데이터베이스 연결 테스트
echo [2단계] 데이터베이스 연결 테스트 중...
echo [정보] 설정 파일에 정의된 소스/타겟 DB 연결을 테스트합니다.
node src/migrate-cli.js test --config !config_file!
if errorlevel 1 (
    echo.
    echo [오류] 데이터베이스 연결 테스트에 실패했습니다.
    echo [참고] 설정 파일의 DB 연결 정보를 확인하세요:
    echo        - 서버 주소 및 포트
    echo        - 데이터베이스 이름
    echo        - 사용자 계정 및 비밀번호
    echo        - 연결 옵션 (encrypt, trustServerCertificate 등)
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [성공] 데이터베이스 연결 테스트가 완료되었습니다.
echo [정보] 설정 파일의 DB 연결 정보가 정상적으로 작동합니다.
echo.

:: 3. 실제 이관 실행 확인
echo [3단계] 데이터 이관을 실행하시겠습니까?
echo [주의] 설정 파일에 정의된 타겟 DB에 실제 데이터가 변경됩니다.
set /p confirm="실제 데이터 이관을 실행하려면 'Y'를 입력하세요 (Y/N): "

if /i "!confirm!"=="Y" (
    echo.
    echo [3단계] 설정 파일 DB 정보를 사용한 데이터 이관 실행 중...
    node src/migrate-cli.js migrate --config !config_file!
    
    if errorlevel 1 (
        echo.
        echo [오류] 데이터 이관 실행 중 오류가 발생했습니다.
        echo.
        echo 아무 키나 누르면 창이 닫힙니다...
        pause >nul
        exit /b 1
    )
    
    echo.
    echo [성공] 설정 파일 DB 정보를 사용한 데이터 이관이 완료되었습니다!
    echo [정보] 소스 DB에서 타겟 DB로 데이터가 성공적으로 이관되었습니다.
    echo.
) else (
    echo.
    echo [정보] 데이터 이관을 건너뛰었습니다.
    echo.
)

echo =========================================
echo   설정 파일 DB 연결 테스트 완료
echo =========================================
echo.
echo [참고] 설정 파일에 DB 연결 정보가 있으면:
echo        - .env 파일의 DB 설정보다 우선 적용됩니다
echo        - 프로젝트별로 다른 DB를 쉽게 설정할 수 있습니다
echo        - 팀 협업 시 일관된 DB 설정을 공유할 수 있습니다
echo.
echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 