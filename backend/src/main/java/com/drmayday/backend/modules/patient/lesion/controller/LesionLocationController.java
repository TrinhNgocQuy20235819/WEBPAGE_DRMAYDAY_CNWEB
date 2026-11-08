package com.drmayday.backend.modules.patient.lesion.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.patient.lesion.dto.LesionLocationRequest;
import com.drmayday.backend.modules.patient.lesion.dto.LesionLocationResponse;
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
@RequestMapping("/api/v1/lesion-locations")
@RequiredArgsConstructor
@Tag(name = "Lesion Locations", description = "Quản lý Vị trí tổn thương da (Slide 9: loc01, loc03, loc04, loc05)")
public class LesionLocationController {

    private final LesionTrackingService service;

    @PostMapping
    @Operation(summary = "loc01: Thêm vị trí tổn thương vào đợt bùng phát")
    public ResponseEntity<ApiResponse<LesionLocationResponse>> createLocation(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestBody LesionLocationRequest req) {
        LesionLocationResponse res = service.createLocation(principal, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(res));
    }

    @GetMapping
    @Operation(summary = "loc03: Lấy danh sách vị trí tổn thương (tùy chọn theo episodeId)")
    public ApiResponse<List<LesionLocationResponse>> getLocations(
            @AuthenticationPrincipal AccountPrincipal principal,
            @RequestParam(value = "episodeId", required = false) Long episodeId) {
        if (episodeId != null) {
            return ApiResponse.success(service.getLocationsByEpisode(principal, episodeId));
        }
        return ApiResponse.success(service.getLocations(principal));
    }

    @GetMapping("/episode/{episodeId}")
    @Operation(summary = "loc03: Lấy danh sách vị trí tổn thương theo đợt")
    public ApiResponse<List<LesionLocationResponse>> getLocationsByEpisode(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("episodeId") Long episodeId) {
        return ApiResponse.success(service.getLocationsByEpisode(principal, episodeId));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "loc04: Cập nhật thông tin vị trí tổn thương")
    public ApiResponse<LesionLocationResponse> editLocation(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id,
            @RequestBody LesionLocationRequest req) {
        return ApiResponse.success(service.editLocation(principal, id, req));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "loc05: Xóa vị trí tổn thương")
    public ApiResponse<Map<String, Object>> deleteLocation(
            @AuthenticationPrincipal AccountPrincipal principal,
            @PathVariable("id") Long id) {
        service.deleteLocation(principal, id);
        return ApiResponse.success("Deleted successfully", Map.of());
    }
}
