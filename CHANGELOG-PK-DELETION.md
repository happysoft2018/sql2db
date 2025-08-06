# Primary Key 기반 삭제 기능 변경사항

## 🔄 주요 변경사항

### 1. deleteWhere 기능 제거
- XML 설정에서 `<deleteWhere>` 섹션 완전 제거
- 복잡한 삭제 조건 대신 Primary Key 기반의 정확한 삭제로 변경

### 2. Primary Key 기반 삭제 구현
- `deleteBeforeInsert="true"`일 때 소스 데이터의 PK 값으로 타겟 데이터 삭제
- 단일 PK와 복합 PK 모두 지원
- 매개변수화된 쿼리로 SQL 인젝션 방지

### 3. 새로운 삭제 메서드
- `deleteFromTargetByPK()`: PK 기반 정확한 삭제
- `deleteAllFromTarget()`: FK 순서 고려시 전체 삭제

## 🎯 장점

### 이전 방식 (deleteWhere)
```xml
<deleteWhere>
  <![CDATA[WHERE created_date >= '${startDate}' AND created_date <= '${endDate}']]>
</deleteWhere>
```
- ❌ 조건에 맞는 모든 데이터 삭제 (오버삭제 위험)
- ❌ 소스에 없는 데이터도 삭제될 수 있음
- ❌ 복잡한 조건 관리 필요

### 새로운 방식 (PK 기반)
```xml
<query primaryKey="user_id" deleteBeforeInsert="true">
  <!-- 소스 데이터의 user_id 값들만 정확히 삭제 -->
</query>
```
- ✅ 소스 데이터에 해당하는 행만 정확히 삭제
- ✅ 오버삭제 방지
- ✅ 설정 간소화
- ✅ 안전한 이관 보장

## 🔧 기술적 구현

### 단일 PK 삭제
```sql
-- user_id가 1,2,3인 소스 데이터가 있을 때
DELETE FROM users WHERE user_id IN (@pk_0, @pk_1, @pk_2)
```

### 복합 PK 삭제
```sql
-- (order_id=100, line_no=1), (order_id=100, line_no=2) 소스 데이터가 있을 때
DELETE FROM order_lines 
WHERE (order_id = @pk_order_id_0 AND line_no = @pk_line_no_0) 
   OR (order_id = @pk_order_id_1 AND line_no = @pk_line_no_1)
```

## 📋 마이그레이션 가이드

### 기존 XML 설정 수정
1. 모든 `<deleteWhere>` 섹션 제거
2. `primaryKey` 속성이 정확히 설정되어 있는지 확인
3. 복합 PK인 경우 `primaryKey="order_id,line_no"` 형태로 설정

### 예시
```xml
<!-- 변경 전 -->
<query id="migrate_users" primaryKey="user_id" deleteBeforeInsert="true">
  <sourceQuery>SELECT * FROM users WHERE created_date >= '2024-01-01'</sourceQuery>
  <deleteWhere>
    <![CDATA[WHERE created_date >= '2024-01-01']]>
  </deleteWhere>
</query>

<!-- 변경 후 -->
<query id="migrate_users" primaryKey="user_id" deleteBeforeInsert="true">
  <sourceQuery>SELECT * FROM users WHERE created_date >= '2024-01-01'</sourceQuery>
  <!-- deleteWhere 제거됨 - PK 기준으로 자동 삭제 -->
</query>
```

## 🚀 개선된 동작 방식

1. **소스 데이터 조회**: `SELECT * FROM users WHERE created_date >= '2024-01-01'`
2. **PK 값 추출**: [1, 2, 3, 5, 7] 
3. **타겟 데이터 삭제**: `DELETE FROM users WHERE user_id IN (1, 2, 3, 5, 7)`
4. **데이터 이관**: 소스 데이터를 타겟에 INSERT

이제 조건에 맞는 모든 데이터가 아닌, 실제 이관할 데이터에 해당하는 행만 정확히 삭제됩니다.