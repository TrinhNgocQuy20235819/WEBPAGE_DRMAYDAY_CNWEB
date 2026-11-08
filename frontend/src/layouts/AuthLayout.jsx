import { Outlet, useLocation } from "react-router-dom";

export default function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname.includes("register");

  return (
    <div className="min-h-screen flex bg-white font-sans antialiased">
      {/* Left Column: High-contrast Dark Clinical Branding */}
      <div
        className={`hidden lg:flex ${
          isRegister ? "lg:w-5/12" : "lg:w-1/2"
        } min-h-screen bg-[var(--base-gray-900)] flex-col justify-between p-12 text-white relative overflow-hidden border-r border-[var(--base-gray-800)] shrink-0 sticky top-0 h-screen`}
      >
        {/* Clinical Photography Background with Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="/images/clinic/clinic-consultation-01.jpg"
            alt="Bác sĩ khám lâm sàng DrMayDay"
            className="w-full h-full object-cover object-center opacity-30 filter brightness-90 contrast-105"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--base-gray-950)] via-[rgba(9,30,66,0.85)] to-[rgba(9,31,91,0.92)]"></div>
        </div>

        {/* Top: Institution Logo & Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/images/logo/drmayday-logo-white.png"
              alt="DrMayDay - BV Da liễu Trung ương"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
            <div className="hidden font-bold text-2xl text-white">DrMayDay</div>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Hệ Thống Quản Lý<br />Lâm Sàng Mày Đay
          </h1>
          <p className="text-sm text-gray-300 max-w-md leading-relaxed">
            Nền tảng số hóa toàn trình: Sàng lọc phản vệ khẩn cấp, theo dõi thang điểm quốc tế UAS7, lưu trữ hồ sơ bệnh án điện tử và hỗ trợ bác sĩ ra quyết định điều trị.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10">
              <span className="isax icon-security-user text-base"></span>
            </div>
            <span className="text-xs font-medium text-gray-200">Phân quyền chuyên môn 3 cấp (Quản trị, Bác sĩ, Người bệnh)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10">
              <span className="isax icon-chart-21 text-base"></span>
            </div>
            <span className="text-xs font-medium text-gray-200">Chuẩn hóa thang điểm UAS7 và biểu đồ tiến triển 7 ngày</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10">
              <span className="isax icon-camera text-base"></span>
            </div>
            <span className="text-xs font-medium text-gray-200">Kho ảnh tổn thương da 3 giai đoạn (Khởi phát, Đỉnh điểm, Thuyên giảm)</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-gray-400">
          Đề tài Nghiên cứu Khoa học Công nghệ Cấp Bộ • Bệnh viện Da liễu Trung ương
        </div>
      </div>

      {/* Right Column: Auth Form with graceful scrolling */}
      <div className="flex-1 min-h-screen flex flex-col items-center justify-start p-6 sm:p-12 overflow-y-auto bg-white">
        <div className={`w-full my-auto ${isRegister ? "max-w-2xl py-8" : "max-w-md py-6"}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
