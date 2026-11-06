package com.drmayday.backend.modules.patient.lesion.repository;

import com.drmayday.backend.modules.patient.lesion.entity.BenhNhanEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BenhNhanRepository extends JpaRepository<BenhNhanEntity, Long> {

    @Query(value = "SELECT ma_nguoi FROM taikhoan WHERE ma_tai_khoan = :accountId", nativeQuery = true)
    Long findPersonIdByAccountId(@Param("accountId") Long accountId);
}

