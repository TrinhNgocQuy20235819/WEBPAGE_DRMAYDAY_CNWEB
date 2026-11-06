package com.drmayday.backend.security.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.drmayday.backend.security.entity.QuyenHanEntity;
public interface PermissionRepository extends JpaRepository<QuyenHanEntity, Long> {
    boolean existsByTenQuyenHan(String name);
}
