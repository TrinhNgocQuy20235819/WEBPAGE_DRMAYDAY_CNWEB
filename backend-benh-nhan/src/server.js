/**
 * @file src/server.js
 * @description Điểm khởi chạy hợp nhất (Unified API Gateway) của Hệ thống DrMayDay:
 *  - Kết nối tới Cơ sở dữ liệu PostgreSQL (gốc từ repo mayday-database/final_restructured.sql, tuyệt đối không chỉnh sửa).
 *  - Tích hợp đồng bộ cả 4 phân hệ trên cùng 1 tiến trình và cùng 1 CSDL:
 *    1. Phân hệ Quản trị, RBAC, Topology & Form Builder (Đầu việc 1 - adminRoutes)
 *    2. Phân hệ Bệnh nhân: Auth, Hồ sơ, Bệnh án, UAS7/AAS7, Tổn thương 3 mốc (Đầu việc 2 - patientRoutes)
 *    3. Phân hệ Bác sĩ & Điều dưỡng: Hàng đợi, Nhận ca, Kê đơn, Xét nghiệm, Ảnh lâm sàng (Đầu việc 3 - doctorRoutes)
 *    4. Hạ tầng Bảo mật dùng chung, Thông báo FCM & AI Đếm nốt sẩn mề đay (Đầu việc 4 - sharedInfraRoutes)
 *  - Chuẩn hóa định dạng JSON phản hồi: { code, message, data }.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const { initDatabase } = require('./config/database');
const { RESPONSE_CODES, sendResponse } = require('./config/responseCodes');
const patientRoutes = require('./routes/patientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sharedInfraRoutes = require('./routes/sharedInfraRoutes');
const doctorRoutes = require(path.resolve(__dirname, '../../backend-bac-si/src/routes/doctorRoutes'));

const app = express();

// ============================================================================
// CẤU HÌNH MIDDLEWARE TOÀN CỤC
// ============================================================================
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Phục vụ tĩnh thư mục lưu trữ ảnh đính kèm / ảnh chụp tổn thương
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Endpoint kiểm tra trạng thái hoạt động của máy chủ (Health Check)
app.get(['/api/v1/health', '/api/health'], (_req, res) => {
  return sendResponse(res, RESPONSE_CODES.OK, {
    service: 'DrMayDay Unified System Backend (Admin + Patient + Doctor + Shared Security/AI)',
    status: 'UP',
    modules: ['admin-topology-formbuilder', 'patient-clinical-uas7-lesions', 'doctor-queue-rx-labs', 'shared-security-fcm-ai'],
    database_schema: 'mayday-database/final_restructured.sql (Unmodified)'
  });
});

// Gắn toàn bộ tuyến đường API của cả 4 Phân hệ vào /api/v1 và alias /api
app.use('/api/v1', adminRoutes);
app.use('/api', adminRoutes);
app.use('/api/v1', doctorRoutes);
app.use('/api', doctorRoutes);
app.use('/api/v1', sharedInfraRoutes);
app.use('/api', sharedInfraRoutes);
app.use('/api/v1', patientRoutes);
app.use('/api', patientRoutes);

// ============================================================================
// XỬ LÝ ROUTE KHÔNG TỒN TẠI (404) & MIDDLEWARE BẮT LỖI TOÀN CỤC
// ============================================================================
app.use((req, res) => {
  return sendResponse(
    res,
    RESPONSE_CODES.INVALID_PARAM_VALUE,
    {},
    `Endpoint not found: ${req.method} ${req.originalUrl}`
  );
});

app.use((err, _req, res, _next) => {
  // Bắt lỗi vượt quá dung lượng tệp tối đa từ Multer (Slide 8 - Mã lỗi 6003)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendResponse(res, RESPONSE_CODES.FILE_SIZE_EXCEEDS_LIMIT);
    }
    return sendResponse(res, RESPONSE_CODES.IMAGE_FILE_REQUIRED, {}, err.message);
  }

  // Bắt lỗi JSON sai cú pháp
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE, {}, 'Invalid JSON payload');
  }

  console.error('[GlobalErrorHandler] Lỗi không xác định:', err);
  return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
});

/**
 * Khởi tạo kết nối CSDL và lắng nghe kết nối HTTP
 * @param {number} [customPort] - Cổng tùy chọn (phục vụ kiểm thử hoặc chạy thực tế)
 */
async function startServer(customPort) {
  await initDatabase();
  const port = customPort !== undefined ? customPort : parseInt(process.env.PORT || '8080', 10);
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      console.log(
        `[Server] Hệ thống DrMayDay Unified Backend đang chạy tại http://localhost:${actualPort}`
      );
      resolve(server);
    });
  });
}

// Nếu chạy trực tiếp qua lệnh `node src/server.js`
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[Server] Khởi động thất bại:', err);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer
};
