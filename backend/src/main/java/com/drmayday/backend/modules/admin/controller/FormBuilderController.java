package com.drmayday.backend.modules.admin.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.admin.dto.FormBuilderDtos.*;
import com.drmayday.backend.modules.admin.service.FormBuilderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
@Tag(name = "1. Slide 11: Dynamic Form Builder", description = "Bộ tạo mẫu phiếu khám động: Quản lý Template, Section, Question và Option")
public class FormBuilderController {

    private final FormBuilderService formBuilderService;

    // ==========================================
    // 1. QUẢN LÝ MẪU PHIẾU KHÁM (TEMPLATES)
    // ==========================================

    @PostMapping
    @Operation(summary = "tmpl01: Khởi tạo mẫu phiếu khám bệnh gốc")
    public ResponseEntity<ApiResponse<TemplateSummaryResponse>> createTemplate(@Valid @RequestBody CreateTemplateRequest request) {
        TemplateSummaryResponse created = formBuilderService.createTemplate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/all")
    @Operation(summary = "tmpl02: Truy xuất danh sách toàn bộ các mẫu phiếu")
    public ResponseEntity<ApiResponse<List<TemplateSummaryResponse>>> getTemplates(
            @RequestParam(value = "is_active", required = false) String isActive
    ) {
        List<TemplateSummaryResponse> list = formBuilderService.getTemplates(isActive);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "tmpl03: Lấy toàn bộ cây biểu mẫu đa tầng (Template -> Sections -> Questions -> Options)")
    public ResponseEntity<ApiResponse<TemplateDetailResponse>> getTemplateDetail(@PathVariable("id") String id) {
        TemplateDetailResponse detail = formBuilderService.getTemplateDetail(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @PutMapping("/{id}")
    @Operation(summary = "tmpl04: Cập nhật thông tin chung của mẫu phiếu")
    public ResponseEntity<ApiResponse<TemplateDetailResponse>> editTemplate(
            @PathVariable("id") String id,
            @RequestBody EditTemplateRequest request
    ) {
        TemplateDetailResponse updated = formBuilderService.editTemplate(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "tmpl05: Xóa hoàn toàn mẫu phiếu khám (Chặn nếu đang có bệnh án)")
    public ResponseEntity<ApiResponse<Object>> deleteTemplate(@PathVariable("id") String id) {
        formBuilderService.deleteTemplate(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mẫu phiếu thành công", new Object()));
    }

    // ==========================================
    // 2. PHÂN MỤC NỘI DUNG (SECTIONS)
    // ==========================================

    @PostMapping("/{template_id}/sections")
    @Operation(summary = "sec01: Tạo mới phân mục trong mẫu phiếu")
    public ResponseEntity<ApiResponse<SectionResponse>> createSection(
            @PathVariable("template_id") String templateId,
            @Valid @RequestBody CreateSectionRequest request
    ) {
        SectionResponse created = formBuilderService.createSection(templateId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @PutMapping("/sections/{id}")
    @Operation(summary = "sec02: Chỉnh sửa thông tin phân mục")
    public ResponseEntity<ApiResponse<SectionResponse>> editSection(
            @PathVariable("id") String id,
            @RequestBody EditSectionRequest request
    ) {
        SectionResponse updated = formBuilderService.editSection(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phân mục thành công", updated));
    }

    @DeleteMapping("/sections/{id}")
    @Operation(summary = "sec03: Xóa phân mục (Cascade xóa sạch câu hỏi bên trong)")
    public ResponseEntity<ApiResponse<Object>> deleteSection(@PathVariable("id") String id) {
        formBuilderService.deleteSection(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa phân mục thành công", new Object()));
    }

    // ==========================================
    // 3. CÂU HỎI VÀ LỰA CHỌN (QUESTIONS & OPTIONS)
    // ==========================================

    @PostMapping("/sections/{section_id}/questions")
    @Operation(summary = "ques01: Tạo mới câu hỏi vào một phân mục")
    public ResponseEntity<ApiResponse<QuestionResponse>> createQuestion(
            @PathVariable("section_id") String sectionId,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        QuestionResponse created = formBuilderService.createQuestion(sectionId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @PutMapping("/questions/{id}")
    @Operation(summary = "ques02: Chỉnh sửa nội dung hoặc logic rẽ nhánh câu hỏi")
    public ResponseEntity<ApiResponse<QuestionResponse>> editQuestion(
            @PathVariable("id") String id,
            @RequestBody EditQuestionRequest request
    ) {
        QuestionResponse updated = formBuilderService.editQuestion(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật câu hỏi thành công", updated));
    }

    @DeleteMapping("/questions/{id}")
    @Operation(summary = "ques03: Xóa câu hỏi khỏi Form")
    public ResponseEntity<ApiResponse<Object>> deleteQuestion(@PathVariable("id") String id) {
        formBuilderService.deleteQuestion(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa câu hỏi thành công", new Object()));
    }
}
