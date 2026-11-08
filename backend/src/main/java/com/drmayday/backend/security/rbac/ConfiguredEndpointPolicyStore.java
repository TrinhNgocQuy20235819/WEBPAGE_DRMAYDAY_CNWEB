package com.drmayday.backend.security.rbac;

import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "security.rbac.source", havingValue = "configuration", matchIfMissing = true)
public class ConfiguredEndpointPolicyStore implements EndpointPolicyStore {

    private final RbacProperties config;

    public ConfiguredEndpointPolicyStore(RbacProperties config) {
        this.config = config;
    }

    @Override
    public List<EndpointPolicy> policies() {
        var rules = new ArrayList<EndpointPolicy>();
        for (var r : config.getRules()) {
            rules.add(new EndpointPolicy(r.getMethod(), r.getPath(), Set.copyOf(r.getPermissions())));
        }

        add(rules, "GET", "/api/v1/admin/ping", config.getAdminPermission());
        add(rules, "GET", "/api/v1/patient/ping", config.getPatientPermission());
        add(rules, "GET", "/api/v1/doctor/ping", config.getDoctorPermission());

        // Every administration endpoint requires the management permission
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) {
            add(rules, method, "/api/v1/admin/rbac/**", config.getManagePermission());
        }

        // Lesion Tracking and AI Inference endpoints for patients (fail-closed if unconfigured)
        String patientPerm = (config.getPatientPermission() != null && !config.getPatientPermission().isBlank())
                ? config.getPatientPermission()
                : "!unconfigured!";

        for (String method : List.of("GET", "POST", "PATCH", "PUT", "DELETE")) {
            rules.add(new EndpointPolicy(method, "/api/v1/lesion-episodes", Set.of(patientPerm)));
            rules.add(new EndpointPolicy(method, "/api/v1/lesion-episodes/**", Set.of(patientPerm)));
            rules.add(new EndpointPolicy(method, "/api/v1/lesion-locations", Set.of(patientPerm)));
            rules.add(new EndpointPolicy(method, "/api/v1/lesion-locations/**", Set.of(patientPerm)));
            rules.add(new EndpointPolicy(method, "/api/v1/lesion-photos", Set.of(patientPerm)));
            rules.add(new EndpointPolicy(method, "/api/v1/lesion-photos/**", Set.of(patientPerm)));
            rules.add(new EndpointPolicy(method, "/api/v1/ai/**", Set.of(patientPerm)));
        }

        return rules;
    }

    private void add(List<EndpointPolicy> rules, String method, String path, String permission) {
        // Empty configuration is a deny rule, never an authenticated-only grant.
        rules.add(new EndpointPolicy(method, path, Set.of(permission == null || permission.isBlank() ? "!unconfigured!" : permission)));
    }
}
