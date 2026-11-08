import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function DoctorLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Đã đăng xuất phiên làm việc của Bác sĩ");
    navigate("/login");
  };

  const navItems = [
    { name: "Hàng Đợi Ca Khám (Queue)", path: "/doctor", icon: "icon-clock" },
    { name: "Khám & Kê Đơn Điện Tử", path: "/doctor/prescriptions", icon: "icon-health" },
    { name: "Đối Chiếu Ảnh Tổn Thương", path: "/doctor/lesions", icon: "icon-camera" },
  ];

  return (
    <div className="flex h-screen bg-white font-sans antialiased overflow-hidden">
      {/* Sidebar Bác Sĩ (Uber Base White Canvas) */}
      <aside className="w-[280px] bg-white border-r border-[var(--base-border-opaque)] flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
            <Link to="/doctor" className="flex items-center gap-3">
              <img
                src="/images/logo/drmayday-logo.png"
                alt="DrMayDay - Bác sĩ Lâm sàng"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-10 px-3 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold items-center text-sm">
                DrMayDay Doctor
              </div>
            </Link>
          </div>

          <div className="px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
            Phân hệ Bác sĩ
          </div>

          <nav className="px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/doctor"}
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

        {/* Doctor Info & Logout */}
        <div className="p-4 border-t border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-[var(--base-brand-blue)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                BS
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--base-content-primary)] truncate">TS.BS. Nguyễn Văn Hùng</p>
                <span className="base-role-badge base-role-badge-doctor text-[9px]">Bác sĩ phụ trách</span>
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
        <header className="h-16 border-b border-[var(--base-border-opaque)] bg-white px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 text-xs text-[var(--base-content-secondary)]">
            <span className="isax icon-health text-sm text-[var(--base-brand-blue)]"></span>
            <span className="font-medium">Phòng Khám 302 • Chuyên Khoa Mày Đay & Miễn Dịch Da Liễu</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
            >
              <span className="isax icon-element-plus text-xs"></span>
              <span>Cổng Quản Trị</span>
            </Link>
            <Link
              to="/patient"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
            >
              <span className="isax icon-home-2 text-xs"></span>
              <span>Giao diện BN</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
