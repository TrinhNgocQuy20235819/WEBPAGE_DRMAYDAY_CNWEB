import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_STAFFS } from "../../services/mockData";
import Pagination from "../../components/common/Pagination";

export default function UserManagement() {
  const [staffs, setStaffs] = useState(INITIAL_STAFFS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    code: "",
    name: "",
    specialty: "Da liễu & Miễn dịch",
    room: "Phòng 302 - Khám Mày đay Mạn",
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

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <Link to="/admin" className="hover:text-white transition">Quản trị</Link>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/70">Nghiệp vụ lâm sàng</span>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Danh bạ nhân sự y tế</span>
            </div>
            <h1 className="base-hero-title">Danh Bạ Nhân Sự Y Tế &amp; Phân Quyền</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-profile-2user text-sm"></span>
              <span>Quản lý danh bạ Bác sĩ chuyên khoa, Điều dưỡng và điều phối phân công phòng khám</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowModal(true)}
              className="base-btn-hero-accent cursor-pointer"
            >
              <span className="isax icon-user-add text-sm"></span>
              <span>Thêm Nhân Sự Y Tế</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="base-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
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

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => handleRoleFilterChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "all"
                ? "bg-[var(--base-brand-navy)] text-white shadow-2xs font-bold"
                : "text-[var(--base-content-secondary)] hover:bg-gray-100"
            }`}
          >
            Tất Cả ({staffs.length})
          </button>
          <button
            onClick={() => handleRoleFilterChange("doctor")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "doctor"
                ? "bg-[var(--base-brand-navy)] text-white shadow-2xs font-bold"
                : "text-[var(--base-content-secondary)] hover:bg-gray-100"
            }`}
          >
            Bác Sĩ ({staffs.filter((s) => s.title.includes("BS")).length})
          </button>
          <button
            onClick={() => handleRoleFilterChange("nurse")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "nurse"
                ? "bg-[var(--base-brand-navy)] text-white shadow-2xs font-bold"
                : "text-[var(--base-content-secondary)] hover:bg-gray-100"
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
            <h2 className="base-card-title">Bảng Phân Công Công Tác Nhân Sự Y Tế</h2>
            <p className="text-xs text-gray-500 mt-0.5">Danh bạ nhân sự đang tham gia khám chữa bệnh mày đay toàn viện</p>
          </div>
          <span className="base-tag base-tag-info font-mono text-[10px]">{filtered.length} kết quả</span>
        </div>

        <div className="overflow-x-auto">
          <table className="base-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên y bác sĩ</th>
                <th>Chuyên khoa lâm sàng</th>
                <th>Phòng làm việc trực tiếp</th>
                <th>Trạng thái trực</th>
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
                        <div className="h-8 w-8 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {st.employee_code.slice(-2)}
                        </div>
                        <div className="font-bold text-xs text-gray-900">{st.full_name}</div>
                      </div>
                    </td>
                    <td className="text-xs text-gray-600">{st.specialty}</td>
                    <td className="text-xs font-medium text-gray-800">{st.room}</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                        Đang trực ca
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 text-xs">
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

      {/* Modal thêm nhân sự */}
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
                  <label className="text-xs font-bold text-gray-700 block mb-1">Chuyên khoa lâm sàng</label>
                  <input
                    type="text"
                    value={newStaff.specialty}
                    onChange={(e) => setNewStaff({ ...newStaff, specialty: e.target.value })}
                    placeholder="VD: Miễn dịch lâm sàng &amp; Dị ứng da"
                    className="base-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phòng làm việc phân công</label>
                  <input
                    type="text"
                    value={newStaff.room}
                    onChange={(e) => setNewStaff({ ...newStaff, room: e.target.value })}
                    placeholder="VD: Phòng 303 - Tiếp nhận"
                    className="base-input text-xs"
                  />
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
                  Lưu Nhân Sự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
