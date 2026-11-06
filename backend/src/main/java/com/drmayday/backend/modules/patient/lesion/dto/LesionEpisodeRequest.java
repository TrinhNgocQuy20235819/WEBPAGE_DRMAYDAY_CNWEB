package com.drmayday.backend.modules.patient.lesion.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LesionEpisodeRequest {

    @JsonProperty("medical_record_id")
    private Long medicalRecordId;

    @JsonProperty("name")
    private String name;

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

    @JsonProperty("description")
    private String description;
}

