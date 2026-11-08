import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../../services/mockData";
import Pagination from "../../components/common/Pagination";

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'in_progress', 'completed'
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    gender: "female",
    age: 30,
    clinical_type: "chronic",
  });

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const filtered = records.filter((r) => {
    const matchFilter = filter === "all" ? true : r.status === filter;
    const matchSearch =
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.record_code.toLowerCase().includes(search.toLowerCase()) ||
      r.patient_phone.includes(search);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAssignToMe = (id) => {
    setRecords(
      records.map((r) =>
        r.id === id
          ? { ...r, status: "in_progress", assigned_doctor_name: "TS.BS. Nguyễn Văn Hùng" }
          : r
      )
    );
    toast.success("Bác sĩ đã tiếp nhận ca khám!");
    navigate("/doctor/prescriptions");
  };

  const handleCreatePatient = (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.phone) {
      toast.error("Vui lòng nhập họ tên và số điện thoại!");
      return;
    }
    const created = {
      id: `rec-${Date.now()}`,
      medical_record_id: Math.floor(1000 + Math.random() * 9000),
      record_code: `BA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patient_name: newPatient.name,
      patient_phone: newPatient.phone,
      patient_gender: newPatient.gender,
      patient_age: Number(newPatient.age),
      bhyt_code: "DN4010" + Math.floor(100000000 + Math.random() * 900000000),
      status: "pending",
      clinical_type: newPatient.clinical_type,
      assigned_doctor_name: "Chưa phân công",
      room_name: "Phòng 301 - Tiếp đón",
      uas7_today: null,
      created_at: new Date().toISOString(),
      diagnosis: newPatient.clinical_type === "chronic" ? "Mày đay mạn tính" : "Mày đay cấp tính",
      symptoms: "Bệnh nhân mới tiếp nhận.",
      prescriptions: [],
    };
    setRecords([created, ...records]);
    setShowAddModal(false);
    toast.success(`Đã tiếp nhận bệnh nhân: ${created.record_code}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner (Tràn viền, súc tích) */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hàng Đợi Khám Bệnh</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-clock text-sm"></span>
              <span>Tiếp nhận và điều phối bệnh nhân trong ngày</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <div className="relative">
              <span className="isax icon-search-normal-1 text-xs absolute left-3 top-1/2 -translate-y-1/2 text-white/60"></span>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm tên, SĐT, mã BA..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 w-48 sm:w-56"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="base-btn-hero-accent cursor-pointer text-xs"
            >
              <span className="isax icon-user-add text-sm"></span>
              <span>Tiếp nhận BN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Line Tabs (Style chuẩn Image 2) */}
      <div className="base-tab-nav">
        <button
          onClick={() => handleFilterChange("all")}
          className={`base-tab-item ${filter === "all" ? "is-active" : ""}`}
        >
          <span className="isax icon-document-text text-base"></span>
          <span>Tất Cả Ca Khám ({records.length})</span>
        </button>
        <button
          onClick={() => handleFilterChange("pending")}
          className={`base-tab-item ${filter === "pending" ? "is-active" : ""}`}
        >
          <span className="isax icon-clock text-base"></span>
          <span>Chờ khám ({records.filter((r) => r.status === "pending").length})</span>
        </button>
        <button
          onClick={() => handleFilterChange("in_progress")}
          className={`base-tab-item ${filter === "in_progress" ? "is-active" : ""}`}
        >
          <span className="isax icon-health text-base"></span>
          <span>Đang khám ({records.filter((r) => r.status === "in_progress").length})</span>
        </button>
        <button
          onClick={() => handleFilterChange("completed")}
          className={`base-tab-item ${filter === "completed" ? "is-active" : ""}`}
        >
          <span className="isax icon-tick-circle text-base"></span>
          <span>Đã khám ({records.filter((r) => r.status === "completed").length})</span>
        </button>
      </div>

      {/* Bảng danh sách hàng đợi (Wording tinh gọn) */}
      <div className="base-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="base-table">
            <thead>
              <tr>
                <th>Mã BA</th>
                <th>Bệnh nhân</th>
                <th>Thể bệnh</th>
                <th>Phòng</th>
                <th>Bác sĩ</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">
                      {r.record_code}
                    </td>
                    <td>
                      <div className="font-bold text-xs text-gray-900">{r.patient_name}</div>
                      <div className="font-mono text-[11px] text-gray-500">{r.patient_phone}</div>
                    </td>
                    <td>
                      {r.clinical_type === "chronic" ? (
                        <span className="base-tag base-tag-info font-bold text-[10px]">
                          Mạn tính
                        </span>
                      ) : (
                        <span className="base-tag base-tag-warning font-bold text-[10px]">
                          Cấp tính
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-gray-600">{r.room_name}</td>
                    <td className="text-xs font-semibold text-gray-800">
                      {r.assigned_doctor_name}
                    </td>
                    <td>
                      <span
                        className={`base-tag text-[10px] ${
                          r.status === "completed"
                            ? "base-tag-positive"
                            : r.status === "in_progress"
                            ? "base-tag-info"
                            : "base-tag-warning"
                        }`}
                      >
                        {r.status === "completed" ? "Đã khám" : r.status === "in_progress" ? "Đang khám" : "Chờ khám"}
                      </span>
                    </td>
                    <td className="text-right">
                      {r.status === "pending" ? (
                        <button
                          onClick={() => handleAssignToMe(r.id)}
                          className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer"
                        >
                          <span className="isax icon-user-tick text-xs"></span>
                          <span>Khám</span>
                        </button>
                      ) : (
                        <Link
                          to="/doctor/prescriptions"
                          className="base-btn base-btn-secondary base-btn-compact text-xs"
                        >
                          <span className="isax icon-health text-xs"></span>
                          <span>Chi tiết</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                    <span className="isax icon-document text-3xl block mb-2 text-gray-300"></span>
                    Không có ca khám nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Standard Pagination */}
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

      {/* Modal Tiếp nhận BN mới */}
      {showAddModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Tiếp Nhận Bệnh Nhân</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleCreatePatient}>
              <div className="base-modal-body space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="VD: Trần Văn Bình"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    placeholder="VD: 0987 654 321"
                    className="base-input text-xs font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Giới tính</label>
                    <select
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                      className="base-input text-xs"
                    >
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Tuổi</label>
                    <input
                      type="number"
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                      className="base-input text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Thể bệnh</label>
                  <select
                    value={newPatient.clinical_type}
                    onChange={(e) => setNewPatient({ ...newPatient, clinical_type: e.target.value })}
                    className="base-input text-xs"
                  >
                    <option value="chronic">Mạn tính</option>
                    <option value="acute">Cấp tính</option>
                  </select>
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Tiếp nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
