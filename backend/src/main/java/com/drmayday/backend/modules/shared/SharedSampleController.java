package com.drmayday.backend.modules.shared;

import com.drmayday.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/shared")
@Tag(name = "4. Shared Infrastructure & AI Module", description = "Đầu việc 4: Tích hợp AI Inference; Media S3/MinIO và Firebase Push được hoãn")
public class SharedSampleController {

    @GetMapping("/ping")
    @Operation(summary = "Kiểm tra module Shared & Infra hoạt động")
    public ApiResponse<Map<String, String>> ping() {
        return ApiResponse.success(Map.of(
                "module", "Shared Infrastructure & AI Gateway",
                "assignedTo", "Đầu việc 4",
                "status", "Ready for development"
        ));
    }
}
