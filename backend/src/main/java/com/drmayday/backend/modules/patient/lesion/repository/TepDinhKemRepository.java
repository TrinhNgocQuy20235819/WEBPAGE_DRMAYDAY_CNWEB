package com.drmayday.backend.modules.patient.lesion.repository;

import com.drmayday.backend.modules.patient.lesion.entity.TepDinhKemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TepDinhKemRepository extends JpaRepository<TepDinhKemEntity, Long> {
    List<TepDinhKemEntity> findByMaTaiKhoan(Long maTaiKhoan);
    List<TepDinhKemEntity> findByMaHoSo(Long maHoSo);
}

