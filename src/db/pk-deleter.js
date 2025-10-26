const sql = require('mssql');

class PKDeleter {
  constructor({ getTargetPool, ensureTargetConnected, getTableColumns, msg }) {
    this.getTargetPool = getTargetPool;
    this.ensureTargetConnected = ensureTargetConnected;
    this.getTableColumns = getTableColumns;
    this.msg = msg;
  }

  async deleteFromTargetByPK(tableName, identityColumns, sourceData) {
    try {
      const pool = this.getTargetPool();
      if (!pool || !pool.connected) {
        await this.ensureTargetConnected();
      }

      const targetConfig = this.getTargetPool().config;
      console.log(
        this.msg.targetDbInfo
          .replace('{server}', targetConfig.server)
          .replace('{database}', targetConfig.database)
      );

      if (!sourceData || sourceData.length === 0) {
        console.log(this.msg.noSourceData.replace('{table}', tableName));
        return { rowsAffected: [0] };
      }

      const targetColumnsInfo = await this.getTableColumns(tableName, false);
      const targetColumnNames = targetColumnsInfo.map((c) => c.name);

      const normalizeColumnName = (columnName) => {
        if (targetColumnNames.includes(columnName)) return columnName;
        const normalizedName = columnName.toLowerCase();
        const matched = targetColumnNames.find((col) => col.toLowerCase() === normalizedName);
        if (matched) {
          if (matched !== columnName) {
            console.log(
              this.msg.columnNameCorrected
                .replace('{from}', columnName)
                .replace('{to}', matched)
            );
          }
          return matched;
        }
        console.log(this.msg.columnNotExists.replace('{column}', columnName));
        console.log(this.msg.targetTableColumns.replace('{columns}', targetColumnNames.join(', ')));
        return columnName;
      };

      const normalizedIdentityColumns = Array.isArray(identityColumns)
        ? identityColumns.map((col) => normalizeColumnName(col))
        : normalizeColumnName(identityColumns);

      const pkValues = [];
      sourceData.forEach((row) => {
        if (Array.isArray(identityColumns)) {
          const pkSet = {};
          identityColumns.forEach((pk) => {
            pkSet[pk] = row[pk];
          });
          pkValues.push(pkSet);
        } else {
          if (row[identityColumns] !== undefined && row[identityColumns] !== null) {
            pkValues.push(row[identityColumns]);
          }
        }
      });

      if (pkValues.length === 0) {
        console.log(this.msg.noPkValues.replace('{table}', tableName));
        console.log(
          this.msg.identityColumnsInfo.replace(
            '{columns}',
            Array.isArray(identityColumns) ? identityColumns.join(', ') : identityColumns
          )
        );
        console.log(this.msg.sourceDataRows.replace('{count}', sourceData.length));
        if (sourceData.length > 0) {
          console.log(this.msg.firstRowColumns.replace('{columns}', Object.keys(sourceData[0]).join(', ')));
        }
        return { rowsAffected: [0] };
      }

      const identityColumnsDisplay = Array.isArray(identityColumns)
        ? identityColumns.join(', ')
        : identityColumns;
      const normalizedColumnsDisplay = Array.isArray(normalizedIdentityColumns)
        ? normalizedIdentityColumns.join(', ')
        : normalizedIdentityColumns;

      if (identityColumnsDisplay !== normalizedColumnsDisplay) {
        console.log(
          this.msg.pkExtractedCorrected
            .replace('{count}', pkValues.length)
            .replace('{from}', identityColumnsDisplay)
            .replace('{to}', normalizedColumnsDisplay)
        );
      } else {
        console.log(
          this.msg.pkExtracted
            .replace('{count}', pkValues.length)
            .replace('{columns}', identityColumnsDisplay)
        );
      }

      if (process.env.LOG_LEVEL === 'DEBUG' || process.env.LOG_LEVEL === 'TRACE') {
        if (pkValues.length <= 10) {
          console.log(this.msg.pkValues.replace('{values}', JSON.stringify(pkValues)));
        } else {
          console.log(this.msg.pkValuesFirst10.replace('{values}', JSON.stringify(pkValues.slice(0, 10))));
        }
      }

      const isCompositeKey = Array.isArray(normalizedIdentityColumns);
      const maxChunkSize = isCompositeKey ? Math.floor(2000 / normalizedIdentityColumns.length) : 2000;

      let totalDeletedRows = 0;
      for (let i = 0; i < pkValues.length; i += maxChunkSize) {
        const chunk = pkValues.slice(i, i + maxChunkSize);
        const chunkNumber = Math.floor(i / maxChunkSize) + 1;
        const totalChunks = Math.ceil(pkValues.length / maxChunkSize);

        if (totalChunks > 1) {
          console.log(
            this.msg.deletingChunk
              .replace('{current}', chunkNumber)
              .replace('{total}', totalChunks)
              .replace('{count}', chunk.length)
          );
        }

        let deleteQuery;
        const request = this.getTargetPool().request();

        if (isCompositeKey) {
          const conditions = chunk
            .map((pkSet, index) => {
              const cond = normalizedIdentityColumns
                .map((normalizedPk, pkIndex) => {
                  const originalPk = Array.isArray(identityColumns) ? identityColumns[pkIndex] : identityColumns;
                  const paramName = `pk_${normalizedPk}_${index}`;
                  const value = pkSet[originalPk];
                  if (typeof value === 'string') {
                    request.input(paramName, sql.NVarChar, value);
                  } else if (typeof value === 'number') {
                    request.input(paramName, sql.Int, value);
                  } else {
                    request.input(paramName, sql.Variant, value);
                  }
                  return `${normalizedPk} = @${paramName}`;
                })
                .join(' AND ');
              return `(${cond})`;
            })
            .join(' OR ');
          deleteQuery = `DELETE FROM ${tableName} WHERE ${conditions}`;
        } else {
          if (chunk.length === 1) {
            const value = chunk[0];
            if (typeof value === 'string') {
              request.input('pk_value', sql.NVarChar, value);
            } else if (typeof value === 'number') {
              request.input('pk_value', sql.Int, value);
            } else {
              request.input('pk_value', sql.Variant, value);
            }
            deleteQuery = `DELETE FROM ${tableName} WHERE ${normalizedIdentityColumns} = @pk_value`;
          } else {
            const inClause = chunk
              .map((value, index) => {
                const paramName = `pk_${index}`;
                if (typeof value === 'string') {
                  request.input(paramName, sql.NVarChar, value);
                } else if (typeof value === 'number') {
                  request.input(paramName, sql.Int, value);
                } else {
                  request.input(paramName, sql.Variant, value);
                }
                return `@${paramName}`;
              })
              .join(', ');
            deleteQuery = `DELETE FROM ${tableName} WHERE ${normalizedIdentityColumns} IN (${inClause})`;
          }
        }

        if (totalChunks === 1) {
          console.log(
            this.msg.deletingByPk
              .replace('{table}', tableName)
              .replace('{count}', pkValues.length)
          );
        } else {
          console.log(
            this.msg.deletingChunkExecute
              .replace('{current}', chunkNumber)
              .replace('{total}', totalChunks)
          );
        }

        if (process.env.LOG_LEVEL === 'DEBUG' || process.env.LOG_LEVEL === 'TRACE') {
          console.log(this.msg.deleteQuery.replace('{query}', deleteQuery));
          if (chunk.length <= 5) {
            console.log(this.msg.deletingPkValues.replace('{values}', JSON.stringify(chunk)));
          } else {
            console.log(this.msg.deletingPkValuesFirst5.replace('{values}', JSON.stringify(chunk.slice(0, 5))));
          }
        }

        const result = await request.query(deleteQuery);
        const deletedCount = result.rowsAffected[0];
        totalDeletedRows += deletedCount;

        if (totalChunks === 1) {
          console.log(this.msg.deleteComplete.replace('{count}', deletedCount));
        } else {
          console.log(
            this.msg.chunkDeleteComplete
              .replace('{current}', chunkNumber)
              .replace('{count}', deletedCount)
          );
        }

        if (deletedCount === 0 && chunk.length > 0) {
          try {
            const checkRequest = this.getTargetPool().request();
            const checkQuery = `SELECT COUNT(*) as cnt FROM ${tableName}`;
            const checkResult = await checkRequest.query(checkQuery);
            const totalRows = checkResult.recordset[0].cnt;

            if (totalRows === 0) {
              console.log(this.msg.targetTableEmpty);
            } else {
              console.log(
                this.msg.noMatchingData
                  .replace('{totalRows}', totalRows)
                  .replace('{count}', chunk.length)
              );

              if (process.env.LOG_LEVEL === 'DEBUG' || process.env.LOG_LEVEL === 'TRACE') {
                const firstPkValue = chunk[0];
                const testRequest = this.getTargetPool().request();

                if (isCompositeKey) {
                  const testConditions = normalizedIdentityColumns
                    .map((col, idx) => {
                      const originalCol = Array.isArray(identityColumns) ? identityColumns[idx] : identityColumns;
                      const value = firstPkValue[originalCol];
                      testRequest.input(`test_${col}`, typeof value === 'string' ? sql.NVarChar : sql.Int, value);
                      return `${col} = @test_${col}`;
                    })
                    .join(' AND ');
                  const testQuery = `SELECT TOP 1 * FROM ${tableName} WHERE ${testConditions}`;
                  const testResult = await testRequest.query(testQuery);
                  console.log(this.msg.debugSampleQuery.replace('{count}', testResult.recordset.length));
                } else {
                  testRequest.input(
                    'test_pk',
                    typeof firstPkValue === 'string' ? sql.NVarChar : sql.Int,
                    firstPkValue
                  );
                  const testQuery = `SELECT TOP 1 * FROM ${tableName} WHERE ${normalizedIdentityColumns} = @test_pk`;
                  const testResult = await testRequest.query(testQuery);
                  console.log(this.msg.debugSamplePk.replace('{value}', firstPkValue));

                  const sampleRequest = this.getTargetPool().request();
                  const sampleQuery = `SELECT TOP 5 ${normalizedIdentityColumns} FROM ${tableName}`;
                  const sampleResult = await sampleRequest.query(sampleQuery);
                  console.log(
                    this.msg.debugTargetPkSample
                      .replace('{column}', normalizedIdentityColumns)
                      .replace('{values}', JSON.stringify(sampleResult.recordset.map((r) => r[normalizedIdentityColumns])))
                  );
                }
              } else {
                console.log(this.msg.debugHint);
              }

              console.log(this.msg.insertWillProceed);
            }
          } catch (checkError) {
            console.log(this.msg.noDeleteTarget.replace('{message}', checkError.message));
          }
        }
      }

      console.log(this.msg.totalDeleted.replace('{count}', totalDeletedRows));
      return { rowsAffected: [totalDeletedRows] };
    } catch (error) {
      console.error(this.msg.pkDeleteFailed.replace('{message}', error.message));
      throw new Error(this.msg.pkDeleteFailed.replace('{message}', error.message));
    }
  }
}

module.exports = PKDeleter;
