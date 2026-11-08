package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.entity.AnhChupTonThuongEntity;
import com.drmayday.backend.modules.patient.lesion.entity.TepDinhKemEntity;
import com.drmayday.backend.modules.patient.lesion.repository.AnhChupTonThuongRepository;
import com.drmayday.backend.modules.patient.lesion.repository.TepDinhKemRepository;
import com.drmayday.backend.modules.patient.lesion.service.LesionTrackingService;
import com.drmayday.backend.security.service.AccountPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Slf4j
@Service
@RequiredArgsConstructor
public class AiInferenceService {

    private final AiInferenceClient aiClient;
    private final AiValidationService validationService;
    private final LesionTrackingService lesionTrackingService;
    private final TepDinhKemRepository attachmentRepo;
    private final AnhChupTonThuongRepository photoRepo;
    private final AiInferencePersistenceWriter persistenceWriter;
    private final LocalAiImageReader imageReader;

    public AiInferenceResponse analyzePhoto(AccountPrincipal principal, Long photoId) {
        if (photoId == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        Long patientId = lesionTrackingService.resolvePatientId(principal);
        AnhChupTonThuongEntity photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_PHOTO_NOT_FOUND));

        lesionTrackingService.validatePhotoOwnership(photo, patientId, principal.getAccountId());
        return analyzeAttachment(principal, photo.getMaTepDinhKem(), photoId);
    }

    public AiInferenceResponse analyzeAttachment(AccountPrincipal principal, Long attachmentId, Long photoId) {
        long tStart = System.currentTimeMillis();
        if (attachmentId == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        Long patientId = lesionTrackingService.resolvePatientId(principal);

        // 1. Fetch & validate attachment
        TepDinhKemEntity attachment = attachmentRepo.findById(attachmentId)
                .orElseThrow(() -> new AppException(ErrorCode.MEDIA_FILE_MISSING));

        lesionTrackingService.validateAttachmentOwnership(attachment, principal.getAccountId(), patientId);
        validationService.validateAttachment(attachment);

        // 2. Fetch & validate photo if provided (Fix A2-003: strict association check)
        if (photoId != null) {
            AnhChupTonThuongEntity photo = photoRepo.findById(photoId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESION_PHOTO_NOT_FOUND));
            lesionTrackingService.validatePhotoOwnership(photo, patientId, principal.getAccountId());

            if (!photo.getMaTepDinhKem().equals(attachmentId)) {
                log.warn("Attachment {} does not belong to photo {}", attachmentId, photoId);
                throw new AppException(ErrorCode.INVALID_PARAM);
            }
        }

        // 3. Prepare image data (Fix A2-001 & A2-008: real bounded image read without fake placeholder)
        byte[] imageBytes = prepareImageBytes(attachment);
        long tPrepared = System.currentTimeMillis();
        long imagePrepMs = tPrepared - tStart;

        AiInferenceRequest aiRequest = AiInferenceRequest.builder()
                .attachmentId(attachmentId)
                .photoId(photoId)
                .filename(attachment.getTenTepGoc())
                .mimeType(attachment.getDinhDangTep())
                .imageUrl(attachment.getDuongDanUrl())
                .imageBytes(imageBytes)
                .build();

        // 4. Call external AI Service (No active DB transaction)
        AiInferenceResult aiResult = aiClient.infer(aiRequest);
        long tInferred = System.currentTimeMillis();
        long aiServiceMs = tInferred - tPrepared;

        // 5. Validate AI inference result (Fix A2-002 & A2-005)
        validationService.validateInferenceResult(aiResult);
        long tValidated = System.currentTimeMillis();
        long validationMs = tValidated - tInferred;

        // 6. Persist results via dedicated transactional writer (Fix A2-009, A2-003, A2-010)
        if (photoId != null) {
            persistenceWriter.persistInferenceToPhoto(photoId, attachmentId, aiResult, tStart);
        }
        long tPersisted = System.currentTimeMillis();
        long dbPersistMs = tPersisted - tValidated;
        long totalMs = tPersisted - tStart;

        // Fix A2-017: Redacted log
        log.info("Inference completed for attachmentId={}, photoId={}: totalMs={}ms", attachmentId, photoId, totalMs);

        return AiInferenceResponse.builder()
                .photoId(photoId != null ? photoId.toString() : null)
                .attachmentId(attachmentId.toString())
                .hivesCount(aiResult.getHivesCount())
                .annotatedUrl(aiResult.getAnnotatedUrl())
                .isMock(aiResult.isMock())
                .serviceUrl(aiResult.getServiceUrl())
                .modelName(aiResult.getModelName())
                .timings(AiInferenceResponse.TimingBreakdown.builder()
                        .imagePrepMs(imagePrepMs)
                        .aiServiceMs(aiServiceMs)
                        .validationMs(validationMs)
                        .dbPersistMs(dbPersistMs)
                        .totalMs(totalMs)
                        .build())
                .build();
    }

    @Transactional
    public void persistInferenceToPhoto(Long photoId, AiInferenceResult result) {
        persistenceWriter.persistInferenceToPhoto(photoId, null, result, 0L);
    }

    private byte[] prepareImageBytes(TepDinhKemEntity attachment) {
        return imageReader.read(attachment);
    }
}
