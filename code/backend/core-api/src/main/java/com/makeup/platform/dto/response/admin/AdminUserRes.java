package com.makeup.platform.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserRes {

    private Long id;
    private String phoneNumber;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String gender;
    private Boolean isActive;
    private Boolean isVerified;
    private String language;
    private String role;
    private LocalDateTime createdAt;
}
