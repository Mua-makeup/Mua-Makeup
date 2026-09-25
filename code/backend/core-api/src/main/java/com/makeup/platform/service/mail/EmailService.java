package com.makeup.platform.service.mail;

import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;

public interface EmailService {

    void sendAdminLoginOtp(String toEmail, String recipientName, String otpCode, int expiryMinutes);

    void sendAgencyNewBookingNotification(String toEmail, String agencyName, ScheduledBookingCreatedEvent event, String destinationAddress);

    void sendAgencyEmergencyAlert(String toEmail, String agencyName, EmergencyReassignmentRequestedEvent event);

    void sendAdminCertificateUploadNotification(
            String toEmail,
            String adminName,
            String muaName,
            String muaPhone,
            String certName,
            String certImageUrl,
            String uploadedAt
    );
}

