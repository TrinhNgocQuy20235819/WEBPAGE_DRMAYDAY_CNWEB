import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Vui lòng nhập số điện thoại!");
      return;
    }
    toast.success("Mã OTP đã được gửi về số điện thoại của bạn!");
    setStep(2);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      toast.error("Vui lòng nhập mã OTP và mật khẩu mới!");
      return;
    }
    toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <div className="lg:hidden flex items-center gap-3 mb-6">
        <img
          src="/images/logo/drmayday-logo.png"
          alt="DrMayDay"
          className="h-10 w-auto object-contain"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--base-brand-navy)] tracking-tight">
          {step === 1 ? "Khôi phục mật khẩu" : "Đặt lại mật khẩu"}
        </h2>
        <p className="text-xs text-[var(--base-content-secondary)] mt-1">
          {step === 1
            ? "Nhập số điện thoại đã đăng ký để nhận mã OTP xác thực"
            : "Nhập mã OTP 6 số và mật khẩu mới của bạn"}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
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

          <button
            type="submit"
            className="base-btn base-btn-primary w-full py-3 text-sm font-bold shadow-sm justify-center cursor-pointer mt-2"
          >
            <span>Tiếp tục</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
              Mã xác thực OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã 6 chữ số"
              className="base-input text-sm font-mono text-center tracking-widest"
              required
            />
          </div>

          <div>
            <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="base-input text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="base-btn base-btn-primary w-full py-3 text-sm font-bold shadow-sm justify-center cursor-pointer mt-2"
          >
            <span>Xác nhận đổi mật khẩu</span>
          </button>
        </form>
      )}

      <div className="pt-4 border-t border-[var(--base-border-opaque)] text-center text-xs text-[var(--base-content-secondary)]">
        <Link to="/login" className="text-[var(--base-brand-blue)] font-bold hover:underline flex items-center justify-center gap-1.5">
          <span className="isax icon-arrow-left-2 text-xs"></span>
          <span>Quay lại Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}
