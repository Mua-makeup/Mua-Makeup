package com.makeup.platform.common.i18n;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.LocaleResolver;

import java.util.Locale;
import java.util.Optional;

@Slf4j
public class CustomLocaleResolver implements LocaleResolver {

    public static final Locale DEFAULT_LOCALE = Locale.ENGLISH;
    public static final Locale VIETNAMESE_LOCALE = new Locale("vi");

    private final UserRepository userRepository;

    public CustomLocaleResolver() {
        this.userRepository = null;
    }

    public CustomLocaleResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @NonNull
    public Locale resolveLocale(@NonNull HttpServletRequest request) {
        // 1. Ưu tiên hàng đầu: Header Accept-Language từ HTTP Request (Phản ánh trực tiếp lựa chọn tức thì của người dùng trên UI)
        String headerLang = request.getHeader("Accept-Language");
        if (StringUtils.hasText(headerLang) && !"*".equals(headerLang.trim())) {
            String primaryLang = headerLang.split(",")[0].trim().toLowerCase();
            if (primaryLang.startsWith("vi")) {
                return VIETNAMESE_LOCALE;
            } else if (primaryLang.startsWith("en")) {
                return DEFAULT_LOCALE;
            }
        }

        // 2. Ưu tiên thứ hai: Cài đặt ngôn ngữ của User trong Token hoặc Database
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            // Request attribute hoặc Token
            String reqLang = (String) request.getAttribute("USER_LANGUAGE");
            if (StringUtils.hasText(reqLang)) {
                if (reqLang.equalsIgnoreCase("vi")) {
                    return VIETNAMESE_LOCALE;
                } else if (reqLang.equalsIgnoreCase("en")) {
                    return DEFAULT_LOCALE;
                }
            }

            Long userId = null;
            if (authentication.getPrincipal() instanceof Long uid) {
                userId = uid;
            } else if (authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
                userId = userDetails.getUserId();
            }

            if (userId != null && userRepository != null) {
                try {
                    Optional<UserEntity> userOpt = userRepository.findById(userId);
                    if (userOpt.isPresent()) {
                        String dbLang = userOpt.get().getLanguage();
                        if (StringUtils.hasText(dbLang)) {
                            if (dbLang.equalsIgnoreCase("vi")) {
                                return VIETNAMESE_LOCALE;
                            } else if (dbLang.equalsIgnoreCase("en")) {
                                return DEFAULT_LOCALE;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to read user language from DB: {}", e.getMessage());
                }
            }
        }

        // 3. Fallback mặc định hệ thống là Tiếng Anh ('en')
        return DEFAULT_LOCALE;
    }

    @Override
    public void setLocale(@NonNull HttpServletRequest request, HttpServletResponse response, Locale locale) {
        // Stateless JWT API không lưu trữ locale trong HTTP Session
    }
}
