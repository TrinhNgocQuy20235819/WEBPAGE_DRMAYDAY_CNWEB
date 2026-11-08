import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

const MILESTONE_META = {
  start: {
    label: "1. Khởi phát",
    tag: "base-tag-warning",
    fallbackDesc: "Sẩn đỏ li ti mới xuất hiện kèm cảm giác châm chích",
    fallbackUrl: "/images/clinic/clinic-urticaria-rash.jpg",
  },
  peak: {
    label: "2. Đỉnh điểm",
    tag: "base-tag-negative",
    fallbackDesc: "Các nốt sẩn kết tụ thành mảng phù nề lớn, ngứa dữ dội",
    fallbackUrl: "/images/clinic/clinic-examination.jpg",
  },
  normal: {
    label: "3. Thuyên giảm",
    tag: "base-tag-positive",
    fallbackDesc: "Nốt sẩn nhạt dần và lặn hoàn toàn không để lại vết thâm",
    fallbackUrl: "/images/clinic/clinic-consultation-02.jpg",
  },
};

export default function DoctorLesionReview() {
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [photos, setPhotos] = useState([]);
  const [runningAiId, setRunningAiId] = useState(null);
  const [doctorAssessment, setDoctorAssessment] = useState(
    "Hình ảnh giai đoạn đỉnh điểm cho thấy nhiều sẩn phù dạng bản đồ rải rác, bờ rõ, không có dấu hiệu xuất huyết dưới da hay bọng nước. Giai đoạn thuyên giảm lặn hoàn toàn không để lại vết thâm hay sẹo, phù hợp bệnh cảnh mày đay mạn tự phát (CSU)."
  );

  useEffect(() => {
    apiClient
      .get("/doctor/queue", { params: { status: "all", include_completed: "true" } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setRecords(list);
        const savedId = sessionStorage.getItem("activeDoctorRecordId");
        const picked =
          (savedId && list.find((r) => String(r.medical_record_id) === String(savedId))) ||
          list.find((r) => r.status === "in_progress") ||
          list[0];
        if (picked) {
          setSelectedRecordId(String(picked.medical_record_id));
        }
      })
      .catch(() => {});
  }, []);

  const loadLesions = useCallback(async (recId) => {
    if (!recId) return;
    try {
      const res = await apiClient.get(`/doctor/medical-records/${recId}/lesion-images`);
      const episodes = Array.isArray(res.data) ? res.data : [];
      const flat = [];
      for (const ep of episodes) {
        for (const loc of ep.locations || []) {
          for (const p of loc.photos || []) {
            flat.push({
              ...p,
              episode_name: ep.name,
              body_part: loc.body_part,
            });
          }
        }
        for (const p of ep.photos || []) {
          flat.push({
            ...p,
            episode_name: ep.name,
            body_part: "Toàn thân",
          });
        }
      }
      setPhotos(flat);
    } catch {
      setPhotos([]);
    }
  }, []);

  useEffect(() => {
    if (selectedRecordId) {
      sessionStorage.setItem("activeDoctorRecordId", String(selectedRecordId));
      loadLesions(selectedRecordId);
    }
  }, [selectedRecordId, loadLesions]);

  const handleRunAi = async (photo) => {
    setRunningAiId(photo.photo_id);
    try {
      const res = await apiClient.post("/ai/inference", {
        photo_id: Number(photo.photo_id),
        attachment_id: photo.attachment_id ? Number(photo.attachment_id) : undefined,
      });
      const ai = res.data || {};
      toast.success(
        `AI UrticariaNet: Đếm được ${ai.hives_count} nốt sẩn • AUAS = ${ai.local_auas}`
      );
      await loadLesions(selectedRecordId);
    } catch {
      // Handled by interceptor
    } finally {
      setRunningAiId(null);
    }
  };

  const handleSaveAssessment = () => {
    if (selectedRecordId) {
      localStorage.setItem(`lesion_note_${selectedRecordId}`, doctorAssessment);
    }
    toast.success("Đã lưu kết quả đối chiếu tổn thương vào hồ sơ lâm sàng!");
  };

  const orderedMilestones = ["start", "peak", "normal"];
  const stageCards = orderedMilestones.map((ms) => {
    const meta = MILESTONE_META[ms];
    const found = photos.find((p) => p.milestone === ms);
    return {
      milestone: ms,
      meta,
      photo: found || null,
    };
  });

  const capturedCount = stageCards.filter((s) => s.photo !== null).length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Đối Chiếu Ảnh Tổn Thương 3 Mốc &amp; AI</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-camera text-sm"></span>
              <span>Đối chiếu chu kỳ sẩn phù 3 giai đoạn và đếm nốt sẩn AI tự động (Slide 9)</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/doctor/prescriptions" className="base-btn-hero-primary">
              <span className="isax icon-health text-sm"></span>
              <span>Khám &amp; Kê đơn</span>
            </Link>
            <Link to="/doctor" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Hàng đợi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Patient Selector Filter */}
      <div className="base-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-700 shrink-0">Hồ sơ bệnh nhân:</span>
          <select
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            className="base-input text-xs font-bold max-w-sm"
          >
            {records.map((r) => (
              <option key={r.medical_record_id} value={r.medical_record_id}>
                {r.patient_name} ({r.record_code})
              </option>
            ))}
          </select>
        </div>

        <span className={`base-tag font-bold text-xs ${capturedCount === 3 ? "base-tag-positive" : "base-tag-info"}`}>
          Đã có {capturedCount}/3 mốc ảnh
        </span>
      </div>

      {/* 3 Mốc Ảnh Đối Chiếu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stageCards.map(({ milestone, meta, photo }) => (
          <div key={milestone} className="base-card overflow-hidden flex flex-col justify-between">
            <div>
              <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                {photo ? (
                  <img
                    src={photo.image_url || meta.fallbackUrl}
                    alt={meta.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = meta.fallbackUrl;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs p-4 text-center">
                    <span className="isax icon-camera text-3xl mb-2 text-gray-300"></span>
                    <span>Bệnh nhân chưa tải ảnh giai đoạn này</span>
                  </div>
                )}
                <span className={`absolute top-2.5 left-2.5 base-tag ${meta.tag} font-bold text-[10px] shadow-sm`}>
                  {meta.label}
                </span>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-bold text-gray-900">
                    {photo ? photo.body_part : "Chưa ghi nhận vị trí"}
                  </h3>
                  {photo?.itch_score != null && (
                    <span className="font-mono text-[11px] text-rose-600 font-bold">
                      Ngứa NRS: {photo.itch_score}/10
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                  <span className="isax icon-clock text-xs"></span>
                  <span>
                    {photo?.captured_at
                      ? new Date(photo.captured_at).toLocaleString("vi-VN")
                      : "Chưa có thời gian chụp"}
                  </span>
                </div>

                {photo && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">AI đếm nốt sẩn:</span>
                      <strong className="font-mono text-[var(--base-brand-navy)]">
                        {photo.hives_count != null ? `${photo.hives_count} nốt` : "Chưa chạy AI"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Chỉ số AUAS cục bộ:</span>
                      <strong className="font-mono text-[var(--base-brand-blue)]">
                        {photo.auas != null ? `${photo.auas} / 3.0` : "—"}
                      </strong>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-600 leading-relaxed">{meta.fallbackDesc}</p>
              </div>
            </div>

            <div className="p-3 border-t border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-medium">EAACI Wheal Counter</span>
              {photo ? (
                <button
                  type="button"
                  disabled={runningAiId === photo.photo_id}
                  onClick={() => handleRunAi(photo)}
                  className="base-btn base-btn-secondary base-btn-mini text-[11px] font-bold text-[var(--base-brand-blue)] cursor-pointer"
                >
                  {runningAiId === photo.photo_id ? "Đang đếm..." : "Chạy AI Đếm Sẩn"}
                </button>
              ) : (
                <span className="text-[11px] text-gray-400">Chờ ảnh</span>
              )}
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
