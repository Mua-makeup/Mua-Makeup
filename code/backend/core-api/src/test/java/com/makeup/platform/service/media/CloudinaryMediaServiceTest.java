package com.makeup.platform.service.media;

import com.cloudinary.*;
import com.makeup.platform.common.exception.MediaUploadException;
import com.makeup.platform.service.media.impl.CloudinaryMediaServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.springframework.mock.web.MockMultipartFile;
import java.io.IOException;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CloudinaryMediaServiceTest {
    @Test void uploadReturnsCdnIdentifiersWithoutCallingRealProvider() throws Exception {
        var cloud = mock(Cloudinary.class); var uploader = mock(Uploader.class); var url = mock(Url.class);
        when(cloud.uploader()).thenReturn(uploader); when(cloud.url()).thenReturn(url);
        when(url.transformation(any())).thenReturn(url); when(url.generate("test/id")).thenReturn("https://example.test/thumb");
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of("public_id","test/id", "secure_url","https://example.test/image", "format","webp", "bytes", 120));
        var result = new CloudinaryMediaServiceImpl(cloud).uploadImage(new MockMultipartFile("file", new byte[]{1}), "test");
        assertEquals("test/id", result.getPublicId()); assertEquals("https://example.test/image", result.getImageUrl());
        assertEquals("https://example.test/thumb", result.getThumbnailUrl()); assertEquals(120L, result.getBytes());
    }
    @Test void providerErrorIsTranslatedToApplicationError() throws Exception {
        var cloud = mock(Cloudinary.class); var uploader = mock(Uploader.class); when(cloud.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("offline"));
        assertThrows(MediaUploadException.class, () -> new CloudinaryMediaServiceImpl(cloud).uploadImage(new MockMultipartFile("file", new byte[]{1}), "test"));
    }
    @ParameterizedTest @NullAndEmptySource void absentMediaIdDoesNotCallProvider(String id) {
        var cloud = mock(Cloudinary.class); new CloudinaryMediaServiceImpl(cloud).deleteMedia(id); verifyNoInteractions(cloud);
    }
    @Test void cleanupFailureDoesNotFailRequest() throws Exception {
        var cloud = mock(Cloudinary.class); var uploader = mock(Uploader.class); when(cloud.uploader()).thenReturn(uploader);
        when(uploader.destroy(eq("test/id"), anyMap())).thenThrow(new IOException("offline"));
        assertDoesNotThrow(() -> new CloudinaryMediaServiceImpl(cloud).deleteMedia("test/id"));
    }
}
