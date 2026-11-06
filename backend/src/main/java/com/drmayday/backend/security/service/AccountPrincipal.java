package com.drmayday.backend.security.service;
import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;
public class AccountPrincipal extends User {
    private final Long accountId;
    private final Long roleId;
    public AccountPrincipal(Long accountId, Long roleId, String username, String password,
            boolean active, Collection<? extends GrantedAuthority> authorities) {
        super(username, password, active, true, true, true, authorities);
        this.accountId = accountId;
        this.roleId = roleId;
    }
    public Long getAccountId() { return accountId; }
    public Long getRoleId() { return roleId; }
}
