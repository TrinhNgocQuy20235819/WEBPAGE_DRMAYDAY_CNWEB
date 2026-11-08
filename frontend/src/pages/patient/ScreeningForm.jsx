import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_TEMPLATES } from "../../services/mockData";

export default function ScreeningForm() {
  const navigate = useNavigate();
  const template = INITIAL_TEMPLATES[0];

  // Red Flags State (<30s)
  const [hasShortnessOfBreath, setHasShortnessOfBreath] = useState(false);
  const [hasDizziness, setHasDizziness] = useState(false);
  const [hasThroatSwelling, setHasThroatSwelling] = useState(false);

  // General Questions State
  const [duration, setDuration] = useState("over_6w");
  const [whealLife, setWhealLife] = useState("1_to_24h");
  const [angioedema, setAngioedema] = useState("sometimes");

  // Anaphylaxis Emergency Trigger
  const isEmergency = hasShortnessOfBreath || hasDizziness || hasThroatSwelling;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEmergency) return;

    toast.success("Đã nộp phiếu khai thác bệnh sử thành công! Hồ sơ đã được chuyển đến Bác sĩ phụ trách.");
    navigate("/patient");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <Link to="/patient" className="hover:text-white transition">Trang chủ</Link>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Sàng lọc khẩn cấp</span>
            </div>
            <h1 className="base-hero-title">Sàng Lọc Lâm Sàng &amp; Báo Động Nguy Cấp</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-shield-tick text-sm"></span>
              <span>Quy chuẩn y tế Bộ Y Tế: Tự sàng lọc nguy cơ sốc phản vệ trong 30 giây trước khi khám</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <span className="base-btn-hero-primary !border-rose-400/40 !bg-rose-500/20 text-rose-100 !cursor-default">
              <span className="isax-b icon-danger text-sm"></span>
              <span>Báo Động Đỏ &lt; 30s</span>
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Lockdown Overlay if Red Flag detected */}
      {isEmergency && (
        <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-500 shadow-lg text-rose-950 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-2xl shrink-0">
              <span className="isax-b icon-danger"></span>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-rose-900 uppercase tracking-tight">
                CẢNH BÁO NGUY CẤP: DẤU HIỆU SỐC PHẢN VỆ / PHÙ ĐƯỜNG THỞ!
              </h2>
              <p className="text-xs text-rose-800 mt-0.5">
                Bạn có dấu hiệu suy hô hấp hoặc tụt huyết áp cấp. Vui lòng dừng điền form và gọi Cấp cứu Y tế ngay lập tức!
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-rose-900 font-semibold">
              Đường dây nóng Cấp cứu Khẩn cấp: <strong className="text-xl text-rose-600 font-mono">115</strong>
            </div>
            <a
              href="tel:115"
              className="base-btn base-btn-primary !bg-rose-600 hover:!bg-rose-700 w-full sm:w-auto text-sm font-bold shadow-md justify-center"
            >
              <span className="isax icon-call text-base"></span>
              <span>GỌI 115 NGAY LẬP TỨC</span>
            </a>
          </div>
        </div>
      )}

      {/* BƯỚC 0: SÀNG LỌC BÁO ĐỘNG ĐỎ */}
      <div className="base-card border-2 border-rose-300 overflow-hidden">
        <div className="base-card-header bg-rose-50 border-b border-rose-200">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
            <span className="isax-b icon-danger text-base"></span>
            <span>Bước 0: Sàng Lọc Dấu Hiệu Cảnh Báo Nguy Hiểm (Nguy Cơ Phản Vệ)</span>
          </div>
          <span className="base-tag base-tag-negative font-mono text-[10px]">Mục tiêu &lt; 30 giây</span>
        </div>

        <div className="base-card-body space-y-3">
          <p className="text-xs text-gray-600 mb-2">
            Bạn có đang gặp phải tình trạng nào sau đây không? (Đánh dấu nếu có):
          </p>

          <label
            className={`base-selection-card cursor-pointer ${
              hasShortnessOfBreath ? "border-rose-500 bg-rose-50/50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={hasShortnessOfBreath}
              onChange={(e) => setHasShortnessOfBreath(e.target.checked)}
              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5"
            />
            <div>
              <div className="text-xs font-bold text-gray-900">
                1. Khó thở, thở khò khè hoặc cảm giác nghẹn tắc ở cổ họng
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Dấu hiệu co thắt phế quản hoặc phù nề đường thở cấp tính</div>
            </div>
          </label>

          <label
            className={`base-selection-card cursor-pointer ${
              hasDizziness ? "border-rose-500 bg-rose-50/50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={hasDizziness}
              onChange={(e) => setHasDizziness(e.target.checked)}
              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5"
            />
            <div>
              <div className="text-xs font-bold text-gray-900">
                2. Chóng mặt, hoa mắt, choáng váng hoặc ngất xỉu
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Dấu hiệu tụt huyết áp cấp trong phản vệ</div>
            </div>
          </label>

          <label
            className={`base-selection-card cursor-pointer ${
              hasThroatSwelling ? "border-rose-500 bg-rose-50/50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={hasThroatSwelling}
              onChange={(e) => setHasThroatSwelling(e.target.checked)}
              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5"
            />
            <div>
              <div className="text-xs font-bold text-gray-900">
                3. Sưng nề dữ dội vùng lưỡi, hầu họng gây khó nuốt hoặc khàn tiếng
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Phù mạch thanh quản nguy hiểm</div>
            </div>
          </label>
        </div>
      </div>

      {/* BƯỚC 1: KHAI THÁC BỆNH SỬ MÀY ĐAY */}
      <form onSubmit={handleSubmit} className="base-card">
        <div className="base-card-header">
          <div>
            <h2 className="base-card-title">{template.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
          </div>
          <span className="base-tag base-tag-info font-mono text-[10px]">Chuẩn Bộ Y Tế</span>
        </div>

        <div className="base-card-body space-y-6">
          {/* Câu hỏi 1 */}
          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              1. Tình trạng sẩn phù và ngứa của bạn đã kéo dài trong bao lâu? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { val: "under_6w", title: "Dưới 6 tuần", desc: "Mày đay cấp tính" },
                { val: "over_6w", title: "Từ 6 tuần trở lên (Điển hình)", desc: "Mày đay mạn tính (CSU/CIndU)" },
              ].map((opt) => (
                <div
                  key={opt.val}
                  onClick={() => setDuration(opt.val)}
                  className={`base-selection-card cursor-pointer ${
                    duration === opt.val ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    checked={duration === opt.val}
                    onChange={() => setDuration(opt.val)}
                    className="h-4 w-4 text-[var(--base-brand-blue)] mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900">{opt.title}</div>
                    <div className="text-[11px] text-gray-500">{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Câu hỏi 2 */}
          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              2. Mỗi nốt sẩn phù đơn lẻ thường biến mất hoàn toàn trong bao lâu? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { val: "under_1h", title: "Dưới 1 giờ", desc: "Mày đay vật lý" },
                { val: "1_to_24h", title: "Từ 1 đến 24 giờ", desc: "Điển hình mày đay thông thường" },
                { val: "over_24h", title: "Kéo dài trên 24 giờ", desc: "Nghi ngờ viêm mạch mày đay" },
              ].map((opt) => (
                <div
                  key={opt.val}
                  onClick={() => setWhealLife(opt.val)}
                  className={`base-selection-card cursor-pointer ${
                    whealLife === opt.val ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="wheallife"
                    checked={whealLife === opt.val}
                    onChange={() => setWhealLife(opt.val)}
                    className="h-4 w-4 text-[var(--base-brand-blue)] mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900">{opt.title}</div>
                    <div className="text-[11px] text-gray-500">{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Câu hỏi 3 */}
          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              3. Bạn có bị sưng môi, mí mắt hoặc bàn tay bàn chân (Phù mạch) không? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { val: "never", title: "Không bao giờ", desc: "Chỉ nổi sẩn bề mặt" },
                { val: "sometimes", title: "Thỉnh thoảng có sưng", desc: "Kèm phù mạch nhẹ" },
                { val: "often", title: "Thường xuyên sưng nề", desc: "Phù mạch mức độ rõ rệt" },
              ].map((opt) => (
                <div
                  key={opt.val}
                  onClick={() => setAngioedema(opt.val)}
                  className={`base-selection-card cursor-pointer ${
                    angioedema === opt.val ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="angio"
                    checked={angioedema === opt.val}
                    onChange={() => setAngioedema(opt.val)}
                    className="h-4 w-4 text-[var(--base-brand-blue)] mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900">{opt.title}</div>
                    <div className="text-[11px] text-gray-500">{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="base-card-footer flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Hồ sơ: <strong className="text-gray-900">Nguyễn Thị Mai (BA-2026-1042)</strong>
          </span>
          <button
            type="submit"
            disabled={isEmergency}
            className={`base-btn base-btn-primary base-btn-large font-bold cursor-pointer ${
              isEmergency ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span>Gửi Phiếu Khám Cho Bác Sĩ</span>
            <span className="isax icon-arrow-right-1 text-sm"></span>
          </button>
        </div>
      </form>
    </div>
  );
}
