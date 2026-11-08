import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const navigate = useNavigate();

  // Mode: 'first_time' or 'has_his'
  const [regMode, setRegMode] = useState("first_time");
  const [hisCodeInput, setHisCodeInput] = useState("");
  const [hisFound, setHisFound] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("1995");
  const [gender, setGender] = useState("female");
  const [heightCm, setHeightCm] = useState("162");
  const [weightKg, setWeightKg] = useState("54");
  const [career, setCareer] = useState("Nhân viên văn phòng");
  const [bhyt, setBhyt] = useState("");
  const [address, setAddress] = useState("Hà Nội");

  // Passwords
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Terms & Submission
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // BMI Calculation (Chuẩn WHO cho người Châu Á)
  const heightVal = parseFloat(heightCm);
  const weightVal = parseFloat(weightKg);
  const bmiValue =
    heightVal > 0 && weightVal > 0
      ? Math.round((weightVal / ((heightVal / 100) * (heightVal / 100))) * 10) / 10
      : 0;

  const getBmiClassification = (v) => {
    if (v === 0) return { label: "Chưa đủ dữ liệu", tagClass: "base-tag-neutral" };
    if (v < 18.5) return { label: "Thiếu cân (BMI < 18.5)", tagClass: "base-tag-warning" };
    if (v < 23.0) return { label: "Bình thường (BMI 18.5 - 22.9)", tagClass: "base-tag-positive" };
    if (v < 25.0) return { label: "Thừa cân / Tiền béo phì (BMI 23 - 24.9)", tagClass: "base-tag-warning" };
    return { label: "Béo phì (BMI ≥ 25.0)", tagClass: "base-tag-negative" };
  };

  const bmiClassification = getBmiClassification(bmiValue);

  // Handle HIS Lookup
  const handleLookupHis = () => {
    if (!hisCodeInput.trim()) {
      toast.error("Vui lòng nhập mã bệnh nhân HIS!");
      return;
    }
    setFullName("Nguyễn Thị Mai");
    setPhone("0988 776 655");
    setYearOfBirth("1995");
    setGender("female");
    setHeightCm("162");
    setWeightKg("54");
    setCareer("Nhân viên văn phòng");
    setBhyt("DN4010120894567");
    setAddress("Phường Phương Mai, Quận Đống Đa, Hà Nội");
    setHisFound(true);
    toast.success("Đã tìm thấy thông tin bệnh nhân trên hệ thống HIS!");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phone) {
      toast.error("Vui lòng điền Họ và tên và Số điện thoại!");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Mật khẩu phải có tối thiểu 6 ký tự!");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Xác nhận mật khẩu không trùng khớp!");
      return;
    }
    if (!agreeTerms) {
      toast.error("Vui lòng xác nhận đồng ý các điều khoản bảo mật dữ liệu y tế!");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Đăng ký hồ sơ bệnh nhân thành công! Vui lòng đăng nhập.");
      navigate("/login");
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Branding Header */}
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <img
          src="/images/logo/drmayday-logo.png"
          alt="DrMayDay"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--base-brand-navy)] tracking-tight">
          Đăng Ký Hồ Sơ Khám
        </h2>
        <p className="text-xs text-[var(--base-content-secondary)] mt-1">
          Khởi tạo hồ sơ bệnh án điện tử tại Bệnh viện Da liễu Trung ương
        </p>
      </div>

      {/* Mode Selection: Lần đầu khám vs Đã từng khám */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          onClick={() => setRegMode("first_time")}
          className={`base-selection-card flex items-start gap-3 cursor-pointer transition-all ${
            regMode === "first_time" ? "is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name="regMode"
            checked={regMode === "first_time"}
            onChange={() => setRegMode("first_time")}
            className="h-4 w-4 text-[var(--base-brand-blue)] mt-1"
          />
          <div>
            <div className="text-xs font-bold text-gray-900">Lần đầu khám</div>
            <p className="text-[11px] text-gray-500">Khởi tạo hồ sơ bệnh án điện tử mới</p>
          </div>
        </label>

        <label
          onClick={() => setRegMode("has_his")}
          className={`base-selection-card flex items-start gap-3 cursor-pointer transition-all ${
            regMode === "has_his" ? "is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name="regMode"
            checked={regMode === "has_his"}
            onChange={() => setRegMode("has_his")}
            className="h-4 w-4 text-[var(--base-brand-blue)] mt-1"
          />
          <div>
            <div className="text-xs font-bold text-gray-900">Đã từng khám tại viện</div>
            <p className="text-[11px] text-gray-500">Liên kết mã bệnh nhân HIS có sẵn</p>
          </div>
        </label>
      </div>

      {/* HIS Lookup Sub-card (when has_his) */}
      {regMode === "has_his" && (
        <div className="p-4 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] space-y-3">
          <div className="flex items-center gap-2">
            <span className="isax-b icon-hospital text-base text-[var(--base-brand-blue)]"></span>
            <span className="text-xs font-bold text-gray-900">
              Đối soát mã định danh HIS bệnh viện
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Nhập mã in trên sổ khám hoặc đơn thuốc để tự động nạp thông tin cá nhân.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={hisCodeInput}
              onChange={(e) => setHisCodeInput(e.target.value)}
              placeholder="Ví dụ: DL-2026-0888"
              className="base-input font-mono uppercase text-xs flex-1"
            />
            <button
              type="button"
              onClick={handleLookupHis}
              className="base-btn base-btn-secondary shrink-0 text-xs font-bold cursor-pointer"
            >
              <span className="isax icon-search-normal-1 text-xs"></span>
              <span>Đối soát</span>
            </button>
          </div>

          {hisFound && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span className="isax-b icon-tick-circle text-base text-emerald-600"></span>
              <span>Đã nạp thông tin hồ sơ HIS của bệnh nhân: <strong>{fullName}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Demographics */}
        <div className="space-y-4 pt-2 border-t border-[var(--base-border-opaque)]">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Thông tin nhân khẩu học
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Họ và tên bệnh nhân *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Thị Mai"
                className="base-input text-xs"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Số điện thoại di động *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0988 776 655"
                className="base-input text-xs font-mono"
                required
              />
            </div>

            {/* Year of birth */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Năm sinh *
              </label>
              <input
                type="number"
                value={yearOfBirth}
                onChange={(e) => setYearOfBirth(e.target.value)}
                min="1920"
                max="2026"
                placeholder="1995"
                className="base-input text-xs font-mono"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Giới tính *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="base-input text-xs"
              >
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </select>
            </div>

            {/* Height & Weight */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Chiều cao (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="162"
                min="50"
                max="250"
                className="base-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Cân nặng (kg)
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="54"
                min="10"
                max="300"
                className="base-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Calculated BMI Banner */}
          {bmiValue > 0 && (
            <div className="p-3.5 rounded-xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-500 block">
                  Chỉ số khối cơ thể (BMI Lâm sàng):
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-extrabold text-gray-900 font-mono">
                    {bmiValue} kg/m²
                  </span>
                  <span className={`base-tag ${bmiClassification.tagClass} text-[10px]`}>
                    {bmiClassification.label}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Chuẩn WHO cho người Châu Á
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Career */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Nghề nghiệp
              </label>
              <select
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="base-input text-xs"
              >
                <option value="Nhân viên văn phòng">Nhân viên văn phòng</option>
                <option value="Công nhân">Công nhân</option>
                <option value="Nông dân">Nông dân</option>
                <option value="Học sinh - Sinh viên">Học sinh - Sinh viên</option>
                <option value="Cán bộ công chức">Cán bộ công chức</option>
                <option value="Lao động tự do">Lao động tự do</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {/* Insurance Number */}
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Số thẻ Bảo hiểm Y tế (BHYT)
              </label>
              <input
                type="text"
                value={bhyt}
                onChange={(e) => setBhyt(e.target.value)}
                placeholder="Ví dụ: DN4010120894567"
                className="base-input text-xs font-mono uppercase"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Địa chỉ nơi cư trú (Tỉnh/Thành phố, Quận/Huyện)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ví dụ: Hà Nội"
                className="base-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Security & Credentials */}
        <div className="space-y-4 pt-2 border-t border-[var(--base-border-opaque)]">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Thiết lập mật khẩu bảo mật
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Mật khẩu bảo mật *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="base-input !pr-10 text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <span className={`isax ${showPassword ? "icon-eye" : "icon-eye-slash"} text-base`}></span>
                </button>
              </div>
            </div>

            <div>
              <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
                Xác nhận lại mật khẩu *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="base-input !pr-10 text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <span className={`isax ${showConfirmPassword ? "icon-eye" : "icon-eye-slash"} text-base`}></span>
                </button>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--base-brand-blue)] focus:ring-blue-500 cursor-pointer"
              required
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              Tôi xác nhận các thông tin khai báo trên là trung thực và đồng ý để Bệnh viện Da liễu Trung ương quản lý hồ sơ bệnh án theo tiêu chuẩn bảo vệ dữ liệu cá nhân y tế.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="base-btn base-btn-primary w-full py-3.5 text-sm font-bold shadow-sm justify-center cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Đang khởi tạo hồ sơ...</span>
            ) : (
              <span>Đăng Ký Hồ Sơ Khám</span>
            )}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="pt-4 border-t border-[var(--base-border-opaque)] text-center text-xs text-[var(--base-content-secondary)]">
        Đã có tài khoản hồ sơ y tế?{" "}
        <Link to="/login" className="text-[var(--base-brand-blue)] font-bold hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
