package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.fasterxml.jackson.databind.ObjectMapper;
class LoginFlowTest extends SecurityWebTestBase {
    @Test void loginUsesPhoneJoinAndReturnsSafeUserAndUniqueTokens() throws Exception {
        String request="{\"phone\":\"0900000001\",\"password\":\"test-password\"}";
        String a=mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(1000))
            .andExpect(jsonPath("$.data.user.accountId").value(1)).andExpect(jsonPath("$.data.user.matKhauMaHoa").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        String b=mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var json=new ObjectMapper(); var ta=json.readTree(a).at("/data/accessToken").asText(); var tb=json.readTree(b).at("/data/accessToken").asText();
        assertEquals(1L,provider.getAccountIdFromToken(ta)); assertNotEquals(provider.parseToken(ta).getId(),provider.parseToken(tb).getId());
        assertFalse(a.contains(patient.getMatKhauMaHoa())); verify(accounts,times(2)).findByPhone("0900000001"); verify(accounts,never()).findByTenDangNhap(any());
    }
    @Test void wrongPasswordUnknownDisabledAndAmbiguousAccountUseSameError() throws Exception {
        for (String body : new String[]{"{\"phone\":\"0900000001\",\"password\":\"wrong\"}","{\"phone\":\"0999999999\",\"password\":\"wrong\"}"})
            mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(3008));
        patient.setTrangThaiHoatDong(false);
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"phone\":\"0900000001\",\"password\":\"test-password\"}")).andExpect(status().isUnauthorized());
        patient.setTrangThaiHoatDong(true); when(accounts.findByPhone("0900000001")).thenReturn(java.util.List.of(patient,admin));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"phone\":\"0900000001\",\"password\":\"test-password\"}")).andExpect(status().isUnauthorized());
    }
    @Test void missingInputsAreBadRequest() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(2001));
    }
    @Test void passwordEncoderSupportsExistingBcryptAndPrefixButNeverPlaintext() {
        var encoder=context.getBean(PasswordEncoder.class);
        assertTrue(encoder.matches("test-password",patient.getMatKhauMaHoa().replace("{bcrypt}","")));
        assertTrue(encoder.matches("test-password","{bcrypt}"+patient.getMatKhauMaHoa().replace("{bcrypt}","")));
        assertFalse(encoder.matches("plaintext","plaintext"));
    }
    @Test void usernameReuseCannotTransferTokenToAnotherAccount() throws Exception {
        String old=token(); when(accounts.findById(1L)).thenReturn(java.util.Optional.empty());
        when(accounts.findByTenDangNhap(patient.getTenDangNhap())).thenReturn(java.util.Optional.of(admin));
        mvc.perform(get("/api/v1/shared/ping").header("Authorization","Bearer "+old)).andExpect(status().isUnauthorized());
        verify(accounts,never()).findByTenDangNhap(any());
    }
    @Test void disabledAccountCannotUseExistingToken() throws Exception {
        String token=token(); patient.setTrangThaiHoatDong(false);
        mvc.perform(get("/api/v1/shared/ping").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
}
