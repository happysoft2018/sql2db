@echo off
chcp 65001 >nul
setlocal

echo.
echo ========================================
echo   MSSQL Data Migrator Release Script
echo   Version 0.8.0
echo ========================================
echo.

set "VERSION=0.8.0"
set "RELEASE_BASE=release"
set "PACKAGE_NAME=sql2db-v%VERSION%"
set "RELEASE_DIR=%RELEASE_BASE%\%PACKAGE_NAME%"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo 📋 Release Information:
echo    Version: %VERSION%
echo    Package: %PACKAGE_NAME%
echo    Build Time: %TIMESTAMP%
echo.

REM Step 1: Clean previous releases
echo 🧹 Step 1: Cleaning previous release...
if exist "%RELEASE_DIR%" (
    rmdir /s /q "%RELEASE_DIR%"
    echo ✅ Previous release cleaned
)

REM Step 2: Build the application
echo.
echo 🔨 Step 2: Building application...
echo.
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed. Release aborted.
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo.

REM Step 3: Create release directory structure
echo 📁 Step 3: Creating release directory structure...
mkdir "%RELEASE_DIR%" 2>nul
mkdir "%RELEASE_DIR%\logs" 2>nul
mkdir "%RELEASE_DIR%\user_manual" 2>nul

echo.
echo 📦 Step 4: Copying files...
echo.

REM Copy executable
if exist "dist\sql2db.exe" (
    copy "dist\sql2db.exe" "%RELEASE_DIR%\" >nul
    echo ✅ Executable copied
) else (
    echo ❌ Executable not found in dist/ folder
    pause
    exit /b 1
)

REM Copy config folder
if exist "config" (
    xcopy "config" "%RELEASE_DIR%\config\" /e /i /h /y >nul
    echo ✅ Config folder copied
)

REM Copy queries folder
if exist "queries" (
    xcopy "queries" "%RELEASE_DIR%\queries\" /e /i /h /y >nul
    echo ✅ Queries folder copied (with sample files)
)

REM Copy examples folder
if exist "examples" (
    xcopy "examples" "%RELEASE_DIR%\examples\" /e /i /h /y >nul
    echo ✅ Examples folder copied
)

REM Copy resources folder
if exist "resources" (
    xcopy "resources" "%RELEASE_DIR%\resources\" /e /i /h /y >nul
    echo ✅ Resources folder copied (SQL scripts)
)

REM Copy documentation files
echo.
echo 📚 Copying documentation...
copy "README*.md" "%RELEASE_DIR%\" >nul 2>&1
copy "USER_MANUAL*.md" "%RELEASE_DIR%\user_manual\" >nul 2>&1
copy "CHANGELOG*.md" "%RELEASE_DIR%\user_manual\" >nul 2>&1
echo ✅ Documentation copied

REM Create launcher scripts
echo.
echo 📝 Creating launcher scripts...

REM run.bat (English version)
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cls
    echo echo.
    echo echo ========================================
    echo echo   MSSQL Data Migration Tool
    echo echo   Version %VERSION%
    echo echo ========================================
    echo echo.
    echo sql2db.exe --lang=en
    echo pause
) > "%RELEASE_DIR%\run.bat"
echo ✅ run.bat created (English)

REM 실행하기.bat (Korean version)
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cls
    echo echo.
    echo echo ========================================
    echo echo   MSSQL 데이터 이관 도구
    echo echo   버전 %VERSION%
    echo echo ========================================
    echo echo.
    echo sql2db.exe --lang=kr
    echo pause
) > "%RELEASE_DIR%\실행하기.bat"
echo ✅ 실행하기.bat created (Korean)

REM Create version info file
echo.
echo 📄 Creating version info...
(
    echo MSSQL Data Migration Tool
    echo Version: %VERSION%
    echo Build Date: %date% %time%
    echo.
    echo Package Contents:
    echo - sql2db.exe : Main executable
    echo - config/dbinfo.json : Database configuration
    echo - queries/ : Query definition files ^(XML/JSON^)
    echo - examples/ : Example query files
    echo - resources/ : SQL resource files
    echo - logs/ : Log output directory
    echo - run.bat : Launcher script ^(English^)
    echo - 실행하기.bat : Launcher script ^(Korean^)
    echo.
    echo Documentation:
    echo - README.md / README_KR.md : Project overview
    echo - USER_MANUAL.md / USER_MANUAL_KR.md : User manual
    echo - CHANGELOG.md / CHANGELOG_KR.md : Version history
    echo.
    echo Key Features:
    echo 1. MSSQL Data Migration
    echo    - High-performance batch processing
    echo    - XML/JSON configuration support
    echo.
    echo 2. Column Overrides
    echo    - Global column value modifications
    echo    - Dynamic variable support
    echo.
    echo 3. Pre/Post Processing
    echo    - Execute SQL scripts before/after migration
    echo    - Transaction support
    echo.
    echo 4. Progress Tracking
    echo    - Real-time migration progress monitoring
    echo    - Resume capability for interrupted migrations
    echo.
    echo 5. DRY RUN Mode
    echo    - Simulation without actual data changes
    echo    - Row count estimation
    echo.
    echo For more information, see USER_MANUAL.md or USER_MANUAL_KR.md
) > "%RELEASE_DIR%\VERSION_INFO.txt"
echo ✅ VERSION_INFO.txt created

REM Step 5: Create release notes
echo.
echo 📝 Step 5: Creating release notes...
(
    echo ========================================
    echo   MSSQL Data Migration Tool
    echo   Release v%VERSION%
    echo ========================================
    echo.
    echo Build Date: %date% %time%
    echo Build ID: %TIMESTAMP%
    echo.
    echo What's New in v0.7.1:
    echo.
    echo [Interactive Application]
    echo • New app.js - User-friendly menu interface
    echo • Multi-language support ^(English/Korean^)
    echo • Numbered file selection for easier use
    echo.
    echo [Enhanced Validation]
    echo • Attribute name validation in XML/JSON
    echo • Comprehensive error messages
    echo • Syntax checking for query definitions
    echo.
    echo [Modular Architecture]
    echo • Refactored into smaller, focused modules
    echo • Improved maintainability and testability
    echo • Better code organization
    echo.
    echo [Core Features]
    echo • MSSQL data migration between databases
    echo • XML/JSON configuration support
    echo • Column value overrides during migration
    echo • Dynamic variable extraction and usage
    echo • Pre/Post processing SQL scripts
    echo • Transaction support for data consistency
    echo • Progress tracking and resume capability
    echo • DRY RUN mode for safe testing
    echo • SELECT * auto-processing with IDENTITY exclusion
    echo.
    echo [Installation]
    echo 1. Extract the package to your desired location
    echo 2. Edit config/dbinfo.json with your database settings
    echo 3. Prepare query definition files in queries/ folder
    echo 4. Run run.bat ^(English^) or 실행하기.bat ^(Korean^)
    echo.
    echo [Quick Start]
    echo 1. Validate Query File: Menu option 1
    echo 2. Test Database Connection: Menu option 2
    echo 3. Execute Data Migration: Menu option 3
    echo 4. Show Help: Menu option 4
    echo.
    echo [Menu Interface]
    echo Interactive menu system for easy operation:
    echo • File selection by number
    echo • Real-time progress display
    echo • English/Korean language support
    echo.
    echo [Documentation]
    echo • USER_MANUAL.md / USER_MANUAL_KR.md - Detailed user guide
    echo • CHANGELOG.md / CHANGELOG_KR.md - Version history
    echo • README.md / README_KR.md - Project overview
    echo.
    echo [Support]
    echo For issues or questions, check the documentation or
    echo visit: https://github.com/mrjung72/sql2db-nodejs
    echo Email: sql2db.nodejs@gmail.com
    echo Website: sql2db.com
    echo.
    echo ========================================
) > "%RELEASE_DIR%\RELEASE_NOTES.txt"
echo ✅ RELEASE_NOTES.txt created

REM Step 6: Create ZIP archive
echo.
echo 📦 Step 6: Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%RELEASE_DIR%' -DestinationPath '%RELEASE_BASE%\%PACKAGE_NAME%.zip' -Force"
if %errorlevel% equ 0 (
    echo ✅ ZIP archive created
) else (
    echo ⚠️  ZIP creation failed, but release folder is ready
)

echo.
echo ========================================
echo ✅ Release Package Created Successfully!
echo ========================================
echo.
echo 📁 Location: %RELEASE_DIR%\
if exist "%RELEASE_BASE%\%PACKAGE_NAME%.zip" (
    echo 📦 ZIP Archive: %RELEASE_BASE%\%PACKAGE_NAME%.zip
)
echo.
echo 📋 Package Contents:
echo    • Executable ^(sql2db.exe^)
echo    • Configuration files
echo    • Query definition files and examples
echo    • SQL resource files
echo    • Complete documentation ^(6 files^)
echo    • Launcher scripts ^(English ^& Korean^)
echo    • Release notes
echo.
echo 🎉 Ready for distribution!
echo.
pause

