package com.drmayday.backend.modules.patient.lesion.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "dottonthuongda")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DotTonThuongDaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_dot_ton_thuong_da")
    private Long maDotTonThuongDa;

    @Column(name = "ma_benh_nhan", nullable = false)
    private Long maBenhNhan;

    @Column(name = "ma_ho_so_man")
    private Long maHoSoMan;

    @Column(name = "ten_dot_ton_thuong_da")
    private String tenDotTonThuongDa;

    @Column(name = "thoi_diem_xuat_hien")
    private OffsetDateTime thoiDiemXuatHien;

    @Column(name = "hoan_canh_xuat_hien")
    private String hoanCanhXuatHien;

    @Column(name = "hoan_canh_xuat_hien_khac")
    private String hoanCanhXuatHienKhac;

    @Column(name = "ten_thuoc_dung_gan_thoi_diem_xuat_hien")
    private String tenThuocDungGanThoiDiemXuatHien;

    @Column(name = "thoi_gian_dung_thuoc_truoc_khi_xuat_hien")
    private String thoiGianDungThuocTruocKhiXuatHien;

    @Column(name = "don_vi_thoi_gian")
    private String donViThoiGian;

    @Column(name = "chi_tiet_dot_ton_thuong")
    private String chiTietDotTonThuong;

    @Column(name = "thoi_diem_tao", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemTao;

    @Column(name = "thoi_diem_cap_nhat", insertable = false, updatable = false)
    private OffsetDateTime thoiDiemCapNhat;
}

