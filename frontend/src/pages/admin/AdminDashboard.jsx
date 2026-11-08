import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function AdminDashboard() {
  const [kpis, setKpis] = useState({
    pending_count: 0,
    in_progress_count: 0,
    completed_count: 0,
    branches_count: 0,
    rooms_count: 0,
  });
  const [records, setRecords] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/admin/dashboard")
      .then((res) => {
        if (cancelled) return;
        const d = res.data || {};
        if (d.kpis) setKpis(d.kpis);
        if (Array.isArray(d.recent_records)) setRecords(d.recent_records);
        if (Array.isArray(d.clinical_staff)) {
          setStaffs(d.clinical_staff.filter((s) => s.role_id === 2 || s.role_id === 3));
        }
        if (Array.isArray(d.templates) && d.templates.length > 0) {
          setActiveTemplate(d.templates.find((t) => t.is_active) || d.templates[0]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <span className="text-white/70">Quản trị</span>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Tổng quan</span>
            </div>
            <h1 className="base-hero-title">Tổng Quan Quản Trị</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-buildings text-sm"></span>
              <span>Giám sát hoạt động khám bệnh, hạ tầng và biểu mẫu</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/admin/topology" className="base-btn-hero-primary">
              <span className="isax icon-buildings text-sm"></span>
              <span>Hạ tầng</span>
            </Link>
            <Link to="/admin/form-builder" className="base-btn-hero-accent">
              <span className="isax-b icon-document-text text-sm"></span>
              <span>Biểu mẫu</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Ca chờ tiếp nhận</span>
            <div className="base-stat-card-icon text-[var(--base-warning-primary)]">
              <span className="isax icon-clock text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.pending_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-warning text-[10px]">Chờ bác sĩ</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Hàng đợi trực tiếp</span>
          </div>
        </div>

        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Đang khám điều trị</span>
            <div className="base-stat-card-icon text-[var(--base-info-primary)]">
              <span className="isax icon-health text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.in_progress_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-info text-[10px]">Đang khám</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Khám lâm sàng</span>
          </div>
        </div>

        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Đã chốt bệnh án</span>
            <div className="base-stat-card-icon text-[var(--base-positive-primary)]">
              <span className="isax icon-tick-circle text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.completed_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-positive text-[10px]">Hoàn thành</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Đã gửi đơn thuốc</span>
          </div>
        </div>

        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Hạ tầng cơ sở</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-buildings text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.branches_count}</span>
            <span className="base-stat-card-unit">chi nhánh</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-neutral text-[10px]">{kpis.rooms_count} phòng khám</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Cơ cấu 3 tầng</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Consultations Table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="base-card overflow-hidden">
            <div className="base-card-header flex items-center justify-between">
              <div>
                <h2 className="base-card-title">Ca Khám Toàn Viện</h2>
                <p className="text-xs text-gray-500 mt-0.5">Giám sát trạng thái xử lý bệnh án thời gian thực</p>
              </div>
              <Link to="/admin/users" className="base-btn base-btn-secondary base-btn-compact text-xs">
                <span>Nhân sự trực</span>
                <span className="isax icon-arrow-right-1 text-xs"></span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="base-table">
                <thead>
                  <tr>
                    <th>Mã BA</th>
                    <th>Bệnh nhân</th>
                    <th>Thể bệnh</th>
                    <th>Bác sĩ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-xs text-gray-400">
                        Đang tải dữ liệu giám sát toàn viện...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-xs text-gray-400">
                        Chưa có ca khám nào trong hệ thống.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.medical_record_id}>
                        <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">
                          {r.record_code}
                        </td>
                        <td>
                          <div className="font-bold text-xs text-gray-900">{r.patient_name}</div>
                          <div className="font-mono text-[11px] text-gray-500">{r.patient_phone}</div>
                        </td>
                        <td>
                          {r.clinical_type === "chronic" ? (
                            <span className="base-tag base-tag-info font-bold text-[10px]">Mạn tính</span>
                          ) : (
                            <span className="base-tag base-tag-warning font-bold text-[10px]">Cấp tính</span>
                          )}
                        </td>
                        <td className="text-xs font-semibold text-gray-800">
                          {r.doctor_name || "Chưa phân công"}
                        </td>
                        <td>
                          <span
                            className={`base-tag text-[10px] ${
                              r.status === "completed"
                                ? "base-tag-positive"
                                : r.status === "in_progress"
                                ? "base-tag-info"
                                : "base-tag-warning"
                            }`}
                          >
                            {r.status === "completed"
                              ? "Đã khám"
                              : r.status === "in_progress"
                              ? "Đang khám"
                              : "Chờ khám"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Active Doctors & Active Template (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="base-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
              <h3 className="text-xs font-bold text-gray-900 uppercase">Nhân Sự Phụ Trách Lâm Sàng</h3>
              <Link to="/admin/users" className="text-xs font-bold text-[var(--base-brand-blue)] hover:underline">
                Quản lý
              </Link>
            </div>

            <div className="space-y-2">
              {staffs.slice(0, 5).map((st) => (
                <div key={st.user_id} className="base-staff-row">
                  <div className="base-staff-avatar">
                    {(st.employee_code || "NV").slice(-2)}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-gray-900 truncate">{st.full_name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {st.specialty} • {st.room_name}
                    </p>
                  </div>
                  <span className="base-staff-online"></span>
                </div>
              ))}
            </div>
          </div>

          <div className="base-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase">Mẫu Phiếu Đang Kích Hoạt</h3>
            {activeTemplate ? (
              <div className="p-3 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] text-xs space-y-1">
                <div className="font-bold text-gray-900">{activeTemplate.name}</div>
                <div className="text-[11px] text-gray-500">
                  {activeTemplate.sections_count} phân mục • {activeTemplate.questions_count} câu hỏi • v{activeTemplate.version}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">Đang nạp thông tin mẫu phiếu...</div>
            )}
            <Link
              to="/admin/form-builder"
              className="base-btn base-btn-primary w-full py-2 text-xs font-bold justify-center"
            >
              <span>Bộ Tạo Mẫu Phiếu Khám</span>
              <span className="isax icon-arrow-right-1 text-xs"></span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
