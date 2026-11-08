package com.drmayday.backend.security.rbac;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
@EnableConfigurationProperties(RbacProperties.class)
public class RbacWebConfig implements WebMvcConfigurer {
    private final EndpointAuthorizationInterceptor interceptor;
    public RbacWebConfig(EndpointAuthorizationInterceptor interceptor) { this.interceptor = interceptor; }
    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(interceptor); }
}
