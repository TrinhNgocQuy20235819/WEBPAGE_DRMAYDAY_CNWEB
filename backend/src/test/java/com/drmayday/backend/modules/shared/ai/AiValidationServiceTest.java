package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.entity.TepDinhKemEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class AiValidationServiceTest {

    private AiValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new AiValidationService();
    }

    // A2-008: MIME type validations
    @Test
    void testValidateAttachment_ValidJpeg() {
        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(1L)
                .dinhDangTep("image/jpeg")
                .dungLuongByte(1024L)
                .build();
        assertDoesNotThrow(() -> validationService.validateAttachment(attachment));
    }

    @Test
    void testValidateAttachment_NullAttachmentThrows6001() {
        AppException ex = assertThrows(AppException.class, () -> validationService.validateAttachment(null));
        assertEquals(ErrorCode.MEDIA_FILE_MISSING, ex.getErrorCode());
    }

    @Test
    void testValidateAttachment_NullMimeThrowsUnsupportedMedia() {
        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(2L)
                .dinhDangTep(null)
                .dungLuongByte(1024L)
                .build();
        AppException ex = assertThrows(AppException.class, () -> validationService.validateAttachment(attachment));
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA, ex.getErrorCode());
    }

    @Test
    void testValidateAttachment_PdfMimeThrowsUnsupportedMedia() {
        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(3L)
                .dinhDangTep("application/pdf")
                .dungLuongByte(1024L)
                .build();
        AppException ex = assertThrows(AppException.class, () -> validationService.validateAttachment(attachment));
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA, ex.getErrorCode());
    }

    // A2-008: Declared file size validations
    @Test
    void testValidateAttachment_ZeroDeclaredSizeThrowsInvalidParam() {
        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(4L)
                .dinhDangTep("image/png")
                .dungLuongByte(0L)
                .build();
        AppException ex = assertThrows(AppException.class, () -> validationService.validateAttachment(attachment));
        assertEquals(ErrorCode.INVALID_PARAM, ex.getErrorCode());
    }

    @Test
    void testValidateAttachment_Exceeds5MiBThrowsTooLarge() {
        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(5L)
                .dinhDangTep("image/png")
                .dungLuongByte(6 * 1024 * 1024L) // 6MB
                .build();
        AppException ex = assertThrows(AppException.class, () -> validationService.validateAttachment(attachment));
        assertEquals(ErrorCode.MEDIA_FILE_TOO_LARGE, ex.getErrorCode());
    }

    // A2-008: Physical file size validation
    @Test
    void testValidateAttachment_PhysicalFileExceeds5MiBThrowsTooLarge(@TempDir Path tempDir) throws IOException {
        File largeFile = tempDir.resolve("large-image.jpg").toFile();
        try (FileOutputStream fos = new FileOutputStream(largeFile)) {
            fos.write(new byte[6 * 1024 * 1024]);
        }

        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(6L)
                .dinhDangTep("image/jpeg")
                .dungLuongByte(2048L) // fake declared size
                .duongDanLuuTru(largeFile.getAbsolutePath())
                .build();

        AiProperties properties = new AiProperties(); properties.setMediaRoot(tempDir.toString());
        var env = new org.springframework.mock.env.MockEnvironment(); env.setActiveProfiles("test");
        validationService.validateAttachment(attachment);
        AppException ex = assertThrows(AppException.class, () -> new LocalAiImageReader(properties, env).read(attachment));
        assertEquals(ErrorCode.MEDIA_FILE_TOO_LARGE, ex.getErrorCode());
    }

    // A2-002: Inference result validation
    @Test
    void testValidateInferenceResult_Valid() {
        AiInferenceResult result = AiInferenceResult.builder()
                .hivesCount(10)
                .build();
        assertDoesNotThrow(() -> validationService.validateInferenceResult(result));
    }

    @Test
    void testValidateInferenceResult_NegativeHivesThrows7103() {
        AiInferenceResult result = AiInferenceResult.builder()
                .hivesCount(-1)
                .build();
        AppException ex = assertThrows(AppException.class, () -> validationService.validateInferenceResult(result));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
    }

    @Test
    void testValidateInferenceResult_NullHivesThrows7103() {
        AiInferenceResult result = AiInferenceResult.builder()
                .hivesCount(null)
                .build();
        AppException ex = assertThrows(AppException.class, () -> validationService.validateInferenceResult(result));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
    }
}

