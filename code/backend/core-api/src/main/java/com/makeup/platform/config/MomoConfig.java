package com.makeup.platform.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@Getter
public class MomoConfig {

    @Value("${payment.gateways.momo.enabled:true}")
    private boolean enabled;

    @Value("${payment.gateways.momo.partner-code:MOMO}")
    private String partnerCode;

    @Value("${payment.gateways.momo.access-key:F8BBA842ECF85}")
    private String accessKey;

    @Value("${payment.gateways.momo.secret-key:K951B6PE1wa8ngfQpaZsWBueImOOLCZ2}")
    private String secretKey;

    @Value("${payment.gateways.momo.endpoint-url:https://test-payment.momo.vn/v2/gateway/api/create}")
    private String endpointUrl;

    @Value("${payment.gateways.momo.return-url:http://192.168.1.109:8080/api/v1/payments/return/momo}")
    private String returnUrl;

    @Value("${payment.gateways.momo.ipn-url:http://192.168.1.122:8080/api/v1/payments/ipn/momo}")
    private String ipnUrl;

    @Bean
    public RestClient momoRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);

        return RestClient.builder()
                .requestFactory(factory)
                .build();
    }
}
