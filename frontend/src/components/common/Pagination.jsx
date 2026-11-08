export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="px-5 py-3.5 border-t border-[var(--base-border-opaque)] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs antialiased">
      {/* Items count summary */}
      <div className="flex items-center gap-3 text-[var(--base-content-secondary)]">
        <span>
          Hiển thị <strong className="text-[var(--base-content-primary)] font-semibold">{startItem}–{endItem}</strong> trên <strong className="text-[var(--base-content-primary)] font-semibold">{totalItems}</strong> bản ghi
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--base-border-opaque)]">
            <span className="text-[11px]">Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 border border-[var(--base-border-opaque)] rounded-md font-semibold text-xs bg-white text-[var(--base-content-primary)] cursor-pointer focus:outline-none focus:border-[var(--base-brand-blue)]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
            currentPage <= 1
              ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
              : "border-[var(--base-border-opaque)] text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)] cursor-pointer"
          }`}
          title="Trang trước"
        >
          <span className="isax icon-arrow-left-2 text-xs"></span>
          <span className="hidden sm:inline">Trước</span>
        </button>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--base-brand-navy)] text-white shadow-xs"
                    : "text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)]"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
            currentPage >= totalPages
              ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
              : "border-[var(--base-border-opaque)] text-[var(--base-content-secondary)] hover:bg-[var(--base-bg-secondary)] hover:text-[var(--base-content-primary)] cursor-pointer"
          }`}
          title="Trang tiếp theo"
        >
          <span className="hidden sm:inline">Sau</span>
          <span className="isax icon-arrow-right-3 text-xs"></span>
        </button>
      </div>
    </div>
  );
}
