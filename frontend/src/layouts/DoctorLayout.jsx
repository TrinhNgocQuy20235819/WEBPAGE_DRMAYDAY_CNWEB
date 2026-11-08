import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../services/mockData";

export default function DoctorLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Đã đăng xuất phiên làm việc của Bác sĩ");
    navigate("/login");
  };

  const pendingCount = INITIAL_RECORDS.filter((r) => r.status === "pending").length;

  const clinicalNav = [
    {
      name: "Hàng Đợi Khám Bệnh",
      path: "/doctor",
      icon: "icon-clock",
      badge: `${pendingCount} chờ`,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      name: "Thăm Khám & Kê Đơn",
      path: "/doctor/prescriptions",
      icon: "icon-health",
    },
  ];

  const diagnosticNav = [
    {
      name: "Đối Chiếu Ảnh Tổn Thương",
      path: "/doctor/lesions",
      icon: "icon-camera",
    },
  ];

  return (
    <div className="flex h-screen bg-white font-sans antialiased overflow-hidden">
      {/* Sidebar Bác Sĩ (Uber Base White Canvas with Grouped Categories) */}
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
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="hidden h-10 px-3 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold items-center text-sm">
                DrMayDay Doctor
              </div>
            </Link>
          </div>

          <div className="p-3 space-y-5">
            {/* Group 1: Khám chữa bệnh */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Lâm sàng &amp; Khám bệnh
              </div>
              <nav className="space-y-1">
                {clinicalNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/doctor"}
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
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Group 2: Chẩn đoán & Tư liệu */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                Tư liệu lâm sàng
              </div>
              <nav className="space-y-1">
                {diagnosticNav.map((item) => (
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
          </div>
        </div>

        {/* Doctor Info & Logout Footer */}
        <div className="p-4 border-t border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-[var(--base-brand-blue)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                BS
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--base-content-primary)] truncate">TS.BS. Nguyễn Văn Hùng</p>
                <span className="base-role-badge base-role-badge-doctor text-[9px]">Khoa Miễn Dịch Da Liễu</span>
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
        {/* Top Clinician Header */}
        <header className="h-16 border-b border-[var(--base-border-opaque)] bg-white px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 text-xs text-[var(--base-content-secondary)]">
            <span className="isax icon-health text-sm text-[var(--base-brand-blue)]"></span>
            <span className="font-semibold text-gray-900">Phòng Khám 302</span>
            <span>•</span>
            <span>Chuyên Khoa Mày Đay &amp; Miễn Dịch Lâm Sàng</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang Cổng Quản Trị"
            >
              <span className="isax icon-element-plus text-xs"></span>
              <span>Quản Trị</span>
            </Link>
            <Link
              to="/patient"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Chuyển sang Cổng Bệnh Nhân"
            >
              <span className="isax icon-home-2 text-xs"></span>
              <span>Bệnh Nhân</span>
            </Link>
          </div>
        </header>

        {/* Clinician Compact Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
