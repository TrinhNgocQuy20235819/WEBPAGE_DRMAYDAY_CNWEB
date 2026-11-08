package com.drmayday.backend.modules.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

public class UserDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateUserRequest {
        @JsonProperty("ffull_name")
        private String ffullName;

        private String fullName;

        public String getEffectiveFullName() {
            if (ffullName != null && !ffullName.trim().isEmpty()) {
                return ffullName.trim();
            }
            return fullName != null ? fullName.trim() : "";
        }

        @NotBlank(message = "Số điện thoại không được để trống")
        private String phone;

        @NotBlank(message = "Mật khẩu không được để trống")
        private String password;

        private String gender; // male, female, other / Nam, Nu

        @NotNull(message = "role_id là bắt buộc")
        @JsonProperty("role_id")
        private Long roleId;

        @JsonProperty("is_active")
        private Integer isActive; // 1: active, 0: locked
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EditUserRequest {
        @JsonProperty("ffull_name")
        private String ffullName;

        private String fullName;

        public String getEffectiveFullName() {
            if (ffullName != null && !ffullName.trim().isEmpty()) {
                return ffullName.trim();
            }
            return fullName != null ? fullName.trim() : null;
        }

        private String gender;

        @JsonProperty("role_id")
        private Long roleId;

        @JsonProperty("is_active")
        private Integer isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssignUserRequest {
        @NotNull(message = "branch_id là bắt buộc")
        @JsonProperty("branch_id")
        private Long branchId;

        @NotNull(message = "department_id là bắt buộc")
        @JsonProperty("department_id")
        private Long departmentId;

        @JsonProperty("room_id")
        private Long roomId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummaryDto {
        @JsonProperty("user_id")
        private Long userId;

        @JsonProperty("ffull_name")
        private String ffullName;

        private String phone;

        @JsonProperty("role_id")
        private Long roleId;

        @JsonProperty("is_active")
        private Integer isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserDetailDto {
        @JsonProperty("user_id")
        private Long userId;

        @JsonProperty("ffull_name")
        private String ffullName;

        private String phone;

        @JsonProperty("role_id")
        private Long roleId;

        @JsonProperty("is_active")
        private Integer isActive;

        private String gender;

        @JsonProperty("year_of_birth")
        private Integer yearOfBirth;

        private String career;

        private String ethnic;

        @JsonProperty("hamlet_address")
        private String hamletAddress;

        @JsonProperty("commune_address")
        private String communeAddress;

        @JsonProperty("city_address")
        private String cityAddress;

        @JsonProperty("work_place")
        private String workPlace;

        @JsonProperty("health_insurance_code")
        private String healthInsuranceCode;

        @JsonProperty("health_insurance_expiry")
        private String healthInsuranceExpiry;

        @JsonProperty("next_of_kin_name")
        private String nextOfKinName;

        @JsonProperty("next_of_kin_phone")
        private String nextOfKinPhone;

        @JsonProperty("first_visit")
        private String firstVisit;

        @JsonProperty("branch_id")
        private Long branchId;

        @JsonProperty("department_id")
        private Long departmentId;

        @JsonProperty("room_id")
        private Long roomId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserListResponse {
        private Long total;
        private List<UserSummaryDto> data;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssignmentResponse {
        @JsonProperty("user_id")
        private Long userId;

        @JsonProperty("branch_id")
        private Long branchId;

        @JsonProperty("department_id")
        private Long departmentId;

        @JsonProperty("room_id")
        private Long roomId;
    }
}
