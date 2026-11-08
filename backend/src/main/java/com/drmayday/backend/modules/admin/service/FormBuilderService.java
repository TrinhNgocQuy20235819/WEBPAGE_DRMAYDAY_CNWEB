package com.drmayday.backend.modules.admin.service;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.admin.dto.FormBuilderDtos.*;
import com.drmayday.backend.modules.admin.model.AdminDataStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormBuilderService {

    private final AdminDataStore dataStore;
    private final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ==========================================
    // 1. QUẢN LÝ MẪU PHIẾU KHÁM (TEMPLATES)
    // ==========================================

    /**
     * tmpl01: set_template - Tạo mới mẫu phiếu khám bệnh gốc
     */
    public TemplateSummaryResponse createTemplate(CreateTemplateRequest request) {
        if (request == null || request.getCodeTemplate() == null || request.getCodeTemplate().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "code_template không được để trống");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Tên mẫu phiếu không được để trống");
        }

        String code = request.getCodeTemplate().trim();

        // Kiểm tra mã mẫu phiếu đã tồn tại chưa (Mã lỗi 4102: Template code already exists)
        if (dataStore.templates.containsKey(code)) {
            throw new AppException(ErrorCode.TEMPLATE_CODE_EXISTS);
        }

        String now = LocalDateTime.now().format(formatter);
        String active = (request.getIsActive() != null && !request.getIsActive().trim().isEmpty())
                ? request.getIsActive().trim() : "1";

        TemplateDetailResponse newTemplate = TemplateDetailResponse.builder()
                .codeTemplate(code)
                .name(request.getName().trim())
                .description(request.getDescription())
                .version(request.getVersion() != null ? request.getVersion() : "1.0")
                .isActive(active)
                .createdAt(now)
                .updatedAt(now)
                .sections(new ArrayList<>())
                .build();

        dataStore.templates.put(code, newTemplate);
        dataStore.saveToFile();

        return TemplateSummaryResponse.builder()
                .id(code)
                .codeTemplate(code)
                .name(newTemplate.getName())
                .description(newTemplate.getDescription())
                .version(newTemplate.getVersion())
                .isActive(newTemplate.getIsActive())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /**
     * tmpl02: get_list_templates - Truy xuất danh sách toàn bộ các mẫu phiếu
     */
    public List<TemplateSummaryResponse> getTemplates(String isActive) {
        List<TemplateDetailResponse> list = new ArrayList<>(dataStore.templates.values());

        if (isActive != null && !isActive.trim().isEmpty()) {
            list = list.stream()
                    .filter(t -> isActive.trim().equals(t.getIsActive()))
                    .collect(Collectors.toList());
        }

        return list.stream().map(t -> TemplateSummaryResponse.builder()
                .id(t.getCodeTemplate())
                .codeTemplate(t.getCodeTemplate())
                .name(t.getName())
                .description(t.getDescription())
                .version(t.getVersion())
                .isActive(t.getIsActive())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    /**
     * tmpl03: get_template_detail - Lấy toàn bộ cây biểu mẫu đa tầng (Nested JSON: Template -> Sections -> Questions -> Options)
     */
    public TemplateDetailResponse getTemplateDetail(String idOrCode) {
        if (idOrCode == null || idOrCode.trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        String key = idOrCode.trim();
        TemplateDetailResponse tmpl = dataStore.templates.get(key);
        if (tmpl == null) {
            // Thử tìm theo name hoặc id
            tmpl = dataStore.templates.values().stream()
                    .filter(t -> key.equalsIgnoreCase(t.getCodeTemplate()))
                    .findFirst()
                    .orElse(null);
        }

        if (tmpl == null) {
            throw new AppException(ErrorCode.TEMPLATE_NOT_FOUND); // Mã lỗi 4101
        }

        return tmpl;
    }

    /**
     * tmpl04: edit_template - Chỉnh sửa thông tin chung của mẫu phiếu
     */
    public TemplateDetailResponse editTemplate(String idOrCode, EditTemplateRequest request) {
        if (idOrCode == null) throw new AppException(ErrorCode.INVALID_PARAM);
        TemplateDetailResponse tmpl = dataStore.templates.get(idOrCode.trim());
        if (tmpl == null) throw new AppException(ErrorCode.TEMPLATE_NOT_FOUND);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            tmpl.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            tmpl.setDescription(request.getDescription());
        }
        if (request.getVersion() != null) {
            tmpl.setVersion(request.getVersion());
        }
        if (request.getIsActive() != null) {
            tmpl.setIsActive(request.getIsActive());
        }
        tmpl.setUpdatedAt(LocalDateTime.now().format(formatter));

        dataStore.templates.put(tmpl.getCodeTemplate(), tmpl);
        dataStore.saveToFile();
        return tmpl;
    }

    /**
     * tmpl05: delete_template - Xóa bỏ hoàn toàn mẫu phiếu khám (Chặn mã 4105 nếu đã liên kết bệnh án)
     */
    public void deleteTemplate(String idOrCode) {
        if (idOrCode == null) throw new AppException(ErrorCode.INVALID_PARAM);
        String code = idOrCode.trim();
        if (!dataStore.templates.containsKey(code)) {
            throw new AppException(ErrorCode.TEMPLATE_NOT_FOUND);
        }

        // Chặn xóa nếu template đã được sử dụng (Mã lỗi 4105: Template in use cannot be deleted)
        if (dataStore.templatesInUse.contains(code)) {
            throw new AppException(ErrorCode.TEMPLATE_IN_USE);
        }

        dataStore.templates.remove(code);
        dataStore.saveToFile();
    }

    // ==========================================
    // 2. PHÂN MỤC NỘI DUNG (SECTIONS)
    // ==========================================

    /**
     * sec01: set_template_section - Tạo mới phân mục trong mẫu phiếu
     */
    public SectionResponse createSection(String templateId, CreateSectionRequest request) {
        if (templateId == null || request == null) throw new AppException(ErrorCode.INVALID_PARAM);
        TemplateDetailResponse tmpl = dataStore.templates.get(templateId.trim());
        if (tmpl == null) throw new AppException(ErrorCode.TEMPLATE_NOT_FOUND);

        String secId = "SEC_" + System.currentTimeMillis();
        String orderVal = request.getOrder() != null ? request.getOrder() : String.valueOf(tmpl.getSections().size() + 1);

        SectionResponse newSec = SectionResponse.builder()
                .sectionId(secId)
                .title(request.getTitle())
                .order(orderVal)
                .filledBy(request.getFilledBy() != null ? request.getFilledBy() : "both")
                .questions(new ArrayList<>())
                .build();

        tmpl.getSections().add(newSec);
        dataStore.saveToFile();
        return newSec;
    }

    /**
     * sec02: edit_template_section - Cập nhật phân mục (Mã lỗi 4103 nếu không tìm thấy)
     */
    public SectionResponse editSection(String sectionId, EditSectionRequest request) {
        if (sectionId == null || request == null) throw new AppException(ErrorCode.INVALID_PARAM);

        for (TemplateDetailResponse tmpl : dataStore.templates.values()) {
            for (SectionResponse sec : tmpl.getSections()) {
                if (sectionId.equals(sec.getSectionId())) {
                    if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
                        sec.setTitle(request.getTitle().trim());
                    }
                    if (request.getOrder() != null) {
                        sec.setOrder(request.getOrder());
                    }
                    if (request.getFilledBy() != null) {
                        sec.setFilledBy(request.getFilledBy());
                    }
                    dataStore.saveToFile();
                    return sec;
                }
            }
        }

        throw new AppException(ErrorCode.SECTION_NOT_FOUND); // 4103
    }

    /**
     * sec03: delete_template_section - Xóa phân mục (CASCADE xóa các câu hỏi bên trong)
     */
    public void deleteSection(String sectionId) {
        if (sectionId == null) throw new AppException(ErrorCode.INVALID_PARAM);

        for (TemplateDetailResponse tmpl : dataStore.templates.values()) {
            boolean removed = tmpl.getSections().removeIf(s -> sectionId.equals(s.getSectionId()));
            if (removed) {
                dataStore.saveToFile();
                return;
            }
        }

        throw new AppException(ErrorCode.SECTION_NOT_FOUND); // 4103
    }

    // ==========================================
    // 3. CÂU HỎI & LỰA CHỌN (QUESTIONS & OPTIONS)
    // ==========================================

    /**
     * ques01: set_template_question - Tạo mới câu hỏi vào một phân mục
     */
    public QuestionResponse createQuestion(String sectionId, CreateQuestionRequest request) {
        if (sectionId == null || request == null) throw new AppException(ErrorCode.INVALID_PARAM);

        for (TemplateDetailResponse tmpl : dataStore.templates.values()) {
            for (SectionResponse sec : tmpl.getSections()) {
                if (sectionId.equals(sec.getSectionId())) {
                    String qId = request.getQuestionId() != null && !request.getQuestionId().trim().isEmpty()
                            ? request.getQuestionId().trim()
                            : "Q_" + System.currentTimeMillis();

                    List<QuestionOptionDto> options = request.getOptions() != null ? request.getOptions() : new ArrayList<>();

                    QuestionResponse q = QuestionResponse.builder()
                            .questionId(qId)
                            .questionText(request.getQuestionText())
                            .typeQuestion(request.getTypeQuestion())
                            .placeholder(request.getPlaceholder())
                            .order(request.getOrder() != null ? request.getOrder() : String.valueOf(sec.getQuestions().size() + 1))
                            .isRequired(request.getIsRequired() != null ? request.getIsRequired() : "0")
                            .parentQuestionId(request.getParentQuestionId())
                            .showIfAnswer(request.getShowIfAnswer())
                            .helpText(request.getHelpText())
                            .allowImage(request.getAllowImage() != null ? request.getAllowImage() : "0")
                            .options(options)
                            .build();

                    sec.getQuestions().add(q);
                    dataStore.saveToFile();
                    return q;
                }
            }
        }

        throw new AppException(ErrorCode.SECTION_NOT_FOUND);
    }

    /**
     * ques02: edit_template_question - Chỉnh sửa câu hỏi (Mã lỗi 4104 nếu không tìm thấy)
     */
    public QuestionResponse editQuestion(String questionId, EditQuestionRequest request) {
        if (questionId == null || request == null) throw new AppException(ErrorCode.INVALID_PARAM);

        for (TemplateDetailResponse tmpl : dataStore.templates.values()) {
            for (SectionResponse sec : tmpl.getSections()) {
                for (QuestionResponse q : sec.getQuestions()) {
                    if (questionId.equals(q.getQuestionId())) {
                        if (request.getQuestionText() != null) q.setQuestionText(request.getQuestionText());
                        if (request.getTypeQuestion() != null) q.setTypeQuestion(request.getTypeQuestion());
                        if (request.getPlaceholder() != null) q.setPlaceholder(request.getPlaceholder());
                        if (request.getOrder() != null) q.setOrder(request.getOrder());
                        if (request.getIsRequired() != null) q.setIsRequired(request.getIsRequired());
                        if (request.getParentQuestionId() != null) q.setParentQuestionId(request.getParentQuestionId());
                        if (request.getShowIfAnswer() != null) q.setShowIfAnswer(request.getShowIfAnswer());
                        if (request.getHelpText() != null) q.setHelpText(request.getHelpText());
                        if (request.getAllowImage() != null) q.setAllowImage(request.getAllowImage());
                        if (request.getOptions() != null) q.setOptions(request.getOptions());

                        dataStore.saveToFile();
                        return q;
                    }
                }
            }
        }

        throw new AppException(ErrorCode.QUESTION_NOT_FOUND); // 4104
    }

    /**
     * ques03: delete_template_question - Xóa câu hỏi khỏi Form
     */
    public void deleteQuestion(String questionId) {
        if (questionId == null) throw new AppException(ErrorCode.INVALID_PARAM);

        for (TemplateDetailResponse tmpl : dataStore.templates.values()) {
            for (SectionResponse sec : tmpl.getSections()) {
                boolean removed = sec.getQuestions().removeIf(q -> questionId.equals(q.getQuestionId()));
                if (removed) {
                    // Cũng xử lý dọn các câu hỏi phụ thuộc (nếu câu hỏi cha bị xóa)
                    sec.getQuestions().forEach(q -> {
                        if (questionId.equals(q.getParentQuestionId())) {
                            q.setParentQuestionId(null);
                            q.setShowIfAnswer(null);
                        }
                    });
                    dataStore.saveToFile();
                    return;
                }
            }
        }

        throw new AppException(ErrorCode.QUESTION_NOT_FOUND); // 4104
    }
}
