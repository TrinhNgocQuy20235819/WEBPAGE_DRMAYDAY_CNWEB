import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function PatientLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Đã đăng xuất tài khoản bệnh nhân");
    navigate("/login");
  };

  const overviewNav = [
    { name: "Trang Chủ Điều Trị", path: "/patient", icon: "icon-home-2" },
  ];

  const diaryNav = [
    { name: "Chấm Điểm UAS7 & AAS7", path: "/patient/uas7", icon: "icon-chart-21" },
    { name: "Kho Ảnh Tổn Thương 3 Mốc", path: "/patient/lesions", icon: "icon-camera" },
  ];

  const medicalRecordNav = [
    { name: "Sổ Y Bạ & Thẻ BHYT", path: "/patient/profile", icon: "icon-user" },
  ];

  const emergencyNav = [
    {
      name: "Sàng Lọc Báo Động (<30s)",
      path: "/patient/screening",
      icon: "icon-danger",
      isEmergency: true,
    },
  ];

  return (
    <div className="flex h-screen bg-white font-sans antialiased overflow-hidden">
      {/* Sidebar Bệnh Nhân (Đồng bộ cấu trúc cột đứng 280px như Bác sĩ & Admin) */}
      <aside className="w-[280px] bg-white border-r border-[var(--base-border-opaque)] flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
            <Link to="/patient" className="flex items-center gap-3">
              <img
                src="/images/logo/drmayday-logo.png"
                alt="DrMayDay - Cổng Bệnh Nhân"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="hidden h-10 px-3 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold items-center text-sm">
                DrMayDay
              </div>
            </Link>
          </div>

          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)]">
            {/* Nhóm 1: Tổng quan */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Tổng quan &amp; Lịch theo dõi
              </div>
              <nav className="space-y-1">
                {overviewNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/patient"}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] font-bold border-l-4 border-[var(--base-brand-blue)]"
                          : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`isax ${item.icon} text-base`}></span>
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Nhóm 2: Nhật ký điều trị */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Nhật ký lâm sàng hàng ngày
              </div>
              <nav className="space-y-1">
                {diaryNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] font-bold border-l-4 border-[var(--base-brand-blue)]"
                          : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`isax ${item.icon} text-base`}></span>
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Nhóm 3: Hồ sơ y bạ */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Hồ sơ y bạ &amp; Bảo hiểm
              </div>
              <nav className="space-y-1">
                {medicalRecordNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] font-bold border-l-4 border-[var(--base-brand-blue)]"
                          : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`isax ${item.icon} text-base`}></span>
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Nhóm 4: Cấp cứu phản vệ khẩn cấp */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Khẩn cấp &amp; Phản vệ
              </div>
              <nav className="space-y-1">
                {emergencyNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                        isActive
                          ? "bg-rose-100 border-rose-400 text-rose-900 border-l-4"
                          : "bg-rose-50/60 border-rose-200 text-rose-700 hover:bg-rose-100/80"
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="isax-b icon-danger text-base text-rose-600 animate-pulse"></span>
                      <span>{item.name}</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                M
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--base-content-primary)] truncate">Nguyễn Thị Mai</p>
                <span className="base-role-badge base-role-badge-patient text-[9px]">Bệnh nhân ngoại trú</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--base-negative-primary)] hover:bg-[var(--base-negative-tint)] transition cursor-pointer"
            >
              <span className="isax icon-logout text-base"></span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-[var(--base-border-opaque)] bg-white px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 text-xs text-[var(--base-content-secondary)]">
            <span className="isax icon-hospital text-sm text-[var(--base-brand-blue)]"></span>
            <span className="font-semibold text-gray-900">Bệnh viện Da liễu Trung ương</span>
            <span>•</span>
            <span>Cổng Bệnh Nhân Ngoại Trú (DrMayDay)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Emergency Action Pill */}
            <Link
              to="/patient/screening"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold shadow-2xs group"
              title="Kích hoạt tự sàng lọc phản vệ trong 30 giây"
            >
              <span className="isax-b icon-danger text-sm"></span>
              <span>Báo Động Đỏ (&lt;30s)</span>
            </Link>

            {/* Role switchers */}
            <Link
              to="/doctor"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang Cổng Bác sĩ"
            >
              <span className="isax icon-health text-xs"></span>
              <span>Bác Sĩ</span>
            </Link>
            <Link
              to="/admin"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang Cổng Quản trị"
            >
              <span className="isax icon-element-plus text-xs"></span>
              <span>Quản Trị</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
