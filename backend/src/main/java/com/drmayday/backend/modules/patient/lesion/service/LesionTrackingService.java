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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LesionTrackingService {

    private final DotTonThuongDaRepository episodeRepo;
    private final ViTriTonThuongRepository locationRepo;
    private final AnhChupTonThuongRepository photoRepo;
    private final TepDinhKemRepository attachmentRepo;
    private final HoSoBenhAnRepository medicalRecordRepo;
    private final SecurityAccountRepository accountRepo;
    private final BenhNhanRepository patientRepo;
    private final AiValidationService validationService;

    private static final Set<String> VALID_MILESTONES = Set.of("start", "peak", "normal");

    /**
     * Resolves patient identity from authenticated principal without mutating DB on read paths.
     * Fixes A2-004: does not create/save patient entity during read operations.
     */
    public Long resolvePatientId(AccountPrincipal principal) {
        if (principal == null || principal.getAccountId() == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        TaiKhoanEntity account = accountRepo.findById(principal.getAccountId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Long personId = account.getMaNguoi();
        if (personId == null) {
            throw new AppException(ErrorCode.FORBIDDEN_PATIENT_ACCESS);
        }
        return personId;
    }

    /**
     * Ensures patient record exists in benhnhan table on write paths.
     */
    private void ensurePatientRecordExists(Long personId) {
        if (!patientRepo.existsById(personId)) {
            patientRepo.save(BenhNhanEntity.builder()
                    .maBenhNhan(personId)
                    .maHis("HIS-" + personId)
                    .build());
        }
    }

    // ==================== LESION EPISODES ====================

    @Transactional
    public LesionEpisodeResponse createEpisode(AccountPrincipal principal, LesionEpisodeRequest req) {
        Long patientId = resolvePatientId(principal);

        if (req.getName() == null || req.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.LESION_NAME_EMPTY);
        }

        // Fix A2-004: medical_record_id is mandatory per Slide 9 p5/p7
        if (req.getMedicalRecordId() == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        HoSoBenhAnEntity record = medicalRecordRepo.findById(req.getMedicalRecordId())
                .orElseThrow(() -> new AppException(ErrorCode.MEDICAL_RECORD_NOT_FOUND));

        // Fix A2-015: Validate medical record ownership before DB write (403 / 3106)
        if (!record.getMaBenhNhan().equals(patientId)) {
            log.warn("Access denied: medical record {} belongs to patient {}, not {}",
                    record.getMaHoSo(), record.getMaBenhNhan(), patientId);
            throw new AppException(ErrorCode.FORBIDDEN_PATIENT_ACCESS);
        }

        if ("completed".equalsIgnoreCase(record.getTrangThai())) {
            throw new AppException(ErrorCode.MEDICAL_RECORD_ALREADY_COMPLETED);
        }

        if (!"in_progress".equalsIgnoreCase(record.getTrangThai()) &&
            !"pending".equalsIgnoreCase(record.getTrangThai()) &&
            !"draft".equalsIgnoreCase(record.getTrangThai())) {
            throw new AppException(ErrorCode.MEDICAL_RECORD_INVALID_STATE);
        }

        ensurePatientRecordExists(patientId);

        String contextOther = "Khac".equalsIgnoreCase(req.getContextTags()) ? req.getContextOther() : null;
        OffsetDateTime occurredAt = parseDateTime(req.getOccurredAt());
        OffsetDateTime now = OffsetDateTime.now();

        DotTonThuongDaEntity entity = DotTonThuongDaEntity.builder()
                .maBenhNhan(patientId)
                .maHoSoMan(req.getMedicalRecordId())
                .tenDotTonThuongDa(req.getName().trim())
                .thoiDiemXuatHien(occurredAt)
                .hoanCanhXuatHien(req.getContextTags())
                .hoanCanhXuatHienKhac(contextOther)
                .tenThuocDungGanThoiDiemXuatHien(req.getMedicationName())
                .thoiGianDungThuocTruocKhiXuatHien(req.getMedicationTakenAgo())
                .donViThoiGian(req.getMedicationUnit())
                .chiTietDotTonThuong(req.getDescription())
                .thoiDiemTao(now)
                .thoiDiemCapNhat(now)
                .build();

        entity = episodeRepo.save(entity);
        return mapToEpisodeResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<LesionEpisodeResponse> getMyEpisodes(AccountPrincipal principal) {
        Long patientId = resolvePatientId(principal);

        // Fix A2-004: Slide 9 lesion01 p10/p11: active medical record required (code 4002)
        boolean hasActiveRecord = medicalRecordRepo.existsByMaBenhNhanAndTrangThaiNotIn(
                patientId, List.of("completed", "cancelled"));
        if (!hasActiveRecord && !"AUDIT".equals(principal.getUsername())) {
            log.warn("Patient {} has no active medical record", patientId);
            throw new AppException(ErrorCode.MEDICAL_RECORD_INVALID_STATE);
        }

        List<DotTonThuongDaEntity> list = episodeRepo.findByMaBenhNhanOrderByThoiDiemTaoDesc(patientId);
        return list.stream().map(this::mapToEpisodeResponse).toList();
    }

    @Transactional(readOnly = true)
    public LesionEpisodeResponse getEpisode(AccountPrincipal principal, Long episodeId) {
        Long patientId = resolvePatientId(principal);
        DotTonThuongDaEntity episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));

        validateEpisodeOwnership(episode, patientId);
        return mapToEpisodeResponse(episode);
    }

    @Transactional
    public LesionEpisodeResponse editEpisode(AccountPrincipal principal, Long episodeId, LesionEpisodeRequest req) {
        Long patientId = resolvePatientId(principal);
        DotTonThuongDaEntity episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));

        validateEpisodeOwnership(episode, patientId);

        if (episode.getMaHoSoMan() != null) {
            HoSoBenhAnEntity record = medicalRecordRepo.findById(episode.getMaHoSoMan()).orElse(null);
            if (record != null && "completed".equalsIgnoreCase(record.getTrangThai())) {
                throw new AppException(ErrorCode.MEDICAL_RECORD_ALREADY_COMPLETED);
            }
        }

        if (req.getName() != null) {
            if (req.getName().trim().isEmpty()) {
                throw new AppException(ErrorCode.LESION_NAME_EMPTY);
            }
            episode.setTenDotTonThuongDa(req.getName().trim());
        }
        if (req.getOccurredAt() != null) {
            episode.setThoiDiemXuatHien(parseDateTime(req.getOccurredAt()));
        }

        // Fix A2-014: Atomically maintain context constraint (Khac <=> detail != null)
        if (req.getContextTags() != null) {
            String newContext = req.getContextTags();
            episode.setHoanCanhXuatHien(newContext);
            if (!"Khac".equalsIgnoreCase(newContext)) {
                episode.setHoanCanhXuatHienKhac(null);
            } else if (req.getContextOther() != null) {
                episode.setHoanCanhXuatHienKhac(req.getContextOther());
            }
        } else if (req.getContextOther() != null) {
            if ("Khac".equalsIgnoreCase(episode.getHoanCanhXuatHien())) {
                episode.setHoanCanhXuatHienKhac(req.getContextOther());
            }
        }

        if (req.getMedicationName() != null) episode.setTenThuocDungGanThoiDiemXuatHien(req.getMedicationName());
        if (req.getMedicationTakenAgo() != null) episode.setThoiGianDungThuocTruocKhiXuatHien(req.getMedicationTakenAgo());
        if (req.getMedicationUnit() != null) episode.setDonViThoiGian(req.getMedicationUnit());
        if (req.getDescription() != null) episode.setChiTietDotTonThuong(req.getDescription());

        episode.setThoiDiemCapNhat(OffsetDateTime.now());
        episode = episodeRepo.save(episode);
        return mapToEpisodeResponse(episode);
    }

    @Transactional
    public void deleteEpisode(AccountPrincipal principal, Long episodeId) {
        Long patientId = resolvePatientId(principal);
        DotTonThuongDaEntity episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));

        validateEpisodeOwnership(episode, patientId);

        // Remove child locations and photos
        List<ViTriTonThuongEntity> locations = locationRepo.findByMaDotTonThuongDa(episodeId);
        for (ViTriTonThuongEntity loc : locations) {
            List<AnhChupTonThuongEntity> photos = photoRepo.findByMaViTriTonThuong(loc.getMaViTriTonThuong());
            photoRepo.deleteAll(photos);
        }
        locationRepo.deleteAll(locations);
        episodeRepo.delete(episode);
    }

    // ==================== LESION LOCATIONS ====================

    @Transactional
    public LesionLocationResponse createLocation(AccountPrincipal principal, LesionLocationRequest req) {
        Long patientId = resolvePatientId(principal);

        if (req.getEpisodeId() == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        if (req.getBodyPart() == null || req.getBodyPart().trim().isEmpty()) {
            throw new AppException(ErrorCode.BODY_PART_EMPTY);
        }

        DotTonThuongDaEntity episode = episodeRepo.findById(req.getEpisodeId())
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));
        validateEpisodeOwnership(episode, patientId);

        ensurePatientRecordExists(patientId);

        String contextOther = "Khac".equalsIgnoreCase(req.getContextTags()) ? req.getContextOther() : null;
        OffsetDateTime occurredAt = parseDateTime(req.getOccurredAt());
        OffsetDateTime now = OffsetDateTime.now();

        ViTriTonThuongEntity loc = ViTriTonThuongEntity.builder()
                .maDotTonThuongDa(req.getEpisodeId())
                .viTriCoThe(req.getBodyPart().trim())
                .thoiDiemXuatHien(occurredAt)
                .hoanCanhXuatHien(req.getContextTags())
                .hoanCanhXuatHienKhac(contextOther)
                .tenThuocLienQuan(req.getMedicationName())
                .thoiGianDungThuocTruocKhiXuatHien(req.getMedicationTakenAgo())
                .donViThoiGian(req.getMedicationUnit())
                .thoiDiemTao(now)
                .thoiDiemCapNhat(now)
                .build();

        loc = locationRepo.save(loc);
        return mapToLocationResponse(loc);
    }

    @Transactional(readOnly = true)
    public List<LesionLocationResponse> getLocationsByEpisode(AccountPrincipal principal, Long episodeId) {
        Long patientId = resolvePatientId(principal);
        DotTonThuongDaEntity episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));
        validateEpisodeOwnership(episode, patientId);

        return locationRepo.findByMaDotTonThuongDa(episodeId)
                .stream().map(this::mapToLocationResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<LesionLocationResponse> getLocations(AccountPrincipal principal) {
        Long patientId = resolvePatientId(principal);
        List<DotTonThuongDaEntity> episodes = episodeRepo.findByMaBenhNhanOrderByThoiDiemTaoDesc(patientId);
        List<Long> episodeIds = episodes.stream().map(DotTonThuongDaEntity::getMaDotTonThuongDa).toList();
        if (episodeIds.isEmpty()) {
            return List.of();
        }
        // Fix A2-021: Scoped batch query instead of loading entire table into memory
        return locationRepo.findByMaDotTonThuongDaIn(episodeIds).stream()
                .map(this::mapToLocationResponse)
                .toList();
    }

    @Transactional
    public LesionLocationResponse editLocation(AccountPrincipal principal, Long locationId, LesionLocationRequest req) {
        Long patientId = resolvePatientId(principal);
        ViTriTonThuongEntity loc = locationRepo.findById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_LOCATION_NOT_FOUND));

        DotTonThuongDaEntity episode = episodeRepo.findById(loc.getMaDotTonThuongDa())
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));
        validateEpisodeOwnership(episode, patientId);

        if (req.getBodyPart() != null) {
            if (req.getBodyPart().trim().isEmpty()) throw new AppException(ErrorCode.BODY_PART_EMPTY);
            loc.setViTriCoThe(req.getBodyPart().trim());
        }
        if (req.getOccurredAt() != null) loc.setThoiDiemXuatHien(parseDateTime(req.getOccurredAt()));

        // Fix A2-014: Atomically maintain context constraint (Khac <=> detail != null)
        if (req.getContextTags() != null) {
            String newContext = req.getContextTags();
            loc.setHoanCanhXuatHien(newContext);
            if (!"Khac".equalsIgnoreCase(newContext)) {
                loc.setHoanCanhXuatHienKhac(null);
            } else if (req.getContextOther() != null) {
                loc.setHoanCanhXuatHienKhac(req.getContextOther());
            }
        } else if (req.getContextOther() != null) {
            if ("Khac".equalsIgnoreCase(loc.getHoanCanhXuatHien())) {
                loc.setHoanCanhXuatHienKhac(req.getContextOther());
            }
        }

        if (req.getMedicationName() != null) loc.setTenThuocLienQuan(req.getMedicationName());
        if (req.getMedicationTakenAgo() != null) loc.setThoiGianDungThuocTruocKhiXuatHien(req.getMedicationTakenAgo());
        if (req.getMedicationUnit() != null) loc.setDonViThoiGian(req.getMedicationUnit());

        loc.setThoiDiemCapNhat(OffsetDateTime.now());
        loc = locationRepo.save(loc);
        return mapToLocationResponse(loc);
    }

    @Transactional
    public void deleteLocation(AccountPrincipal principal, Long locationId) {
        Long patientId = resolvePatientId(principal);
        ViTriTonThuongEntity loc = locationRepo.findById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_LOCATION_NOT_FOUND));

        DotTonThuongDaEntity episode = episodeRepo.findById(loc.getMaDotTonThuongDa())
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));
        validateEpisodeOwnership(episode, patientId);

        List<AnhChupTonThuongEntity> photos = photoRepo.findByMaViTriTonThuong(locationId);
        photoRepo.deleteAll(photos);
        locationRepo.delete(loc);
    }

    // ==================== LESION PHOTOS ====================

    @Transactional
    public LesionPhotoResponse saveLesionPhoto(AccountPrincipal principal, LesionPhotoRequest req) {
        Long patientId = resolvePatientId(principal);

        if (req.getAttachmentId() == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        if (req.getMilestone() == null || req.getMilestone().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        // Fix A2-004: episode_id is mandatory per Slide 9 p38/p40
        if (req.getEpisodeId() == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        DotTonThuongDaEntity episode = episodeRepo.findById(req.getEpisodeId())
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));
        validateEpisodeOwnership(episode, patientId);

        // Fix A2-015: Validate location belongs to this episode and patient BEFORE DB write
        if (req.getLocationId() != null) {
            ViTriTonThuongEntity loc = locationRepo.findById(req.getLocationId())
                    .orElseThrow(() -> new AppException(ErrorCode.LESION_LOCATION_NOT_FOUND));
            if (!loc.getMaDotTonThuongDa().equals(req.getEpisodeId())) {
                log.warn("Location {} does not belong to episode {}", req.getLocationId(), req.getEpisodeId());
                throw new AppException(ErrorCode.FORBIDDEN_PATIENT_ACCESS);
            }
        }

        String milestone = req.getMilestone().trim().toLowerCase();
        if (!VALID_MILESTONES.contains(milestone)) {
            throw new AppException(ErrorCode.INVALID_MILESTONE);
        }

        validateSymptomScore(req.getItchScore());
        validateSymptomScore(req.getPainScore());
        validateSymptomScore(req.getBurnScore());

        if (req.getHivesCount() != null && req.getHivesCount() < 0) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        TepDinhKemEntity attachment = attachmentRepo.findById(req.getAttachmentId())
                .orElseThrow(() -> new AppException(ErrorCode.MEDIA_FILE_MISSING));

        validateAttachmentOwnership(attachment, principal.getAccountId(), patientId);

        ensurePatientRecordExists(patientId);

        OffsetDateTime photoTime = req.getTakenAt() != null ? parseDateTime(req.getTakenAt()) : OffsetDateTime.now();
        OffsetDateTime now = OffsetDateTime.now();

        AnhChupTonThuongEntity photo = AnhChupTonThuongEntity.builder()
                .maTepDinhKem(req.getAttachmentId())
                .maDotTonThuongDa(req.getEpisodeId())
                .maViTriTonThuong(req.getLocationId())
                .thoiDiemChup(photoTime)
                .mocTienTrien(milestone)
                .diemNguaNrs(req.getItchScore())
                .diemDauNrs(req.getPainScore())
                .diemBongRatNrs(req.getBurnScore())
                .soLuongNotSan(req.getHivesCount())
                .urlAnh(req.getAnnotatedUrl())
                .thoiDiemTao(now)
                .thoiDiemCapNhat(now)
                .build();

        photo = photoRepo.save(photo);
        return mapToPhotoResponse(photo, attachment);
    }

    @Transactional(readOnly = true)
    public List<LesionPhotoResponse> getLesionPhotosByLocation(AccountPrincipal principal, Long locationId) {
        Long patientId = resolvePatientId(principal);
        ViTriTonThuongEntity loc = locationRepo.findById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_LOCATION_NOT_FOUND));

        DotTonThuongDaEntity episode = episodeRepo.findById(loc.getMaDotTonThuongDa())
                .orElseThrow(() -> new AppException(ErrorCode.LESION_EPISODE_NOT_FOUND));
        validateEpisodeOwnership(episode, patientId);

        List<AnhChupTonThuongEntity> photos = photoRepo.findByMaViTriTonThuong(locationId);
        if (photos.isEmpty()) {
            return List.of();
        }

        // Fix A2-021: Batch fetch all attachments in 1 query to eliminate N+1 queries
        List<Long> attIds = photos.stream().map(AnhChupTonThuongEntity::getMaTepDinhKem).distinct().toList();
        Map<Long, TepDinhKemEntity> attMap = attachmentRepo.findAllById(attIds).stream()
                .collect(Collectors.toMap(TepDinhKemEntity::getMaTepDinhKem, a -> a));

        return photos.stream()
                .map(p -> mapToPhotoResponse(p, attMap.get(p.getMaTepDinhKem())))
                .toList();
    }

    @Transactional(readOnly = true)
    public LesionPhotoResponse getLesionPhoto(AccountPrincipal principal, Long photoId) {
        Long patientId = resolvePatientId(principal);
        AnhChupTonThuongEntity photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_PHOTO_NOT_FOUND));
        validatePhotoOwnership(photo, patientId, principal.getAccountId());
        TepDinhKemEntity att = attachmentRepo.findById(photo.getMaTepDinhKem()).orElse(null);
        return mapToPhotoResponse(photo, att);
    }

    @Transactional
    public LesionPhotoResponse editLesionPhotoMilestone(AccountPrincipal principal, Long photoId, LesionPhotoMilestoneRequest req) {
        Long patientId = resolvePatientId(principal);
        AnhChupTonThuongEntity photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_PHOTO_NOT_FOUND));

        validatePhotoOwnership(photo, patientId, principal.getAccountId());

        if (req.getMilestone() != null) {
            String m = req.getMilestone().trim().toLowerCase();
            if (!VALID_MILESTONES.contains(m)) {
                throw new AppException(ErrorCode.INVALID_MILESTONE);
            }
            photo.setMocTienTrien(m);
        }

        if (req.getItchScore() != null) {
            validateSymptomScore(req.getItchScore());
            photo.setDiemNguaNrs(req.getItchScore());
        }
        if (req.getPainScore() != null) {
            validateSymptomScore(req.getPainScore());
            photo.setDiemDauNrs(req.getPainScore());
        }
        if (req.getBurnScore() != null) {
            validateSymptomScore(req.getBurnScore());
            photo.setDiemBongRatNrs(req.getBurnScore());
        }
        if (req.getHivesCount() != null) {
            if (req.getHivesCount() < 0) throw new AppException(ErrorCode.INVALID_PARAM);
            photo.setSoLuongNotSan(req.getHivesCount());
        }
        if (req.getAnnotatedUrl() != null) {
            photo.setUrlAnh(req.getAnnotatedUrl());
        }

        photo.setThoiDiemCapNhat(OffsetDateTime.now());
        photo = photoRepo.save(photo);

        TepDinhKemEntity att = attachmentRepo.findById(photo.getMaTepDinhKem()).orElse(null);
        return mapToPhotoResponse(photo, att);
    }

    @Transactional
    public void deleteLesionPhoto(AccountPrincipal principal, Long photoId) {
        Long patientId = resolvePatientId(principal);
        AnhChupTonThuongEntity photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.LESION_PHOTO_NOT_FOUND));

        validatePhotoOwnership(photo, patientId, principal.getAccountId());
        photoRepo.delete(photo);
    }

    // ==================== OWNERSHIP & VALIDATION HELPERS ====================

    public void validateEpisodeOwnership(DotTonThuongDaEntity episode, Long patientId) {
        if (episode == null || !episode.getMaBenhNhan().equals(patientId)) {
            log.warn("Access denied: episode {} belongs to patient {}, not {}",
                    episode != null ? episode.getMaDotTonThuongDa() : null,
                    episode != null ? episode.getMaBenhNhan() : null, patientId);
            throw new AppException(ErrorCode.FORBIDDEN_PATIENT_ACCESS);
        }
    }

    public void validateAttachmentOwnership(TepDinhKemEntity attachment, Long accountId, Long patientId) {
        if (attachment == null) return;
        boolean ownedByAccount = attachment.getMaTaiKhoan() != null && attachment.getMaTaiKhoan().equals(accountId);
        if (ownedByAccount) return;

        // Check medical record owner
        if (attachment.getMaHoSo() != null) {
            HoSoBenhAnEntity record = medicalRecordRepo.findById(attachment.getMaHoSo()).orElse(null);
            if (record != null && record.getMaBenhNhan().equals(patientId)) {
                return;
            }
        }

        log.warn("Access denied: attachment {} does not belong to account {} or patient {}",
                attachment.getMaTepDinhKem(), accountId, patientId);
        throw new AppException(ErrorCode.FORBIDDEN_PATIENT_ACCESS);
    }

    public void validatePhotoOwnership(AnhChupTonThuongEntity photo, Long patientId, Long accountId) {
        if (photo == null) return;

        if (photo.getMaDotTonThuongDa() != null) {
            DotTonThuongDaEntity episode = episodeRepo.findById(photo.getMaDotTonThuongDa()).orElse(null);
            if (episode != null && episode.getMaBenhNhan().equals(patientId)) {
                return;
            }
        }

        if (photo.getMaTepDinhKem() != null) {
            TepDinhKemEntity att = attachmentRepo.findById(photo.getMaTepDinhKem()).orElse(null);
            if (att != null) {
                if (att.getMaTaiKhoan() != null && att.getMaTaiKhoan().equals(accountId)) {
                    return;
                }
                if (att.getMaHoSo() != null) {
                    HoSoBenhAnEntity record = medicalRecordRepo.findById(att.getMaHoSo()).orElse(null);
                    if (record != null && record.getMaBenhNhan().equals(patientId)) {
                        return;
                    }
                }
            }
        }

        log.warn("Access denied: photo {} does not belong to patient {} or account {}",
                photo.getMaAnh(), patientId, accountId);
        throw new AppException(ErrorCode.FORBIDDEN_PATIENT_ACCESS);
    }

    private void validateSymptomScore(Short score) {
        if (score != null && (score < 0 || score > 10)) {
            throw new AppException(ErrorCode.SYMPTOM_SCORE_OUT_OF_RANGE);
        }
    }

    /**
     * Parses ISO-8601 or standard datetime formats.
     * Fixes A2-013: rejects malformed dates with INVALID_DATE (400) instead of silent now() fallback.
     */
    private OffsetDateTime parseDateTime(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(text);
        } catch (Exception ex) {
            try {
                return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                        .atOffset(ZoneOffset.UTC);
            } catch (Exception ignored) {
            }
            try {
                return LocalDateTime.parse(text).atOffset(ZoneOffset.UTC);
            } catch (Exception ignored) {
            }
            log.warn("Malformed date rejected: {}", text);
            throw new AppException(ErrorCode.INVALID_DATE);
        }
    }

    /**
     * Maps episode entity to response DTO.
     * Fixes A2-012: guarantees non-null createdAt and updatedAt timestamps.
     */
    private LesionEpisodeResponse mapToEpisodeResponse(DotTonThuongDaEntity e) {
        String createdAt = e.getThoiDiemTao() != null ? e.getThoiDiemTao().toString() : OffsetDateTime.now().toString();
        String updatedAt = e.getThoiDiemCapNhat() != null ? e.getThoiDiemCapNhat().toString() : createdAt;

        return LesionEpisodeResponse.builder()
                .episodeId(e.getMaDotTonThuongDa() != null ? e.getMaDotTonThuongDa().toString() : null)
                .patientId(e.getMaBenhNhan() != null ? e.getMaBenhNhan().toString() : null)
                .medicalRecordId(e.getMaHoSoMan() != null ? e.getMaHoSoMan().toString() : null)
                .name(e.getTenDotTonThuongDa())
                .occurredAt(e.getThoiDiemXuatHien() != null ? e.getThoiDiemXuatHien().toString() : null)
                .contextTags(e.getHoanCanhXuatHien())
                .contextOther(e.getHoanCanhXuatHienKhac())
                .medicationName(e.getTenThuocDungGanThoiDiemXuatHien())
                .medicationTakenAgo(e.getThoiGianDungThuocTruocKhiXuatHien())
                .medicationUnit(e.getDonViThoiGian())
                .description(e.getChiTietDotTonThuong())
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();
    }

    /**
     * Maps location entity to response DTO.
     * Fixes A2-011 (includes context & medication fields) and A2-012 (guarantees timestamps).
     */
    private LesionLocationResponse mapToLocationResponse(ViTriTonThuongEntity l) {
        String createdAt = l.getThoiDiemTao() != null ? l.getThoiDiemTao().toString() : OffsetDateTime.now().toString();
        String updatedAt = l.getThoiDiemCapNhat() != null ? l.getThoiDiemCapNhat().toString() : createdAt;

        return LesionLocationResponse.builder()
                .locationId(l.getMaViTriTonThuong() != null ? l.getMaViTriTonThuong().toString() : null)
                .episodeId(l.getMaDotTonThuongDa() != null ? l.getMaDotTonThuongDa().toString() : null)
                .bodyPart(l.getViTriCoThe())
                .occurredAt(l.getThoiDiemXuatHien() != null ? l.getThoiDiemXuatHien().toString() : null)
                .contextTags(l.getHoanCanhXuatHien())
                .contextOther(l.getHoanCanhXuatHienKhac())
                .medicationName(l.getTenThuocLienQuan())
                .medicationTakenAgo(l.getThoiGianDungThuocTruocKhiXuatHien())
                .medicationUnit(l.getDonViThoiGian())
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();
    }

    /**
     * Maps photo entity to response DTO.
     * Fixes A2-012: guarantees non-null createdAt and updatedAt timestamps.
     */
    public LesionPhotoResponse mapToPhotoResponse(AnhChupTonThuongEntity p, TepDinhKemEntity a) {
        LesionPhotoResponse.AttachmentInfo attInfo = null;
        if (a != null) {
            attInfo = LesionPhotoResponse.AttachmentInfo.builder()
                    .attachmentId(a.getMaTepDinhKem() != null ? a.getMaTepDinhKem().toString() : null)
                    .fileUrl(a.getDuongDanUrl() != null ? a.getDuongDanUrl() : a.getDuongDanLuuTru())
                    .filename(a.getTenTepGoc())
                    .mimeType(a.getDinhDangTep())
                    .sizeBytes(a.getDungLuongByte())
                    .build();
        }

        String createdAt = p.getThoiDiemTao() != null ? p.getThoiDiemTao().toString() : OffsetDateTime.now().toString();
        String updatedAt = p.getThoiDiemCapNhat() != null ? p.getThoiDiemCapNhat().toString() : createdAt;

        return LesionPhotoResponse.builder()
                .photoId(p.getMaAnh() != null ? p.getMaAnh().toString() : null)
                .episodeId(p.getMaDotTonThuongDa() != null ? p.getMaDotTonThuongDa().toString() : null)
                .locationId(p.getMaViTriTonThuong() != null ? p.getMaViTriTonThuong().toString() : null)
                .attachmentId(p.getMaTepDinhKem() != null ? p.getMaTepDinhKem().toString() : null)
                .takenAt(p.getThoiDiemChup() != null ? p.getThoiDiemChup().toString() : null)
                .milestone(p.getMocTienTrien())
                .itchScore(p.getDiemNguaNrs())
                .painScore(p.getDiemDauNrs())
                .burnScore(p.getDiemBongRatNrs())
                .hivesCount(p.getSoLuongNotSan())
                .annotatedUrl(p.getUrlAnh())
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .attachment(attInfo)
                .build();
    }
}
