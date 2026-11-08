/**
 * @file tests/run_all_tests.js
 * @description Bộ kiểm thử tự động toàn diện (End-to-End Test Suite) cho Backend Phân hệ Bệnh nhân (DrMayDay).
 *  Kiểm tra toàn bộ các nhóm chức năng và Test Cases theo đúng đặc tả Slide 2, 5, 6, 8, 9:
 *  - Nhóm 1 (Slide 2): Đăng ký (`signup`), Đăng nhập (`login`), Đăng xuất (`logout`), Quên mật khẩu (`forgot-password`),
 *    Đổi mật khẩu (`change-password`), Xem/Cập nhật Hồ sơ cá nhân (`profile`), Phân quyền RBAC.
 *  - Nhóm 2 (Slide 5, 7, 10, 11): Sàng lọc báo động đỏ (`red-flag-screening`), Bộ câu hỏi phân loại (`medrec01`),
 *    Phân loại Cấp/Mạn (`medrec02`), Tạo bệnh án (`medrec03`), Xem chi tiết (`medrec05`), Tóm tắt (`medrec06`),
 *    Lịch sử khám (`medrec13`), Câu trả lời động (`medrec08`, `medrec10`), Cây biểu mẫu 4 tầng (`tmpl03`),
 *    Xem Xét nghiệm (`lab02`) & Đơn thuốc.
 *  - Nhóm 3 (Slide 6): Kiểm tra điều kiện UAS7 (`uas701`), Chấm điểm UAS7 hằng ngày (`uas702`),
 *    Chặn trùng ngày (`5002`), Chặn ngoài biên 0-3 (`5003`, `5004`), Lịch sử UAS7 (`uas704`), Nhật ký phù mạch AAS.
 *  - Nhóm 4 (Slide 8 & 9): Đợt tổn thương da (`lesion01`..`lesion06`), Vị trí cơ thể (`loc01`..`loc05`),
 *    Ảnh chụp 3 mốc tiến triển kèm điểm triệu chứng 0-10 (`lphoto01`..`lphoto04`),
 *    Tải lên kho ảnh (`img01`, `img03`, `img05`), Ảnh đính kèm câu trả lời (`ansimg01`, `ansimg03`, `ansimg04`),
 *    Kiểm tra khóa chỉnh sửa khi bệnh án đã Hoàn thành (`4003 Medical record already completed`).
 */

process.env.USE_EMBEDDED_PG = 'true';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Duplex } = require('stream');
const { app } = require('../src/server');
const { initDatabase } = require('../src/config/database');

const results = [];

/**
 * Hàm gọi HTTP API trực tiếp qua Express Pipeline (hỗ trợ chạy trong môi trường Sandbox không cần mở cổng TCP)
 */
async function apiCall(method, endpoint, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      }
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = endpoint;
    req.headers = {
      host: 'localhost:3000',
      'content-type': 'application/json'
    };
    if (token) {
      req.headers.authorization = `Bearer ${token}`;
    }

    const bodyStr = body !== null && req.method !== 'GET' ? JSON.stringify(body) : '';
    if (bodyStr) {
      req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
    }

    const res = new http.ServerResponse(req);
    let statusCode = 200;

    res.status = function (code) {
      statusCode = code;
      this.statusCode = code;
      return this;
    };

    res.json = function (obj) {
      resolve({ status: this.statusCode || statusCode, body: obj });
      return this;
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });

    if (bodyStr) {
      req.push(bodyStr);
    }
    req.push(null);
  });
}

/**
 * Hàm ghi nhận kết quả từng Test Case
 */
function recordTest(group, testId, description, passed, actualCode, expectedCode, detail = '') {
  results.push({
    group,
    testId,
    description,
    passed,
    actualCode: String(actualCode),
    expectedCode: String(expectedCode),
    detail
  });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(
    `[${icon}] [${group}] ${testId}: ${description} (Expected: ${expectedCode}, Actual: ${actualCode})`
  );
  if (!passed) {
    console.error(`   -> Chi tiết lỗi: ${detail}`);
  }
}

async function runTests() {
  // Xóa file runtime_store.json cũ nếu có để môi trường test sạch hoàn toàn
  const storePath = path.resolve(__dirname, '../data/runtime_store.json');
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }

  await initDatabase();
  console.log(`\n================================================================================`);
  console.log(`BẮT ĐẦU CHẠY BỘ KIỂM THỬ TỰ ĐỘNG BACKEND PHÂN HỆ BỆNH NHÂN (EXPRESS + POSTGRESQL)`);
  console.log(`================================================================================\n`);

  // ========================================================================
  // NHÓM 1: XÁC THỰC & QUẢN LÝ HỒ SƠ CÁ NHÂN (SLIDE 2)
  // ========================================================================
  const rand6 = String(Math.floor(100000 + Math.random() * 899999));
  const testUser = {
    full_name: 'Nguyễn Văn Kiểm Thử',
    phone: `0987${rand6}`, // Đúng 10 chữ số
    password: 'Password123!',
    gender: 'male',
    year_of_birth: 1995
  };

  // TC_AUTH_01: Đăng ký thiếu tham số bắt buộc -> 2001 (Missing required parameter)
  {
    const res = await apiCall('POST', '/api/v1/auth/signup', null, {
      full_name: 'Người dùng thiếu SĐT'
    });
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_01',
      'Đăng ký tài khoản thiếu thông tin bắt buộc trả về mã 2001',
      res.body.code === '2001',
      res.body.code,
      '2001',
      JSON.stringify(res.body)
    );
  }

  // TC_AUTH_02: Đăng ký số điện thoại sai định dạng -> 2004 (Invalid phone number format)
  {
    const res = await apiCall('POST', '/api/v1/auth/signup', null, {
      ...testUser,
      phone: '0987123' // Không đủ 10 số
    });
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_02',
      'Đăng ký với số điện thoại sai định dạng trả về mã 2004',
      res.body.code === '2004',
      res.body.code,
      '2004',
      JSON.stringify(res.body)
    );
  }

  // TC_AUTH_03: Đăng ký tài khoản bệnh nhân mới thành công -> 1001 (Created)
  let patientId = null;
  {
    const res = await apiCall('POST', '/api/v1/auth/signup', null, testUser);
    patientId = res.body.data ? res.body.data.user_id : null;
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_03',
      'Đăng ký tài khoản bệnh nhân mới thành công (tạo đồng bộ nguoi, benhnhan, taikhoan)',
      res.body.code === '1001' && patientId > 0,
      res.body.code,
      '1001',
      JSON.stringify(res.body)
    );
  }

  // TC_AUTH_04: Đăng ký trùng số điện thoại -> 3006 (User phone already exists)
  {
    const res = await apiCall('POST', '/api/v1/auth/signup', null, testUser);
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_04',
      'Đăng ký trùng số điện thoại đã tồn tại trả về mã 3006',
      res.body.code === '3006',
      res.body.code,
      '3006',
      JSON.stringify(res.body)
    );
  }

  // TC_AUTH_05: Đăng nhập tài khoản không tồn tại (3007) & sai mật khẩu (3008)
  {
    const notFoundRes = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: '0900000001',
      password: 'Password123!'
    });
    const wrongPassRes = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: testUser.phone,
      password: 'WrongPassword999'
    });
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_05',
      'Đăng nhập SĐT không tồn tại trả về 3007 và sai mật khẩu trả về 3008',
      notFoundRes.body.code === '3007' && wrongPassRes.body.code === '3008',
      `${notFoundRes.body.code}/${wrongPassRes.body.code}`,
      '3007/3008',
      JSON.stringify({ notFound: notFoundRes.body.code, wrongPass: wrongPassRes.body.code })
    );
  }

  // TC_AUTH_06: Đăng nhập thành công -> 1000 & nhận JWT token
  let accessToken = '';
  {
    const res = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: testUser.phone,
      password: testUser.password
    });
    accessToken = res.body.data ? res.body.data.token : '';
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_06',
      'Đăng nhập thành công và nhận JWT token (mã 1000)',
      res.body.code === '1000' && Boolean(accessToken),
      res.body.code,
      '1000',
      JSON.stringify(res.body.data?.user_info)
    );
  }

  // TC_AUTH_07: Truy cập API bảo vệ không truyền token -> 3003 (User not authenticated)
  {
    const res = await apiCall('GET', '/api/v1/profile', null);
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_07',
      'Truy cập API yêu cầu xác thực không gửi JWT trả về mã 3003',
      res.body.code === '3003',
      res.body.code,
      '3003',
      JSON.stringify(res.body)
    );
  }

  // TC_AUTH_08: Xem thông tin cá nhân (GET /api/v1/profile) -> 1000
  {
    const res = await apiCall('GET', '/api/v1/profile', accessToken);
    recordTest(
      'Slide 2 - Profile',
      'TC_AUTH_08',
      'Lấy thông tin hồ sơ cá nhân bệnh nhân (JOIN nguoi, benhnhan, taikhoan) thành công',
      res.body.code === '1000' && res.body.data.user_id === patientId,
      res.body.code,
      '1000',
      JSON.stringify(res.body.data)
    );
  }

  // TC_AUTH_09: Cập nhật thông tin cá nhân (PUT /api/v1/profile) & kiểm tra lỗi kiểu dữ liệu (2002)
  {
    const badYobRes = await apiCall('PUT', '/api/v1/profile', accessToken, {
      year_of_birth: 'nam_sinh_chu'
    });
    const updRes = await apiCall('PUT', '/api/v1/profile', accessToken, {
      full_name: 'Nguyễn Văn Kiểm Thử (Đã Cập Nhật)',
      career: 'Can bo cong chuc',
      ethnic: 'Kinh',
      city_address: 'Hà Nội',
      commune_address: 'Phường Phương Mai',
      hamlet_address: 'Số 15A Phương Mai',
      health_insurance_number: 'DN4010123456789',
      health_insurance_validate: '2027-12-31',
      next_of_kin_name: 'Nguyễn Thị Thân Nhân',
      next_of_kin_phone: '0912345678'
    });
    recordTest(
      'Slide 2 - Profile',
      'TC_AUTH_09',
      'Kiểm tra kiểu dữ liệu năm sinh sai (2002) và cập nhật hồ sơ hành chính, BHYT, người thân thành công (1000)',
      badYobRes.body.code === '2002' &&
        updRes.body.code === '1000' &&
        updRes.body.data.full_name === 'Nguyễn Văn Kiểm Thử (Đã Cập Nhật)' &&
        updRes.body.data.next_of_kin_phone === '0912345678',
      `${badYobRes.body.code}/${updRes.body.code}`,
      '2002/1000',
      JSON.stringify(updRes.body.data)
    );
  }

  // TC_AUTH_10: Đổi mật khẩu với mật khẩu cũ sai -> 3009 (Old password incorrect) & xác nhận không khớp -> 2003
  {
    const mismatchRes = await apiCall('PUT', '/api/v1/auth/change-password', accessToken, {
      old_password: testUser.password,
      new_password: 'NewPassword123!',
      confirm_password: 'DifferentPassword!'
    });
    const wrongOldRes = await apiCall('PUT', '/api/v1/auth/change-password', accessToken, {
      old_password: 'WrongOldPassword',
      new_password: 'NewPassword123!',
      confirm_password: 'NewPassword123!'
    });
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_10',
      'Đổi mật khẩu báo lỗi xác nhận mật khẩu lệch (2003) và mật khẩu cũ không đúng (3009)',
      mismatchRes.body.code === '2003' && wrongOldRes.body.code === '3009',
      `${mismatchRes.body.code}/${wrongOldRes.body.code}`,
      '2003/3009',
      JSON.stringify({ mismatch: mismatchRes.body.code, wrongOld: wrongOldRes.body.code })
    );
  }

  // TC_AUTH_11: Đổi mật khẩu thành công -> 1000
  {
    const res = await apiCall('PUT', '/api/v1/auth/change-password', accessToken, {
      old_password: testUser.password,
      new_password: 'NewPassword456!',
      confirm_password: 'NewPassword456!'
    });
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_11',
      'Đổi mật khẩu mới hợp lệ thành công (mã 1000)',
      res.body.code === '1000',
      res.body.code,
      '1000',
      JSON.stringify(res.body)
    );
    testUser.password = 'NewPassword456!';
  }

  // TC_AUTH_12: Quên mật khẩu (Forgot Password) cấp mã reset_token -> 1000
  {
    const res = await apiCall('POST', '/api/v1/auth/forgot-password', null, {
      phone: testUser.phone
    });
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_12',
      'Yêu cầu khôi phục mật khẩu qua SĐT sinh mã reset_token thành công (mã 1000)',
      res.body.code === '1000' && Boolean(res.body.data?.reset_token),
      res.body.code,
      '1000',
      JSON.stringify(res.body.data)
    );
  }

  // TC_AUTH_13: Đăng xuất (Logout) và kiểm tra thu hồi JWT trong token_blacklist -> 1000 & 3002
  {
    const logoutRes = await apiCall('POST', '/api/v1/auth/logout', accessToken);
    const afterLogoutRes = await apiCall('GET', '/api/v1/profile', accessToken);
    recordTest(
      'Slide 2 - Auth',
      'TC_AUTH_13',
      'Đăng xuất đưa JWT vào token_blacklist (1000) và chặn truy cập lại bằng token đã thu hồi (3002)',
      logoutRes.body.code === '1000' && afterLogoutRes.body.code === '3002',
      `${logoutRes.body.code}/${afterLogoutRes.body.code}`,
      '1000/3002',
      JSON.stringify(afterLogoutRes.body)
    );

    // Đăng nhập lại để lấy token mới phục vụ các bài kiểm thử tiếp theo
    const relogin = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: testUser.phone,
      password: testUser.password
    });
    accessToken = relogin.body.data.token;
  }

  // ========================================================================
  // NHÓM 2: SÀNG LỌC BÁO ĐỘNG ĐỎ, PHÂN LOẠI & HỒ SƠ BỆNH ÁN MÀY ĐAY (SLIDE 5)
  // ========================================================================

  // TC_MEDREC_01: Sàng lọc báo động đỏ (bảng public.sanglocbaodongdo)
  {
    const emergencyRes = await apiCall('POST', '/api/v1/red-flag-screening', accessToken, {
      co_kho_tho_kho_khe_nghen_hong: true,
      co_sung_moi_luoi_co_hong: true,
      xac_nhan_muon_goi_cap_cuu: true,
      da_nhan_nut_goi_cap_cuu: true,
      so_dien_thoai_cap_cuu: '115'
    });

    const normalRes = await apiCall('POST', '/api/v1/red-flag-screening', accessToken, {
      co_kho_tho_kho_khe_nghen_hong: false,
      co_chong_mat_tuc_nguc_sap_ngat: false,
      co_sung_moi_luoi_co_hong: false,
      co_dau_bung_non_lien_tuc: false
    });

    recordTest(
      'Slide 5 - RedFlag',
      'TC_MEDREC_01',
      'Sàng lọc báo động đỏ lưu vào bảng sanglocbaodongdo, tự tính co_nguy_co_phan_ve và ket_qua_dieu_huong (NGUY_CO_PHAN_VE / CHUYEN_BUOC_1)',
      emergencyRes.body.code === '1001' &&
        emergencyRes.body.data.co_nguy_co_phan_ve === true &&
        emergencyRes.body.data.ket_qua_dieu_huong === 'NGUY_CO_PHAN_VE' &&
        normalRes.body.code === '1001' &&
        normalRes.body.data.co_nguy_co_phan_ve === false &&
        normalRes.body.data.ket_qua_dieu_huong === 'CHUYEN_BUOC_1',
      `${emergencyRes.body.code}/${normalRes.body.code}`,
      '1001/1001',
      JSON.stringify({
        emergency: emergencyRes.body.data?.ket_qua_dieu_huong,
        normal: normalRes.body.data?.ket_qua_dieu_huong
      })
    );
  }

  // TC_MEDREC_02 (medrec01): Lấy danh sách câu hỏi phân loại bệnh án
  {
    const res = await apiCall('GET', '/api/v1/medical_records/classify-questions', accessToken);
    recordTest(
      'Slide 5 - medrec01',
      'TC_MEDREC_02',
      'Lấy danh sách câu hỏi sàng lọc & phân loại bệnh án mày đay thành công (mã 1000)',
      res.body.code === '1000' && Array.isArray(res.body.data) && res.body.data.length >= 2,
      res.body.code,
      '1000',
      `Số câu hỏi phân loại: ${res.body.data?.length}`
    );
  }

  // TC_MEDREC_03 (medrec02): Gửi câu trả lời phân loại thiếu dữ liệu (4006) & đủ dữ liệu (< 6 tuần -> CAP, >= 6 tuần -> MAN)
  {
    const incompleteRes = await apiCall('POST', '/api/v1/medical_records/classify', accessToken, {});
    const acuteRes = await apiCall('POST', '/api/v1/medical_records/classify', accessToken, {
      answers: [{ question_id: 'CLS_DURATION_WEEKS', option_value: 'UNDER_6_WEEKS' }]
    });
    const chronicRes = await apiCall('POST', '/api/v1/medical_records/classify', accessToken, {
      answers: [{ question_id: 'CLS_DURATION_WEEKS', option_value: 'OVER_6_WEEKS' }]
    });
    recordTest(
      'Slide 5 - medrec02',
      'TC_MEDREC_03',
      'Kiểm tra thiếu lựa chọn phân loại (4006) và suy diễn chính xác TMPL_URT_ACUTE (CAP) / TMPL_URT_CHRONIC (MAN)',
      incompleteRes.body.code === '4006' &&
        acuteRes.body.code === '1000' &&
        acuteRes.body.data.template_id === 'TMPL_URT_ACUTE' &&
        chronicRes.body.code === '1000' &&
        chronicRes.body.data.template_id === 'TMPL_URT_CHRONIC',
      `${incompleteRes.body.code}/${acuteRes.body.code}/${chronicRes.body.code}`,
      '4006/1000/1000',
      JSON.stringify({
        acute: acuteRes.body.data?.template_id,
        chronic: chronicRes.body.data?.template_id
      })
    );
  }

  // TC_MEDREC_04 (tmpl03): Xem cây cấu trúc 4 tầng của mẫu bệnh án (1000) & mẫu không tồn tại (4101)
  {
    const validTmpl = await apiCall('GET', '/api/v1/templates/TMPL_URT_CHRONIC', accessToken);
    const invalidTmpl = await apiCall('GET', '/api/v1/templates/INVALID_TEMPLATE_999', accessToken);
    recordTest(
      'Slide 5/11 - tmpl03',
      'TC_MEDREC_04',
      'Lấy cấu trúc 4 tầng mẫu bệnh án thành công (1000) và báo lỗi mẫu không tồn tại (4101)',
      validTmpl.body.code === '1000' &&
        Array.isArray(validTmpl.body.data.sections) &&
        invalidTmpl.body.code === '4101',
      `${validTmpl.body.code}/${invalidTmpl.body.code}`,
      '1000/4101',
      JSON.stringify(invalidTmpl.body)
    );
  }

  // TC_MEDREC_05: Trước khi tạo bệnh án, kiểm tra uas701 trả về eligible="false" và lesion01 trả về 4002 (Active medical record required)
  {
    const eligBefore = await apiCall('GET', '/api/v1/uas7-scores/eligibility', accessToken);
    const lesionBefore = await apiCall('GET', '/api/v1/lesion-episodes/my', accessToken);
    recordTest(
      'Slide 6/9 - Eligibility & 4002',
      'TC_MEDREC_05',
      'Khi chưa có bệnh án active: uas701 trả về eligible="false" và lesion01 trả về mã lỗi 4002',
      eligBefore.body.code === '1000' &&
        eligBefore.body.data.eligible === 'false' &&
        lesionBefore.body.code === '4002',
      `${eligBefore.body.data?.eligible}/${lesionBefore.body.code}`,
      'false/4002',
      JSON.stringify({ elig: eligBefore.body.data, lesionCode: lesionBefore.body.code })
    );
  }

  // TC_MEDREC_06 (medrec03): Tạo hồ sơ bệnh án Cấp tính (CAP) và Mạn tính (MAN) thành công -> 1001
  let acuteRecordId = null;
  let chronicRecordId = null;
  {
    const badTmplRes = await apiCall('POST', '/api/v1/medical_records', accessToken, {
      template_id: 'NON_EXISTENT_TMPL'
    });

    const acuteRes = await apiCall('POST', '/api/v1/medical_records', accessToken, {
      template_id: 'TMPL_URT_ACUTE',
      answers: [
        { question_id: 'Q_DURATION_WEEKS', answer_value: 2 },
        { question_id: 'Q_SUSPECTED_FACTOR_GROUP', answer_text: 'Thuc an' },
        { question_id: 'Q_SUSPECTED_FOOD_DETAIL', answer_text: 'Hải sản (tôm, cua biển)' }
      ]
    });
    acuteRecordId = acuteRes.body.data ? acuteRes.body.data.medical_record_id : null;

    const chronicRes = await apiCall('POST', '/api/v1/medical_records', accessToken, {
      template_id: 'TMPL_URT_CHRONIC',
      answers: [
        { question_id: 'Q_DURATION_WEEKS', answer_value: 8 },
        { question_id: 'Q_DISEASE_MANIFESTATION', answer_text: 'San phu + phu mach' },
        { question_id: 'Q_ATOPY_HISTORY', answer_text: 'Viêm mũi dị ứng thời tiết' }
      ]
    });
    chronicRecordId = chronicRes.body.data ? chronicRes.body.data.medical_record_id : null;

    recordTest(
      'Slide 5 - medrec03',
      'TC_MEDREC_06',
      'Chặn template_id không tồn tại (4101) và tạo mới bệnh án Cấp tính + Mạn tính thành công (1001, thỏa mãn FK DEFERRABLE)',
      badTmplRes.body.code === '4101' &&
        acuteRes.body.code === '1001' &&
        acuteRecordId > 0 &&
        chronicRes.body.code === '1001' &&
        chronicRecordId > 0,
      `${badTmplRes.body.code}/${acuteRes.body.code}/${chronicRes.body.code}`,
      '4101/1001/1001',
      JSON.stringify({ acuteRecordId, chronicRecordId })
    );
  }

  // TC_MEDREC_07 (medrec05, medrec06, medrec13): Xem chi tiết, tóm tắt, lịch sử bệnh án & kiểm tra RBAC 3106 + không tồn tại 4001
  {
    const detailRes = await apiCall('GET', `/api/v1/medical_records/${chronicRecordId}`, accessToken);
    const summaryRes = await apiCall(
      'GET',
      `/api/v1/medical_records/${chronicRecordId}/summary`,
      accessToken
    );
    const histRes = await apiCall(
      'GET',
      `/api/v1/medical_records/patients/${patientId}/history`,
      accessToken
    );
    const forbiddenHistRes = await apiCall(
      'GET',
      `/api/v1/medical_records/patients/999999/history`,
      accessToken
    );
    const notFoundRes = await apiCall('GET', '/api/v1/medical_records/999999', accessToken);

    recordTest(
      'Slide 5 - medrec05/06/13',
      'TC_MEDREC_07',
      'Xem chi tiết, tóm tắt, lịch sử khám (1000), chặn xem lịch sử người khác (3106) và báo lỗi hồ sơ không tồn tại (4001)',
      detailRes.body.code === '1000' &&
        summaryRes.body.code === '1000' &&
        histRes.body.code === '1000' &&
        histRes.body.data.length === 2 &&
        forbiddenHistRes.body.code === '3106' &&
        notFoundRes.body.code === '4001',
      `${detailRes.body.code}/${forbiddenHistRes.body.code}/${notFoundRes.body.code}`,
      '1000/3106/4001',
      JSON.stringify(summaryRes.body.data)
    );
  }

  // TC_MEDREC_08 (medrec10 & medrec08): Upsert câu trả lời động theo UNIQUE(medical_record_id, question_id) và lấy danh sách
  let sampleAnswerId = null;
  {
    const updAnsRes = await apiCall(
      'PUT',
      `/api/v1/medical_records/${chronicRecordId}/answers`,
      accessToken,
      {
        answers: [
          { question_id: 'Q_DURATION_WEEKS', answer_value: 10 }, // Upsert ghi đè giá trị cũ (8 -> 10)
          { question_id: 'Q_FAMILY_HISTORY', answer_text: 'Co' },
          { question_id: 'Q_FAMILY_HISTORY_DETAIL', answer_text: 'Mẹ ruột bị mề đay mạn tính' },
          { question_id: 'Q_DRUG_FOOD_ALLERGY_HISTORY', answer_text: 'Dị ứng kháng sinh nhóm Penicillin' },
          { question_id: 'Q_AGE_FIRST_ONSET', answer_value: 25 },
          { question_id: 'Q_PREVIOUS_EPISODES_COUNT', answer_value: 4 }
        ]
      }
    );

    const getAnsRes = await apiCall(
      'GET',
      `/api/v1/medical_records/${chronicRecordId}/answers`,
      accessToken
    );
    if (getAnsRes.body.data && getAnsRes.body.data.length > 0) {
      sampleAnswerId = getAnsRes.body.data[0].id;
    }

    recordTest(
      'Slide 5 - medrec08/10',
      'TC_MEDREC_08',
      'Upsert câu trả lời biểu mẫu động đồng bộ vào các bảng lâm sàng PostgreSQL (tiensubanthan, benhanmaydayman, benhsucacdotbenhtruoc)',
      updAnsRes.body.code === '1000' &&
        getAnsRes.body.code === '1000' &&
        getAnsRes.body.data.length >= 6 &&
        sampleAnswerId > 0,
      updAnsRes.body.code,
      '1000',
      `Số câu trả lời đã lưu: ${getAnsRes.body.data?.length}`
    );
  }

  // TC_MEDREC_09 (lab02 & Prescriptions): Bệnh nhân tra cứu kết quả xét nghiệm cận lâm sàng và đơn thuốc
  {
    const labRes = await apiCall('GET', `/api/v1/lab-results/${chronicRecordId}`, accessToken);
    const prescRes = await apiCall('GET', `/api/v1/prescriptions/${chronicRecordId}`, accessToken);
    recordTest(
      'Slide 7/10 - lab02 & Prescriptions',
      'TC_MEDREC_09',
      'Bệnh nhân tra cứu danh sách kết quả xét nghiệm cận lâm sàng và đơn thuốc điện tử thành công (mã 1000)',
      labRes.body.code === '1000' && prescRes.body.code === '1000',
      `${labRes.body.code}/${prescRes.body.code}`,
      '1000/1000',
      JSON.stringify({ labs: labRes.body.data?.length, prescriptions: prescRes.body.data?.length })
    );
  }

  // ========================================================================
  // NHÓM 3: THEO DÕI ĐIỂM SỐ UAS7 & AAS HẰNG NGÀY (SLIDE 6)
  // ========================================================================

  // TC_UAS7_01 (uas701): Kiểm tra điều kiện chấm điểm UAS7 sau khi đã có bệnh án active
  {
    const eligRes = await apiCall('GET', '/api/v1/uas7-scores/eligibility', accessToken);
    recordTest(
      'Slide 6 - uas701',
      'TC_UAS7_01',
      'Kiểm tra điều kiện chấm điểm UAS7 trả về eligible="true" và medical_record_id dạng chuỗi',
      eligRes.body.code === '1000' &&
        eligRes.body.data.eligible === 'true' &&
        eligRes.body.data.medical_record_id === String(chronicRecordId),
      eligRes.body.code,
      '1000',
      JSON.stringify(eligRes.body.data)
    );
  }

  // TC_UAS7_02 (uas702): Kiểm tra ràng buộc biên điểm ISS7 (5003) và HSS7 (5004)
  {
    const badIssRes = await apiCall('POST', '/api/v1/uas7-scores', accessToken, {
      iss7: '4', // Vượt quá 3 -> 5003
      hss7: '2',
      score_date: '2026-11-01'
    });
    const badHssRes = await apiCall('POST', '/api/v1/uas7-scores', accessToken, {
      iss7: '2',
      hss7: '-1', // Nhỏ hơn 0 -> 5004
      score_date: '2026-11-01'
    });
    recordTest(
      'Slide 6 - uas702',
      'TC_UAS7_02',
      'Gửi điểm ISS7 ngoài khoảng [0..3] trả về 5003 và HSS7 ngoài khoảng [0..3] trả về 5004',
      badIssRes.body.code === '5003' && badHssRes.body.code === '5004',
      `${badIssRes.body.code}/${badHssRes.body.code}`,
      '5003/5004',
      JSON.stringify({ badIss: badIssRes.body.code, badHss: badHssRes.body.code })
    );
  }

  // TC_UAS7_03 (uas702): Gửi điểm UAS7 hợp lệ cho 2 ngày liên tiếp (1001) & kiểm tra chặn trùng ngày (5002)
  {
    const day1Res = await apiCall('POST', '/api/v1/uas7-scores', accessToken, {
      medical_record_id: chronicRecordId,
      iss7: '3',
      hss7: '2',
      score_date: '2026-11-01',
      note: 'Ngứa nhiều về đêm, nổi ~30 nốt sẩn phù'
    });
    const day2Res = await apiCall('POST', '/api/v1/uas7-scores', accessToken, {
      medical_record_id: chronicRecordId,
      iss7: '2',
      hss7: '1',
      score_date: '2026-11-02',
      note: 'Đã giảm ngứa sau khi uống Bilastine'
    });
    const dupRes = await apiCall('POST', '/api/v1/uas7-scores', accessToken, {
      medical_record_id: chronicRecordId,
      iss7: '1',
      hss7: '1',
      score_date: '2026-11-01' // Trùng ngày 2026-11-01
    });

    recordTest(
      'Slide 6 - uas702',
      'TC_UAS7_03',
      'Ghi nhận điểm UAS7 hằng ngày vào chukytheodoiuas7 & nhatkyuashangngay (1001, daily_score="5") và chặn trùng ngày (5002)',
      day1Res.body.code === '1001' &&
        day1Res.body.data.daily_score === '5' &&
        day2Res.body.code === '1001' &&
        day2Res.body.data.daily_score === '3' &&
        dupRes.body.code === '5002',
      `${day1Res.body.code}/${dupRes.body.code}`,
      '1001/5002',
      JSON.stringify(day1Res.body.data)
    );
  }

  // TC_UAS7_04 (uas704): Xem lịch sử điểm UAS7 sắp xếp theo score_date DESC & kiểm tra RBAC
  {
    const histRes = await apiCall('GET', `/api/v1/uas7-scores/patient/${patientId}`, accessToken);
    const forbiddenRes = await apiCall('GET', `/api/v1/uas7-scores/patient/999999`, accessToken);
    recordTest(
      'Slide 6 - uas704',
      'TC_UAS7_04',
      'Lấy lịch sử điểm UAS7 sắp xếp mới nhất trước (1000) và chặn xem điểm bệnh nhân khác (3106)',
      histRes.body.code === '1000' &&
        histRes.body.data.length === 2 &&
        histRes.body.data[0].score_date === '2026-11-02' &&
        forbiddenRes.body.code === '3106',
      `${histRes.body.code}/${forbiddenRes.body.code}`,
      '1000/3106',
      JSON.stringify(histRes.body.data?.[0])
    );
  }

  // TC_UAS7_05: Ghi nhận và tra cứu Nhật ký Phù mạch hằng ngày (AAS - bảng nhatkyaashangngay)
  {
    const aasPost = await apiCall('POST', '/api/v1/aas-scores', accessToken, {
      ngay_theo_doi: '2026-11-01',
      co_dot_sung_phu: true,
      thoi_diem_xuat_hien: '07:30 - Sưng môi trên và mí mắt',
      muc_kho_chiu: 2,
      han_che_hoat_dong: 1,
      anh_huong_ngoai_hinh: 3,
      do_nang_tong_the: 2
    });
    const aasGet = await apiCall('GET', `/api/v1/aas-scores/patient/${patientId}`, accessToken);
    recordTest(
      'Slide 6 - AAS Diary',
      'TC_UAS7_05',
      'Ghi nhận nhật ký phù mạch AAS (tự tính diem_aas_ngay="8" trên PostgreSQL) và xem lịch sử AAS thành công',
      aasPost.body.code === '1001' &&
        aasPost.body.data.daily_aas_score === '8' &&
        aasGet.body.code === '1000' &&
        aasGet.body.data.length === 1,
      `${aasPost.body.code}/${aasGet.body.code}`,
      '1001/1000',
      JSON.stringify(aasPost.body.data)
    );
  }

  // ========================================================================
  // NHÓM 4: ĐỢT TỔN THƯƠNG DA, VỊ TRÍ CƠ THỂ, ẢNH CHỤP 3 MỐC & KHO ẢNH (SLIDE 8 & 9)
  // ========================================================================

  // TC_MEDIA_01 (img01, img03): Upload tệp ảnh vào kho lưu trữ (public.tepdinhkem) & kiểm tra giới hạn 5MB (6003), thiếu file (6001)
  let attachmentId1 = null;
  let attachmentId2 = null;
  {
    const noFileRes = await apiCall('POST', '/api/v1/image-attachments/upload', accessToken, {});
    const oversizeRes = await apiCall('POST', '/api/v1/image-attachments/upload', accessToken, {
      file_name: 'oversize_raw.jpg',
      file_size: 8 * 1024 * 1024 // 8MB > 5MB
    });
    const upload1 = await apiCall('POST', '/api/v1/image-attachments/upload', accessToken, {
      medical_record_id: chronicRecordId,
      file_name: 'ton_thuong_cang_tay_moc_start.jpg',
      mime_type: 'image/jpeg',
      file_size: 420000
    });
    const upload2 = await apiCall('POST', '/api/v1/image-attachments/upload', accessToken, {
      medical_record_id: chronicRecordId,
      file_name: 'phu_mach_moi_tren.png',
      mime_type: 'image/png',
      file_size: 310000
    });
    attachmentId1 = upload1.body.data ? Number(upload1.body.data.attachment_id) : null;
    attachmentId2 = upload2.body.data ? Number(upload2.body.data.attachment_id) : null;

    const listMediaRes = await apiCall(
      'GET',
      `/api/v1/image-attachments/user/${patientId}`,
      accessToken
    );

    recordTest(
      'Slide 8 - img01/img03',
      'TC_MEDIA_01',
      'Kiểm tra thiếu file (6001), vượt quá 5MB (6003), tải ảnh lên bảng tepdinhkem (1001) và lấy danh sách ảnh của người dùng (1000)',
      noFileRes.body.code === '6001' &&
        oversizeRes.body.code === '6003' &&
        upload1.body.code === '1001' &&
        attachmentId1 > 0 &&
        listMediaRes.body.code === '1000' &&
        listMediaRes.body.data.length === 2,
      `${noFileRes.body.code}/${oversizeRes.body.code}/${upload1.body.code}`,
      '6001/6003/1001',
      JSON.stringify(upload1.body.data)
    );
  }

  // TC_ANSIMG_01 (ansimg01, ansimg03, ansimg04): Gắn ảnh vào câu trả lời động, chặn gắn trùng (6006), xem danh sách & gỡ liên kết
  let answerImageLinkId = null;
  {
    const attachRes = await apiCall('POST', '/api/v1/answer-images', accessToken, {
      answer_id: sampleAnswerId,
      attachment_id: attachmentId2,
      option_value: 'San phu + phu mach'
    });
    answerImageLinkId = attachRes.body.data ? attachRes.body.data.id : null;

    const dupAttachRes = await apiCall('POST', '/api/v1/answer-images', accessToken, {
      answer_id: sampleAnswerId,
      attachment_id: attachmentId2
    });

    const listAnsImg = await apiCall(
      'GET',
      `/api/v1/answer-images/${sampleAnswerId}`,
      accessToken
    );

    recordTest(
      'Slide 8 - ansimg01/03',
      'TC_ANSIMG_01',
      'Gắn ảnh vào câu trả lời phiếu khám (1001), chặn gắn trùng (6006) và lấy danh sách ảnh theo câu trả lời (1000)',
      attachRes.body.code === '1001' &&
        dupAttachRes.body.code === '6006' &&
        listAnsImg.body.code === '1000' &&
        listAnsImg.body.data.length === 1,
      `${attachRes.body.code}/${dupAttachRes.body.code}/${listAnsImg.body.code}`,
      '1001/6006/1000',
      JSON.stringify(listAnsImg.body.data)
    );
  }

  // TC_LESION_01 (lesion02, lesion01, lesion06, lesion03): Tạo đợt tổn thương, kiểm tra tên trống (7004), xem danh sách, chi tiết, cập nhật
  let episodeId = null;
  {
    const emptyNameRes = await apiCall('POST', '/api/v1/lesion-episodes', accessToken, {
      name: '   '
    });

    const createEpRes = await apiCall('POST', '/api/v1/lesion-episodes', accessToken, {
      medical_record_id: chronicRecordId,
      name: 'Đợt bùng phát mề đay sau bữa tối',
      occurred_at: '2026-11-01T19:30:00Z',
      context_tags: 'Sau ăn hải sản',
      medication_name: 'Bilastine 20mg',
      medication_taken_ago: '2',
      medication_unit: 'hours',
      description: 'Nổi nhiều mảng sẩn phù đỏ ở hai cẳng tay và lưng'
    });
    episodeId = createEpRes.body.data ? Number(createEpRes.body.data.episode_id) : null;

    const myListRes = await apiCall('GET', '/api/v1/lesion-episodes/my', accessToken);
    const detailEpRes = await apiCall('GET', `/api/v1/lesion-episodes/${episodeId}`, accessToken);
    const updEpRes = await apiCall('PATCH', `/api/v1/lesion-episodes/${episodeId}`, accessToken, {
      name: 'Đợt bùng phát mề đay tối 01/11 (Đã cập nhật)',
      context_other: 'Sau khi ăn hải sản và gặp gió lạnh'
    });
    const notFoundEp = await apiCall('GET', '/api/v1/lesion-episodes/999999', accessToken);

    recordTest(
      'Slide 9 - lesion01..06',
      'TC_LESION_01',
      'Kiểm tra tên đợt trống (7004), tạo đợt tổn thương (1001), lấy danh sách/chi tiết/cập nhật (1000) và báo lỗi không tồn tại (7001)',
      emptyNameRes.body.code === '7004' &&
        createEpRes.body.code === '1001' &&
        episodeId > 0 &&
        myListRes.body.code === '1000' &&
        detailEpRes.body.code === '1000' &&
        updEpRes.body.code === '1000' &&
        notFoundEp.body.code === '7001',
      `${emptyNameRes.body.code}/${createEpRes.body.code}/${notFoundEp.body.code}`,
      '7004/1001/7001',
      JSON.stringify(updEpRes.body.data)
    );
  }

  // TC_LOC_01 (loc01, loc03, loc04): Tạo vị trí cơ thể, kiểm tra body_part trống (7005), xem danh sách theo đợt, cập nhật & kiểm tra 7002
  let locationId = null;
  {
    const emptyPartRes = await apiCall('POST', '/api/v1/lesion-locations', accessToken, {
      episode_id: episodeId,
      body_part: ''
    });

    const createLocRes = await apiCall('POST', '/api/v1/lesion-locations', accessToken, {
      episode_id: episodeId,
      body_part: 'Mặt trước cẳng tay trái',
      occurred_at: '2026-11-01T19:45:00Z',
      context_tags: 'Tiếp xúc nước lạnh'
    });
    locationId = createLocRes.body.data ? Number(createLocRes.body.data.location_id) : null;

    const listLocRes = await apiCall(
      'GET',
      `/api/v1/lesion-locations/episode/${episodeId}`,
      accessToken
    );
    const updLocRes = await apiCall(
      'PATCH',
      `/api/v1/lesion-locations/${locationId}`,
      accessToken,
      {
        body_part: 'Mặt trước và mặt ngoài cẳng tay trái',
        medication_name: 'Kem bôi làm dịu da'
      }
    );
    const notFoundLoc = await apiCall('PATCH', '/api/v1/lesion-locations/999999', accessToken, {
      body_part: 'Vai'
    });

    recordTest(
      'Slide 9 - loc01/03/04',
      'TC_LOC_01',
      'Kiểm tra vị trí trống (7005), tạo vị trí tổn thương (1001), lấy danh sách/cập nhật (1000) và báo lỗi vị trí không tồn tại (7002)',
      emptyPartRes.body.code === '7005' &&
        createLocRes.body.code === '1001' &&
        locationId > 0 &&
        listLocRes.body.code === '1000' &&
        updLocRes.body.code === '1000' &&
        notFoundLoc.body.code === '7002',
      `${emptyPartRes.body.code}/${createLocRes.body.code}/${notFoundLoc.body.code}`,
      '7005/1001/7002',
      JSON.stringify(updLocRes.body.data)
    );
  }

  // TC_PHOTO_01 (lphoto01, lphoto02, lphoto03): Thêm ảnh chụp tiến triển 3 mốc, kiểm tra milestone sai (7006), điểm NRS ngoài 0-10 (7007)
  let photoId = null;
  {
    const badMilestoneRes = await apiCall('POST', '/api/v1/lesion-photos', accessToken, {
      episode_id: episodeId,
      location_id: locationId,
      attachment_id: attachmentId1,
      milestone: 'invalid_milestone' // Không thuộc start, peak, normal -> 7006
    });

    const badScoreRes = await apiCall('POST', '/api/v1/lesion-photos', accessToken, {
      episode_id: episodeId,
      location_id: locationId,
      attachment_id: attachmentId1,
      milestone: 'start',
      itch_score: 15 // Vượt quá 10 -> 7007
    });

    const createPhotoRes = await apiCall('POST', '/api/v1/lesion-photos', accessToken, {
      episode_id: episodeId,
      location_id: locationId,
      attachment_id: attachmentId1,
      milestone: 'start',
      itch_score: 8,
      pain_score: 1,
      burn_score: 3,
      hives_count: 25,
      local_auas: 2.5
    });
    photoId = createPhotoRes.body.data ? Number(createPhotoRes.body.data.photo_id) : null;

    const listPhotoRes = await apiCall(
      'GET',
      `/api/v1/lesion-photos/location/${locationId}`,
      accessToken
    );

    const updPhotoRes = await apiCall(
      'PATCH',
      `/api/v1/lesion-photos/${photoId}/milestone`,
      accessToken,
      {
        milestone: 'peak',
        itch_score: 9,
        hives_count: 35
      }
    );

    const notFoundPhoto = await apiCall(
      'PATCH',
      '/api/v1/lesion-photos/999999/milestone',
      accessToken,
      { milestone: 'normal' }
    );

    recordTest(
      'Slide 9 - lphoto01/02/03',
      'TC_PHOTO_01',
      'Kiểm tra milestone sai (7006), điểm triệu chứng ngoài 0-10 (7007), tạo ảnh chụp tổn thương (1001), xem & cập nhật mốc (1000), ảnh không tồn tại (7003)',
      badMilestoneRes.body.code === '7006' &&
        badScoreRes.body.code === '7007' &&
        createPhotoRes.body.code === '1001' &&
        photoId > 0 &&
        listPhotoRes.body.code === '1000' &&
        updPhotoRes.body.code === '1000' &&
        updPhotoRes.body.data.milestone === 'peak' &&
        notFoundPhoto.body.code === '7003',
      `${badMilestoneRes.body.code}/${badScoreRes.body.code}/${createPhotoRes.body.code}/${notFoundPhoto.body.code}`,
      '7006/7007/1001/7003',
      JSON.stringify(updPhotoRes.body.data)
    );
  }

  // TC_LOCK_01: Kiểm tra khóa bệnh án khi đã hoàn thành (Mã lỗi 4003 Medical record already completed)
  {
    await apiCall('PUT', `/api/v1/medical_records/${chronicRecordId}/status`, accessToken, {
      status: 'completed'
    });

    const lockAns = await apiCall(
      'PUT',
      `/api/v1/medical_records/${chronicRecordId}/answers`,
      accessToken,
      { answers: [{ question_id: 'Q_DURATION_WEEKS', answer_value: 12 }] }
    );
    const lockEp = await apiCall('PATCH', `/api/v1/lesion-episodes/${episodeId}`, accessToken, {
      name: 'Không được phép sửa khi bệnh án đã đóng'
    });
    const lockLoc = await apiCall(
      'PATCH',
      `/api/v1/lesion-locations/${locationId}`,
      accessToken,
      { body_part: 'Không được phép sửa' }
    );
    const lockPhoto = await apiCall(
      'PATCH',
      `/api/v1/lesion-photos/${photoId}/milestone`,
      accessToken,
      { milestone: 'normal' }
    );

    recordTest(
      'Slide 5/9 - Record Lock 4003',
      'TC_LOCK_01',
      'Khi bệnh án đã Hoàn thành (status="completed"), mọi thao tác sửa câu trả lời, đợt tổn thương, vị trí, ảnh đều bị chặn với mã 4003',
      lockAns.body.code === '4003' &&
        lockEp.body.code === '4003' &&
        lockLoc.body.code === '4003' &&
        lockPhoto.body.code === '4003',
      `${lockAns.body.code}/${lockEp.body.code}/${lockLoc.body.code}/${lockPhoto.body.code}`,
      '4003/4003/4003/4003',
      JSON.stringify({
        lockAns: lockAns.body.code,
        lockEp: lockEp.body.code,
        lockLoc: lockLoc.body.code,
        lockPhoto: lockPhoto.body.code
      })
    );

    // Mở lại trạng thái in_progress để kiểm thử luồng xóa (lphoto04, loc05, lesion04, ansimg04, img05)
    await apiCall('PUT', `/api/v1/medical_records/${chronicRecordId}/status`, accessToken, {
      status: 'in_progress'
    });
  }

  // TC_DELETE_01 (lphoto04, loc05, lesion04, ansimg04, img05): Kiểm tra xóa ảnh tổn thương, vị trí, đợt tổn thương, liên kết ảnh câu trả lời & kho ảnh
  {
    const delPhotoRes = await apiCall('DELETE', `/api/v1/lesion-photos/${photoId}`, accessToken);
    const delLocRes = await apiCall('DELETE', `/api/v1/lesion-locations/${locationId}`, accessToken);
    const delEpRes = await apiCall('DELETE', `/api/v1/lesion-episodes/${episodeId}`, accessToken);
    const delAnsImgRes = await apiCall(
      'DELETE',
      `/api/v1/answer-images/${answerImageLinkId}`,
      accessToken
    );
    // Kiểm tra sau khi gỡ liên kết ảnh khỏi câu trả lời, file gốc attachmentId2 vẫn còn trong tepdinhkem!
    const checkMediaStillExists = await apiCall(
      'GET',
      `/api/v1/image-attachments/user/${patientId}`,
      accessToken
    );
    const delMedia1 = await apiCall(
      'DELETE',
      `/api/v1/image-attachments/${attachmentId1}`,
      accessToken
    );
    const delMedia1Again = await apiCall(
      'DELETE',
      `/api/v1/image-attachments/${attachmentId1}`,
      accessToken
    );

    recordTest(
      'Slide 8/9 - Delete Operations',
      'TC_DELETE_01',
      'Xóa ảnh tổn thương (lphoto04), vị trí (loc05), đợt tổn thương (lesion04), gỡ liên kết ảnh câu trả lời mà giữ nguyên ảnh gốc (ansimg04), xóa kho ảnh (img05) & báo lỗi 6005 khi đã xóa',
      delPhotoRes.body.code === '1000' &&
        delLocRes.body.code === '1000' &&
        delEpRes.body.code === '1000' &&
        delAnsImgRes.body.code === '1000' &&
        checkMediaStillExists.body.data.length === 2 &&
        delMedia1.body.code === '1000' &&
        delMedia1Again.body.code === '6005',
      `${delPhotoRes.body.code}/${delLocRes.body.code}/${delEpRes.body.code}/${delAnsImgRes.body.code}/${delMedia1Again.body.code}`,
      '1000/1000/1000/1000/6005',
      JSON.stringify({ remainingMediaBeforeDelete: checkMediaStillExists.body.data.length })
    );
  }

  // Tổng kết kết quả kiểm thử
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`\n================================================================================`);
  console.log(
    `TỔNG KẾT KIỂM THỬ: ${passedCount}/${totalCount} TEST CASES ĐẠT (${Math.round((passedCount / totalCount) * 100)}%)`
  );
  console.log(`================================================================================\n`);

  // Lưu kết quả kiểm thử ra file JSON để đưa vào báo cáo PDF
  const dataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const reportJsonPath = path.resolve(dataDir, 'test_results.json');
  fs.writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        executed_at: new Date().toISOString(),
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        results
      },
      null,
      2
    ),
    'utf8'
  );

  if (passedCount !== totalCount) {
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error('Lỗi nghiêm trọng khi chạy bộ kiểm thử:', err);
  process.exit(1);
});
