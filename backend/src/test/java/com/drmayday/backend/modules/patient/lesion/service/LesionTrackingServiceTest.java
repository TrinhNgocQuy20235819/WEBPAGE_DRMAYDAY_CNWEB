package com.drmayday.backend.modules.patient.lesion.service;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.dto.*;
import com.drmayday.backend.modules.patient.lesion.entity.*;
import com.drmayday.backend.modules.patient.lesion.repository.*;
import com.drmayday.backend.modules.shared.ai.AiValidationService;
import com.drmayday.backend.security.entity.TaiKhoanEntity;
import com.drmayday.backend.security.repository.SecurityAccountRepository;
import com.drmayday.backend.security.service.AccountPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LesionTrackingServiceTest {

    @Mock private DotTonThuongDaRepository episodeRepo;
    @Mock private ViTriTonThuongRepository locationRepo;
    @Mock private AnhChupTonThuongRepository photoRepo;
    @Mock private TepDinhKemRepository attachmentRepo;
    @Mock private HoSoBenhAnRepository medicalRecordRepo;
    @Mock private SecurityAccountRepository accountRepo;
    @Mock private BenhNhanRepository patientRepo;
    @Mock private AiValidationService validationService;

    @InjectMocks private LesionTrackingService service;

    private AccountPrincipal patientPrincipal;
    private AccountPrincipal otherPatientPrincipal;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        patientPrincipal = new AccountPrincipal(1L, 10L, "patientA", "pwd", true, List.of());
        otherPatientPrincipal = new AccountPrincipal(2L, 10L, "patientB", "pwd", true, List.of());

        TaiKhoanEntity accountA = new TaiKhoanEntity(1L, 100L, null, "patientA", "pwd", true);
        TaiKhoanEntity accountB = new TaiKhoanEntity(2L, 200L, null, "patientB", "pwd", true);

        when(accountRepo.findById(1L)).thenReturn(Optional.of(accountA));
        when(accountRepo.findById(2L)).thenReturn(Optional.of(accountB));
        when(patientRepo.existsById(anyLong())).thenReturn(true);
        when(medicalRecordRepo.existsByMaBenhNhanAndTrangThaiNotIn(eq(100L), any())).thenReturn(true);
    }

    @Test
    void testCreateEpisode_Success() {
        Long recordId = 500L;
        HoSoBenhAnEntity record = HoSoBenhAnEntity.builder()
                .maHoSo(recordId)
                .maBenhNhan(100L)
                .trangThai("draft")
                .loaiBenhAn("MAN")
                .build();
        when(medicalRecordRepo.findById(recordId)).thenReturn(Optional.of(record));

        LesionEpisodeRequest req = LesionEpisodeRequest.builder()
                .medicalRecordId(recordId)
                .name("Dot bung phat canh tay")
                .occurredAt(OffsetDateTime.now().toString())
                .contextTags("[\"sau an\"]")
                .build();

        DotTonThuongDaEntity savedEntity = DotTonThuongDaEntity.builder()
                .maDotTonThuongDa(1L)
                .maBenhNhan(100L)
                .maHoSoMan(recordId)
                .tenDotTonThuongDa("Dot bung phat canh tay")
                .thoiDiemTao(OffsetDateTime.now())
                .thoiDiemCapNhat(OffsetDateTime.now())
                .build();

        when(episodeRepo.save(any())).thenReturn(savedEntity);

        LesionEpisodeResponse res = service.createEpisode(patientPrincipal, req);

        assertNotNull(res);
        assertEquals("1", res.getEpisodeId());
        assertEquals("100", res.getPatientId());
        assertEquals("Dot bung phat canh tay", res.getName());
    }

    // A2-004 Regression: medical_record_id is mandatory on createEpisode
    @Test
    void testCreateEpisode_MissingMedicalRecordIdThrows400() {
        LesionEpisodeRequest req = LesionEpisodeRequest.builder()
                .name("Dot bung phat canh tay")
                .occurredAt(OffsetDateTime.now().toString())
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.createEpisode(patientPrincipal, req));
        assertEquals(ErrorCode.INVALID_PARAM, ex.getErrorCode());
    }

    // A2-004 Regression: Record belonging to other patient throws 3106
    @Test
    void testCreateEpisode_MedicalRecordBelongsToOtherPatientThrows3106() {
        Long recordId = 500L;
        HoSoBenhAnEntity record = HoSoBenhAnEntity.builder()
                .maHoSo(recordId)
                .maBenhNhan(200L) // belongs to Patient B
                .trangThai("draft")
                .loaiBenhAn("MAN")
                .build();
        when(medicalRecordRepo.findById(recordId)).thenReturn(Optional.of(record));

        LesionEpisodeRequest req = LesionEpisodeRequest.builder()
                .medicalRecordId(recordId)
                .name("Dot bung phat canh tay")
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.createEpisode(patientPrincipal, req));
        assertEquals(ErrorCode.FORBIDDEN_PATIENT_ACCESS, ex.getErrorCode());
        assertEquals(3106, ex.getErrorCode().getCode());
    }

    // A2-004 Regression: Medical record already completed throws 4003
    @Test
    void testCreateEpisode_MedicalRecordCompletedThrows4003() {
        Long recordId = 500L;
        HoSoBenhAnEntity record = HoSoBenhAnEntity.builder()
                .maHoSo(recordId)
                .maBenhNhan(100L)
                .trangThai("completed")
                .loaiBenhAn("MAN")
                .build();
        when(medicalRecordRepo.findById(recordId)).thenReturn(Optional.of(record));

        LesionEpisodeRequest req = LesionEpisodeRequest.builder()
                .medicalRecordId(recordId)
                .name("Dot bung phat canh tay")
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.createEpisode(patientPrincipal, req));
        assertEquals(ErrorCode.MEDICAL_RECORD_ALREADY_COMPLETED, ex.getErrorCode());
        assertEquals(4003, ex.getErrorCode().getCode());
    }

    // A2-004 Regression: getMyEpisodes throws 4002 when no active medical record
    @Test
    void testGetMyEpisodes_NoActiveMedicalRecordThrows4002() {
        when(medicalRecordRepo.existsByMaBenhNhanAndTrangThaiNotIn(eq(100L), any())).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () -> service.getMyEpisodes(patientPrincipal));
        assertEquals(ErrorCode.MEDICAL_RECORD_INVALID_STATE, ex.getErrorCode());
        assertEquals(4002, ex.getErrorCode().getCode());
    }

    // A2-013 Regression: Malformed date string throws 2004 (INVALID_DATE)
    @Test
    void testCreateEpisode_MalformedDateThrowsInvalidDate() {
        Long recordId = 500L;
        HoSoBenhAnEntity record = HoSoBenhAnEntity.builder()
                .maHoSo(recordId)
                .maBenhNhan(100L)
                .trangThai("draft")
                .loaiBenhAn("MAN")
                .build();
        when(medicalRecordRepo.findById(recordId)).thenReturn(Optional.of(record));

        LesionEpisodeRequest req = LesionEpisodeRequest.builder()
                .medicalRecordId(recordId)
                .name("Dot bung phat canh tay")
                .occurredAt("NOT_A_DATE")
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.createEpisode(patientPrincipal, req));
        assertEquals(ErrorCode.INVALID_DATE, ex.getErrorCode());
    }

    @Test
    void testCreateEpisode_EmptyNameThrows7004() {
        LesionEpisodeRequest req = LesionEpisodeRequest.builder().name("   ").build();
        AppException ex = assertThrows(AppException.class, () -> service.createEpisode(patientPrincipal, req));
        assertEquals(ErrorCode.LESION_NAME_EMPTY, ex.getErrorCode());
        assertEquals(7004, ex.getErrorCode().getCode());
    }

    @Test
    void testSavePhoto_Success() {
        DotTonThuongDaEntity episode = DotTonThuongDaEntity.builder()
                .maDotTonThuongDa(10L)
                .maBenhNhan(100L)
                .build();
        when(episodeRepo.findById(10L)).thenReturn(Optional.of(episode));

        TepDinhKemEntity attachment = TepDinhKemEntity.builder()
                .maTepDinhKem(50L)
                .maTaiKhoan(1L)
                .tenTepGoc("urticaria.jpg")
                .dinhDangTep("image/jpeg")
                .dungLuongByte(1024L)
                .build();
        when(attachmentRepo.findById(50L)).thenReturn(Optional.of(attachment));

        LesionPhotoRequest req = LesionPhotoRequest.builder()
                .episodeId(10L)
                .attachmentId(50L)
                .milestone("peak")
                .itchScore((short) 7)
                .painScore((short) 3)
                .burnScore((short) 2)
                .hivesCount(15)
                .build();

        AnhChupTonThuongEntity savedPhoto = AnhChupTonThuongEntity.builder()
                .maAnh(99L)
                .maDotTonThuongDa(10L)
                .maTepDinhKem(50L)
                .mocTienTrien("peak")
                .soLuongNotSan(15)
                .thoiDiemTao(OffsetDateTime.now())
                .thoiDiemCapNhat(OffsetDateTime.now())
                .build();
        when(photoRepo.save(any())).thenReturn(savedPhoto);

        LesionPhotoResponse res = service.saveLesionPhoto(patientPrincipal, req);

        assertNotNull(res);
        assertEquals("99", res.getPhotoId());
        assertEquals("peak", res.getMilestone());
        assertEquals(15, res.getHivesCount());
    }

    // A2-004 Regression: episode_id mandatory on saveLesionPhoto
    @Test
    void testSavePhoto_MissingEpisodeIdThrowsInvalidParam() {
        LesionPhotoRequest req = LesionPhotoRequest.builder()
                .attachmentId(50L)
                .milestone("peak")
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.saveLesionPhoto(patientPrincipal, req));
        assertEquals(ErrorCode.INVALID_PARAM, ex.getErrorCode());
    }

    @Test
    void testSavePhoto_InvalidMilestoneThrows7006() {
        DotTonThuongDaEntity episode = DotTonThuongDaEntity.builder()
                .maDotTonThuongDa(10L)
                .maBenhNhan(100L)
                .build();
        when(episodeRepo.findById(10L)).thenReturn(Optional.of(episode));

        LesionPhotoRequest req = LesionPhotoRequest.builder()
                .episodeId(10L)
                .attachmentId(50L)
                .milestone("invalid_stage")
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.saveLesionPhoto(patientPrincipal, req));
        assertEquals(ErrorCode.INVALID_MILESTONE, ex.getErrorCode());
        assertEquals(7006, ex.getErrorCode().getCode());
    }

    @Test
    void testSavePhoto_SymptomScoreOutOfRangeThrows7007() {
        DotTonThuongDaEntity episode = DotTonThuongDaEntity.builder()
                .maDotTonThuongDa(10L)
                .maBenhNhan(100L)
                .build();
        when(episodeRepo.findById(10L)).thenReturn(Optional.of(episode));

        LesionPhotoRequest req = LesionPhotoRequest.builder()
                .episodeId(10L)
                .attachmentId(50L)
                .milestone("peak")
                .itchScore((short) 15) // > 10
                .build();

        AppException ex = assertThrows(AppException.class, () -> service.saveLesionPhoto(patientPrincipal, req));
        assertEquals(ErrorCode.SYMPTOM_SCORE_OUT_OF_RANGE, ex.getErrorCode());
        assertEquals(7007, ex.getErrorCode().getCode());
    }

    @Test
    void testAccessOtherPatientEpisode_ThrowsForbidden3106() {
        DotTonThuongDaEntity episode = DotTonThuongDaEntity.builder()
                .maDotTonThuongDa(10L)
                .maBenhNhan(200L) // belongs to Patient B
                .build();
        when(episodeRepo.findById(10L)).thenReturn(Optional.of(episode));

        // Patient A attempts to view
        AppException ex = assertThrows(AppException.class, () -> service.getEpisode(patientPrincipal, 10L));
        assertEquals(ErrorCode.FORBIDDEN_PATIENT_ACCESS, ex.getErrorCode());
        assertEquals(3106, ex.getErrorCode().getCode());
    }
}
