import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Đã đăng xuất tài khoản quản trị");
    navigate("/login");
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
  }, [location.pathname]);

  const overviewNav = [
    { name: "Bảng Điều Khiển Chỉ Số", path: "/admin", icon: "icon-element-plus" },
  ];

  const organizationNav = [
    { name: "Hạ Tầng Cơ Sở Y Tế", path: "/admin/topology", icon: "icon-buildings", badge: 3 },
  ];

  const clinicalOpsNav = [
    { name: "Danh Bạ Nhân Sự & Quyền", path: "/admin/users", icon: "icon-profile-2user" },
    { name: "Trình Tạo Biểu Mẫu Khám", path: "/admin/form-builder", icon: "icon-document-text", badge: 4 },
  ];

  const notifications = [
    {
      id: "a-n1",
      title: "Hạ tầng cơ sở mới được thêm",
      desc: "Phòng khám 303 đã được khởi tạo và sẵn sàng nhận phân công trực.",
      time: "30 phút trước",
      unread: true,
      icon: "icon-buildings",
      link: "/admin/topology",
    },
    {
      id: "a-n2",
      title: "Đồng bộ biểu mẫu lâm sàng",
      desc: "Phiếu khám mạn tính CSU-2026 đã được cập nhật phiên bản 2.1.",
      time: "3 giờ trước",
      unread: false,
      icon: "icon-document-text",
      link: "/admin/form-builder",
    },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans antialiased overflow-hidden">
      {/* Sidebar Quản Trị (Cột 280px) */}
      <aside className="w-[280px] bg-white border-r border-[var(--base-border-opaque)] flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3">
              <img
                src="/images/logo/drmayday-logo.png"
                alt="DrMayDay - Quản Trị Hệ Thống"
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
                      `base-sidebar-link ${isActive ? "is-active" : ""}`
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
                      `base-sidebar-link ${isActive ? "is-active" : ""}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`isax ${item.icon} text-base`}></span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="base-nav-badge">
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
                      `base-sidebar-link ${isActive ? "is-active" : ""}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`isax ${item.icon} text-base`}></span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="base-nav-badge">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Phiên Bản Hệ Thống */}
        <div className="p-3.5 border-t border-[var(--base-border-opaque)] bg-gray-50/80 text-[11px] text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="isax icon-shield-tick text-base text-[var(--base-brand-blue)]"></span>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Hệ thống</div>
              <strong className="text-gray-800 text-xs">DrMayDay Core v2.4</strong>
            </div>
          </div>
          <span className="base-tag base-tag-positive text-[9px] font-bold">Chuẩn Bộ</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header (Không nút switcher tiện ích) */}
        <header className="h-16 border-b border-[var(--base-border-opaque)] bg-white px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2.5 text-xs text-[var(--base-content-secondary)]">
            <span className="isax icon-hospital text-base text-[var(--base-brand-blue)]"></span>
            <span className="font-bold text-gray-900 text-sm">Bệnh viện Da liễu Trung ương</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-[var(--base-content-secondary)]">Cổng Quản Trị Hệ Thống DrMayDay</span>
          </div>

          {/* Right Actions: Notifications & Admin Dropdown */}
          <div className="flex items-center gap-3">
            {/* 1. Notifications Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="h-9 w-9 rounded-xl border border-[var(--base-border-opaque)] hover:bg-gray-50 flex items-center justify-center text-gray-600 transition cursor-pointer relative"
                title="Thông báo quản trị"
              >
                <span className="isax icon-notification text-lg"></span>
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[var(--base-border-opaque)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-3.5 border-b border-[var(--base-border-opaque)] flex items-center justify-between bg-gray-50/70">
                    <div className="text-xs font-bold text-gray-900 uppercase tracking-tight">Thông Báo Quản Trị</div>
                    <span className="base-tag base-tag-info text-[9px] font-mono font-bold">1 mới</span>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        to={n.link}
                        onClick={() => setNotifDropdownOpen(false)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-gray-50 transition block ${
                          n.unread ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <div className="h-8 w-8 rounded-lg bg-blue-100 text-[var(--base-brand-blue)] flex items-center justify-center shrink-0 mt-0.5">
                          <span className={`isax ${n.icon} text-base`}></span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 leading-snug">{n.title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{n.desc}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block font-mono">{n.time}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="p-2 border-t border-[var(--base-border-opaque)] bg-gray-50 text-center">
                    <button
                      onClick={() => {
                        toast.success("Đã ghi nhận toàn bộ thông báo hệ thống");
                        setNotifDropdownOpen(false);
                      }}
                      className="text-[11px] font-semibold text-[var(--base-brand-blue)] hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Admin Drop Box */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-[var(--base-border-opaque)] hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                  AD
                </div>
                <div className="text-left text-xs leading-none hidden sm:block">
                  <p className="font-bold text-gray-900">Quản Trị Viên</p>
                  <span className="text-[10px] text-gray-400">System Admin</span>
                </div>
                <span
                  className={`isax icon-arrow-down-1 text-xs text-gray-400 transition-transform duration-200 ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                ></span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[var(--base-border-opaque)] p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-3 bg-gray-50 rounded-lg mb-1">
                    <p className="text-xs font-bold text-gray-900 leading-snug">Quản Trị Hệ Thống</p>
                    <span className="base-role-badge base-role-badge-admin text-[9px] mt-1 inline-block">
                      Super Administrator
                    </span>
                    <p className="text-[11px] font-mono text-gray-500 mt-1">admin@dalieu.gov.vn</p>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-element-plus text-base text-[var(--base-brand-blue)]"></span>
                      <span>Bảng điều khiển quản trị</span>
                    </Link>

                    <Link
                      to="/admin/users"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-profile-2user text-base text-[var(--base-brand-blue)]"></span>
                      <span>Quản lý phân quyền &amp; Nhân sự</span>
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-[var(--base-border-opaque)]"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                  >
                    <span className="isax icon-logout text-base"></span>
                    <span>Đăng Xuất Khỏi Hệ Thống</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
