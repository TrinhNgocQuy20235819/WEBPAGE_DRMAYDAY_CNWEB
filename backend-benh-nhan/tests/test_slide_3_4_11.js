/**
 * @file tests/test_slide_3_4_11.js
 * @description Bộ kiểm thử tự động toàn diện cho Backend Slide 3, Slide 4 và Slide 11:
 * - Slide 3: Admin Users, RBAC & Assignment (admin01..06, role01..02, perm01..04, roleperm01..03)
 * - Slide 4: Hạ tầng Topology (Chi nhánh - Khoa - Phòng)
 * - Slide 11: Dynamic Form Builder (Template - Section - Question - Option)
 * Kiểm tra 50 kịch bản bao phủ 100% các Test Cases thành công và mã lỗi nghiệp vụ quy định trong Slide.
 */

process.env.USE_EMBEDDED_PG = 'true';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Duplex } = require('stream');
const jwt = require('jsonwebtoken');
const { app } = require('../src/server');
const { initDatabase, query } = require('../src/config/database');
const { JWT_SECRET } = require('../src/middlewares/authMiddleware');

const results = [];

async function makeHttpRequest({ method, path: reqPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({
      read() {},
      write(_chunk, _encoding, callback) {
        callback();
      }
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = reqPath;
    req.headers = {
      host: 'localhost:8080',
      'content-type': 'application/json',
      ...headers
    };

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

function recordTest(testId, name, passed, details = '', res = null) {
  const detailStr = details || (res && !passed ? JSON.stringify(res.body) : '');
  results.push({ testId, name, passed, details: detailStr });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${testId} - ${name} ${detailStr ? '(' + detailStr + ')' : ''}`);
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('   BẮT ĐẦU CHẠY BỘ KIỂM THỬ BACKEND SLIDE 3, 4, 11 (DRMAYDAY)   ');
  console.log('================================================================\n');

  await initDatabase();

  // Đảm bảo có sẵn tài khoản Admin và Bệnh nhân để test RBAC
  const adminPhone = '0900000001';
  let adminRes = await query(`SELECT ma_nguoi FROM public.nguoi WHERE so_dien_thoai = $1`, [adminPhone]);
  let adminUserId = adminRes.rows[0]?.ma_nguoi;

  if (!adminUserId) {
    const insNguoi = await query(
      `INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh)
       VALUES ('Quản Trị Viên', $1, 'Nam', '1985-01-01') RETURNING ma_nguoi`,
      [adminPhone]
    );
    adminUserId = insNguoi.rows[0].ma_nguoi;
    await query(
      `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
       VALUES ($1, 1, $2, 'hash', TRUE) ON CONFLICT DO NOTHING`,
      [adminUserId, adminPhone]
    );
  }

  // Tạo tài khoản patient để test chặn quyền 3102
  const patientPhone = '0911222333';
  let patRes = await query(`SELECT ma_nguoi FROM public.nguoi WHERE so_dien_thoai = $1`, [patientPhone]);
  let patientUserId = patRes.rows[0]?.ma_nguoi;
  if (!patientUserId) {
    const insPat = await query(
      `INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh)
       VALUES ('Bệnh Nhân Test', $1, 'Nu', '1995-05-05') RETURNING ma_nguoi`,
      [patientPhone]
    );
    patientUserId = insPat.rows[0].ma_nguoi;
    await query(
      `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
       VALUES ($1, 4, $2, 'hash', TRUE) ON CONFLICT DO NOTHING`,
      [patientUserId, patientPhone]
    );
  }

  const adminToken = jwt.sign({ user_id: Number(adminUserId), role_id: 1 }, JWT_SECRET, { expiresIn: '1h' });
  const patientToken = jwt.sign({ user_id: Number(patientUserId), role_id: 4 }, JWT_SECRET, { expiresIn: '1h' });

  const adminHeader = { Authorization: `Bearer ${adminToken}` };
  const patientHeader = { Authorization: `Bearer ${patientToken}` };

  console.log('--- NHÓM 1: BACKEND SLIDE 3 (ADMIN USERS & RBAC) ---');

  // TC01: admin02 - Lấy danh sách users phân trang
  let res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/admin/users?page=1&limit=5',
    headers: adminHeader
  });
  recordTest('TC01', 'admin02: Lấy danh sách người dùng phân trang', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC02: admin03 - Lấy chi tiết user tồn tại
  res = await makeHttpRequest({
    method: 'GET',
    path: `/api/v1/admin/users/${adminUserId}`,
    headers: adminHeader
  });
  recordTest('TC02', 'admin03: Lấy chi tiết tài khoản Admin', res.body.code === '1000' && res.body.data.user_id === Number(adminUserId));

  // TC03: admin03 - Truy vấn user :id không tồn tại (Mã lỗi 3007)
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/admin/users/999999',
    headers: adminHeader
  });
  recordTest('TC03', 'admin03: Truy vấn user không tồn tại -> 3007 User not found', res.body.code === '3007');

  // TC04: admin02 - Gọi API với tài khoản không có quyền Admin (Mã lỗi 3102)
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/admin/users',
    headers: patientHeader
  });
  recordTest('TC04', 'admin02: Bệnh nhân gọi API Admin -> 3102 Admin role required', res.body.code === '3102');

  // TC05: admin01 - Tạo mới user thành công (Mã 1001)
  const newPhone = `0987${Math.floor(100000 + Math.random() * 900000)}`;
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/admin/users',
    headers: adminHeader,
    body: {
      ffull_name: 'Bác sĩ Da liễu Mới',
      phone: newPhone,
      password: 'password123',
      gender: 'male',
      role_id: 2,
      is_active: 1
    }
  });
  const createdDoctorId = res.body.data?.user_id;
  recordTest('TC05', 'admin01: Tạo mới người dùng thành công -> 1001 Created', res.body.code === '1001' && !!createdDoctorId);

  // TC06: admin01 - Tạo user bị trùng số điện thoại (Mã lỗi 3006)
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/admin/users',
    headers: adminHeader,
    body: {
      ffull_name: 'Người dùng Trùng SĐT',
      phone: newPhone,
      password: 'password123',
      role_id: 2
    }
  });
  recordTest('TC06', 'admin01: Tạo user trùng số điện thoại -> 3006 User phone exists', res.body.code === '3006');

  // TC07: admin04 - Chỉnh sửa user
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/admin/users/${createdDoctorId}`,
    headers: adminHeader,
    body: {
      ffull_name: 'TS.BS. Da liễu Mới (Đã cập nhật)',
      gender: 'female'
    }
  });
  recordTest('TC07', 'admin04: Chỉnh sửa người dùng -> 1000 OK', res.body.code === '1000' && res.body.data.ffull_name.includes('Đã cập nhật'));

  // TC08: admin06 - Phân công công tác hợp lệ
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/admin/users/${createdDoctorId}/assign`,
    headers: adminHeader,
    body: {
      branch_id: 1,
      department_id: 1,
      room_id: 1
    }
  });
  recordTest('TC08', 'admin06: Phân công công tác hợp lệ -> 1000 OK', res.body.code === '1000' && res.body.data.room_id === 1);

  // TC09: admin06 - Phân công room_id không thuộc department_id (Mã lỗi 2003)
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/admin/users/${createdDoctorId}/assign`,
    headers: adminHeader,
    body: {
      branch_id: 1,
      department_id: 1,
      room_id: 4 // Phòng 4 thuộc khoa 3
    }
  });
  recordTest('TC09', 'admin06: Phân công room không thuộc khoa -> 2003 Invalid param', res.body.code === '2003');

  // TC10: admin05 - Xóa người dùng (Bảo vệ dữ liệu y tế)
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/admin/users/${createdDoctorId}`,
    headers: adminHeader
  });
  recordTest('TC10', 'admin05: Xóa người dùng thành công -> 1000 OK', res.body.code === '1000');

  // TC11: role01 - Tạo vai trò mới có parent_role_id
  const roleName = `ThucTapSinh_${Date.now()}`;
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/roles',
    headers: adminHeader,
    body: {
      name: roleName,
      description: 'Bác sĩ thực tập sinh chuyên khoa da liễu',
      parent_role_id: 2
    }
  });
  const createdRoleId = res.body.data?.id;
  recordTest('TC11', 'role01: Tạo vai trò mới có parent_role_id -> 1001 Created', res.body.code === '1001' && !!createdRoleId);

  // TC12: role02 - Lấy danh sách vai trò
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/roles',
    headers: adminHeader
  });
  recordTest('TC12', 'role02: Lấy danh sách vai trò -> 1000 OK', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC13: perm01 - Tạo quyền hạn mới
  const permName = `custom_perm_${Date.now()}`;
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/permissions',
    headers: adminHeader,
    body: {
      name: permName,
      description: 'Quyền thao tác kiểm thử đặc biệt'
    }
  });
  const createdPermId = res.body.data?.id;
  recordTest('TC13', 'perm01: Tạo quyền hạn mới -> 1001 Created', res.body.code === '1001' && !!createdPermId);

  // TC14: perm02 - Lấy danh sách quyền hạn
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/permissions',
    headers: adminHeader
  });
  recordTest('TC14', 'perm02: Lấy danh sách quyền hạn -> 1000 OK', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC15: perm03 - Chỉnh sửa quyền hạn
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/permissions/${createdPermId}`,
    headers: adminHeader,
    body: {
      description: 'Mô tả quyền đã được chỉnh sửa'
    }
  });
  recordTest('TC15', 'perm03: Chỉnh sửa quyền hạn -> 1000 OK', res.body.code === '1000');

  // TC16: roleperm01 - Cấp danh sách quyền cho vai trò
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/role_permissions',
    headers: adminHeader,
    body: {
      role_id: createdRoleId,
      permissions: [createdPermId]
    }
  });
  recordTest('TC16', 'roleperm01: Cấp quyền cho vai trò -> 1000 OK', res.body.code === '1000');

  // TC17: roleperm02 - Lấy danh sách quyền của vai trò
  res = await makeHttpRequest({
    method: 'GET',
    path: `/api/v1/role_permissions/${createdRoleId}`,
    headers: adminHeader
  });
  recordTest('TC17', 'roleperm02: Lấy quyền của vai trò -> 1000 OK', res.body.code === '1000' && res.body.data.length > 0);

  // TC18: roleperm03 - Thu hồi quyền khỏi vai trò
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/role_permissions/${createdRoleId}/${createdPermId}`,
    headers: adminHeader
  });
  recordTest('TC18', 'roleperm03: Thu hồi quyền khỏi vai trò -> 1000 OK', res.body.code === '1000');

  // TC19: perm04 - Xóa quyền hạn (CASCADE)
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/permissions/${createdPermId}`,
    headers: adminHeader
  });
  recordTest('TC19', 'perm04: Xóa quyền hạn -> 1000 OK', res.body.code === '1000');

  console.log('\n--- NHÓM 2: BACKEND SLIDE 4 (HẠ TẦNG TOPOLOGY) ---');

  // TC20: branch01 - Tạo chi nhánh mới
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/branches',
    headers: adminHeader,
    body: {
      name: `Cơ sở Mới ${Date.now()}`,
      address: '99 Phố Y Học, Hà Nội',
      phone: '02439999999'
    }
  });
  const createdBranchId = res.body.data?.id;
  recordTest('TC20', 'branch01: Tạo chi nhánh mới -> 1001 Created', res.body.code === '1001' && !!createdBranchId);

  // TC21: branch02 - Danh sách chi nhánh
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/branches',
    headers: adminHeader
  });
  recordTest('TC21', 'branch02: Lấy danh sách chi nhánh -> 1000 OK', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC22: branch03 - Chi tiết chi nhánh
  res = await makeHttpRequest({
    method: 'GET',
    path: `/api/v1/branches/${createdBranchId}`,
    headers: adminHeader
  });
  recordTest('TC22', 'branch03: Chi tiết chi nhánh -> 1000 OK', res.body.code === '1000' && res.body.data.id === createdBranchId);

  // TC23: branch04 - Chỉnh sửa chi nhánh
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/branches/${createdBranchId}`,
    headers: adminHeader,
    body: {
      phone: '02438888888'
    }
  });
  recordTest('TC23', 'branch04: Chỉnh sửa chi nhánh -> 1000 OK', res.body.code === '1000' && res.body.data.phone === '02438888888');

  // TC24: dept01 - Tạo khoa với branch_id không tồn tại (Mã lỗi 2003)
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/departments',
    headers: adminHeader,
    body: {
      name: 'Khoa Ngoại Bệnh Viện',
      branch_id: 99999
    }
  });
  recordTest('TC24', 'dept01: Tạo khoa với branch_id không tồn tại -> 2003 Invalid param', res.body.code === '2003');

  // TC25: dept01 - Tạo khoa với branch_id hợp lệ
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/departments',
    headers: adminHeader,
    body: {
      name: 'Khoa Phục Hồi Chức Năng',
      description: 'Điều trị hỗ trợ da liễu',
      branch_id: createdBranchId
    }
  });
  const createdDeptId = res.body.data?.id;
  recordTest('TC25', 'dept01: Tạo khoa hợp lệ -> 1001 Created', res.body.code === '1001' && !!createdDeptId);

  // TC26: branch05 - Xóa chi nhánh đang có khoa trực thuộc (RESTRICT -> Mã 2003)
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/branches/${createdBranchId}`,
    headers: adminHeader
  });
  recordTest('TC26', 'branch05: Chặn xóa chi nhánh có khoa con (RESTRICT) -> 2003', res.body.code === '2003');

  // TC27: dept02 - Lấy danh sách khoa
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/departments',
    headers: adminHeader
  });
  recordTest('TC27', 'dept02: Danh sách khoa chuyên môn -> 1000 OK', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC28: dept04 - Chỉnh sửa khoa
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/departments/${createdDeptId}`,
    headers: adminHeader,
    body: {
      description: 'Mô tả khoa cập nhật'
    }
  });
  recordTest('TC28', 'dept04: Chỉnh sửa khoa -> 1000 OK', res.body.code === '1000');

  // TC29: room01 - Tạo phòng khám mới
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/rooms',
    headers: adminHeader,
    body: {
      name: 'Phòng Tập Vật Lý Trị Liệu',
      description: 'Phòng chức năng mới',
      department_id: createdDeptId
    }
  });
  const createdRoomId = res.body.data?.id;
  recordTest('TC29', 'room01: Tạo phòng khám mới -> 1001 Created', res.body.code === '1001' && !!createdRoomId);

  // TC30: room02 - Lấy danh sách phòng khám
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/rooms',
    headers: adminHeader
  });
  recordTest('TC30', 'room02: Danh sách phòng khám -> 1000 OK', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC31: room04 - Chỉnh sửa phòng khám
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/rooms/${createdRoomId}`,
    headers: adminHeader,
    body: {
      name: 'Phòng Tập Vật Lý Trị Liệu VIP'
    }
  });
  recordTest('TC31', 'room04: Chỉnh sửa phòng khám -> 1000 OK', res.body.code === '1000');

  // TC32: dept05 - Xóa khoa đang có phòng khám (ON DELETE SET NULL)
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/departments/${createdDeptId}`,
    headers: adminHeader
  });
  // Kiểm tra phòng khám vẫn còn và department_id = null
  let roomCheck = await makeHttpRequest({
    method: 'GET',
    path: `/api/v1/rooms/${createdRoomId}`,
    headers: adminHeader
  });
  recordTest('TC32', 'dept05: Xóa khoa -> Phòng khám chuyển department_id = null (ON DELETE SET NULL)', res.body.code === '1000' && roomCheck.body.data.department_id === null);

  // TC33: room05 - Xóa phòng khám không có nhân sự
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/rooms/${createdRoomId}`,
    headers: adminHeader
  });
  recordTest('TC33', 'room05: Xóa phòng khám thành công -> 1000 OK', res.body.code === '1000');

  // TC34: branch05 - Xóa chi nhánh trống
  // Tạo chi nhánh tạm thời không có khoa hay nhân viên để kiểm tra xóa thành công
  const tempBranchRes = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/branches',
    headers: adminHeader,
    body: {
      name: `Cơ sở Độc Lập ${Date.now()}`,
      address: '100 Độc Lập, Hà Nội',
      phone: '02431112222'
    }
  });
  const tempBranchId = tempBranchRes.body.data?.id;

  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/branches/${tempBranchId}`,
    headers: adminHeader
  });
  recordTest('TC34', 'branch05: Xóa chi nhánh không còn dữ liệu con -> 1000 OK', res.body.code === '1000');

  console.log('\n--- NHÓM 3: BACKEND SLIDE 11 (DYNAMIC FORM BUILDER) ---');

  // TC35: tmpl01 - Tạo mẫu phiếu mới hợp lệ
  const templateCode = `TMPL_TEST_${Date.now()}`;
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/templates',
    headers: adminHeader,
    body: {
      code_template: templateCode,
      name: 'Phiếu Khảo Sát Thử Nghiệm Mới',
      description: 'Phiếu theo dõi lâm sàng thử nghiệm',
      version: '1.0',
      is_active: '1'
    }
  });
  recordTest('TC35', 'tmpl01: Tạo mẫu phiếu khám mới -> 1001 Created', res.body.code === '1001' && res.body.data.code_template === templateCode);

  // TC36: tmpl01 - Tạo mẫu phiếu trùng code_template (Mã lỗi 4102)
  res = await makeHttpRequest({
    method: 'POST',
    path: '/api/v1/templates',
    headers: adminHeader,
    body: {
      code_template: templateCode,
      name: 'Phiếu Trùng Mã'
    }
  });
  recordTest('TC36', 'tmpl01: Tạo mẫu phiếu trùng code -> 4102 Template code exists', res.body.code === '4102');

  // TC37: tmpl02 - Lấy danh sách mẫu phiếu
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/templates/all',
    headers: adminHeader
  });
  recordTest('TC37', 'tmpl02: Lấy danh sách tất cả mẫu phiếu -> 1000 OK', res.body.code === '1000' && Array.isArray(res.body.data));

  // TC38: tmpl03 - Lấy chi tiết cây biểu mẫu đa tầng 4 tầng
  res = await makeHttpRequest({
    method: 'GET',
    path: `/api/v1/templates/${templateCode}`,
    headers: adminHeader
  });
  recordTest('TC38', 'tmpl03: Lấy chi tiết cây biểu mẫu 4 tầng -> 1000 OK', res.body.code === '1000' && res.body.data.code_template === templateCode);

  // TC39: tmpl03 - Lấy mẫu phiếu không tồn tại (Mã lỗi 4101)
  res = await makeHttpRequest({
    method: 'GET',
    path: '/api/v1/templates/TMPL_NON_EXISTENT',
    headers: adminHeader
  });
  recordTest('TC39', 'tmpl03: Lấy mẫu không tồn tại -> 4101 Template not found', res.body.code === '4101');

  // TC40: tmpl04 - Cập nhật trạng thái mẫu phiếu is_active = "0"
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/templates/${templateCode}`,
    headers: adminHeader,
    body: {
      is_active: '0'
    }
  });
  recordTest('TC40', 'tmpl04: Cập nhật is_active = "0" -> 1000 OK', res.body.code === '1000' && res.body.data.is_active === '0');

  // TC41: tmpl05 - Xóa mẫu phiếu đang gắn với bệnh án (Mã lỗi 4105)
  res = await makeHttpRequest({
    method: 'DELETE',
    path: '/api/v1/templates/TMPL_URT_CHRONIC',
    headers: adminHeader
  });
  recordTest('TC41', 'tmpl05: Chặn xóa mẫu phiếu đang sử dụng -> 4105 Template in use', res.body.code === '4105');

  // TC42: sec01 - Tạo phân mục mới trong mẫu phiếu
  res = await makeHttpRequest({
    method: 'POST',
    path: `/api/v1/templates/${templateCode}/sections`,
    headers: adminHeader,
    body: {
      title: 'Phần I: Khảo sát triệu chứng ban đầu',
      order: '1',
      filled_by: 'both'
    }
  });
  const createdSecId = res.body.data?.section_id;
  recordTest('TC42', 'sec01: Tạo phân mục mới -> 1001 Created', res.body.code === '1001' && !!createdSecId);

  // TC43: sec02 - Chỉnh sửa phân mục
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/templates/sections/${createdSecId}`,
    headers: adminHeader,
    body: {
      title: 'Phần I: Khảo sát triệu chứng ban đầu (Cập nhật)'
    }
  });
  recordTest('TC43', 'sec02: Chỉnh sửa phân mục -> 1000 OK', res.body.code === '1000');

  // TC44: sec02 - Chỉnh sửa phân mục sai ID (Mã lỗi 4103)
  res = await makeHttpRequest({
    method: 'PUT',
    path: '/api/v1/templates/sections/SEC_INVALID_9999',
    headers: adminHeader,
    body: {
      title: 'Sai ID'
    }
  });
  recordTest('TC44', 'sec02: Chỉnh sửa section sai ID -> 4103 Section not found', res.body.code === '4103');

  // TC45: ques01 - Thêm câu hỏi loại trắc nghiệm kèm options và show_if_answer
  res = await makeHttpRequest({
    method: 'POST',
    path: `/api/v1/templates/sections/${createdSecId}/questions`,
    headers: adminHeader,
    body: {
      question_id: `Q_PRURITUS_${Date.now()}`,
      question_text: 'Bạn có cảm thấy ngứa râm ran dữ dội về ban đêm không?',
      type_question: 'radio',
      order: '1',
      is_required: '1',
      allow_image: '1',
      options: [
        { id: 'OPT_YES', option_text: 'Có ngứa nhiều', option_value: 'YES', order: '1', trigger_image_upload: '1' },
        { id: 'OPT_NO', option_text: 'Không ngứa', option_value: 'NO', order: '2', trigger_image_upload: '0' }
      ]
    }
  });
  const createdQId = res.body.data?.question_id;
  recordTest('TC45', 'ques01: Thêm câu hỏi trắc nghiệm kèm options -> 1001 Created', res.body.code === '1001' && !!createdQId && res.body.data.options.length === 2);

  // TC46: ques02 - Chỉnh sửa câu hỏi
  res = await makeHttpRequest({
    method: 'PUT',
    path: `/api/v1/templates/questions/${createdQId}`,
    headers: adminHeader,
    body: {
      question_text: 'Bạn có cảm thấy ngứa râm ran dữ dội về ban đêm không? (Cập nhật)'
    }
  });
  recordTest('TC46', 'ques02: Chỉnh sửa nội dung câu hỏi -> 1000 OK', res.body.code === '1000');

  // TC47: ques02 - Chỉnh sửa câu hỏi sai ID (Mã lỗi 4104)
  res = await makeHttpRequest({
    method: 'PUT',
    path: '/api/v1/templates/questions/Q_INVALID_9999',
    headers: adminHeader,
    body: {
      question_text: 'Sai ID'
    }
  });
  recordTest('TC47', 'ques02: Chỉnh sửa câu hỏi sai ID -> 4104 Question not found', res.body.code === '4104');

  // TC48: ques03 - Xóa câu hỏi khỏi Form
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/templates/questions/${createdQId}`,
    headers: adminHeader
  });
  recordTest('TC48', 'ques03: Xóa câu hỏi -> 1000 OK', res.body.code === '1000');

  // TC49: sec03 - Xóa phân mục
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/templates/sections/${createdSecId}`,
    headers: adminHeader
  });
  recordTest('TC49', 'sec03: Xóa phân mục khỏi mẫu -> 1000 OK', res.body.code === '1000');

  // TC50: tmpl05 - Xóa mẫu phiếu chưa từng sử dụng
  res = await makeHttpRequest({
    method: 'DELETE',
    path: `/api/v1/templates/${templateCode}`,
    headers: adminHeader
  });
  recordTest('TC50', 'tmpl05: Xóa mẫu phiếu chưa từng sử dụng -> 1000 OK', res.body.code === '1000');

  // TỔNG KẾT
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} PASS (${passRate}%)`);
  console.log('================================================================\n');

  // Lưu file kết quả JSON
  const outPath = path.resolve(__dirname, '../data/test_results_slide_3_4_11.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Đã xuất kết quả kiểm thử ra: ${outPath}\n`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Lỗi khi chạy bộ kiểm thử:', err);
  process.exit(1);
});
