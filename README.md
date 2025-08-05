# MSSQL 데이터 이관 도구

원격 MSSQL 소스 데이터베이스의 데이터를 다른 원격 MSSQL 데이터베이스로 이관하는 Node.js 기반 도구입니다.

## 주요 기능

- ✅ **MSSQL 간 데이터 이관**: 고성능 배치 처리
- ✅ **XML/JSON 설정 지원**: 유연한 설정 형식 선택
- ✅ **컬럼 오버라이드**: 이관 시 컬럼값 변경/추가
- ✅ **전처리/후처리**: 이관 전후 SQL 스크립트 실행
- ✅ **동적 변수**: 실행 시점 데이터 추출 및 활용
- ✅ **트랜잭션 지원**: 데이터 일관성 보장
- ✅ **상세 로깅**: 5단계 로그 레벨 시스템
- ✅ **DRY RUN 모드**: 실제 변경 없이 시뮬레이션

## 빠른 시작

### 1. 설치
```bash
npm install
```

### 2. 데이터베이스 연결 설정
`config/dbinfo.json` 파일 생성:
```json
{
  "dbs": {
    "sourceDB": {
      "server": "source-server.com",
      "database": "source_db",
      "user": "username",
      "password": "password",
      "isWritable": false
    },
    "targetDB": {
      "server": "target-server.com",
      "database": "target_db", 
      "user": "username",
      "password": "password",
      "isWritable": true
    }
  }
}
```

### 3. 기본 실행
```bash
# Windows 사용자 (권장)
migrate.bat

# 명령줄 사용자
node src/migrate-cli.js migrate --query ./queries/migration-queries.xml
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `migrate.bat` | 대화형 메뉴 인터페이스 |
| `node src/migrate-cli.js validate` | 설정 검증 |
| `node src/migrate-cli.js test` | 연결 테스트 |
| `node src/migrate-cli.js migrate --dry-run` | 시뮬레이션 실행 |
| `node src/migrate-cli.js list-dbs` | DB 목록 조회 |

## 설정 파일 형식

### XML 형식 (권장)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<migration>
  <settings>
    <sourceDatabase>sourceDB</sourceDatabase>
    <targetDatabase>targetDB</targetDatabase>
    <batchSize>1000</batchSize>
  </settings>
  
  <queries>
    <query id="migrate_users" targetTable="users" enabled="true">
      <sourceQuery>
        <![CDATA[SELECT * FROM users WHERE status = 'ACTIVE']]>
      </sourceQuery>
      
      <columnOverrides>
        <override column="migration_flag">1</override>
        <override column="updated_by">MIGRATION_TOOL</override>
      </columnOverrides>
    </query>
  </queries>
</migration>
```

### JSON 형식
```json
{
  "databases": {
    "source": "sourceDB",
    "target": "targetDB"
  },
  "queries": [
    {
      "id": "migrate_users",
      "sourceQuery": "SELECT * FROM users WHERE status = 'ACTIVE'",
      "targetTable": "users",
      "enabled": true
    }
  ]
}
```

## 문서

- 📖 **[사용자 매뉴얼](USER_MANUAL.md)**: 완전한 사용 가이드
- 📋 **[설치 가이드](INSTALLATION_GUIDE.md)**: 상세 설치 방법
- 🔄 **[변경 이력](CHANGELOG.md)**: 버전별 변경사항
- 🏗️ **[구현 요약](IMPLEMENTATION_SUMMARY.md)**: 기술적 구현 내용

## 테스트

프로젝트에는 다양한 기능을 테스트할 수 있는 배치 파일들이 포함되어 있습니다:

```bash
test-xml-migration.bat      # XML 설정 테스트
test-dry-run.bat           # DRY RUN 모드 테스트
test-dbid-migration.bat    # DB ID 참조 테스트
test-log-levels.bat        # 로그 레벨 테스트
```

## 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 지원

- 💬 **이슈 리포트**: [GitHub Issues](https://github.com/your-repo/issues)
- 📚 **문서**: 프로젝트 루트의 문서들 참조
- 🔧 **버그 수정**: Pull Request로 기여

## 라이선스

MIT License

Copyright (c) 2024 MSSQL 데이터 이관 도구

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**버전**: v1.0.0 | **최종 업데이트**: 2025-08-08