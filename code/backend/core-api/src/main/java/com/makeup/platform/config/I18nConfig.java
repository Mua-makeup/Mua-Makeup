package com.makeup.platform.config;

import com.makeup.platform.common.i18n.CustomLocaleResolver;
import com.makeup.platform.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;

@Configuration
public class I18nConfig {

    @Bean
    public LocaleResolver localeResolver(UserRepository userRepository) {
        return new CustomLocaleResolver(userRepository);
    }
}
