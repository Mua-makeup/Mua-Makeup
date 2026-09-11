package com.makeup.platform.common.i18n;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.Locale;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CustomLocaleResolverTest {

    private UserRepository userRepository;
    private CustomLocaleResolver resolver;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        resolver = new CustomLocaleResolver(userRepository);
        request = new MockHttpServletRequest();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Ưu tiên 1: Đã đăng nhập, Database User có language = 'vi' -> Locale vi (Bất kể Postman có gửi Accept-Language: en-US)")
    void testResolveLocaleFromDatabaseUserVi() {
        UserEntity user = UserEntity.builder().language("vi").build();
        user.setId(10L);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(10L, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Giả lập Postman tự động gửi Accept-Language: en-US
        request.addHeader("Accept-Language", "en-US,en;q=0.9");

        Locale locale = resolver.resolveLocale(request);
        assertEquals(new Locale("vi"), locale);
    }

    @Test
    @DisplayName("Khách vãng lai: Header Accept-Language = 'vi' -> Locale vi")
    void testResolveLocaleFromHeaderVi() {
        request.addHeader("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7");
        Locale locale = resolver.resolveLocale(request);
        assertEquals(new Locale("vi"), locale);
    }

    @Test
    @DisplayName("Khách vãng lai: Header Accept-Language = 'en' -> Locale en")
    void testResolveLocaleFromHeaderEn() {
        request.addHeader("Accept-Language", "en-US,en;q=0.9");
        Locale locale = resolver.resolveLocale(request);
        assertEquals(Locale.ENGLISH, locale);
    }

    @Test
    @DisplayName("Mặc định không có thông tin -> Fallback về Locale.ENGLISH ('en')")
    void testResolveLocaleDefault() {
        Locale locale = resolver.resolveLocale(request);
        assertEquals(Locale.ENGLISH, locale);
    }
}
