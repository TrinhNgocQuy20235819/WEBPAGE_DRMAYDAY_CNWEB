package com.drmayday.backend.modules.admin;

import com.drmayday.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "1. Admin & Form Builder Module", description = "Đầu việc 1: Quản trị User, RBAC, Hạ tầng Topology và Dynamic Form Builder")
public class AdminSampleController {

    @GetMapping("/ping")
    @Operation(summary = "Kiểm tra module Admin hoạt động")
    public ApiResponse<Map<String, String>> ping() {
        return ApiResponse.success(Map.of(
                "module", "Admin & Dynamic Form Builder",
                "assignedTo", "Đầu việc 1",
                "slide3", "User Management & RBAC - Operational (15 APIs)",
                "slide4", "Topology Infrastructure - Operational (15 APIs)",
                "slide11", "Dynamic Form Builder - Operational (11 APIs)",
                "status", "Completed"
        ));
    }
}
