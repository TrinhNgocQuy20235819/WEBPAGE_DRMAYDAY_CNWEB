package com.drmayday.backend.modules.patient.lesion.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tepdinhkem")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TepDinhKemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_tep_dinh_kem")
    private Long maTepDinhKem;

    @Column(name = "ma_ho_so", nullable = false)
    private Long maHoSo;

    @Column(name = "ma_tai_khoan")
    private Long maTaiKhoan;

    @Column(name = "ten_tep_goc", nullable = false)
    private String tenTepGoc;

    @Column(name = "duong_dan_luu_tru", nullable = false)
    private String duongDanLuuTru;

    @Column(name = "duong_dan_url")
    private String duongDanUrl;

    @Column(name = "dinh_dang_tep")
    private String dinhDangTep;

    @Column(name = "loai_phuong_tien")
    private String loaiPhuongTien;

    @Column(name = "dung_luong_byte")
    private Long dungLuongByte;

    @Column(name = "phan_loai_muc_dich")
    private String phanLoaiMucDich;

    @Column(name = "mo_ta_tep")
    private String moTaTep;

    @Column(name = "diem_do_mo", precision = 6, scale = 2)
    private BigDecimal diemDoMo;

    @Column(name = "thoi_diem_tao", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemTao;

    @Column(name = "thoi_diem_cap_nhat", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemCapNhat;
}

