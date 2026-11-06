package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.entity.AnhChupTonThuongEntity;
import com.drmayday.backend.modules.patient.lesion.entity.TepDinhKemEntity;
import com.drmayday.backend.modules.patient.lesion.repository.AnhChupTonThuongRepository;
import com.drmayday.backend.modules.patient.lesion.repository.TepDinhKemRepository;
import com.drmayday.backend.modules.patient.lesion.service.LesionTrackingService;
import com.drmayday.backend.security.service.AccountPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AiInferenceServiceTest {

    @Mock private AiInferenceClient aiClient;
    @Mock private AiValidationService validationService;
    @Mock private LesionTrackingService lesionTrackingService;
    @Mock private TepDinhKemRepository attachmentRepo;
    @Mock private AnhChupTonThuongRepository photoRepo;
    @Mock private AiInferencePersistenceWriter persistenceWriter;

    private AiInferenceService aiInferenceService;
    @TempDir Path mediaRoot;

    private AccountPrincipal patientPrincipal;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        AiProperties properties = new AiProperties();
        properties.setMediaRoot(mediaRoot.toString());
        var env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("test");
        aiInferenceService = new AiInferenceService(aiClient, validationService, lesionTrackingService,
                attachmentRepo, photoRepo, persistenceWriter, new LocalAiImageReader(properties, env));
        patientPrincipal = new AccountPrincipal(1L, 10L, "patientA", "pwd", true, List.of());
        when(lesionTrackingService.resolvePatientId(patientPrincipal)).thenReturn(100L);
    }

    @Test
    void testAnalyzePhoto_SuccessAndCallsPersistenceWriter(@TempDir Path tempDir) throws IOException {
        Long photoId = 55L;
        Long attachmentId = 77L;

        File imgFile = mediaRoot.resolve("test-image.jpg").toFile();
        BufferedImage img = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        ImageIO.write(img, "jpg", imgFile);

        AnhChupTonThuongEntity photo = AnhChupTonThuongEntity.builder()
                .maAnh(photoId)
                .maTepDinhKem(attachmentId)
                .thoiDiemChup(OffsetDateTime.now())
                .mocTienTrien("start")
                .build();
        when(photoRepo.findById(photoId)).thenReturn(Optional.of(photo));

        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(attachmentId)
                .maTaiKhoan(1L)
                .tenTepGoc("lesion_arm.jpg")
                .duongDanLuuTru(imgFile.getAbsolutePath())
                .dinhDangTep("image/jpeg")
                .dungLuongByte(imgFile.length())
                .build();
        when(attachmentRepo.findById(attachmentId)).thenReturn(Optional.of(attachment));

        AiInferenceResult aiResult = AiInferenceResult.builder()
                .hivesCount(12)
                .annotatedUrl("http://ai/ann_55.jpg")
                .isMock(false)
                .serviceUrl("http://127.0.0.1:5050/api/v1/predict")
                .latencyMs(120)
                .modelName("urticaria-v1")
                .build();
        when(aiClient.infer(any())).thenReturn(aiResult);

        AiInferenceResponse response = aiInferenceService.analyzePhoto(patientPrincipal, photoId);

        assertNotNull(response);
        assertEquals(photoId.toString(), response.getPhotoId());
        assertEquals(attachmentId.toString(), response.getAttachmentId());
        assertEquals(12, response.getHivesCount());
        assertEquals("http://ai/ann_55.jpg", response.getAnnotatedUrl());
        assertFalse(response.isMock());
        assertNotNull(response.getTimings());
        assertTrue(response.getTimings().getTotalMs() >= 0);

        // Verify persistence writer was invoked
        verify(persistenceWriter, times(1)).persistInferenceToPhoto(eq(photoId), eq(attachmentId), eq(aiResult), anyLong());
    }

    // A2-003 Regression: Photo has different attachment than request
    @Test
    void testAnalyzeAttachment_PhotoAttachmentMismatchThrowsInvalidParam() {
        Long photoId = 55L;
        Long requestedAttachmentId = 77L;
        Long actualAttachmentId = 88L;

        AnhChupTonThuongEntity photo = AnhChupTonThuongEntity.builder()
                .maAnh(photoId)
                .maTepDinhKem(actualAttachmentId) // mismatch!
                .build();
        when(photoRepo.findById(photoId)).thenReturn(Optional.of(photo));

        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(requestedAttachmentId)
                .maTaiKhoan(1L)
                .build();
        when(attachmentRepo.findById(requestedAttachmentId)).thenReturn(Optional.of(attachment));

        AppException ex = assertThrows(AppException.class,
                () -> aiInferenceService.analyzeAttachment(patientPrincipal, requestedAttachmentId, photoId));
        assertEquals(ErrorCode.INVALID_PARAM, ex.getErrorCode());
    }

    // A2-001 Regression: Missing physical file on disk throws MEDIA_FILE_MISSING (no 27-byte fake fallback)
    @Test
    void testAnalyzeAttachment_MissingPhysicalStorageFileThrows6001() {
        Long attachmentId = 99L;
        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(attachmentId)
                .maTaiKhoan(1L)
                .tenTepGoc("nonexistent.jpg")
                .duongDanLuuTru("nonexistent/path/on/disk.jpg")
                .dinhDangTep("image/jpeg")
                .dungLuongByte(2048L)
                .build();
        when(attachmentRepo.findById(attachmentId)).thenReturn(Optional.of(attachment));

        AppException ex = assertThrows(AppException.class,
                () -> aiInferenceService.analyzeAttachment(patientPrincipal, attachmentId, null));
        assertEquals(ErrorCode.MEDIA_FILE_MISSING, ex.getErrorCode());
        assertEquals(6001, ex.getErrorCode().getCode());
    }

    @Test
    void testAnalyzePhoto_NotFoundThrows7002() {
        when(photoRepo.findById(999L)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> aiInferenceService.analyzePhoto(patientPrincipal, 999L));
        assertEquals(ErrorCode.LESION_PHOTO_NOT_FOUND, ex.getErrorCode());
        assertEquals(7002, ex.getErrorCode().getCode());
    }

    @Test
    void testAnalyzeAttachment_MissingAttachmentThrows6001() {
        when(attachmentRepo.findById(888L)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> aiInferenceService.analyzeAttachment(patientPrincipal, 888L, null));
        assertEquals(ErrorCode.MEDIA_FILE_MISSING, ex.getErrorCode());
        assertEquals(6001, ex.getErrorCode().getCode());
    }
}
