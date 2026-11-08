import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--base-bg-canvas)] flex flex-col items-center justify-center p-6 text-center antialiased">
      <div className="base-card p-10 max-w-md w-full shadow-lg border border-[var(--base-border-opaque)] flex flex-col items-center">
        <div className="h-20 w-20 rounded-2xl bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] flex items-center justify-center mb-6">
          <span className="isax-b icon-danger text-4xl"></span>
        </div>
        <span className="base-tag base-tag-warning font-mono text-xs mb-3">MÃ LỖI 404</span>
        <h1 className="text-2xl font-bold text-[var(--base-content-primary)] tracking-tight">Trang Không Tồn Tại</h1>
        <p className="text-xs text-[var(--base-content-secondary)] mt-2 leading-relaxed">
          Đường dẫn bạn yêu cầu không nằm trong danh mục phân hệ của Bệnh viện Da liễu Trung ương.
        </p>
        <Link
          to="/login"
          className="base-btn base-btn-primary w-full mt-6 justify-center"
        >
          <span className="isax icon-home-2 text-base"></span>
          <span>Về Trang Đăng Nhập</span>
        </Link>
      </div>
    </div>
  );
}
