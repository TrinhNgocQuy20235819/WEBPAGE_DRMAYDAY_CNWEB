package com.drmayday.backend.modules.patient.lesion.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LesionLocationResponse {

    @JsonProperty("location_id")
    private String locationId;

    @JsonProperty("episode_id")
    private String episodeId;

    @JsonProperty("body_part")
    private String bodyPart;

    @JsonProperty("occurred_at")
    private String occurredAt;

    @JsonProperty("context_tags")
    private String contextTags;

    @JsonProperty("context_other")
    private String contextOther;

    @JsonProperty("medication_name")
    private String medicationName;

    @JsonProperty("medication_taken_ago")
    private String medicationTakenAgo;

    @JsonProperty("medication_unit")
    private String medicationUnit;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;
}
