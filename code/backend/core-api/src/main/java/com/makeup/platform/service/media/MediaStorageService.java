package com.makeup.platform.service.media;

import com.makeup.platform.dto.response.media.CloudMediaUploadResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MediaStorageService {

    /**
     * Tải và nén ảnh WebP lên CDN, tự động sinh ảnh HD và thumbnail chuẩn.
     */
    CloudMediaUploadResult uploadImage(MultipartFile file, String folder);

    /**
     * Xóa đồng bộ một tệp trên CDN theo publicId.
     */
    void deleteMedia(String publicId);

    /**
     * Xóa bất đồng bộ danh sách các tệp trên CDN (Compensating Transaction & Cleanup Job).
     */
    void deleteMediaBatchAsync(List<String> publicIds);
}
