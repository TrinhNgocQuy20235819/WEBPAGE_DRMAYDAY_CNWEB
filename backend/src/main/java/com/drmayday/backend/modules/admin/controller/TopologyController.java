package com.drmayday.backend.modules.admin.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.admin.dto.TopologyDtos.*;
import com.drmayday.backend.modules.admin.service.TopologyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "1. Slide 4: Topology Infrastructure", description = "Quản lý Hạ tầng Cơ sở y tế: Chi nhánh, Khoa chuyên môn và Phòng khám")
public class TopologyController {

    private final TopologyService topologyService;

    // ==========================================
    // 1. CHI NHÁNH / CƠ SỞ Y TẾ (BRANCHES)
    // ==========================================

    @PostMapping("/branches")
    @Operation(summary = "branch01: Tạo chi nhánh mới")
    public ResponseEntity<ApiResponse<BranchResponse>> createBranch(@Valid @RequestBody CreateBranchRequest request) {
        BranchResponse created = topologyService.createBranch(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/branches")
    @Operation(summary = "branch02: Lấy danh sách toàn bộ chi nhánh")
    public ResponseEntity<ApiResponse<List<BranchResponse>>> getBranches() {
        List<BranchResponse> list = topologyService.getBranches();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/branches/{id}")
    @Operation(summary = "branch03: Lấy chi tiết chi nhánh")
    public ResponseEntity<ApiResponse<BranchResponse>> getBranchDetail(@PathVariable("id") Long id) {
        BranchResponse branch = topologyService.getBranchDetail(id);
        return ResponseEntity.ok(ApiResponse.success(branch));
    }

    @PutMapping("/branches/{id}")
    @Operation(summary = "branch04: Cập nhật thông tin chi nhánh")
    public ResponseEntity<ApiResponse<BranchResponse>> editBranch(
            @PathVariable("id") Long id,
            @RequestBody EditBranchRequest request
    ) {
        BranchResponse updated = topologyService.editBranch(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", updated));
    }

    @DeleteMapping("/branches/{id}")
    @Operation(summary = "branch05: Xóa chi nhánh")
    public ResponseEntity<ApiResponse<Object>> deleteBranch(@PathVariable("id") Long id) {
        topologyService.deleteBranch(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa chi nhánh thành công", new Object()));
    }

    // ==========================================
    // 2. KHOA CHUYÊN MÔN (DEPARTMENTS)
    // ==========================================

    @PostMapping("/departments")
    @Operation(summary = "dept01: Tạo khoa chuyên môn mới")
    public ResponseEntity<ApiResponse<DepartmentResponse>> createDepartment(@Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse created = topologyService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/departments")
    @Operation(summary = "dept02: Lấy danh sách khoa chuyên môn")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getDepartments(
            @RequestParam(value = "branch_id", required = false) Long branchId
    ) {
        List<DepartmentResponse> list = topologyService.getDepartments(branchId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/departments/{id}")
    @Operation(summary = "dept03: Chi tiết khoa chuyên môn")
    public ResponseEntity<ApiResponse<DepartmentResponse>> getDepartmentDetail(@PathVariable("id") Long id) {
        DepartmentResponse dept = topologyService.getDepartmentDetail(id);
        return ResponseEntity.ok(ApiResponse.success(dept));
    }

    @PutMapping("/departments/{id}")
    @Operation(summary = "dept04: Cập nhật thông tin khoa chuyên môn")
    public ResponseEntity<ApiResponse<DepartmentResponse>> editDepartment(
            @PathVariable("id") Long id,
            @RequestBody EditDepartmentRequest request
    ) {
        DepartmentResponse updated = topologyService.editDepartment(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", updated));
    }

    @DeleteMapping("/departments/{id}")
    @Operation(summary = "dept05: Xóa khoa chuyên môn")
    public ResponseEntity<ApiResponse<Object>> deleteDepartment(@PathVariable("id") Long id) {
        topologyService.deleteDepartment(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa khoa thành công", new Object()));
    }

    // ==========================================
    // 3. PHÒNG KHÁM / PHÒNG CHỨC NĂNG (ROOMS)
    // ==========================================

    @PostMapping("/rooms")
    @Operation(summary = "room01: Tạo phòng khám mới")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        RoomResponse created = topologyService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/rooms")
    @Operation(summary = "room02: Lấy danh sách phòng khám")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getRooms(
            @RequestParam(value = "department_id", required = false) Long departmentId
    ) {
        List<RoomResponse> list = topologyService.getRooms(departmentId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/rooms/{id}")
    @Operation(summary = "room03: Chi tiết phòng khám")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomDetail(@PathVariable("id") Long id) {
        RoomResponse room = topologyService.getRoomDetail(id);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @PutMapping("/rooms/{id}")
    @Operation(summary = "room04: Cập nhật thông tin phòng khám")
    public ResponseEntity<ApiResponse<RoomResponse>> editRoom(
            @PathVariable("id") Long id,
            @RequestBody EditRoomRequest request
    ) {
        RoomResponse updated = topologyService.editRoom(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", updated));
    }

    @DeleteMapping("/rooms/{id}")
    @Operation(summary = "room05: Xóa phòng khám")
    public ResponseEntity<ApiResponse<Object>> deleteRoom(@PathVariable("id") Long id) {
        topologyService.deleteRoom(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa phòng khám thành công", new Object()));
    }
}
