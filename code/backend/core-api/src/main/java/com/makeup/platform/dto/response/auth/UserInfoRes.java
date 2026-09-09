package com.makeup.platform.dto.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoRes {

    private Long id;
    private String fullName;
    private String phoneNumber;
    private String email;
    private String avatarUrl;
    private String gender;
    private Boolean isVerified;
    private Long agencyId;
    private Long muaId;
    private List<String> roles;
    private List<String> permissions;
}
