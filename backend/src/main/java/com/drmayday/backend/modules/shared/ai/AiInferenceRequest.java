package com.drmayday.backend.modules.shared.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiInferenceRequest {

    @JsonProperty("attachment_id")
    private Long attachmentId;

    @JsonProperty("photo_id")
    private Long photoId;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("filename")
    private String filename;

    @JsonProperty("mime_type")
    private String mimeType;

    private byte[] imageBytes;
}

