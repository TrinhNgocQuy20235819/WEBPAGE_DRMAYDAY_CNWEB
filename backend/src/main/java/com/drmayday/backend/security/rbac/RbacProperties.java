package com.drmayday.backend.security.rbac;
import java.util.*;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
@Data
@ConfigurationProperties(prefix = "security.rbac")
public class RbacProperties {
    private String adminPermission = "";
    private String managePermission = "";
    private String patientPermission = "";
    private String doctorPermission = "";
    private List<Rule> rules = new ArrayList<>();
    @Data public static class Rule {
        private String method;
        private String path;
        private Set<String> permissions = new HashSet<>();
    }
}
