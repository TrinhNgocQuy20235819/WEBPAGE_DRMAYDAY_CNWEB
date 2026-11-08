package com.drmayday.backend.modules.patient.lesion.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LesionPhotoResponse {

    @JsonProperty("photo_id")
    private String photoId;

    @JsonProperty("episode_id")
    private String episodeId;

    @JsonProperty("location_id")
    private String locationId;

    @JsonProperty("attachment_id")
    private String attachmentId;

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

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;

    @JsonProperty("attachment")
    private AttachmentInfo attachment;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AttachmentInfo {
        @JsonProperty("attachment_id")
        private String attachmentId;

        @JsonProperty("file_url")
        private String fileUrl;

        @JsonProperty("filename")
        private String filename;

        @JsonProperty("mime_type")
        private String mimeType;

        @JsonProperty("size_bytes")
        private Long sizeBytes;
    }
}

