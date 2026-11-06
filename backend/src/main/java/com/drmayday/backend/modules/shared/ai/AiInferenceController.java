package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.security.service.AccountPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "AI Inference", description = "Dịch vụ AI Inference: Phân tích tổn thương da và đếm sẩn phù (Hives Count)")
public class AiInferenceController {

    private final AiInferenceService aiInferenceService;

    @PostMapping("/inference")
    @Operation(summary = "Thực hiện AI Inference trên tệp đính kèm và lưu kết quả vào ảnh tổn thương nếu được chỉ định")
    public ApiResponse<AiInferenceResponse> runInference(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestBody AiInferenceRequest req) {
        AiInferenceResponse response = aiInferenceService.analyzeAttachment(
                principal,
                req.getAttachmentId(),
                req.getPhotoId()
        );
        return ApiResponse.success("AI inference completed successfully", response);
    }
}

