const sql = require('mssql');
require('dotenv').config();

class MSSQLConnectionManager {
    constructor() {
        this.sourcePool = null;
        this.targetPool = null;
        this.isSourceConnected = false;
        this.isTargetConnected = false;
        this.customSourceConfig = null;
        this.customTargetConfig = null;
        this.tableColumnCache = {}; // 테이블 컬럼 정보 캐시
    }

    // 커스텀 DB 설정 지정
    setCustomDatabaseConfigs(sourceConfig, targetConfig) {
        this.customSourceConfig = sourceConfig;
        this.customTargetConfig = targetConfig;
    }

    // 소스 데이터베이스 연결 설정
    getDBConfig(dbConfig) {

        return {
            server: dbConfig.server,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.user,
            password: dbConfig.password,
            options: {
                encrypt: dbConfig.options?.encrypt ?? true,
                trustServerCertificate: dbConfig.options?.trustServerCertificate ?? true,
                enableArithAbort: dbConfig.options?.enableArithAbort ?? true,
                requestTimeout: dbConfig.options?.requestTimeout ?? 300000,
                connectionTimeout: dbConfig.options?.connectionTimeout ?? 30000
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };
    }

    // 소스 데이터베이스 연결
    async connectSource() {
        try {
            if (this.sourcePool && this.isSourceConnected) {
                console.log('소스 데이터베이스가 이미 연결되어 있습니다.');
                return this.sourcePool;
            }

            const config = this.getDBConfig(this.customSourceConfig);
            console.log(`소스 데이터베이스에 연결 중... (${config.server}:${config.port}/${config.database})`);
            
            this.sourcePool = new sql.ConnectionPool(config);
            await this.sourcePool.connect();
            this.isSourceConnected = true;
            
            console.log('소스 데이터베이스 연결 성공!');
            return this.sourcePool;
        } catch (error) {
            console.error('소스 데이터베이스 연결 실패:', error.message);
            throw new Error(`소스 데이터베이스 연결 실패: ${error.message}`);
        }
    }

    // 대상 데이터베이스 연결
    async connectTarget() {
        try {
            if (this.targetPool && this.isTargetConnected) {
                console.log('대상 데이터베이스가 이미 연결되어 있습니다.');
                return this.targetPool;
            }

            const config = this.getDBConfig(this.customTargetConfig);
            console.log(`대상 데이터베이스에 연결 중... (${config.server}:${config.port}/${config.database})`);
            
            this.targetPool = new sql.ConnectionPool(config);
            await this.targetPool.connect();
            this.isTargetConnected = true;
            
            console.log('대상 데이터베이스 연결 성공!');
            return this.targetPool;
        } catch (error) {
            console.error('대상 데이터베이스 연결 실패:', error.message);
            throw new Error(`대상 데이터베이스 연결 실패: ${error.message}`);
        }
    }

    // 양쪽 데이터베이스 모두 연결
    async connectBoth() {
        await this.connectSource();
        await this.connectTarget();
        return {
            source: this.sourcePool,
            target: this.targetPool
        };
    }

    // 소스 데이터베이스에서 데이터 조회
    async querySource(query) {
        try {
            if (!this.isSourceConnected) {
                await this.connectSource();
            }
            
            const request = this.sourcePool.request();
            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('소스 데이터베이스 쿼리 실행 실패:', error.message);
            throw new Error(`소스 데이터베이스 쿼리 실행 실패: ${error.message}`);
        }
    }

    // 대상 데이터베이스에 데이터 삽입
    async insertToTarget(tableName, columns, data) {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }

            if (!data || data.length === 0) {
                console.log('삽입할 데이터가 없습니다.');
                return { rowsAffected: [0] };
            }

            const request = this.targetPool.request();
            
            // 파라미터화된 쿼리 생성
            const placeholders = columns.map((_, index) => `@param${index}`).join(', ');
            const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            let totalRowsAffected = 0;
            
            for (const row of data) {
                // 각 행에 대해 파라미터 설정
                columns.forEach((column, index) => {
                    request.input(`param${index}`, row[column]);
                });
                
                const result = await request.query(insertQuery);
                totalRowsAffected += result.rowsAffected[0];
                
                // 다음 쿼리를 위해 파라미터 초기화
                request.parameters = {};
            }
            
            return { rowsAffected: [totalRowsAffected] };
        } catch (error) {
            console.error('대상 데이터베이스 삽입 실패:', error.message);
            throw new Error(`대상 데이터베이스 삽입 실패: ${error.message}`);
        }
    }

    // 테이블 컬럼 캐시 초기화
    clearTableColumnCache() {
        this.tableColumnCache = {};
        console.log('🗑️ 테이블 컬럼 캐시 초기화 완료 (Identity Column 제외 적용)');
    }

    // 테이블 컬럼 캐시 통계 조회
    getTableColumnCacheStats() {
        const cacheKeys = Object.keys(this.tableColumnCache);
        const stats = {
            cachedTables: cacheKeys.length,
            cacheKeys: cacheKeys,
            totalColumns: 0
        };
        
        cacheKeys.forEach(key => {
            const columns = this.tableColumnCache[key];
            if (Array.isArray(columns)) {
                stats.totalColumns += columns.length;
            }
        });
        
        console.log(`📊 테이블 컬럼 캐시 통계: ${stats.cachedTables}개 테이블, ${stats.totalColumns}개 컬럼`);
        return stats;
    }

    // 테이블 컬럼 정보 조회 (캐시 적용)
    async getTableColumns(tableName, isSource = false) {
        try {
            // 캐시 키 생성 (테이블명 + 데이터베이스 타입)
            const cacheKey = `${tableName}_${isSource ? 'source' : 'target'}`;
            
            // 캐시에서 먼저 확인
            if (this.tableColumnCache[cacheKey]) {
                console.log(`📋 캐시에서 테이블 컬럼 정보 사용: ${tableName} (${isSource ? '소스' : '대상'})`);
                return this.tableColumnCache[cacheKey];
            }
            
            const pool = isSource ? this.sourcePool : this.targetPool;
            const connectionType = isSource ? '소스' : '대상';
            
            if (!pool || !(isSource ? this.isSourceConnected : this.isTargetConnected)) {
                if (isSource) {
                    await this.connectSource();
                } else {
                    await this.connectTarget();
                }
            }

            const request = (isSource ? this.sourcePool : this.targetPool).request();
            const query = `
                SELECT 
                    c.COLUMN_NAME, 
                    c.DATA_TYPE, 
                    c.IS_NULLABLE, 
                    c.COLUMN_DEFAULT,
                    c.ORDINAL_POSITION
                FROM INFORMATION_SCHEMA.COLUMNS c
                INNER JOIN sys.columns sc ON c.COLUMN_NAME = sc.name 
                    AND c.TABLE_NAME = OBJECT_NAME(sc.object_id)
                WHERE c.TABLE_NAME = '${tableName}'
                    AND sc.is_computed = 0  -- Computed Column 제외
                    AND sc.is_identity = 0  -- Identity Column 제외
                    AND c.DATA_TYPE NOT IN ('varbinary', 'binary', 'image')  -- VARBINARY 컬럼 제외
                ORDER BY c.ORDINAL_POSITION
            `;
            
            console.log(`🔍 ${connectionType} 데이터베이스에서 테이블 컬럼 정보 조회: ${tableName} - Identity Column 제외`);
            const result = await request.query(query);
            
            const columns = result.recordset.map(row => ({
                name: row.COLUMN_NAME,
                dataType: row.DATA_TYPE,
                isNullable: row.IS_NULLABLE === 'YES',
                defaultValue: row.COLUMN_DEFAULT
            }));
            
            // 캐시에 저장
            this.tableColumnCache[cacheKey] = columns;
            console.log(`💾 테이블 컬럼 정보 캐시 저장: ${tableName} (${connectionType}) - ${columns.length}개 컬럼`);
            
            return columns;
        } catch (error) {
            console.error(`테이블 컬럼 정보 조회 실패 (${tableName}):`, error.message);
            throw new Error(`테이블 컬럼 정보 조회 실패: ${error.message}`);
        }
    }

    // 대상 데이터베이스에서 테이블 데이터 삭제 (PK 기준)
    async deleteFromTargetByPK(tableName, identityColumns, sourceData) {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }

            if (!sourceData || sourceData.length === 0) {
                console.log(`소스 데이터가 없어 ${tableName} 테이블 삭제를 건너뜁니다.`);
                return { rowsAffected: [0] };
            }

            // PK 값들 추출
            const pkValues = [];
            sourceData.forEach(row => {
                if (Array.isArray(identityColumns)) {
                    // 복합 키인 경우
                    const pkSet = {};
                    identityColumns.forEach(pk => {
                        pkSet[pk] = row[pk];
                    });
                    pkValues.push(pkSet);
                } else {
                    // 단일 키인 경우
                    if (row[identityColumns] !== undefined && row[identityColumns] !== null) {
                        pkValues.push(row[identityColumns]);
                    }
                }
            });

            if (pkValues.length === 0) {
                console.log(`유효한 PK 값이 없어 ${tableName} 테이블 삭제를 건너뜁니다.`);
                return { rowsAffected: [0] };
            }

            let deleteQuery;
            const request = this.targetPool.request();

            if (Array.isArray(identityColumns)) {
                // 복합 키인 경우
                const conditions = pkValues.map((pkSet, index) => {
                    const conditions = identityColumns.map(pk => {
                        const paramName = `pk_${pk}_${index}`;
                        const value = pkSet[pk];
                        if (typeof value === 'string') {
                            request.input(paramName, sql.NVarChar, value);
                        } else if (typeof value === 'number') {
                            request.input(paramName, sql.Int, value);
                        } else {
                            request.input(paramName, sql.Variant, value);
                        }
                        return `${pk} = @${paramName}`;
                    }).join(' AND ');
                    return `(${conditions})`;
                }).join(' OR ');
                
                deleteQuery = `DELETE FROM ${tableName} WHERE ${conditions}`;
            } else {
                // 단일 키인 경우
                if (pkValues.length === 1) {
                    const value = pkValues[0];
                    if (typeof value === 'string') {
                        request.input('pk_value', sql.NVarChar, value);
                    } else if (typeof value === 'number') {
                        request.input('pk_value', sql.Int, value);
                    } else {
                        request.input('pk_value', sql.Variant, value);
                    }
                    deleteQuery = `DELETE FROM ${tableName} WHERE ${identityColumns} = @pk_value`;
                } else {
                    // 여러 PK 값들을 IN절로 처리
                    const inClause = pkValues.map((value, index) => {
                        const paramName = `pk_${index}`;
                        if (typeof value === 'string') {
                            request.input(paramName, sql.NVarChar, value);
                        } else if (typeof value === 'number') {
                            request.input(paramName, sql.Int, value);
                        } else {
                            request.input(paramName, sql.Variant, value);
                        }
                        return `@${paramName}`;
                    }).join(', ');
                    
                    deleteQuery = `DELETE FROM ${tableName} WHERE ${identityColumns} IN (${inClause})`;
                }
            }
            
            console.log(`대상 테이블 PK 기준 데이터 삭제 중: ${tableName} (${pkValues.length}개 행 대상)`);
            const result = await request.query(deleteQuery);
            
            console.log(`삭제된 행 수: ${result.rowsAffected[0]}`);
            return result;
        } catch (error) {
            console.error('대상 데이터베이스 PK 기준 삭제 실패:', error.message);
            throw new Error(`대상 데이터베이스 PK 기준 삭제 실패: ${error.message}`);
        }
    }

    // 대상 데이터베이스에서 테이블 전체 삭제 (FK 순서 고려시 사용)
    async deleteAllFromTarget(tableName) {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }

            const request = this.targetPool.request();
            const deleteQuery = `DELETE FROM ${tableName}`;
            
            console.log(`대상 테이블 전체 데이터 삭제 중: ${deleteQuery}`);
            const result = await request.query(deleteQuery);
            
            console.log(`삭제된 행 수: ${result.rowsAffected[0]}`);
            return result;
        } catch (error) {
            console.error('대상 데이터베이스 전체 삭제 실패:', error.message);
            throw new Error(`대상 데이터베이스 전체 삭제 실패: ${error.message}`);
        }
    }

    // 트랜잭션 시작
    async beginTransaction() {
        try {
            if (!this.isTargetConnected) {
                await this.connectTarget();
            }
            
            const transaction = new sql.Transaction(this.targetPool);
            await transaction.begin();
            return transaction;
        } catch (error) {
            console.error('트랜잭션 시작 실패:', error.message);
            throw new Error(`트랜잭션 시작 실패: ${error.message}`);
        }
    }

    // 연결 종료
    async closeConnections() {
        try {
            if (this.sourcePool && this.isSourceConnected) {
                await this.sourcePool.close();
                this.isSourceConnected = false;
                console.log('소스 데이터베이스 연결 종료');
            }
            
            if (this.targetPool && this.isTargetConnected) {
                await this.targetPool.close();
                this.isTargetConnected = false;
                console.log('대상 데이터베이스 연결 종료');
            }
        } catch (error) {
            console.error('데이터베이스 연결 종료 중 오류:', error.message);
        }
    }

    // 연결 상태 확인
    getConnectionStatus() {
        return {
            source: this.isSourceConnected,
            target: this.isTargetConnected
        };
    }

    // 테이블 간 FK 참조 관계 조회
    async getForeignKeyRelations(isSource = false) {
        try {
            const pool = isSource ? this.sourcePool : this.targetPool;
            const connectionType = isSource ? '소스' : '대상';
            
            if (!pool || !(isSource ? this.isSourceConnected : this.isTargetConnected)) {
                if (isSource) {
                    await this.connectSource();
                } else {
                    await this.connectTarget();
                }
            }

            const request = (isSource ? this.sourcePool : this.targetPool).request();
            const query = `
                SELECT 
                    fk.name AS foreign_key_name,
                    tp.name AS parent_table,
                    cp.name AS parent_column,
                    tr.name AS referenced_table,
                    cr.name AS referenced_column,
                    fk.delete_referential_action_desc,
                    fk.update_referential_action_desc
                FROM sys.foreign_keys fk
                INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
                INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
                INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
                INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
                ORDER BY tp.name, fk.name
            `;
            
            console.log(`${connectionType} DB의 FK 참조 관계 조회 중...`);
            const result = await request.query(query);
            
            const relations = result.recordset.map(row => ({
                foreignKeyName: row.foreign_key_name,
                parentTable: row.parent_table,
                parentColumn: row.parent_column,
                referencedTable: row.referenced_table,
                referencedColumn: row.referenced_column,
                deleteAction: row.delete_referential_action_desc,
                updateAction: row.update_referential_action_desc
            }));

            console.log(`${connectionType} DB에서 ${relations.length}개의 FK 관계 발견`);
            return relations;
        } catch (error) {
            console.error(`${connectionType} FK 관계 조회 실패:`, error.message);
            throw new Error(`${connectionType} FK 관계 조회 실패: ${error.message}`);
        }
    }

    // 테이블 삭제 순서 계산 (토폴로지 정렬)
    async calculateTableDeletionOrder(tableNames, isSource = false) {
        try {
            console.log(`테이블 삭제 순서 계산 중... (테이블 수: ${tableNames.length})`);
            
            // FK 관계 조회
            const fkRelations = await this.getForeignKeyRelations(isSource);
            
            // 관련된 테이블들만 필터링
            const relevantRelations = fkRelations.filter(rel => 
                tableNames.includes(rel.parentTable) && tableNames.includes(rel.referencedTable)
            );

            console.log(`관련 FK 관계 수: ${relevantRelations.length}`);

            // 의존성 그래프 생성
            const dependencies = new Map();
            const inDegree = new Map();
            
            // 모든 테이블 초기화
            tableNames.forEach(table => {
                dependencies.set(table, []);
                inDegree.set(table, 0);
            });

            // FK 관계를 기반으로 의존성 그래프 구성
            relevantRelations.forEach(rel => {
                // CASCADE 삭제가 아닌 경우에만 의존성 추가
                if (rel.deleteAction !== 'CASCADE') {
                    // parent가 referenced를 참조하므로, parent를 먼저 삭제해야 함
                    dependencies.get(rel.referencedTable).push(rel.parentTable);
                    inDegree.set(rel.parentTable, inDegree.get(rel.parentTable) + 1);
                }
            });

            // 토폴로지 정렬 수행
            const result = [];
            const queue = [];
            
            // 진입 차수가 0인 테이블들을 큐에 추가
            inDegree.forEach((degree, table) => {
                if (degree === 0) {
                    queue.push(table);
                }
            });

            while (queue.length > 0) {
                const currentTable = queue.shift();
                result.push(currentTable);

                // 현재 테이블에 의존하는 테이블들의 진입 차수 감소
                dependencies.get(currentTable).forEach(dependentTable => {
                    inDegree.set(dependentTable, inDegree.get(dependentTable) - 1);
                    if (inDegree.get(dependentTable) === 0) {
                        queue.push(dependentTable);
                    }
                });
            }

            // 순환 참조 확인
            if (result.length !== tableNames.length) {
                const remainingTables = tableNames.filter(table => !result.includes(table));
                console.warn(`⚠️ 순환 참조가 감지된 테이블들: ${remainingTables.join(', ')}`);
                console.warn('이 테이블들은 FK 제약 조건을 일시적으로 비활성화해야 할 수 있습니다.');
                
                // 순환 참조가 있는 테이블들을 결과에 추가
                result.push(...remainingTables);
            }

            console.log(`계산된 테이블 삭제 순서: ${result.join(' → ')}`);
            
            return {
                order: result,
                hasCircularReference: result.length !== tableNames.length,
                circularTables: result.length !== tableNames.length ? 
                    tableNames.filter(table => !result.includes(table)) : [],
                fkRelations: relevantRelations
            };

        } catch (error) {
            console.error('테이블 삭제 순서 계산 실패:', error.message);
            throw new Error(`테이블 삭제 순서 계산 실패: ${error.message}`);
        }
    }

    // FK 제약 조건 비활성화/활성화
    async toggleForeignKeyConstraints(enable = true, isSource = false) {
        try {
            const pool = isSource ? this.sourcePool : this.targetPool;
            const connectionType = isSource ? '소스' : '대상';
            const action = enable ? '활성화' : '비활성화';
            
            if (!pool || !(isSource ? this.isSourceConnected : this.isTargetConnected)) {
                if (isSource) {
                    await this.connectSource();
                } else {
                    await this.connectTarget();
                }
            }

            const request = (isSource ? this.sourcePool : this.targetPool).request();
            
            // 모든 FK 제약 조건 활성화/비활성화
            const toggleCommand = enable ? 'CHECK' : 'NOCHECK';
            const query = `
                DECLARE @sql NVARCHAR(MAX) = '';
                SELECT @sql = @sql + 'ALTER TABLE [' + SCHEMA_NAME(t.schema_id) + '].[' + t.name + '] ${toggleCommand} CONSTRAINT [' + fk.name + '];' + CHAR(13)
                FROM sys.foreign_keys fk
                INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id;
                EXEC sp_executesql @sql;
            `;
            
            console.log(`${connectionType} DB의 FK 제약 조건 ${action} 중...`);
            await request.query(query);
            console.log(`${connectionType} DB의 FK 제약 조건 ${action} 완료`);
            
        } catch (error) {
            console.error(`FK 제약 조건 ${enable ? '활성화' : '비활성화'} 실패:`, error.message);
            throw new Error(`FK 제약 조건 ${enable ? '활성화' : '비활성화'} 실패: ${error.message}`);
        }
    }

    // 타겟 데이터베이스에서 SQL 실행 (전처리/후처리용)
    async executeQueryOnTarget(query) {
        try {
            if (!this.targetPool) {
                await this.connectTarget();
            }

            const request = this.targetPool.request();
            const result = await request.query(query);
            
            return result;
        } catch (error) {
            console.error('타겟 DB 쿼리 실행 실패:', error.message);
            throw new Error(`타겟 DB 쿼리 실행 실패: ${error.message}`);
        }
    }

    // 소스 데이터베이스에서 SQL 실행 (전처리/후처리용)
    async executeQueryOnSource(query) {
        try {
            if (!this.sourcePool) {
                await this.connectSource();
            }

            const request = this.sourcePool.request();
            const result = await request.query(query);
            
            return result;
        } catch (error) {
            console.error('소스 DB 쿼리 실행 실패:', error.message);
            throw new Error(`소스 DB 쿼리 실행 실패: ${error.message}`);
        }
    }
}

module.exports = MSSQLConnectionManager; 