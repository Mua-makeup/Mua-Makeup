package com.makeup.platform.service.auth;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.auth.*;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.auth.impl.AuthServiceImpl;
import com.makeup.platform.service.mail.EmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoginOtpTest {
    @Mock RedisTemplate<String, Object> redis;
    @Mock ValueOperations<String, Object> values;
    @Mock UserRepository users;
    @Mock EmailService email;
    @InjectMocks AuthServiceImpl service;

    void prepareResend() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("auth:2fa:temp:session")).thenReturn("7");
        var user = new UserEntity(); user.setId(7L); user.setEmail("mentor@example.com"); user.setFullName("Mentor");
        when(users.findById(7L)).thenReturn(Optional.of(user));
    }

    @Test void testResendStoresFixedOtpWithExpiryAndDoesNotSendEmail() {
        ReflectionTestUtils.setField(service, "otpTestMode", true);
        prepareResend();
        service.resend2FaOtp(Resend2FaReq.builder().tempToken("session").build());
        verify(values).set("auth:2fa:otp:7", "test:123456", 5, TimeUnit.MINUTES);
        verifyNoInteractions(email);
        assertEquals("123456", ReflectionTestUtils.invokeMethod(service, "generateLoginOtp"));
    }

    @Test void defaultModeStoresRandomOtpAndEmailsSameCode() {
        prepareResend();
        service.resend2FaOtp(Resend2FaReq.builder().tempToken("session").build());
        var code = ArgumentCaptor.forClass(String.class);
        verify(email).sendAdminLoginOtp(eq("mentor@example.com"), eq("Mentor"), code.capture(), eq(5));
        assertTrue(code.getValue().matches("[0-9]{6}"));
        verify(values).set("auth:2fa:otp:7", code.getValue(), 5, TimeUnit.MINUTES);
    }

    @Test void switchingOffRejectsOutstandingTestOtp() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("auth:2fa:temp:session")).thenReturn("7");
        when(values.get("auth:2fa:otp:7")).thenReturn("test:123456");
        assertThrows(CustomBusinessException.class, () -> service.verify2Fa(
                Verify2FaReq.builder().tempToken("session").otpCode("123456").build()));
        verifyNoInteractions(users);
    }

    @Test void testCodeCannotBypassExpiredLoginSession() {
        ReflectionTestUtils.setField(service, "otpTestMode", true);
        when(redis.opsForValue()).thenReturn(values);
        assertThrows(CustomBusinessException.class, () -> service.verify2Fa(
                Verify2FaReq.builder().tempToken("expired").otpCode("123456").build()));
        verifyNoInteractions(users);
    }
}
