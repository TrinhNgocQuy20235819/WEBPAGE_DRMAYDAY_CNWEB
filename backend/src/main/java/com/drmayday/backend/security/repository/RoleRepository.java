package com.drmayday.backend.security.repository;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.drmayday.backend.security.entity.VaiTroEntity;
public interface RoleRepository extends JpaRepository<VaiTroEntity, Long> {
    boolean existsByTenVaiTro(String name);
    @Query("select r from VaiTroEntity r join r.quyenHans p where p.maQuyenHan = :id")
    List<VaiTroEntity> findUsingPermission(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from VaiTroEntity r where r.maVaiTro = :id")
    Optional<VaiTroEntity> findForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
