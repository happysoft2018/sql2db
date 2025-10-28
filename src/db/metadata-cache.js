const sql = require('mssql');
const { format } = require('../modules/i18n');

class MetadataCache {
  constructor({ getPool, ensureConnected, msg }) {
    this.getPool = getPool; // (isSource:boolean)=> pool
    this.ensureConnected = ensureConnected; // async (isSource:boolean)=>void
    this.msg = msg;
    this.cache = {}; // key: `${tableName}_${source|target}` -> columns[]
  }

  clear() {
    this.cache = {};
    console.log(this.msg.cacheCleared);
  }

  getStats() {
    const cacheKeys = Object.keys(this.cache);
    const stats = {
      cachedTables: cacheKeys.length,
      cacheKeys,
      totalColumns: 0,
    };
    cacheKeys.forEach((key) => {
      const columns = this.cache[key];
      if (Array.isArray(columns)) stats.totalColumns += columns.length;
    });
    console.log(format(this.msg.cacheStats, { cachedTables: stats.cachedTables, totalColumns: stats.totalColumns }));
    return stats;
  }

  async getTableColumns(tableName, isSource = false) {
    try {
      const cacheKey = `${tableName}_${isSource ? 'source' : 'target'}`;
      const dbType = isSource ? this.msg.sourceDb : this.msg.targetDb;

      if (this.cache[cacheKey]) {
        console.log(format(this.msg.cacheUsed, { table: tableName, db: dbType }));
        return this.cache[cacheKey];
      }

      const pool = this.getPool(isSource);
      if (!pool) {
        await this.ensureConnected(isSource);
      }
      const request = (this.getPool(isSource)).request();
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
                    AND sc.is_computed = 0  -- Exclude computed columns
                    AND sc.is_identity = 0  -- Exclude identity columns
                    AND c.DATA_TYPE NOT IN ('varbinary', 'binary', 'image')  -- Exclude VARBINARY columns
                ORDER BY c.ORDINAL_POSITION
            `;

      console.log(format(this.msg.loadingColumns, { db: dbType, table: tableName }));
      const result = await request.query(query);
      const columns = result.recordset.map((row) => ({
        name: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        isNullable: row.IS_NULLABLE === 'YES',
        defaultValue: row.COLUMN_DEFAULT,
      }));
      this.cache[cacheKey] = columns;
      console.log(format(this.msg.cacheSaved, { table: tableName, db: dbType, count: columns.length }));
      return columns;
    } catch (error) {
      console.error(format(this.msg.columnLoadFailed, { table: tableName, message: error.message }));
      throw new Error(format(this.msg.columnLoadFailed, { table: tableName, message: error.message }));
    }
  }
}

module.exports = MetadataCache;
