import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../../services/mockData";

export default function PatientProfile() {
  const [profile, setProfile] = useState({
    full_name: "Nguyễn Thị Mai",
    phone: "0912 345 678",
    gender: "Nữ",
    dob: "1994-05-18",
    cccd: "001194012345",
    bhyt: "DN4010123456789",
    address: "Số 45 Ngõ 12 Đào Tấn, Ba Đình, Hà Nội",
    emergency_contact: "Nguyễn Văn Tuấn (Chồng) - 0987 111 222",
  });

  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Đã cập nhật thông tin hồ sơ y tế thành công!");
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hồ Sơ Y Tế &amp; BHYT</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-user text-sm"></span>
              <span>Thông tin cá nhân, thẻ bảo hiểm và lịch sử khám</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <span className="base-btn-hero-primary !cursor-default">
              <span className="isax icon-shield-tick text-sm"></span>
              <span>Bảo mật</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Hồ sơ cá nhân (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="base-card p-6 space-y-4">
            <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase">Thông Tin Hành Chính &amp; Thẻ BHYT</h2>
                <p className="text-xs text-gray-500 mt-0.5">Đối chiếu chính xác theo thẻ Căn cước công dân</p>
              </div>
              <span className="base-tag base-tag-positive">
                <span className="isax-b icon-tick-circle text-xs"></span>
                <span>BHYT Hợp Lệ</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Họ và tên bệnh nhân *</label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="base-input font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại tiếp nhận *</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="base-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={profile.dob}
                  onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                  className="base-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Giới tính</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="base-input text-xs"
                >
                  <option value="Nữ">Nữ</option>
                  <option value="Nam">Nam</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Số thẻ BHYT *</label>
                <input
                  type="text"
                  value={profile.bhyt}
                  onChange={(e) => setProfile({ ...profile, bhyt: e.target.value })}
                  className="base-input text-xs font-mono font-bold text-[var(--base-brand-navy)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Số CCCD / Định danh</label>
                <input
                  type="text"
                  value={profile.cccd}
                  onChange={(e) => setProfile({ ...profile, cccd: e.target.value })}
                  className="base-input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Địa chỉ thường trú</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="base-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Liên hệ người thân khi khẩn cấp</label>
              <input
                type="text"
                value={profile.emergency_contact}
                onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                className="base-input text-xs"
              />
            </div>

            <button
              type="submit"
              className="base-btn base-btn-primary w-full py-2.5 font-bold justify-center cursor-pointer shadow-sm mt-2"
            >
              <span className="isax icon-tick-circle text-sm"></span>
              <span>Cập Nhật Thông Tin Hồ Sơ</span>
            </button>
          </form>
        </div>

        {/* Lịch sử bệnh án & Đơn thuốc điện tử (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="base-card p-5">
            <h3 className="text-xs font-bold text-gray-900 uppercase mb-3">Lịch Sử Hồ Sơ Khám Bệnh Án</h3>
            <div className="space-y-3">
              {INITIAL_RECORDS.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-[var(--base-border-opaque)] hover:bg-[var(--base-bg-surface-alt)] transition cursor-pointer"
                  onClick={() => setSelectedRecord(rec)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-[var(--base-brand-blue)]">
                      {rec.record_code}
                    </span>
                    <span
                      className={`base-tag text-[10px] ${
                        rec.status === "completed"
                          ? "base-tag-positive"
                          : rec.status === "in_progress"
                          ? "base-tag-info"
                          : "base-tag-warning"
                      }`}
                    >
                      {rec.status === "completed" ? "Đã chốt" : rec.status === "in_progress" ? "Đang khám" : "Chờ tiếp nhận"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">{rec.diagnosis}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-[var(--base-border-opaque)]">
                    <span>{rec.assigned_doctor_name}</span>
                    <span className="text-[var(--base-brand-blue)] font-bold flex items-center gap-1">
                      Xem đơn thuốc <span className="isax icon-arrow-right-1 text-[10px]"></span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal xem đơn thuốc nếu click */}
      {selectedRecord && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-xl w-full">
            <div className="base-modal-header">
              <div>
                <h3 className="base-modal-title">Đơn Thuốc Điện Tử — {selectedRecord.record_code}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedRecord.patient_name} • Bác sĩ: {selectedRecord.assigned_doctor_name}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <div className="base-modal-body space-y-4">
              <div className="p-3 rounded-lg bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] text-xs">
                <strong>Chẩn đoán:</strong> {selectedRecord.diagnosis}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-gray-700">Danh mục thuốc điều trị</h4>
                {selectedRecord.prescriptions.length > 0 ? (
                  <div className="divide-y divide-[var(--base-border-opaque)] border border-[var(--base-border-opaque)] rounded-lg">
                    {selectedRecord.prescriptions.map((p, idx) => (
                      <div key={idx} className="p-3 text-xs">
                        <div className="flex items-center justify-between font-bold text-gray-900">
                          <span>{idx + 1}. {p.drug_name}</span>
                          <span className="font-mono text-[var(--base-brand-blue)]">{p.quantity}</span>
                        </div>
                        <p className="text-gray-600 mt-0.5">Liều dùng: {p.dosage}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 italic">{p.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Chưa có đơn thuốc kê cho ca khám này.</p>
                )}
              </div>
            </div>

            <div className="base-modal-footer">
              <button
                onClick={() => setSelectedRecord(null)}
                className="base-btn base-btn-secondary base-btn-compact"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
