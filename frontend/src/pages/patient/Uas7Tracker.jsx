import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

function getLocalTodayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Uas7Tracker() {
  const todayIso = getLocalTodayIso();

  const [activeTab, setActiveTab] = useState("uas7"); // 'uas7' or 'aas7'
  const [eligible, setEligible] = useState(true);
  const [scores, setScores] = useState([]);
  const [aasScores, setAasScores] = useState([]);
  const [savingUas, setSavingUas] = useState(false);
  const [savingAas, setSavingAas] = useState(false);

  // UAS7 state
  const [hss, setHss] = useState(1); // 0, 1, 2, 3
  const [iss, setIss] = useState(2); // 0, 1, 2, 3
  const [scoreDate, setScoreDate] = useState(todayIso);

  // AAS7 state
  const [aasDate, setAasDate] = useState(todayIso);
  const [hasAngioedema, setHasAngioedema] = useState(false);
  const [aasDiscomfort, setAasDiscomfort] = useState(1);
  const [aasActivity, setAasActivity] = useState(1);
  const [aasAppearance, setAasAppearance] = useState(1);
  const [aasOverall, setAasOverall] = useState(1);

  const dailyScore = hss + iss;
  const dailyAasScore = hasAngioedema
    ? aasDiscomfort + aasActivity + aasAppearance + aasOverall
    : 0;

  const loadAllScores = useCallback(async () => {
    try {
      const profRes = await apiClient.get("/profile");
      const uid = profRes.data?.user_id;

      const [eligRes, uasRes, aasRes] = await Promise.all([
        apiClient.get("/uas7-scores/eligibility").catch(() => ({ data: { eligible: "true" } })),
        uid ? apiClient.get(`/uas7-scores/patient/${uid}`).catch(() => ({ data: [] })) : { data: [] },
        uid ? apiClient.get(`/aas-scores/patient/${uid}`).catch(() => ({ data: [] })) : { data: [] },
      ]);

      setEligible(String(eligRes.data?.eligible) !== "false");

      const rawUas = Array.isArray(uasRes.data) ? uasRes.data : [];
      const normUas = rawUas
        .map((s) => ({
          score_date: String(s.score_date || "").slice(0, 10),
          daily_score: Number(s.daily_score || 0),
          hss7: Number(s.hss7 || 0),
          iss7: Number(s.iss7 || 0),
        }))
        .sort((a, b) => b.score_date.localeCompare(a.score_date));
      setScores(normUas);

      const rawAas = Array.isArray(aasRes.data) ? aasRes.data : [];
      const normAas = rawAas
        .map((a) => ({
          date: String(a.ngay_theo_doi || a.score_date || "").slice(0, 10),
          has_swelling: Boolean(a.co_dot_sung_phu),
          daily_score: Number(a.diem_aas_ngay || 0),
          discomfort: a.muc_kho_chiu,
          activity: a.han_che_hoat_dong,
          appearance: a.anh_huong_ngoai_hinh,
          overall: a.do_nang_tong_the,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setAasScores(normAas);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadAllScores();
  }, [loadAllScores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingUas(true);
    try {
      await apiClient.post("/uas7-scores", {
        score_date: scoreDate,
        hss7: hss,
        iss7: iss,
      });
      toast.success(`Đã ghi nhận điểm UAS ngày ${scoreDate}: ${dailyScore} / 6 điểm!`);
      await loadAllScores();
    } catch (err) {
      toast.error(err.message || "Không thể ghi nhận điểm UAS7");
    } finally {
      setSavingUas(false);
    }
  };

  const handleSubmitAas = async (e) => {
    e.preventDefault();
    setSavingAas(true);
    try {
      const payload = {
        ngay_theo_doi: aasDate,
        co_dot_sung_phu: hasAngioedema,
      };
      if (hasAngioedema) {
        payload.muc_kho_chiu = aasDiscomfort;
        payload.han_che_hoat_dong = aasActivity;
        payload.anh_huong_ngoai_hinh = aasAppearance;
        payload.do_nang_tong_the = aasOverall;
      }

      await apiClient.post("/aas-scores", payload);
      toast.success(`Đã lưu điểm phù mạch AAS ngày ${aasDate}: ${dailyAasScore} / 12 điểm!`);
      await loadAllScores();
    } catch (err) {
      toast.error(err.message || "Không thể lưu điểm AAS7");
    } finally {
      setSavingAas(false);
    }
  };

  const getSeverity = (daily) => {
    if (daily <= 2) return { label: "Kiểm soát tốt", class: "base-tag-positive" };
    if (daily <= 4) return { label: "Mức độ nhẹ/vừa", class: "base-tag-warning" };
    return { label: "Mức độ nặng", class: "base-tag-negative" };
  };

  const weeklyUasTotal = scores.slice(0, 7).reduce((sum, s) => sum + s.daily_score, 0);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Chấm Điểm UAS7 &amp; AAS7</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-chart text-sm"></span>
              <span>Theo dõi mức độ sẩn phù và phù mạch trong 24 giờ</span>
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
        <Link to="/patient/uas7" className="base-tab-item is-active">
          <span className="isax-b icon-chart-21 text-base"></span>
          <span>Chấm điểm</span>
        </Link>
        <Link to="/patient/lesions" className="base-tab-item">
          <span className="isax icon-camera text-base"></span>
          <span>Ảnh tổn thương</span>
        </Link>
      </div>

      {!eligible && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
          <span>
            Bạn cần có ít nhất 1 hồ sơ bệnh án Mày đay mạn tính đang theo dõi để ghi nhật ký UAS7/AAS7.
          </span>
          <Link to="/patient/screening" className="base-btn base-btn-primary base-btn-compact text-xs">
            Tạo hồ sơ ngay
          </Link>
        </div>
      )}

      {/* Tabs UAS7 vs AAS7 */}
      <div className="base-tab-nav">
        <button
          type="button"
          onClick={() => setActiveTab("uas7")}
          className={`base-tab-item ${activeTab === "uas7" ? "is-active" : ""}`}
        >
          <span className="isax icon-chart-21 text-base"></span>
          <span>Thang điểm UAS7</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("aas7")}
          className={`base-tab-item ${activeTab === "aas7" ? "is-active" : ""}`}
        >
          <span className="isax icon-danger text-base"></span>
          <span>Thang điểm AAS7 ({aasScores.length})</span>
        </button>
      </div>

      {activeTab === "uas7" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form ghi nhận */}
          <div className="lg:col-span-7 space-y-6">
            <div className="base-card p-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--base-border-opaque)] mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase">
                    Ghi Nhận Chỉ Số UAS Hàng Ngày
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Đánh giá trung thực tình trạng trong 24 giờ qua (Tối đa 1 lần / ngày)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="isax icon-calendar text-sm text-gray-400"></span>
                  <input
                    type="date"
                    max={todayIso}
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
                    <span className="text-xs font-mono font-bold text-[var(--base-brand-blue)]">
                      {hss} / 3
                    </span>
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
                    <span className="text-xs font-mono font-bold text-[var(--base-brand-blue)]">
                      {iss} / 3
                    </span>
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
                    disabled={savingUas || !eligible}
                    className="base-btn base-btn-primary base-btn-default cursor-pointer font-bold shadow-sm"
                  >
                    <span className="isax icon-tick-circle text-base"></span>
                    <span>{savingUas ? "Đang lưu..." : "Lưu Kết Quả Hôm Nay"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Cột phải: Lịch sử & Thống kê tuần */}
          <div className="lg:col-span-5 space-y-6">
            <div className="base-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase">
                  Lịch Sử Chấm Điểm UAS7
                </h3>
                <span className="base-tag base-tag-info text-[10px] font-mono">
                  UAS7 tuần: {weeklyUasTotal}/42
                </span>
              </div>

              {scores.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-4">
                  Chưa có bản ghi điểm UAS7 nào.
                </p>
              ) : (
                <div className="divide-y divide-[var(--base-border-opaque)] max-h-96 overflow-y-auto">
                  {scores.slice(0, 10).map((s) => (
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
              )}
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="isax-b icon-info-circle text-sm text-[var(--base-brand-blue)]"></span>
                <span>Ý nghĩa lâm sàng của thang điểm UAS7:</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                UAS7 = Tổng điểm 7 ngày liên tiếp (0–42 điểm). Điểm dưới 6 biểu thị bệnh đã kiểm soát
                tốt; từ 28 điểm trở lên biểu thị đợt bùng phát nặng cần bác sĩ điều chỉnh phác đồ tăng
                liều kháng H1 hoặc xem xét sinh học Omalizumab.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Tab Phù mạch AAS7 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmitAas} className="base-card p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--base-border-opaque)]">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase">
                    Thang Điểm Hoạt Tính Phù Mạch (AAS7)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Theo dõi sưng phù mô sâu (môi, mí mắt, bàn tay/chân) trong 24 giờ qua
                  </p>
                </div>
                <input
                  type="date"
                  max={todayIso}
                  value={aasDate}
                  onChange={(e) => setAasDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--base-border-opaque)] font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-900 block mb-2">
                  Trong 24 giờ qua, bạn có xuất hiện đợt sưng phù mạch nào không? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasAngioedema(false)}
                    className={`py-2.5 px-3 border text-xs font-bold cursor-pointer ${
                      !hasAngioedema
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                        : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                    }`}
                  >
                    Không có đợt phù mạch (0 điểm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasAngioedema(true)}
                    className={`py-2.5 px-3 border text-xs font-bold cursor-pointer ${
                      hasAngioedema
                        ? "bg-amber-50 border-amber-500 text-amber-900"
                        : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                    }`}
                  >
                    Có sưng phù môi / mí mắt / tay chân
                  </button>
                </div>
              </div>

              {hasAngioedema && (
                <div className="space-y-4 pt-2">
                  {[
                    {
                      label: "1. Mức độ khó chịu vật lý do sưng phù",
                      val: aasDiscomfort,
                      setter: setAasDiscomfort,
                    },
                    {
                      label: "2. Hạn chế hoạt động sinh hoạt hàng ngày",
                      val: aasActivity,
                      setter: setAasActivity,
                    },
                    {
                      label: "3. Ảnh hưởng thẩm mỹ / ngoại hình giao tiếp",
                      val: aasAppearance,
                      setter: setAasAppearance,
                    },
                    {
                      label: "4. Đánh giá độ nặng tổng thể của đợt phù mạch",
                      val: aasOverall,
                      setter: setAasOverall,
                    },
                  ].map((q, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-gray-800">{q.label}</span>
                        <span className="font-mono font-bold text-[var(--base-brand-blue)]">
                          {q.val} / 3
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { v: 0, t: "0 - Không" },
                          { v: 1, t: "1 - Nhẹ" },
                          { v: 2, t: "2 - Vừa" },
                          { v: 3, t: "3 - Nặng" },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => q.setter(opt.v)}
                            className={`py-1.5 px-2 border text-xs font-semibold cursor-pointer ${
                              q.val === opt.v
                                ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                                : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                            }`}
                          >
                            {opt.t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 block">Tổng điểm AAS ngày:</span>
                  <span className="text-2xl font-mono font-extrabold text-[var(--base-brand-navy)]">
                    {dailyAasScore}{" "}
                    <span className="text-xs font-normal text-gray-500">/ 12 điểm</span>
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={savingAas || !eligible}
                  className="base-btn base-btn-primary base-btn-default cursor-pointer font-bold"
                >
                  <span className="isax icon-tick-circle text-base"></span>
                  <span>{savingAas ? "Đang lưu..." : "Lưu Nhật Ký AAS"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="base-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase">
                Lịch Sử Đợt Phù Mạch Đã Ghi Nhận ({aasScores.length})
              </h3>
              {aasScores.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  Chưa ghi nhận đợt phù nề mô sâu nào trong 7 ngày qua.
                </p>
              ) : (
                <div className="divide-y divide-[var(--base-border-opaque)]">
                  {aasScores.map((item) => (
                    <div key={item.date} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-gray-900">{item.date}</div>
                        <div className="text-[11px] text-gray-500">
                          {item.has_swelling ? "Có đợt sưng phù mạch" : "Không có phù mạch"}
                        </div>
                      </div>
                      <span
                        className={`base-tag font-mono text-[10px] ${
                          item.has_swelling ? "base-tag-warning" : "base-tag-positive"
                        }`}
                      >
                        {item.daily_score} / 12 điểm
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
