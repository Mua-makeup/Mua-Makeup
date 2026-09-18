package com.makeup.platform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class MapsApiConfig {

    @Value("${app.maps.goong.api-key:dummy_goong_key}")
    private String goongApiKey;

    @Value("${app.maps.goong.base-url:https://rsapi.goong.io}")
    private String goongBaseUrl;

    @Bean
    public RestClient mapsRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(800); // 800ms connect timeout
        factory.setReadTimeout(800);    // 800ms read timeout

        return RestClient.builder()
                .baseUrl(goongBaseUrl)
                .requestFactory(factory)
                .build();
    }

    public String getGoongApiKey() {
        return goongApiKey;
    }
}
