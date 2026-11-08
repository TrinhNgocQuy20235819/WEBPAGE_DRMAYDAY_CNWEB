import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [diaryDropdownOpen, setDiaryDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Đã đăng xuất tài khoản bệnh nhân");
    navigate("/login");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDiaryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDiaryDropdownOpen(false);
  }, [location.pathname]);

  const isDiaryActive =
    location.pathname === "/patient/uas7" || location.pathname === "/patient/lesions";

  return (
    <div className="min-h-screen bg-[var(--base-bg-canvas)] flex flex-col font-sans antialiased text-gray-900">
      {/* Top Header Navbar - Grouped & Prioritized */}
      <header className="bg-white border-b border-[var(--base-border-opaque)] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* 1. Left: Brand Logo & Institutional Identifier */}
          <div className="flex items-center gap-6 shrink-0">
            <Link to="/patient" className="flex items-center gap-3">
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
                DrMayDay
              </div>
            </Link>

            {/* Sub-label for Hospital */}
            <div className="hidden xl:block pl-4 border-l border-[var(--base-border-opaque)] text-[11px] text-[var(--base-content-secondary)] leading-tight">
              <div className="font-semibold text-[var(--base-content-primary)]">Cổng Bệnh Nhân Ngoại Trú</div>
              <div>Bệnh viện Da liễu Trung ương</div>
            </div>
          </div>

          {/* 2. Middle: Categorized & Grouped Primary Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {/* Nhóm 1: Trang chủ */}
            <NavLink
              to="/patient"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[rgba(59,99,168,0.10)] text-[var(--base-brand-navy)] font-bold border-b-2 border-[var(--base-brand-blue)]"
                    : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                }`
              }
            >
              <span className="isax icon-home-2 text-base"></span>
              <span>Trang Chủ</span>
            </NavLink>

            {/* Nhóm 2: Nhật ký lâm sàng (Grouped Dropdown: UAS7 + Ảnh tổn thương) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDiaryDropdownOpen(!diaryDropdownOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isDiaryActive
                    ? "bg-[rgba(59,99,168,0.10)] text-[var(--base-brand-navy)] font-bold border-b-2 border-[var(--base-brand-blue)]"
                    : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                }`}
              >
                <span className="isax icon-document-text text-base"></span>
                <span>Nhật Ký Điều Trị</span>
                <span
                  className={`isax icon-arrow-down-1 text-xs transition-transform duration-200 ${
                    diaryDropdownOpen ? "rotate-180" : ""
                  }`}
                ></span>
              </button>

              {/* Dropdown Menu */}
              {diaryDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-[var(--base-border-opaque)] p-2 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--base-content-disabled)]">
                    Phân nhóm theo dõi bệnh
                  </div>

                  <Link
                    to="/patient/uas7"
                    onClick={() => setDiaryDropdownOpen(false)}
                    className={`flex items-start gap-3 p-2.5 rounded-lg text-xs transition-colors ${
                      location.pathname === "/patient/uas7"
                        ? "bg-[rgba(59,99,168,0.08)] text-[var(--base-brand-navy)] font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-[var(--base-brand-blue)] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="isax icon-chart-21 text-base"></span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Chấm Điểm UAS7 &amp; AAS7</div>
                      <div className="text-[11px] text-gray-500 font-normal">
                        Ghi nhận nốt sẩn &amp; mức độ ngứa 24 giờ
                      </div>
                    </div>
                  </Link>

                  <Link
                    to="/patient/lesions"
                    onClick={() => setDiaryDropdownOpen(false)}
                    className={`flex items-start gap-3 p-2.5 rounded-lg text-xs transition-colors mt-1 ${
                      location.pathname === "/patient/lesions"
                        ? "bg-[rgba(59,99,168,0.08)] text-[var(--base-brand-navy)] font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="isax icon-camera text-base"></span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Kho Ảnh Tổn Thương 3 Mốc</div>
                      <div className="text-[11px] text-gray-500 font-normal">
                        Khởi phát → Đỉnh điểm → Thuyên giảm
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Nhóm 3: Sổ y bạ điện tử */}
            <NavLink
              to="/patient/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[rgba(59,99,168,0.10)] text-[var(--base-brand-navy)] font-bold border-b-2 border-[var(--base-brand-blue)]"
                    : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                }`
              }
            >
              <span className="isax icon-user text-base"></span>
              <span>Sổ Y Bạ &amp; BHYT</span>
            </NavLink>
          </nav>

          {/* 3. Right: Emergency Screening Button + User Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dedicated Emergency Action Pill (Tách biệt khỏi navigation thường) */}
            <Link
              to="/patient/screening"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold shadow-2xs group"
              title="Kích hoạt tự sàng lọc phản vệ trong 30 giây"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 group-hover:bg-white"></span>
              </span>
              <span className="isax-b icon-danger text-sm"></span>
              <span className="hidden sm:inline">Báo Động Đỏ (&lt;30s)</span>
            </Link>

            {/* Switch to Doctor */}
            <Link
              to="/doctor"
              className="base-btn base-btn-secondary base-btn-compact text-xs"
              title="Xem giao diện Bác sĩ"
            >
              <span className="isax icon-health text-xs"></span>
              <span className="hidden lg:inline">Bác sĩ</span>
            </Link>

            {/* User Profile Mini */}
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[var(--base-border-opaque)]">
              <div className="h-8 w-8 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs">
                M
              </div>
              <div className="text-left text-xs leading-none">
                <p className="font-bold text-[var(--base-content-primary)] truncate max-w-[100px]">Nguyễn Thị Mai</p>
                <span className="text-[9px] text-[var(--base-content-secondary)]">Bệnh nhân</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--base-negative-primary)] hover:bg-[var(--base-negative-tint)] transition cursor-pointer"
              title="Đăng xuất"
            >
              <span className="isax icon-logout text-base"></span>
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center border border-[var(--base-border-opaque)] text-gray-700 hover:bg-gray-100"
            >
              <span className={`isax ${mobileMenuOpen ? "icon-close-circle" : "icon-menu"} text-lg`}></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--base-border-opaque)] bg-white px-4 py-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Danh mục chức năng</div>
            <div className="space-y-1">
              <Link
                to="/patient"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span className="isax icon-home-2 text-base text-[var(--base-brand-blue)]"></span>
                <span>Trang Chủ</span>
              </Link>
              <Link
                to="/patient/uas7"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span className="isax icon-chart-21 text-base text-[var(--base-brand-blue)]"></span>
                <span>Chấm Điểm UAS7 &amp; AAS7</span>
              </Link>
              <Link
                to="/patient/lesions"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span className="isax icon-camera text-base text-[var(--base-brand-blue)]"></span>
                <span>Kho Ảnh Tổn Thương 3 Mốc</span>
              </Link>
              <Link
                to="/patient/profile"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span className="isax icon-user text-base text-[var(--base-brand-blue)]"></span>
                <span>Sổ Y Bạ Điện Tử &amp; BHYT</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Link
                to="/patient/screening"
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs"
              >
                <span className="isax-b icon-danger text-base"></span>
                <span>Sàng Lọc Báo Động Đỏ (&lt;30s)</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Standard Medical Institutional Footer */}
      <footer className="bg-white border-t border-[var(--base-border-opaque)] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--base-content-secondary)]">
          <div className="flex items-center gap-2">
            <span className="isax icon-shield-tick text-base text-[var(--base-positive-primary)]"></span>
            <span>Hệ Thống Quản Lý Bệnh Mày Đay DrMayDay • BV Da liễu Trung ương</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Đường dây nóng cấp cứu: <strong className="text-rose-600 font-mono">115</strong></span>
            <span>•</span>
            <span>Tư vấn lâm sàng: <strong>1900 6951</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
