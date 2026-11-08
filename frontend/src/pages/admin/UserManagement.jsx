import { useState } from "react";
import toast from "react-hot-toast";
import { INITIAL_STAFFS, INITIAL_ROOMS, INITIAL_DEPARTMENTS, INITIAL_BRANCHES } from "../../services/mockData";
import Pagination from "../../components/common/Pagination";

export default function UserManagement() {
  const [staffs, setStaffs] = useState(INITIAL_STAFFS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal 1: Create New Staff
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    code: "",
    name: "",
    specialty: "Da liễu & Miễn dịch",
    room: "Phòng 302 - Khám Mày đay Mạn",
  });

  // Modal 2: Assign Staff to Topology (Slide 3 admin06 assign_user)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [assignment, setAssignment] = useState({
    branch_id: "br_1",
    department_id: "dept_1",
    room_id: "room_1",
    duty_shift: "full_time",
  });

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (filter) => {
    setRoleFilter(filter);
    setCurrentPage(1);
  };

  const filtered = staffs.filter((st) => {
    const matchSearch =
      st.full_name.toLowerCase().includes(search.toLowerCase()) ||
      st.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      st.specialty.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === "all"
        ? true
        : roleFilter === "doctor"
        ? st.title.includes("BS")
        : !st.title.includes("BS");
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedStaffs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newStaff.code || !newStaff.name) {
      toast.error("Vui lòng nhập mã và họ tên!");
      return;
    }
    const created = {
      id: `s-${Date.now()}`,
      employee_code: newStaff.code,
      full_name: newStaff.name,
      title: newStaff.name,
      specialty: newStaff.specialty,
      room: newStaff.room,
      is_active: true,
    };
    setStaffs([...staffs, created]);
    setShowModal(false);
    setNewStaff({ code: "", name: "", specialty: "Da liễu & Miễn dịch", room: "Phòng 302 - Khám Mày đay Mạn" });
    toast.success(`Đã thêm nhân sự y tế: ${created.full_name}`);
  };

  const openAssignModal = (staff) => {
    setSelectedStaff(staff);
    setShowAssignModal(true);
  };

  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const targetRoom = INITIAL_ROOMS.find((r) => r.id === assignment.room_id);
    const updatedRoomName = targetRoom ? `${targetRoom.code} - ${targetRoom.name}` : selectedStaff.room;

    setStaffs(
      staffs.map((s) => (s.id === selectedStaff.id ? { ...s, room: updatedRoomName } : s))
    );

    toast.success(`Đã cập nhật phân công công tác (admin06) cho ${selectedStaff.full_name}!`);
    setShowAssignModal(false);
    setSelectedStaff(null);
  };

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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên, mã NV, chuyên khoa..."
              className="base-input pl-8 text-xs w-full"
            />
          </div>
        </div>

        {/* Tab Filters (Line Tab Style) */}
        <div className="flex items-center gap-4 w-full sm:w-auto border-b sm:border-b-0 border-[var(--base-border-opaque)]">
          <button
            onClick={() => handleRoleFilterChange("all")}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "all"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Tất Cả ({staffs.length})
          </button>
          <button
            onClick={() => handleRoleFilterChange("doctor")}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "doctor"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Bác Sĩ ({staffs.filter((s) => s.title.includes("BS")).length})
          </button>
          <button
            onClick={() => handleRoleFilterChange("nurse")}
            className={`pb-2 sm:pb-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
              roleFilter === "nurse"
                ? "border-[var(--base-brand-blue)] text-[var(--base-brand-navy)] font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Điều Dưỡng ({staffs.filter((s) => !s.title.includes("BS")).length})
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="base-card overflow-hidden">
        <div className="base-card-header flex items-center justify-between">
          <div>
            <h2 className="base-card-title">Danh Sách Nhân Sự &amp; Vị Trí Công Tác</h2>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý chức danh y tế và phân quyền điều hành (Slide 3 admin06)</p>
          </div>
          <span className="base-tag base-tag-info font-mono text-[10px]">{filtered.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="base-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Chuyên khoa</th>
                <th>Phòng trực công tác</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaffs.length > 0 ? (
                paginatedStaffs.map((st) => (
                  <tr key={st.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">
                      {st.employee_code}
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {st.employee_code.slice(-2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">{st.full_name}</div>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {st.id}</span>
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
                      <span className="base-tag base-tag-positive text-[10px]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                        Đang trực ca
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => openAssignModal(st)}
                        className="base-btn base-btn-secondary base-btn-compact text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span className="isax icon-routing text-xs text-[var(--base-brand-blue)]"></span>
                        <span>Phân công</span>
                      </button>
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

        {/* Pagination Component */}
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

      {/* Modal 1: Thêm Nhân Sự Mới */}
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
              <div className="base-modal-body space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mã nhân viên (Employee Code) *</label>
                  <input
                    type="text"
                    value={newStaff.code}
                    onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })}
                    placeholder="VD: NV-109"
                    className="base-input font-mono text-xs"
                    required
                  />
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
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phòng trực ban đầu *</label>
                  <select
                    value={newStaff.room}
                    onChange={(e) => setNewStaff({ ...newStaff, room: e.target.value })}
                    className="base-select text-xs w-full"
                  >
                    <option value="Phòng 301 - Khám Ban Đầu">Phòng 301 - Khám Ban Đầu</option>
                    <option value="Phòng 302 - Khám Mày đay Mạn">Phòng 302 - Khám Mày đay Mạn</option>
                    <option value="Phòng 303 - Thử Nghiệm Kích Thích">Phòng 303 - Thử Nghiệm Kích Thích</option>
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
                  API: admin06 (PUT /api/v1/admin/users/{selectedStaff.id}/assign)
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
                {/* Staff Summary */}
                <div className="p-3 bg-gray-50 border border-[var(--base-border-opaque)] flex items-center gap-3">
                  <div className="h-10 w-10 bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {selectedStaff.employee_code.slice(-2)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{selectedStaff.full_name}</div>
                    <span className="text-[11px] text-gray-500">{selectedStaff.specialty}</span>
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">Hiện tại: {selectedStaff.room}</div>
                  </div>
                </div>

                {/* 1. Branch Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    1. Chi nhánh trực thuộc (branch_id) *
                  </label>
                  <select
                    value={assignment.branch_id}
                    onChange={(e) => setAssignment({ ...assignment, branch_id: e.target.value })}
                    className="base-select text-xs w-full"
                  >
                    {INITIAL_BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name} ({b.address})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Department Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    2. Khoa / Trung tâm chuyên môn (department_id) *
                  </label>
                  <select
                    value={assignment.department_id}
                    onChange={(e) => setAssignment({ ...assignment, department_id: e.target.value })}
                    className="base-select text-xs w-full"
                  >
                    {INITIAL_DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Room Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    3. Phòng khám / Phòng thủ thuật (room_id) *
                  </label>
                  <select
                    value={assignment.room_id}
                    onChange={(e) => setAssignment({ ...assignment, room_id: e.target.value })}
                    className="base-select text-xs w-full"
                  >
                    {INITIAL_ROOMS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Duty Shift */}
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
