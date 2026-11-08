/**
 * @file src/controllers/adminController.js
 * @description Controller xử lý toàn bộ các API của Backend Slide 3:
 * Quản trị Người dùng, Phân công công tác và Phân quyền RBAC (admin01..06, role01..02, perm01..04, roleperm01..03).
 */

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore } = require('../config/runtimeStore');

// Khởi tạo các cấu trúc lưu trữ RBAC & Phân công công tác trong state nếu chưa có
if (!state.customRoles) state.customRoles = {};
if (!state.customPermissions) state.customPermissions = {};
if (!state.rolePermissions) state.rolePermissions = {};
if (!state.staffAssignments) state.staffAssignments = {};

/**
 * admin02: get_list_users - Xem danh sách người dùng có phân trang
 */
async function getListUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const roleId = req.query.role_id ? parseInt(req.query.role_id) : null;
    const offset = (page - 1) * limit;

    let countSql = `SELECT COUNT(*) AS total FROM public.taikhoan tk JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi`;
    let listSql = `
      SELECT n.ma_nguoi AS user_id, n.ho_ten AS ffull_name, n.so_dien_thoai AS phone,
             n.gioi_tinh AS gender, tk.ma_vai_tro AS role_id, tk.trang_thai_hoat_dong AS is_active,
             vt.ten_vai_tro AS role_name, nv.ma_chi_nhanh AS db_branch_id
      FROM public.taikhoan tk
      JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi
      LEFT JOIN public.vaitro vt ON vt.ma_vai_tro = tk.ma_vai_tro
      LEFT JOIN public.nhanvien nv ON nv.ma_nhan_vien = n.ma_nguoi
    `;
    const params = [];

    if (roleId) {
      countSql += ` WHERE tk.ma_vai_tro = $1`;
      listSql += ` WHERE tk.ma_vai_tro = $1`;
      params.push(roleId);
    }

    listSql += ` ORDER BY n.ma_nguoi ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || 0);

    const listRes = await query(listSql, [...params, limit, offset]);

    const data = listRes.rows.map(row => {
      const uid = Number(row.user_id);
      const assignment = (state.staffAssignments && state.staffAssignments[uid]) || {};
      return {
        user_id: uid,
        ffull_name: row.ffull_name,
        full_name: row.ffull_name,
        phone: row.phone,
        gender: row.gender === 'Nu' ? 'female' : 'male',
        role_id: Number(row.role_id),
        role_name: row.role_name || null,
        is_active: row.is_active ? 1 : 0,
        branch_id: assignment.branch_id || (row.db_branch_id ? Number(row.db_branch_id) : null),
        department_id: assignment.department_id || null,
        room_id: assignment.room_id || null,
        employee_code: assignment.employee_code || `NV-${String(uid).padStart(3, '0')}`,
        specialty: assignment.specialty || null
      };
    });

    return res.status(200).json({
      code: '1000',
      message: 'OK',
      total: total,
      data: data
    });
  } catch (err) {
    console.error('[AdminController] getListUsers error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * admin03: get_user_details - Lấy chi tiết thông tin và hồ sơ người dùng
 */
async function getUserDetails(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const userRes = await query(
      `SELECT n.ma_nguoi AS user_id, n.ho_ten AS ffull_name, n.so_dien_thoai AS phone,
              n.gioi_tinh AS gender, n.ngay_sinh, n.dia_chi_tinh_tp AS city_address,
              n.dia_chi_xa_phuong AS commune_address, n.dia_chi_so_nha_thon_pho AS hamlet_address,
              n.thoi_diem_tao AS first_visit,
              tk.ma_vai_tro AS role_id, tk.trang_thai_hoat_dong AS is_active,
              bn.nghe_nghiep AS career, bn.dan_toc AS ethnic, bn.bhyt_so_the AS health_insurance_code,
              bn.bhyt_gia_tri_den AS health_insurance_expiry, bn.nguoi_nha_ho_ten_dia_chi AS next_of_kin_name,
              bn.nguoi_nha_so_dien_thoai AS next_of_kin_phone
       FROM public.nguoi n
       LEFT JOIN public.taikhoan tk ON tk.ma_nguoi = n.ma_nguoi
       LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = n.ma_nguoi
       WHERE n.ma_nguoi = $1`,
      [id]
    );

    if (userRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND); // 3007
    }

    const row = userRes.rows[0];
    const assignment = state.staffAssignments[id] || {};
    const extra = state.userExtraProfile[id] || {};

    let yearOfBirth = null;
    if (row.ngay_sinh) {
      yearOfBirth = new Date(row.ngay_sinh).getFullYear();
    }

    const userDetail = {
      user_id: Number(row.user_id),
      ffull_name: row.ffull_name,
      phone: row.phone,
      role_id: row.role_id ? Number(row.role_id) : 4,
      gender: row.gender === 'Nam' ? 'male' : row.gender === 'Nu' ? 'female' : 'other',
      year_of_birth: yearOfBirth,
      career: row.career || extra.career || null,
      ethnic: row.ethnic || extra.ethnic || null,
      hamlet_address: row.hamlet_address || null,
      commune_address: row.commune_address || null,
      city_address: row.city_address || null,
      work_place: extra.work_place || null,
      health_insurance_code: row.health_insurance_code || null,
      health_insurance_expiry: row.health_insurance_expiry ? row.health_insurance_expiry.toISOString().slice(0, 10) : null,
      next_of_kin_name: row.next_of_kin_name || extra.next_of_kin_name || null,
      next_of_kin_phone: row.next_of_kin_phone || null,
      first_visit: row.first_visit ? row.first_visit.toISOString() : null,
      is_active: row.is_active ? 1 : 0,
      branch_id: assignment.branch_id || null,
      department_id: assignment.department_id || null,
      room_id: assignment.room_id || null
    };

    return sendResponse(res, RESPONSE_CODES.OK, userDetail);
  } catch (err) {
    console.error('[AdminController] getUserDetails error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * admin01: create_user - Tạo người dùng mới, kiểm tra trùng SĐT (mã 3006)
 */
async function createUser(req, res) {
  try {
    const { ffull_name, fullName, phone, password, gender, role_id, is_active } = req.body;
    const effectiveName = (ffull_name || fullName || '').trim();

    if (!effectiveName || !phone || !password || !role_id) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    const cleanPhone = String(phone).trim();
    if (!cleanPhone.match(/^[0-9]{10}$/)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PHONE_FORMAT);
    }

    // Kiểm tra trùng SĐT trong CSDL (mã lỗi 3006: User phone already exists)
    const checkRes = await query(`SELECT ma_nguoi FROM public.nguoi WHERE so_dien_thoai = $1`, [cleanPhone]);
    if (checkRes.rowCount > 0) {
      return sendResponse(res, RESPONSE_CODES.PHONE_ALREADY_EXISTS);
    }

    const dbGender = (gender === 'female' || gender === 'Nu') ? 'Nu' : 'Nam';
    const hash = await bcrypt.hash(password, 10);
    const activeBool = is_active !== undefined ? Boolean(Number(is_active)) : true;

    // Chèn vào public.nguoi
    const insertNguoi = await query(
      `INSERT INTO public.nguoi (ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh)
       VALUES ($1, $2, $3, '1990-01-01')
       RETURNING ma_nguoi, ho_ten, so_dien_thoai`,
      [effectiveName, cleanPhone, dbGender]
    );
    const userId = Number(insertNguoi.rows[0].ma_nguoi);

    // Chèn vào public.taikhoan
    await query(
      `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, role_id, cleanPhone, hash, activeBool]
    );

    // Nếu là nhân sự (bác sĩ/điều dưỡng), đồng bộ nhanvien & phân công công tác ban đầu
    const bId = req.body.branch_id ? Number(req.body.branch_id) : 1;
    const dId = req.body.department_id ? Number(req.body.department_id) : null;
    const rId = req.body.room_id ? Number(req.body.room_id) : null;
    if (Number(role_id) === 2 || Number(role_id) === 3 || Number(role_id) === 1) {
      if (Number(role_id) === 2 || Number(role_id) === 3) {
        await query(
          `INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh)
           VALUES ($1, $2) ON CONFLICT (ma_nhan_vien) DO NOTHING`,
          [userId, bId]
        );
      }
      state.staffAssignments[userId] = {
        user_id: userId,
        branch_id: bId,
        department_id: dId,
        room_id: rId,
        employee_code: req.body.employee_code || `${Number(role_id) === 2 ? 'BS' : Number(role_id) === 3 ? 'DD' : 'ADM'}-${userId}`,
        specialty: req.body.specialty || (Number(role_id) === 2 ? 'Da liễu & Miễn dịch' : 'Điều dưỡng lâm sàng')
      };
      saveStore();
    }

    const createdData = {
      user_id: userId,
      ffull_name: effectiveName,
      phone: cleanPhone,
      role_id: Number(role_id),
      is_active: activeBool ? 1 : 0
    };

    return sendResponse(res, RESPONSE_CODES.CREATED, createdData);
  } catch (err) {
    console.error('[AdminController] createUser error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * admin04: edit_user - Chỉnh sửa thông tin người dùng
 */
async function editUser(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const { ffull_name, fullName, gender, role_id, is_active } = req.body;
    const effectiveName = (ffull_name || fullName || '').trim();

    const userCheck = await query(`SELECT ma_nguoi FROM public.nguoi WHERE ma_nguoi = $1`, [id]);
    if (userCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    if (effectiveName) {
      await query(`UPDATE public.nguoi SET ho_ten = $1 WHERE ma_nguoi = $2`, [effectiveName, id]);
    }
    if (gender) {
      const dbGender = (gender === 'female' || gender === 'Nu') ? 'Nu' : 'Nam';
      await query(`UPDATE public.nguoi SET gioi_tinh = $1 WHERE ma_nguoi = $2`, [dbGender, id]);
    }
    if (role_id) {
      await query(`UPDATE public.taikhoan SET ma_vai_tro = $1 WHERE ma_nguoi = $2`, [role_id, id]);
    }
    if (is_active !== undefined) {
      const activeBool = Boolean(Number(is_active));
      await query(`UPDATE public.taikhoan SET trang_thai_hoat_dong = $1 WHERE ma_nguoi = $2`, [activeBool, id]);
    }

    return getUserDetails(req, res);
  } catch (err) {
    console.error('[AdminController] editUser error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * admin05: delete_user - Xóa người dùng (Bảo vệ dữ liệu y tế, medical_records giữ nguyên)
 */
async function deleteUser(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const userCheck = await query(`SELECT ma_nguoi FROM public.nguoi WHERE ma_nguoi = $1`, [id]);
    if (userCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    // Bảo vệ dữ liệu y tế: Nếu nhân sự đã tạo bệnh án, cập nhật liên kết về NULL thay vì xóa mất bệnh án
    if (state.recordMeta) {
      for (const rec of Object.values(state.recordMeta)) {
        if (rec.created_by === id) rec.created_by = null;
        if (rec.assigned_doctor_id === id) rec.assigned_doctor_id = null;
      }
    }

    // Xóa phân công công tác trong state
    delete state.staffAssignments[id];
    saveStore();

    // Xóa tài khoản và người dùng trong DB (theo ON DELETE CASCADE)
    await query(`DELETE FROM public.taikhoan WHERE ma_nguoi = $1`, [id]);
    await query(`DELETE FROM public.nhanvien WHERE ma_nhan_vien = $1`, [id]);
    await query(`DELETE FROM public.benhnhan WHERE ma_benh_nhan = $1`, [id]);
    await query(`DELETE FROM public.nguoi WHERE ma_nguoi = $1`, [id]);

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xoá người dùng thành công');
  } catch (err) {
    console.error('[AdminController] deleteUser error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * admin06: assign_user - Phân công công tác nhân viên y tế vào chi nhánh, khoa, phòng
 */
async function assignUser(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { branch_id, department_id, room_id } = req.body;

    if (!id || !branch_id || !department_id) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    const bId = Number(branch_id);
    const dId = Number(department_id);
    const rId = room_id ? Number(room_id) : null;

    // Kiểm tra người dùng tồn tại
    const userCheck = await query(`SELECT ma_nguoi FROM public.nguoi WHERE ma_nguoi = $1`, [id]);
    if (userCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    // Kiểm tra tính hợp lệ của chi nhánh & khoa
    const branchCheck = await query(`SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [bId]);
    if (branchCheck.rowCount === 0 && (!state.branches || !state.branches[bId])) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Chi nhánh không tồn tại');
    }

    // Kiểm tra khoa trực thuộc chi nhánh
    const dept = state.departments ? state.departments[dId] : null;
    if (dept && dept.branch_id !== bId) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Khoa không trực thuộc chi nhánh này');
    }

    // Nếu truyền room_id, kiểm tra room có thuộc khoa đó không
    if (rId) {
      const room = state.rooms ? state.rooms[rId] : null;
      if (room && room.department_id && room.department_id !== dId) {
        return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Phòng khám không trực thuộc khoa này');
      }
    }

    // Cập nhật phân công công tác
    state.staffAssignments[id] = {
      user_id: id,
      branch_id: bId,
      department_id: dId,
      room_id: rId
    };
    saveStore();

    // Đồng bộ vào bảng nhanvien
    await query(
      `INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh)
       VALUES ($1, $2)
       ON CONFLICT (ma_nhan_vien) DO UPDATE SET ma_chi_nhanh = $2`,
      [id, bId]
    );

    return sendResponse(res, RESPONSE_CODES.OK, {
      user_id: id,
      branch_id: bId,
      department_id: dId,
      room_id: rId
    }, 'Phân công thành công');
  } catch (err) {
    console.error('[AdminController] assignUser error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

// ==========================================
// RBAC: ROLES & PERMISSIONS
// ==========================================

async function createRole(req, res) {
  try {
    const { name, description, parent_role_id } = req.body;
    if (!name || !name.trim()) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const cleanName = name.trim();
    const existing = await query(`SELECT ma_vai_tro FROM public.vaitro WHERE lower(ten_vai_tro) = lower($1)`, [cleanName]);
    if (existing.rowCount > 0 || (state.customRoles && state.customRoles[cleanName.toLowerCase()])) {
      return sendResponse(res, RESPONSE_CODES.ROLE_NAME_EXISTS);
    }

    // Chèn vào CSDL
    const insertRes = await query(
      `INSERT INTO public.vaitro (ten_vai_tro, ten_hien_thi, mo_ta_vai_tro)
       VALUES ($1, $1, $2)
       RETURNING ma_vai_tro AS id, ten_vai_tro AS name, mo_ta_vai_tro AS description`,
      [cleanName, description || '']
    );

    const created = insertRes.rows[0];
    const roleObj = {
      id: Number(created.id),
      name: created.name,
      description: created.description,
      parent_role_id: parent_role_id ? Number(parent_role_id) : null
    };

    state.customRoles[cleanName.toLowerCase()] = roleObj;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.CREATED, roleObj);
  } catch (err) {
    console.error('[AdminController] createRole error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getRoles(_req, res) {
  try {
    const dbRoles = await query(`SELECT ma_vai_tro AS id, ten_vai_tro AS name, mo_ta_vai_tro AS description FROM public.vaitro ORDER BY ma_vai_tro ASC`);
    const list = dbRoles.rows.map(r => {
      const custom = state.customRoles ? Object.values(state.customRoles).find(c => c.id === Number(r.id)) : null;
      return {
        id: Number(r.id),
        name: r.name,
        description: r.description,
        parent_role_id: custom?.parent_role_id || null
      };
    });
    return sendResponse(res, RESPONSE_CODES.OK, list);
  } catch (err) {
    console.error('[AdminController] getRoles error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function createPermission(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const cleanName = name.trim();
    const existing = await query(`SELECT ma_quyen_han FROM public.quyenhan WHERE lower(ten_quyen_han) = lower($1)`, [cleanName]);
    if (existing.rowCount > 0) {
      return sendResponse(res, RESPONSE_CODES.PERMISSION_NAME_EXISTS);
    }

    const insertRes = await query(
      `INSERT INTO public.quyenhan (ten_quyen_han, nhom_quyen, mo_ta)
       VALUES ($1, 'ADMIN', $2)
       RETURNING ma_quyen_han AS id, ten_quyen_han AS name, mo_ta AS description, thoi_diem_tao AS created_at`,
      [cleanName, description || '']
    );

    const row = insertRes.rows[0];
    return sendResponse(res, RESPONSE_CODES.CREATED, {
      id: Number(row.id),
      name: row.name,
      description: row.description,
      created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString()
    });
  } catch (err) {
    console.error('[AdminController] createPermission error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getPermissions(_req, res) {
  try {
    const dbPerms = await query(`SELECT ma_quyen_han AS id, ten_quyen_han AS name, mo_ta AS description, thoi_diem_tao AS created_at, thoi_diem_cap_nhat AS updated_at FROM public.quyenhan ORDER BY ma_quyen_han ASC`);
    const list = dbPerms.rows.map(p => ({
      id: Number(p.id),
      name: p.name,
      description: p.description,
      created_at: p.created_at ? p.created_at.toISOString() : null,
      updated_at: p.updated_at ? p.updated_at.toISOString() : null
    }));
    return sendResponse(res, RESPONSE_CODES.OK, list);
  } catch (err) {
    console.error('[AdminController] getPermissions error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editPermission(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const check = await query(`SELECT ma_quyen_han FROM public.quyenhan WHERE ma_quyen_han = $1`, [id]);
    if (check.rowCount === 0) return sendResponse(res, RESPONSE_CODES.PERMISSION_NOT_FOUND);

    if (name) {
      await query(`UPDATE public.quyenhan SET ten_quyen_han = $1 WHERE ma_quyen_han = $2`, [name.trim(), id]);
    }
    if (description !== undefined) {
      await query(`UPDATE public.quyenhan SET mo_ta = $1 WHERE ma_quyen_han = $2`, [description, id]);
    }

    const updated = await query(`SELECT ma_quyen_han AS id, ten_quyen_han AS name, mo_ta AS description, thoi_diem_cap_nhat AS updated_at FROM public.quyenhan WHERE ma_quyen_han = $1`, [id]);
    return sendResponse(res, RESPONSE_CODES.OK, updated.rows[0]);
  } catch (err) {
    console.error('[AdminController] editPermission error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deletePermission(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const check = await query(`SELECT ma_quyen_han FROM public.quyenhan WHERE ma_quyen_han = $1`, [id]);
    if (check.rowCount === 0) return sendResponse(res, RESPONSE_CODES.PERMISSION_NOT_FOUND);

    // CASCADE xóa khỏi bảng trung gian vaitroquyenhan
    await query(`DELETE FROM public.vaitroquyenhan WHERE ma_quyen_han = $1`, [id]);
    await query(`DELETE FROM public.quyenhan WHERE ma_quyen_han = $1`, [id]);

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa quyền hạn thành công');
  } catch (err) {
    console.error('[AdminController] deletePermission error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function assignRolePermissions(req, res) {
  try {
    const { role_id, permissions } = req.body;
    if (!role_id || !Array.isArray(permissions)) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    const rId = Number(role_id);
    const roleCheck = await query(`SELECT ma_vai_tro FROM public.vaitro WHERE ma_vai_tro = $1`, [rId]);
    if (roleCheck.rowCount === 0) return sendResponse(res, RESPONSE_CODES.ROLE_NOT_FOUND);

    for (const pId of permissions) {
      await query(
        `INSERT INTO public.vaitroquyenhan (ma_vai_tro, ma_quyen_han)
         VALUES ($1, $2)
         ON CONFLICT (ma_vai_tro, ma_quyen_han) DO NOTHING`,
        [rId, Number(pId)]
      );
    }

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Gán quyền thành công');
  } catch (err) {
    console.error('[AdminController] assignRolePermissions error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getRolePermissions(req, res) {
  try {
    const roleId = parseInt(req.params.roleId);
    if (!roleId) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const roleCheck = await query(`SELECT ma_vai_tro FROM public.vaitro WHERE ma_vai_tro = $1`, [roleId]);
    if (roleCheck.rowCount === 0) return sendResponse(res, RESPONSE_CODES.ROLE_NOT_FOUND);

    const resPerms = await query(
      `SELECT vtqh.ma_vai_tro, vtqh.ma_quyen_han AS permission_id,
              vtqh.thoi_diem_gan AS assigned_at, qh.ten_quyen_han AS name, qh.mo_ta AS description
       FROM public.vaitroquyenhan vtqh
       JOIN public.quyenhan qh ON qh.ma_quyen_han = vtqh.ma_quyen_han
       WHERE vtqh.ma_vai_tro = $1`,
      [roleId]
    );

    const data = resPerms.rows.map((r, idx) => ({
      role_permission_id: idx + 1,
      permission_id: Number(r.permission_id),
      name: r.name,
      description: r.description,
      assigned_at: r.assigned_at ? r.assigned_at.toISOString() : new Date().toISOString()
    }));

    return sendResponse(res, RESPONSE_CODES.OK, data);
  } catch (err) {
    console.error('[AdminController] getRolePermissions error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function revokeRolePermission(req, res) {
  try {
    const roleId = parseInt(req.params.roleId);
    const permissionId = parseInt(req.params.permissionId);
    if (!roleId || !permissionId) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    await query(
      `DELETE FROM public.vaitroquyenhan WHERE ma_vai_tro = $1 AND ma_quyen_han = $2`,
      [roleId, permissionId]
    );

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Thu hồi quyền thành công');
  } catch (err) {
    console.error('[AdminController] revokeRolePermission error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * admin00: get_dashboard_summary - Tổng quan bảng điều khiển Quản trị Bệnh viện
 * Endpoint: GET /api/v1/admin/dashboard
 */
async function getDashboardSummary(_req, res) {
  try {
    const kpiRes = await query(`
      SELECT
        COUNT(*) FILTER (WHERE trang_thai = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE trang_thai = 'in_progress')::int AS in_progress_count,
        COUNT(*) FILTER (WHERE trang_thai = 'completed')::int AS completed_count,
        COUNT(*)::int AS total_records
      FROM public.hosobenhan
    `);
    const branchCountRes = await query(`SELECT COUNT(*)::int AS cnt FROM public.chinhanh`);
    const userCountsRes = await query(`
      SELECT
        COUNT(*) FILTER (WHERE ma_vai_tro IN (1, 2, 3))::int AS staff_count,
        COUNT(*) FILTER (WHERE ma_vai_tro = 4)::int AS patient_count
      FROM public.taikhoan
    `);

    const recentRes = await query(`
      SELECT hs.ma_ho_so, hs.ma_benh_nhan, hs.loai_benh_an, hs.trang_thai,
             hs.thoi_diem_kham_lan_dau, hs.chan_doan_ban_dau_phong_kham,
             bn_ng.ho_ten AS patient_name, bn_ng.so_dien_thoai AS patient_phone,
             pk.ma_bac_si, bs_ng.ho_ten AS doctor_name
      FROM public.hosobenhan hs
      JOIN public.nguoi bn_ng ON bn_ng.ma_nguoi = hs.ma_benh_nhan
      LEFT JOIN LATERAL (
        SELECT ma_bac_si
        FROM public.phienkham
        WHERE ma_ho_so = hs.ma_ho_so
        ORDER BY lan_kham_thu DESC
        LIMIT 1
      ) pk ON TRUE
      LEFT JOIN public.nguoi bs_ng ON bs_ng.ma_nguoi = pk.ma_bac_si
      ORDER BY hs.thoi_diem_kham_lan_dau DESC NULLS LAST, hs.ma_ho_so DESC
      LIMIT 15
    `);

    const staffRes = await query(`
      SELECT n.ma_nguoi AS user_id, n.ho_ten AS full_name, n.so_dien_thoai AS phone,
             tk.ma_vai_tro AS role_id, vt.ten_vai_tro AS role_name, tk.trang_thai_hoat_dong AS is_active,
             nv.ma_chi_nhanh AS db_branch_id
      FROM public.taikhoan tk
      JOIN public.nguoi n ON n.ma_nguoi = tk.ma_nguoi
      JOIN public.vaitro vt ON vt.ma_vai_tro = tk.ma_vai_tro
      LEFT JOIN public.nhanvien nv ON nv.ma_nhan_vien = n.ma_nguoi
      WHERE tk.ma_vai_tro IN (1, 2, 3)
      ORDER BY tk.ma_vai_tro ASC, n.ma_nguoi ASC
    `);

    const branchesRes = await query(`SELECT ma_chi_nhanh AS id, ten_chi_nhanh AS name, dia_chi AS address, so_dien_thoai AS phone, trang_thai AS is_active FROM public.chinhanh ORDER BY ma_chi_nhanh ASC`);
    const branchMap = {};
    for (const b of branchesRes.rows) {
      branchMap[Number(b.id)] = b.name;
    }
    const depts = state.departments ? Object.values(state.departments) : [];
    const rooms = state.rooms ? Object.values(state.rooms) : [];
    const deptMap = {};
    for (const d of depts) deptMap[Number(d.id)] = d.name;
    const roomMap = {};
    for (const r of rooms) roomMap[Number(r.id)] = r.name;

    const clinicalStaff = staffRes.rows.map((s) => {
      const uid = Number(s.user_id);
      const assign = (state.staffAssignments && state.staffAssignments[uid]) || {};
      const bId = assign.branch_id || (s.db_branch_id ? Number(s.db_branch_id) : 1);
      const dId = assign.department_id || null;
      const rId = assign.room_id || null;
      return {
        user_id: uid,
        full_name: s.full_name,
        phone: s.phone,
        role_id: Number(s.role_id),
        role_name: s.role_name,
        is_active: Boolean(s.is_active),
        employee_code: assign.employee_code || `NV-${uid}`,
        specialty: assign.specialty || 'Đa khoa / Da liễu',
        branch_id: bId,
        branch_name: branchMap[bId] || `Cơ sở ${bId}`,
        department_id: dId,
        department_name: dId ? deptMap[dId] || `Khoa ${dId}` : 'Chưa phân khoa',
        room_id: rId,
        room_name: rId ? roomMap[rId] || `Phòng ${rId}` : 'Chưa phân phòng'
      };
    });

    const recentRecords = recentRes.rows.map((r) => {
      const recId = Number(r.ma_ho_so);
      const docAssign = r.ma_bac_si && state.staffAssignments ? state.staffAssignments[Number(r.ma_bac_si)] : null;
      const rId = docAssign?.room_id;
      return {
        medical_record_id: recId,
        record_code: `BA-2026-${String(recId).padStart(4, '0')}`,
        patient_id: Number(r.ma_benh_nhan),
        patient_name: r.patient_name,
        patient_phone: r.patient_phone,
        loai_benh_an: r.loai_benh_an,
        clinical_type: r.loai_benh_an === 'MAN' ? 'chronic' : 'acute',
        diagnosis: r.chan_doan_ban_dau_phong_kham || (r.loai_benh_an === 'MAN' ? 'Mày đay mạn tính' : 'Mày đay cấp tính'),
        status: r.trang_thai,
        doctor_name: r.doctor_name || null,
        room_name: rId && roomMap[rId] ? roomMap[rId] : 'Phòng Khám Tiếp Đón',
        created_at: r.thoi_diem_kham_lan_dau ? new Date(r.thoi_diem_kham_lan_dau).toISOString() : null
      };
    });

    const templatesObj = state.customTemplates || {};
    const templates = Object.values(templatesObj).map((t) => ({
      code_template: t.code_template || t.template_id,
      name: t.name,
      version: t.version || '1.0',
      is_active: String(t.is_active ?? '1') === '1',
      sections_count: Array.isArray(t.sections) ? t.sections.length : 0,
      questions_count: Array.isArray(t.sections)
        ? t.sections.reduce((acc, s) => acc + (Array.isArray(s.questions) ? s.questions.length : 0), 0)
        : 0
    }));

    return sendResponse(res, RESPONSE_CODES.OK, {
      kpis: {
        pending_count: kpiRes.rows[0]?.pending_count || 0,
        in_progress_count: kpiRes.rows[0]?.in_progress_count || 0,
        completed_count: kpiRes.rows[0]?.completed_count || 0,
        total_records: kpiRes.rows[0]?.total_records || 0,
        branches_count: branchCountRes.rows[0]?.cnt || 0,
        departments_count: depts.length,
        rooms_count: rooms.length,
        staff_count: userCountsRes.rows[0]?.staff_count || 0,
        patient_count: userCountsRes.rows[0]?.patient_count || 0
      },
      recent_records: recentRecords,
      clinical_staff: clinicalStaff,
      branches: branchesRes.rows,
      departments: depts,
      rooms,
      templates
    });
  } catch (err) {
    console.error('[AdminController] getDashboardSummary error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  getDashboardSummary,
  getListUsers,
  getUserDetails,
  createUser,
  editUser,
  deleteUser,
  assignUser,
  createRole,
  getRoles,
  createPermission,
  getPermissions,
  editPermission,
  deletePermission,
  assignRolePermissions,
  getRolePermissions,
  revokeRolePermission
};
