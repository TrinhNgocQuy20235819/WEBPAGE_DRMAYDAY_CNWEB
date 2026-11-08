package com.drmayday.backend.security;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.support.TestPropertySourceUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import com.drmayday.backend.common.*;
import com.drmayday.backend.modules.auth.*;
import com.drmayday.backend.modules.admin.AdminSampleController;
import com.drmayday.backend.modules.admin.rbac.*;
import com.drmayday.backend.modules.shared.SharedSampleController;
import com.drmayday.backend.security.config.SecurityConfig;
import com.drmayday.backend.security.entity.*;
import com.drmayday.backend.security.jwt.*;
import com.drmayday.backend.security.repository.*;
import com.drmayday.backend.security.service.*;
import com.drmayday.backend.security.rbac.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
public abstract class SecurityWebTestBase {
    protected AnnotationConfigWebApplicationContext context;
    protected MockMvc mvc;
    protected JwtTokenProvider provider;
    protected SecurityAccountRepository accounts;
    protected FakeRevocationStore store;
    protected TaiKhoanEntity patient;
    protected TaiKhoanEntity admin;
    protected List<EndpointPolicy> policies;
    @BeforeEach void setUpWeb() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        TestPropertySourceUtils.addInlinedPropertiesToEnvironment(context,
                "jwt.secret=isolated-test-only-key-not-an-environment-credential", "jwt.expiration=60000",
                "security.rbac.manage-permission=RBAC_MANAGE");
        context.register(TestConfig.class); context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(context.getBean(FilterChainProxy.class)).build();
        provider = context.getBean(JwtTokenProvider.class); accounts = context.getBean(SecurityAccountRepository.class);
        store = context.getBean(FakeRevocationStore.class);
        policies = context.getBean(TestPolicies.class).values;
        var encoder = context.getBean(org.springframework.security.crypto.password.PasswordEncoder.class);
        patient = account(1L, 10L, "patient-login-differs-from-phone", encoder.encode("test-password"), "PATIENT_VIEW", "TEST");
        admin = account(2L, 20L, "admin", encoder.encode("admin-password"), "ADMIN_PING", "RBAC_MANAGE", "PATIENT_VIEW", "TEST");
        when(accounts.findById(1L)).thenAnswer(i -> Optional.of(patient));
        when(accounts.findById(2L)).thenAnswer(i -> Optional.of(admin));
        when(accounts.findByPhone("0900000001")).thenAnswer(i -> List.of(patient));
        when(accounts.findByPhone("0900000002")).thenAnswer(i -> List.of(admin));
    }
    @AfterEach void closeWeb() { context.close(); org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
    protected static TaiKhoanEntity account(Long id, Long roleId, String name, String password, String... permissions) {
        Set<QuyenHanEntity> set = new HashSet<>(); long n=0;
        for (String permission : permissions) set.add(new QuyenHanEntity(++n, permission, "test"));
        var role = new VaiTroEntity(roleId, "role_" + roleId, "Test role", set);
        return new TaiKhoanEntity(id, null, role, name, password, true);
    }
    protected String token() { return provider.generateToken(1L, patient.getTenDangNhap(), "ADMIN"); }
    protected String adminToken() { return provider.generateToken(2L, "admin", "PATIENT"); }
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class,
        JwtAccessDeniedHandler.class, JwtTokenProvider.class, CustomUserDetailsService.class,
        TokenBlacklistService.class, LoginService.class, AuthController.class, GlobalExceptionHandler.class,
        AdminSampleController.class, SharedSampleController.class, RbacController.class, RbacService.class,
        EndpointAuthorizationInterceptor.class, RbacWebConfig.class, TestController.class})
    static class TestConfig {
        @Bean SecurityAccountRepository accounts() { return mock(SecurityAccountRepository.class); }
        @Bean RoleRepository roles() { return mock(RoleRepository.class); }
        @Bean PermissionRepository permissions() { return mock(PermissionRepository.class); }
        @Bean FakeRevocationStore store() { return new FakeRevocationStore(); }
        @Bean TestPolicies policies() { return new TestPolicies(); }
    }
    static class TestPolicies implements EndpointPolicyStore {
        boolean unavailable;
        final List<EndpointPolicy> values = new ArrayList<>(List.of(
            new EndpointPolicy("GET", "/api/v1/admin/ping", Set.of("ADMIN_PING")),
            new EndpointPolicy("GET", "/test/**", Set.of("TEST")),
            new EndpointPolicy("POST", "/test/**", Set.of("TEST")),
            new EndpointPolicy("PUT", "/api/v1/admin/rbac/**", Set.of("RBAC_MANAGE")),
            new EndpointPolicy("GET", "/api/v1/admin/rbac/**", Set.of("RBAC_MANAGE"))));
        @Override public List<EndpointPolicy> policies() { if (unavailable) throw new org.springframework.dao.DataAccessResourceFailureException("offline"); return values; }
    }
    @RestController static class TestController {
        record Input(@NotBlank String value) { }
        @GetMapping("/test/ok") public ApiResponse<String> ok() { return ApiResponse.success("ok"); }
        @GetMapping("/test/id/{id}") public ApiResponse<Long> id(@PathVariable Long id) { return ApiResponse.success(id); }
        @GetMapping("/test/required") public ApiResponse<String> required(@RequestParam String name) { return ApiResponse.success(name); }
        @PostMapping("/test/input") public ApiResponse<String> input(@Valid @RequestBody Input input) { return ApiResponse.success(input.value()); }
        @GetMapping("/test/business") public void business() { throw new AppException(ErrorCode.MEDICAL_RECORD_NOT_FOUND); }
        @GetMapping("/test/error") public void error() { throw new RuntimeException("jdbc:postgresql://secret-host password=SECRET SQL SELECT internal_table"); }
        @GetMapping("/unmapped") public String unmapped() { return "must never execute"; }
    }
}
