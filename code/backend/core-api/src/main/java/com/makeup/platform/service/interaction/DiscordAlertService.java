package com.makeup.platform.service.interaction;

public interface DiscordAlertService {

    void sendExceptionAlert(String uri, String method, String userPrincipal, Exception ex);
}
