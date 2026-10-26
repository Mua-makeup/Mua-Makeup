package com.makeup.platform.service.interaction;

import java.util.Map;

public interface ExpoPushNotificationService {

    /**
     * Gửi Remote Push Notification tới máy chủ Expo Push Service (đánh thức màn hình khóa khi tắt app)
     *
     * @param pushToken Token thiết bị Expo (ExponentPushToken[...])
     * @param title     Tiêu đề thông báo
     * @param body      Nội dung hiển thị trên banner màn hình khóa
     * @param data      Payload dữ liệu bổ sung (metadata, deep link)
     */
    void sendPushNotification(String pushToken, String title, String body, Map<String, Object> data);
}
