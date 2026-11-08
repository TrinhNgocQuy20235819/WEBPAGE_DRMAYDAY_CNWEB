import { useState } from "react";
import { Link } from "react-router-dom";
import { INITIAL_RECORDS, INITIAL_STAFFS, INITIAL_BRANCHES, INITIAL_ROOMS, INITIAL_TEMPLATES } from "../../services/mockData";

export default function AdminDashboard() {
  const [records] = useState(INITIAL_RECORDS);
  const [staffs] = useState(INITIAL_STAFFS);
  const [branches] = useState(INITIAL_BRANCHES);
  const [rooms] = useState(INITIAL_ROOMS);
  const template = INITIAL_TEMPLATES[0];

  const pendingCount = records.filter((r) => r.status === "pending").length;
  const inProgressCount = records.filter((r) => r.status === "in_progress").length;
  const completedCount = records.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <span className="text-white/70">Quản trị</span>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Bảng điều khiển trung tâm</span>
            </div>
            <h1 className="base-hero-title">Bảng Điều Khiển Quản Trị Trung Tâm</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-buildings text-sm"></span>
              <span>Giám sát hoạt động khám chữa bệnh, cây hạ tầng chi nhánh và biểu mẫu khám động</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/admin/topology" className="base-btn-hero-primary">
              <span className="isax icon-buildings text-sm"></span>
              <span>Cây Hạ Tầng</span>
            </Link>
            <Link to="/admin/form-builder" className="base-btn-hero-accent">
              <span className="isax-b icon-document-text text-sm"></span>
              <span>Bộ Tạo Mẫu Phiếu Khám</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Ca chờ tiếp nhận</span>
            <div className="base-stat-card-icon text-[var(--base-warning-primary)]">
              <span className="isax icon-clock text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-warning text-[10px]">Chờ bác sĩ</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Hàng đợi trực tiếp</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Đang khám điều trị</span>
            <div className="base-stat-card-icon text-[var(--base-info-primary)]">
              <span className="isax icon-health text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{inProgressCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-info text-[10px]">Đang khám</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Khám lâm sàng</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Đã chốt bệnh án</span>
            <div className="base-stat-card-icon text-[var(--base-positive-primary)]">
              <span className="isax icon-tick-circle text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{completedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-positive text-[10px]">Hoàn thành</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Đã gửi đơn thuốc</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="base-stat-card">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Hạ tầng cơ sở</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-buildings text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{branches.length}</span>
            <span className="base-stat-card-unit">chi nhánh</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-neutral text-[10px]">{rooms.length} phòng khám</span>
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
                <h2 className="base-card-title">Danh Sách Ca Khám Toàn Viện</h2>
                <p className="text-xs text-gray-500 mt-0.5">Giám sát trạng thái xử lý bệnh án theo thời gian thực</p>
              </div>
              <Link to="/doctor" className="base-btn base-btn-secondary base-btn-compact text-xs">
                <span>Hàng đợi Bác sĩ</span>
                <span className="isax icon-arrow-right-1 text-xs"></span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="base-table">
                <thead>
                  <tr>
                    <th>Mã bệnh án</th>
                    <th>Bệnh nhân</th>
                    <th>Phân loại</th>
                    <th>Bác sĩ phụ trách</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">
                        {r.record_code}
                      </td>
                      <td>
                        <div className="font-bold text-xs text-gray-900">{r.patient_name}</div>
                        <div className="font-mono text-[11px] text-gray-500">{r.patient_phone}</div>
                      </td>
                      <td>
                        {r.clinical_type === "chronic" ? (
                          <span className="base-tag base-tag-info font-bold text-[10px]">
                            Mạn tính (&ge;6w)
                          </span>
                        ) : (
                          <span className="base-tag base-tag-warning font-bold text-[10px]">
                            Cấp tính (&lt;6w)
                          </span>
                        )}
                      </td>
                      <td className="text-xs font-semibold text-gray-800">
                        {r.assigned_doctor_name}
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
                          {r.status === "completed" ? "Hoàn tất" : r.status === "in_progress" ? "Đang khám" : "Chờ khám"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Active Doctors & Active Template (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Doctors */}
          <div className="base-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
              <h3 className="text-xs font-bold text-gray-900 uppercase">Bác Sĩ Phụ Trách Lâm Sàng</h3>
              <Link to="/admin/users" className="text-xs font-bold text-[var(--base-brand-blue)] hover:underline">
                Quản lý
              </Link>
            </div>

            <div className="space-y-2">
              {staffs.slice(0, 3).map((st) => (
                <div key={st.id} className="base-staff-row">
                  <div className="base-staff-avatar">
                    {st.employee_code.slice(-2)}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-gray-900 truncate">{st.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{st.specialty}</p>
                  </div>
                  <span className="base-staff-online"></span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Form Template Card */}
          <div className="base-card p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase">Mẫu Phiếu Đang Kích Hoạt</h3>
            <div className="p-3 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] text-xs space-y-1">
              <div className="font-bold text-gray-900">{template.name}</div>
              <div className="text-[11px] text-gray-500">{template.sections.length} phân mục câu hỏi • Chuẩn Bộ</div>
            </div>
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
