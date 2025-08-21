@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: English output setup
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
echo 1. Validate Query Definition File Syntax

echo 2. Test DB Connection (including connectivity)

echo 3. Execute Data Migration
echo 4. Show Help
echo 0. Exit
echo =========================================
echo.
set /p choice=Please select (0-4): 

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
echo   Query Definition File Validation
echo =========================================
echo.
echo.
echo Available query definition files:
echo.
if exist "queries\*.xml" (
    for %%f in (queries\*.xml) do echo   - %%f
)
if exist "queries\*.json" (
    for %%f in (queries\*.json) do echo   - %%f
)
echo.
echo Please enter the query definition file path (e.g., queries/my-config.xml):
set /p config_file=
if "%config_file%"=="" (
    echo Query definition file path was not entered.
    echo.
    pause
    goto MENU
)

echo.
echo Validating query definition file...
echo.
node src/migrate-cli.js validate --query "%config_file%"

if %errorlevel% equ 0 (
    echo.
    echo Query definition file validation completed successfully.
) else (
    echo.
    echo There are errors in the query definition file.
)

echo.
pause
goto MENU

:TEST
echo.
echo =========================================
echo   Database Connection Test
echo =========================================
echo.
echo Testing database connection...
echo.

node src/migrate-cli.js list-dbs

if %errorlevel% equ 0 (
    echo.
    echo Database connection test was successful.
) else (
    echo.
    echo Database connection failed.
    echo Please check the connection information in the .env file.
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
echo Available query definition files:
echo.
if exist "queries\*.xml" (
    for %%f in (queries\*.xml) do echo   - %%f
)
if exist "queries\*.json" (
    for %%f in (queries\*.json) do echo   - %%f
)
echo.
echo.
echo Please enter the query definition file path (e.g., queries/my-config.xml):
set /p config_file=
if "%config_file%"=="" (
    echo Query definition file path was not entered.
    echo.
    pause
    goto MENU
)

echo.
echo Do you really want to execute data migration? (Y/N)
set /p confirm=
if /i "!confirm!" neq "Y" (
    echo Migration was cancelled.
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
    echo An error occurred during data migration.
    echo Please check the log files.
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
echo Please enter the log file name you want to view (filename only, not full path):
set /p logfile=

if exist "logs\%logfile%" (
    echo.
    echo === %logfile% content ===
    echo.
    type "logs\%logfile%"
) else (
    echo The specified log file was not found.
)

echo.
pause
goto MENU

:EDIT
echo.
echo =========================================
echo   Edit Query Definition File
echo =========================================
echo.
echo Please select a file to edit:
echo.
echo 1. .env (Database connection settings)
echo 2. Custom query definition file 
echo 3. Go back
echo.
set /p edit_choice=Please select (1-3): 

if "%edit_choice%"=="1" (
    if exist ".env" (
        notepad .env
    ) else (
        echo .env file does not exist. Please copy env.example to create .env file.
        echo.
        echo Do you want to copy env.example? (Y/N)
        set /p copy_env=
        if /i "!copy_env!"=="Y" (
            copy "env.example" ".env"
            echo .env file has been created. You can now edit it.
            notepad .env
        )
    )
) else if "%edit_choice%"=="2" (
    echo.
    echo Please enter the path of the query definition file to edit:
    set /p edit_file=
    if exist "!edit_file!" (
        notepad "!edit_file!"
    ) else (
        echo The specified file was not found: !edit_file!
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
echo Exiting the program.
echo.
pause
exit /b 0
