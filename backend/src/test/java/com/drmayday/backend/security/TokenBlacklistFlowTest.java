package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
class TokenBlacklistFlowTest extends SecurityWebTestBase {
    @Test void logoutRevokesOnlyThePresentedToken() throws Exception {
        String a=token(), b=token(); assertNotEquals(a,b);
        mvc.perform(get("/api/v1/shared/ping").header("Authorization","Bearer "+a)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/logout").header("Authorization","Bearer "+a)).andExpect(status().isOk()).andExpect(jsonPath("$.code").value(1000));
        assertTrue(store.contains(provider.parseToken(a).getId()));
        mvc.perform(get("/api/v1/shared/ping").header("Authorization","Bearer "+a)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/logout").header("Authorization","Bearer "+a)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/shared/ping").header("Authorization","Bearer "+b)).andExpect(status().isOk());
    }
    @Test void logoutRequiresAValidUnexpiredBearerToken() throws Exception {
        mvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized());
        for (String header : new String[]{"Basic invalid", "Bearer invalid", "Bearer "+token()+"tampered"})
            mvc.perform(post("/api/v1/auth/logout").header("Authorization",header)).andExpect(status().isUnauthorized());
        ReflectionTestUtils.setField(provider,"jwtExpirationMs",-1000L);
        mvc.perform(post("/api/v1/auth/logout").header("Authorization","Bearer "+token())).andExpect(status().isUnauthorized());
    }
    @Test void deletedAccountReturnsUnauthorized() throws Exception {
        when(accounts.findById(1L)).thenReturn(java.util.Optional.empty());
        mvc.perform(post("/api/v1/auth/logout").header("Authorization","Bearer "+token())).andExpect(status().isUnauthorized());
    }
    @Test void unavailableBlacklistFailsClosed() throws Exception {
        store.unavailable=true;
        mvc.perform(get("/api/v1/shared/ping").header("Authorization","Bearer "+token()))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value(9901));
    }
    @Test void failureDuringLogoutNeverReportsSuccess() throws Exception {
        var failing = mock(com.drmayday.backend.security.service.TokenBlacklistService.class);
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("secret")).when(failing).blacklistToken(any(),any());
        var controller = new com.drmayday.backend.modules.auth.AuthController(provider,failing,context.getBean(com.drmayday.backend.modules.auth.LoginService.class));
        assertThrows(org.springframework.dao.DataAccessException.class, () -> controller.logout("Bearer "+token()));
    }
}
