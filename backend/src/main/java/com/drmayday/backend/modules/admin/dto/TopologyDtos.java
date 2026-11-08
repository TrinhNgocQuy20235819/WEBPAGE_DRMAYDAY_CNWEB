package com.drmayday.backend.modules.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

public class TopologyDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateBranchRequest {
        @NotBlank(message = "Tên chi nhánh không được để trống")
        private String name;

        @NotBlank(message = "Địa chỉ chi nhánh không được để trống")
        private String address;

        @NotBlank(message = "Số điện thoại không được để trống")
        private String phone;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditBranchRequest {
        private String name;
        private String address;
        private String phone;

        @JsonProperty("is_active")
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BranchResponse {
        private Long id;
        private String name;
        private String address;
        private String phone;

        @JsonProperty("is_active")
        private Boolean isActive;

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
    public static class CreateDepartmentRequest {
        @NotBlank(message = "Tên chuyên khoa không được để trống")
        private String name;

        private String description;

        @NotNull(message = "branch_id là bắt buộc")
        @JsonProperty("branch_id")
        private Long branchId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditDepartmentRequest {
        private String name;
        private String description;

        @JsonProperty("branch_id")
        private Long branchId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DepartmentResponse {
        private Long id;
        private String name;

        @JsonProperty("branch_id")
        private Long branchId;

        private String description;

        @JsonProperty("created_at")
        private String createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRoomRequest {
        @NotBlank(message = "Tên phòng khám không được để trống")
        private String name;

        private String description;

        @NotNull(message = "department_id là bắt buộc")
        @JsonProperty("department_id")
        private Long departmentId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditRoomRequest {
        private String name;
        private String description;

        @JsonProperty("department_id")
        private Long departmentId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomResponse {
        private Long id;
        private String name;

        @JsonProperty("department_id")
        private Long departmentId;

        private String description;

        @JsonProperty("created_at")
        private String createdAt;
    }
}
