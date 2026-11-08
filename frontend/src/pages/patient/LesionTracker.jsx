import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function LesionTracker() {
  const [phase, setPhase] = useState("onset"); // onset, peak, remission
  const [location, setLocation] = useState("arms");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([
    {
      id: "p1",
      phase: "onset",
      phase_label: "1. Khởi phát",
      date: "08/03/2026 07:30",
      location: "Cánh tay trái",
      url: "/images/clinic/clinic-urticaria-rash.jpg",
      notes: "Sẩn đỏ li ti bắt đầu xuất hiện sau khi ngủ dậy",
    },
    {
      id: "p2",
      phase: "peak",
      phase_label: "2. Đỉnh điểm",
      date: "08/03/2026 12:45",
      location: "Cẳng tay & Bụng",
      url: "/images/clinic/clinic-examination.jpg",
      notes: "Các nốt sẩn kết tụ thành mảng phù lớn, ngứa dữ dội",
    },
  ]);

  const handleUpload = (e) => {
    e.preventDefault();
    const newPhoto = {
      id: `p-${Date.now()}`,
      phase,
      phase_label: phase === "onset" ? "1. Khởi phát" : phase === "peak" ? "2. Đỉnh điểm" : "3. Thuyên giảm",
      date: "08/03/2026 14:30",
      location: location === "arms" ? "Tay / Cẳng tay" : location === "legs" ? "Chân / Cẳng chân" : "Thân mình",
      url: "/images/clinic/clinic-consultation-02.jpg",
      notes: notes || "Ảnh chụp đối chiếu lâm sàng giai đoạn mốc",
    };
    setPhotos([newPhoto, ...photos]);
    setNotes("");
    toast.success("Đã tải lên ảnh tổn thương 3 mốc thành công!");
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <Link to="/patient" className="hover:text-white transition">Trang chủ</Link>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/70">Nhật ký điều trị</span>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Kho ảnh tổn thương</span>
            </div>
            <h1 className="base-hero-title">Nhật Ký Đợt Bùng Phát &amp; Tải Ảnh 3 Mốc</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-camera text-sm"></span>
              <span>Chụp và lưu trữ ảnh tổn thương theo 3 giai đoạn: Khởi phát → Đỉnh điểm → Thuyên giảm</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/patient" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Trang Chủ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Module Grouped Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--base-border-opaque)] pb-3">
        <span className="text-xs font-bold text-[var(--base-content-disabled)] uppercase tracking-wider mr-2 hidden sm:inline">
          Nhật ký điều trị:
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/patient/uas7"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--base-content-secondary)] hover:bg-gray-100 hover:text-gray-900 transition flex items-center gap-1.5"
          >
            <span className="isax icon-chart-21 text-sm"></span>
            <span>1. Thang Đo UAS7 &amp; AAS7</span>
          </Link>
          <Link
            to="/patient/lesions"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--base-brand-navy)] text-white shadow-2xs flex items-center gap-1.5"
          >
            <span className="isax-b icon-camera text-sm"></span>
            <span>2. Kho Ảnh Tổn Thương 3 Mốc</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleUpload} className="base-card p-6 space-y-5">
            <div className="pb-3 border-b border-[var(--base-border-opaque)]">
              <h2 className="text-sm font-bold text-gray-900 uppercase">Ghi Nhận Ảnh Tổn Thương Mới</h2>
              <p className="text-xs text-gray-500 mt-0.5">Hỗ trợ Bác sĩ đánh giá tiến trình lặn của nốt sẩn</p>
            </div>

            {/* Mốc giai đoạn */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">
                Mốc giai đoạn chụp ảnh *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "onset", label: "1. Khởi phát" },
                  { id: "peak", label: "2. Đỉnh điểm" },
                  { id: "remission", label: "3. Thuyên giảm" },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPhase(p.id)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      phase === p.id
                        ? "bg-[rgba(59,99,168,0.12)] border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                        : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vị trí cơ thể */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">
                Vị trí tổn thương xuất hiện *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="base-input text-xs"
              >
                <option value="arms">Cánh tay / Cẳng tay</option>
                <option value="legs">Đùi / Cẳng chân</option>
                <option value="trunk">Thân mình / Bụng lưng</option>
                <option value="face">Vùng mặt / Cổ</option>
                <option value="general">Rải rác toàn thân</option>
              </select>
            </div>

            {/* Upload Box */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">
                Tệp ảnh tổn thương *
              </label>
              <div className="border-2 border-dashed border-[var(--base-border-opaque)] hover:border-[var(--base-brand-blue)] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[var(--base-bg-surface-alt)]">
                <span className="isax icon-camera text-3xl text-[var(--base-brand-blue)] block mb-2"></span>
                <p className="text-xs font-bold text-gray-800">Bấm để chọn ảnh từ máy ảnh hoặc thư viện</p>
                <p className="text-[11px] text-gray-500 mt-1">Định dạng JPG, PNG (Dung lượng tối đa 5MB)</p>
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">
                Ghi chú thêm triệu chứng kèm theo
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Nóng rát, châm chích nhiều sau khi tắm nước ấm..."
                className="base-input text-xs"
              ></textarea>
            </div>

            <button
              type="submit"
              className="base-btn base-btn-primary w-full py-2.5 font-bold justify-center cursor-pointer shadow-sm"
            >
              <span className="isax icon-document-upload text-sm"></span>
              <span>Lưu Ảnh Tổn Thương Vào Hồ Sơ</span>
            </button>
          </form>
        </div>

        {/* Gallery 3 Mốc (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
            <h2 className="text-sm font-bold text-gray-900 uppercase">Kho Ảnh Tổn Thương Đã Ghi Nhận</h2>
            <span className="base-tag base-tag-info font-mono text-[10px]">{photos.length} hình ảnh</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {photos.map((item) => (
              <div key={item.id} className="base-card overflow-hidden group">
                <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.notes}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = "/images/clinic/clinic-urticaria-rash.jpg";
                    }}
                  />
                  <span className="absolute top-2 left-2 base-tag base-tag-neutral text-[10px] font-bold bg-white/90 backdrop-blur-sm">
                    {item.phase_label}
                  </span>
                </div>
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900">{item.location}</span>
                    <span className="font-mono text-[10px] text-gray-500">{item.date}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2">{item.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
