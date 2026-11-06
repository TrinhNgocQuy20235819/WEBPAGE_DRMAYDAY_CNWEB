package com.drmayday.backend.modules.patient.lesion.repository;

import com.drmayday.backend.modules.patient.lesion.entity.DotTonThuongDaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DotTonThuongDaRepository extends JpaRepository<DotTonThuongDaEntity, Long> {
    List<DotTonThuongDaEntity> findByMaBenhNhanOrderByThoiDiemTaoDesc(Long maBenhNhan);
    List<DotTonThuongDaEntity> findByMaHoSoMan(Long maHoSoMan);
}

