@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =========================================
echo   isWritable 속성 테스트
echo =========================================
echo.

echo [정보] DB 읽기/쓰기 권한 관리 기능을 테스트합니다.
echo [정보] isWritable=true인 DB만 타겟 DB로 사용할 수 있습니다.
echo.

echo [1단계] 데이터베이스 목록 확인
echo.
echo 사용 가능한 데이터베이스 목록을 조회합니다...
node src/migrate-cli.js list-dbs

if errorlevel 1 (
    echo.
    echo [오류] 데이터베이스 목록 조회에 실패했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo =========================================
echo   읽기 전용 DB를 타겟으로 사용 테스트
echo =========================================
echo.

echo [2단계] 읽기 전용 DB를 타겟으로 설정하여 오류 발생 확인
echo [테스트] prodDB(읽기 전용)를 타겟으로 사용 시도...
echo.

:: 임시 설정 파일 생성 (읽기 전용 DB를 타겟으로 설정)
echo {> temp-readonly-test.json
echo   "databases": {>> temp-readonly-test.json
echo     "source": "sampleDB",>> temp-readonly-test.json
echo     "target": "prodDB">> temp-readonly-test.json
echo   },>> temp-readonly-test.json
echo   "variables": {},>> temp-readonly-test.json
echo   "queries": []>> temp-readonly-test.json
echo }>> temp-readonly-test.json

echo 임시 설정 파일 생성 완료: temp-readonly-test.json
echo 내용: source=sampleDB, target=prodDB(읽기전용)
echo.

node src/migrate-cli.js validate --query temp-readonly-test.json

if errorlevel 1 (
    echo.
    echo ✅ [성공] 읽기 전용 DB를 타겟으로 사용할 때 올바르게 오류가 발생했습니다.
) else (
    echo.
    echo ❌ [실패] 읽기 전용 DB를 타겟으로 사용했는데 오류가 발생하지 않았습니다.
)

echo.
echo =========================================
echo   쓰기 가능 DB를 타겟으로 사용 테스트
echo =========================================
echo.

echo [3단계] 쓰기 가능 DB를 타겟으로 설정하여 정상 작동 확인
echo [테스트] devDB(쓰기 가능)를 타겟으로 사용 시도...
echo.

:: 임시 설정 파일 생성 (쓰기 가능 DB를 타겟으로 설정)
echo {> temp-writable-test.json
echo   "databases": {>> temp-writable-test.json
echo     "source": "prodDB",>> temp-writable-test.json
echo     "target": "devDB">> temp-writable-test.json
echo   },>> temp-writable-test.json
echo   "variables": {},>> temp-writable-test.json
echo   "queries": []>> temp-writable-test.json
echo }>> temp-writable-test.json

echo 임시 설정 파일 생성 완료: temp-writable-test.json
echo 내용: source=devDB, target=devDB(쓰기가능)
echo.

node src/migrate-cli.js validate --query temp-writable-test.json

if errorlevel 1 (
    echo.
    echo ❌ [실패] 쓰기 가능 DB를 타겟으로 사용했는데 오류가 발생했습니다.
) else (
    echo.
    echo ✅ [성공] 쓰기 가능 DB를 타겟으로 사용할 때 정상적으로 처리되었습니다.
)

echo.
echo =========================================
echo   테스트 정리
echo =========================================
echo.

echo 임시 파일을 정리합니다...
if exist temp-readonly-test.json del temp-readonly-test.json
if exist temp-writable-test.json del temp-writable-test.json
echo 정리 완료.

echo.
echo =========================================
echo   테스트 완료
echo =========================================
echo.
echo [결과] isWritable 속성 테스트가 완료되었습니다.
echo [확인] 읽기 전용 DB는 타겟으로 사용할 수 없습니다.
echo [확인] 쓰기 가능 DB만 타겟으로 사용할 수 있습니다.
echo.
echo [사용법]
echo - DB 목록 조회: npm run list-dbs
echo - 권한 변경: config/dbinfo.json에서 isWritable 속성 수정
echo.

echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 