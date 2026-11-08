package com.drmayday.backend.modules.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

public class FormBuilderDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateTemplateRequest {
        @NotBlank(message = "code_template là bắt buộc")
        @JsonProperty("code_template")
        private String codeTemplate;

        @NotBlank(message = "Tên mẫu phiếu không được để trống")
        private String name;

        private String description;
        private String version;

        @JsonProperty("is_active")
        private String isActive; // "1" hoặc "0"
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditTemplateRequest {
        private String name;
        private String description;
        private String version;

        @JsonProperty("is_active")
        private String isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TemplateSummaryResponse {
        private String id;

        @JsonProperty("code_template")
        private String codeTemplate;

        private String name;
        private String description;
        private String version;

        @JsonProperty("is_active")
        private String isActive;

        @JsonProperty("created_at")
        private String createdAt;

        @JsonProperty("updated_at")
        private String updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateSectionRequest {
        @NotBlank(message = "Tiêu đề phân mục không được để trống")
        private String title;

        private String order;

        @JsonProperty("filled_by")
        private String filledBy; // patient, doctor, both
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditSectionRequest {
        private String title;
        private String order;

        @JsonProperty("filled_by")
        private String filledBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionOptionDto {
        private String id;

        @JsonProperty("option_text")
        private String optionText;

        @JsonProperty("option_value")
        private String optionValue;

        private String order;

        @JsonProperty("trigger_image_upload")
        private String triggerImageUpload; // "0" hoặc "1"
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateQuestionRequest {
        @NotBlank(message = "question_id là bắt buộc")
        @JsonProperty("question_id")
        private String questionId;

        @NotBlank(message = "Nội dung câu hỏi không được để trống")
        @JsonProperty("question_text")
        private String questionText;

        @NotBlank(message = "Kiểu câu hỏi type_question là bắt buộc")
        @JsonProperty("type_question")
        private String typeQuestion; // text, number, radio, checkbox

        private String placeholder;
        private String order;

        @JsonProperty("is_required")
        private String isRequired;

        @JsonProperty("parent_question_id")
        private String parentQuestionId;

        @JsonProperty("show_if_answer")
        private String showIfAnswer;

        @JsonProperty("help_text")
        private String helpText;

        @JsonProperty("allow_image")
        private String allowImage;

        @Builder.Default
        private List<QuestionOptionDto> options = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditQuestionRequest {
        @JsonProperty("question_text")
        private String questionText;

        @JsonProperty("type_question")
        private String typeQuestion;

        private String placeholder;
        private String order;

        @JsonProperty("is_required")
        private String isRequired;

        @JsonProperty("parent_question_id")
        private String parentQuestionId;

        @JsonProperty("show_if_answer")
        private String showIfAnswer;

        @JsonProperty("help_text")
        private String helpText;

        @JsonProperty("allow_image")
        private String allowImage;

        private List<QuestionOptionDto> options;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionResponse {
        @JsonProperty("question_id")
        private String questionId;

        @JsonProperty("question_text")
        private String questionText;

        @JsonProperty("type_question")
        private String typeQuestion;

        private String placeholder;
        private String order;

        @JsonProperty("is_required")
        private String isRequired;

        @JsonProperty("parent_question_id")
        private String parentQuestionId;

        @JsonProperty("show_if_answer")
        private String showIfAnswer;

        @JsonProperty("help_text")
        private String helpText;

        @JsonProperty("allow_image")
        private String allowImage;

        @Builder.Default
        private List<QuestionOptionDto> options = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SectionResponse {
        @JsonProperty("section_id")
        private String sectionId;

        private String title;
        private String order;

        @JsonProperty("filled_by")
        private String filledBy;

        @Builder.Default
        private List<QuestionResponse> questions = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TemplateDetailResponse {
        @JsonProperty("code_template")
        private String codeTemplate;

        private String name;
        private String description;
        private String version;

        @JsonProperty("is_active")
        private String isActive;

        @JsonProperty("created_at")
        private String createdAt;

        @JsonProperty("updated_at")
        private String updatedAt;

        @Builder.Default
        private List<SectionResponse> sections = new ArrayList<>();
    }
}
