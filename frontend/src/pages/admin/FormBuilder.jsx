import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

function normalizeTemplate(t) {
  const code = t.code_template || t.template_id || t.id;
  return {
    id: code,
    code,
    name: t.name || code,
    description:
      t.description ||
      (t.loai_benh_an === "MAN"
        ? "Mẫu bệnh án Mày đay Mạn tính chuẩn Bộ Y tế (≥ 6 tuần)"
        : t.loai_benh_an === "CAP"
        ? "Mẫu bệnh án Mày đay Cấp tính chuẩn Bộ Y tế (< 6 tuần)"
        : "Biểu mẫu lâm sàng động 4 tầng"),
    version: t.version || "1.0",
    is_active: String(t.is_active ?? "1") === "1" || t.is_active === true,
    sections: (t.sections || []).map((s, idx) => ({
      id: String(s.section_id ?? s.id ?? `SEC_${idx + 1}`),
      title: s.title || s.name || `Phân mục ${idx + 1}`,
      order: Number(s.order || idx + 1),
      filled_by: s.filled_by || "both",
      questions: (s.questions || []).map((q) => ({
        id: String(q.question_id ?? q.id),
        content: q.question_text || q.content || "",
        type: q.type_question || q.type || "text",
        options: (q.options || []).map((o) =>
          typeof o === "string" ? o : o.option_text || o.option_value || ""
        ),
        parent_question_id: q.parent_question_id || "",
        show_if_answer: q.show_if_answer || "",
      })),
    })),
  };
}

export default function FormBuilder() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState("");

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
  });

  const [sectionForm, setSectionForm] = useState({
    title: "",
    order: 1,
    filled_by: "both",
  });

  const [questionForm, setQuestionForm] = useState({
    content: "",
    type: "radio",
    options: "Có,Không",
    parent_question_id: "",
    show_if_answer: "",
  });

  const loadTemplates = useCallback(async (preferCode = null) => {
    setLoading(true);
    try {
      const listRes = await apiClient.get("/templates/all");
      const rawList = listRes.data || [];
      const details = await Promise.all(
        rawList.map((item) =>
          apiClient
            .get(`/templates/${item.code_template || item.id}`)
            .then((r) => normalizeTemplate(r.data || item))
            .catch(() => normalizeTemplate(item))
        )
      );
      setTemplates(details);
      if (details.length > 0) {
        const target =
          (preferCode && details.find((t) => t.code === preferCode)) ||
          details[0];
        setSelectedTemplate(target);
      } else {
        setSelectedTemplate(null);
      }
    } catch {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // --- TEMPLATE CRUD (tmpl01, tmpl04, tmpl05) ---
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    const cleanCode = templateForm.code.trim().toUpperCase();
    if (!templateForm.name.trim() || !cleanCode) return;

    try {
      await apiClient.post("/templates", {
        code_template: cleanCode,
        name: templateForm.name.trim(),
        description: templateForm.description,
        is_active: templateForm.is_active ? "1" : "0",
      });
      await apiClient
        .post(`/templates/${cleanCode}/sections`, {
          title: "Thông Tin Lâm Sàng Cơ Bản",
          name: "Thông Tin Lâm Sàng Cơ Bản",
          order: 1,
          filled_by: "both",
        })
        .catch(() => {});

      setShowCreateTemplateModal(false);
      setTemplateForm({ name: "", code: "", description: "", is_active: true });
      toast.success("Đã tạo mẫu phiếu khám mới thành công (Mã 1001)!");
      await loadTemplates(cleanCode);
    } catch {
      // Handled by interceptor
    }
  };

  const handleEditTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    try {
      await apiClient.put(`/templates/${selectedTemplate.code}`, {
        name: templateForm.name.trim(),
        description: templateForm.description,
        is_active: templateForm.is_active ? "1" : "0",
      });
      setShowEditTemplateModal(false);
      toast.success("Đã cập nhật thông tin mẫu phiếu (Mã 1000)!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
  };

  const handleDeleteTemplate = async (tmplId) => {
    if (templates.length <= 1) {
      toast.error("Không thể xóa mẫu phiếu cuối cùng của hệ thống!");
      return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn xóa mẫu phiếu này?")) return;
    try {
      await apiClient.delete(`/templates/${tmplId}`);
      toast.success("Đã xóa mẫu phiếu khám (Mã 1000)!");
      await loadTemplates();
    } catch {
      // Handled by interceptor (e.g. 4105 Template in use)
    }
  };

  // --- SECTION CRUD (sec01, sec02, sec03) ---
  const handleOpenAddSection = () => {
    if (!selectedTemplate) return;
    setSectionForm({
      title: "",
      order: selectedTemplate.sections.length + 1,
      filled_by: "both",
    });
    setShowAddSectionModal(true);
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !sectionForm.title.trim()) return;
    try {
      await apiClient.post(`/templates/${selectedTemplate.code}/sections`, {
        title: sectionForm.title.trim(),
        name: sectionForm.title.trim(),
        order: Number(sectionForm.order) || selectedTemplate.sections.length + 1,
        filled_by: sectionForm.filled_by,
      });
      setShowAddSectionModal(false);
      toast.success("Đã thêm phân mục mới (Mã 1001)!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
  };

  const handleOpenEditSection = (sec) => {
    setSelectedSection(sec);
    setSectionForm({
      title: sec.title,
      order: sec.order || 1,
      filled_by: sec.filled_by || "both",
    });
    setShowEditSectionModal(true);
  };

  const handleEditSection = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedSection) return;
    try {
      await apiClient.put(`/templates/sections/${selectedSection.id}`, {
        title: sectionForm.title.trim(),
        name: sectionForm.title.trim(),
        order: Number(sectionForm.order),
        filled_by: sectionForm.filled_by,
      });
      setShowEditSectionModal(false);
      toast.success("Đã cập nhật phân mục (Mã 1000)!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
  };

  const handleDeleteSection = async (secId) => {
    if (!selectedTemplate) return;
    if (selectedTemplate.sections.length <= 1) {
      toast.error("Mẫu phiếu phải có ít nhất 1 phân mục!");
      return;
    }
    if (!window.confirm("Xóa phân mục này sẽ xóa các câu hỏi bên trong. Bạn có chắc không?")) return;
    try {
      await apiClient.delete(`/templates/sections/${secId}`);
      toast.success("Đã xóa phân mục khỏi biểu mẫu!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
  };

  // --- QUESTION CRUD (ques01, ques02, ques03) ---
  const handleOpenAddQuestion = (secId) => {
    if (!selectedTemplate) return;
    setTargetSectionId(secId || selectedTemplate.sections[0]?.id || "");
    setSelectedQuestion(null);
    setQuestionForm({
      content: "",
      type: "radio",
      options: "Có,Không",
      parent_question_id: "",
      show_if_answer: "",
    });
    setShowAddQuestionModal(true);
  };

  const buildOptionObjects = (type, optionsStr) => {
    if (type === "text" || type === "number" || type === "file_upload") return [];
    return optionsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((txt, idx) => ({
        id: idx + 1,
        option_text: txt,
        option_value: txt,
      }));
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !questionForm.content.trim() || !targetSectionId) return;
    try {
      await apiClient.post(`/templates/sections/${targetSectionId}/questions`, {
        question_text: questionForm.content.trim(),
        type_question: questionForm.type,
        options: buildOptionObjects(questionForm.type, questionForm.options),
        parent_question_id: questionForm.parent_question_id || null,
        show_if_answer: questionForm.show_if_answer || null,
      });
      setShowAddQuestionModal(false);
      toast.success("Đã tạo câu hỏi mới (Mã 1001)!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
  };

  const handleOpenEditQuestion = (secId, q) => {
    setTargetSectionId(secId);
    setSelectedQuestion(q);
    setQuestionForm({
      content: q.content,
      type: q.type,
      options: (q.options || []).join(", "),
      parent_question_id: q.parent_question_id || "",
      show_if_answer: q.show_if_answer || "",
    });
    setShowEditQuestionModal(true);
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedQuestion) return;
    try {
      await apiClient.put(`/templates/questions/${selectedQuestion.id}`, {
        question_text: questionForm.content.trim(),
        type_question: questionForm.type,
        options: buildOptionObjects(questionForm.type, questionForm.options),
        parent_question_id: questionForm.parent_question_id || null,
        show_if_answer: questionForm.show_if_answer || null,
      });
      setShowEditQuestionModal(false);
      toast.success("Đã cập nhật câu hỏi (Mã 1000)!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
  };

  const handleDeleteQuestion = async (_secId, qId) => {
    if (!selectedTemplate) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi biểu mẫu?")) return;
    try {
      await apiClient.delete(`/templates/questions/${qId}`);
      toast.success("Đã xóa câu hỏi khỏi biểu mẫu!");
      await loadTemplates(selectedTemplate.code);
    } catch {
      // Handled by interceptor
    }
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
            <h1 className="base-hero-title">Thiết Kế Biểu Mẫu Khám Động (4 Tầng)</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-document-text text-sm"></span>
              <span>Cấu trúc chuẩn: Mẫu phiếu (Template) → Phân mục (Section) → Câu hỏi (Question) → Lựa chọn (Option)</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowJsonModal(true)}
              disabled={!selectedTemplate}
              className="base-btn-hero-primary cursor-pointer text-xs disabled:opacity-50"
            >
              <span className="isax icon-document-code text-sm"></span>
              <span>Xem JSON</span>
            </button>
            <button
              onClick={() => {
                setTemplateForm({ name: "", code: "", description: "", is_active: true });
                setShowCreateTemplateModal(true);
              }}
              className="base-btn-hero-accent cursor-pointer text-xs"
            >
              <span className="isax icon-add text-sm"></span>
              <span>Tạo Mẫu Phiếu Mới</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="base-card p-10 text-center text-xs text-gray-400">
          Đang tải cây biểu mẫu động từ máy chủ...
        </div>
      ) : !selectedTemplate ? (
        <div className="base-card p-10 text-center text-xs text-gray-400">
          Chưa có mẫu phiếu nào. Hãy bấm &quot;Tạo Mẫu Phiếu Mới&quot; để khởi tạo.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Template List (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="base-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-gray-900 uppercase">Mẫu phiếu</h2>
                  <span className="base-tag base-tag-neutral font-mono text-[10px]">{templates.length}</span>
                </div>
                <button
                  onClick={() => {
                    setTemplateForm({ name: "", code: "", description: "", is_active: true });
                    setShowCreateTemplateModal(true);
                  }}
                  className="base-btn base-btn-secondary base-btn-mini text-xs cursor-pointer"
                  title="Tạo mẫu phiếu mới (tmpl01)"
                >
                  <span className="isax icon-add text-xs"></span>
                  <span>Thêm mẫu</span>
                </button>
              </div>

              <div className="space-y-2">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-3.5 border text-xs cursor-pointer transition-all ${
                      selectedTemplate.id === tmpl.id
                        ? "border-[var(--base-brand-blue)] bg-[rgba(59,99,168,0.06)] shadow-xs"
                        : "border-[var(--base-border-opaque)] hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span className="truncate pr-2">{tmpl.name}</span>
                      <span
                        className={`base-tag text-[9px] shrink-0 ${
                          tmpl.is_active ? "base-tag-positive" : "base-tag-neutral"
                        }`}
                      >
                        {tmpl.is_active ? "Kích hoạt" : "Tạm dừng"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                      <span className="font-mono font-bold text-[var(--base-brand-blue)]">{tmpl.code}</span>
                      <span>{tmpl.sections.length} phân mục</span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{tmpl.description}</p>

                    {selectedTemplate.id === tmpl.id && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--base-border-opaque)]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateForm({
                              name: tmpl.name,
                              code: tmpl.code,
                              description: tmpl.description,
                              is_active: tmpl.is_active,
                            });
                            setShowEditTemplateModal(true);
                          }}
                          className="base-btn base-btn-secondary base-btn-mini flex-1 text-[11px] cursor-pointer"
                        >
                          <span className="isax icon-edit-2 text-xs"></span>
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tmpl.id);
                          }}
                          className="base-btn base-btn-secondary base-btn-mini text-rose-600 hover:bg-rose-50 text-[11px] cursor-pointer"
                        >
                          <span className="isax icon-trash text-xs"></span>
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sections & Questions Studio (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="base-card p-6 space-y-6">
              <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--base-brand-blue)] bg-blue-50 px-2 py-0.5">
                      {selectedTemplate.code}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{selectedTemplate.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedTemplate.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAddSection}
                    className="base-btn base-btn-secondary base-btn-compact text-xs cursor-pointer"
                  >
                    <span className="isax icon-folder-add text-sm"></span>
                    <span>Thêm Phân Mục</span>
                  </button>
                  <button
                    onClick={() => handleOpenAddQuestion(selectedTemplate.sections[0]?.id)}
                    disabled={selectedTemplate.sections.length === 0}
                    className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer disabled:opacity-50"
                  >
                    <span className="isax icon-add text-sm"></span>
                    <span>Thêm Câu Hỏi</span>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {selectedTemplate.sections.map((sec, secIdx) => (
                  <div
                    key={sec.id}
                    className="p-4 border border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] space-y-3"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-[var(--base-brand-navy)] uppercase tracking-wider pb-2 border-b border-[var(--base-border-opaque)]">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 bg-[var(--base-brand-navy)] text-white text-[10px] font-mono flex items-center justify-center font-bold">
                          {secIdx + 1}
                        </span>
                        <span>{sec.title}</span>
                        <span className="base-tag base-tag-neutral text-[9px] lowercase font-normal">
                          ({sec.filled_by || "both"})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAddQuestion(sec.id)}
                          className="base-btn base-btn-secondary base-btn-mini text-[11px] cursor-pointer"
                          title="Thêm câu hỏi vào phân mục này"
                        >
                          <span className="isax icon-add text-xs"></span>
                          <span>Thêm câu hỏi</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSection(sec)}
                          className="base-btn base-btn-secondary base-btn-mini text-[11px] cursor-pointer"
                          title="Sửa phân mục"
                        >
                          <span className="isax icon-edit-2 text-xs"></span>
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sec.id)}
                          className="base-btn base-btn-secondary base-btn-mini text-rose-600 hover:bg-rose-50 text-[11px] cursor-pointer"
                          title="Xóa phân mục"
                        >
                          <span className="isax icon-trash text-xs"></span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {sec.questions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400 bg-white border border-[var(--base-border-opaque)]">
                          Phân mục này chưa có câu hỏi nào. Nhấn &quot;Thêm câu hỏi&quot; để tạo câu hỏi đầu tiên.
                        </div>
                      ) : (
                        sec.questions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            className="p-4 bg-white border border-[var(--base-border-opaque)] text-xs space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-semibold text-gray-900 text-sm">
                                <span className="text-[var(--base-brand-blue)] mr-1.5 font-mono">
                                  {secIdx + 1}.{qIdx + 1}
                                </span>
                                {q.content}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="base-tag base-tag-neutral text-[9px] uppercase font-bold font-mono">
                                  {q.type}
                                </span>
                                <button
                                  onClick={() => handleOpenEditQuestion(sec.id, q)}
                                  className="base-btn base-btn-secondary base-btn-mini text-gray-600 hover:text-gray-900 cursor-pointer"
                                  title="Sửa câu hỏi (ques02)"
                                >
                                  <span className="isax icon-edit-2 text-xs"></span>
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(sec.id, q.id)}
                                  className="base-btn base-btn-secondary base-btn-mini text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Xóa câu hỏi (ques03)"
                                >
                                  <span className="isax icon-trash text-xs"></span>
                                </button>
                              </div>
                            </div>

                            {q.parent_question_id && (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1">
                                <span className="isax icon-routing text-xs font-bold"></span>
                                <span>
                                  Logic rẽ nhánh: Chỉ hiện khi câu hỏi cha ({q.parent_question_id}) = &quot;
                                  <strong>{q.show_if_answer}</strong>&quot;
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--base-border-opaque)]">
                              {q.options && q.options.length > 0 ? (
                                q.options.map((opt, oIdx) => (
                                  <label
                                    key={oIdx}
                                    className="flex items-center gap-2.5 p-2.5 border border-[var(--base-border-opaque)] hover:bg-gray-50 transition cursor-pointer select-none"
                                  >
                                    <input
                                      type={q.type === "checkbox" ? "checkbox" : "radio"}
                                      name={`preview-${q.id}`}
                                      defaultChecked={oIdx === 0}
                                      className="h-4 w-4 text-[var(--base-brand-blue)] border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-800 font-medium">{opt}</span>
                                  </label>
                                ))
                              ) : q.type === "file_upload" ? (
                                <div className="col-span-full p-3 bg-gray-50 text-gray-500 text-center flex items-center justify-center gap-2">
                                  <span className="isax icon-camera text-base"></span>
                                  <span>Khu vực tải ảnh tổn thương lâm sàng (Max 5MB)</span>
                                </div>
                              ) : (
                                <input
                                  type={q.type === "number" ? "number" : "text"}
                                  placeholder="Nhập nội dung câu trả lời..."
                                  className="base-input text-xs col-span-full"
                                  disabled
                                />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO MẪU PHIẾU KHÁM MỚI (tmpl01) */}
      {showCreateTemplateModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Tạo Mẫu Phiếu Khám Mới</h3>
              <button onClick={() => setShowCreateTemplateModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <form onSubmit={handleCreateTemplate}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên mẫu phiếu khám *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="VD: Mẫu Khám Mày Đay Tái Khám"
                    className="base-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mã định danh (code_template - Duy nhất) *</label>
                  <input
                    type="text"
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    placeholder="VD: TMPL_RECHECK"
                    className="base-input text-xs font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mô tả chuyên khoa</label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Mô tả mục đích sử dụng mẫu phiếu khám..."
                    rows={3}
                    className="base-input h-auto py-2 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-[var(--base-brand-blue)] rounded"
                  />
                  <span className="text-xs font-semibold text-gray-800">Kích hoạt sử dụng ngay</span>
                </label>
              </div>
              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateTemplateModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Khởi Tạo Mẫu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SỬA MẪU PHIẾU KHÁM (tmpl04) */}
      {showEditTemplateModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Cập Nhật Mẫu Phiếu Khám</h3>
              <button onClick={() => setShowEditTemplateModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <form onSubmit={handleEditTemplate}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên mẫu phiếu khám *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="base-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mã mẫu phiếu</label>
                  <input
                    type="text"
                    value={templateForm.code}
                    disabled
                    className="base-input text-xs font-mono bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mô tả chuyên khoa</label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    rows={3}
                    className="base-input h-auto py-2 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-[var(--base-brand-blue)] rounded"
                  />
                  <span className="text-xs font-semibold text-gray-800">Kích hoạt mẫu phiếu</span>
                </label>
              </div>
              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowEditTemplateModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: THÊM / SỬA PHÂN MỤC (sec01, sec02) */}
      {(showAddSectionModal || showEditSectionModal) && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">
                {showAddSectionModal ? "Thêm Phân Mục Mới" : "Cập Nhật Phân Mục"}
              </h3>
              <button
                onClick={() => {
                  setShowAddSectionModal(false);
                  setShowEditSectionModal(false);
                }}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <form onSubmit={showAddSectionModal ? handleAddSection : handleEditSection}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên phân mục *</label>
                  <input
                    type="text"
                    value={sectionForm.title}
                    onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                    placeholder="VD: Khám Thực Thể & Dị Nguyên"
                    className="base-input text-xs"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Thứ tự hiển thị</label>
                    <input
                      type="number"
                      value={sectionForm.order}
                      onChange={(e) => setSectionForm({ ...sectionForm, order: e.target.value })}
                      min={1}
                      className="base-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Đối tượng điền</label>
                    <select
                      value={sectionForm.filled_by}
                      onChange={(e) => setSectionForm({ ...sectionForm, filled_by: e.target.value })}
                      className="base-input text-xs"
                    >
                      <option value="patient">Bệnh nhân</option>
                      <option value="doctor">Bác sĩ</option>
                      <option value="both">Cả hai bên</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSectionModal(false);
                    setShowEditSectionModal(false);
                  }}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  {showAddSectionModal ? "Tạo Phân Mục" : "Lưu Phân Mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: THÊM / SỬA CÂU HỎI KÈM LOGIC RẼ NHÁNH (ques01, ques02) */}
      {(showAddQuestionModal || showEditQuestionModal) && selectedTemplate && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-lg w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">
                {showAddQuestionModal ? "Thêm Câu Hỏi Vào Phân Mục" : "Cập Nhật Câu Hỏi"}
              </h3>
              <button
                onClick={() => {
                  setShowAddQuestionModal(false);
                  setShowEditQuestionModal(false);
                }}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <form onSubmit={showAddQuestionModal ? handleAddQuestion : handleEditQuestion}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Nội dung câu hỏi *</label>
                  <input
                    type="text"
                    value={questionForm.content}
                    onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                    placeholder="VD: Nốt sẩn phù có tồn tại trên 24 giờ không?"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Kiểu câu trả lời</label>
                    <select
                      value={questionForm.type}
                      onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                      className="base-input text-xs"
                    >
                      <option value="radio">Chọn một (Radio)</option>
                      <option value="checkbox">Chọn nhiều (Checkbox)</option>
                      <option value="text">Nhập văn bản (Text)</option>
                      <option value="number">Nhập số định lượng (Number)</option>
                      <option value="file_upload">Tải ảnh tổn thương (File Upload)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Phân mục đích</label>
                    <select
                      value={targetSectionId}
                      onChange={(e) => setTargetSectionId(e.target.value)}
                      disabled={showEditQuestionModal}
                      className="base-input text-xs disabled:bg-gray-100"
                    >
                      {selectedTemplate.sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {questionForm.type !== "text" &&
                  questionForm.type !== "number" &&
                  questionForm.type !== "file_upload" && (
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Các lựa chọn (phân cách bằng dấu phẩy) *
                      </label>
                      <input
                        type="text"
                        value={questionForm.options}
                        onChange={(e) => setQuestionForm({ ...questionForm, options: e.target.value })}
                        placeholder="VD: Có, Không, Không rõ"
                        className="base-input text-xs"
                        required
                      />
                    </div>
                  )}

                <div className="p-3 bg-amber-50/60 border border-amber-200 space-y-2 mt-2">
                  <span className="text-[11px] font-bold text-amber-900 block uppercase">
                    Logic Rẽ Nhánh Phụ Thuộc (Slide 11)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-600 block mb-1">Phụ thuộc câu hỏi cha</label>
                      <select
                        value={questionForm.parent_question_id}
                        onChange={(e) => setQuestionForm({ ...questionForm, parent_question_id: e.target.value })}
                        className="base-input text-xs"
                      >
                        <option value="">(Không phụ thuộc - luôn hiện)</option>
                        {selectedTemplate.sections
                          .flatMap((s) => s.questions)
                          .filter((q) => q.id !== selectedQuestion?.id)
                          .map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.content.slice(0, 35)}...
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600 block mb-1">Hiện khi đáp án cha là</label>
                      <input
                        type="text"
                        value={questionForm.show_if_answer}
                        onChange={(e) => setQuestionForm({ ...questionForm, show_if_answer: e.target.value })}
                        placeholder="VD: Có"
                        className="base-input text-xs"
                        disabled={!questionForm.parent_question_id}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuestionModal(false);
                    setShowEditQuestionModal(false);
                  }}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  {showAddQuestionModal ? "Thêm Vào Mẫu Phiếu" : "Lưu Câu Hỏi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal JSON Schema */}
      {showJsonModal && selectedTemplate && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-2xl w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Cấu Trúc Cây Biểu Mẫu 4 Tầng (JSON Schema)</h3>
              <button onClick={() => setShowJsonModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <div className="base-modal-body">
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96">
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
    </div>
  );
}
