package com.makeup.platform.service.auth;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.auth.impl.UserServiceImpl;
import com.makeup.platform.service.media.MediaStorageService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository users;
    @Mock AuthService auth;
    @Mock MediaStorageService media;
    @InjectMocks UserServiceImpl service;
    @Test void normalizesProfileWithoutChangingIdentity() {
        var user = UserEntity.builder().phoneNumber("0900000000").email("old@example.test").build(); user.setId(1L);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        var req = new UpdateProfileReq(); req.setFullName("  New Name  "); req.setEmail("  NEW@EXAMPLE.TEST  ");
        service.updateProfile(1L, req);
        assertEquals("New Name", user.getFullName()); assertEquals("new@example.test", user.getEmail());
        assertEquals("0900000000", user.getPhoneNumber());
        verify(users).save(user); verify(auth).getCurrentUser(1L);
    }
    @Test void duplicateEmailIsRejected() {
        when(users.findById(1L)).thenReturn(Optional.of(new UserEntity()));
        when(users.existsByEmailAndIdNot("used@example.test", 1L)).thenReturn(true);
        var req = new UpdateProfileReq(); req.setEmail("used@example.test");
        assertEquals("ERR_EMAIL_ALREADY_EXISTS", assertThrows(CustomBusinessException.class, () -> service.updateProfile(1L, req)).getErrorCode());
        verify(users, never()).save(any());
    }
    @Test void missingUserCannotUpdateProfile() {
        assertThrows(CustomBusinessException.class, () -> service.updateProfile(1L, new UpdateProfileReq()));
        verifyNoInteractions(auth, media);
    }
    @Test void fakeImageNeverReachesCloudStorage() {
        when(users.findById(1L)).thenReturn(Optional.of(new UserEntity()));
        var file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", "this is not an image".getBytes());
        assertThrows(CustomBusinessException.class, () -> service.uploadAvatar(1L, file));
        verifyNoInteractions(media); verify(users, never()).save(any());
    }
}
