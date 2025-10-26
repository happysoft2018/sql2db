const sql = require('mssql');
const { format } = require('../modules/i18n');

class FKAnalyzer {
  constructor({ getPool, ensureConnected, msg }) {
    this.getPool = getPool; // (isSource:boolean) => ConnectionPool
    this.ensureConnected = ensureConnected; // async (isSource:boolean) => void
    this.msg = msg;
  }

  async getForeignKeyRelations(isSource = false) {
    const connectionType = isSource ? this.msg.sourceDb : this.msg.targetDb;
    try {
      let pool = this.getPool(isSource);
      if (!pool || !pool.connected) {
        await this.ensureConnected(isSource);
        pool = this.getPool(isSource);
      }

      const request = pool.request();
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

      console.log(format(this.msg.fkQueryingDb, { db: connectionType }));
      const result = await request.query(query);

      const relations = result.recordset.map((row) => ({
        foreignKeyName: row.foreign_key_name,
        parentTable: row.parent_table,
        parentColumn: row.parent_column,
        referencedTable: row.referenced_table,
        referencedColumn: row.referenced_column,
        deleteAction: row.delete_referential_action_desc,
        updateAction: row.update_referential_action_desc,
      }));

      console.log(format(this.msg.fkFoundInDb, { db: connectionType, count: relations.length }));
      return relations;
    } catch (error) {
      console.error(format(this.msg.fkQueryFailed, { db: connectionType, message: error.message }));
      throw new Error(format(this.msg.fkQueryFailed, { db: connectionType, message: error.message }));
    }
  }

  async calculateTableDeletionOrder(tableNames, isSource = false) {
    try {
      console.log(format(this.msg.calculatingDeletionOrder, { count: tableNames.length }));

      const fkRelations = await this.getForeignKeyRelations(isSource);

      const relevantRelations = fkRelations.filter(
        (rel) => tableNames.includes(rel.parentTable) && tableNames.includes(rel.referencedTable)
      );

      console.log(format(this.msg.relevantFkCount, { count: relevantRelations.length }));

      const dependencies = new Map();
      const inDegree = new Map();

      tableNames.forEach((table) => {
        dependencies.set(table, []);
        inDegree.set(table, 0);
      });

      relevantRelations.forEach((rel) => {
        if (rel.deleteAction !== 'CASCADE') {
          dependencies.get(rel.referencedTable).push(rel.parentTable);
          inDegree.set(rel.parentTable, inDegree.get(rel.parentTable) + 1);
        }
      });

      const result = [];
      const queue = [];

      inDegree.forEach((degree, table) => {
        if (degree === 0) queue.push(table);
      });

      while (queue.length > 0) {
        const currentTable = queue.shift();
        result.push(currentTable);
        dependencies.get(currentTable).forEach((dependentTable) => {
          inDegree.set(dependentTable, inDegree.get(dependentTable) - 1);
          if (inDegree.get(dependentTable) === 0) queue.push(dependentTable);
        });
      }

      if (result.length !== tableNames.length) {
        const remainingTables = tableNames.filter((t) => !result.includes(t));
        console.warn(format(this.msg.circularRefDetected, { tables: remainingTables.join(', ') }));
        console.warn(format(this.msg.circularRefWarning));
        result.push(...remainingTables);
      }

      console.log(format(this.msg.calculatedDeletionOrder, { order: result.join(' → ') }));

      return {
        order: result,
        hasCircularReference: result.length !== tableNames.length,
        circularTables: result.length !== tableNames.length ? tableNames.filter((t) => !result.includes(t)) : [],
        fkRelations: relevantRelations,
      };
    } catch (error) {
      console.error(format(this.msg.deletionOrderFailed, { message: error.message }));
      throw new Error(format(this.msg.deletionOrderFailed, { message: error.message }));
    }
  }

  async toggleForeignKeyConstraints(enable = true, isSource = false) {
    const connectionType = isSource ? this.msg.sourceDb : this.msg.targetDb;
    const action = enable ? this.msg.fkEnable : this.msg.fkDisable;
    try {
      let pool = this.getPool(isSource);
      if (!pool || !pool.connected) {
        await this.ensureConnected(isSource);
        pool = this.getPool(isSource);
      }

      const request = pool.request();
      const toggleCommand = enable ? 'CHECK' : 'NOCHECK';
      const query = `
        DECLARE @sql NVARCHAR(MAX) = '';
        SELECT @sql = @sql + 'ALTER TABLE [' + SCHEMA_NAME(t.schema_id) + '].[' + t.name + '] ${toggleCommand} CONSTRAINT [' + fk.name + '];' + CHAR(13)
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id;
        EXEC sp_executesql @sql;
      `;

      console.log(format(this.msg.togglingFk, { action, db: connectionType }));
      await request.query(query);
      console.log(format(this.msg.fkToggleComplete, { action, db: connectionType }));
    } catch (error) {
      console.error(format(this.msg.fkToggleFailed, { message: error.message }));
      throw new Error(format(this.msg.fkToggleFailed, { message: error.message }));
    }
  }
}

module.exports = FKAnalyzer;
