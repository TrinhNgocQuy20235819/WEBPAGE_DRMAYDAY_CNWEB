package com.drmayday.backend.modules.patient.lesion.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "benhnhan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BenhNhanEntity {

    @Id
    @Column(name = "ma_benh_nhan")
    private Long maBenhNhan;

    @Column(name = "ma_his")
    private String maHis;
}

