import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import Pagination from "../../components/common/Pagination";

function mapQueueRow(r) {
  return {
    id: String(r.medical_record_id || r.patient_id),
    medical_record_id: r.medical_record_id ? String(r.medical_record_id) : null,
    record_code: r.record_code || `BN-${r.patient_id}`,
    patient_id: String(r.patient_id),
    patient_name: r.patient_name || "Bệnh nhân",
    patient_phone: r.phone || "",
    clinical_type: r.clinical_type || "acute",
    room_name: r.room_name || "Phòng Khám Tiếp Đón",
    assigned_doctor_name: r.assigned_doctor_name || "Chưa phân công",
    status: r.status || "pending",
    uas7_total: r.uas7_total,
  };
}

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/doctor/queue", {
        params: { status: "all", include_completed: "true" },
      });
      const raw = Array.isArray(res.data) ? res.data : [];
      setRecords(raw.map(mapQueueRow));
    } catch {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      apiClient
        .get("/doctor/patients/search", { params: { q } })
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          setSearchResults(rows.filter((x) => x.medical_record_id).map(mapQueueRow));
        })
        .catch(() => {
          setSearchResults(null);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const baseSource = searchResults !== null ? searchResults : records;
  const filtered = baseSource.filter((r) => {
    const matchFilter = filter === "all" ? true : r.status === filter;
    if (searchResults !== null) return matchFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.patient_name.toLowerCase().includes(q) ||
      r.record_code.toLowerCase().includes(q) ||
      r.patient_phone.includes(q);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAssignToMe = async (record) => {
    if (!record.medical_record_id) return;
    try {
      await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/accept`, {});
      sessionStorage.setItem("activeDoctorRecordId", String(record.medical_record_id));
      toast.success(`Đã tiếp nhận ca khám ${record.record_code}!`);
      navigate("/doctor/prescriptions");
    } catch {
      // Handled by interceptor
    }
  };

  const handleOpenDetail = (record) => {
    if (record.medical_record_id) {
      sessionStorage.setItem("activeDoctorRecordId", String(record.medical_record_id));
    }
    navigate("/doctor/prescriptions");
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    const cleanPhone = newPatient.phone.replace(/\s+/g, "").trim();
    if (!newPatient.name.trim() || !cleanPhone) {
      toast.error("Vui lòng nhập họ tên và số điện thoại 10 chữ số!");
      return;
    }
    const birthYear = Math.max(1920, new Date().getFullYear() - (Number(newPatient.age) || 30));
    try {
      const res = await apiClient.post("/doctor/patients", {
        full_name: newPatient.name.trim(),
        phone: cleanPhone,
        gender: newPatient.gender,
        date_of_birth: `${birthYear}-01-01`,
        clinical_type: newPatient.clinical_type,
      });
      setShowAddModal(false);
      setNewPatient({ name: "", phone: "", gender: "female", age: 30, clinical_type: "chronic" });
      toast.success(`Đã tiếp nhận bệnh nhân: ${res.data?.record_code || ""}`);
      await loadQueue();
    } catch {
      // Handled by interceptor
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hàng Đợi Khám Bệnh</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-clock text-sm"></span>
              <span>Tiếp nhận và điều phối bệnh nhân thời gian thực</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <div className="relative">
              <span className="isax icon-search-normal-1 text-xs absolute left-3 top-1/2 -translate-y-1/2 text-white/60"></span>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm tên, SĐT, HIS, BHYT..."
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

      {/* Primary Line Tabs */}
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

      {/* Bảng danh sách hàng đợi */}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                    Đang đồng bộ hàng đợi khám bệnh từ máy chủ...
                  </td>
                </tr>
              ) : paginatedRecords.length > 0 ? (
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
                          onClick={() => handleAssignToMe(r)}
                          className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer"
                        >
                          <span className="isax icon-user-tick text-xs"></span>
                          <span>Khám</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetail(r)}
                          className="base-btn base-btn-secondary base-btn-compact text-xs cursor-pointer"
                        >
                          <span className="isax icon-health text-xs"></span>
                          <span>Chi tiết</span>
                        </button>
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
              <h3 className="base-modal-title">Tiếp Nhận Bệnh Nhân Tại Quầy</h3>
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
                  <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại (10 số) *</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    placeholder="VD: 0987654321"
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
                  <label className="text-xs font-bold text-gray-700 block mb-1">Thể bệnh dự kiến</label>
                  <select
                    value={newPatient.clinical_type}
                    onChange={(e) => setNewPatient({ ...newPatient, clinical_type: e.target.value })}
                    className="base-input text-xs"
                  >
                    <option value="chronic">Mạn tính (≥ 6 tuần)</option>
                    <option value="acute">Cấp tính (&lt; 6 tuần)</option>
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
                  Tiếp nhận vào hàng đợi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
