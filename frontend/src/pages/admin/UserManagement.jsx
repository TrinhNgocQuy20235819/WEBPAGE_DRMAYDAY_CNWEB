import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import Pagination from "../../components/common/Pagination";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'doctor' | 'nurse' | 'patient'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal 1: Create New Staff (admin01)
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    code: "",
    name: "",
    phone: "",
    password: "password123",
    gender: "female",
    role_id: 2,
    specialty: "Da liễu & Miễn dịch",
    branch_id: 1,
    department_id: 2,
    room_id: 2,
  });

  // Modal 2: Assign Staff to Topology (Slide 3 admin06 assign_user)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [assignment, setAssignment] = useState({
    branch_id: 1,
    department_id: 1,
    room_id: 1,
    duty_shift: "full_time",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, bRes, dRes, rRes] = await Promise.all([
        apiClient.get("/admin/users", { params: { limit: 100 } }),
        apiClient.get("/branches"),
        apiClient.get("/departments"),
        apiClient.get("/rooms"),
      ]);
      const brList = bRes.data || [];
      const dpList = dRes.data || [];
      const rmList = rRes.data || [];
      setBranches(brList);
      setDepartments(dpList);
      setRooms(rmList);

      const rmMap = {};
      rmList.forEach((r) => {
        rmMap[Number(r.id)] = r.name;
      });
      const brMap = {};
      brList.forEach((b) => {
        brMap[Number(b.id)] = b.name;
      });

      const mappedUsers = (uRes.data || []).map((u) => {
        const rName = u.room_id && rmMap[Number(u.room_id)]
          ? rmMap[Number(u.room_id)]
          : u.branch_id && brMap[Number(u.branch_id)]
          ? brMap[Number(u.branch_id)]
          : u.role_id === 4
          ? "Bệnh nhân ngoại trú"
          : "Chưa phân phòng";
        return {
          id: u.user_id,
          user_id: u.user_id,
          employee_code:
            u.employee_code ||
            (u.role_id === 2
              ? `BS-${u.user_id}`
              : u.role_id === 3
              ? `DD-${u.user_id}`
              : u.role_id === 1
              ? `AD-${u.user_id}`
              : `BN-${u.user_id}`),
          full_name: u.full_name || u.ffull_name,
          phone: u.phone || "",
          gender: u.gender || "male",
          role_id: Number(u.role_id),
          role_name: u.role_name,
          specialty:
            u.specialty ||
            (u.role_id === 2
              ? "Da liễu & Miễn dịch"
              : u.role_id === 3
              ? "Điều dưỡng lâm sàng"
              : u.role_id === 1
              ? "Quản trị hệ thống"
              : "Hồ sơ người bệnh"),
          room: rName,
          branch_id: u.branch_id || 1,
          department_id: u.department_id || 1,
          room_id: u.room_id || null,
          is_active: Number(u.is_active) === 1,
        };
      });
      setUsers(mappedUsers);
    } catch {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const clinicalStaffs = users.filter((u) => u.role_id !== 4);

  const filtered = users.filter((st) => {
    const q = search.toLowerCase();
    const matchSearch =
      (st.full_name || "").toLowerCase().includes(q) ||
      (st.employee_code || "").toLowerCase().includes(q) ||
      (st.phone || "").includes(q) ||
      (st.specialty || "").toLowerCase().includes(q);
    const matchRole =
      roleFilter === "all"
        ? st.role_id !== 4
        : roleFilter === "doctor"
        ? st.role_id === 2
        : roleFilter === "nurse"
        ? st.role_id === 3
        : st.role_id === 4;
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedStaffs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = async (e) => {
    e.preventDefault();
    const cleanPhone = newStaff.phone.replace(/\s+/g, "").trim();
    if (!newStaff.name.trim() || !cleanPhone) {
      toast.error("Vui lòng nhập đầy đủ họ tên và số điện thoại 10 chữ số!");
      return;
    }
    try {
      await apiClient.post("/admin/users", {
        ffull_name: newStaff.name.trim(),
        phone: cleanPhone,
        password: newStaff.password || "password123",
        gender: newStaff.gender,
        role_id: Number(newStaff.role_id),
        employee_code: newStaff.code.trim() || undefined,
        specialty: newStaff.specialty,
        branch_id: Number(newStaff.branch_id),
        department_id: Number(newStaff.department_id) || undefined,
        room_id: Number(newStaff.room_id) || undefined,
        is_active: 1,
      });
      toast.success(`Đã tạo tài khoản nhân sự: ${newStaff.name}`);
      setShowModal(false);
      setNewStaff({
        code: "",
        name: "",
        phone: "",
        password: "password123",
        gender: "female",
        role_id: 2,
        specialty: "Da liễu & Miễn dịch",
        branch_id: branches[0]?.id || 1,
        department_id: departments[0]?.id || 1,
        room_id: rooms[0]?.id || 1,
      });
      await loadAll();
    } catch {
      // Handled by interceptor
    }
  };

  const openAssignModal = (staff) => {
    setSelectedStaff(staff);
    const initBranch = Number(staff.branch_id || branches[0]?.id || 1);
    const branchDepts = departments.filter((d) => Number(d.branch_id) === initBranch);
    const initDept =
      branchDepts.find((d) => Number(d.id) === Number(staff.department_id))?.id ||
      branchDepts[0]?.id ||
      departments[0]?.id ||
      1;
    const deptRooms = rooms.filter((r) => Number(r.department_id) === Number(initDept));
    const initRoom =
      deptRooms.find((r) => Number(r.id) === Number(staff.room_id))?.id ||
      deptRooms[0]?.id ||
      "";
    setAssignment({
      branch_id: initBranch,
      department_id: initDept,
      room_id: initRoom,
      duty_shift: "full_time",
    });
    setShowAssignModal(true);
  };

  const handleBranchSelectInAssign = (newBranchId) => {
    const bId = Number(newBranchId);
    const branchDepts = departments.filter((d) => Number(d.branch_id) === bId);
    const firstDept = branchDepts[0]?.id || "";
    const deptRooms = rooms.filter((r) => Number(r.department_id) === Number(firstDept));
    setAssignment({
      ...assignment,
      branch_id: bId,
      department_id: firstDept,
      room_id: deptRooms[0]?.id || "",
    });
  };

  const handleDeptSelectInAssign = (newDeptId) => {
    const dId = Number(newDeptId);
    const deptRooms = rooms.filter((r) => Number(r.department_id) === dId);
    setAssignment({
      ...assignment,
      department_id: dId,
      room_id: deptRooms[0]?.id || "",
    });
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await apiClient.put(`/admin/users/${selectedStaff.user_id}/assign`, {
        branch_id: Number(assignment.branch_id),
        department_id: Number(assignment.department_id),
        room_id: assignment.room_id ? Number(assignment.room_id) : null,
      });
      toast.success(`Đã cập nhật phân công công tác (admin06) cho ${selectedStaff.full_name}!`);
      setShowAssignModal(false);
      setSelectedStaff(null);
      await loadAll();
    } catch {
      // Handled by interceptor
    }
  };

  const handleToggleActive = async (staff) => {
    try {
      await apiClient.put(`/admin/users/${staff.user_id}`, {
        is_active: staff.is_active ? 0 : 1,
      });
      toast.success(
        staff.is_active
          ? `Đã tạm khóa tài khoản ${staff.full_name}`
          : `Đã kích hoạt lại tài khoản ${staff.full_name}`
      );
      await loadAll();
    } catch {
      // Handled by interceptor
    }
  };

  const handleDeleteUser = async (staff) => {
    if (staff.role_id === 1) {
      toast.error("Không thể xóa tài khoản Quản trị viên hệ thống!");
      return;
    }
    if (!window.confirm(`Xác nhận xóa người dùng ${staff.full_name}? Hồ sơ bệnh án liên quan vẫn được bảo toàn.`)) {
      return;
    }
    try {
      await apiClient.delete(`/admin/users/${staff.user_id}`);
      toast.success(`Đã xóa tài khoản ${staff.full_name}`);
      await loadAll();
    } catch {
      // Handled by interceptor
    }
  };

  const availableDeptsForAssign = departments.filter(
    (d) => Number(d.branch_id) === Number(assignment.branch_id)
  );
  const availableRoomsForAssign = rooms.filter(
    (r) => Number(r.department_id) === Number(assignment.department_id)
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Nhân Sự Y Tế &amp; Phân Quyền</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-profile-2user text-sm"></span>
              <span>Danh bạ bác sĩ, điều dưỡng và điều phối phân công phòng trực</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowModal(true)}
              className="base-btn-hero-accent cursor-pointer"
            >
              <span className="isax icon-user-add text-sm"></span>
              <span>Thêm nhân sự</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="base-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <span className="isax icon-search-normal-1 text-xs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên, SĐT, mã NV, chuyên khoa..."
              className="base-input pl-8 text-xs w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto border-b sm:border-b-0 border-[var(--base-border-opaque)]">
          <button
            onClick={() => {
              setRoleFilter("all");
              setCurrentPage(1);
            }}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "all"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Nhân Sự ({clinicalStaffs.length})
          </button>
          <button
            onClick={() => {
              setRoleFilter("doctor");
              setCurrentPage(1);
            }}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "doctor"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Bác Sĩ ({users.filter((s) => s.role_id === 2).length})
          </button>
          <button
            onClick={() => {
              setRoleFilter("nurse");
              setCurrentPage(1);
            }}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "nurse"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Điều Dưỡng ({users.filter((s) => s.role_id === 3).length})
          </button>
          <button
            onClick={() => {
              setRoleFilter("patient");
              setCurrentPage(1);
            }}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "patient"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Bệnh Nhân ({users.filter((s) => s.role_id === 4).length})
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="base-card overflow-hidden">
        <div className="base-card-header flex items-center justify-between">
          <div>
            <h2 className="base-card-title">Danh Sách Tài Khoản &amp; Vị Trí Công Tác</h2>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý chức danh y tế và phân quyền điều hành (Slide 3 admin01–admin06)</p>
          </div>
          <span className="base-tag base-tag-info font-mono text-[10px]">{filtered.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="base-table">
            <thead>
              <tr>
                <th>Mã định danh</th>
                <th>Họ và tên / SĐT</th>
                <th>Chuyên khoa / Vai trò</th>
                <th>Đơn vị công tác</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                    Đang tải danh sách nhân sự từ cơ sở dữ liệu...
                  </td>
                </tr>
              ) : paginatedStaffs.length > 0 ? (
                paginatedStaffs.map((st) => (
                  <tr key={st.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">
                      {st.employee_code}
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {String(st.employee_code).slice(-2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">{st.full_name}</div>
                          <span className="text-[11px] text-gray-500 font-mono">{st.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-gray-600">{st.specialty}</td>
                    <td className="text-xs font-medium text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <span className="isax icon-hospital text-xs text-[var(--base-brand-blue)]"></span>
                        <span>{st.room}</span>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(st)}
                        className="cursor-pointer"
                        title="Nhấn để Khóa / Mở khóa tài khoản"
                      >
                        {st.is_active ? (
                          <span className="base-tag base-tag-positive text-[10px]">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="base-tag base-tag-neutral text-[10px]">Tạm khóa</span>
                        )}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {st.role_id !== 4 && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(st)}
                            className="base-btn base-btn-secondary base-btn-compact text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <span className="isax icon-routing text-xs text-[var(--base-brand-blue)]"></span>
                            <span>Phân công</span>
                          </button>
                        )}
                        {st.role_id !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(st)}
                            className="base-btn base-btn-secondary base-btn-compact text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa người dùng (admin05)"
                          >
                            <span className="isax icon-trash text-xs"></span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                    <span className="isax icon-profile-2user text-3xl block mb-2 text-gray-300"></span>
                    Không tìm thấy nhân sự phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Modal 1: Thêm Nhân Sự Mới (admin01) */}
      {showModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Thêm Nhân Sự Y Tế Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="base-modal-body space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Vai trò hệ thống *</label>
                    <select
                      value={newStaff.role_id}
                      onChange={(e) => setNewStaff({ ...newStaff, role_id: Number(e.target.value) })}
                      className="base-select text-xs w-full"
                    >
                      <option value={2}>Bác sĩ lâm sàng</option>
                      <option value={3}>Điều dưỡng</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Mã nhân viên</label>
                    <input
                      type="text"
                      value={newStaff.code}
                      onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })}
                      placeholder="VD: BS-109"
                      className="base-input font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Họ tên &amp; Học hàm/Học vị *</label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="VD: BSCKII. Vũ Thị Hằng"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại đăng nhập *</label>
                    <input
                      type="tel"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="0978123456"
                      className="base-input font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Mật khẩu ban đầu *</label>
                    <input
                      type="text"
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      className="base-input font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Chuyên khoa lâm sàng *</label>
                  <select
                    value={newStaff.specialty}
                    onChange={(e) => setNewStaff({ ...newStaff, specialty: e.target.value })}
                    className="base-select text-xs w-full"
                  >
                    <option value="Da liễu & Miễn dịch">Da liễu &amp; Miễn dịch lâm sàng</option>
                    <option value="Dị ứng & Hen phế quản">Dị ứng &amp; Hen phế quản</option>
                    <option value="Cấp cứu Da liễu">Cấp cứu &amp; Hồi sức Da liễu</option>
                    <option value="Xét nghiệm Miễn dịch">Xét nghiệm Miễn dịch &amp; Giải phẫu bệnh</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Chi nhánh công tác *</label>
                  <select
                    value={newStaff.branch_id}
                    onChange={(e) => setNewStaff({ ...newStaff, branch_id: Number(e.target.value) })}
                    className="base-select text-xs w-full"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Thêm Nhân Sự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Phân Công Công Tác & Phòng Trực (Slide 3 admin06 assign_user) */}
      {showAssignModal && selectedStaff && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-lg w-full">
            <div className="base-modal-header">
              <div>
                <h3 className="base-modal-title">Phân Công Công Tác &amp; Phòng Trực</h3>
                <span className="font-mono text-[10px] text-[var(--base-brand-blue)]">
                  API: admin06 (PUT /api/v1/admin/users/{selectedStaff.user_id}/assign)
                </span>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStaff(null);
                }}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div className="base-modal-body space-y-4">
                <div className="p-3 bg-gray-50 border border-[var(--base-border-opaque)] flex items-center gap-3">
                  <div className="h-10 w-10 bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {String(selectedStaff.employee_code).slice(-2)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{selectedStaff.full_name}</div>
                    <span className="text-[11px] text-gray-500">{selectedStaff.specialty}</span>
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">Hiện tại: {selectedStaff.room}</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    1. Chi nhánh trực thuộc (branch_id) *
                  </label>
                  <select
                    value={assignment.branch_id}
                    onChange={(e) => handleBranchSelectInAssign(e.target.value)}
                    className="base-select text-xs w-full"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        CS-{b.id} — {b.name} ({b.address})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    2. Khoa / Trung tâm chuyên môn (department_id) *
                  </label>
                  <select
                    value={assignment.department_id}
                    onChange={(e) => handleDeptSelectInAssign(e.target.value)}
                    className="base-select text-xs w-full"
                    required
                  >
                    {availableDeptsForAssign.map((d) => (
                      <option key={d.id} value={d.id}>
                        KH-{d.id} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    3. Phòng khám / Phòng thủ thuật (room_id)
                  </label>
                  <select
                    value={assignment.room_id}
                    onChange={(e) => setAssignment({ ...assignment, room_id: e.target.value })}
                    className="base-select text-xs w-full"
                  >
                    <option value="">-- Không cố định phòng --</option>
                    {availableRoomsForAssign.map((r) => (
                      <option key={r.id} value={r.id}>
                        PK-{r.id} — {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    4. Chế độ phân công ca trực *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignment({ ...assignment, duty_shift: "morning" })}
                      className={`py-1.5 px-2 text-xs font-bold border cursor-pointer ${
                        assignment.duty_shift === "morning"
                          ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                          : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                      }`}
                    >
                      Ca sáng (07:30 - 12:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignment({ ...assignment, duty_shift: "afternoon" })}
                      className={`py-1.5 px-2 text-xs font-bold border cursor-pointer ${
                        assignment.duty_shift === "afternoon"
                          ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                          : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                      }`}
                    >
                      Ca chiều (13:30 - 17:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignment({ ...assignment, duty_shift: "full_time" })}
                      className={`py-1.5 px-2 text-xs font-bold border cursor-pointer ${
                        assignment.duty_shift === "full_time"
                          ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                          : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                      }`}
                    >
                      Toàn thời gian
                    </button>
                  </div>
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedStaff(null);
                  }}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Lưu Phân Công (admin06)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
