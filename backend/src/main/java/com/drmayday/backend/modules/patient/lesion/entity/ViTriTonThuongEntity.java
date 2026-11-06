package com.drmayday.backend.modules.patient.lesion.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vitritonthuong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViTriTonThuongEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_vi_tri_ton_thuong")
    private Long maViTriTonThuong;

    @Column(name = "ma_dot_ton_thuong_da", nullable = false)
    private Long maDotTonThuongDa;

    @Column(name = "vi_tri_co_the")
    private String viTriCoThe;

    @Column(name = "thoi_diem_xuat_hien")
    private OffsetDateTime thoiDiemXuatHien;

    @Column(name = "ten_thuoc_lien_quan")
    private String tenThuocLienQuan;

    @Column(name = "thoi_gian_dung_thuoc_truoc_khi_xuat_hien")
    private String thoiGianDungThuocTruocKhiXuatHien;

    @Column(name = "hoan_canh_xuat_hien")
    private String hoanCanhXuatHien;

    @Column(name = "hoan_canh_xuat_hien_khac")
    private String hoanCanhXuatHienKhac;

    @Column(name = "don_vi_thoi_gian")
    private String donViThoiGian;

    @Column(name = "thoi_diem_tao", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemTao;

    @Column(name = "thoi_diem_cap_nhat", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemCapNhat;
}

