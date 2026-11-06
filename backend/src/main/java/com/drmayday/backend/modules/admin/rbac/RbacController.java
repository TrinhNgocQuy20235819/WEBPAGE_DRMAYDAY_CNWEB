package com.drmayday.backend.modules.admin.rbac;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.security.entity.*;
import java.util.*;
@RestController
@RequestMapping("/api/v1/admin/rbac")
public class RbacController {
    private final RbacService service;
    public RbacController(RbacService service) { this.service = service; }
    public record RoleInput(@NotBlank @Size(max=100) @Pattern(regexp="[A-Za-z0-9_:.\\-]+") String name,
                            @NotBlank @Size(max=200) String displayName) { }
    public record PermissionInput(@NotBlank @Size(max=100) @Pattern(regexp="[A-Za-z0-9_:.\\-]+") String name,
                                  @Size(max=100) String group) { }
    @GetMapping("/roles") public ApiResponse<List<VaiTroEntity>> roles() { return ApiResponse.success(service.roles()); }
    @PostMapping("/roles") public ResponseEntity<ApiResponse<VaiTroEntity>> createRole(@Valid @RequestBody RoleInput input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createRole(input.name(), input.displayName())));
    }
    @GetMapping("/permissions") public ApiResponse<List<QuyenHanEntity>> permissions() { return ApiResponse.success(service.permissions()); }
    @PostMapping("/permissions") public ResponseEntity<ApiResponse<QuyenHanEntity>> createPermission(@Valid @RequestBody PermissionInput input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createPermission(input.name(), input.group())));
    }
    @PutMapping("/permissions/{id}") public ApiResponse<QuyenHanEntity> updatePermission(@PathVariable Long id, @Valid @RequestBody PermissionInput input) {
        return ApiResponse.success(service.updatePermission(id, input.name(), input.group()));
    }
    @DeleteMapping("/permissions/{id}") public ApiResponse<Void> deletePermission(@PathVariable Long id) {
        service.deletePermission(id); return ApiResponse.success(null);
    }
    @GetMapping("/roles/{roleId}/permissions") public ApiResponse<Set<QuyenHanEntity>> rolePermissions(@PathVariable Long roleId) {
        return ApiResponse.success(service.rolePermissions(roleId));
    }
    @PutMapping("/roles/{roleId}/permissions/{permissionId}") public ApiResponse<Void> grant(@PathVariable Long roleId, @PathVariable Long permissionId) {
        service.assign(roleId, permissionId, true); return ApiResponse.success(null);
    }
    @DeleteMapping("/roles/{roleId}/permissions/{permissionId}") public ApiResponse<Void> revoke(@PathVariable Long roleId, @PathVariable Long permissionId) {
        service.assign(roleId, permissionId, false); return ApiResponse.success(null);
    }
}
