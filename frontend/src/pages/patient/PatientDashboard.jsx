import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function PatientDashboard() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const [fullName, setFullName] = useState(storedUser.full_name || "Người bệnh");
  const [records, setRecords] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const profRes = await apiClient.get("/profile");
        const prof = profRes.data || {};
        const uid = prof.user_id || storedUser.user_id;
        if (!cancelled && prof.full_name) {
          setFullName(prof.full_name);
        }

        if (uid) {
          const [histRes, uasRes] = await Promise.all([
            apiClient
              .get(`/medical_records/patients/${uid}/history`)
              .catch(() => ({ data: [] })),
            apiClient.get(`/uas7-scores/patient/${uid}`).catch(() => ({ data: [] })),
          ]);

          if (cancelled) return;

          const recList = Array.isArray(histRes.data) ? histRes.data : [];
          setRecords(recList);

          const rawScores = Array.isArray(uasRes.data) ? uasRes.data : [];
          const normalized = rawScores
            .map((s) => ({
              score_date: String(s.score_date || "").slice(0, 10),
              daily_score: Number(s.daily_score || 0),
              hss7: Number(s.hss7 || 0),
              iss7: Number(s.iss7 || 0),
            }))
            .sort((a, b) => a.score_date.localeCompare(b.score_date))
            .slice(-7);

          setScores(normalized);
        }
      } catch {
        // Fallback gracefully if unauthorized or empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [storedUser.user_id]);

  const todayScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const recentRecord = records.length > 0 ? records[0] : null;

  // UAS7 calculation
  const weeklyTotal = scores.reduce((sum, s) => sum + s.daily_score, 0);
  const weeklyAvg = scores.length > 0 ? (weeklyTotal / scores.length).toFixed(1) : "0.0";

  const getSeverity = (score) => {
    if (score <= 6) return { label: "Kiểm soát tốt", class: "base-tag-positive" };
    if (score <= 15) return { label: "Mức độ nhẹ", class: "base-tag-info" };
    if (score <= 27) return { label: "Mức độ vừa", class: "base-tag-warning" };
    return { label: "Mức độ nặng", class: "base-tag-negative" };
  };

  const getBarHeight = (daily) => {
    return Math.max(15, Math.round((daily / 6) * 100));
  };

  const getRecordStatusLabel = (status) => {
    if (status === "completed") return { label: "Đã chốt bệnh án", cls: "base-tag-positive" };
    if (status === "in_progress") return { label: "Đang khám lâm sàng", cls: "base-tag-info" };
    return { label: "Đang chờ bác sĩ tiếp nhận", cls: "base-tag-warning" };
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Greeting Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Xin chào, {fullName}</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-calendar text-sm"></span>
              <span>
                Hôm nay:{" "}
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/patient/uas7" className="base-btn-hero-accent">
              <span className="isax-b icon-chart text-sm"></span>
              <span>Chấm Điểm UAS7</span>
            </Link>
            <Link to="/patient/lesions" className="base-btn-hero-primary">
              <span className="isax icon-camera text-sm"></span>
              <span>Tải Ảnh Tổn Thương</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Red Alert Hotline Reminder */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
            <span className="isax-b icon-clock text-xl"></span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">
              Cảnh báo: Sàng lọc phản vệ trong 30 giây
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Nếu xuất hiện khó thở, sưng họng hoặc choáng ngất, hãy kích hoạt Báo động đỏ ngay.
            </p>
          </div>
        </div>
        <Link
          to="/emergency-triage"
          className="base-btn base-btn-compact base-btn-primary shrink-0 self-start sm:self-auto text-xs"
        >
          <span>Báo động đỏ</span>
          <span className="isax icon-arrow-right-1 text-xs"></span>
        </Link>
      </div>

      {/* 3. Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Today/Latest UAS */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">
              {todayScore ? `UAS (${todayScore.score_date.slice(5)})` : "UAS hôm nay"}
            </span>
            <div className="base-stat-card-icon">
              <span className="isax icon-chart-2 text-lg"></span>
            </div>
          </div>
          {todayScore ? (
            <div>
              <span className="base-stat-card-value">{todayScore.daily_score}</span>
              <span className="base-stat-card-unit">/ 6</span>
              <div className="flex items-center gap-3 text-xs text-[var(--base-content-secondary)] mt-2">
                <span>
                  HSS:{" "}
                  <strong className="text-[var(--base-content-primary)]">
                    {todayScore.hss7}/3
                  </strong>
                </span>
                <span>•</span>
                <span>
                  ISS:{" "}
                  <strong className="text-[var(--base-content-primary)]">
                    {todayScore.iss7}/3
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="base-stat-card-value text-gray-400">{loading ? "..." : "—"}</div>
          )}
          <div className="base-stat-card-footer">
            <Link to="/patient/uas7" className="base-link-arrow">
              <span>Xem nhật ký</span>
              <span className="isax icon-arrow-right-1 arrow-icon text-xs"></span>
            </Link>
          </div>
        </div>

        {/* Card 2: Weekly UAS7 */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Điểm UAS7 tuần</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-chart-success text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{weeklyTotal}</span>
            <span className="base-stat-card-unit">/ 42</span>
          </div>
          <div>
            <span className={`base-tag ${getSeverity(weeklyTotal).class}`}>
              {getSeverity(weeklyTotal).label}
            </span>
          </div>
          <div className="base-stat-card-footer">
            <span className="text-xs text-[var(--base-content-secondary)]">
              Trung bình: <strong className="text-gray-900">{weeklyAvg}</strong> / ngày
            </span>
          </div>
        </div>

        {/* Card 3: Recent Record */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Bệnh án gần nhất</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-document-text text-lg"></span>
            </div>
          </div>
          {recentRecord ? (
            <>
              <div>
                <div className="font-mono text-xl font-bold text-gray-900">
                  {recentRecord.record_code}
                </div>
                <p className="text-xs text-gray-600 truncate mt-1">
                  {recentRecord.diagnosis || "Theo dõi mày đay"}
                </p>
              </div>
              <div>
                <span className={`base-tag ${getRecordStatusLabel(recentRecord.status).cls}`}>
                  <span className="isax icon-clock text-xs"></span>
                  <span>{getRecordStatusLabel(recentRecord.status).label}</span>
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500 py-2">
              {loading ? "Đang tải hồ sơ..." : "Chưa có hồ sơ bệnh án nào."}
            </div>
          )}
          <div className="base-stat-card-footer">
            <Link to="/patient/profile" className="base-link-arrow">
              <span>Xem chi tiết hồ sơ</span>
              <span className="isax icon-arrow-right-1 arrow-icon text-xs"></span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. UAS7 7-Day Bar Chart */}
      <div className="base-card">
        <div className="base-card-header flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="base-card-title">Biểu Đồ Diễn Tiến Điểm UAS7 (7 Ngày Gần Nhất)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Thang điểm tiêu chuẩn: 0 (hoàn toàn bình thường) đến 6 (sẩn phù &amp; ngứa tối đa)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[var(--base-positive-primary)]"></span> 0 -
              2 (Kiểm soát tốt)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[var(--base-warning-fill)]"></span> 3 - 4
              (Nhẹ/Vừa)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[var(--base-negative-primary)]"></span> 5 -
              6 (Nặng)
            </span>
          </div>
        </div>

        <div className="base-card-body">
          {scores.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 bg-[var(--base-bg-surface-alt)] rounded-lg border border-[var(--base-border-opaque)]">
              Chưa có dữ liệu điểm UAS7. Hãy bấm{" "}
              <Link to="/patient/uas7" className="text-[var(--base-brand-blue)] font-bold underline">
                Chấm điểm UAS7
              </Link>{" "}
              để bắt đầu theo dõi!
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36 pt-4 px-2 bg-[var(--base-bg-surface-alt)] rounded-lg border border-[var(--base-border-opaque)]">
              {scores.map((s) => (
                <div
                  key={s.score_date}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                  title={`Ngày ${s.score_date}: ${s.daily_score} / 6 điểm`}
                >
                  <div className="font-mono text-xs font-bold text-gray-900 group-hover:-translate-y-0.5 transition-transform">
                    {s.daily_score}
                  </div>
                  <div
                    className="w-full max-w-[44px] rounded-t-md transition-all duration-200 group-hover:brightness-110"
                    style={{
                      height: `${getBarHeight(s.daily_score)}%`,
                      backgroundColor:
                        s.daily_score <= 2
                          ? "var(--base-positive-primary)"
                          : s.daily_score <= 4
                          ? "var(--base-warning-fill)"
                          : "var(--base-negative-primary)",
                    }}
                  ></div>
                  <div className="font-mono text-[11px] text-gray-500 text-center group-hover:text-gray-900">
                    {s.score_date.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Clinical Navigation Modules */}
      <div>
        <h2 className="base-section-heading">Phân Hệ Chức Năng Lâm Sàng</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/patient/uas7"
            className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-bg-secondary)] flex items-center justify-center text-[var(--base-brand-blue)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-chart text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">
                  Nhật Ký UAS7
                </div>
                <div className="text-[11px] text-gray-500">Ghi nhận mức sẩn &amp; ngứa</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>

          <Link
            to="/patient/lesions"
            className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-bg-secondary)] flex items-center justify-center text-[var(--base-brand-blue)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-camera text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">
                  Tổn Thương Da
                </div>
                <div className="text-[11px] text-gray-500">Kho ảnh 3 mốc chuẩn hóa</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>

          <Link
            to="/patient/screening"
            className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-negative-tint)] flex items-center justify-center text-[var(--base-negative-primary)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-danger text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">
                  Khai Thác Bệnh Sử
                </div>
                <div className="text-[11px] text-gray-500">Sàng lọc &amp; gửi bệnh án</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>

          <Link
            to="/patient/profile"
            className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-bg-secondary)] flex items-center justify-center text-[var(--base-brand-blue)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-user text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">
                  Hồ Sơ Y Tế Cá Nhân
                </div>
                <div className="text-[11px] text-gray-500">Thẻ BHYT &amp; đơn thuốc</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
