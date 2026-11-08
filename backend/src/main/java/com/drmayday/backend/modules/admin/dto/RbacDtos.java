package com.drmayday.backend.modules.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

public class RbacDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRoleRequest {
        @NotBlank(message = "Tên vai trò không được để trống")
        private String name;

        private String description;

        @JsonProperty("parent_role_id")
        private Long parentRoleId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoleResponse {
        private Long id;
        private String name;
        private String description;

        @JsonProperty("parent_role_id")
        private Long parentRoleId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreatePermissionRequest {
        @NotBlank(message = "Tên quyền hạn không được để trống")
        private String name;

        private String description;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditPermissionRequest {
        private String name;
        private String description;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PermissionResponse {
        private Long id;
        private String name;
        private String description;

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
    public static class AssignRolePermissionsRequest {
        @NotNull(message = "role_id là bắt buộc")
        @JsonProperty("role_id")
        private Long roleId;

        @NotNull(message = "Danh sách quyền permissions là bắt buộc")
        private List<Long> permissions;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RolePermissionItemResponse {
        @JsonProperty("role_permission_id")
        private Long rolePermissionId;

        @JsonProperty("permission_id")
        private Long permissionId;

        private String name;
        private String description;

        @JsonProperty("assigned_at")
        private String assignedAt;
    }
}
