const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const useSharedEmbedded = String(process.env.USE_EMBEDDED_PG || 'true').toLowerCase() === 'true';
const sharedDb = require(path.resolve(__dirname, '../../../backend-benh-nhan/src/config/database'));

let pool = null;

function getExternalPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/drmayday';
    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
    });
  }
  return pool;
}

async function initDatabase() {
  if (useSharedEmbedded) {
    return sharedDb.initDatabase();
  }
  const extPool = getExternalPool();
  await extPool.query('SELECT 1');
  const result = await extPool.query("SELECT to_regclass('public.hosobenhan') AS medical_record_table");
  if (!result.rows[0]?.medical_record_table) {
    throw new Error('Shared database schema is missing public.hosobenhan.');
  }
}

async function query(text, params = []) {
  if (useSharedEmbedded) {
    return sharedDb.query(text, params);
  }
  return getExternalPool().query(text, params);
}

async function withTransaction(callback) {
  if (useSharedEmbedded) {
    return sharedDb.withTransaction(callback);
  }
  const client = await getExternalPool().connect();
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
  if (useSharedEmbedded) {
    return sharedDb.closeDatabase();
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { initDatabase, query, withTransaction, closeDatabase };
