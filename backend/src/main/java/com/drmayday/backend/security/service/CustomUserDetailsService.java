package com.drmayday.backend.security.service;
import java.util.ArrayList;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.drmayday.backend.security.entity.TaiKhoanEntity;
import com.drmayday.backend.security.repository.SecurityAccountRepository;
@Service
@Transactional(readOnly = true)
public class CustomUserDetailsService implements UserDetailsService {
    private final SecurityAccountRepository repository;
    public CustomUserDetailsService(SecurityAccountRepository repository) { this.repository = repository; }
    @Override public AccountPrincipal loadUserByUsername(String username) {
        return principal(repository.findByTenDangNhap(username).orElseThrow(() -> new UsernameNotFoundException("Invalid account")));
    }
    public AccountPrincipal loadUserById(Long id) {
        return principal(repository.findById(id).orElseThrow(() -> new UsernameNotFoundException("Invalid account")));
    }
    public AccountPrincipal principal(TaiKhoanEntity account) {
        var authorities = new ArrayList<GrantedAuthority>();
        var role = account.getVaiTro();
        // Only permissions are authorities. A role name must never impersonate a permission.
        if (role != null && role.getQuyenHans() != null) {
            role.getQuyenHans().forEach(p -> authorities.add(new SimpleGrantedAuthority(p.getTenQuyenHan())));
        }
        return new AccountPrincipal(account.getMaTaiKhoan(), role == null ? null : role.getMaVaiTro(),
                account.getTenDangNhap(), account.getMatKhauMaHoa(),
                Boolean.TRUE.equals(account.getTrangThaiHoatDong()), authorities);
    }
}
