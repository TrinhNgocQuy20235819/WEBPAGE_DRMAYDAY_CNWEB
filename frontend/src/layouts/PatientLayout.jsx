import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../services/apiClient";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
}

function formatNotifTime(iso) {
  if (!iso) return "Vừa xong";
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  const handleLogout = async () => {
    await apiClient.post("/auth/logout").catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    toast.success("Đã đăng xuất tài khoản bệnh nhân");
    navigate("/login");
  };

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/notifications")
      .then((res) => {
        if (cancelled) return;
        const items = (res.data?.items || []).map((n) => ({
          id: n.id,
          title: n.title,
          desc: n.message,
          time: formatNotifTime(n.created_at),
          unread: !n.is_read,
          icon:
            n.type === "UAS7"
              ? "icon-clock"
              : n.type === "PRESCRIPTION" || n.type === "VISIT_COMPLETED"
              ? "icon-health"
              : "icon-notification",
          link:
            n.type === "UAS7"
              ? "/patient/uas7"
              : n.type === "LESION"
              ? "/patient/lesions"
              : "/patient/profile",
        }));
        setNotifications(items);
        setUnreadCount(Number(res.data?.unread_count || 0));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    await apiClient.put("/notifications/read-all").catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    toast.success("Đã đánh dấu đọc tất cả thông báo");
    setNotifDropdownOpen(false);
  };

  const handleClickNotif = (n) => {
    if (n.unread) {
      apiClient.put(`/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifDropdownOpen(false);
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
    { name: "Trang Chủ Điều Trị", path: "/patient", icon: "icon-home-2" },
  ];

  const diaryNav = [
    { name: "Chấm Điểm UAS7 & AAS7", path: "/patient/uas7", icon: "icon-chart-21" },
    { name: "Kho Ảnh Tổn Thương 3 Mốc", path: "/patient/lesions", icon: "icon-camera" },
    { name: "Khảo Sát Lâm Sàng", path: "/patient/screening", icon: "icon-clipboard-text" },
  ];

  const medicalRecordNav = [
    { name: "Sổ Y Bạ & Thẻ BHYT", path: "/patient/profile", icon: "icon-user" },
  ];

  const emergencyNav = [
    {
      name: "Sàng Lọc Báo Động",
      path: "/emergency-triage",
      icon: "icon-danger",
      isEmergency: true,
    },
  ];

  return (
    <div className="flex h-screen bg-white font-sans antialiased overflow-hidden">
      {/* Sidebar Bệnh Nhân (Đồng bộ cấu trúc cột đứng 280px) */}
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
                      `base-sidebar-link-danger ${isActive ? "is-active" : ""}`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="isax-b icon-danger text-base text-rose-600 animate-pulse"></span>
                      <span>{item.name}</span>
                    </div>
                    <span className="h-5 min-w-[20px] px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      !
                    </span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Hotline Hỗ Trợ 24/7 */}
        <div className="p-3.5 border-t border-[var(--base-border-opaque)] bg-gray-50/80 text-[11px] text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="isax icon-call text-base text-[var(--base-brand-blue)]"></span>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Tổng đài y tế</div>
              <strong className="text-gray-800 font-mono text-xs">1900 6951</strong>
            </div>
          </div>
          <span className="base-tag base-tag-positive text-[9px] font-bold">24/7</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header (Thanh điều hướng trên cùng chuẩn production - Không nút tiện ích) */}
        <header className="h-16 border-b border-[var(--base-border-opaque)] bg-white px-6 flex items-center justify-between shrink-0 z-30">
          {/* Institutional Identifier */}
          <div className="flex items-center gap-2.5 text-xs text-[var(--base-content-secondary)]">
            <span className="isax icon-hospital text-base text-[var(--base-brand-blue)]"></span>
            <span className="font-bold text-gray-900 text-sm">Bệnh viện Da liễu Trung ương</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-[var(--base-content-secondary)]">Cổng Bệnh Nhân Ngoại Trú (DrMayDay)</span>
          </div>

          {/* Right Header Actions: Notifications & Account Dropdown */}
          <div className="flex items-center gap-3">
            {/* 1. Notifications Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="h-9 w-9 rounded-xl border border-[var(--base-border-opaque)] hover:bg-gray-50 flex items-center justify-center text-gray-600 transition cursor-pointer relative"
                title="Thông báo"
              >
                <span className="isax icon-notification text-lg"></span>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[var(--base-border-opaque)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-3.5 border-b border-[var(--base-border-opaque)] flex items-center justify-between bg-gray-50/70">
                    <div className="text-xs font-bold text-gray-900 uppercase tracking-tight">Thông Báo Lâm Sàng</div>
                    <span className="base-tag base-tag-info text-[9px] font-mono font-bold">{unreadCount} mới</span>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-xs text-gray-400">Chưa có thông báo mới</div>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.link}
                          onClick={() => handleClickNotif(n)}
                          className={`p-3.5 flex items-start gap-3 hover:bg-gray-50 transition block ${
                            n.unread ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-100/70 text-[var(--base-brand-blue)] flex items-center justify-center shrink-0 mt-0.5">
                            <span className={`isax ${n.icon} text-base`}></span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 leading-snug">{n.title}</p>
                            <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{n.desc}</p>
                            <span className="text-[10px] text-gray-400 mt-1 block font-mono">{n.time}</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-[var(--base-border-opaque)] bg-gray-50 text-center">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-[var(--base-brand-blue)] hover:underline cursor-pointer"
                    >
                      Đánh dấu đã đọc tất cả
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. User Account Drop Box */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-[var(--base-border-opaque)] hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                  {(currentUser.full_name || "BN").trim().split(" ").pop()?.[0]?.toUpperCase() || "B"}
                </div>
                <div className="text-left text-xs leading-none hidden sm:block">
                  <p className="font-bold text-gray-900">{currentUser.full_name || "Bệnh nhân"}</p>
                  <span className="text-[10px] text-gray-400">Bệnh nhân</span>
                </div>
                <span
                  className={`isax icon-arrow-down-1 text-xs text-gray-400 transition-transform duration-200 ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                ></span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[var(--base-border-opaque)] p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* User Profile Mini Header */}
                  <div className="p-3 bg-gray-50 rounded-lg mb-1">
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      {currentUser.full_name || "Bệnh nhân"}
                    </p>
                    <span className="base-role-badge base-role-badge-patient text-[9px] mt-1 inline-block">
                      Bệnh nhân ngoại trú
                    </span>
                    <p className="text-[11px] font-mono text-gray-500 mt-1">{currentUser.phone || ""}</p>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/patient/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-user text-base text-[var(--base-brand-blue)]"></span>
                      <span>Hồ sơ bệnh nhân &amp; BHYT</span>
                    </Link>

                    <Link
                      to="/patient/uas7"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-chart text-base text-[var(--base-brand-blue)]"></span>
                      <span>Nhật ký hoạt tính bệnh</span>
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-[var(--base-border-opaque)]"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                  >
                    <span className="isax icon-logout text-base"></span>
                    <span>Đăng Xuất Tài Khoản</span>
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
