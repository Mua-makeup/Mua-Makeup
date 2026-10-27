package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.SecurityConstants;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;

class CookieUtilsTest {
    CookieUtils cookies;
    @BeforeEach void setup() {
        cookies = new CookieUtils();
        ReflectionTestUtils.setField(cookies, "cookieSecure", true);
        ReflectionTestUtils.setField(cookies, "cookieSameSite", "None");
        ReflectionTestUtils.setField(cookies, "accessTokenExpirationMs", 60000L);
        ReflectionTestUtils.setField(cookies, "refreshTokenExpirationDays", 7L);
    }
    @Test void loginSetsSecureHttpOnlyCookiesWithSeparateExpirations() {
        var response = org.mockito.Mockito.mock(jakarta.servlet.http.HttpServletResponse.class);
        cookies.setAccessTokenCookie(response, "access"); cookies.setRefreshTokenCookie(response, "refresh");
        var captor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(response, org.mockito.Mockito.times(2)).addHeader(org.mockito.Mockito.eq("Set-Cookie"), captor.capture());
        var headers = captor.getAllValues(); assertEquals(2, headers.size());
        for (var header : headers) {
            assertTrue(header.contains("HttpOnly")); assertTrue(header.contains("Secure"));
            assertTrue(header.contains("SameSite=None")); assertTrue(header.contains("Partitioned"));
            assertTrue(header.contains("Path=/"));
        }
        assertTrue(headers.get(0).contains("Max-Age=60")); assertTrue(headers.get(1).contains("Max-Age=604800"));
    }
    @Test void logoutExpiresBothCookies() {
        var response = new MockHttpServletResponse(); cookies.deleteAccessTokenCookie(response); cookies.deleteRefreshTokenCookie(response);
        assertEquals(2, response.getHeaders("Set-Cookie").size());
        response.getHeaders("Set-Cookie").forEach(h -> assertTrue(h.contains("Max-Age=0")));
    }
    @Test void extractionUsesOnlyNamedCookies() {
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie("unrelated", "wrong"), new Cookie(SecurityConstants.ACCESS_TOKEN_COOKIE_NAME, "access"),
            new Cookie(SecurityConstants.REFRESH_TOKEN_COOKIE_NAME, "refresh"));
        assertEquals("access", cookies.getAccessTokenFromCookie(request).orElseThrow());
        assertEquals("refresh", cookies.getRefreshTokenFromCookie(request).orElseThrow());
        assertTrue(cookies.getAccessTokenFromCookie(null).isEmpty());
        assertTrue(cookies.getRefreshTokenFromCookie(new MockHttpServletRequest()).isEmpty());
    }
    @Test void localLaxCookieIsNotPartitioned() {
        ReflectionTestUtils.setField(cookies, "cookieSecure", false);
        ReflectionTestUtils.setField(cookies, "cookieSameSite", "Lax");
        var response = new MockHttpServletResponse(); cookies.setAccessTokenCookie(response, "token");
        assertFalse(response.getHeader("Set-Cookie").contains("Partitioned"));
        assertFalse(response.getHeader("Set-Cookie").contains("Secure"));
    }
}
