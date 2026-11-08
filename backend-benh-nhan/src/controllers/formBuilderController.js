/**
 * @file src/controllers/formBuilderController.js
 * @description Controller xử lý toàn bộ các API của Backend Slide 11:
 * Bộ tạo mẫu phiếu khám động (Dynamic Form Builder: Template - Section - Question - Option).
 * (tmpl01..05, sec01..03, ques01..03).
 */

const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore, DEFAULT_TEMPLATES } = require('../config/runtimeStore');

// Khởi tạo customTemplates từ DEFAULT_TEMPLATES nếu chưa có
if (!state.customTemplates) {
  state.customTemplates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
}
if (!state.templatesInUse) {
  state.templatesInUse = {
    TMPL_URT_CHRONIC: true // Mẫu bệnh án mạn tính đang gắn với hồ sơ đã khám
  };
}

// ==========================================
// 1. QUẢN LÝ MẪU PHIẾU KHÁM (TEMPLATES)
// ==========================================

async function createTemplate(req, res) {
  try {
    const { code_template, name, description, version, is_active } = req.body;
    if (!code_template || !name) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    const code = String(code_template).trim();
    if (state.customTemplates[code]) {
      return sendResponse(res, RESPONSE_CODES.TEMPLATE_CODE_EXISTS); // 4102
    }

    const newTmpl = {
      template_id: code,
      code_template: code,
      name: name.trim(),
      description: description || '',
      version: version || '1.0',
      is_active: is_active !== undefined ? String(is_active) : '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: []
    };

    state.customTemplates[code] = newTmpl;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.CREATED, {
      code_template: code,
      name: newTmpl.name,
      description: newTmpl.description,
      version: newTmpl.version,
      is_active: newTmpl.is_active,
      created_at: newTmpl.created_at,
      updated_at: newTmpl.updated_at
    });
  } catch (err) {
    console.error('[FormBuilderController] createTemplate error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getTemplates(req, res) {
  try {
    const isActiveFilter = req.query.is_active;
    let list = Object.values(state.customTemplates);

    if (isActiveFilter !== undefined) {
      list = list.filter(t => String(t.is_active) === String(isActiveFilter));
    }

    const result = list.map(t => ({
      id: t.code_template,
      code_template: t.code_template,
      name: t.name,
      description: t.description,
      version: t.version,
      is_active: t.is_active,
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString()
    }));

    return sendResponse(res, RESPONSE_CODES.OK, result);
  } catch (err) {
    console.error('[FormBuilderController] getTemplates error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getTemplateDetail(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const tmpl = state.customTemplates[id] || Object.values(state.customTemplates).find(t => t.template_id === id);
    if (!tmpl) {
      return sendResponse(res, RESPONSE_CODES.TEMPLATE_NOT_FOUND); // 4101
    }

    return sendResponse(res, RESPONSE_CODES.OK, tmpl);
  } catch (err) {
    console.error('[FormBuilderController] getTemplateDetail error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editTemplate(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const tmpl = state.customTemplates[id];
    if (!tmpl) return sendResponse(res, RESPONSE_CODES.TEMPLATE_NOT_FOUND);

    const { name, description, version, is_active } = req.body;
    if (name) tmpl.name = name.trim();
    if (description !== undefined) tmpl.description = description;
    if (version) tmpl.version = version;
    if (is_active !== undefined) tmpl.is_active = String(is_active);
    tmpl.updated_at = new Date().toISOString();

    state.customTemplates[id] = tmpl;
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, tmpl);
  } catch (err) {
    console.error('[FormBuilderController] editTemplate error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deleteTemplate(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    if (!state.customTemplates[id]) {
      return sendResponse(res, RESPONSE_CODES.TEMPLATE_NOT_FOUND);
    }

    // Chặn xóa nếu template đang được gắn với hồ sơ bệnh án (Mã lỗi 4105: Template in use cannot be deleted)
    if (state.templatesInUse && state.templatesInUse[id]) {
      return sendResponse(res, RESPONSE_CODES.TEMPLATE_IN_USE);
    }

    delete state.customTemplates[id];
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa mẫu phiếu thành công');
  } catch (err) {
    console.error('[FormBuilderController] deleteTemplate error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

// ==========================================
// 2. PHÂN MỤC NỘI DUNG (SECTIONS)
// ==========================================

async function createSection(req, res) {
  try {
    const templateId = req.params.template_id;
    const { title, name, order, filled_by } = req.body;
    const effTitle = String(title || name || '').trim();
    if (!templateId || !effTitle) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const tmpl = state.customTemplates[templateId];
    if (!tmpl) return sendResponse(res, RESPONSE_CODES.TEMPLATE_NOT_FOUND);

    const secId = `SEC_${Date.now()}`;
    const newSec = {
      section_id: secId,
      title: effTitle,
      name: effTitle,
      order: order !== undefined ? String(order) : String(tmpl.sections.length + 1),
      filled_by: filled_by || 'both',
      questions: []
    };

    tmpl.sections.push(newSec);
    saveStore();

    return sendResponse(res, RESPONSE_CODES.CREATED, newSec);
  } catch (err) {
    console.error('[FormBuilderController] createSection error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editSection(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    const { title, name, order, filled_by } = req.body;
    const effTitle = (title || name || '').trim();

    for (const tmpl of Object.values(state.customTemplates)) {
      const sec = tmpl.sections.find(s => String(s.section_id) === String(id));
      if (sec) {
        if (effTitle) {
          sec.title = effTitle;
          sec.name = effTitle;
        }
        if (order !== undefined) sec.order = String(order);
        if (filled_by) sec.filled_by = filled_by;
        saveStore();
        return sendResponse(res, RESPONSE_CODES.OK, sec);
      }
    }

    return sendResponse(res, RESPONSE_CODES.SECTION_NOT_FOUND); // 4103
  } catch (err) {
    console.error('[FormBuilderController] editSection error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deleteSection(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    for (const tmpl of Object.values(state.customTemplates)) {
      const idx = tmpl.sections.findIndex(s => String(s.section_id) === String(id));
      if (idx !== -1) {
        tmpl.sections.splice(idx, 1);
        saveStore();
        return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa phân mục thành công');
      }
    }

    return sendResponse(res, RESPONSE_CODES.SECTION_NOT_FOUND); // 4103
  } catch (err) {
    console.error('[FormBuilderController] deleteSection error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

// ==========================================
// 3. CÂU HỎI VÀ LỰA CHỌN (QUESTIONS & OPTIONS)
// ==========================================

async function createQuestion(req, res) {
  try {
    const sectionId = req.params.section_id;
    const { question_id, question_text, type_question, placeholder, order, is_required, parent_question_id, show_if_answer, help_text, allow_image, options } = req.body;

    if (!sectionId || !question_text || !type_question) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);
    }

    for (const tmpl of Object.values(state.customTemplates)) {
      const sec = tmpl.sections.find(s => String(s.section_id) === String(sectionId));
      if (sec) {
        const qId = question_id ? String(question_id).trim() : `Q_${Date.now()}`;
        const newQ = {
          question_id: qId,
          question_text: question_text.trim(),
          type_question: type_question,
          placeholder: placeholder || null,
          order: order !== undefined ? String(order) : String(sec.questions.length + 1),
          is_required: is_required !== undefined ? String(is_required) : '0',
          parent_question_id: parent_question_id || null,
          show_if_answer: show_if_answer || null,
          help_text: help_text || null,
          allow_image: allow_image !== undefined ? String(allow_image) : '0',
          options: Array.isArray(options) ? options : []
        };

        sec.questions.push(newQ);
        saveStore();
        return sendResponse(res, RESPONSE_CODES.CREATED, newQ);
      }
    }

    return sendResponse(res, RESPONSE_CODES.SECTION_NOT_FOUND);
  } catch (err) {
    console.error('[FormBuilderController] createQuestion error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function editQuestion(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    for (const tmpl of Object.values(state.customTemplates)) {
      for (const sec of tmpl.sections) {
        const q = sec.questions.find(item => item.question_id === id);
        if (q) {
          const { question_text, type_question, placeholder, order, is_required, parent_question_id, show_if_answer, help_text, allow_image, options } = req.body;
          if (question_text) q.question_text = question_text.trim();
          if (type_question) q.type_question = type_question;
          if (placeholder !== undefined) q.placeholder = placeholder;
          if (order !== undefined) q.order = String(order);
          if (is_required !== undefined) q.is_required = String(is_required);
          if (parent_question_id !== undefined) q.parent_question_id = parent_question_id;
          if (show_if_answer !== undefined) q.show_if_answer = show_if_answer;
          if (help_text !== undefined) q.help_text = help_text;
          if (allow_image !== undefined) q.allow_image = String(allow_image);
          if (Array.isArray(options)) q.options = options;

          saveStore();
          return sendResponse(res, RESPONSE_CODES.OK, q);
        }
      }
    }

    return sendResponse(res, RESPONSE_CODES.QUESTION_NOT_FOUND); // 4104
  } catch (err) {
    console.error('[FormBuilderController] editQuestion error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function deleteQuestion(req, res) {
  try {
    const id = req.params.id;
    if (!id) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM);

    for (const tmpl of Object.values(state.customTemplates)) {
      for (const sec of tmpl.sections) {
        const idx = sec.questions.findIndex(q => q.question_id === id);
        if (idx !== -1) {
          sec.questions.splice(idx, 1);
          // Gỡ bỏ liên kết nếu câu hỏi cha bị xóa
          sec.questions.forEach(q => {
            if (q.parent_question_id === id) {
              q.parent_question_id = null;
              q.show_if_answer = null;
            }
          });
          saveStore();
          return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa câu hỏi thành công');
        }
      }
    }

    return sendResponse(res, RESPONSE_CODES.QUESTION_NOT_FOUND); // 4104
  } catch (err) {
    console.error('[FormBuilderController] deleteQuestion error:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateDetail,
  editTemplate,
  deleteTemplate,
  createSection,
  editSection,
  deleteSection,
  createQuestion,
  editQuestion,
  deleteQuestion
};
