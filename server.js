/**
 * @file server.js
 * @description Entrypoint chính khởi chạy Hệ thống DrMayDay hoàn chỉnh (Unified Fullstack Backend trên cổng 8080):
 * - Lưu trữ dữ liệu bền vững trên đĩa qua nhân PostgreSQL 16 nhúng (`./data/pgdata`) hoặc kết nối PostgreSQL ngoài.
 * - Nạp nguyên vẹn 100% `mayday-database/final_restructured.sql` (không chỉnh sửa bất kỳ dòng nào).
 * - Tự động khởi tạo dữ liệu mẫu lâm sàng đầy đủ (Admin, Bác sĩ, Điều dưỡng, Bệnh nhân, Bệnh án Cấp/Mạn, Đơn thuốc, Xét nghiệm, UAS7, Ảnh tổn thương 3 mốc).
 */

const path = require('path');

process.env.PORT = process.env.PORT || '3080';
process.env.PGLITE_DATA_DIR =
  process.env.PGLITE_DATA_DIR || path.join(__dirname, 'data', 'pgdata');
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || 'true';

const { startServer } = require('./backend-benh-nhan/src/server');

startServer().catch((err) => {
  console.error('[UnifiedServer] Khởi động hệ thống DrMayDay thất bại:', err);
  process.exit(1);
});
