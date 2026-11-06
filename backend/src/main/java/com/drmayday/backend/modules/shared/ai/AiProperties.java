package com.drmayday.backend.modules.shared.ai;

import lombok.Data;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "ai.service")
public class AiProperties {
    /**
     * Base URL of AI Inference Service (e.g. http://127.0.0.1:5050)
     */
    private String baseUrl = "http://127.0.0.1:5050";

    /**
     * Endpoint path for prediction (e.g. /api/v1/predict)
     */
    private String endpoint = "/api/v1/predict";

    /**
     * Optional API key or bearer token for AI Service
     */
    @ToString.Exclude
    private String apiKey = "";

    private String provider = "generic";
    private String model = "gemini-2.5-flash";
    private String mediaRoot = "";

    /**
     * Connect timeout in milliseconds (default: 3000ms, adhering to 3-5s SLA)
     */
    private int connectTimeoutMs = 3000;

    /**
     * Read timeout in milliseconds (default: 5000ms, adhering to 3-5s SLA)
     */
    private int readTimeoutMs = 5000;

    /**
     * Operating mode: "live" (calls HTTP endpoint) or "mock" (internal deterministic generator)
     */
    private String mode = "live";

    /**
     * Fail-closed guard: whether mock mode is explicitly allowed in this environment.
     * Default: false (Fix A2-006).
     */
    private boolean allowMock = false;

    /**
     * Max retries for transient idempotent calls
     */
    private int maxRetries = 0;
}

