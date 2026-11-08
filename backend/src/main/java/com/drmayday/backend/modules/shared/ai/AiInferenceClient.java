package com.drmayday.backend.modules.shared.ai;

public interface AiInferenceClient {
    /**
     * Executes AI inference for a given image request.
     *
     * @param request the AI inference request containing image data or reference
     * @return the result of AI analysis containing hives count and local AUAS
     */
    AiInferenceResult infer(AiInferenceRequest request);
}

