package com.drmayday.backend.security;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.drmayday.backend.security.rbac.*;
import com.drmayday.backend.security.entity.QuyenHanEntity;
class DynamicRbacAuthorizationTest extends SecurityWebTestBase {
    @Test void patientDeniedAndAdminAllowedRegardlessOfJwtRole() throws Exception {
        mvc.perform(get("/api/v1/admin/ping")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+token()))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(3102));
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+adminToken())).andExpect(status().isOk());
    }
    @Test void revokeAndGrantTakeEffectWithoutNewJwt() throws Exception {
        String token=adminToken(); var role=admin.getVaiTro(); var original=new HashSet<>(role.getQuyenHans());
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        role.getQuyenHans().removeIf(p->p.getTenQuyenHan().equals("ADMIN_PING"));
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        role.setQuyenHans(original);
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+token)).andExpect(status().isOk());
    }
    @Test void noPolicyAndDifferentMethodDenied() throws Exception {
        mvc.perform(get("/unmapped").header("Authorization","Bearer "+token())).andExpect(status().isForbidden());
        policies.removeIf(p->p.method().equals("POST"));
        mvc.perform(post("/test/input").header("Authorization","Bearer "+token()).contentType("application/json").content("{\"value\":\"ok\"}"))
            .andExpect(status().isForbidden());
    }
    @Test void specificPathVariablePolicyOverridesBroadGrantAndEndpointPolicyIsLive() throws Exception {
        String token=token(); policies.add(new EndpointPolicy("GET","/test/id/{id}",Set.of("SENSITIVE")));
        mvc.perform(get("/test/id/42").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        policies.removeIf(p->p.path().equals("/test/id/{id}"));
        mvc.perform(get("/test/id/42").header("Authorization","Bearer "+token)).andExpect(status().isOk());
    }
    @Test void emptyPolicyDeniesAndUnconfiguredAdminDenies() throws Exception {
        policies.removeIf(p->p.path().equals("/api/v1/admin/ping"));
        policies.add(new EndpointPolicy("GET","/api/v1/admin/ping",Set.of()));
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+adminToken())).andExpect(status().isForbidden());
        var config=new RbacProperties(); var configured=new ConfiguredEndpointPolicyStore(config);
        org.junit.jupiter.api.Assertions.assertTrue(configured.policies().stream().filter(p->p.path().equals("/api/v1/admin/ping")).allMatch(p->p.permissions().contains("!unconfigured!")));
    }
    @Test void policyDatabaseFailureNeverAllowsAccess() throws Exception {
        context.getBean(TestPolicies.class).unavailable=true;
        mvc.perform(get("/api/v1/admin/ping").header("Authorization","Bearer "+adminToken())).andExpect(status().isServiceUnavailable());
    }
    @Test void selfGrantRejectedByHttpAndPatientCannotManageRbac() throws Exception {
        var roles=context.getBean(com.drmayday.backend.security.repository.RoleRepository.class);
        var permissions=context.getBean(com.drmayday.backend.security.repository.PermissionRepository.class);
        when(roles.findForUpdate(20L)).thenReturn(Optional.of(admin.getVaiTro()));
        when(permissions.findById(99L)).thenReturn(Optional.of(new QuyenHanEntity(99L,"ADMIN_PING","test")));
        mvc.perform(put("/api/v1/admin/rbac/roles/20/permissions/99").header("Authorization","Bearer "+adminToken())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/rbac/roles").header("Authorization","Bearer "+token())).andExpect(status().isForbidden());
        verify(roles,never()).save(any());
    }
}
