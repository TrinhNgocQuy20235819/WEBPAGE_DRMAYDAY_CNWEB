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

  const navItems = [
    { name: "Trang Chủ", path: "/patient", icon: "icon-home-2" },
    { name: "Chấm Điểm UAS7", path: "/patient/uas7", icon: "icon-chart" },
    { name: "Sàng Lọc Báo Động (<30s)", path: "/patient/screening", icon: "icon-danger", alert: true },
    { name: "Tổn Thương Da 3 Mốc", path: "/patient/lesions", icon: "icon-camera" },
    { name: "Hồ Sơ Y Tế & BHYT", path: "/patient/profile", icon: "icon-user" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans antialiased text-gray-900">
      {/* Top Navigation Bar cho Bệnh Nhân (Uber Base Clean White) */}
      <header className="bg-white border-b border-[var(--base-border-opaque)] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/patient" className="flex items-center gap-3">
            <img
              src="/images/logo/drmayday-logo.png"
              alt="DrMayDay - Bệnh viện Da liễu Trung ương"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden h-10 px-3 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold items-center text-sm">
              DrMayDay
            </div>
          </Link>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/patient"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] font-bold border-b-2 border-[var(--base-brand-blue)]"
                      : item.alert
                      ? "text-[var(--base-negative-primary)] hover:bg-[var(--base-negative-tint)]"
                      : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                  }`
                }
              >
                <span className={`isax ${item.icon} text-base ${item.alert ? "text-[var(--base-negative-primary)] font-bold" : ""}`}></span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User badge & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-[var(--base-border-opaque)]">
              <div className="h-8 w-8 rounded-lg bg-[var(--base-gray-900)] text-white font-bold flex items-center justify-center text-xs">
                M
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-[var(--base-content-primary)] leading-none">Nguyễn Thị Mai</p>
                <span className="base-role-badge base-role-badge-patient text-[9px] mt-0.5">Bệnh nhân</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/doctor"
                className="base-btn base-btn-secondary base-btn-compact text-xs"
                title="Xem giao diện Bác sĩ"
              >
                <span className="isax icon-health text-xs"></span>
                <span className="hidden sm:inline">Bác sĩ</span>
              </Link>
              <button
                onClick={handleLogout}
                className="base-btn base-btn-secondary base-btn-compact text-xs text-[var(--base-negative-primary)] hover:bg-[var(--base-negative-tint)]"
                title="Đăng xuất"
              >
                <span className="isax icon-logout text-xs"></span>
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container on Pure White Canvas */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Medical Footer */}
      <footer className="border-t border-[var(--base-border-opaque)] py-6 text-center text-xs text-[var(--base-content-tertiary)] bg-white">
        <p className="font-medium">Hệ Thống Quản Lý Lâm Sàng Mày Đay (DrMayDay) • Bệnh Viện Da Liễu Trung Ương</p>
        <p className="mt-1">Quy chuẩn chẩn đoán WAO 2020 & EAACI/GA2LEN • Đề tài Nghiên cứu Khoa học Cấp Bộ</p>
      </footer>
    </div>
  );
}
