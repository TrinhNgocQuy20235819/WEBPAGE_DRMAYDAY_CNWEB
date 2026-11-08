import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [phone, setPhone] = useState("0912 345 678");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu!");
      return;
    }

    localStorage.setItem("token", "mock-jwt-token-production-standard");
    localStorage.setItem(
      "user",
      JSON.stringify({
        phone,
        role,
        full_name: role === "admin" ? "Quản Trị Viên" : role === "doctor" ? "TS.BS. Nguyễn Văn Hùng" : "Nguyễn Thị Mai",
      })
    );
    toast.success(`Đăng nhập thành công với vai trò ${role.toUpperCase()}`);

    if (role === "admin") navigate("/admin");
    else if (role === "doctor") navigate("/doctor");
    else navigate("/patient");
  };

  return (
    <div className="space-y-6">
      {/* Mobile Branding Header */}
      <div className="lg:hidden flex items-center gap-3 mb-6">
        <img
          src="/images/logo/drmayday-logo.png"
          alt="DrMayDay"
          className="h-10 w-auto object-contain"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--base-brand-navy)] tracking-tight">Đăng Nhập Hệ Thống</h2>
        <p className="text-xs text-[var(--base-content-secondary)] mt-1">
          Nhập số điện thoại bệnh nhân hoặc mã nhân viên y tế để truy cập
        </p>
      </div>

      {/* Role Selector Pill Tabs for easy demo */}
      <div className="p-1 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => {
            setRole("patient");
            setPhone("0912 345 678");
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            role === "patient"
              ? "bg-white text-[var(--base-brand-navy)] shadow-xs border border-[var(--base-border-opaque)]"
              : "text-[var(--base-content-secondary)] hover:text-gray-900"
          }`}
        >
          <span className="isax icon-user text-sm"></span>
          <span>Bệnh Nhân</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRole("doctor");
            setPhone("0988 765 432");
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            role === "doctor"
              ? "bg-white text-[var(--base-brand-navy)] shadow-xs border border-[var(--base-border-opaque)]"
              : "text-[var(--base-content-secondary)] hover:text-gray-900"
          }`}
        >
          <span className="isax icon-health text-sm"></span>
          <span>Bác Sĩ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRole("admin");
            setPhone("0903 000 999");
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            role === "admin"
              ? "bg-white text-[var(--base-brand-navy)] shadow-xs border border-[var(--base-border-opaque)]"
              : "text-[var(--base-content-secondary)] hover:text-gray-900"
          }`}
        >
          <span className="isax icon-shield-tick text-sm"></span>
          <span>Quản Trị</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Số Điện Thoại / Mã Định Danh
          </label>
          <div className="relative">
            <span className="isax icon-call text-base absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--base-content-tertiary)]"></span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912 345 678"
              className="base-input !pl-10 text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Mật Khẩu
          </label>
          <div className="relative">
            <span className="isax icon-lock text-base absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--base-content-tertiary)]"></span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="base-input !pl-10 !pr-10 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--base-content-tertiary)] hover:text-gray-900 cursor-pointer"
            >
              <span className={`isax ${showPassword ? "icon-eye" : "icon-eye-slash"} text-base`}></span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="base-btn base-btn-primary w-full py-3 text-sm font-bold shadow-sm justify-center cursor-pointer mt-2"
        >
          <span className="isax icon-login-1 text-base"></span>
          <span>Đăng Nhập Vào Hệ Thống</span>
        </button>
      </form>

      <div className="pt-4 border-t border-[var(--base-border-opaque)] text-center text-xs text-[var(--base-content-secondary)]">
        Chưa có hồ sơ bệnh nhân?{" "}
        <Link to="/register" className="text-[var(--base-brand-blue)] font-bold hover:underline">
          Đăng ký hồ sơ khám mới
        </Link>
      </div>
    </div>
  );
}
