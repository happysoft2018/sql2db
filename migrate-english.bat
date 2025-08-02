@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Korean output setup
color 0F

:HEADER
cls
echo.
echo =========================================
echo   MSSQL Data Migration Tool v1.0
echo =========================================
echo.

:: Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed.
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:MENU
echo =========================================
echo   Menu Selection
echo =========================================
echo 1. Validate Configuration File
echo 2. Test Database Connection
echo 3. Execute Data Migration
echo 4. Show Help
echo 0. Exit
echo =========================================
echo.
set /p choice=Select (0-4): 

if "%choice%"=="1" goto VALIDATE
if "%choice%"=="2" goto TEST
if "%choice%"=="3" goto MIGRATE
if "%choice%"=="4" goto HELP
if "%choice%"=="0" goto EXIT

echo Invalid selection. Please try again.
echo.
pause
goto MENU

:VALIDATE
echo.
echo =========================================
echo   Validate Configuration File
echo =========================================
echo.
echo Enter configuration file path (e.g., queries/my-config.xml):
set /p config_file=
if "%config_file%"=="" (
    echo Configuration file path is required.
    echo.
    pause
    goto MENU
)

echo.
echo Validating configuration file...
echo.
node src/migrate-cli.js validate --query "%config_file%"

if %errorlevel% equ 0 (
    echo.
    echo Configuration validation completed successfully.
) else (
    echo.
    echo Configuration file has errors.
)

echo.
pause
goto MENU

:TEST
echo.
echo =========================================
echo   Test Database Connection
echo =========================================
echo.
echo Testing database connection...
echo.

node src/migrate-cli.js list-dbs

if %errorlevel% equ 0 (
    echo.
    echo Database connection test successful.
) else (
    echo.
    echo Database connection failed.
    echo Please check connection info in .env file.
)

echo.
pause
goto MENU

:MIGRATE
echo.
echo =========================================
echo   Execute Data Migration
echo =========================================
echo.
echo Warning: Please backup target database before migration.
echo.
echo Enter configuration file path (e.g., queries/my-config.xml):
set /p config_file=
if "%config_file%"=="" (
    echo Configuration file path is required.
    echo.
    pause
    goto MENU
)

echo.
echo Are you sure you want to execute data migration? (Y/N)
set /p confirm=
if /i "!confirm!" neq "Y" (
    echo Migration cancelled.
    echo.
    pause
    goto MENU
)

echo.
echo Starting data migration...
echo.
:: Record start time
set start_time=%time%
node src/migrate-cli.js migrate --query "%config_file%"

if %errorlevel% equ 0 (
    echo.
    echo Data migration completed successfully.
    echo Start time: %start_time%
    echo End time: %time%
) else (
    echo.
    echo Error occurred during data migration.
    echo Please check log files.
)

echo.
pause
goto MENU

:HELP
echo.
echo =========================================
echo   Help
echo =========================================
echo.

npm run help

echo.
pause
goto MENU

:LOGS
echo.
echo =========================================
echo   View Log Files
echo =========================================
echo.

if not exist "logs" (
    echo Log directory does not exist.
    echo.
    pause
    goto MENU
)

echo Recent log files:
echo.
dir /b /o-d logs\*.log 2>nul

if %errorlevel% neq 0 (
    echo No log files found.
    echo.
    pause
    goto MENU
)

echo.
echo Enter log filename to view (filename only, not full path):
set /p logfile=

if exist "logs\%logfile%" (
    echo.
    echo === %logfile% content ===
    echo.
    type "logs\%logfile%"
) else (
    echo Log file not found.
)

echo.
pause
goto MENU

:EDIT
echo.
echo =========================================
echo   Edit Configuration Files
echo =========================================
echo.
echo Select file to edit:
echo.
echo 1. .env (Database connection settings)
echo 2. Custom configuration file
echo 3. Back to menu
echo.
set /p edit_choice=Select (1-3): 

if "%edit_choice%"=="1" (
    if exist ".env" (
        notepad .env
    ) else (
        echo .env file does not exist. Copy env.example to create .env file.
        echo.
        echo Copy env.example? (Y/N)
        set /p copy_env=
        if /i "!copy_env!"=="Y" (
            copy "env.example" ".env"
            echo .env file created. Now editing...
            notepad .env
        )
    )
) else if "%edit_choice%"=="2" (
    echo.
    echo Enter configuration file path to edit:
    set /p edit_file=
    if exist "!edit_file!" (
        notepad "!edit_file!"
    ) else (
        echo File not found: !edit_file!
    )
) else if "%edit_choice%"=="3" (
    goto MENU
) else (
    echo Invalid selection.
)

echo.
pause
goto MENU

:EXIT
echo.
echo Exiting program.
echo.
pause
exit /b 0 