import { useState } from "react";
import { Link } from "react-router-dom";
import { INITIAL_RECORDS, INITIAL_UAS7_SCORES } from "../../services/mockData";

export default function PatientDashboard() {
  const [records] = useState(INITIAL_RECORDS);
  const [scores] = useState(INITIAL_UAS7_SCORES);
  const todayScore = scores[scores.length - 1]; // Latest score
  const recentRecord = records[0];

  // UAS7 calculation
  const weeklyTotal = scores.reduce((sum, s) => sum + s.daily_score, 0);
  const weeklyAvg = (weeklyTotal / scores.length).toFixed(1);

  const getSeverity = (score) => {
    if (score <= 6) return { label: "Kiểm soát tốt", class: "base-tag-positive" };
    if (score <= 15) return { label: "Mức độ nhẹ", class: "base-tag-info" };
    if (score <= 27) return { label: "Mức độ vừa", class: "base-tag-warning" };
    return { label: "Mức độ nặng", class: "base-tag-negative" };
  };

  const getBarHeight = (daily) => {
    return Math.max(15, Math.round((daily / 6) * 100));
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Greeting Banner (T-019 Polish) */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Xin chào, Nguyễn Thị Mai</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-calendar text-sm"></span>
              <span>Hôm nay: {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
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
            <div className="text-xs font-bold text-gray-900">Nhắc nhở: Sàng lọc Báo động đỏ phản vệ &lt; 30 giây</div>
            <p className="text-xs text-gray-600 mt-0.5">
              Nếu bạn có dấu hiệu khó thở, nghẹn họng hoặc chóng mặt choáng ngất, hãy kích hoạt sàng lọc khẩn cấp ngay.
            </p>
          </div>
        </div>
        <Link to="/patient/screening" className="base-btn base-btn-compact base-btn-primary shrink-0 self-start sm:self-auto text-xs">
          <span>Sàng lọc khẩn cấp</span>
          <span className="isax icon-arrow-right-1 text-xs"></span>
        </Link>
      </div>

      {/* 3. Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Today UAS */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Điểm UAS hôm nay</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-chart-2 text-lg"></span>
            </div>
          </div>
          {todayScore ? (
            <div>
              <span className="base-stat-card-value">{todayScore.daily_score}</span>
              <span className="base-stat-card-unit">/ 6 điểm</span>
              <div className="flex items-center gap-3 text-xs text-[var(--base-content-secondary)] mt-2">
                <span>HSS: <strong className="text-[var(--base-content-primary)]">{todayScore.hss7}/3</strong></span>
                <span>•</span>
                <span>ISS: <strong className="text-[var(--base-content-primary)]">{todayScore.iss7}/3</strong></span>
              </div>
            </div>
          ) : (
            <div className="base-stat-card-value text-gray-400">—</div>
          )}
          <div className="base-stat-card-footer">
            <Link to="/patient/uas7" className="base-link-arrow">
              <span>Xem nhật ký chi tiết</span>
              <span className="isax icon-arrow-right-1 arrow-icon text-xs"></span>
            </Link>
          </div>
        </div>

        {/* Card 2: Weekly UAS7 */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Tổng điểm hoạt tính tuần (UAS7)</span>
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
              {getSeverity(weeklyTotal).label} ({weeklyTotal} điểm)
            </span>
          </div>
          <div className="base-stat-card-footer">
            <span className="text-xs text-[var(--base-content-secondary)]">
              Điểm trung bình: <strong className="text-gray-900">{weeklyAvg}</strong> / ngày
            </span>
          </div>
        </div>

        {/* Card 3: Recent Record */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Hồ sơ bệnh án gần nhất</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-document-text text-lg"></span>
            </div>
          </div>
          <div>
            <div className="font-mono text-xl font-bold text-gray-900">{recentRecord.record_code}</div>
            <p className="text-xs text-gray-600 truncate mt-1">{recentRecord.diagnosis}</p>
          </div>
          <div>
            <span className="base-tag base-tag-info">
              <span className="isax icon-clock text-xs"></span>
              <span>Đang khám lâm sàng</span>
            </span>
          </div>
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
            <p className="text-xs text-gray-500 mt-0.5">Thang điểm tiêu chuẩn: 0 (hoàn toàn bình thường) đến 6 (sẩn phù &amp; ngứa tối đa)</p>
          </div>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-xs bg-[var(--base-positive-primary)]"></span> 0 - 2 (Kiểm soát tốt)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-xs bg-[var(--base-warning-fill)]"></span> 3 - 4 (Nhẹ/Vừa)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-xs bg-[var(--base-negative-primary)]"></span> 5 - 6 (Nặng)</span>
          </div>
        </div>

        <div className="base-card-body">
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
        </div>
      </div>

      {/* 5. Clinical Navigation Modules */}
      <div>
        <h2 className="base-section-heading">Phân Hệ Chức Năng Lâm Sàng</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/patient/uas7" className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-bg-secondary)] flex items-center justify-center text-[var(--base-brand-blue)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-chart text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">Nhật Ký UAS7</div>
                <div className="text-[11px] text-gray-500">Ghi nhận mức sẩn &amp; ngứa</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>

          <Link to="/patient/lesions" className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-bg-secondary)] flex items-center justify-center text-[var(--base-brand-blue)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-camera text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">Tổn Thương Da</div>
                <div className="text-[11px] text-gray-500">Kho ảnh 3 mốc chuẩn hóa</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>

          <Link to="/patient/screening" className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-negative-tint)] flex items-center justify-center text-[var(--base-negative-primary)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-danger text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">Khai Thác Bệnh Sử</div>
                <div className="text-[11px] text-gray-500">Sàng lọc &amp; gửi bệnh án</div>
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-sm text-gray-400 group-hover:text-[var(--base-brand-blue)] group-hover:translate-x-0.5 transition-all"></span>
          </Link>

          <Link to="/patient/profile" className="base-card p-4 flex items-center justify-between gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-[var(--base-bg-secondary)] flex items-center justify-center text-[var(--base-brand-blue)] shrink-0 group-hover:scale-105 transition-transform">
                <span className="isax-b icon-user text-xl"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)] transition-colors">Hồ Sơ Y Tế Cá Nhân</div>
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
