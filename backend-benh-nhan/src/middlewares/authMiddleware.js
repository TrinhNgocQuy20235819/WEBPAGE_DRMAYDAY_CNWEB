/**
 * @file src/middlewares/authMiddleware.js
 * @description Middleware xác thực JWT Token, kiểm tra danh sách đen (token_blacklist),
 * kiểm tra trạng thái hoạt động của tài khoản (`taikhoan.trang_thai_hoat_dong`) và phân quyền RBAC.
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state } = require('../config/runtimeStore');

const JWT_SECRET = process.env.JWT_SECRET || 'drmayday_super_secret_jwt_key_2026';

/**
 * Middleware xác thực người dùng đăng nhập qua Bearer Token.
 * Hỗ trợ phân biệt mã lỗi theo ngữ cảnh Slide 2:
 * - Với `/logout`: nếu không có token hoặc token sai/hết hạn -> trả mã 3001 hoặc 3002.
 * - Với các API hồ sơ/nghiệp vụ khác: nếu không truyền token -> trả mã 3003 (User not authenticated).
 */
async function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const isLogoutRoute = req.originalUrl && req.originalUrl.includes('/auth/logout');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isLogoutRoute) {
        return sendResponse(res, RESPONSE_CODES.INVALID_TOKEN);
      }
      return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      if (isLogoutRoute) {
        return sendResponse(res, RESPONSE_CODES.INVALID_TOKEN);
      }
      return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);
    }

    // Kiểm tra xem token đã bị thu hồi trong token_blacklist chưa
    if (state.tokenBlacklist[token]) {
      return sendResponse(res, RESPONSE_CODES.TOKEN_EXPIRED);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (verifyErr) {
      if (verifyErr.name === 'TokenExpiredError') {
        return sendResponse(
          res,
          isLogoutRoute ? RESPONSE_CODES.TOKEN_EXPIRED : RESPONSE_CODES.NOT_AUTHENTICATED
        );
      }
      return sendResponse(res, RESPONSE_CODES.INVALID_TOKEN);
    }

    if (decoded.jti && state.tokenBlacklist[decoded.jti]) {
      return sendResponse(res, RESPONSE_CODES.TOKEN_EXPIRED);
    }

    // Truy vấn bảng public.taikhoan JOIN public.nguoi JOIN public.vaitro để kiểm tra trạng thái
    const accRes = await query(
      `SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ma_vai_tro, tk.ten_dang_nhap,
              tk.trang_thai_hoat_dong, n.ho_ten, n.so_dien_thoai,
              vt.ten_vai_tro, vt.ten_hien_thi
       FROM public.taikhoan tk
       JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi
       JOIN public.vaitro vt ON vt.ma_vai_tro = tk.ma_vai_tro
       WHERE tk.ma_nguoi = $1`,
      [decoded.user_id]
    );

    if (accRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    const account = accRes.rows[0];
    if (!account.trang_thai_hoat_dong) {
      return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED, {}, 'Account is locked or inactive');
    }

    // Gắn thông tin người dùng vào req.user để các Controller sử dụng
    req.user = {
      user_id: Number(account.ma_nguoi),
      account_id: Number(account.ma_tai_khoan),
      role_id: Number(account.ma_vai_tro),
      role_name: account.ten_vai_tro, // 'benh_nhan' | 'bac_si' | 'dieu_duong' | 'admin'
      full_name: account.ho_ten,
      phone: account.so_dien_thoai,
      raw_token: token,
      jti: decoded.jti || null
    };

    return next();
  } catch (err) {
    console.error('[AuthMiddleware] Lỗi xác thực:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * Middleware phân quyền theo vai trò (RBAC).
 * @param {...string} allowedRoles - Danh sách tên vai trò được phép ('benh_nhan', 'bac_si', 'admin', ...)
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);
    }
    if (!allowedRoles.includes(req.user.role_name)) {
      if (allowedRoles.length === 1 && allowedRoles[0] === 'admin') {
        return sendResponse(res, RESPONSE_CODES.ADMIN_ROLE_REQUIRED);
      }
      if (allowedRoles.includes('bac_si') && !allowedRoles.includes('benh_nhan')) {
        return sendResponse(res, RESPONSE_CODES.DOCTOR_ROLE_REQUIRED);
      }
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }
    return next();
  };
}

module.exports = {
  authenticateJWT,
  requireRoles,
  JWT_SECRET
};

