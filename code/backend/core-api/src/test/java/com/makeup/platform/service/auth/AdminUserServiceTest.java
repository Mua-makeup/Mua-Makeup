package com.makeup.platform.service.auth;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.admin.AdminCreateUserReq;
import com.makeup.platform.entity.auth.*;
import com.makeup.platform.mapper.auth.AuthMapper;
import com.makeup.platform.repository.*;
import com.makeup.platform.service.auth.impl.AdminUserServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {
    @Mock UserRepository users; @Mock RoleRepository roles; @Mock PasswordEncoder encoder;
    @Mock MuaProfileRepository profiles; @Mock AuthMapper mapper;
    @InjectMocks AdminUserServiceImpl service;
    @Test void duplicatePhoneNeverCreatesUser() {
        var req = new AdminCreateUserReq(); req.setPhoneNumber("0900000000");
        when(users.existsByPhoneNumber("0900000000")).thenReturn(true);
        assertEquals("ERR_PHONE_ALREADY_EXISTS", assertThrows(CustomBusinessException.class, () -> service.createUser(req)).getErrorCode());
        verify(users,never()).save(any()); verifyNoInteractions(encoder);
    }
    @Test void newUserStoresOnlyEncodedPassword() {
        var req = new AdminCreateUserReq(); req.setPhoneNumber("0900000000"); req.setFullName(" Customer "); req.setPassword("test-password");
        var role = RoleEntity.builder().name("ROLE_CUSTOMER").build();
        when(roles.findByName("ROLE_CUSTOMER")).thenReturn(Optional.of(role));
        when(encoder.encode("test-password")).thenReturn("encoded-password");
        when(users.save(any())).thenAnswer(i -> { UserEntity user=i.getArgument(0); user.setId(7L); return user; });
        service.createUser(req);
        var captor=ArgumentCaptor.forClass(UserEntity.class); verify(users).save(captor.capture());
        assertEquals("encoded-password",captor.getValue().getPasswordHash());
        assertEquals("Customer",captor.getValue().getFullName()); verifyNoInteractions(profiles);
    }
    @Test void deactivationPreservesUserAndRole() {
        var user = UserEntity.builder().fullName("User").isActive(true).build();
        when(users.findById(1L)).thenReturn(Optional.of(user)); when(users.save(user)).thenReturn(user);
        service.updateUserStatus(1L,false); assertFalse(user.getIsActive()); verify(users).save(user);
    }
}
