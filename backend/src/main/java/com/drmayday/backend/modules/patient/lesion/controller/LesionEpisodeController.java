package com.drmayday.backend.modules.patient.lesion.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.patient.lesion.dto.LesionEpisodeRequest;
import com.drmayday.backend.modules.patient.lesion.dto.LesionEpisodeResponse;
import com.drmayday.backend.modules.patient.lesion.service.LesionTrackingService;
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
@RequestMapping("/api/v1/lesion-episodes")
@RequiredArgsConstructor
@Tag(name = "Lesion Episodes", description = "Quản lý Đợt tổn thương da (Slide 9: lesion01, lesion02, lesion03, lesion04, lesion06)")
public class LesionEpisodeController {

    private final LesionTrackingService service;

    @PostMapping
    @Operation(summary = "lesion02: Tạo đợt tổn thương mới")
    public ResponseEntity<ApiResponse<LesionEpisodeResponse>> createEpisode(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestBody LesionEpisodeRequest req) {
        LesionEpisodeResponse res = service.createEpisode(principal, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(res));
    }

    @GetMapping({"", "/my"})
    @Operation(summary = "lesion01: Lấy danh sách đợt tổn thương của tôi")
    public ApiResponse<List<LesionEpisodeResponse>> getMyEpisodes(
            @AuthenticationPrincipal AccountPrincipal principal) {
        return ApiResponse.success(service.getMyEpisodes(principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "lesion06: Lấy chi tiết đợt tổn thương")
    public ApiResponse<LesionEpisodeResponse> getEpisode(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id) {
        return ApiResponse.success(service.getEpisode(principal, id));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "lesion03: Cập nhật thông tin đợt tổn thương")
    public ApiResponse<LesionEpisodeResponse> editEpisode(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id,
            @RequestBody LesionEpisodeRequest req) {
        return ApiResponse.success(service.editEpisode(principal, id, req));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "lesion04: Xóa đợt tổn thương")
    public ApiResponse<Map<String, Object>> deleteEpisode(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id) {
        service.deleteEpisode(principal, id);
        return ApiResponse.success("Deleted successfully", Map.of());
    }
}
