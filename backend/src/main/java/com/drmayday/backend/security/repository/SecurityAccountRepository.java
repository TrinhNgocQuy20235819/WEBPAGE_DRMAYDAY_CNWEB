package com.drmayday.backend.security.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.drmayday.backend.security.entity.TaiKhoanEntity;

@Repository
public interface SecurityAccountRepository extends JpaRepository<TaiKhoanEntity, Long> {

    // This join is an explicit schema contract; never fall back to username if phone lookup fails.
    @org.springframework.data.jpa.repository.Query(value = "SELECT t.* FROM taikhoan t JOIN nguoi n ON n.ma_nguoi = t.ma_nguoi WHERE n.so_dien_thoai = :phone", nativeQuery = true)
    java.util.List<TaiKhoanEntity> findByPhone(@org.springframework.data.repository.query.Param("phone") String phone);

    Optional<TaiKhoanEntity> findByTenDangNhap(String tenDangNhap);
}