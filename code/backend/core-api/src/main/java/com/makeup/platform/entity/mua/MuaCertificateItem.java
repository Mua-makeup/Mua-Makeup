package com.makeup.platform.entity.mua;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MuaCertificateItem implements Serializable {

    private String certName;
    private String imageUrl;
    private String publicId;
    
    @Builder.Default
    private Boolean isVerified = false;
    
    private LocalDateTime uploadedAt;
}
