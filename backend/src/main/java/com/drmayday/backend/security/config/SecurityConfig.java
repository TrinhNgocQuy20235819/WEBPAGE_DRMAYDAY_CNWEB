package com.drmayday.backend.security.config;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.drmayday.backend.security.*;
import com.drmayday.backend.security.jwt.JwtAuthenticationFilter;
@Configuration
public class SecurityConfig {
    @Bean public PasswordEncoder passwordEncoder() {
        var bcrypt = new BCryptPasswordEncoder();
        var encoder = new DelegatingPasswordEncoder("bcrypt", java.util.Map.of("bcrypt", bcrypt));
        // Existing unprefixed BCrypt hashes remain valid; unknown formats fail closed.
        encoder.setDefaultPasswordEncoderForMatches(bcrypt);
        return encoder;
    }
    @Bean public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter filter,
            JwtAuthenticationEntryPoint entryPoint, JwtAccessDeniedHandler denied) throws Exception {
        return http.csrf(c -> c.disable()).cors(org.springframework.security.config.Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                    .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/api/v1/auth/login").permitAll()
                    .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint).accessDeniedHandler(denied))
                .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
    }
}
