package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Primary
@Component
public class AiInferenceAdapter implements AiInferenceClient {

    private final AiProperties properties;
    private final HttpAiInferenceClient httpClient;
    private final MockAiInferenceClient mockClient;
    private final Environment environment;

    @Autowired
    public AiInferenceAdapter(AiProperties properties,
                              HttpAiInferenceClient httpClient,
                              MockAiInferenceClient mockClient,
                              @Autowired(required = false) Environment environment) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.mockClient = mockClient;
        this.environment = environment;
    }

    public AiInferenceAdapter(AiProperties properties,
                              HttpAiInferenceClient httpClient,
                              MockAiInferenceClient mockClient) {
        this(properties, httpClient, mockClient, null);
    }

    @PostConstruct
    public void validateModeAtStartup() {
        if ("mock".equalsIgnoreCase(properties.getMode())) {
            if (isProductionEnvironment()) {
                throw new IllegalStateException("FATAL: AI Mock mode is forbidden in production environment!");
            }
        }
    }

    private boolean isProductionEnvironment() {
        if (environment == null) {
            return false;
        }
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        if (activeProfiles.contains("prod") || activeProfiles.contains("production")) return true;
        if (activeProfiles.contains("test") || activeProfiles.contains("security-test") || activeProfiles.contains("dev") || activeProfiles.contains("local")) {
            return false;
        }
        return true;
    }

    @Override
    public AiInferenceResult infer(AiInferenceRequest request) {
        String mode = properties.getMode();
        if ("mock".equalsIgnoreCase(mode)) {
            // Fix A2-006: Fail-closed guard against synthetic data in production
            if (isProductionEnvironment() || !properties.isAllowMock()) {
                log.error("AI mock mode requested but forbidden in this environment (allowMock={})", properties.isAllowMock());
                throw new AppException(ErrorCode.AI_SERVICE_UNAVAILABLE);
            }
            log.warn("Using Mock AI Inference Client (mode=mock, synthetic data)");
            return mockClient.infer(request);
        }

        log.debug("Using HTTP Live AI Inference Client (mode=live)");
        return httpClient.infer(request);
    }
}
