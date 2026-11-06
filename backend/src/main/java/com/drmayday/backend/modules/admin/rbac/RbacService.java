package com.drmayday.backend.modules.admin.rbac;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import com.drmayday.backend.security.service.AccountPrincipal;
import com.drmayday.backend.security.entity.*;
import com.drmayday.backend.security.repository.*;
import com.drmayday.backend.common.*;
@Service
@Transactional
public class RbacService {
    private final RoleRepository roles;
    private final PermissionRepository permissions;
    public RbacService(RoleRepository roles, PermissionRepository permissions) { this.roles = roles; this.permissions = permissions; }
    @Transactional(readOnly = true) public List<VaiTroEntity> roles() { return roles.findAll(); }
    @Transactional(readOnly = true) public List<QuyenHanEntity> permissions() { return permissions.findAll(); }
    public VaiTroEntity createRole(String name, String display) {
        if (roles.existsByTenVaiTro(name)) throw new AppException(ErrorCode.RBAC_CONFLICT);
        return roles.save(new VaiTroEntity(null, name, display, new HashSet<>()));
    }
    public QuyenHanEntity createPermission(String name, String group) {
        if (permissions.existsByTenQuyenHan(name)) throw new AppException(ErrorCode.RBAC_CONFLICT);
        return permissions.save(new QuyenHanEntity(null, name, group));
    }
    public QuyenHanEntity updatePermission(Long id, String name, String group) {
        var permission = permission(id);
        // Renaming a permission can transfer endpoint access globally. Only unused permissions may be edited.
        if (!roles.findUsingPermission(id).isEmpty()) throw new AppException(ErrorCode.RBAC_CONFLICT);
        if (!permission.getTenQuyenHan().equals(name) && permissions.existsByTenQuyenHan(name)) throw new AppException(ErrorCode.RBAC_CONFLICT);
        permission.setTenQuyenHan(name); permission.setNhomQuyen(group); return permissions.save(permission);
    }
    public void deletePermission(Long id) {
        var permission = permission(id);
        if (!roles.findUsingPermission(id).isEmpty()) throw new AppException(ErrorCode.RBAC_CONFLICT);
        permissions.delete(permission);
    }
    @Transactional(readOnly = true) public Set<QuyenHanEntity> rolePermissions(Long id) { return Set.copyOf(role(id).getQuyenHans()); }
    public void assign(Long roleId, Long permissionId, boolean grant) {
        var role = roles.findForUpdate(roleId).orElseThrow(() -> new AppException(ErrorCode.RBAC_NOT_FOUND));
        var permission = permission(permissionId);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AccountPrincipal actor)
                || Objects.equals(actor.getRoleId(), roleId)
                || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals(permission.getTenQuyenHan())))
            throw new AccessDeniedException("Cannot change own role or delegate an unheld permission");
        var assigned = new HashSet<>(role.getQuyenHans());
        assigned.removeIf(p -> p.getMaQuyenHan().equals(permissionId));
        if (grant) assigned.add(permission);
        role.setQuyenHans(assigned); roles.save(role);
    }
    private VaiTroEntity role(Long id) { return roles.findById(id).orElseThrow(() -> new AppException(ErrorCode.RBAC_NOT_FOUND)); }
    private QuyenHanEntity permission(Long id) { return permissions.findById(id).orElseThrow(() -> new AppException(ErrorCode.RBAC_NOT_FOUND)); }
}
