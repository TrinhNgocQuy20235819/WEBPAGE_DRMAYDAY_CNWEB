package com.drmayday.backend.security.rbac;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
@Component
@ConditionalOnProperty(name = "security.rbac.source", havingValue = "database")
public class JdbcEndpointPolicyStore implements EndpointPolicyStore {
    private final JdbcTemplate jdbc;
    public JdbcEndpointPolicyStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public List<EndpointPolicy> policies() {
        // LEFT JOIN keeps unmapped endpoints visible as deny rules instead of allowing a broader policy.
        return jdbc.query("SELECT e.http_method, e.path_pattern, q.ten_quyen_han FROM api_endpoints e "
                + "LEFT JOIN permissions_endpoints pe ON pe.endpoint_id = e.id "
                + "LEFT JOIN quyenhan q ON q.ma_quyen_han = pe.ma_quyen_han", (rs, row) ->
                new EndpointPolicy(rs.getString(1), rs.getString(2),
                    Set.of(rs.getString(3) == null ? "!unconfigured!" : rs.getString(3))));
    }
}
