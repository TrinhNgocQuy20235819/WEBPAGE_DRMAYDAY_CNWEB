import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

export default function ScreeningForm() {
  const navigate = useNavigate();

  // Wizard Step: 1 (Định danh) -> 2 (Phân loại & Rẽ nhánh) -> 3 (Tư liệu tổn thương) -> 4 (Hoàn tất)
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Patient Identity
  const [hasHisCode, setHasHisCode] = useState(true);
  const [hisCode, setHisCode] = useState("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Clinical Branching (Acute vs Chronic)
  const [clinicalType, setClinicalType] = useState("chronic"); // 'acute' | 'chronic'
  const [whealDuration, setWhealDuration] = useState("1_to_24h"); // '<1h' | '1_to_24h' | '>24h'
  const [hasAngioedema, setHasAngioedema] = useState("sometimes"); // 'none' | 'sometimes' | 'frequent'

  // Step 3: Lesion Trend Comparison
  const [lesionTrend, setLesionTrend] = useState("worse"); // 'better' | 'unchanged' | 'worse'
  const [triggerNotes, setTriggerNotes] = useState(
    "Nổi sẩn phù nhiều khi thời tiết lạnh hoặc sau khi ăn hải sản"
  );

  // Red Flags Check in Step 2
  const [redFlags, setRedFlags] = useState({
    breathing: false,
    throat: false,
    dizziness: false,
    stomach: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function prefillFromProfile() {
      try {
        const res = await apiClient.get("/profile");
        const p = res.data || {};
        if (cancelled) return;
        if (p.full_name) setPatientName(p.full_name);
        if (p.phone) setPhone(p.phone);
        if (p.ma_his) {
          setHisCode(p.ma_his);
          setHasHisCode(true);
        } else {
          setHasHisCode(false);
        }
      } catch {
        // Ignore if profile unavailable
      }
    }
    prefillFromProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmergency = Object.values(redFlags).some((v) => v === true);

  const handleTriggerRedFlagEmergency = async () => {
    try {
      await apiClient.post("/red-flag-screening", {
        co_kho_tho_kho_khe_nghen_hong: redFlags.breathing,
        co_sung_moi_luoi_co_hong: redFlags.throat,
        co_chong_mat_tuc_nguc_sap_ngat: redFlags.dizziness,
        co_dau_bung_non_lien_tuc: redFlags.stomach,
        xac_nhan_muon_goi_cap_cuu: true,
        da_nhan_nut_goi_cap_cuu: false,
      });
    } catch {
      // Non-blocking emergency log
    }
    navigate("/emergency-triage");
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!patientName.trim() || !phone.trim()) {
        toast.error("Vui lòng điền đầy đủ thông tin định danh");
        return;
      }
    }
    if (currentStep === 2 && isEmergency) {
      toast.error("Có dấu hiệu báo động đỏ! Chuyển hướng cấp cứu.");
      return;
    }
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Lưu lượt sàng lọc báo động đỏ (An toàn ngoại trú)
      await apiClient.post("/red-flag-screening", {
        co_kho_tho_kho_khe_nghen_hong: redFlags.breathing,
        co_sung_moi_luoi_co_hong: redFlags.throat,
        co_chong_mat_tuc_nguc_sap_ngat: redFlags.dizziness,
        co_dau_bung_non_lien_tuc: redFlags.stomach,
      });

      // 2. Phân loại bệnh án để lấy template chuẩn (TMPL_URT_CHRONIC / TMPL_URT_ACUTE)
      const isChronic = clinicalType === "chronic";
      const classifyRes = await apiClient.post("/medical_records/classify", {
        is_chronic: isChronic,
        duration_weeks: isChronic ? 8 : 2,
      });
      const templateId =
        classifyRes.data?.template_id || (isChronic ? "TMPL_URT_CHRONIC" : "TMPL_URT_ACUTE");

      // 3. Chuẩn bị danh sách câu trả lời động đồng bộ với các bảng lâm sàng PostgreSQL
      const manifestationVal =
        hasAngioedema === "none" ? "Chi san phu" : "San phu + phu mach";
      const answersPayload = [
        {
          question_id: "Q_DURATION_WEEKS",
          answer_value: isChronic ? 8 : 2,
        },
        {
          question_id: "Q_DISEASE_MANIFESTATION",
          answer_text: manifestationVal,
        },
        {
          question_id: "Q_SUSPECTED_FOOD_DETAIL",
          answer_text: triggerNotes.trim() || "Chưa rõ dị nguyên đặc hiệu",
        },
        {
          question_id: "Q_WHEAL_DURATION",
          answer_text: whealDuration,
        },
        {
          question_id: "Q_ANGIOEDEMA_FREQ",
          answer_text: hasAngioedema,
        },
        {
          question_id: "Q_LESION_TREND",
          answer_text: lesionTrend,
        },
      ];

      // 4. Khởi tạo hồ sơ bệnh án mới ở trạng thái 'pending' đẩy thẳng vào hàng đợi Bác sĩ
      const createRes = await apiClient.post("/medical_records", {
        template_id: templateId,
        diagnosis: isChronic
          ? "Sàng lọc trực tuyến: Theo dõi Mày đay mạn tính (>= 6 tuần)"
          : "Sàng lọc trực tuyến: Theo dõi Mày đay cấp tính (< 6 tuần)",
        answers: answersPayload,
      });

      const newRecId = createRes.data?.medical_record_id;
      if (hasHisCode && hisCode.trim()) {
        await apiClient.put("/profile", { ma_his: hisCode.trim() }).catch(() => {});
      }

      toast.success(
        `Đã tạo hồ sơ khám #${newRecId || "MỚI"} và chuyển vào hàng đợi Bác sĩ!`
      );
      navigate("/patient");
    } catch (err) {
      toast.error(err.message || "Không thể gửi phiếu khảo sát. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Khảo Sát Lâm Sàng &amp; Phân Luồng</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-clipboard-text text-sm"></span>
              <span>Sàng lọc định danh, phân loại cấp/mạn tính và tư vấn xử trí</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link
              to="/emergency-triage"
              className="base-btn-hero-primary !border-rose-400/50 !bg-rose-500/20 text-rose-100"
            >
              <span className="isax-b icon-danger text-sm"></span>
              <span>Sàng lọc khẩn cấp</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Wizard Progress Line Tabs */}
      <div className="base-tab-nav">
        {[
          { step: 1, title: "1. Định danh bệnh nhân" },
          { step: 2, title: "2. Phân loại lâm sàng" },
          { step: 3, title: "3. Diễn tiến tổn thương" },
          { step: 4, title: "4. Kết luận & Phân luồng" },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => {
              if (item.step < currentStep) setCurrentStep(item.step);
            }}
            className={`base-tab-item ${currentStep === item.step ? "is-active" : ""}`}
          >
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {/* Emergency Warning if triggered */}
      {isEmergency && (
        <div className="base-card border-2 border-rose-600 bg-rose-50 p-5 space-y-3">
          <div className="flex items-center gap-3 text-rose-800">
            <span className="isax-b icon-danger text-2xl text-rose-600 animate-pulse"></span>
            <div>
              <strong className="text-sm font-bold block uppercase">
                Phát hiện dấu hiệu báo động đỏ!
              </strong>
              <p className="text-xs text-rose-700 mt-0.5">
                Bạn có triệu chứng đe dọa phản vệ. Vui lòng dừng điền phiếu và kích hoạt gọi cấp cứu
                115 ngay.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <a href="tel:115" className="base-btn base-btn-danger text-xs font-bold">
              Gọi 115 Cấp Cứu
            </a>
            <button
              type="button"
              onClick={handleTriggerRedFlagEmergency}
              className="base-btn base-btn-secondary text-xs cursor-pointer"
            >
              Mở sàng lọc khẩn cấp
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Định danh bệnh nhân */}
      {currentStep === 1 && (
        <div className="base-card p-6 space-y-5">
          <div className="border-b border-[var(--base-border-opaque)] pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase">
              Bước 1: Định Danh &amp; Tra Cứu Mã HIS
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Liên kết hồ sơ điện tử với Bệnh viện Da liễu Trung ương
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">
                Bạn đã từng khám tại Bệnh viện Da liễu Trung ương chưa?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHasHisCode(true)}
                  className={`py-2 px-3 border text-xs font-bold text-center cursor-pointer ${
                    hasHisCode
                      ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                      : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                  }`}
                >
                  Đã có mã hồ sơ (Mã HIS)
                </button>
                <button
                  type="button"
                  onClick={() => setHasHisCode(false)}
                  className={`py-2 px-3 border text-xs font-bold text-center cursor-pointer ${
                    !hasHisCode
                      ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                      : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                  }`}
                >
                  Bệnh nhân mới lần đầu
                </button>
              </div>
            </div>

            {hasHisCode && (
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Mã bệnh nhân / Mã HIS trên sổ khám *
                </label>
                <input
                  type="text"
                  value={hisCode}
                  onChange={(e) => setHisCode(e.target.value)}
                  placeholder="VD: HIS-BN-2026-001"
                  className="base-input font-mono text-xs w-full"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Họ và tên người bệnh *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="VD: Nguyễn Thị Mai"
                  className="base-input text-xs w-full"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="base-input font-mono text-xs w-full"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--base-border-opaque)] flex justify-end">
            <button
              type="button"
              onClick={handleNextStep}
              className="base-btn base-btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span>Tiếp tục: Phân loại lâm sàng</span>
              <span className="isax icon-arrow-right-1 text-xs"></span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Phân loại lâm sàng & Rẽ nhánh (Acute vs Chronic) */}
      {currentStep === 2 && (
        <div className="base-card p-6 space-y-6">
          <div className="border-b border-[var(--base-border-opaque)] pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase">Bước 2: Phân Loại Mày Đay</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Xác định thể bệnh để rẽ nhánh điều trị chính xác
            </p>
          </div>

          {/* Core Branching Decision */}
          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              Thời gian xuất hiện sẩn ngứa *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClinicalType("chronic")}
                className={`p-4 border text-left cursor-pointer transition ${
                  clinicalType === "chronic"
                    ? "bg-blue-50/70 border-[var(--base-brand-blue)] shadow-xs"
                    : "bg-white border-[var(--base-border-opaque)] hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-[var(--base-brand-navy)]">
                    Mạn tính
                  </span>
                  <span className="base-tag base-tag-info text-[10px]">Từ 6 tuần trở lên</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Sẩn phù và ngứa tái phát liên tục hoặc ngắt quãng từ 6 tuần trở lên.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setClinicalType("acute")}
                className={`p-4 border text-left cursor-pointer transition ${
                  clinicalType === "acute"
                    ? "bg-blue-50/70 border-[var(--base-brand-blue)] shadow-xs"
                    : "bg-white border-[var(--base-border-opaque)] hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-[var(--base-brand-navy)]">
                    Cấp tính
                  </span>
                  <span className="base-tag base-tag-warning text-[10px]">Dưới 6 tuần</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Mới khởi phát dưới 6 tuần, thường liên quan đến thức ăn, thuốc, hoặc virus.
                </p>
              </button>
            </div>
          </div>

          {/* Question: Wheal Life */}
          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              Thời gian tồn tại của mỗi nốt sẩn riêng lẻ *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { val: "<1h", label: "Dưới 1 giờ" },
                { val: "1_to_24h", label: "1 đến 24 giờ" },
                { val: ">24h", label: "Trên 24 giờ" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setWhealDuration(opt.val)}
                  className={`py-2 px-3 border text-xs font-bold text-center cursor-pointer ${
                    whealDuration === opt.val
                      ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                      : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question: Angioedema */}
          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              Sưng mí mắt, môi hoặc bàn tay bàn chân (Phù mạch) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { val: "none", label: "Không có" },
                { val: "sometimes", label: "Thỉnh thoảng" },
                { val: "frequent", label: "Thường xuyên" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setHasAngioedema(opt.val)}
                  className={`py-2 px-3 border text-xs font-bold text-center cursor-pointer ${
                    hasAngioedema === opt.val
                      ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                      : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Red Flag Checklist */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 space-y-2">
            <span className="text-xs font-bold text-amber-900 block uppercase">
              Rà soát nhanh 4 dấu hiệu báo động đỏ:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-gray-800">
                <input
                  type="checkbox"
                  checked={redFlags.breathing}
                  onChange={(e) => setRedFlags({ ...redFlags, breathing: e.target.checked })}
                  className="h-4 w-4 text-rose-600"
                />
                <span>Khó thở, thở rít hoặc tức ngực</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-800">
                <input
                  type="checkbox"
                  checked={redFlags.throat}
                  onChange={(e) => setRedFlags({ ...redFlags, throat: e.target.checked })}
                  className="h-4 w-4 text-rose-600"
                />
                <span>Sưng họng, nghẹn thở hoặc khàn tiếng</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-800">
                <input
                  type="checkbox"
                  checked={redFlags.dizziness}
                  onChange={(e) => setRedFlags({ ...redFlags, dizziness: e.target.checked })}
                  className="h-4 w-4 text-rose-600"
                />
                <span>Choáng váng, tụt huyết áp hoặc ngất</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-800">
                <input
                  type="checkbox"
                  checked={redFlags.stomach}
                  onChange={(e) => setRedFlags({ ...redFlags, stomach: e.target.checked })}
                  className="h-4 w-4 text-rose-600"
                />
                <span>Đau bụng quặn dữ dội kèm nôn mửa</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--base-border-opaque)] flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              className="base-btn base-btn-secondary text-xs cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isEmergency}
              className="base-btn base-btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span>Tiếp tục: Diễn tiến tổn thương</span>
              <span className="isax icon-arrow-right-1 text-xs"></span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Diễn tiến tổn thương & Yếu tố kích phát */}
      {currentStep === 3 && (
        <div className="base-card p-6 space-y-6">
          <div className="border-b border-[var(--base-border-opaque)] pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase">
              Bước 3: Diễn Tiến &amp; Yếu Tố Kích Phát
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              So sánh mức độ tổn thương da và ghi nhận hoàn cảnh xuất hiện
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-900 block mb-2">
              So với những ngày trước, nốt sẩn và độ ngứa hiện tại như thế nào? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { val: "better", label: "Đang thuyên giảm", icon: "icon-arrow-down-2" },
                { val: "unchanged", label: "Không thay đổi", icon: "icon-minus" },
                { val: "worse", label: "Nặng hơn / Lan rộng", icon: "icon-arrow-up-2" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setLesionTrend(opt.val)}
                  className={`py-3 px-3 border text-xs font-bold text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    lesionTrend === opt.val
                      ? "bg-blue-50 border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                      : "bg-white border-[var(--base-border-opaque)] text-gray-600"
                  }`}
                >
                  <span className={`isax ${opt.icon} text-lg`}></span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Yếu tố nghi ngờ kích hoạt tổn thương
            </label>
            <textarea
              rows={3}
              value={triggerNotes}
              onChange={(e) => setTriggerNotes(e.target.value)}
              placeholder="VD: Sau khi tắm nước nóng, khi căng thẳng, sau khi dùng thuốc giảm đau..."
              className="base-textarea text-xs w-full leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-[var(--base-border-opaque)] flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              className="base-btn base-btn-secondary text-xs cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="base-btn base-btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span>Xem kết luận phân luồng</span>
              <span className="isax icon-arrow-right-1 text-xs"></span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Kết luận & Phân Luồng (Branch A vs Branch B) */}
      {currentStep === 4 && (
        <form onSubmit={handleSubmit} className="base-card p-6 space-y-6">
          <div className="border-b border-[var(--base-border-opaque)] pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase">
              Bước 4: Kết Luận Khảo Sát &amp; Lộ Trình
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tư vấn lâm sàng cá nhân hóa dựa trên phân nhánh
            </p>
          </div>

          {/* Branch A: Cấp tính */}
          {clinicalType === "acute" && (
            <div className="p-5 bg-amber-50/70 border border-amber-300 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="base-tag base-tag-warning text-xs font-bold">
                  NHÁNH A: MÀY ĐAY CẤP TÍNH
                </span>
                <span className="text-xs text-gray-500 font-mono">Dưới 6 tuần</span>
              </div>
              <h3 className="text-base font-extrabold text-amber-950">
                Hướng Dẫn Theo Dõi Tại Nhà &amp; Nhận Biết Báo Động
              </h3>
              <ul className="text-xs text-amber-900 space-y-2 list-disc list-inside leading-relaxed">
                <li>Phần lớn mày đay cấp tính lành tính và tự thoái lui sau vài ngày đến 2 tuần.</li>
                <li>
                  Tránh các yếu tố kích phát nghi ngờ: Thức ăn lạ, thuốc kháng sinh/giảm đau không
                  kê đơn, côn trùng cắn.
                </li>
                <li>
                  Dùng thuốc kháng histamine H1 theo đơn bác sĩ và không tự ý gãi làm tổn thương da.
                </li>
                <li>
                  <strong>Cảnh báo khẩn cấp:</strong> Nếu xuất hiện khó thở hoặc sưng phù mặt, liên
                  hệ ngay cơ sở y tế gần nhất.
                </li>
              </ul>
            </div>
          )}

          {/* Branch B: Mạn tính */}
          {clinicalType === "chronic" && (
            <div className="p-5 bg-blue-50/70 border border-blue-300 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="base-tag base-tag-info text-xs font-bold">
                  NHÁNH B: MÀY ĐAY MẠN TÍNH
                </span>
                <span className="text-xs text-gray-500 font-mono">Từ 6 tuần trở lên</span>
              </div>
              <h3 className="text-base font-extrabold text-[var(--base-brand-navy)]">
                Lộ Trình Quản Lý &amp; Xét Nghiệm Chuyên Sâu Tại Bệnh Viện Da Liễu TW
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                Tình trạng kéo dài trên 6 tuần đòi hỏi đánh giá chuyên sâu để xác định thể bệnh (Mày
                đay mạn tự phát CSU hoặc mày đay vật lý CIndU) và phân tầng phác đồ bậc cao (Kháng
                H1 liều tăng cường hoặc Omalizumab).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 bg-white border border-blue-200">
                  <strong className="text-gray-900 block mb-1">
                    Chỉ định cận lâm sàng đề xuất:
                  </strong>
                  <span className="text-gray-600 block">• Định lượng IgE toàn phần huyết thanh</span>
                  <span className="text-gray-600 block">• Test da vẽ nổi cơ học (FricTest)</span>
                  <span className="text-gray-600 block">• Kháng thể kháng tuyến giáp (Anti-TPO)</span>
                </div>
                <div className="p-3 bg-white border border-blue-200">
                  <strong className="text-gray-900 block mb-1">
                    Theo dõi hoạt tính bệnh hàng ngày:
                  </strong>
                  <span className="text-gray-600 block">
                    • Chấm điểm nhật ký sẩn phù &amp; ngứa UAS7
                  </span>
                  <span className="text-gray-600 block">• Chụp lưu trữ ảnh tổn thương 3 mốc</span>
                  <span className="text-gray-600 block">• Tái khám định kỳ sau 4 tuần</span>
                </div>
              </div>
            </div>
          )}

          {/* Patient Confirmation Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-gray-500">Người bệnh: </span>
              <strong className="text-gray-900">{patientName}</strong>
              <span className="mx-2">•</span>
              <span className="text-gray-500">SĐT: </span>
              <strong className="text-gray-900 font-mono">{phone}</strong>
              <span className="mx-2">•</span>
              <span className="text-gray-500">Thể bệnh: </span>
              <strong className="text-[var(--base-brand-blue)]">
                {clinicalType === "chronic" ? "Mạn tính" : "Cấp tính"}
              </strong>
            </div>
            <span className="base-tag base-tag-positive text-[10px] font-bold">Sẵn sàng nộp</span>
          </div>

          <div className="pt-4 border-t border-[var(--base-border-opaque)] flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              className="base-btn base-btn-secondary text-xs cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="base-btn base-btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span className="isax icon-tick-circle text-base"></span>
              <span>
                {submitting ? "Đang khởi tạo hồ sơ..." : "Nộp Phiếu Khảo Sát Cho Bác Sĩ"}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
