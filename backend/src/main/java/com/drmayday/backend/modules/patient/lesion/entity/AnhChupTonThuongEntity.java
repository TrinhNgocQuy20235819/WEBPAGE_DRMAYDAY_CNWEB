package com.drmayday.backend.modules.patient.lesion.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "anhchuptonthuong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnhChupTonThuongEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_anh")
    private Long maAnh;

    @Column(name = "ma_tep_dinh_kem", nullable = false)
    private Long maTepDinhKem;

    @Column(name = "ma_dot_ton_thuong_da")
    private Long maDotTonThuongDa;

    @Column(name = "ma_vi_tri_ton_thuong")
    private Long maViTriTonThuong;

    @Column(name = "thoi_diem_chup", nullable = false)
    private OffsetDateTime thoiDiemChup;

    @Column(name = "moc_tien_trien", length = 50)
    private String mocTienTrien;

    @Column(name = "diem_ngua_nrs")
    private Short diemNguaNrs;

    @Column(name = "diem_dau_nrs")
    private Short diemDauNrs;

    @Column(name = "diem_bong_rat_nrs")
    private Short diemBongRatNrs;

    @Column(name = "so_luong_not_san")
    private Integer soLuongNotSan;

    @Column(name = "chi_so_auas_cuc_bo", precision = 5, scale = 2)
    private BigDecimal chiSoAuasCucBo;

    @Column(name = "url_anh", length = 500)
    private String urlAnh;

    @Column(name = "thoi_diem_tao", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemTao;

    @Column(name = "thoi_diem_cap_nhat")
    private OffsetDateTime thoiDiemCapNhat;
}

