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

  const overviewNav = [
    { name: "Bảng Điều Khiển Chỉ Số", path: "/admin", icon: "icon-element-plus" },
  ];

  const organizationNav = [
    { name: "Hạ Tầng Cơ Sở Y Tế", path: "/admin/topology", icon: "icon-buildings", badge: "3 Cấp" },
  ];

  const clinicalOpsNav = [
    { name: "Danh Bạ Nhân Sự & Quyền", path: "/admin/users", icon: "icon-profile-2user" },
    { name: "Trình Tạo Biểu Mẫu Khám", path: "/admin/form-builder", icon: "icon-document-text", badge: "4 Tầng" },
  ];

  return (
    <div className="flex h-screen bg-white font-sans antialiased overflow-hidden">
      {/* Sidebar (Uber Base Standard with Categorized Domains) */}
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
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="hidden h-10 px-3 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold items-center text-sm">
                DrMayDay Admin
              </div>
            </Link>
          </div>

          <div className="p-3 space-y-5">
            {/* 1. Tổng quan */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Tổng quan &amp; Điều hành
              </div>
              <nav className="space-y-1">
                {overviewNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin"}
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

            {/* 2. Hạ tầng tổ chức */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Cơ cấu tổ chức y tế
              </div>
              <nav className="space-y-1">
                {organizationNav.map((item) => (
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
                    {item.badge && (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[var(--base-brand-blue)]">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* 3. Nghiệp vụ chuyên môn */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Nghiệp vụ lâm sàng &amp; Dữ liệu
              </div>
              <nav className="space-y-1">
                {clinicalOpsNav.map((item) => (
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
                    {item.badge && (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[var(--base-brand-blue)]">
                        {item.badge}
                      </span>
                    )}
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
            <span className="font-semibold text-gray-900">Bệnh viện Da liễu Trung ương</span>
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
              <span>Bác Sĩ</span>
            </Link>
            <Link
              to="/patient"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang phân hệ Bệnh nhân"
            >
              <span className="isax icon-home-2 text-xs"></span>
              <span>Bệnh Nhân</span>
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
