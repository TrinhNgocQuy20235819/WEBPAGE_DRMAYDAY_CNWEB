import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_TEMPLATES } from "../../services/mockData";

export default function FormBuilder() {
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);

  const [newQuestion, setNewQuestion] = useState({
    content: "",
    type: "radio",
    options: "Có,Không",
  });

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.content) return;

    const optArray = newQuestion.options.split(",").map((s) => s.trim()).filter(Boolean);
    const updatedSections = [...selectedTemplate.sections];
    updatedSections[0].questions.push({
      id: `q-${Date.now()}`,
      content: newQuestion.content,
      type: newQuestion.type,
      options: optArray,
    });

    const updatedTemplate = { ...selectedTemplate, sections: updatedSections };
    setSelectedTemplate(updatedTemplate);
    setTemplates(templates.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t)));
    setShowAddQuestionModal(false);
    setNewQuestion({ content: "", type: "radio", options: "Có,Không" });
    toast.success("Đã thêm câu hỏi vào phân mục biểu mẫu!");
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <Link to="/admin" className="hover:text-white transition">Quản trị</Link>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Biểu mẫu</span>
            </div>
            <h1 className="base-hero-title">Thiết Kế Biểu Mẫu</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-document-text text-sm"></span>
              <span>Quản lý mẫu phiếu và bộ câu hỏi khám chuyên khoa</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowJsonModal(true)}
              className="base-btn-hero-primary cursor-pointer text-xs"
            >
              <span className="isax icon-document-code text-sm"></span>
              <span>Xem JSON</span>
            </button>
            <button
              onClick={() => setShowAddQuestionModal(true)}
              className="base-btn-hero-accent cursor-pointer text-xs"
            >
              <span className="isax icon-add text-sm"></span>
              <span>Thêm câu hỏi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Studio Layout: 4 Columns left (Templates), 8 Columns right (Sections & Questions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="base-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
              <h2 className="text-xs font-bold text-gray-900 uppercase">Mẫu phiếu</h2>
              <span className="base-tag base-tag-neutral font-mono text-[10px]">{templates.length}</span>
            </div>

            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedTemplate.id === tmpl.id
                      ? "border-[var(--base-brand-blue)] bg-[rgba(59,99,168,0.06)] shadow-xs"
                      : "border-[var(--base-border-opaque)] hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>{tmpl.name}</span>
                    <span className="base-tag base-tag-positive text-[9px]">Kích hoạt</span>
                  </div>
                  <p className="font-mono text-[10px] text-gray-500 mt-1">{tmpl.code}</p>
                  <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{tmpl.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sections & Questions Studio (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="base-card p-6 space-y-6">
            <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--base-brand-blue)] font-bold uppercase">
                  {selectedTemplate.code}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">{selectedTemplate.name}</h3>
              </div>
              <span className="base-tag base-tag-info font-bold text-xs">
                {selectedTemplate.sections.length} Phân Mục
              </span>
            </div>

            {/* Sections Loop */}
            <div className="space-y-6">
              {selectedTemplate.sections.map((sec, secIdx) => (
                <div key={sec.id} className="p-4 rounded-xl border border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] space-y-3">
                  <div className="flex items-center justify-between font-bold text-xs text-[var(--base-brand-navy)] uppercase tracking-wider">
                    <span>{sec.title}</span>
                    <span className="text-[10px] font-mono text-gray-500">{sec.questions.length} câu hỏi</span>
                  </div>

                  <div className="space-y-2.5">
                    {sec.questions.map((q, qIdx) => (
                      <div key={q.id} className="p-3 bg-white rounded-lg border border-[var(--base-border-opaque)] text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-gray-900">
                          <span>
                            {secIdx + 1}.{qIdx + 1} {q.content}
                          </span>
                          <span className="base-tag base-tag-neutral text-[9px] uppercase font-bold">
                            {q.type}
                          </span>
                        </div>

                        {/* Options */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[var(--base-border-opaque)]">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Lựa chọn:</span>
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700 font-medium"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal JSON Schema */}
      {showJsonModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-2xl w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Cấu Trúc Dữ Liệu Biểu Mẫu Y Tế (JSON Schema)</h3>
              <button onClick={() => setShowJsonModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <div className="base-modal-body">
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-96">
                {JSON.stringify(selectedTemplate, null, 2)}
              </pre>
            </div>
            <div className="base-modal-footer">
              <button
                onClick={() => setShowJsonModal(false)}
                className="base-btn base-btn-secondary base-btn-compact"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Câu Hỏi */}
      {showAddQuestionModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Thêm Câu Hỏi Mới</h3>
              <button onClick={() => setShowAddQuestionModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleAddQuestion}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Nội dung câu hỏi *</label>
                  <input
                    type="text"
                    value={newQuestion.content}
                    onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                    placeholder="VD: Triệu chứng có tăng nặng khi gặp lạnh không?"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Kiểu câu trả lời</label>
                  <select
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                    className="base-input text-xs"
                  >
                    <option value="radio">Chọn một (Radio)</option>
                    <option value="checkbox">Chọn nhiều (Checkbox)</option>
                    <option value="text">Nhập văn bản (Text)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Các lựa chọn (phân cách bằng dấu phẩy) *
                  </label>
                  <input
                    type="text"
                    value={newQuestion.options}
                    onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                    placeholder="VD: Không, Thỉnh thoảng, Rất thường xuyên"
                    className="base-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Thêm Vào Mẫu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
