const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Point this service to the shared PostgreSQL database.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
});

async function initDatabase() {
  await pool.query('SELECT 1');
  const result = await pool.query("SELECT to_regclass('public.hosobenhan') AS medical_record_table");
  if (!result.rows[0]?.medical_record_table) {
    throw new Error('Shared database schema is missing public.hosobenhan. Start/configure the patient backend against this database first.');
  }
}

async function query(text, params = []) {
  return pool.query(text, params);
}

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback({ query: (text, params = []) => client.query(text, params) });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { initDatabase, query, withTransaction, closeDatabase };
