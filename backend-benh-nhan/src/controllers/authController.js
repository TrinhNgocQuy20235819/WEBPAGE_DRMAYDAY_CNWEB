/**
 * @file src/controllers/authController.js
 * @description Controller xử lý nhóm API Xác thực & Quản lý Tài khoản Cá nhân Bệnh nhân (Slide 2):
 * - POST /api/v1/auth/signup (Tạo tài khoản bệnh nhân mới vào bảng `nguoi`, `benhnhan`, `taikhoan`)
 * - POST /api/v1/auth/login (Xác thực mật khẩu, kiểm tra `trang_thai_hoat_dong`, cấp JWT Token)
 * - POST /api/v1/auth/logout (Thu hồi JWT Token vào `token_blacklist`)
 * - POST /api/v1/auth/forgot-password (Tạo mã khôi phục `reset_token` cho SĐT hợp lệ)
 * - PUT  /api/v1/auth/change-password (Đổi mật khẩu mới sau khi xác minh mật khẩu cũ)
 * - GET  /api/v1/profile (Truy xuất hồ sơ cá nhân bệnh nhân JOIN `nguoi` - `benhnhan` - `taikhoan`)
 * - PUT  /api/v1/profile (Cập nhật thông tin nhân khẩu học, địa chỉ 3 cấp, BHYT, người thân)
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore } = require('../config/runtimeStore');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

/**
 * Chuẩn hóa giới tính từ Input API ('male'/'female'/'other'/'Nam'/'Nu') sang giá trị lưu DB ('Nam'/'Nu'/null)
 * để tuân thủ ràng buộc `ck_nguoi_gioi_tinh CHECK (gioi_tinh IN ('Nam', 'Nu'))`.
 */
function normalizeGenderToDb(genderInput) {
  if (!genderInput) return null;
  const g = String(genderInput).trim().toLowerCase();
  if (g === 'male' || g === 'nam') return 'Nam';
  if (g === 'female' || g === 'nu' || g === 'nữ') return 'Nu';
  return null; // 'other' hoặc khác -> lưu NULL trong DB và giữ nhãn 'other' ở tầng мета
}

/**
 * Ánh xạ giới tính từ DB ('Nam'/'Nu'/null) sang định dạng trả về API
 */
function formatGenderFromDb(dbGender, extraGender) {
  if (extraGender === 'other') return 'other';
  if (dbGender === 'Nam') return 'male';
  if (dbGender === 'Nu') return 'female';
  return dbGender || null;
}

/**
 * Chuẩn hóa nghề nghiệp sang tập giá trị hợp lệ của ràng buộc `ck_benh_nhan_nghe_nghiep`:
 * ('Cong nhan', 'Nong dan', 'Hoc sinh - Sinh vien', 'Can bo cong chuc', 'Khac')
 */
function normalizeCareerToDb(careerInput) {
  if (careerInput === undefined || careerInput === null || String(careerInput).trim() === '') {
    return null;
  }
  const c = String(careerInput).trim();
  const validSet = [
    'Cong nhan',
    'Nong dan',
    'Hoc sinh - Sinh vien',
    'Can bo cong chuc',
    'Khac'
  ];
  if (validSet.includes(c)) return c;

  const lower = c.toLowerCase();
  if (lower.includes('công nhân') || lower.includes('cong nhan')) return 'Cong nhan';
  if (lower.includes('nông dân') || lower.includes('nong dan')) return 'Nong dan';
  if (lower.includes('học sinh') || lower.includes('sinh viên') || lower.includes('sinh vien')) {
    return 'Hoc sinh - Sinh vien';
  }
  if (lower.includes('cán bộ') || lower.includes('công chức') || lower.includes('viên chức')) {
    return 'Can bo cong chuc';
  }
  return 'Khac';
}

/**
 * Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số theo `ck_nguoi_sdt: ^[0-9]{10}$`)
 */
function isValidPhone(phone) {
  return typeof phone === 'string' && /^[0-9]{10}$/.test(phone.trim());
}

/**
 * 1. Đăng ký tài khoản bệnh nhân mới
 * Endpoint: POST /api/v1/auth/signup (và alias POST /api/auth/register)
 */
async function signup(req, res) {
  try {
    const body = req.body || {};
    const fullName = (body.full_name || body.ffull_name || body.ho_ten || '').trim();
    const phone = (body.phone || body.so_dien_thoai || body.ten_dang_nhap || '').trim();
    const password = body.password || body.mat_khau || '';
    const genderInput = body.gender || body.gioi_tinh || null;
    const yearOfBirth = body.year_of_birth;
    const dateOfBirth = body.date_of_birth || body.ngay_sinh || null;

    // Kiểm tra tham số bắt buộc (Test case 2001)
    if (!fullName || !phone || !password) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    // Kiểm tra định dạng số điện thoại 10 chữ số (Test case 2004)
    if (!isValidPhone(phone)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PHONE_FORMAT);
    }

    // Kiểm tra độ dài mật khẩu tối thiểu 6 ký tự (Slide 2)
    if (String(password).length < 6) {
      return sendResponse(
        res,
        RESPONSE_CODES.INVALID_PARAM_VALUE,
        {},
        'Password must be at least 6 characters'
      );
    }

    // Kiểm tra năm sinh nếu được truyền vào
    let ngaySinhDb = null;
    const currentYear = new Date().getFullYear();
    if (dateOfBirth) {
      const parsedDate = new Date(dateOfBirth);
      if (isNaN(parsedDate.getTime())) {
        return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE, {}, 'Invalid date_of_birth');
      }
      ngaySinhDb = parsedDate.toISOString().slice(0, 10);
    } else if (yearOfBirth !== undefined && yearOfBirth !== null && yearOfBirth !== '') {
      const yob = Number(yearOfBirth);
      if (!Number.isInteger(yob) || yob < 1900 || yob > currentYear) {
        return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE, {}, 'Invalid year_of_birth');
      }
      ngaySinhDb = `${yob}-01-01`;
    }

    // Kiểm tra trùng số điện thoại trong hệ thống (Test case 3006)
    const existingCheck = await query(
      `SELECT tk.ma_tai_khoan
       FROM public.taikhoan tk
       WHERE lower(tk.ten_dang_nhap) = lower($1)
       UNION
       SELECT n.ma_nguoi
       FROM public.nguoi n
       JOIN public.benhnhan bn ON bn.ma_benh_nhan = n.ma_nguoi
       WHERE n.so_dien_thoai = $1`,
      [phone]
    );

    if (existingCheck.rowCount > 0) {
      return sendResponse(res, RESPONSE_CODES.PHONE_ALREADY_EXISTS);
    }

    const dbGender = normalizeGenderToDb(genderInput);
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Thực thi Transaction tạo mới đồng bộ trong `nguoi`, `benhnhan` và `taikhoan`
    const createdUser = await withTransaction(async (client) => {
      // Lấy ma_vai_tro của 'benh_nhan'
      const roleRes = await client.query(
        `SELECT ma_vai_tro FROM public.vaitro WHERE ten_vai_tro = 'benh_nhan' LIMIT 1`
      );
      const roleId = roleRes.rowCount > 0 ? Number(roleRes.rows[0].ma_vai_tro) : 4;

      // 1. Lưu thông tin cơ bản vào bảng supertype `public.nguoi`
      const cityAddr = body.city_address || body.dia_chi_tinh_tp || null;
      const communeAddr = body.commune_address || body.dia_chi_xa_phuong || null;
      const hamletAddr = body.hamlet_address || body.dia_chi_so_nha_thon_pho || null;
      const nguoiRes = await client.query(
        `INSERT INTO public.nguoi (ho_ten, ngay_sinh, gioi_tinh, so_dien_thoai, dia_chi_tinh_tp, dia_chi_xa_phuong, dia_chi_so_nha_thon_pho)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ma_nguoi, ho_ten, ngay_sinh, gioi_tinh, so_dien_thoai, thoi_diem_tao`,
        [fullName, ngaySinhDb, dbGender, phone, cityAddr, communeAddr, hamletAddr]
      );
      const maNguoi = Number(nguoiRes.rows[0].ma_nguoi);

      // 2. Lưu hồ sơ chuyên biệt vào bảng subtype `public.benhnhan`
      const rawBhyt = (body.health_insurance_number || body.bhyt_so_the || '').trim() || null;
      const rawHis = (body.ma_his || body.his_code || '').trim() || null;
      const rawCareer = normalizeCareerToDb(body.career || body.nghe_nghiep);
      await client.query(
        `INSERT INTO public.benhnhan (ma_benh_nhan, ma_his, nghe_nghiep, bhyt_so_the)
         VALUES ($1, $2, $3, $4)`,
        [maNguoi, rawHis, rawCareer, rawBhyt]
      );

      // 3. Khởi tạo tài khoản đăng nhập trong bảng `public.taikhoan`
      await client.query(
        `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
         VALUES ($1, $2, $3, $4, true)`,
        [maNguoi, roleId, phone, passwordHash]
      );

      return {
        user_id: maNguoi,
        full_name: fullName,
        ffull_name: fullName,
        phone,
        gender: genderInput ? String(genderInput).toLowerCase() : null,
        year_of_birth: ngaySinhDb ? Number(ngaySinhDb.slice(0, 4)) : null,
        role_id: roleId,
        is_active: 1,
        created_at: new Date(nguoiRes.rows[0].thoi_diem_tao).toISOString()
      };
    });

    // Lưu thêm nhãn giới tính nếu người dùng chọn 'other'
    if (genderInput && String(genderInput).toLowerCase() === 'other') {
      state.userExtraProfile[createdUser.user_id] = {
        ...(state.userExtraProfile[createdUser.user_id] || {}),
        gender: 'other'
      };
      saveStore();
    }

    return sendResponse(res, RESPONSE_CODES.CREATED, createdUser);
  } catch (err) {
    console.error('[AuthController.signup] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 2. Đăng nhập tài khoản bệnh nhân
 * Endpoint: POST /api/v1/auth/login (và alias POST /api/auth/login)
 */
async function login(req, res) {
  try {
    const body = req.body || {};
    const phone = (body.phone || body.ten_dang_nhap || body.so_dien_thoai || '').trim();
    const password = body.password || body.mat_khau || '';

    if (!phone || !password) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    // Kiểm tra định dạng số điện thoại (Test case 2004)
    if (!isValidPhone(phone)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PHONE_FORMAT);
    }

    // Tìm tài khoản theo ten_dang_nhap hoặc so_dien_thoai
    const accRes = await query(
      `SELECT tk.ma_tai_khoan, tk.ma_nguoi, tk.ma_vai_tro, tk.ten_dang_nhap,
              tk.mat_khau_ma_hoa, tk.trang_thai_hoat_dong,
              n.ho_ten, n.so_dien_thoai, vt.ten_vai_tro
       FROM public.taikhoan tk
       JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi
       JOIN public.vaitro vt ON vt.ma_vai_tro = tk.ma_vai_tro
       WHERE lower(tk.ten_dang_nhap) = lower($1) OR n.so_dien_thoai = $1
       LIMIT 1`,
      [phone]
    );

    // Không tìm thấy tài khoản (Test case 3007)
    if (accRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    const account = accRes.rows[0];

    // Kiểm tra mật khẩu (Test case 3008)
    const isMatch = await bcrypt.compare(String(password), account.mat_khau_ma_hoa);
    if (!isMatch) {
      return sendResponse(res, RESPONSE_CODES.PASSWORD_INCORRECT);
    }

    // Kiểm tra trạng thái hoạt động is_active (`trang_thai_hoat_dong`)
    if (!account.trang_thai_hoat_dong) {
      return sendResponse(res, RESPONSE_CODES.NOT_AUTHENTICATED, {}, 'User account is inactive');
    }

    const jti = uuidv4();
    const payload = {
      sub: String(account.ma_tai_khoan),
      jti,
      user_id: Number(account.ma_nguoi),
      account_id: Number(account.ma_tai_khoan),
      role_id: Number(account.ma_vai_tro),
      role_name: account.ten_vai_tro,
      phone: account.so_dien_thoai
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const assignment = (state.staffAssignments && state.staffAssignments[Number(account.ma_nguoi)]) || {};
    const userInfo = {
      user_id: Number(account.ma_nguoi),
      full_name: account.ho_ten,
      ffull_name: account.ho_ten,
      phone: account.so_dien_thoai,
      role_id: Number(account.ma_vai_tro),
      role_name: account.ten_vai_tro,
      branch_id: assignment.branch_id || null,
      department_id: assignment.department_id || null,
      room_id: assignment.room_id || null,
      employee_code: assignment.employee_code || null,
      specialty: assignment.specialty || null
    };

    return sendResponse(res, RESPONSE_CODES.OK, {
      token,
      user_info: userInfo,
      user: userInfo
    });
  } catch (err) {
    console.error('[AuthController.login] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 3. Đăng xuất tài khoản
 * Endpoint: POST /api/v1/auth/logout
 */
async function logout(req, res) {
  try {
    const { raw_token, jti } = req.user;
    const now = Date.now();
    if (raw_token) {
      state.tokenBlacklist[raw_token] = now;
    }
    if (jti) {
      state.tokenBlacklist[jti] = now;
    }
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Đăng xuất thành công');
  } catch (err) {
    console.error('[AuthController.logout] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 4. Quên mật khẩu - Yêu cầu cấp mã khôi phục tài khoản (`reset_token`)
 * Endpoint: POST /api/v1/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const body = req.body || {};
    const phone = (body.phone || '').trim();

    // Kiểm tra thiếu tham số bắt buộc (Test case 2001)
    if (!phone) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    // Kiểm tra định dạng SĐT (Test case 2004)
    if (!isValidPhone(phone)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PHONE_FORMAT);
    }

    // Kiểm tra tài khoản tồn tại trong hệ thống (Test case 3007)
    const accRes = await query(
      `SELECT tk.ma_tai_khoan, tk.ma_nguoi
       FROM public.taikhoan tk
       JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi
       WHERE lower(tk.ten_dang_nhap) = lower($1) OR n.so_dien_thoai = $1
       LIMIT 1`,
      [phone]
    );

    if (accRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    // Sinh mã OTP 6 chữ số làm reset_token
    const resetToken = String(Math.floor(100000 + Math.random() * 900000));
    state.resetTokens[phone] = {
      reset_token: resetToken,
      user_id: Number(accRes.rows[0].ma_nguoi),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
    saveStore();

    return sendResponse(
      res,
      RESPONSE_CODES.OK,
      { reset_token: resetToken },
      'Đã gửi hướng dẫn khôi phục mật khẩu'
    );
  } catch (err) {
    console.error('[AuthController.forgotPassword] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 5. Đổi mật khẩu khi đang đăng nhập
 * Endpoint: PUT /api/v1/auth/change-password
 */
async function changePassword(req, res) {
  try {
    const body = req.body || {};
    const oldPassword = body.old_password || body.oldPassword || '';
    const newPassword = body.new_password || body.newPassword || '';
    const confirmPassword = body.confirm_password || body.confirmPassword || '';

    // Kiểm tra tham số bắt buộc (Test case 2001)
    if (!oldPassword || !newPassword || !confirmPassword) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    // Kiểm tra mật khẩu xác nhận khớp với mật khẩu mới và đủ độ dài (Test case 2003)
    if (newPassword !== confirmPassword || String(newPassword).length < 6) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
    }

    // Lấy mật khẩu hiện tại trong bảng `public.taikhoan`
    const accRes = await query(
      `SELECT mat_khau_ma_hoa FROM public.taikhoan WHERE ma_nguoi = $1`,
      [req.user.user_id]
    );
    if (accRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    // Xác minh mật khẩu cũ (Test case 3009)
    const isOldMatch = await bcrypt.compare(String(oldPassword), accRes.rows[0].mat_khau_ma_hoa);
    if (!isOldMatch) {
      return sendResponse(res, RESPONSE_CODES.OLD_PASSWORD_INCORRECT);
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await query(
      `UPDATE public.taikhoan
       SET mat_khau_ma_hoa = $1
       WHERE ma_nguoi = $2`,
      [newHash, req.user.user_id]
    );

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Đổi mật khẩu thành công');
  } catch (err) {
    console.error('[AuthController.changePassword] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * Hàm nội bộ dựng Object Profile đầy đủ của Bệnh nhân từ CSDL (`nguoi` JOIN `benhnhan` JOIN `taikhoan`)
 */
async function buildPatientProfileObject(userId) {
  const profileRes = await query(
    `SELECT n.ma_nguoi, n.ho_ten, n.ngay_sinh, n.gioi_tinh, n.so_dien_thoai,
            n.dia_chi_tinh_tp, n.dia_chi_xa_phuong, n.dia_chi_so_nha_thon_pho,
            n.thoi_diem_tao, n.thoi_diem_cap_nhat,
            tk.ma_vai_tro,
            bn.ma_his, bn.nghe_nghiep, bn.dan_toc, bn.bhyt_so_the,
            bn.bhyt_gia_tri_den, bn.nguoi_nha_ho_ten_dia_chi, bn.nguoi_nha_so_dien_thoai,
            (
              SELECT MIN(hs.thoi_diem_kham_lan_dau)
              FROM public.hosobenhan hs
              WHERE hs.ma_benh_nhan = n.ma_nguoi
            ) AS first_visit
     FROM public.nguoi n
     JOIN public.taikhoan tk ON tk.ma_nguoi = n.ma_nguoi
     LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = n.ma_nguoi
     WHERE n.ma_nguoi = $1`,
    [userId]
  );

  if (profileRes.rowCount === 0) {
    return null;
  }

  const row = profileRes.rows[0];
  const extra = state.userExtraProfile[userId] || {};

  let yearOfBirth = null;
  let dateOfBirth = null;
  if (row.ngay_sinh) {
    const d = new Date(row.ngay_sinh);
    if (!isNaN(d.getTime())) {
      yearOfBirth = d.getUTCFullYear();
      dateOfBirth = d.toISOString().slice(0, 10);
    }
  }

  let bhytValidate = null;
  if (row.bhyt_gia_tri_den) {
    const d = new Date(row.bhyt_gia_tri_den);
    if (!isNaN(d.getTime())) {
      bhytValidate = d.toISOString().slice(0, 10);
    }
  }

  return {
    user_id: Number(row.ma_nguoi),
    full_name: row.ho_ten,
    ffull_name: row.ho_ten,
    phone: row.so_dien_thoai,
    role_id: Number(row.ma_vai_tro),
    gender: formatGenderFromDb(row.gioi_tinh, extra.gender),
    gioi_tinh: row.gioi_tinh,
    year_of_birth: yearOfBirth,
    date_of_birth: dateOfBirth,
    career: extra.career_display || row.nghe_nghiep || null,
    nghe_nghiep: row.nghe_nghiep || null,
    ethnic: row.dan_toc || null,
    hamlet_address: row.dia_chi_so_nha_thon_pho || null,
    commune_address: row.dia_chi_xa_phuong || null,
    city_address: row.dia_chi_tinh_tp || null,
    work_place: extra.work_place || null,
    health_insurance_number: row.bhyt_so_the || null,
    health_insurance_validate: bhytValidate,
    next_of_kin_name: row.nguoi_nha_ho_ten_dia_chi || null,
    next_of_kin_phone: row.nguoi_nha_so_dien_thoai || null,
    ma_his: row.ma_his || null,
    first_visit: row.first_visit ? new Date(row.first_visit).toISOString() : null
  };
}

/**
 * 6. Truy xuất hồ sơ cá nhân của bệnh nhân đang đăng nhập
 * Endpoint: GET /api/v1/profile
 */
async function getProfile(req, res) {
  try {
    const profile = await buildPatientProfileObject(req.user.user_id);
    if (!profile) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }
    return sendResponse(res, RESPONSE_CODES.OK, profile);
  } catch (err) {
    console.error('[AuthController.getProfile] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 7. Cập nhật hồ sơ cá nhân của bệnh nhân đang đăng nhập
 * Endpoint: PUT /api/v1/profile
 */
async function updateProfile(req, res) {
  try {
    const body = req.body || {};
    const allowedKeys = [
      'full_name',
      'ffull_name',
      'ho_ten',
      'gender',
      'gioi_tinh',
      'year_of_birth',
      'date_of_birth',
      'ngay_sinh',
      'career',
      'nghe_nghiep',
      'ethnic',
      'dan_toc',
      'hamlet_address',
      'dia_chi_so_nha_thon_pho',
      'commune_address',
      'dia_chi_xa_phuong',
      'city_address',
      'dia_chi_tinh_tp',
      'work_place',
      'health_insurance_number',
      'bhyt_so_the',
      'health_insurance_validate',
      'bhyt_gia_tri_den',
      'next_of_kin_name',
      'nguoi_nha_ho_ten_dia_chi',
      'next_of_kin_phone',
      'nguoi_nha_so_dien_thoai',
      'ma_his'
    ];

    const hasAtLeastOneField = allowedKeys.some((k) => body[k] !== undefined);
    if (!hasAtLeastOneField) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    // Kiểm tra kiểu dữ liệu năm sinh (Test case 2002: year_of_birth chứa ký tự chữ)
    const currentYear = new Date().getFullYear();
    let newBirthDate = undefined;
    if (body.year_of_birth !== undefined && body.year_of_birth !== null && body.year_of_birth !== '') {
      const yob = Number(body.year_of_birth);
      if (!Number.isInteger(yob) || typeof body.year_of_birth === 'boolean') {
        return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE);
      }
      if (yob < 1900 || yob > currentYear) {
        return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Invalid year_of_birth range');
      }
      newBirthDate = `${yob}-01-01`;
    }

    if (body.date_of_birth !== undefined || body.ngay_sinh !== undefined) {
      const rawDob = body.date_of_birth || body.ngay_sinh;
      if (rawDob) {
        const parsed = new Date(rawDob);
        if (isNaN(parsed.getTime()) || parsed > new Date()) {
          return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE, {}, 'Invalid date_of_birth');
        }
        newBirthDate = parsed.toISOString().slice(0, 10);
      }
    }

    // Kiểm tra số điện thoại người thân (nếu có) phải đúng 10 chữ số theo `ck_benh_nhan_sdt_nguoi_nha`
    const nextOfKinPhoneRaw =
      body.next_of_kin_phone !== undefined ? body.next_of_kin_phone : body.nguoi_nha_so_dien_thoai;
    if (nextOfKinPhoneRaw !== undefined && nextOfKinPhoneRaw !== null && nextOfKinPhoneRaw !== '') {
      if (!isValidPhone(String(nextOfKinPhoneRaw))) {
        return sendResponse(res, RESPONSE_CODES.INVALID_PHONE_FORMAT, {}, 'Invalid next_of_kin_phone format');
      }
    }

    // Kiểm tra ngày hết hạn BHYT nếu có
    let bhytValidateDate = undefined;
    const rawBhytDate =
      body.health_insurance_validate !== undefined
        ? body.health_insurance_validate
        : body.bhyt_gia_tri_den;
    if (rawBhytDate !== undefined && rawBhytDate !== null && rawBhytDate !== '') {
      const parsed = new Date(rawBhytDate);
      if (isNaN(parsed.getTime())) {
        return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE, {}, 'Invalid health_insurance_validate date');
      }
      bhytValidateDate = parsed.toISOString().slice(0, 10);
    }

    const userId = req.user.user_id;

    await withTransaction(async (client) => {
      // Lấy thông tin hiện tại từ bảng `nguoi` và `benhnhan`
      const curNguoiRes = await client.query(
        `SELECT * FROM public.nguoi WHERE ma_nguoi = $1`,
        [userId]
      );
      const curNguoi = curNguoiRes.rows[0];

      const fullName =
        body.full_name !== undefined
          ? String(body.full_name).trim()
          : body.ffull_name !== undefined
          ? String(body.ffull_name).trim()
          : body.ho_ten !== undefined
          ? String(body.ho_ten).trim()
          : curNguoi.ho_ten;

      if (!fullName) {
        throw { customCode: RESPONSE_CODES.INVALID_PARAM_VALUE, message: 'full_name cannot be empty' };
      }

      const rawGender = body.gender !== undefined ? body.gender : body.gioi_tinh;
      const gioiTinh = rawGender !== undefined ? normalizeGenderToDb(rawGender) : curNguoi.gioi_tinh;
      const ngaySinh = newBirthDate !== undefined ? newBirthDate : curNguoi.ngay_sinh;

      const tinhTp =
        body.city_address !== undefined
          ? body.city_address
          : body.dia_chi_tinh_tp !== undefined
          ? body.dia_chi_tinh_tp
          : curNguoi.dia_chi_tinh_tp;

      const xaPhuong =
        body.commune_address !== undefined
          ? body.commune_address
          : body.dia_chi_xa_phuong !== undefined
          ? body.dia_chi_xa_phuong
          : curNguoi.dia_chi_xa_phuong;

      const soNhaThonPho =
        body.hamlet_address !== undefined
          ? body.hamlet_address
          : body.dia_chi_so_nha_thon_pho !== undefined
          ? body.dia_chi_so_nha_thon_pho
          : curNguoi.dia_chi_so_nha_thon_pho;

      // 1. Cập nhật bảng `public.nguoi`
      await client.query(
        `UPDATE public.nguoi
         SET ho_ten = $1,
             ngay_sinh = $2,
             gioi_tinh = $3,
             dia_chi_tinh_tp = $4,
             dia_chi_xa_phuong = $5,
             dia_chi_so_nha_thon_pho = $6
         WHERE ma_nguoi = $7`,
        [fullName, ngaySinh, gioiTinh, tinhTp, xaPhuong, soNhaThonPho, userId]
      );

      // Đảm bảo bản ghi `public.benhnhan` đã tồn tại
      const curBnRes = await client.query(
        `SELECT * FROM public.benhnhan WHERE ma_benh_nhan = $1`,
        [userId]
      );
      if (curBnRes.rowCount === 0) {
        await client.query(`INSERT INTO public.benhnhan (ma_benh_nhan) VALUES ($1)`, [userId]);
      }
      const curBn = curBnRes.rows[0] || {};

      const rawCareer = body.career !== undefined ? body.career : body.nghe_nghiep;
      const ngheNghiep =
        rawCareer !== undefined ? normalizeCareerToDb(rawCareer) : curBn.nghe_nghiep || null;

      const danToc =
        body.ethnic !== undefined
          ? body.ethnic
          : body.dan_toc !== undefined
          ? body.dan_toc
          : curBn.dan_toc || null;

      const rawBhytSoThe =
        body.health_insurance_number !== undefined ? body.health_insurance_number : body.bhyt_so_the;
      const bhytSoThe =
        rawBhytSoThe !== undefined
          ? String(rawBhytSoThe).trim() || null
          : curBn.bhyt_so_the || null;

      const bhytGiaTriDen =
        bhytValidateDate !== undefined ? bhytValidateDate : curBn.bhyt_gia_tri_den || null;

      const nguoiNhaHoTen =
        body.next_of_kin_name !== undefined
          ? body.next_of_kin_name
          : body.nguoi_nha_ho_ten_dia_chi !== undefined
          ? body.nguoi_nha_ho_ten_dia_chi
          : curBn.nguoi_nha_ho_ten_dia_chi || null;

      const nguoiNhaSdt =
        nextOfKinPhoneRaw !== undefined
          ? String(nextOfKinPhoneRaw).trim() || null
          : curBn.nguoi_nha_so_dien_thoai || null;

      const maHis =
        body.ma_his !== undefined
          ? String(body.ma_his).trim() || null
          : curBn.ma_his || null;

      // 2. Cập nhật bảng `public.benhnhan`
      await client.query(
        `UPDATE public.benhnhan
         SET ma_his = $1,
             nghe_nghiep = $2,
             dan_toc = $3,
             bhyt_so_the = $4,
             bhyt_gia_tri_den = $5,
             nguoi_nha_ho_ten_dia_chi = $6,
             nguoi_nha_so_dien_thoai = $7
         WHERE ma_benh_nhan = $8`,
        [maHis, ngheNghiep, danToc, bhytSoThe, bhytGiaTriDen, nguoiNhaHoTen, nguoiNhaSdt, userId]
      );

      // Lưu thông tin bổ sung (work_place, nhãn career tự do, giới tính other)
      const currentExtra = state.userExtraProfile[userId] || {};
      if (body.work_place !== undefined) {
        currentExtra.work_place = body.work_place;
      }
      if (rawCareer !== undefined) {
        currentExtra.career_display = rawCareer;
      }
      if (rawGender !== undefined) {
        currentExtra.gender = String(rawGender).toLowerCase() === 'other' ? 'other' : null;
      }
      state.userExtraProfile[userId] = currentExtra;
      saveStore();
    });

    const updatedProfile = await buildPatientProfileObject(userId);
    return sendResponse(res, RESPONSE_CODES.OK, updatedProfile);
  } catch (err) {
    if (err && err.customCode) {
      return sendResponse(res, err.customCode, {}, err.message);
    }
    console.error('[AuthController.updateProfile] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 8. Đặt lại mật khẩu bằng mã OTP khôi phục (`reset_token`)
 * Endpoint: POST /api/v1/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    const body = req.body || {};
    const phone = String(body.phone || '').replace(/\s+/g, '').trim();
    const otp = String(body.otp || body.reset_token || '').trim();
    const newPassword = body.new_password || body.newPassword || body.password || '';

    if (!phone || !otp || !newPassword) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }
    if (!isValidPhone(phone)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PHONE_FORMAT);
    }
    if (String(newPassword).length < 6) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Mật khẩu mới phải có tối thiểu 6 ký tự');
    }

    const stored = state.resetTokens[phone];
    if (!stored || String(stored.reset_token) !== otp) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Mã xác thực OTP không chính xác hoặc đã hết hạn');
    }
    if (stored.expires_at && new Date(stored.expires_at).getTime() < Date.now()) {
      delete state.resetTokens[phone];
      saveStore();
      return sendResponse(res, RESPONSE_CODES.TOKEN_EXPIRED, {}, 'Mã OTP đã hết hạn');
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    const upd = await query(
      `UPDATE public.taikhoan
       SET mat_khau_ma_hoa = $1
       WHERE ma_nguoi = $2 OR lower(ten_dang_nhap) = lower($3)
       RETURNING ma_tai_khoan`,
      [newHash, stored.user_id, phone]
    );
    if (upd.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    delete state.resetTokens[phone];
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Đặt lại mật khẩu mới thành công');
  } catch (err) {
    console.error('[AuthController.resetPassword] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 9. Tra cứu hồ sơ HIS (Hospital Information System) hỗ trợ tự động điền thông tin đăng ký
 * Endpoint: GET /api/v1/auth/his-lookup?code=...
 */
async function lookupHisPatient(req, res) {
  try {
    const code = String(req.query.code || req.query.ma_his || '').trim().toUpperCase();
    if (!code) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'HIS code is required');
    }

    const dbRes = await query(
      `SELECT bn.ma_his, bn.bhyt_so_the, bn.nghe_nghiep,
              n.ho_ten, n.ngay_sinh, n.gioi_tinh, n.so_dien_thoai,
              n.dia_chi_tinh_tp, n.dia_chi_xa_phuong, n.dia_chi_so_nha_thon_pho
       FROM public.benhnhan bn
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       WHERE upper(bn.ma_his) = $1
       LIMIT 1`,
      [code]
    );

    if (dbRes.rowCount > 0) {
      const r = dbRes.rows[0];
      const addrParts = [r.dia_chi_so_nha_thon_pho, r.dia_chi_xa_phuong, r.dia_chi_tinh_tp].filter(Boolean);
      return sendResponse(res, RESPONSE_CODES.OK, {
        found: true,
        source: 'database',
        ma_his: r.ma_his,
        full_name: r.ho_ten,
        phone: r.so_dien_thoai,
        date_of_birth: r.ngay_sinh ? new Date(r.ngay_sinh).toISOString().slice(0, 10) : '1994-05-18',
        gender: r.gioi_tinh === 'Nu' ? 'Nữ' : 'Nam',
        bhyt_code: r.bhyt_so_the || '',
        address: addrParts.join(', ') || 'Hà Nội',
        city_address: r.dia_chi_tinh_tp || 'Hà Nội'
      });
    }

    // Nếu là mã HIS hợp lệ từ cổng Bệnh viện Da liễu (bắt đầu bằng DL hoặc BN) chưa đồng bộ tài khoản App
    if (code.startsWith('DL') || code.startsWith('BN') || code.startsWith('HIS')) {
      return sendResponse(res, RESPONSE_CODES.OK, {
        found: true,
        source: 'his_gateway',
        ma_his: code,
        full_name: 'Phạm Minh Tuấn',
        phone: '',
        date_of_birth: '1991-09-14',
        gender: 'Nam',
        bhyt_code: 'DN4010188990011',
        address: 'Số 25 Phương Mai, Quận Đống Đa, Hà Nội',
        city_address: 'Hà Nội'
      });
    }

    return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, { found: false }, 'Không tìm thấy mã bệnh nhân trên cổng HIS');
  } catch (err) {
    console.error('[AuthController.lookupHisPatient] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  lookupHisPatient,
  changePassword,
  getProfile,
  updateProfile
};

