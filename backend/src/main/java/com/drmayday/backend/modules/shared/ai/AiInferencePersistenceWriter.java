package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.entity.AnhChupTonThuongEntity;
import com.drmayday.backend.modules.patient.lesion.repository.AnhChupTonThuongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Dedicated transactional writer for AI inference results.
 * Solves A2-009 (AOP self-invocation bypass), A2-003 (photo/attachment re-verification),
 * and A2-010 (stale inference race condition).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiInferencePersistenceWriter {

    private final AnhChupTonThuongRepository photoRepo;

    @Transactional
    public void persistInferenceToPhoto(Long photoId, Long expectedAttachmentId, AiInferenceResult result, long requestStartTime) {
        AnhChupTonThuongEntity photo = photoRepo.findLockedById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_PHOTO_NOT_FOUND));

        // Strict association re-verification inside the transaction (A2-003)
        if (expectedAttachmentId != null && !photo.getMaTepDinhKem().equals(expectedAttachmentId)) {
            log.error("Attachment mismatch during persistence: photo {} links attachment {} but inference was for {}",
                    photoId, photo.getMaTepDinhKem(), expectedAttachmentId);
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        // Stale inference concurrency check (A2-010)
        // If the photo was modified after this inference request started, discard the stale result
        if (photo.getThoiDiemCapNhat() != null && requestStartTime > 0 && photo.getThoiDiemCapNhat().toInstant().toEpochMilli() >= requestStartTime) {
            log.warn("Discarding stale AI inference result for photo {}: last updated at {} >= request start time {}",
                    photoId, photo.getThoiDiemCapNhat(), requestStartTime);
            return;
        }

        photo.setSoLuongNotSan(result.getHivesCount());
        if (result.getAnnotatedUrl() != null && !result.getAnnotatedUrl().isBlank()) {
            photo.setUrlAnh(result.getAnnotatedUrl());
        } else {
            // Keep existing or set null cleanly
        }
        photo.setThoiDiemCapNhat(OffsetDateTime.now());
        photoRepo.save(photo);
    }
}
