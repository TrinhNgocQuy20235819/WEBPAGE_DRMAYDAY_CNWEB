package com.drmayday.backend.modules.patient.lesion.repository;

import com.drmayday.backend.modules.patient.lesion.entity.AnhChupTonThuongEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnhChupTonThuongRepository extends JpaRepository<AnhChupTonThuongEntity, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from AnhChupTonThuongEntity p where p.maAnh = :id")
    java.util.Optional<AnhChupTonThuongEntity> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    List<AnhChupTonThuongEntity> findByMaViTriTonThuong(Long maViTriTonThuong);
    List<AnhChupTonThuongEntity> findByMaDotTonThuongDa(Long maDotTonThuongDa);
    List<AnhChupTonThuongEntity> findByMaTepDinhKem(Long maTepDinhKem);
}

