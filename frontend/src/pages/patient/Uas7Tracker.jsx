import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_UAS7_SCORES } from "../../services/mockData";

export default function Uas7Tracker() {
  const [activeTab, setActiveTab] = useState("uas7"); // 'uas7' or 'aas7'
  const [scores, setScores] = useState(INITIAL_UAS7_SCORES);
  const [hss, setHss] = useState(1); // 0, 1, 2, 3
  const [iss, setIss] = useState(2); // 0, 1, 2, 3
  const [scoreDate, setScoreDate] = useState("2026-03-08");

  const dailyScore = hss + iss;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = {
      score_date: scoreDate,
      daily_score: dailyScore,
      hss7: hss,
      iss7: iss,
    };
    setScores([...scores.filter((s) => s.score_date !== scoreDate), newEntry]);
    toast.success(`Đã ghi nhận điểm UAS ngày ${scoreDate}: ${dailyScore} / 6 điểm!`);
  };

  const getSeverity = (daily) => {
    if (daily <= 2) return { label: "Kiểm soát tốt", class: "base-tag-positive" };
    if (daily <= 4) return { label: "Mức độ nhẹ/vừa", class: "base-tag-warning" };
    return { label: "Mức độ nặng", class: "base-tag-negative" };
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Chấm Điểm UAS7 &amp; AAS7</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-chart text-sm"></span>
              <span>Theo dõi mức độ sẩn phù và ngứa trong 24 giờ</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/patient" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Quay lại</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Module Grouped Sub-navigation (Line Tab Style) */}
      <div className="base-tab-nav !mb-2">
        <Link
          to="/patient/uas7"
          className="base-tab-item is-active"
        >
          <span className="isax-b icon-chart-21 text-base"></span>
          <span>Chấm điểm</span>
        </Link>
        <Link
          to="/patient/lesions"
          className="base-tab-item"
        >
          <span className="isax icon-camera text-base"></span>
          <span>Ảnh tổn thương</span>
        </Link>
      </div>

      {/* Tabs UAS7 vs AAS7 */}
      <div className="base-tab-nav">
        <button
          onClick={() => setActiveTab("uas7")}
          className={`base-tab-item ${activeTab === "uas7" ? "is-active" : ""}`}
        >
          <span className="isax icon-chart-21 text-base"></span>
          <span>Thang điểm UAS7</span>
        </button>
        <button
          onClick={() => setActiveTab("aas7")}
          className={`base-tab-item ${activeTab === "aas7" ? "is-active" : ""}`}
        >
          <span className="isax icon-danger text-base"></span>
          <span>Thang điểm AAS7</span>
        </button>
      </div>

      {activeTab === "uas7" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form ghi nhận */}
          <div className="lg:col-span-7 space-y-6">
            <div className="base-card p-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--base-border-opaque)] mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase">Ghi Nhận Chỉ Số Hôm Nay</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Đánh giá trung thực tình trạng trong 24 giờ qua</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="isax icon-calendar text-sm text-gray-400"></span>
                  <input
                    type="date"
                    value={scoreDate}
                    onChange={(e) => setScoreDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--base-border-opaque)] font-mono font-semibold"
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Nốt sẩn phù (HSS) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-900">
                      1. Số lượng nốt sẩn (HSS)
                    </label>
                    <span className="text-xs font-mono font-bold text-[var(--base-brand-blue)]">{hss} / 3</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { val: 0, title: "0 - Không có", desc: "Không xuất hiện nốt sẩn" },
                      { val: 1, title: "1 - Nhẹ", desc: "Dưới 20 nốt / 24 giờ" },
                      { val: 2, title: "2 - Vừa", desc: "20 - 50 nốt / 24 giờ" },
                      { val: 3, title: "3 - Nặng", desc: "Trên 50 nốt hoặc mảng lớn" },
                    ].map((opt) => (
                      <div
                        key={opt.val}
                        onClick={() => setHss(opt.val)}
                        className={`base-selection-card cursor-pointer ${
                          hss === opt.val ? "is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="hss"
                          checked={hss === opt.val}
                          onChange={() => setHss(opt.val)}
                          className="mt-0.5 h-4 w-4 text-[var(--base-brand-blue)]"
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-900">{opt.title}</div>
                          <div className="text-[11px] text-gray-500">{opt.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Cảm giác ngứa (ISS) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-900">
                      2. Mức độ ngứa (ISS)
                    </label>
                    <span className="text-xs font-mono font-bold text-[var(--base-brand-blue)]">{iss} / 3</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { val: 0, title: "0 - Không ngứa", desc: "Không có cảm giác ngứa" },
                      { val: 1, title: "1 - Nhẹ", desc: "Ngứa nhẹ, không ảnh hưởng" },
                      { val: 2, title: "2 - Vừa", desc: "Ngứa gây khó chịu" },
                      { val: 3, title: "3 - Nặng", desc: "Ngứa dữ dội, cản trở sinh hoạt" },
                    ].map((opt) => (
                      <div
                        key={opt.val}
                        onClick={() => setIss(opt.val)}
                        className={`base-selection-card cursor-pointer ${
                          iss === opt.val ? "is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="iss"
                          checked={iss === opt.val}
                          onChange={() => setIss(opt.val)}
                          className="mt-0.5 h-4 w-4 text-[var(--base-brand-blue)]"
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-900">{opt.title}</div>
                          <div className="text-[11px] text-gray-500">{opt.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tổng điểm ngày & Button */}
                <div className="p-4 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">Tổng điểm ngày (HSS + ISS):</span>
                    <span className="text-2xl font-mono font-extrabold text-[var(--base-brand-navy)]">
                      {dailyScore} <span className="text-xs font-normal text-gray-500">/ 6 điểm</span>
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="base-btn base-btn-primary base-btn-default cursor-pointer font-bold shadow-sm"
                  >
                    <span className="isax icon-tick-circle text-base"></span>
                    <span>Lưu Kết Quả Hôm Nay</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Cột phải: Lịch sử & Thống kê tuần */}
          <div className="lg:col-span-5 space-y-6">
            <div className="base-card p-5">
              <h3 className="text-xs font-bold text-gray-900 uppercase mb-3">Lịch Sử 7 Ngày Gần Nhất</h3>
              <div className="divide-y divide-[var(--base-border-opaque)]">
                {scores.map((s) => (
                  <div key={s.score_date} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-gray-900">
                        {s.score_date}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Sẩn phù (HSS): {s.hss7}/3 • Ngứa (ISS): {s.iss7}/3
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-[var(--base-brand-navy)]">
                        {s.daily_score} / 6
                      </div>
                      <span className={`base-tag ${getSeverity(s.daily_score).class} text-[10px]`}>
                        {getSeverity(s.daily_score).label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="isax-b icon-info-circle text-sm text-[var(--base-brand-blue)]"></span>
                <span>Ý nghĩa lâm sàng của thang điểm UAS7:</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                UAS7 = Tổng điểm 7 ngày liên tiếp (0–42 điểm). Điểm dưới 6 biểu thị bệnh đã kiểm soát tốt; từ 28 điểm trở lên biểu thị đợt bùng phát nặng cần bác sĩ điều chỉnh phác đồ tăng liều kháng H1 hoặc xem xét sinh học Omalizumab.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Tab Phù mạch AAS7 */
        <div className="base-card p-8 text-center max-w-2xl mx-auto space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            <span className="isax-b icon-danger"></span>
          </div>
          <h2 className="text-base font-bold text-gray-900">Thang Điểm Hoạt Tính Phù Mạch (AAS7)</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Áp dụng cho các bệnh nhân có biểu hiện phù môi, mí mắt, bộ phận sinh dục hoặc các mô mềm. Vui lòng liên hệ bác sĩ nếu xuất hiện phù nề vùng thanh quản gây khó thở.
          </p>
          <div className="p-4 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] text-left text-xs space-y-2">
            <div className="font-bold text-gray-900">Đợt phù mạch gần nhất:</div>
            <p className="text-gray-600">Chưa ghi nhận đợt phù nề mô sâu nào trong 7 ngày qua.</p>
          </div>
        </div>
      )}
    </div>
  );
}
