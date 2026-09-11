package com.makeup.platform.dto.response.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CloudMediaUploadResult {

    private String publicId;
    private String imageUrl;
    private String thumbnailUrl;
    private String format;
    private Long bytes;
}
