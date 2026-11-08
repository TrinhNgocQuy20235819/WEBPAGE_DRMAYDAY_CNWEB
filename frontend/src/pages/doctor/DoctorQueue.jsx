import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../../services/mockData";

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'in_progress', 'completed'
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    gender: "female",
    age: 30,
    clinical_type: "chronic",
  });

  const filtered = records.filter((r) => {
    const matchFilter = filter === "all" ? true : r.status === filter;
    const matchSearch =
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.record_code.toLowerCase().includes(search.toLowerCase()) ||
      r.patient_phone.includes(search);
    return matchFilter && matchSearch;
  });

  const handleAssignToMe = (id) => {
    setRecords(
      records.map((r) =>
        r.id === id
          ? { ...r, status: "in_progress", assigned_doctor_name: "TS.BS. Nguyễn Văn Hùng" }
          : r
      )
    );
    toast.success("Bác sĩ đã tiếp nhận ca khám lâm sàng!");
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
      diagnosis: newPatient.clinical_type === "chronic" ? "Mày đay mạn tính tái phát" : "Mày đay cấp tính nghi dị ứng",
      symptoms: "Bệnh nhân mới tiếp nhận tại quầy khám.",
      prescriptions: [],
    };
    setRecords([created, ...records]);
    setShowAddModal(false);
    toast.success(`Đã tiếp nhận bệnh nhân mới: ${created.record_code}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <span className="text-white/70">Phân hệ Bác sĩ</span>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Hàng đợi khám lâm sàng</span>
            </div>
            <h1 className="base-hero-title">Hàng Đợi Ca Khám Lâm Sàng</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-clock text-sm"></span>
              <span>Phân luồng theo thời gian thực: Chờ tiếp nhận → Đang khám → Hoàn tất bệnh án</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <div className="relative">
              <span className="isax icon-search-normal-1 text-xs absolute left-3 top-1/2 -translate-y-1/2 text-white/60"></span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, SĐT, mã BA..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 w-48 sm:w-56"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="base-btn-hero-accent cursor-pointer text-xs"
            >
              <span className="isax icon-user-add text-sm"></span>
              <span>Tiếp Nhận BN Mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Line Tabs */}
      <div className="base-tab-nav overflow-x-auto">
        <button
          onClick={() => setFilter("all")}
          className={`base-tab-item ${filter === "all" ? "is-active" : ""}`}
        >
          <span className="isax icon-document-text text-base"></span>
          <span>Tất Cả Ca Khám ({records.length})</span>
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`base-tab-item ${filter === "pending" ? "is-active" : ""}`}
        >
          <span className="isax icon-clock text-base"></span>
          <span>1. Chờ Tiếp Nhận ({records.filter((r) => r.status === "pending").length})</span>
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          className={`base-tab-item ${filter === "in_progress" ? "is-active" : ""}`}
        >
          <span className="isax icon-health text-base"></span>
          <span>2. Đang Khám ({records.filter((r) => r.status === "in_progress").length})</span>
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`base-tab-item ${filter === "completed" ? "is-active" : ""}`}
        >
          <span className="isax icon-tick-circle text-base"></span>
          <span>3. Đã Hoàn Tất ({records.filter((r) => r.status === "completed").length})</span>
        </button>
      </div>

      {/* Bảng danh sách hàng đợi (Invoika Standard Table) */}
      <div className="base-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="base-table">
            <thead>
              <tr>
                <th>Mã bệnh án</th>
                <th>Bệnh nhân &amp; SĐT</th>
                <th>Phân loại mày đay</th>
                <th>Phòng khám</th>
                <th>Bác sĩ phụ trách</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
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
                        Mạn tính (&ge;6 tuần)
                      </span>
                    ) : (
                      <span className="base-tag base-tag-warning font-bold text-[10px]">
                        Cấp tính (&lt;6 tuần)
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
                      {r.status === "completed" ? "Đã chốt bệnh án" : r.status === "in_progress" ? "Đang khám" : "Chờ tiếp nhận"}
                    </span>
                  </td>
                  <td className="text-right">
                    {r.status === "pending" ? (
                      <button
                        onClick={() => handleAssignToMe(r.id)}
                        className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer"
                      >
                        <span className="isax icon-user-tick text-xs"></span>
                        <span>Nhận Ca Khám</span>
                      </button>
                    ) : (
                      <Link
                        to="/doctor/prescriptions"
                        className="base-btn base-btn-secondary base-btn-compact text-xs"
                      >
                        <span className="isax icon-health text-xs"></span>
                        <span>Xem Bệnh Án</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tiếp nhận BN mới */}
      {showAddModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Tiếp Nhận Bệnh Nhân Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleCreatePatient}>
              <div className="base-modal-body space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Họ và tên bệnh nhân *</label>
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
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phân loại lâm sàng ban đầu</label>
                  <select
                    value={newPatient.clinical_type}
                    onChange={(e) => setNewPatient({ ...newPatient, clinical_type: e.target.value })}
                    className="base-input text-xs"
                  >
                    <option value="chronic">Mày đay mạn tính (&ge;6 tuần)</option>
                    <option value="acute">Mày đay cấp tính (&lt;6 tuần)</option>
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
                  Thêm Vào Hàng Đợi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
