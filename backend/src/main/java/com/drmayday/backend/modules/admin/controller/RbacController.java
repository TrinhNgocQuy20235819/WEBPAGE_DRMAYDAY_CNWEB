package com.drmayday.backend.modules.admin.controller;

import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.modules.admin.dto.RbacDtos.*;
import com.drmayday.backend.modules.admin.service.RbacService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("slide3RbacController")
@RequestMapping("/api/v1")
@Tag(name = "1. Slide 3: RBAC & Permissions", description = "Quản lý Vai trò (Roles), Quyền hạn (Permissions) và Cấp/Thu hồi quyền")
public class RbacController {

    private final RbacService rbacService;

    public RbacController(@Qualifier("slide3RbacService") RbacService rbacService) {
        this.rbacService = rbacService;
    }

    // ==========================================
    // 1. QUẢN LÝ VAI TRÒ (ROLES)
    // ==========================================

    @PostMapping("/roles")
    @Operation(summary = "role01: Tạo vai trò mới")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(@Valid @RequestBody CreateRoleRequest request) {
        RoleResponse created = rbacService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/roles")
    @Operation(summary = "role02: Lấy danh sách tất cả vai trò")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getRoles() {
        List<RoleResponse> list = rbacService.getRoles();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // ==========================================
    // 2. QUẢN LÝ QUYỀN HẠN (PERMISSIONS)
    // ==========================================

    @PostMapping("/permissions")
    @Operation(summary = "perm01: Tạo quyền hạn mới")
    public ResponseEntity<ApiResponse<PermissionResponse>> createPermission(@Valid @RequestBody CreatePermissionRequest request) {
        PermissionResponse created = rbacService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/permissions")
    @Operation(summary = "perm02: Danh sách quyền hạn khả dụng")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissions() {
        List<PermissionResponse> list = rbacService.getPermissions();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PutMapping("/permissions/{id}")
    @Operation(summary = "perm03: Chỉnh sửa thông tin quyền hạn")
    public ResponseEntity<ApiResponse<PermissionResponse>> editPermission(
            @PathVariable("id") Long id,
            @RequestBody EditPermissionRequest request
    ) {
        PermissionResponse updated = rbacService.editPermission(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/permissions/{id}")
    @Operation(summary = "perm04: Xóa quyền hạn khỏi hệ thống")
    public ResponseEntity<ApiResponse<Object>> deletePermission(@PathVariable("id") Long id) {
        rbacService.deletePermission(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa quyền hạn thành công", new Object()));
    }

    // ==========================================
    // 3. CẤP VÀ THU HỒI QUYỀN (ROLE_PERMISSIONS)
    // ==========================================

    @PostMapping("/role_permissions")
    @Operation(summary = "roleperm01: Cấp quyền hạn cho vai trò")
    public ResponseEntity<ApiResponse<Object>> assignRolePermissions(@Valid @RequestBody AssignRolePermissionsRequest request) {
        rbacService.assignRolePermissions(request);
        return ResponseEntity.ok(ApiResponse.success("Gán quyền thành công", new Object()));
    }

    @GetMapping("/role_permissions/{roleId}")
    @Operation(summary = "roleperm02: Lấy danh sách quyền hạn đã cấp cho vai trò")
    public ResponseEntity<ApiResponse<List<RolePermissionItemResponse>>> getRolePermissions(@PathVariable("roleId") Long roleId) {
        List<RolePermissionItemResponse> list = rbacService.getRolePermissions(roleId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @DeleteMapping("/role_permissions/{roleId}/{permissionId}")
    @Operation(summary = "roleperm03: Thu hồi quyền hạn khỏi vai trò")
    public ResponseEntity<ApiResponse<Object>> revokeRolePermission(
            @PathVariable("roleId") Long roleId,
            @PathVariable("permissionId") Long permissionId
    ) {
        rbacService.revokeRolePermission(roleId, permissionId);
        return ResponseEntity.ok(ApiResponse.success("Thu hồi quyền thành công", new Object()));
    }
}
