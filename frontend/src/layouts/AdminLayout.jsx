import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Đã đăng xuất tài khoản quản trị");
    navigate("/login");
  };

  const navItems = [
    { name: "Bảng Điều Khiển Quản Trị", path: "/admin", icon: "icon-element-plus" },
    { name: "Cơ Sở & Hạ Tầng Y Tế", path: "/admin/topology", icon: "icon-buildings" },
    { name: "Danh Bạ Nhân Sự Y Tế", path: "/admin/users", icon: "icon-profile-2user" },
    { name: "Bộ Tạo Mẫu Phiếu Khám", path: "/admin/form-builder", icon: "icon-document-text" },
  ];

  return (
    <div className="flex h-screen bg-white font-sans antialiased overflow-hidden">
      {/* Sidebar (Uber Base Standard) */}
      <aside className="w-[280px] bg-white border-r border-[var(--base-border-opaque)] flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3">
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
                DrMayDay Admin
              </div>
            </Link>
          </div>

          {/* Nav Section Label */}
          <div className="px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
            Danh mục quản trị
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] font-bold border-l-4 border-[var(--base-brand-blue)]"
                      : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                  }`
                }
              >
                <span className={`isax ${item.icon} text-lg`}></span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                AD
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--base-content-primary)] truncate">Quản Trị Viên</p>
                <span className="base-role-badge base-role-badge-admin text-[9px]">Quản trị hệ thống</span>
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
            <span className="font-medium">Bệnh viện Da liễu Trung ương</span>
            <span>•</span>
            <span>Cổng Quản Trị Hệ Thống DrMayDay</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/doctor"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang phân hệ Bác sĩ"
            >
              <span className="isax icon-user-tick text-xs"></span>
              <span>Giao diện Bác sĩ</span>
            </Link>
            <Link
              to="/patient"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang phân hệ Bệnh nhân"
            >
              <span className="isax icon-home-2 text-xs"></span>
              <span>Giao diện BN</span>
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
