package com.drmayday.backend.security.rbac;
import java.util.Set;
public record EndpointPolicy(String method, String path, Set<String> permissions) { }
