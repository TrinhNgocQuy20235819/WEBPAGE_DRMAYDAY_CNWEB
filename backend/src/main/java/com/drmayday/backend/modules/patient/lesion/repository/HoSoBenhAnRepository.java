package com.drmayday.backend.modules.patient.lesion.repository;

import com.drmayday.backend.modules.patient.lesion.entity.HoSoBenhAnEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HoSoBenhAnRepository extends JpaRepository<HoSoBenhAnEntity, Long> {
    List<HoSoBenhAnEntity> findByMaBenhNhan(Long maBenhNhan);
    Optional<HoSoBenhAnEntity> findFirstByMaBenhNhanAndTrangThaiNot(Long maBenhNhan, String trangThai);
    List<HoSoBenhAnEntity> findByMaBenhNhanAndTrangThaiNotIn(Long maBenhNhan, java.util.Collection<String> trangThais);
    boolean existsByMaBenhNhanAndTrangThaiNotIn(Long maBenhNhan, java.util.Collection<String> trangThais);
}

