package com.makeup.platform.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.makeup.platform.common.exception.GlobalExceptionHandler;
import com.makeup.platform.common.i18n.JsonMessageSource;
import com.makeup.platform.common.utils.*;
import com.makeup.platform.config.*;
import com.makeup.platform.controller.payment.PaymentController;
import com.makeup.platform.controller.customer.CustomerAddressController;
import com.makeup.platform.controller.booking.BookingStateController;
import com.makeup.platform.service.auth.RedisTokenService;
import com.makeup.platform.service.payment.PaymentGatewayService;
import com.makeup.platform.service.customer.CustomerAddressService;
import com.makeup.platform.service.booking.BookingStateMachineService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(HttpSecurityIntegrationTest.WebConfig.class)
@WebAppConfiguration
class HttpSecurityIntegrationTest {
    @Configuration @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class, PaymentController.class, CustomerAddressController.class,
        BookingStateController.class, GlobalExceptionHandler.class})
    static class WebConfig {
        @Bean ObjectMapper objectMapper() { return new ObjectMapper().registerModule(new JavaTimeModule()); }
        @Bean JwtUtils jwtUtils() { return mock(JwtUtils.class); }
        @Bean CookieUtils cookieUtils() { return mock(CookieUtils.class); }
        @Bean RedisTokenService redisTokenService() { return mock(RedisTokenService.class); }
        @Bean CustomUserDetailsService userDetailsService() { return mock(CustomUserDetailsService.class); }
        @Bean JsonMessageSource messages() { return mock(JsonMessageSource.class); }
        @Bean LocaleResolver localeResolver() { return new AcceptHeaderLocaleResolver(); }
        @Bean PaymentGatewayService payments() { return mock(PaymentGatewayService.class); }
        @Bean CustomerAddressService addresses() { return mock(CustomerAddressService.class); }
        @Bean BookingStateMachineService bookings() { return mock(BookingStateMachineService.class); }
    }
    @Autowired WebApplicationContext context;
    @Autowired PaymentGatewayService payments;
    @Autowired CustomerAddressService addresses;
    @Autowired BookingStateMachineService bookings;
    MockMvc mvc;
    @BeforeEach void setup() {
        reset(payments, addresses, bookings);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    @ParameterizedTest @ValueSource(strings={"/api/v1/customer/addresses", "/api/v1/payments/PAY-1",
        "/api/v1/bookings/1/status", "/api/v1/admin/users", "/api/v1/packages/my"})
    void protectedRoutesRejectAnonymousUsers(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized()).andExpect(jsonPath("success").value(false));
        verifyNoInteractions(payments, addresses, bookings);
    }
    @ParameterizedTest @ValueSource(strings={"ROLE_CUSTOMER", "ROLE_MUA", "ROLE_AGENCY"})
    void nonAdminsCannotAccessAdminRoutes(String role) throws Exception {
        mvc.perform(get("/api/v1/admin/users").with(authentication(auth(role))))
            .andExpect(status().isForbidden());
    }
    @Test void publicGatewayListAllowsAnonymousRequest() throws Exception {
        mvc.perform(get("/api/v1/payments/gateways")).andExpect(status().isOk());
        verify(payments).getAvailableGateways();
    }
    @Test void methodSecurityRejectsWrongRole() throws Exception {
        mvc.perform(get("/api/v1/customer/addresses").with(authentication(auth("ROLE_MUA"))))
            .andExpect(status().isForbidden());
        verifyNoInteractions(addresses);
    }
    @Test void currentUserIdentityComesFromAuthentication() throws Exception {
        mvc.perform(get("/api/v1/customer/addresses?userId=999").with(authentication(auth("ROLE_CUSTOMER"))))
            .andExpect(status().isOk());
        verify(addresses).getSavedAddresses(7L);
    }
    @ParameterizedTest @ValueSource(strings={"{}", "{\"gatewayCode\":\"MOMO\",\"amount\":-1}", "{\"gatewayCode\":\"\",\"amount\":100000}"})
    void invalidPaymentPayloadNeverCreatesPayment(String json) throws Exception {
        mvc.perform(post("/api/v1/payments/create-intent").with(authentication(auth("ROLE_CUSTOMER")))
            .contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isBadRequest());
        verifyNoInteractions(payments);
    }
    @Test void malformedJsonIsBadRequest() throws Exception {
        mvc.perform(post("/api/v1/payments/create-intent").with(authentication(auth("ROLE_CUSTOMER")))
            .contentType(MediaType.APPLICATION_JSON).content("{broken")).andExpect(status().isBadRequest());
        verifyNoInteractions(payments);
    }
    private UsernamePasswordAuthenticationToken auth(String role) {
        return new UsernamePasswordAuthenticationToken(7L, null, List.of(new SimpleGrantedAuthority(role)));
    }
}
