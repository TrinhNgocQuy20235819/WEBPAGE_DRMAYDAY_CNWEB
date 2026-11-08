import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../../services/mockData";

export default function DoctorPrescription() {
  const navigate = useNavigate();
  const record = INITIAL_RECORDS[0]; // Nguyễn Thị Mai

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
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <Link to="/doctor" className="hover:text-white transition">Hàng đợi khám</Link>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Khám lâm sàng &amp; Kê đơn</span>
            </div>
            <h1 className="base-hero-title">Thăm Khám &amp; Kê Đơn Điều Trị Mày Đay</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-health text-sm"></span>
              <span>Chẩn đoán phân loại thể bệnh, đối chiếu tiến triển UAS7 và kê đơn thuốc điện tử</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/doctor" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Quay Lại Hàng Đợi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Patient Clinical Info Card */}
      <div className="base-card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[var(--base-brand-navy)] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              {record.patient_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{record.patient_name}</h2>
                <span className="font-mono text-xs font-bold text-[var(--base-brand-blue)] bg-blue-50 px-2.5 py-0.5 rounded">
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

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block uppercase font-bold">Điểm UAS hôm nay</span>
              <span className="text-2xl font-mono font-extrabold text-[var(--base-brand-navy)]">
                {record.uas7_today} <span className="text-xs font-normal text-gray-400">/ 6 điểm</span>
              </span>
            </div>
          </div>
        </div>
      </div>

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
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    clinicalType === "chronic"
                      ? "border-[var(--base-brand-blue)] bg-blue-50 text-[var(--base-brand-navy)] shadow-xs"
                      : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block font-bold">Mày Đay Mạn Tính (CSU)</span>
                  <span className="text-[10px] text-gray-500 font-normal">Kéo dài &ge; 6 tuần liên tiếp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClinicalType("acute")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    clinicalType === "acute"
                      ? "border-[var(--base-brand-blue)] bg-blue-50 text-[var(--base-brand-navy)] shadow-xs"
                      : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block font-bold">Mày Đay Cấp Tính</span>
                  <span className="text-[10px] text-gray-500 font-normal">Kéo dài &lt; 6 tuần</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Kết luận chẩn đoán bệnh án *</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="base-input text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Đánh giá triệu chứng &amp; Hướng dẫn điều trị</label>
              <textarea
                rows={4}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="base-input text-xs leading-relaxed"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Column: Kê đơn thuốc điện tử (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="base-card p-6 space-y-4">
            <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase">2. Đơn Thuốc Điện Tử Chuẩn</h3>
                <p className="text-xs text-gray-500 mt-0.5">Kháng H1 thế hệ 2 không buồn ngủ (Bậc 1 - Bậc 4)</p>
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
                  className="p-3.5 rounded-xl border border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] flex items-start justify-between gap-3 text-xs"
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
                className="base-btn base-btn-primary w-full py-3 font-bold justify-center cursor-pointer text-sm shadow-md"
              >
                <span className="isax icon-shield-tick text-base"></span>
                <span>Chốt Bệnh Án &amp; Ký Đơn Thuốc Điện Tử</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thêm Thuốc */}
      {showAddDrug && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Thêm Thuốc Vào Đơn Điều Trị</h3>
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
