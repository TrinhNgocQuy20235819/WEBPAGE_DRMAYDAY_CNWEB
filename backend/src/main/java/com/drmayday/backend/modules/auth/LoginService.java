package com.drmayday.backend.modules.auth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.drmayday.backend.common.*;
import com.drmayday.backend.security.jwt.JwtTokenProvider;
import com.drmayday.backend.security.repository.SecurityAccountRepository;
import com.drmayday.backend.security.entity.TaiKhoanEntity;
import com.drmayday.backend.security.service.CustomUserDetailsService;
import java.util.List;
@Service
public class LoginService {
    private final SecurityAccountRepository accounts;
    private final PasswordEncoder passwords;
    private final JwtTokenProvider jwt;
    private final CustomUserDetailsService users;
    private final String identitySource;
    private final String dummyHash;
    public LoginService(SecurityAccountRepository accounts, PasswordEncoder passwords, JwtTokenProvider jwt,
            CustomUserDetailsService users, @Value("${security.login.identity-source:phone}") String identitySource) {
        if (!List.of("phone", "username").contains(identitySource)) throw new IllegalArgumentException("Invalid identity source");
        this.accounts = accounts; this.passwords = passwords; this.jwt = jwt; this.users = users;
        this.identitySource = identitySource; this.dummyHash = passwords.encode("timing-only-dummy-not-a-user-password");
    }
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        List<TaiKhoanEntity> matches = identitySource.equals("phone") ? accounts.findByPhone(request.phone())
                : accounts.findByTenDangNhap(request.phone()).stream().toList();
        TaiKhoanEntity account = matches.size() == 1 ? matches.get(0) : null;
        boolean valid;
        try { valid = passwords.matches(request.password(), account == null ? dummyHash : account.getMatKhauMaHoa()); }
        catch (IllegalArgumentException ex) { valid = false; }
        if (!valid || account == null || !Boolean.TRUE.equals(account.getTrangThaiHoatDong()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        var principal = users.principal(account);
        String token = jwt.generateToken(account.getMaTaiKhoan(), account.getTenDangNhap(), null);
        return new LoginResponse(token, "Bearer", Math.max(0, (jwt.getExpirationDateFromToken(token).getTime() - System.currentTimeMillis()) / 1000),
                new LoginResponse.UserInfo(account.getMaTaiKhoan(), account.getTenDangNhap(),
                    account.getVaiTro() == null ? null : account.getVaiTro().getTenVaiTro(),
                    principal.getAuthorities().stream().map(a -> a.getAuthority()).toList()));
    }
}
