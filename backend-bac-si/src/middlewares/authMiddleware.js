const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');

const JWT_SECRET = process.env.JWT_SECRET || 'drmayday_super_secret_jwt_key_2026';
const storePath = process.env.PATIENT_RUNTIME_STORE_PATH ||
  path.resolve(__dirname, '../../../backend-benh-nhan/data/runtime_store.json');

function isRevoked(token, jti) {
  try {
    if (!fs.existsSync(storePath)) return false;
    const state = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    return Boolean(state.tokenBlacklist?.[token] || (jti && state.tokenBlacklist?.[jti]));
  } catch (err) {
    console.error('[DoctorAuth] Cannot read shared token blacklist:', err.message);
    return true;
  }
}

async function authenticateJWT(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);
    const token = header.slice(7).trim();
    if (!token) return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return sendResponse(res, err.name === 'TokenExpiredError' ? RESPONSE_CODES.NOT_AUTHENTICATED : RESPONSE_CODES.INVALID_TOKEN);
    }
    if (isRevoked(token, decoded.jti)) return sendResponse(res, RESPONSE_CODES.TOKEN_EXPIRED);

    const result = await query(
      `SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ma_vai_tro, tk.trang_thai_hoat_dong,
              n.ho_ten, n.so_dien_thoai, vt.ten_vai_tro
       FROM public.taikhoan tk
       JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi
       JOIN public.vaitro vt ON vt.ma_vai_tro = tk.ma_vai_tro
       WHERE tk.ma_nguoi = $1`, [decoded.user_id]
    );
    if (!result.rowCount) return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    const account = result.rows[0];
    if (!account.trang_thai_hoat_dong) return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);
    if (account.ten_vai_tro !== 'bac_si') return sendResponse(res, RESPONSE_CODES.DOCTOR_ROLE_REQUIRED);
    req.user = {
      user_id: Number(account.ma_nguoi), account_id: Number(account.ma_tai_khoan),
      role_id: Number(account.ma_vai_tro), role_name: account.ten_vai_tro,
      full_name: account.ho_ten, phone: account.so_dien_thoai,
      raw_token: token, jti: decoded.jti || null
    };
    return next();
  } catch (err) {
    console.error('[DoctorAuth]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED);
    if (!allowedRoles.includes(req.user.role_name)) return sendResponse(res, RESPONSE_CODES.DOCTOR_ROLE_REQUIRED);
    return next();
  };
}

module.exports = { authenticateJWT, requireRoles };
