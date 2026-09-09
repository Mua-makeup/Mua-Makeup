package com.makeup.platform.dto.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegisterRes {

    private Long userId;
    private String phoneNumber;
    private String email;
    private String fullName;
    private String accountType;
    private String muaCode;
    private String agencyCode;
    private List<String> roles;
    private LocalDateTime createdAt;
}
