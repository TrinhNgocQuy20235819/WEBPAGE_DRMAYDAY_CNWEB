package com.drmayday.backend.modules.patient.lesion.repository;

import com.drmayday.backend.modules.patient.lesion.entity.ViTriTonThuongEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViTriTonThuongRepository extends JpaRepository<ViTriTonThuongEntity, Long> {
    List<ViTriTonThuongEntity> findByMaDotTonThuongDa(Long maDotTonThuongDa);
    List<ViTriTonThuongEntity> findByMaDotTonThuongDaIn(java.util.Collection<Long> maDotTonThuongDas);
}

