package com.drmayday.backend.modules.patient.lesion.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.patient.lesion.dto.LesionPhotoMilestoneRequest;
import com.drmayday.backend.modules.patient.lesion.dto.LesionPhotoRequest;
import com.drmayday.backend.modules.patient.lesion.dto.LesionPhotoResponse;
import com.drmayday.backend.modules.patient.lesion.service.LesionTrackingService;
import com.drmayday.backend.modules.shared.ai.AiInferenceResponse;
import com.drmayday.backend.modules.shared.ai.AiInferenceService;
import com.drmayday.backend.security.service.AccountPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/lesion-photos")
@RequiredArgsConstructor
@Tag(name = "Lesion Photos", description = "Quản lý Ảnh chụp tổn thương da & AI Inference (Slide 9: lphoto01, lphoto02, lphoto03, lphoto04)")
public class LesionPhotoController {

    private final LesionTrackingService trackingService;
    private final AiInferenceService aiInferenceService;

    @PostMapping
    @Operation(summary = "lphoto01: Lưu ảnh chụp tổn thương kèm điểm triệu chứng và kết quả AI")
    public ResponseEntity<ApiResponse<LesionPhotoResponse>> savePhoto(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestBody LesionPhotoRequest req) {
        LesionPhotoResponse res = trackingService.saveLesionPhoto(principal, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(res));
    }

    @GetMapping("/location/{locationId}")
    @Operation(summary = "lphoto02: Lấy danh sách ảnh tổn thương theo vị trí")
    public ApiResponse<List<LesionPhotoResponse>> getPhotosByLocation(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("locationId") Long locationId) {
        return ApiResponse.success(trackingService.getLesionPhotosByLocation(principal, locationId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết ảnh tổn thương")
    public ApiResponse<LesionPhotoResponse> getPhoto(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id) {
        return ApiResponse.success(trackingService.getLesionPhoto(principal, id));
    }

    @PatchMapping("/{id}/milestone")
    @Operation(summary = "lphoto03: Cập nhật mốc tiến triển và điểm triệu chứng của ảnh")
    public ApiResponse<LesionPhotoResponse> editMilestone(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id,
            @RequestBody LesionPhotoMilestoneRequest req) {
        return ApiResponse.success(trackingService.editLesionPhotoMilestone(principal, id, req));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "lphoto04: Xóa ảnh chụp tổn thương")
    public ApiResponse<Map<String, Object>> deletePhoto(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id) {
        trackingService.deleteLesionPhoto(principal, id);
        return ApiResponse.success("Deleted successfully", Map.of());
    }

    @PostMapping("/{id}/inference")
    @Operation(summary = "Chạy AI Inference để dự đoán Hives Count cho ảnh tổn thương")
    public ApiResponse<AiInferenceResponse> runInferenceOnPhoto(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long photoId) {
        AiInferenceResponse response = aiInferenceService.analyzePhoto(principal, photoId);
        return ApiResponse.success("AI inference completed successfully", response);
    }
}
