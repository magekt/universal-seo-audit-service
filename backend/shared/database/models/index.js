const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class Database {
  static async query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  }

  static async getClient() {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    
    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    client.release = () => {
      // Clear our timeout
      clearTimeout(timeout);
      // Set the methods back to their old un-monkey-patched version
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  }
}

class AuditModel {
  static async create(auditData) {
    const { url, options, status = 'pending' } = auditData;
    const query = `
      INSERT INTO audits (id, url, options, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    const values = [auditData.id, url, JSON.stringify(options), status];
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM audits WHERE id = $1';
    const result = await Database.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status, results = null) {
    const query = `
      UPDATE audits 
      SET status = $2, results = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const values = [id, status, results ? JSON.stringify(results) : null];
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async deleteOldAudits(daysOld = 7) {
    const query = `
      DELETE FROM audits 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING COUNT(*)
    `;
    const result = await Database.query(query);
    return result.rows[0].count;
  }
}

module.exports = {
  Database,
  AuditModel
};
