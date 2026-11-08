package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.drmayday.backend.modules.auth.*;
import com.drmayday.backend.security.repository.SecurityAccountRepository;
import com.drmayday.backend.security.service.CustomUserDetailsService;
import com.drmayday.backend.security.jwt.JwtTokenProvider;
import com.drmayday.backend.common.AppException;
class LoginServiceTest {
    @Test void phoneLookupFailureNeverFallsBackToUsername() {
        var repo=mock(SecurityAccountRepository.class);
        when(repo.findByPhone("0900000001")).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("missing table"));
        var service=new LoginService(repo,new BCryptPasswordEncoder(),mock(JwtTokenProvider.class),new CustomUserDetailsService(repo),"phone");
        assertThrows(org.springframework.dao.DataAccessException.class,()->service.login(new LoginRequest("0900000001","password")));
        verify(repo,never()).findByTenDangNhap(any());
    }
    @Test void explicitUsernameModeDoesNotAttemptPhoneJoinAndRejectsUnsupportedHash() {
        var repo=mock(SecurityAccountRepository.class);
        var account=SecurityWebTestBase.account(1L,10L,"0900000001","unsupported-plaintext","VIEW");
        when(repo.findByTenDangNhap("0900000001")).thenReturn(Optional.of(account));
        var jwt=mock(JwtTokenProvider.class);
        var service=new LoginService(repo,new BCryptPasswordEncoder(),jwt,new CustomUserDetailsService(repo),"username");
        assertThrows(AppException.class,()->service.login(new LoginRequest("0900000001","unsupported-plaintext")));
        verify(repo,never()).findByPhone(any()); verifyNoInteractions(jwt);
    }
    @Test void invalidIdentitySourceFailsAtStartup() {
        var repo=mock(SecurityAccountRepository.class);
        assertThrows(IllegalArgumentException.class,()->new LoginService(repo,new BCryptPasswordEncoder(),mock(JwtTokenProvider.class),new CustomUserDetailsService(repo),"auto"));
    }
}
