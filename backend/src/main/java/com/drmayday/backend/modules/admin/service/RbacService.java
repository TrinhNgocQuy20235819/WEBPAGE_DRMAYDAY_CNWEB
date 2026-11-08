package com.drmayday.backend.modules.admin.service;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.admin.dto.RbacDtos.*;
import com.drmayday.backend.modules.admin.model.AdminDataStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RbacService {

    private final AdminDataStore dataStore;
    private final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * role01: set_role - Tạo vai trò mới kèm parent_role_id
     */
    public RoleResponse createRole(CreateRoleRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Tên vai trò không được để trống");
        }

        String name = request.getName().trim();
        boolean exists = dataStore.roles.values().stream()
                .anyMatch(r -> name.equalsIgnoreCase(r.getName()));
        if (exists) {
            throw new AppException(ErrorCode.ROLE_NAME_EXISTS);
        }

        if (request.getParentRoleId() != null && !dataStore.roles.containsKey(request.getParentRoleId())) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "parent_role_id không tồn tại");
        }

        long newId = dataStore.roleIdGen.incrementAndGet();
        RoleResponse newRole = RoleResponse.builder()
                .id(newId)
                .name(name)
                .description(request.getDescription())
                .parentRoleId(request.getParentRoleId())
                .build();

        dataStore.roles.put(newId, newRole);
        dataStore.rolePermissions.put(newId, new HashSet<>());
        dataStore.saveToFile();
        return newRole;
    }

    /**
     * role02: get_role - Lấy danh sách tất cả các vai trò
     */
    public List<RoleResponse> getRoles() {
        return new ArrayList<>(dataStore.roles.values());
    }

    /**
     * perm01: set_permission - Tạo quyền hạn mới
     */
    public PermissionResponse createPermission(CreatePermissionRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Tên quyền hạn không được để trống");
        }

        String name = request.getName().trim();
        boolean exists = dataStore.permissions.values().stream()
                .anyMatch(p -> name.equalsIgnoreCase(p.getName()));
        if (exists) {
            throw new AppException(ErrorCode.PERMISSION_NAME_EXISTS);
        }

        long newId = dataStore.permIdGen.incrementAndGet();
        String now = LocalDateTime.now().format(formatter);

        PermissionResponse perm = PermissionResponse.builder()
                .id(newId)
                .name(name)
                .description(request.getDescription())
                .createdAt(now)
                .updatedAt(now)
                .build();

        dataStore.permissions.put(newId, perm);
        dataStore.saveToFile();
        return perm;
    }

    /**
     * perm02: get_list_permissions - Liệt kê tất cả các quyền hạn
     */
    public List<PermissionResponse> getPermissions() {
        return new ArrayList<>(dataStore.permissions.values());
    }

    /**
     * perm03: edit_permission - Chỉnh sửa thông tin quyền
     */
    public PermissionResponse editPermission(Long id, EditPermissionRequest request) {
        if (id == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        PermissionResponse existing = dataStore.permissions.get(id);
        if (existing == null) {
            throw new AppException(ErrorCode.PERMISSION_NOT_FOUND);
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        existing.setUpdatedAt(LocalDateTime.now().format(formatter));

        dataStore.permissions.put(id, existing);
        dataStore.saveToFile();
        return existing;
    }

    /**
     * perm04: delete_permission - Xóa một quyền hạn (CASCADE xóa khỏi role_permissions)
     */
    public void deletePermission(Long id) {
        if (id == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        PermissionResponse removed = dataStore.permissions.remove(id);
        if (removed == null) {
            throw new AppException(ErrorCode.PERMISSION_NOT_FOUND);
        }

        // Tự động thu hồi quyền này ở tất cả các role (ON DELETE CASCADE)
        for (Set<Long> permSet : dataStore.rolePermissions.values()) {
            permSet.remove(id);
        }
        dataStore.saveToFile();
    }

    /**
     * roleperm01: set_role_permissions - Cấp một mảng quyền cho một vai trò
     */
    public void assignRolePermissions(AssignRolePermissionsRequest request) {
        if (request == null || request.getRoleId() == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        if (!dataStore.roles.containsKey(request.getRoleId())) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }

        Set<Long> currentPerms = dataStore.rolePermissions.computeIfAbsent(request.getRoleId(), k -> new HashSet<>());
        if (request.getPermissions() != null) {
            for (Long permId : request.getPermissions()) {
                if (dataStore.permissions.containsKey(permId)) {
                    currentPerms.add(permId);
                }
            }
        }
        dataStore.saveToFile();
    }

    /**
     * roleperm02: get_role_permissions - Xem vai trò đang được cấp những quyền nào
     */
    public List<RolePermissionItemResponse> getRolePermissions(Long roleId) {
        if (roleId == null || !dataStore.roles.containsKey(roleId)) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }

        Set<Long> permIds = dataStore.rolePermissions.getOrDefault(roleId, Collections.emptySet());
        String now = LocalDateTime.now().format(formatter);

        return permIds.stream().map(pid -> {
            PermissionResponse p = dataStore.permissions.get(pid);
            String name = (p != null) ? p.getName() : "Quyền #" + pid;
            String desc = (p != null) ? p.getDescription() : "";
            return RolePermissionItemResponse.builder()
                    .rolePermissionId(pid)
                    .permissionId(pid)
                    .name(name)
                    .description(desc)
                    .assignedAt(now)
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * roleperm03: delete_role_permissions - Thu hồi một quyền khỏi vai trò
     */
    public void revokeRolePermission(Long roleId, Long permissionId) {
        if (roleId == null || permissionId == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        if (!dataStore.roles.containsKey(roleId)) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }

        Set<Long> currentPerms = dataStore.rolePermissions.get(roleId);
        if (currentPerms != null) {
            currentPerms.remove(permissionId);
        }
        dataStore.saveToFile();
    }
}
