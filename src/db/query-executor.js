const { format } = require('../modules/i18n');

class QueryExecutor {
  constructor({ getSourcePool, getTargetPool, ensureSourceConnected, ensureTargetConnected, msg }) {
    this.getSourcePool = getSourcePool;
    this.getTargetPool = getTargetPool;
    this.ensureSourceConnected = ensureSourceConnected;
    this.ensureTargetConnected = ensureTargetConnected;
    this.msg = msg;
  }

  async executeOnSource(query) {
    try {
      let pool = this.getSourcePool();
      if (!pool || !pool.connected) {
        await this.ensureSourceConnected();
        pool = this.getSourcePool();
      }
      const request = pool.request();
      const result = await request.query(query);
      return result;
    } catch (error) {
      throw new Error(format(this.msg.sourceQueryExecuteFailed, { message: error.message }));
    }
  }

  async executeOnTarget(query) {
    try {
      let pool = this.getTargetPool();
      if (!pool || !pool.connected) {
        await this.ensureTargetConnected();
        pool = this.getTargetPool();
      }
      const request = pool.request();
      const result = await request.query(query);
      return result;
    } catch (error) {
      throw new Error(format(this.msg.targetQueryFailed, { message: error.message }));
    }
  }

  async execute(target, query, options = {}) {
    const { inputs = {}, timeoutMs } = options;
    try {
      let pool = target === 'source' ? this.getSourcePool() : this.getTargetPool();
      if (!pool || !pool.connected) {
        if (target === 'source') {
          await this.ensureSourceConnected();
          pool = this.getSourcePool();
        } else {
          await this.ensureTargetConnected();
          pool = this.getTargetPool();
        }
      }
      const request = pool.request();
      if (timeoutMs) request.timeout = timeoutMs;
      for (const [name, value] of Object.entries(inputs)) {
        request.input(name, value);
      }
      const result = await request.query(query);
      return result;
    } catch (error) {
      const errMsg = target === 'source' ? this.msg.sourceQueryExecuteFailed : this.msg.targetQueryFailed;
      throw new Error(format(errMsg, { message: error.message }));
    }
  }

  async executeWithInputsOnSource(query, inputs = {}, timeoutMs) {
    return this.execute('source', query, { inputs, timeoutMs });
  }

  async executeWithInputsOnTarget(query, inputs = {}, timeoutMs) {
    return this.execute('target', query, { inputs, timeoutMs });
  }

  async executeInSession(session, query, options = {}) {
    const { inputs = {}, timeoutMs } = options;
    try {
      if (!session || typeof session.request !== 'function') {
        throw new Error('Invalid session provided');
      }
      const request = session.request();
      if (timeoutMs) request.timeout = timeoutMs;
      for (const [name, value] of Object.entries(inputs)) {
        request.input(name, value);
      }
      const result = await request.query(query);
      return result;
    } catch (error) {
      throw new Error(format(this.msg.targetQueryFailed, { message: error.message }));
    }
  }

  async executeScalar(target, query, options = {}) {
    const result = await this.execute(target, query, options);
    if (result && result.recordset && result.recordset.length > 0) {
      const firstRow = result.recordset[0];
      const firstKey = firstRow ? Object.keys(firstRow)[0] : undefined;
      return firstKey ? firstRow[firstKey] : undefined;
    }
    return undefined;
  }

  async executeScalarOnSource(query, options = {}) {
    return this.executeScalar('source', query, options);
  }

  async executeScalarOnTarget(query, options = {}) {
    return this.executeScalar('target', query, options);
  }

  async executeBatch(target, batch = []) {
    const results = [];
    for (const item of batch) {
      const { query, inputs = {}, timeoutMs } = item;
      // eslint-disable-next-line no-await-in-loop
      const res = await this.execute(target, query, { inputs, timeoutMs });
      results.push(res);
    }
    return results;
  }

  async executeBatchOnSource(batch = []) {
    return this.executeBatch('source', batch);
  }

  async executeBatchOnTarget(batch = []) {
    return this.executeBatch('target', batch);
  }
}

module.exports = QueryExecutor;
