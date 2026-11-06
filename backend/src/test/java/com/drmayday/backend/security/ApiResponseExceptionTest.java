package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
class ApiResponseExceptionTest extends SecurityWebTestBase {
    @Test void successHasBusinessCodeMessageAndData() throws Exception {
        mvc.perform(get("/test/ok").header("Authorization","Bearer "+token())).andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(1000)).andExpect(jsonPath("$.message").value("OK")).andExpect(jsonPath("$.data").value("ok"));
    }
    @Test void malformedJsonAndValidationAre400() throws Exception {
        mvc.perform(post("/test/input").header("Authorization","Bearer "+token()).contentType("application/json").content("{"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(2002));
        mvc.perform(post("/test/input").header("Authorization","Bearer "+token()).contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(2001)).andExpect(jsonPath("$.data.value").exists());
    }
    @Test void wrongTypeAndMissingParameterAre400() throws Exception {
        mvc.perform(get("/test/id/not-a-number").header("Authorization","Bearer "+token())).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(2002));
        mvc.perform(get("/test/required").header("Authorization","Bearer "+token())).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(2001));
    }
    @Test void wrongMethodAndMissingEndpointKeep405And404() throws Exception {
        mvc.perform(get("/api/v1/auth/logout").header("Authorization","Bearer "+token())).andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.code").value(2006));
        mvc.perform(get("/api/v1/does-not-exist").header("Authorization","Bearer "+token())).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(2005));
    }
    @Test void authenticationAndAuthorizationResponsesAreStandardized() throws Exception {
        mvc.perform(get("/api/v1/shared/ping")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(3008)).andExpect(jsonPath("$.data").doesNotExist());
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+token())).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(3102));
    }
    @Test void businessAndInternalErrorsDoNotLeakImplementation() throws Exception {
        mvc.perform(get("/test/business").header("Authorization","Bearer "+token())).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(4001));
        String body=mvc.perform(get("/test/error").header("Authorization","Bearer "+token())).andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.code").value(9999)).andExpect(jsonPath("$.message").value("Uncategorized system error"))
            .andReturn().getResponse().getContentAsString();
        for (String secret : new String[]{"SECRET","jdbc:","internal_table","stackTrace"}) assertFalse(body.contains(secret));
    }
}
