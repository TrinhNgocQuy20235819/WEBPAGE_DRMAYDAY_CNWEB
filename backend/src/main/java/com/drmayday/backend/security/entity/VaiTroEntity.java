package com.drmayday.backend.security.entity;

import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table (name = "vaitro")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class VaiTroEntity  {

    @Id
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    @Column (name = "ma_vai_tro")
    private Long maVaiTro;

    @Column (name = "ten_vai_tro", nullable = false, unique = true)
    private String tenVaiTro;

    @Column (name = "ten_hien_thi", nullable = false)
    private String tenHienThi;
    
    @ManyToMany (fetch = FetchType.EAGER)
    @JoinTable (
        name = "vaitroquyenhan",
        joinColumns = @JoinColumn(name = "ma_vai_tro"),
        inverseJoinColumns = @JoinColumn(name = "ma_quyen_han")
    )
    private Set<QuyenHanEntity> quyenHans;
}
