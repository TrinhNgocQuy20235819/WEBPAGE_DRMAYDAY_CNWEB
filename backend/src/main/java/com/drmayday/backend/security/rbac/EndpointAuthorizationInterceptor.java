package com.drmayday.backend.security.rbac;
import java.util.*;
import org.springframework.http.server.PathContainer;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.pattern.*;
import jakarta.servlet.http.*;
@Component
public class EndpointAuthorizationInterceptor implements HandlerInterceptor {
    private final EndpointPolicyStore store;
    private final RbacProperties properties;
    public EndpointAuthorizationInterceptor(EndpointPolicyStore store, RbacProperties properties) {
        this.store = store; this.properties = properties;
    }
    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Security filters already require authentication. Non-controller handlers may only produce static resources/404.
        if (!(handler instanceof HandlerMethod)) {
            if (handler instanceof org.springframework.web.servlet.resource.ResourceHttpRequestHandler) return true;
            throw denied();
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String method = request.getMethod();
        if (path.equals("/v3/api-docs") || path.startsWith("/v3/api-docs/")
                || path.equals("/swagger-ui.html") || path.startsWith("/swagger-ui/")) return true;
        if (path.equals("/api/v1/auth/login") && method.equals("POST")) return true;
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser"))
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        if ((path.equals("/api/v1/auth/logout") && method.equals("POST"))
                || (path.equals("/api/v1/shared/ping") && method.equals("GET"))) return true;
        var authorities = auth.getAuthorities().stream().map(a -> a.getAuthority()).collect(java.util.stream.Collectors.toSet());
        // RBAC administration always needs its separate configured capability, including in database mode.
        if (path.startsWith("/api/v1/admin/rbac/") && (properties.getManagePermission().isBlank()
                || !authorities.contains(properties.getManagePermission()))) throw denied();
        var parser = new PathPatternParser();
        var matches = new ArrayList<Map.Entry<PathPattern, EndpointPolicy>>();
        for (var policy : store.policies()) {
            var pattern = parser.parse(policy.path());
            if (method.equals(policy.method()) && pattern.matches(PathContainer.parsePath(path)))
                matches.add(Map.entry(pattern, policy));
        }
        matches.sort((a,b) -> PathPattern.SPECIFICITY_COMPARATOR.compare(a.getKey(), b.getKey()));
        if (matches.isEmpty()) throw denied();
        var best = matches.get(0).getKey();
        for (var match : matches) {
            if (PathPattern.SPECIFICITY_COMPARATOR.compare(best, match.getKey()) != 0) break;
            var required = match.getValue().permissions();
            if (required.isEmpty() || required.contains("!unconfigured!") || !authorities.containsAll(required)) throw denied();
        }
        return true;
    }
    private AccessDeniedException denied() { return new AccessDeniedException("Permission required"); }
}
