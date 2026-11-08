import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function DoctorLesionReview() {
  const [selectedPatient, setSelectedPatient] = useState("Nguyễn Thị Mai (BA-2026-1042)");
  const [doctorAssessment, setDoctorAssessment] = useState(
    "Hình ảnh giai đoạn đỉnh điểm cho thấy nhiều sẩn phù dạng bản đồ rải rác cẳng tay và thân mình, bờ rõ, không có dấu hiệu xuất huyết dưới da hay bọng nước. Đợt thuyên giảm sau 6 giờ lặn hoàn toàn không để lại vết thâm hay sẹo, phù hợp bệnh cảnh mày đay mạn tự phát (CSU)."
  );

  const stages = [
    {
      title: "Giai Đoạn 1: Khởi Phát (Onset)",
      time: "08/03/2026 07:30",
      description: "Sẩn đỏ li ti, bắt đầu cảm giác châm chích và ngứa",
      url: "/images/clinic/clinic-urticaria-rash.jpg",
      tag: "base-tag-warning",
    },
    {
      title: "Giai Đoạn 2: Đỉnh Điểm (Peak)",
      time: "08/03/2026 12:45",
      description: "Các nốt sẩn kết tụ thành mảng phù nề lớn, ngứa dữ dội",
      url: "/images/clinic/clinic-examination.jpg",
      tag: "base-tag-negative",
    },
    {
      title: "Giai Đoạn 3: Thuyên Giảm (Remission)",
      time: "08/03/2026 17:15",
      description: "Nốt sẩn nhạt dần và lặn biến mất hoàn toàn không để lại sẹo",
      url: "/images/clinic/clinic-consultation-02.jpg",
      tag: "base-tag-positive",
    },
  ];

  const handleSaveAssessment = () => {
    toast.success("Đã lưu kết quả đối chiếu tổn thương vào hồ sơ bệnh án!");
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
              <span className="text-white/90 font-medium">Đối chiếu ảnh tổn thương</span>
            </div>
            <h1 className="base-hero-title">Đối Chiếu Tiến Triển Tổn Thương Da 3 Mốc</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-camera text-sm"></span>
              <span>Đánh giá chu kỳ khởi phát, đỉnh điểm và thuyên giảm để phân biệt với viêm mạch mày đay</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/doctor" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Hàng Đợi Ca Khám</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Patient Selector Filter */}
      <div className="base-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-700 shrink-0">Hồ sơ bệnh nhân:</span>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="base-input text-xs font-bold max-w-xs"
          >
            <option value="Nguyễn Thị Mai (BA-2026-1042)">Nguyễn Thị Mai (BA-2026-1042)</option>
            <option value="Trần Văn Nam (BA-2026-1043)">Trần Văn Nam (BA-2026-1043)</option>
            <option value="Lê Hoàng Yến (BA-2026-1040)">Lê Hoàng Yến (BA-2026-1040)</option>
          </select>
        </div>

        <span className="base-tag base-tag-info font-bold text-xs">
          3 Mốc Giai Đoạn Hoàn Chỉnh
        </span>
      </div>

      {/* 3 Mốc Ảnh Đối Chiếu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stages.map((stage, idx) => (
          <div key={idx} className="base-card overflow-hidden flex flex-col justify-between">
            <div>
              <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                <img
                  src={stage.url}
                  alt={stage.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/images/clinic/clinic-urticaria-rash.jpg";
                  }}
                />
                <span className={`absolute top-2.5 left-2.5 base-tag ${stage.tag} font-bold text-[10px] shadow-sm`}>
                  {stage.title.split(":")[0]}
                </span>
              </div>

              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-bold text-gray-900">{stage.title.split(":")[1]}</h3>
                </div>
                <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                  <span className="isax icon-clock text-xs"></span>
                  <span>{stage.time}</span>
                </div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{stage.description}</p>
              </div>
            </div>

            <div className="p-3 border-t border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] text-[11px] text-[var(--base-brand-blue)] font-bold text-center">
              Mốc chuẩn lâm sàng
            </div>
          </div>
        ))}
      </div>

      {/* Kết luận đối chiếu của Bác sĩ */}
      <div className="base-card p-6 space-y-4">
        <div className="pb-3 border-b border-[var(--base-border-opaque)]">
          <h3 className="text-sm font-bold text-gray-900 uppercase">Đánh Giá Đối Chiếu Của Bác Sĩ Lâm Sàng</h3>
          <p className="text-xs text-gray-500 mt-0.5">Xác nhận đặc điểm hình thái sẩn phù lặn trong 24 giờ</p>
        </div>

        <textarea
          rows={3}
          value={doctorAssessment}
          onChange={(e) => setDoctorAssessment(e.target.value)}
          className="base-input text-xs leading-relaxed"
        ></textarea>

        <div className="flex justify-end">
          <button
            onClick={handleSaveAssessment}
            className="base-btn base-btn-primary base-btn-compact font-bold cursor-pointer"
          >
            <span className="isax icon-tick-circle text-xs"></span>
            <span>Lưu Đánh Giá Lâm Sàng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
