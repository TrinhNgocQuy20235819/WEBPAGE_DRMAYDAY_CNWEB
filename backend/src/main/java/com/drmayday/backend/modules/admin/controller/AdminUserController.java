package com.drmayday.backend.modules.admin.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.admin.dto.UserDtos.*;
import com.drmayday.backend.modules.admin.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "1. Slide 3: Admin User Management", description = "Quản lý danh sách, chi tiết, thêm, sửa, xóa người dùng và phân công công tác")
public class AdminUserController {

    private final AdminUserService adminUserService;

    /**
     * admin02: get_list_users (Xem danh sách người dùng có phân trang)
     */
    @GetMapping
    @Operation(summary = "admin02: Lấy danh sách người dùng phân trang")
    public ResponseEntity<ApiResponse<UserListResponse>> getListUsers(
            @RequestParam(value = "page", required = false, defaultValue = "1") Integer page,
            @RequestParam(value = "limit", required = false, defaultValue = "20") Integer limit,
            @RequestParam(value = "role_id", required = false) Long roleId
    ) {
        UserListResponse response = adminUserService.getListUsers(page, limit, roleId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * admin03: get_user_details (Xem chi tiết một người dùng)
     */
    @GetMapping("/{id}")
    @Operation(summary = "admin03: Lấy chi tiết tài khoản và hồ sơ người dùng")
    public ResponseEntity<ApiResponse<UserDetailDto>> getUserDetails(@PathVariable("id") Long id) {
        UserDetailDto response = adminUserService.getUserDetails(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * admin01: create_user (Tạo mới tài khoản người dùng)
     */
    @PostMapping
    @Operation(summary = "admin01: Thêm mới tài khoản người dùng vào hệ thống")
    public ResponseEntity<ApiResponse<UserDetailDto>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserDetailDto created = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    /**
     * admin04: edit_user (Chỉnh sửa thông tin người dùng)
     */
    @PutMapping("/{id}")
    @Operation(summary = "admin04: Cập nhật thông tin người dùng")
    public ResponseEntity<ApiResponse<UserDetailDto>> editUser(
            @PathVariable("id") Long id,
            @RequestBody EditUserRequest request
    ) {
        UserDetailDto updated = adminUserService.editUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", updated));
    }

    /**
     * admin05: delete_user (Xóa tài khoản người dùng)
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "admin05: Xóa tài khoản người dùng")
    public ResponseEntity<ApiResponse<Object>> deleteUser(@PathVariable("id") Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("Xoá người dùng thành công", new Object()));
    }

    /**
     * admin06: assign_user (Điều chuyển, phân công công tác nhân viên y tế)
     */
    @PutMapping("/{id}/assign")
    @Operation(summary = "admin06: Phân công công tác nhân viên vào chi nhánh, khoa, phòng")
    public ResponseEntity<ApiResponse<AssignmentResponse>> assignUser(
            @PathVariable("id") Long id,
            @Valid @RequestBody AssignUserRequest request
    ) {
        AssignmentResponse response = adminUserService.assignUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("Phân công thành công", response));
    }
}
