const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/drmayday';

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
});

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('[DoctorBackend] DATABASE_URL chưa được cấu hình, dùng mặc định:', databaseUrl);
  }
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
