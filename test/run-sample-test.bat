@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   샘플 테이블 마이그레이션 테스트
echo =========================================
echo.

echo [정보] 샘플 테이블을 생성하고 데이터 마이그레이션 테스트를 실행합니다.
echo [경고] 이 스크립트는 다음 작업을 수행합니다:
echo        - 샘플 테이블 생성 (기존 테이블 삭제됨)
echo        - 샘플 데이터 입력
echo        - 마이그레이션 테스트 실행
echo.

set /p confirm="계속 진행하시겠습니까? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo 사용자가 취소했습니다.
    pause
    exit /b 0
)

echo.
echo =========================================
echo   1단계: 샘플 테이블 생성
echo =========================================
echo.

echo [실행] 샘플 테이블을 생성합니다...
echo [파일] test/create-sample-tables.sql
echo.

:: SQLCMD로 테이블 생성 스크립트 실행
if exist "create-sample-tables.sql" (
    echo SQL 스크립트를 찾았습니다. 실행합니다...
    echo.
    
    :: SQL 스크립트 실행 (연결 정보는 환경에 맞게 수정)
    echo [참고] SQL 스크립트를 수동으로 실행하거나 적절한 DB 연결 정보로 수정하세요.
    echo [명령] sqlcmd -S "서버명" -d "데이터베이스명" -i "test\create-sample-tables.sql"
    echo.
    
    set /p run_sql="SQL 스크립트를 이미 실행했습니까? (Y/N): "
    if /i not "%run_sql%"=="Y" (
        echo SQL 스크립트를 먼저 실행하고 다시 시도하세요.
        echo 스크립트 위치: test\create-sample-tables.sql
        pause
        exit /b 1
    )
) else (
    echo [오류] 테이블 생성 스크립트를 찾을 수 없습니다: test\create-sample-tables.sql
    pause
    exit /b 1
)

echo.
echo =========================================
echo   2단계: 샘플 데이터 입력
echo =========================================
echo.

echo [실행] 샘플 데이터를 입력합니다...
echo [파일] test/insert-sample-data.sql
echo.

if exist "test\insert-sample-data.sql" (
    echo SQL 스크립트를 찾았습니다.
    echo.
    
    echo [참고] 데이터 입력 스크립트를 실행하세요.
    echo [명령] sqlcmd -S "서버명" -d "데이터베이스명" -i "test\insert-sample-data.sql"
    echo.
    
    set /p run_data="데이터 입력 스크립트를 이미 실행했습니까? (Y/N): "
    if /i not "%run_data%"=="Y" (
        echo 데이터 입력 스크립트를 먼저 실행하고 다시 시도하세요.
        echo 스크립트 위치: test\insert-sample-data.sql
        pause
        exit /b 1
    )
) else (
    echo [오류] 데이터 입력 스크립트를 찾을 수 없습니다: test\insert-sample-data.sql
    pause
    exit /b 1
)

echo.
echo =========================================
echo   3단계: 마이그레이션 설정 검증
echo =========================================
echo.

echo [실행] 샘플 마이그레이션 설정을 검증합니다...
echo [설정] test/sample-migration-test.json
echo.

if exist "test\sample-migration-test.json" (
    node ..\src\migrate-cli.js validate --query test\sample-migration-test.json
    
    if errorlevel 1 (
        echo.
        echo [오류] 마이그레이션 설정 검증에 실패했습니다.
        echo.
        echo 아무 키나 누르면 창이 닫힙니다...
        pause >nul
        exit /b 1
    )
    
    echo.
    echo ✅ 마이그레이션 설정 검증 성공!
) else (
    echo [오류] 마이그레이션 쿼리문정의 파일 을 찾을 수 없습니다: test\sample-migration-test.json
    pause
    exit /b 1
)

echo.
echo =========================================
echo   4단계: DRY RUN 테스트
echo =========================================
echo.

echo [실행] DRY RUN 모드로 마이그레이션을 시뮬레이션합니다...
echo [모드] 실제 데이터 변경 없이 검증만 수행
echo.

node ..\src\migrate-cli.js migrate --query test\sample-migration-test.json --dry-run

if errorlevel 1 (
    echo.
    echo [오류] DRY RUN 테스트에 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo ✅ DRY RUN 테스트 성공!

echo.
echo =========================================
echo   5단계: 실제 마이그레이션 실행
echo =========================================
echo.

echo [확인] 실제 마이그레이션을 실행하시겠습니까?
echo [경고] 타겟 데이터베이스의 데이터가 변경됩니다!
echo.

set /p run_migration="실제 마이그레이션을 실행하시겠습니까? (Y/N): "
if /i not "%run_migration%"=="Y" (
    echo.
    echo [완료] DRY RUN 테스트까지 완료되었습니다.
    echo [참고] 실제 마이그레이션을 원하면 다음 명령을 실행하세요:
    echo        node ..\src\migrate-cli.js migrate --query test\sample-migration-test.json
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 0
)

echo.
echo [실행] 실제 마이그레이션을 시작합니다...
echo.

node ..\src\migrate-cli.js migrate --query test\sample-migration-test.json

if errorlevel 1 (
    echo.
    echo [오류] 마이그레이션 실행에 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo =========================================
echo   테스트 완료
echo =========================================
echo.

echo ✅ 샘플 테이블 마이그레이션 테스트가 성공적으로 완료되었습니다!
echo.

echo 📊 수행된 작업:
echo   1. ✅ 샘플 테이블 생성 (8개 테이블)
echo   2. ✅ 샘플 데이터 입력 (실제적인 테스트 데이터)
echo   3. ✅ 마이그레이션 설정 검증
echo   4. ✅ DRY RUN 시뮬레이션
echo   5. ✅ 실제 마이그레이션 실행
echo.

echo 🎯 테스트된 기능:
echo   - 🔗 외래키 관계 처리
echo   - 📊 동적 변수 추출
echo   - 🎯 조건부 데이터 필터링
echo   - 🛡️ isWritable 권한 검증
echo   - 📋 복잡한 JOIN 쿼리
echo   - 🕒 날짜 기반 필터링
echo.

echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 