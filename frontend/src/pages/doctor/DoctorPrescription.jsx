import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../../services/mockData";

export default function DoctorPrescription() {
  const navigate = useNavigate();
  const record = INITIAL_RECORDS[0]; // Nguyễn Thị Mai

  const [activeTab, setActiveTab] = useState("examination"); // 'examination' | 'history'
  const [diagnosis, setDiagnosis] = useState(record.diagnosis);
  const [clinicalType, setClinicalType] = useState(record.clinical_type);
  const [doctorNotes, setDoctorNotes] = useState(
    "Bệnh nhân đáp ứng một phần với kháng histamine liều chuẩn. Cần tăng liều gấp đôi (2 viên Fexofenadine 180mg) theo phác đồ EAACI/GA2LEN bậc 2 kết hợp theo dõi UAS7 hàng ngày."
  );

  const [prescriptions, setPrescriptions] = useState([
    {
      drug_name: "Fexofenadine 180mg (Telfast)",
      dosage: "Uống 1 viên vào buổi sáng sau ăn",
      quantity: "30 viên",
      instructions: "Kháng H1 thế hệ 2 không gây buồn ngủ",
    },
    {
      drug_name: "Montelukast 10mg (Singulair)",
      dosage: "Uống 1 viên vào buổi tối trước khi đi ngủ",
      quantity: "30 viên",
      instructions: "Đối kháng thụ thể Leukotriene phối hợp",
    },
  ]);

  const [newDrug, setNewDrug] = useState({ name: "", dosage: "", quantity: "", instructions: "" });
  const [showAddDrug, setShowAddDrug] = useState(false);

  // Past Medical Record History (Slide 5 medrec13)
  const pastRecords = [
    {
      id: "rec_old_1",
      record_code: "BA-2026-0812",
      date: "12/01/2026",
      doctor_name: "TS.BS. Nguyễn Văn Hùng",
      clinical_type: "acute",
      diagnosis: "Mày đay cấp tính do dị ứng thời tiết",
      uas_score: "4/6",
      notes: "Sẩn phù rải rác cẳng tay và đùi, ngứa nhiều về đêm. Đáp ứng tốt với kháng histamine sau 7 ngày.",
      prescriptions: [
        { name: "Fexofenadine 120mg", dosage: "1 viên/ngày", quantity: "14 viên" },
        { name: "Calamine Lotion", dosage: "Bôi tổn thương 2 lần/ngày", quantity: "1 chai" },
      ],
    },
    {
      id: "rec_old_2",
      record_code: "BA-2025-4519",
      date: "05/11/2025",
      doctor_name: "BS. CKI. Lê Thị Bình",
      clinical_type: "chronic",
      diagnosis: "Mày đay mạn tính tự phát (CSU) đợt bùng phát",
      uas_score: "5/6",
      notes: "Sẩn phù kéo dài trên 6 tuần tái phát từng đợt, chưa phát hiện dị nguyên đặc hiệu qua test lẩy da.",
      prescriptions: [
        { name: "Cetirizine 10mg", dosage: "1 viên/ngày buổi tối", quantity: "30 viên" },
        { name: "Kẽm Gluconate 10mg", dosage: "1 viên/ngày sau ăn", quantity: "30 viên" },
      ],
    },
  ];

  const handleAddDrug = (e) => {
    e.preventDefault();
    if (!newDrug.name) return;
    setPrescriptions([
      ...prescriptions,
      {
        drug_name: newDrug.name,
        dosage: newDrug.dosage || "Theo chỉ dẫn",
        quantity: newDrug.quantity || "1 hộp",
        instructions: newDrug.instructions || "Uống sau ăn",
      },
    ]);
    setNewDrug({ name: "", dosage: "", quantity: "", instructions: "" });
    setShowAddDrug(false);
    toast.success("Đã thêm thuốc vào đơn điện tử");
  };

  const handleRemoveDrug = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleCompleteRecord = () => {
    toast.success(`Đã hoàn tất khám và chốt bệnh án điện tử cho ${record.patient_name}!`);
    navigate("/doctor");
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Khám &amp; Kê Đơn</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-health text-sm"></span>
              <span>Chẩn đoán thể bệnh, kê đơn thuốc và đối chiếu lịch sử điều trị</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/doctor/lab-requests" className="base-btn-hero-primary">
              <span className="isax icon-flask text-sm"></span>
              <span>Chỉ Định Xét Nghiệm</span>
            </Link>
            <Link to="/doctor" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Quay lại</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Patient Clinical Info Card */}
      <div className="base-card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-[var(--base-brand-navy)] text-white flex items-center justify-center font-bold text-xl shrink-0">
              {record.patient_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{record.patient_name}</h2>
                <span className="font-mono text-xs font-bold text-[var(--base-brand-blue)] bg-blue-50 px-2.5 py-0.5">
                  {record.record_code}
                </span>
                <span className="base-tag base-tag-info font-bold text-[10px]">
                  {record.patient_gender === "female" ? "Nữ" : "Nam"} • {record.patient_age} tuổi
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                <span>SĐT: <strong className="text-gray-800 font-mono">{record.patient_phone}</strong></span>
                <span>•</span>
                <span>BHYT: <strong className="text-gray-800 font-mono">{record.bhyt_code}</strong></span>
                <span>•</span>
                <span>Phòng: <strong className="text-gray-800">{record.room_name}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block uppercase font-bold">Điểm UAS hôm nay</span>
              <span className="text-2xl font-mono font-extrabold text-[var(--base-brand-navy)]">
                {record.uas7_today} <span className="text-xs font-normal text-gray-400">/ 6 điểm</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Tab Navigation: Examination vs Past History */}
      <div className="base-tab-nav">
        <button
          type="button"
          onClick={() => setActiveTab("examination")}
          className={`base-tab-item ${activeTab === "examination" ? "is-active" : ""}`}
        >
          <span className="isax icon-clipboard-text text-base"></span>
          <span>Thăm Khám &amp; Kê Đơn Hiện Tại</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`base-tab-item ${activeTab === "history" ? "is-active" : ""}`}
        >
          <span className="isax icon-archive-book text-base"></span>
          <span>Lịch Sử Bệnh Án Cũ ({pastRecords.length})</span>
        </button>
      </div>

      {/* Tab 1: Khám & Kê Đơn Hiện Tại */}
      {activeTab === "examination" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Chẩn đoán & Ghi chú lâm sàng (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="base-card p-6 space-y-5">
              <div className="pb-3 border-b border-[var(--base-border-opaque)]">
                <h3 className="text-sm font-bold text-gray-900 uppercase">1. Chẩn Đoán Xác Định</h3>
                <p className="text-xs text-gray-500 mt-0.5">Phân tầng mức độ bệnh theo hướng dẫn Bộ Y Tế &amp; EAACI/GA2LEN</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Phân loại thể mày đay lâm sàng *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setClinicalType("chronic")}
                    className={`py-2 px-3 border text-xs font-bold text-center transition-all cursor-pointer ${
                      clinicalType === "chronic"
                        ? "border-[var(--base-brand-blue)] bg-blue-50 text-[var(--base-brand-navy)]"
                        : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Mạn tính
                  </button>

                  <button
                    type="button"
                    onClick={() => setClinicalType("acute")}
                    className={`py-2 px-3 border text-xs font-bold text-center transition-all cursor-pointer ${
                      clinicalType === "acute"
                        ? "border-[var(--base-brand-blue)] bg-blue-50 text-[var(--base-brand-navy)]"
                        : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Cấp tính
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Kết luận chẩn đoán bệnh án *</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="base-input text-xs font-bold text-gray-900"
                  placeholder="Nhập chẩn đoán lâm sàng..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Chỉ dẫn điều trị &amp; Ghi chú lâm sàng
                </label>
                <textarea
                  rows={4}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="base-textarea text-xs leading-relaxed"
                  placeholder="Nhập ghi chú diễn biến lâm sàng, hẹn tái khám..."
                />
              </div>

              {/* Lab Request Quick Link */}
              <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[var(--base-brand-navy)]">
                  <span className="isax icon-flask text-base"></span>
                  <span className="font-semibold">Cần chỉ định thêm xét nghiệm IgE hoặc test da vẽ nổi?</span>
                </div>
                <Link
                  to="/doctor/lab-requests"
                  className="font-bold text-[var(--base-brand-blue)] hover:underline flex items-center gap-1"
                >
                  <span>Chỉ định ngay</span>
                  <span className="isax icon-arrow-right-1 text-xs"></span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Đơn thuốc điện tử (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="base-card p-6 space-y-4">
              <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">2. Đơn Thuốc Điện Tử</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Kháng Histamine H1 thế hệ 2 &amp; thuốc phối hợp</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDrug(true)}
                  className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer font-bold"
                >
                  <span className="isax icon-add text-xs"></span>
                  <span>Thêm Thuốc</span>
                </button>
              </div>

              {/* Danh mục thuốc */}
              <div className="space-y-3">
                {prescriptions.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        <span>{idx + 1}. {p.drug_name}</span>
                        <span className="font-mono text-[var(--base-brand-blue)] font-bold">({p.quantity})</span>
                      </div>
                      <div className="text-gray-700">Liều dùng: {p.dosage}</div>
                      <div className="text-[11px] text-gray-500 italic">{p.instructions}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveDrug(idx)}
                      className="text-gray-400 hover:text-rose-600 cursor-pointer p-1"
                      title="Xóa thuốc"
                    >
                      <span className="isax icon-trash text-sm"></span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Nút Chốt Bệnh Án */}
              <div className="pt-4 border-t border-[var(--base-border-opaque)]">
                <button
                  type="button"
                  onClick={handleCompleteRecord}
                  className="base-btn base-btn-primary w-full py-2.5 font-bold justify-center cursor-pointer text-xs"
                >
                  <span className="isax icon-shield-tick text-base"></span>
                  <span>Chốt bệnh án</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lịch Sử Bệnh Án Cũ (medrec13) */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Hồ Sơ Tiền Sử &amp; Bệnh Án Các Đợt Trước</h2>
              <p className="text-xs text-gray-500">Truy xuất tự động từ hệ thống HIS Bệnh viện Da liễu Trung ương</p>
            </div>
            <span className="base-tag base-tag-info text-xs font-mono">
              Tổng số ca: {pastRecords.length}
            </span>
          </div>

          <div className="space-y-4">
            {pastRecords.map((item) => (
              <div key={item.id} className="base-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[var(--base-border-opaque)] gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[var(--base-brand-navy)]">
                      {item.record_code}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="isax icon-calendar text-xs"></span>
                      <span>Ngày khám: {item.date}</span>
                    </span>
                    <span className="text-xs text-gray-600">
                      Bác sĩ: <strong>{item.doctor_name}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="base-tag base-tag-info text-[10px] font-bold">
                      {item.clinical_type === "chronic" ? "Mạn tính" : "Cấp tính"}
                    </span>
                    <span className="base-tag text-[10px] bg-gray-100 text-gray-700 font-mono">
                      UAS: {item.uas_score}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-gray-700 block mb-1">Chẩn đoán:</span>
                    <p className="text-gray-900 font-medium">{item.diagnosis}</p>
                    <span className="font-bold text-gray-700 block mt-2.5 mb-1">Ghi chú diễn biến:</span>
                    <p className="text-gray-600 leading-relaxed bg-gray-50 p-2.5 border border-gray-200">
                      {item.notes}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-gray-700 block mb-1">Đơn thuốc đã cấp:</span>
                    <div className="space-y-1.5">
                      {item.prescriptions.map((rx, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-2 border border-gray-200 bg-white flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{rx.name}</span>
                            <span className="text-[11px] text-gray-500 block">{rx.dosage}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[var(--base-brand-blue)] font-bold">
                            {rx.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Thêm Thuốc */}
      {showAddDrug && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Thêm Thuốc Mới</h3>
              <button onClick={() => setShowAddDrug(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleAddDrug}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên biệt dược &amp; Hàm lượng *</label>
                  <input
                    type="text"
                    value={newDrug.name}
                    onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                    placeholder="VD: Levocetirizine 5mg (Xyzal)"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Liều lượng &amp; Thời điểm uống *</label>
                  <input
                    type="text"
                    value={newDrug.dosage}
                    onChange={(e) => setNewDrug({ ...newDrug, dosage: e.target.value })}
                    placeholder="VD: Uống 1 viên vào buổi tối sau ăn"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Số lượng cấp phát *</label>
                  <input
                    type="text"
                    value={newDrug.quantity}
                    onChange={(e) => setNewDrug({ ...newDrug, quantity: e.target.value })}
                    placeholder="VD: 30 viên (1 hộp)"
                    className="base-input text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Ghi chú lâm sàng cho người bệnh</label>
                  <input
                    type="text"
                    value={newDrug.instructions}
                    onChange={(e) => setNewDrug({ ...newDrug, instructions: e.target.value })}
                    placeholder="VD: Uống đều hàng ngày, không tự ý ngưng thuốc"
                    className="base-input text-xs"
                  />
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddDrug(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Thêm Vào Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
