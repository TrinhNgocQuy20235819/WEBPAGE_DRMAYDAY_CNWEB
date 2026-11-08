import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

export default function LoginPage() {
  const [phone, setPhone] = useState("0912 345 678");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, "").trim();
    if (!cleanPhone || !password) {
      toast.error("Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post("/auth/login", {
        phone: cleanPhone,
        password,
      });
      const { token, user } = res.data || {};
      const mappedRole =
        user?.role_name === "admin"
          ? "admin"
          : user?.role_name === "bac_si" || user?.role_name === "dieu_duong"
          ? "doctor"
          : "patient";

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          role: mappedRole,
        })
      );
      toast.success(`Xin chào ${user?.full_name || cleanPhone}!`);

      if (mappedRole === "admin") navigate("/admin");
      else if (mappedRole === "doctor") navigate("/doctor");
      else navigate("/patient");
    } catch {
      // Error toast already handled by apiClient interceptor
    } finally {
      setSubmitting(false);
    }
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
        <h2 className="text-2xl font-bold text-[var(--base-brand-navy)] tracking-tight">Đăng nhập</h2>
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
            Số điện thoại
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
            Mật khẩu
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
          <div className="flex justify-end mt-2">
            <Link
              to="/forgot-password"
              className="text-xs text-[var(--base-brand-blue)] hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="base-btn base-btn-primary w-full py-3 text-sm font-bold shadow-sm justify-center cursor-pointer mt-2 disabled:opacity-60"
        >
          <span>{submitting ? "Đang xác thực..." : "Đăng nhập"}</span>
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
