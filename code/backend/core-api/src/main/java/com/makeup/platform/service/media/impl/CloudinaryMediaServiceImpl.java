package com.makeup.platform.service.media.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.makeup.platform.common.exception.MediaUploadException;
import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import com.makeup.platform.service.media.MediaStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryMediaServiceImpl implements MediaStorageService {

    private final Cloudinary cloudinary;

    @Override
    public CloudMediaUploadResult uploadImage(MultipartFile file, String folder) {
        try {
            Map<?, ?> uploadParams = ObjectUtils.asMap(
                    "folder", folder,
                    "format", "webp",
                    "quality", "auto:good",
                    "transformation", new Transformation<>().width(1920).height(1080).crop("limit")
            );

            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);

            String publicId = (String) uploadResult.get("public_id");
            String secureUrl = (String) uploadResult.get("secure_url");
            String format = (String) uploadResult.get("format");
            Long bytes = uploadResult.get("bytes") instanceof Number n ? n.longValue() : 0L;

            String thumbnailUrl = cloudinary.url()
                    .transformation(new Transformation<>().width(400).height(400).crop("fill").gravity("auto").quality("auto").fetchFormat("auto"))
                    .generate(publicId);

            return CloudMediaUploadResult.builder()
                    .publicId(publicId)
                    .imageUrl(secureUrl)
                    .thumbnailUrl(thumbnailUrl)
                    .format(format)
                    .bytes(bytes)
                    .build();

        } catch (IOException e) {
            log.error("Cloudinary upload failed: {}", e.getMessage(), e);
            throw new MediaUploadException(com.makeup.platform.common.constants.ErrorCodes.ERR_MEDIA_STORAGE_FAILED, "ERR_MEDIA_STORAGE_FAILED", e.getMessage());
        } catch (Exception e) {
            log.error("Cloudinary service error: {}", e.getMessage(), e);
            throw new MediaUploadException(com.makeup.platform.common.constants.ErrorCodes.ERR_MEDIA_STORAGE_FAILED, "ERR_MEDIA_STORAGE_FAILED", e.getMessage());
        }
    }

    @Override
    public void deleteMedia(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Deleted media from Cloudinary: {}", publicId);
        } catch (Exception e) {
            log.warn("Failed to delete media from Cloudinary (publicId={}): {}", publicId, e.getMessage());
        }
    }

    @Async
    @Override
    public void deleteMediaBatchAsync(List<String> publicIds) {
        if (publicIds == null || publicIds.isEmpty()) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            for (String publicId : publicIds) {
                deleteMedia(publicId);
            }
        });
    }
}
