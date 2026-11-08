package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.entity.TepDinhKemEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Set;

@Slf4j
@Service
public class AiValidationService {

    public static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    /**
     * Validates attachment format, size, and type for AI inference.
     * Fixes A2-008: strictly enforces validated image content/type and bounded payload.
     */
    public void validateAttachment(TepDinhKemEntity attachment) {
        if (attachment == null) {
            throw new AppException(ErrorCode.MEDIA_FILE_MISSING);
        }

        // Validate metadata MIME type (must not be null or blank, must be supported)
        String mime = attachment.getDinhDangTep();
        if (mime == null || mime.isBlank()) {
            log.warn("Attachment {} has missing MIME type", attachment.getMaTepDinhKem());
            throw new AppException(ErrorCode.UNSUPPORTED_MEDIA);
        }
        String normalizedMime = mime.toLowerCase().trim();
        if (!ALLOWED_MIME_TYPES.contains(normalizedMime)) {
            log.warn("Unsupported attachment MIME type: {}", mime);
            throw new AppException(ErrorCode.UNSUPPORTED_MEDIA);
        }

        // Validate declared file size
        Long declaredSize = attachment.getDungLuongByte();
        if (declaredSize == null || declaredSize <= 0) {
            log.warn("Attachment {} has invalid declared size: {}", attachment.getMaTepDinhKem(), declaredSize);
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        if (declaredSize > MAX_IMAGE_SIZE_BYTES) {
            log.warn("Attachment {} exceeds max size: {} bytes", attachment.getMaTepDinhKem(), declaredSize);
            throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE);
        }

        // Physical reads are confined to the configured root by LocalAiImageReader.
    }

    /**
     * Validates AI inference output values.
     * Fixes A2-002: checks non-null, integer >= 0 for hives_count.
     */
    public void validateInferenceResult(AiInferenceResult result) {
        if (result == null) {
            throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
        }

        if (result.getHivesCount() == null || result.getHivesCount() < 0) {
            log.error("Invalid hivesCount from AI: {}", result.getHivesCount());
            throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
        }
    }
}
