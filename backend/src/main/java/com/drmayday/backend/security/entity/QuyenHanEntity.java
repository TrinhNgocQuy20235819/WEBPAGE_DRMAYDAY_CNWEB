package com.drmayday.backend.security.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table (name = "quyenhan")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class QuyenHanEntity {

    @Id 
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    @Column (name = "ma_quyen_han")
    private Long maQuyenHan;

    @Column (name = "ten_quyen_han", nullable = false, unique = true)
    private String tenQuyenHan;
    
    @Column (name = "nhom_quyen")
    private String nhomQuyen;
}
