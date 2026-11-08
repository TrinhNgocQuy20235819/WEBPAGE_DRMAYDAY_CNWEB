import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bhyt, setBhyt] = useState("");
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (!fullName || !phone || !password) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }
    toast.success("Đăng ký hồ sơ bệnh nhân thành công! Vui lòng đăng nhập.");
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <div className="lg:hidden flex items-center gap-3 mb-6">
        <img src="/images/logo/drmayday-logo.png" alt="DrMayDay" className="h-10 w-auto object-contain" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--base-brand-navy)] tracking-tight">Đăng Ký Hồ Sơ Khám</h2>
        <p className="text-xs text-[var(--base-content-secondary)] mt-1">
          Khởi tạo hồ sơ bệnh án điện tử tại Bệnh viện Da liễu Trung ương
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Họ và tên bệnh nhân *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="VD: Nguyễn Thị Mai"
            className="base-input text-xs"
            required
          />
        </div>

        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Số điện thoại liên hệ *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="VD: 0912 345 678"
            className="base-input text-xs font-mono"
            required
          />
        </div>

        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Số thẻ BHYT (nếu có)
          </label>
          <input
            type="text"
            value={bhyt}
            onChange={(e) => setBhyt(e.target.value)}
            placeholder="VD: DN4010123456789"
            className="base-input text-xs font-mono uppercase"
          />
        </div>

        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Mật khẩu khởi tạo *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="base-input text-xs"
            required
          />
        </div>

        <button
          type="submit"
          className="base-btn base-btn-primary w-full py-3 text-sm font-bold shadow-sm justify-center cursor-pointer mt-2"
        >
          <span className="isax icon-user-add text-base"></span>
          <span>Đăng Ký Tài Khoản Bệnh Nhân</span>
        </button>
      </form>

      <div className="pt-4 border-t border-[var(--base-border-opaque)] text-center text-xs text-[var(--base-content-secondary)]">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-[var(--base-brand-blue)] font-bold hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
