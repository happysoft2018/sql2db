@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   로그 레벨 테스트
echo =========================================
echo.

echo [정보] 다양한 로그 레벨을 테스트합니다.
echo [정보] 각 레벨별로 출력되는 로그를 확인할 수 있습니다.
echo.

echo [선택] 테스트할 로그 레벨을 선택하세요:
echo [1] ERROR (오류만)
echo [2] WARN (경고와 오류)
echo [3] INFO (정보, 경고, 오류) - 기본값
echo [4] DEBUG (디버그, 정보, 경고, 오류)
echo [5] TRACE (모든 로그)
echo.
set /p log_choice="선택 (1-5): "

if "!log_choice!"=="1" (
    set "log_level=ERROR"
    set "description=오류만 출력"
) else if "!log_choice!"=="2" (
    set "log_level=WARN"
    set "description=경고와 오류 출력"
) else if "!log_choice!"=="3" (
    set "log_level=INFO"
    set "description=정보, 경고, 오류 출력"
) else if "!log_choice!"=="4" (
    set "log_level=DEBUG"
    set "description=디버그, 정보, 경고, 오류 출력"
) else if "!log_choice!"=="5" (
    set "log_level=TRACE"
    set "description=모든 로그 출력"
) else (
    echo [오류] 잘못된 선택입니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [정보] 선택된 로그 레벨: !log_level! (!description!)
echo.

:: 테스트용 설정 파일 생성
echo 테스트용 설정 파일을 생성합니다...
if not exist "queries" mkdir queries

echo {> queries\test-log-config.json
echo   "name": "로그 레벨 테스트",>> queries\test-log-config.json
echo   "description": "다양한 로그 레벨을 테스트하기 위한 설정",>> queries\test-log-config.json
echo   "version": "1.0.0",>> queries\test-log-config.json
echo   "variables": {>> queries\test-log-config.json
echo     "testVar": "테스트값",>> queries\test-log-config.json
echo     "batchSize": 100>> queries\test-log-config.json
echo   },>> queries\test-log-config.json
echo   "queries": [>> queries\test-log-config.json
echo     {>> queries\test-log-config.json
echo       "id": "test_query",>> queries\test-log-config.json
echo       "description": "테스트용 쿼리",>> queries\test-log-config.json
echo       "sourceQuery": "SELECT 1 as test_column",>> queries\test-log-config.json
echo       "targetTable": "test_table",>> queries\test-log-config.json
echo       "enabled": false>> queries\test-log-config.json
echo     }>> queries\test-log-config.json
echo   ]>> queries\test-log-config.json
echo }>> queries\test-log-config.json

echo [1단계] 로그 레벨 테스트 시작...
echo.

:: 선택된 로그 레벨로 환경 변수 설정하고 테스트 실행
set LOG_LEVEL=!log_level!
node src/migrate-cli.js validate --query queries\test-log-config.json

if errorlevel 1 (
    echo.
    echo [오류] 로그 레벨 테스트 중 오류가 발생했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [2단계] 로그 파일 확인...
echo.

if exist "logs" (
    echo 최근 로그 파일들:
    echo.
    dir /b /o-d logs\*.log 2>nul
    
    if %errorlevel% equ 0 (
        echo.
        echo 로그 파일을 확인하시겠습니까? (Y/N)
        set /p view_log=
        if /i "!view_log!"=="Y" (
            echo.
            echo === 최근 로그 파일 내용 ===
            echo.
            for /f "delims=" %%f in ('dir /b /o-d logs\*.log 2^>nul') do (
                echo 파일: %%f
                echo.
                type "logs\%%f"
                echo.
                echo ================================
                echo.
                goto :log_viewed
            )
        )
    ) else (
        echo 로그 파일이 없습니다.
    )
) else (
    echo logs 디렉토리가 없습니다.
)

:log_viewed

echo.
echo =========================================
echo   로그 레벨 테스트 완료
echo =========================================
echo.
echo [결과] 로그 레벨 !log_level!로 테스트가 완료되었습니다.
echo [참고] 로그 파일은 logs/ 디렉토리에 저장됩니다.
echo [설정] .env 파일에서 LOG_LEVEL을 변경하여 로그 레벨을 조정할 수 있습니다.
echo.
echo 로그 레벨별 특징:
echo - ERROR: 오류만 출력 (운영 환경)
echo - WARN: 경고와 오류 출력 (운영 환경)
echo - INFO: 일반적인 정보 포함 (기본값)
echo - DEBUG: 상세한 디버그 정보 (개발 환경)
echo - TRACE: 모든 로그 출력 (문제 해결)
echo.

echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 