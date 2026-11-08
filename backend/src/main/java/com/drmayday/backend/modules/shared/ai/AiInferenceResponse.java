package com.drmayday.backend.modules.shared.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiInferenceResponse {

    @JsonProperty("photo_id")
    private String photoId;

    @JsonProperty("attachment_id")
    private String attachmentId;

    @JsonProperty("hives_count")
    private Integer hivesCount;

    @JsonProperty("annotated_url")
    private String annotatedUrl;

    @JsonProperty("is_mock")
    private boolean isMock;

    @JsonProperty("service_url")
    private String serviceUrl;

    @JsonProperty("model_name")
    private String modelName;

    @JsonProperty("timings")
    private TimingBreakdown timings;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimingBreakdown {
        @JsonProperty("image_prep_ms")
        private long imagePrepMs;

        @JsonProperty("ai_service_ms")
        private long aiServiceMs;

        @JsonProperty("validation_ms")
        private long validationMs;

        @JsonProperty("db_persist_ms")
        private long dbPersistMs;

        @JsonProperty("total_ms")
        private long totalMs;
    }
}

