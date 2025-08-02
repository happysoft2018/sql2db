@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo =========================================
echo   DB ID Reference Migration Test
echo =========================================
echo.

echo [INFO] Testing DB ID reference method defined in config/dbinfo.json.
echo [INFO] Specify only DB ID without defining DB connection info directly in config file.
echo.

echo [SELECT] Choose test environment:
echo [1] Development Environment (dev-migration.json)
echo [2] Production Environment (prod-migration.xml)
echo [3] Enter custom config file
echo.
set /p env_choice="Choose (1-3): "

if "!env_choice!"=="1" (
    set "config_file=queries/dev-migration.json"
    set "env_name=Development"
    set "format_name=JSON"
) else if "!env_choice!"=="2" (
    set "config_file=queries/prod-migration.xml"
    set "env_name=Production"
    set "format_name=XML"
) else if "!env_choice!"=="3" (
    echo.
    set /p config_file="Enter config file path: "
    set "env_name=Custom"
    set "format_name=Custom"
) else (
    echo [ERROR] Invalid selection.
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo.
echo [INFO] Selected environment: !env_name! (!format_name! format)
echo [INFO] Config file: !config_file!
echo.

:: 1. Check DB info file
echo ---------------------------------------------------------
echo [Step 0] Checking config/dbinfo.json file...
echo ---------------------------------------------------------

if not exist "config/dbinfo.json" (
    echo [ERROR] config/dbinfo.json file not found.
    echo [NOTE] This file should define DB connection information.
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)
echo [SUCCESS] config/dbinfo.json file exists.
echo.

:: 2. Config file validation
echo ---------------------------------------------------------
echo [Step 1] Validating config file...
echo ---------------------------------------------------------

node src/migrate-cli.js validate --query !config_file!
if errorlevel 1 (
    echo.
    echo [ERROR] Config file validation failed.
    echo [NOTE] Check if DB ID referenced in config file is defined in config/dbinfo.json.
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo.
echo [SUCCESS] Config file validation completed.
echo [INFO] DB ID reference parsed correctly.
echo.

:: 3. Database connection test
echo ---------------------------------------------------------
echo [Step 2] Testing database connection...
echo ---------------------------------------------------------
echo [INFO] Testing connection info retrieved by DB ID from config/dbinfo.json.

node src/migrate-cli.js test --query !config_file!
if errorlevel 1 (
    echo.
    echo [ERROR] Database connection test failed.
    echo [NOTE] Check DB connection info in config/dbinfo.json:
    echo        - Verify server address and port
    echo        - Verify database name
    echo        - Verify user account and password
    echo        - Check network connection
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo.
echo [SUCCESS] Database connection test completed.
echo [INFO] Connection via DB ID reference is working properly.
echo.

:: 4. Actual migration execution confirmation
echo [Step 3] Do you want to execute data migration?
echo [WARNING] Actual data will be changed in target DB defined in config/dbinfo.json.
echo [Environment] !env_name! (!format_name! format)
set /p confirm="Enter 'Y' to execute actual data migration (Y/N): "

if /i "!confirm!"=="Y" (
    echo.
    echo [Step 3] Executing data migration using DB ID reference method...
    node src/migrate-cli.js migrate --query !config_file!
    
    if errorlevel 1 (
        echo.
        echo [ERROR] Error occurred during data migration execution.
        echo.
        echo Press any key to close...
        pause >nul
        exit /b 1
    )
    
    echo.
    echo [SUCCESS] Data migration using DB ID reference method completed!
    echo [INFO] Migration successfully completed with DB info retrieved from config/dbinfo.json.
    echo.
) else (
    echo.
    echo [INFO] Data migration skipped.
    echo.
)

echo =========================================
echo   DB ID Reference Method Test Complete
echo =========================================
echo.
echo [NOTE] Advantages of DB ID reference method:
echo        ✅ Centralized DB connection info management
echo        ✅ Simplified config files (specify only DB ID)
echo        ✅ Enhanced security (manage sensitive info in separate file)
echo        ✅ Reusability (use same DB in multiple configurations)
echo        ✅ Environment separation (separate DB settings for dev, prod, etc.)
echo.
echo Press any key to close...
pause >nul 