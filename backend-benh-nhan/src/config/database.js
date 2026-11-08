/**
 * @file src/config/database.js
 * @description Quản lý kết nối Cơ sở dữ liệu PostgreSQL cho hệ thống DrMayDay.
 *
 * Đặc điểm thiết kế:
 * 1. Tuân thủ tuyệt đối yêu cầu: KHÔNG CHỈNH SỬA bất kỳ dòng nào trong file
 *    `mayday-database/final_restructured.sql` đã clone từ GitHub.
 * 2. Hỗ trợ 2 chế độ vận hành linh hoạt:
 *    - Chế độ PostgreSQL Server độc lập (`USE_EMBEDDED_PG=false`): Kết nối qua `pg.Pool` tới `DATABASE_URL`.
 *    - Chế độ PostgreSQL nhúng (`USE_EMBEDDED_PG=true` hoặc tự động fallback): Sử dụng nhân PostgreSQL 16
 *      thực tế (`@electric-sql/pglite`) nạp trực tiếp toàn bộ DDL, Trigger, Function PL/pgSQL,
 *      Generated Columns và Deferrable Foreign Keys từ `../mayday-database/final_restructured.sql`.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let pgPool = null;
let pgliteInstance = null;
let isInitialized = false;
let activeMode = null; // 'pg_pool' | 'pglite'

/**
 * Khởi tạo kết nối CSDL và nạp schema `final_restructured.sql` (nếu CSDL mới).
 */
async function initDatabase() {
  if (isInitialized) {
    return;
  }

  const useEmbedded = String(process.env.USE_EMBEDDED_PG || 'true').toLowerCase() === 'true';
  let sqlSchemaPath = path.resolve(
    __dirname,
    '../../',
    process.env.SQL_SCHEMA_PATH || '../mayday-database/final_restructured.sql'
  );
  if (!fs.existsSync(sqlSchemaPath)) {
    const docsSchema = path.resolve(__dirname, '../../docs/final_restructured.sql');
    if (fs.existsSync(docsSchema)) {
      sqlSchemaPath = docsSchema;
    }
  }

  if (!useEmbedded && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 4000
      });
      await pool.query('SELECT 1');
      pgPool = pool;
      activeMode = 'pg_pool';

      // Kiểm tra xem bảng public.nguoi đã tồn tại chưa; nếu chưa thì nạp final_restructured.sql
      const checkRes = await pgPool.query(`
        SELECT to_regclass('public.nguoi') AS table_exists;
      `);
      if (!checkRes.rows[0] || !checkRes.rows[0].table_exists) {
        const sqlContent = fs.readFileSync(sqlSchemaPath, 'utf-8');
        await pgPool.query(sqlContent);
        console.log('[DB] Đã nạp schema từ mayday-database/final_restructured.sql vào PostgreSQL Server.');
      }
      isInitialized = true;
      console.log('[DB] Đã kết nối thành công tới PostgreSQL Server (pg.Pool).');
      return;
    } catch (err) {
      console.warn('[DB] Không thể kết nối PostgreSQL ngoài, chuyển sang nhân PostgreSQL nhúng (PGlite):', err.message);
    }
  }

  // Khởi tạo nhân PostgreSQL nhúng (PGlite) lưu dữ liệu bền vững hoặc trên bộ nhớ
  const dataDir = process.env.PGLITE_DATA_DIR
    ? path.resolve(__dirname, '../../', process.env.PGLITE_DATA_DIR)
    : undefined; // In-memory PostgreSQL 16 engine (nhanh, sạch, nạp trực tiếp final_restructured.sql)

  pgliteInstance = new PGlite(dataDir);
  await pgliteInstance.waitReady;
  activeMode = 'pglite';

  // Kiểm tra xem bảng public.nguoi đã được tạo chưa
  const checkTable = await pgliteInstance.query(`SELECT to_regclass('public.nguoi') AS table_exists;`);
  if (!checkTable.rows[0] || !checkTable.rows[0].table_exists) {
    if (!fs.existsSync(sqlSchemaPath)) {
      throw new Error(`Không tìm thấy file schema gốc tại: ${sqlSchemaPath}`);
    }
    const rawSql = fs.readFileSync(sqlSchemaPath, 'utf-8');
    await pgliteInstance.exec(rawSql);
    console.log(`[DB] Đã nạp nguyên bản schema từ: ${sqlSchemaPath}`);
  }

  // Khởi tạo dữ liệu danh mục cơ sở (Chi nhánh, Phòng khám, Bác sĩ mặc định, Thuốc mẫu)
  // hoàn toàn bằng các câu lệnh INSERT hợp lệ trên các bảng có sẵn để phục vụ luồng nghiệp vụ
  await seedBaseCatalogIfEmpty();

  isInitialized = true;
}

/**
 * Khởi tạo dữ liệu danh mục cơ bản (Chi nhánh, Phòng khám, Bác sĩ mẫu, Thuốc mẫu)
 * trên các bảng có sẵn của `final_restructured.sql` nếu bảng đang trống.
 */
async function seedBaseCatalogIfEmpty() {
  try {
    const branchCheck = await rawQuery('SELECT count(*)::int AS cnt FROM public.chinhanh');
    if (branchCheck.rows[0].cnt === 0) {
      const branchRes = await rawQuery(
        `INSERT INTO public.chinhanh (ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai)
         VALUES ($1, $2, $3, true)
         RETURNING ma_chi_nhanh`,
        ['Bệnh viện Da liễu Trung ương - Cơ sở 1', '15A Phương Mai, Đống Đa, Hà Nội', '0243852265']
      );
      const maChiNhanh = branchRes.rows[0].ma_chi_nhanh;

      await rawQuery(
        `INSERT INTO public.phongkham (ma_chi_nhanh, ten_phong_kham)
         VALUES ($1, $2)`,
        [maChiNhanh, 'Phòng khám Mề đay & Dị ứng miễn dịch 101']
      );

      // Tạo 1 bác sĩ mặc định để hỗ trợ các bảng cần khóa ngoại ma_bac_si
      const docPersonRes = await rawQuery(
        `INSERT INTO public.nguoi (ho_ten, ngay_sinh, gioi_tinh, so_dien_thoai, dia_chi_tinh_tp)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ma_nguoi`,
        ['PGS.TS. Nguyễn Văn Bác Sĩ', '1980-05-15', 'Nam', '0901112222', 'Hà Nội']
      );
      const maBacSi = docPersonRes.rows[0].ma_nguoi;

      await rawQuery(
        `INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh)
         VALUES ($1, $2)`,
        [maBacSi, maChiNhanh]
      );

      // Danh mục thuốc mẫu phục vụ tra cứu đơn thuốc
      await rawQuery(
        `INSERT INTO public.thuoc (ma_thuoc, ten_thuoc, hoat_chat, nhom_dieu_tri)
         VALUES
           ('THUOC_BILASTINE_20', 'Bilaxten 20mg', 'Bilastine', 'Khang histamine H1 TH2'),
           ('THUOC_FEXOFENADINE_180', 'Telfast HD 180mg', 'Fexofenadine', 'Khang histamine H1 TH2'),
           ('THUOC_OMALIZUMAB_150', 'Xolair 150mg', 'Omalizumab', 'Sinh hoc/dich')
         ON CONFLICT (ma_thuoc) DO NOTHING`
      );
    }
  } catch (err) {
    console.warn('[DB] Cảnh báo khi khởi tạo danh mục mẫu:', err.message);
  }
}

/**
 * Chuẩn hóa kết quả trả về từ PGlite / pg.Pool để luôn có thuộc tính `rowCount` và `rows`.
 */
function normalizeResult(res) {
  if (!res) return { rows: [], rowCount: 0 };
  if (typeof res.rowCount !== 'number') {
    res.rowCount = Array.isArray(res.rows) ? res.rows.length : Number(res.affectedRows || 0);
  }
  return res;
}

/**
 * Thực thi truy vấn SQL có tham số ($1, $2, ...).
 * @param {string} text - Câu lệnh SQL
 * @param {Array<any>} [params=[]] - Mảng tham số
 * @returns {Promise<{rows: Array<any>, rowCount: number}>}
 */
async function rawQuery(text, params = []) {
  if (activeMode === 'pg_pool') {
    const res = await pgPool.query(text, params);
    return normalizeResult(res);
  }
  const res = await pgliteInstance.query(text, params);
  return normalizeResult(res);
}

/**
 * Hàm truy vấn SQL công khai (tự động đảm bảo CSDL đã được khởi tạo).
 * @param {string} text - Câu lệnh SQL
 * @param {Array<any>} [params=[]] - Mảng tham số
 */
async function query(text, params = []) {
  if (!isInitialized) {
    await initDatabase();
  }
  return rawQuery(text, params);
}

/**
 * Thực thi một khối lệnh trong một Transaction CSDL (`BEGIN ... COMMIT / ROLLBACK`).
 * Rất quan trọng với schema `final_restructured.sql` vì các ràng buộc
 * `DEFERRABLE INITIALLY DEFERRED` (như `hosobenhan` <-> `benhanmaydaycap`/`benhanmaydayman`,
 * `phienkham` <-> `phienkhamcap`/`phienkhamman`, `ketquacanlamsang` <-> `ketquacanlamsangcap`/`man`)
 * được kiểm tra tại thời điểm COMMIT của Transaction.
 *
 * @param {(client: { query: (sql: string, params?: any[]) => Promise<any> }) => Promise<any>} callback
 */
async function withTransaction(callback) {
  if (!isInitialized) {
    await initDatabase();
  }

  if (activeMode === 'pg_pool') {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Trên PGlite, sử dụng phương thức transaction() nguyên bản của nhân PostgreSQL
  return pgliteInstance.transaction(async (tx) => {
    return callback({
      query: async (sql, params = []) => {
        const res = await tx.query(sql, params);
        return normalizeResult(res);
      }
    });
  });
}

module.exports = {
  initDatabase,
  query,
  withTransaction
};
