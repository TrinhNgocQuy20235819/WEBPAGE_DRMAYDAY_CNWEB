package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.*;
import com.drmayday.backend.security.rbac.*;
import java.sql.ResultSet;
import java.util.List;
class JdbcEndpointPolicyStoreTest {
    @Test void databasePolicyUsesCurrentRowsAndKeepsUnmappedEndpointsDenied() throws Exception {
        var jdbc=mock(JdbcTemplate.class);
        when(jdbc.query(anyString(),org.mockito.ArgumentMatchers.<RowMapper<EndpointPolicy>>any())).thenAnswer(invocation -> {
            var rs=mock(ResultSet.class); when(rs.getString(1)).thenReturn("GET"); when(rs.getString(2)).thenReturn("/medical/{id}");
            when(rs.getString(3)).thenReturn(null);
            RowMapper<EndpointPolicy> mapper=invocation.getArgument(1);
            return List.of(mapper.mapRow(rs,0));
        });
        var store=new JdbcEndpointPolicyStore(jdbc);
        assertTrue(store.policies().get(0).permissions().contains("!unconfigured!"));
        doReturn(List.of(new EndpointPolicy("GET","/medical/{id}",java.util.Set.of("VIEW")))).when(jdbc).query(anyString(),org.mockito.ArgumentMatchers.<RowMapper<EndpointPolicy>>any());
        assertEquals(java.util.Set.of("VIEW"),store.policies().get(0).permissions());
    }
    @Test void missingSchemaNeverFallsBackToConfiguredOrPublicRules() {
        var jdbc=mock(JdbcTemplate.class);
        when(jdbc.query(anyString(),org.mockito.ArgumentMatchers.<RowMapper<EndpointPolicy>>any())).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("missing schema"));
        assertThrows(org.springframework.dao.DataAccessException.class,()->new JdbcEndpointPolicyStore(jdbc).policies());
    }
}
