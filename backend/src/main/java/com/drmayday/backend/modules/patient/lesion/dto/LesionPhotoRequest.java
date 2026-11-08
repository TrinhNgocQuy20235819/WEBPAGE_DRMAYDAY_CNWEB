package com.drmayday.backend.modules.patient.lesion.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LesionPhotoRequest {

    @JsonProperty("episode_id")
    private Long episodeId;

    @JsonProperty("location_id")
    private Long locationId;

    @JsonProperty("attachment_id")
    private Long attachmentId;

    @JsonProperty("taken_at")
    private String takenAt;

    @JsonProperty("milestone")
    private String milestone;

    @JsonProperty("itch_score")
    private Short itchScore;

    @JsonProperty("pain_score")
    private Short painScore;

    @JsonProperty("burn_score")
    private Short burnScore;

    @JsonProperty("hives_count")
    private Integer hivesCount;

    @JsonProperty("annotated_url")
    private String annotatedUrl;
}

