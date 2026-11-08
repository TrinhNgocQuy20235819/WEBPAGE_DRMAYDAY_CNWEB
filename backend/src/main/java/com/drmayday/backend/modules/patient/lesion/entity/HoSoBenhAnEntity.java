package com.drmayday.backend.modules.patient.lesion.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hosobenhan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoSoBenhAnEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_ho_so")
    private Long maHoSo;

    @Column(name = "ma_benh_nhan", nullable = false)
    private Long maBenhNhan;

    @Column(name = "loai_benh_an", nullable = false)
    private String loaiBenhAn;

    @Column(name = "trang_thai", nullable = false)
    private String trangThai;
}

