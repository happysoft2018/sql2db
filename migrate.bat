@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Korean output setup
color 0F

:HEADER
cls
echo.
echo =========================================
echo   MSSQL 데이터 이관 도구 v1.0
echo =========================================
echo.

:: Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js가 설치되지 않았습니다.
    echo https://nodejs.org 에서 Node.js를 설치해주세요.
    echo.
    pause
    exit /b 1
)

:MENU
echo =========================================
echo   메뉴 선택
echo =========================================
echo 1. 쿼리문정의 파일 검증
echo 2. 데이터베이스 연결 테스트
echo 3. 데이터 이관 실행
echo 4. 도움말 보기
echo 5. 로그 파일 보기
echo 6. 쿼리문정의 파일 편집
echo 0. 종료
echo =========================================
echo.
set /p choice=선택하세요 (0-6): 

if "%choice%"=="1" goto VALIDATE
if "%choice%"=="2" goto TEST
if "%choice%"=="3" goto MIGRATE
if "%choice%"=="4" goto HELP
if "%choice%"=="5" goto LOGS
if "%choice%"=="6" goto EDIT
if "%choice%"=="0" goto EXIT

echo 잘못된 선택입니다. 다시 선택해주세요.
echo.
pause
goto MENU

:VALIDATE
echo.
echo =========================================
echo   쿼리문정의 파일 검증
echo =========================================
echo.
echo 쿼리문정의 파일 경로를 입력하세요 (예: queries/my-config.xml):
set /p config_file=
if "%config_file%"=="" (
    echo 쿼리문정의 파일 경로가 입력되지 않았습니다.
    echo.
    pause
    goto MENU
)

echo.
echo 쿼리문정의 파일 을 검증하고 있습니다...
echo.
node src/migrate-cli.js validate --query "%config_file%"

if %errorlevel% equ 0 (
    echo.
    echo 쿼리문정의 파일 검증이 완료되었습니다.
) else (
    echo.
    echo 쿼리문정의 파일에 오류가 있습니다.
)

echo.
pause
goto MENU

:TEST
echo.
echo =========================================
echo   데이터베이스 연결 테스트
echo =========================================
echo.
echo 데이터베이스 연결을 테스트하고 있습니다...
echo.

node src/migrate-cli.js test --query "%config_file%"

if %errorlevel% equ 0 (
    echo.
    echo 데이터베이스 연결 테스트가 성공했습니다.
) else (
    echo.
    echo 데이터베이스 연결에 실패했습니다.
    echo .env 파일의 연결 정보를 확인해주세요.
)

echo.
pause
goto MENU

:MIGRATE
echo.
echo =========================================
echo   데이터 이관 실행
echo =========================================
echo.
echo 주의: 데이터 이관을 실행하기 전에 대상 데이터베이스를 백업해주세요.
echo.
echo 쿼리문정의 파일 경로를 입력하세요 (예: queries/my-config.xml):
set /p config_file=
if "%config_file%"=="" (
    echo 쿼리문정의 파일 경로가 입력되지 않았습니다.
    echo.
    pause
    goto MENU
)

echo.
echo 정말로 데이터 이관을 실행하시겠습니까? (Y/N)
set /p confirm=
if /i "!confirm!" neq "Y" (
    echo 이관이 취소되었습니다.
    echo.
    pause
    goto MENU
)

echo.
echo 데이터 이관을 시작합니다...
echo.
:: Record start time
set start_time=%time%
node src/migrate-cli.js migrate --query "%config_file%"

if %errorlevel% equ 0 (
    echo.
    echo 데이터 이관이 성공적으로 완료되었습니다.
    echo 시작 시간: %start_time%
    echo 완료 시간: %time%
) else (
    echo.
    echo 데이터 이관 중 오류가 발생했습니다.
    echo 로그 파일을 확인해주세요.
)

echo.
pause
goto MENU

:HELP
echo.
echo =========================================
echo   도움말
echo =========================================
echo.

npm run help

echo.
pause
goto MENU

:LOGS
echo.
echo =========================================
echo   로그 파일 보기
echo =========================================
echo.

if not exist "logs" (
    echo 로그 디렉토리가 없습니다.
    echo.
    pause
    goto MENU
)

echo 최근 로그 파일들:
echo.
dir /b /o-d logs\*.log 2>nul

if %errorlevel% neq 0 (
    echo 로그 파일이 없습니다.
    echo.
    pause
    goto MENU
)

echo.
echo 보고 싶은 로그 파일명을 입력하세요 (전체 경로 아님, 파일명만):
set /p logfile=

if exist "logs\%logfile%" (
    echo.
    echo === %logfile% 내용 ===
    echo.
    type "logs\%logfile%"
) else (
    echo 해당 로그 파일을 찾을 수 없습니다.
)

echo.
pause
goto MENU

:EDIT
echo.
echo =========================================
echo   쿼리문정의 파일 편집
echo =========================================
echo.
echo 편집할 파일을 선택하세요:
echo.
echo 1. .env (데이터베이스 연결 설정)
echo 2. 사용자 정의 쿼리문정의 파일 
echo 3. 돌아가기
echo.
set /p edit_choice=선택하세요 (1-3): 

if "%edit_choice%"=="1" (
    if exist ".env" (
        notepad .env
    ) else (
        echo .env 파일이 없습니다. env.example을 복사해서 .env 파일을 만드세요.
        echo.
        echo env.example을 복사하시겠습니까? (Y/N)
        set /p copy_env=
        if /i "!copy_env!"=="Y" (
            copy "env.example" ".env"
            echo .env 파일이 생성되었습니다. 이제 편집하세요.
            notepad .env
        )
    )
) else if "%edit_choice%"=="2" (
    echo.
    echo 편집할 쿼리문정의 파일 경로를 입력하세요:
    set /p edit_file=
    if exist "!edit_file!" (
        notepad "!edit_file!"
    ) else (
        echo 해당 파일을 찾을 수 없습니다: !edit_file!
    )
) else if "%edit_choice%"=="3" (
    goto MENU
) else (
    echo 잘못된 선택입니다.
)

echo.
pause
goto MENU

:EXIT
echo.
echo 프로그램을 종료합니다.
echo.
pause
exit /b 0 