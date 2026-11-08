/**
 * @file src/controllers/topologyController.js
 * @description Controller xử lý toàn bộ các API của Backend Slide 4:
 * Quản lý Hạ tầng Cơ sở vật chất & Sơ đồ tổ chức (Chi nhánh - Khoa - Phòng).
 * (branch01..05, dept01..05, room01..05).
 */

const { query } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore } = require('../config/runtimeStore');

// Khởi tạo các cấu trúc hạ tầng trong state nếu chưa có
if (!state.departments) {
  state.departments = {
    1: { id: 1, name: 'Khoa Khám Bệnh Chuyên Sâu', description: 'Tiếp đón và sàng lọc ban đầu', branch_id: 1, created_at: new Date().toISOString() },
    2: { id: 2, name: 'Khoa Miễn Dịch & Dị Ứng Da', description: 'Chuyên khoa mề đay mạn', branch_id: 1, created_at: new Date().toISOString() },
    3: { id: 3, name: 'Khoa Tự Miễn & Tế Bào Gốc', description: 'Nghiệm pháp kích thích và ca khó', branch_id: 2, created_at: new Date().toISOString() }
  };
}
if (!state.rooms) {
  state.rooms = {
    1: { id: 1, name: 'Phòng Khám Tiếp Đón Ban Đầu', department_id: 1, description: 'Phòng 301', created_at: new Date().toISOString() },
    2: { id: 2, name: 'Phòng Khám Chuyên Đề Mày Đay', department_id: 2, description: 'Phòng 302', created_at: new Date().toISOString() },
    3: { id: 3, name: 'Phòng Xét Nghiệm Dị Ứng & IgE', department_id: 2, description: 'Phòng Lab Miễn Dịch', created_at: new Date().toISOString() },
    4: { id: 4, name: 'Phòng Test Áp & Kích Thích Lạnh', department_id: 3, description: 'Phòng Thử Nghiệm Vật Lý', created_at: new Date().toISOString() }
  };
}
if (!state.deptSeq) state.deptSeq = 10;
if (!state.roomSeq) state.roomSeq = 10;

// ==========================================
// 1. CHI NHÁNH / CƠ SỞ Y TẾ (BRANCHES)
// ==========================================

async function createBranch(req, res) {
  try {
    const { name, address, phone } = req.body;
    if (!name || !address || !phone) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    const insertRes = await query(
      `INSERT INTO public.chinhanh (ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai)
       VALUES ($1, $2, $3, TRUE)
       RETURNING ma_chi_nhanh AS id, ten_chi_nhanh AS name, dia_chi AS address, so_dien_thoai AS phone, trang_thai AS is_active`,
      [name.trim(), address.trim(), phone.trim()]
    );

    const row = insertRes.rows[0];
    const created = {
      id: Number(row.id),
      name: row.name,
      address: row.address,
      phone: row.phone,
      is_active: row.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return sendResponse(res, RESPONSE_CODES.CREATED, created);
  } catch (err) {
    console.error('[TopologyController] createBranch error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getBranches(_req, res) {
  try {
    const dbRes = await query(`SELECT ma_chi_nhanh AS id, ten_chi_nhanh AS name, dia_chi AS address, so_dien_thoai AS phone, trang_thai AS is_active FROM public.chinhanh ORDER BY ma_chi_nhanh ASC`);
    const list = dbRes.rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      address: r.address,
      phone: r.phone,
      is_active: r.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    return sendResponse(res, RESPONSE_CODES.OK, list);
  } catch (err) {
    console.error('[TopologyController] getBranches error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getBranchDetail(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const dbRes = await query(`SELECT ma_chi_nhanh AS id, ten_chi_nhanh AS name, dia_chi AS address, so_dien_thoai AS phone, trang_thai AS is_active FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [id]);
    if (dbRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.BRANCH_NOT_FOUND);
    }

    const row = dbRes.rows[0];
    return sendResponse(res, RESPONSE_CODES.OK, {
      id: Number(row.id),
      name: row.name,
      address: row.address,
      phone: row.phone,
      is_active: row.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[TopologyController] getBranchDetail error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editBranch(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const { name, address, phone, is_active } = req.body;
    const check = await query(`SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [id]);
    if (check.rowCount === 0) return sendResponse(res, RESPONSE_CODES.BRANCH_NOT_FOUND);

    if (name) await query(`UPDATE public.chinhanh SET ten_chi_nhanh = $1 WHERE ma_chi_nhanh = $2`, [name.trim(), id]);
    if (address) await query(`UPDATE public.chinhanh SET dia_chi = $1 WHERE ma_chi_nhanh = $2`, [address.trim(), id]);
    if (phone) await query(`UPDATE public.chinhanh SET so_dien_thoai = $1 WHERE ma_chi_nhanh = $2`, [phone.trim(), id]);
    if (is_active !== undefined) await query(`UPDATE public.chinhanh SET trang_thai = $1 WHERE ma_chi_nhanh = $2`, [Boolean(is_active), id]);

    return getBranchDetail(req, res);
  } catch (err) {
    console.error('[TopologyController] editBranch error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deleteBranch(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const check = await query(`SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [id]);
    if (check.rowCount === 0) return sendResponse(res, RESPONSE_CODES.BRANCH_NOT_FOUND);

    // Kiểm tra ràng buộc RESTRICT: Không thể xóa chi nhánh nếu có khoa hoặc nhân sự
    const hasDept = Object.values(state.departments).some(d => d.branch_id === id);
    const hasStaff = Object.values(state.staffAssignments).some(s => s.branch_id === id);
    const hasDbStaff = await query(`SELECT ma_nhan_vien FROM public.nhanvien WHERE ma_chi_nhanh = $1`, [id]);

    if (hasDept || hasStaff || hasDbStaff.rowCount > 0) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Không thể xóa chi nhánh do tồn tại dữ liệu con trực thuộc (RESTRICT)');
    }

    await query(`DELETE FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [id]);
    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa chi nhánh thành công');
  } catch (err) {
    console.error('[TopologyController] deleteBranch error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

// ==========================================
// 2. KHOA CHUYÊN MÔN (DEPARTMENTS)
// ==========================================

async function createDepartment(req, res) {
  try {
    const { name, description, branch_id } = req.body;
    if (!name || !branch_id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const bId = Number(branch_id);
    const branchCheck = await query(`SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [bId]);
    if (branchCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'branch_id không tồn tại');
    }

    const newId = ++state.deptSeq;
    const newDept = {
      id: newId,
      name: name.trim(),
      description: description || '',
      branch_id: bId,
      created_at: new Date().toISOString()
    };

    state.departments[newId] = newDept;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.CREATED, newDept);
  } catch (err) {
    console.error('[TopologyController] createDepartment error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getDepartments(req, res) {
  try {
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    let list = Object.values(state.departments);
    if (branchId) {
      list = list.filter(d => d.branch_id === branchId);
    }
    return sendResponse(res, RESPONSE_CODES.OK, list);
  } catch (err) {
    console.error('[TopologyController] getDepartments error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getDepartmentDetail(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const dept = state.departments[id];
    if (!dept) return sendResponse(res, RESPONSE_CODES.DEPARTMENT_NOT_FOUND);

    return sendResponse(res, RESPONSE_CODES.OK, dept);
  } catch (err) {
    console.error('[TopologyController] getDepartmentDetail error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editDepartment(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const dept = state.departments[id];
    if (!dept) return sendResponse(res, RESPONSE_CODES.DEPARTMENT_NOT_FOUND);

    const { name, description, branch_id } = req.body;
    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description;
    if (branch_id) {
      const bId = Number(branch_id);
      const branchCheck = await query(`SELECT ma_chi_nhanh FROM public.chinhanh WHERE ma_chi_nhanh = $1`, [bId]);
      if (branchCheck.rowCount === 0) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
      dept.branch_id = bId;
    }

    state.departments[id] = dept;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, dept);
  } catch (err) {
    console.error('[TopologyController] editDepartment error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deleteDepartment(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    if (!state.departments[id]) return sendResponse(res, RESPONSE_CODES.DEPARTMENT_NOT_FOUND);

    delete state.departments[id];

    // ON DELETE SET NULL: Cập nhật các phòng trực thuộc về department_id = null
    for (const room of Object.values(state.rooms)) {
      if (room.department_id === id) {
        room.department_id = null;
      }
    }
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa khoa thành công');
  } catch (err) {
    console.error('[TopologyController] deleteDepartment error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

// ==========================================
// 3. PHÒNG KHÁM / PHÒNG CHỨC NĂNG (ROOMS)
// ==========================================

async function createRoom(req, res) {
  try {
    const { name, description, department_id } = req.body;
    if (!name || !department_id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const dId = Number(department_id);
    if (!state.departments[dId]) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'department_id không tồn tại');
    }

    const newId = ++state.roomSeq;
    const newRoom = {
      id: newId,
      name: name.trim(),
      description: description || '',
      department_id: dId,
      created_at: new Date().toISOString()
    };

    state.rooms[newId] = newRoom;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.CREATED, newRoom);
  } catch (err) {
    console.error('[TopologyController] createRoom error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getRooms(req, res) {
  try {
    const deptId = req.query.department_id ? Number(req.query.department_id) : null;
    let list = Object.values(state.rooms);
    if (deptId) {
      list = list.filter(r => r.department_id === deptId);
    }
    return sendResponse(res, RESPONSE_CODES.OK, list);
  } catch (err) {
    console.error('[TopologyController] getRooms error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getRoomDetail(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const room = state.rooms[id];
    if (!room) return sendResponse(res, RESPONSE_CODES.ROOM_NOT_FOUND);

    return sendResponse(res, RESPONSE_CODES.OK, room);
  } catch (err) {
    console.error('[TopologyController] getRoomDetail error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editRoom(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const room = state.rooms[id];
    if (!room) return sendResponse(res, RESPONSE_CODES.ROOM_NOT_FOUND);

    const { name, description, department_id } = req.body;
    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description;
    if (department_id) {
      const dId = Number(department_id);
      if (!state.departments[dId]) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
      room.department_id = dId;
    }

    state.rooms[id] = room;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, room);
  } catch (err) {
    console.error('[TopologyController] editRoom error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deleteRoom(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    if (!state.rooms[id]) return sendResponse(res, RESPONSE_CODES.ROOM_NOT_FOUND);

    // RESTRICT: Không thể xóa phòng khám nếu đang có nhân sự công tác
    const hasStaff = Object.values(state.staffAssignments).some(s => s.room_id === id);
    if (hasStaff) {
      return sendResponse(res, RESPONSE_CODES.ROOM_IN_USE);
    }

    delete state.rooms[id];
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa phòng khám thành công');
  } catch (err) {
    console.error('[TopologyController] deleteRoom error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  createBranch,
  getBranches,
  getBranchDetail,
  editBranch,
  deleteBranch,
  createDepartment,
  getDepartments,
  getDepartmentDetail,
  editDepartment,
  deleteDepartment,
  createRoom,
  getRooms,
  getRoomDetail,
  editRoom,
  deleteRoom
};
