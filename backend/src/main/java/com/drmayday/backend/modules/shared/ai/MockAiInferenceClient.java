package com.drmayday.backend.modules.shared.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component("mockAiInferenceClient")
public class MockAiInferenceClient implements AiInferenceClient {

    @Override
    public AiInferenceResult infer(AiInferenceRequest request) {
        log.info("Executing MOCK AI Inference for attachmentId={}", request.getAttachmentId());
        long startTime = System.currentTimeMillis();

        // Deterministic generation based on attachment ID
        long seed = request.getAttachmentId() != null ? request.getAttachmentId() : 42L;
        int hivesCount = (int) (seed % 20); // 0 to 19

        long latency = Math.max(15, System.currentTimeMillis() - startTime + 25);

        return AiInferenceResult.builder()
                .hivesCount(hivesCount)
                .annotatedUrl("mock://ai.drmayday.local/annotated/" + seed + ".jpg")
                .isMock(true)
                .serviceUrl("mock://internal-inference-adapter")
                .latencyMs(latency)
                .modelName("drmayday-mock-inference-v1")
                .build();
    }
}

