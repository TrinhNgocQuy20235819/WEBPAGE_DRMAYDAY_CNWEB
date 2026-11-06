package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import com.drmayday.backend.modules.admin.rbac.RbacService;
import com.drmayday.backend.security.entity.*;
import com.drmayday.backend.security.repository.*;
import com.drmayday.backend.security.service.*;
import com.drmayday.backend.common.AppException;
class RbacServiceTest {
    RoleRepository roles=mock(RoleRepository.class);
    PermissionRepository permissions=mock(PermissionRepository.class);
    RbacService service=new RbacService(roles,permissions);
    @AfterEach void clean() { SecurityContextHolder.clearContext(); }
    void actor(String... granted) {
        var account=SecurityWebTestBase.account(1L,10L,"actor","unused",granted);
        var principal=new CustomUserDetailsService(mock(SecurityAccountRepository.class)).principal(account);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }
    @Test void createAndListRolePermissionWithoutDatabase() {
        when(roles.save(any())).thenAnswer(i->i.getArgument(0)); when(permissions.save(any())).thenAnswer(i->i.getArgument(0));
        assertEquals("NURSE",service.createRole("NURSE","Nurse").getTenVaiTro());
        assertEquals("VIEW",service.createPermission("VIEW","clinical").getTenQuyenHan());
        service.roles(); service.permissions(); verify(roles).findAll(); verify(permissions).findAll();
    }
    @Test void duplicateNamesAreConflict() {
        when(roles.existsByTenVaiTro("ROLE")).thenReturn(true); when(permissions.existsByTenQuyenHan("VIEW")).thenReturn(true);
        assertEquals(3202,assertThrows(AppException.class,()->service.createRole("ROLE","Role")).getErrorCode().getCode());
        assertThrows(AppException.class,()->service.createPermission("VIEW",null));
        verify(roles,never()).save(any()); verify(permissions,never()).save(any());
    }
    @Test void missingRelationsAreNotFound() {
        assertEquals(3201,assertThrows(AppException.class,()->service.rolePermissions(99L)).getErrorCode().getCode());
        assertThrows(AppException.class,()->service.deletePermission(99L));
    }
    @Test void grantDuplicateAndRevokeAreIdempotent() {
        actor("VIEW"); var role=new VaiTroEntity(20L,"TARGET","Target",new HashSet<>());
        var permission=new QuyenHanEntity(3L,"VIEW","group");
        when(roles.findForUpdate(20L)).thenReturn(Optional.of(role)); when(permissions.findById(3L)).thenReturn(Optional.of(permission));
        service.assign(20L,3L,true); service.assign(20L,3L,true); assertEquals(1,role.getQuyenHans().size());
        service.assign(20L,3L,false); service.assign(20L,3L,false); assertTrue(role.getQuyenHans().isEmpty());
    }
    @Test void cannotDelegatePermissionYouDoNotHold() {
        actor("VIEW"); when(roles.findForUpdate(20L)).thenReturn(Optional.of(new VaiTroEntity(20L,"TARGET","Target",new HashSet<>())));
        when(permissions.findById(3L)).thenReturn(Optional.of(new QuyenHanEntity(3L,"ADMIN","group")));
        assertThrows(org.springframework.security.access.AccessDeniedException.class,()->service.assign(20L,3L,true)); verify(roles,never()).save(any());
    }
    @Test void permissionInUseCannotBeRenamedOrDeleted() {
        when(permissions.findById(3L)).thenReturn(Optional.of(new QuyenHanEntity(3L,"VIEW","group")));
        when(roles.findUsingPermission(3L)).thenReturn(List.of(new VaiTroEntity()));
        assertThrows(AppException.class,()->service.updatePermission(3L,"ADMIN",null)); assertThrows(AppException.class,()->service.deletePermission(3L));
        verify(permissions,never()).delete(any()); verify(permissions,never()).save(any());
    }
    @Test void unusedPermissionCanBeEditedAndDeleted() {
        var p=new QuyenHanEntity(3L,"VIEW","group"); when(permissions.findById(3L)).thenReturn(Optional.of(p)); when(permissions.save(any())).thenAnswer(i->i.getArgument(0));
        assertEquals("VIEW_NEW",service.updatePermission(3L,"VIEW_NEW",null).getTenQuyenHan()); service.deletePermission(3L); verify(permissions).delete(p);
    }
    @Test void roleNamesNeverActAsPermissionAuthorities() {
        var account=SecurityWebTestBase.account(1L,10L,"x","unused","VIEW"); account.getVaiTro().setTenVaiTro("ADMIN_PING");
        var principal=new CustomUserDetailsService(mock(SecurityAccountRepository.class)).principal(account);
        assertEquals(List.of("VIEW"),principal.getAuthorities().stream().map(a->a.getAuthority()).toList());
    }
}
