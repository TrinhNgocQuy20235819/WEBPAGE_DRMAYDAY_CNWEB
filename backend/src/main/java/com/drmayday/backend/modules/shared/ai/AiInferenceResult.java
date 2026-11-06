package com.drmayday.backend.modules.shared.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiInferenceResult {

    @JsonProperty("hives_count")
    private Integer hivesCount;

    @JsonProperty("annotated_url")
    private String annotatedUrl;

    @JsonProperty("is_mock")
    private boolean isMock;

    @JsonProperty("service_url")
    private String serviceUrl;

    @JsonProperty("latency_ms")
    private long latencyMs;

    @JsonProperty("model_name")
    private String modelName;
}

