package com.drmayday.backend.security.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table(name = "taikhoan")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class TaiKhoanEntity {

    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_tai_khoan")
    private Long maTaiKhoan;

    @Column(name = "ma_nguoi")
    private Long maNguoi;

    @ManyToOne (fetch = FetchType.EAGER)
    @JoinColumn (name = "ma_vai_tro")
    private VaiTroEntity vaiTro;

    @Column(name = "ten_dang_nhap", nullable = false, unique = true)
    private String tenDangNhap;

    @Column(name = "mat_khau_ma_hoa", nullable = false)
    private String matKhauMaHoa;

    @Column(name = "trang_thai_hoat_dong")
    private Boolean trangThaiHoatDong;
}