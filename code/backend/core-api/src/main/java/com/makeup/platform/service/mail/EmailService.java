package com.makeup.platform.service.mail;

import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;

import java.math.BigDecimal;

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

    void sendCertificateVerificationResultEmail(
            String toEmail,
            String muaName,
            String certName,
            boolean isVerified,
            String notes
    );

    void sendAgencyStaffApplicationEmail(
            String toEmail,
            String agencyOwnerName,
            String agencyName,
            String staffName,
            String staffPhone,
            String inviteCode
    );

    void sendStaffApplicationResultEmail(
            String toEmail,
            String staffName,
            String agencyName,
            boolean isApproved,
            BigDecimal commissionRate,
            String notes
    );

    void sendCustomerArtistOnTheWayEmail(
            String toEmail,
            String customerName,
            String bookingCode,
            String bookingType,
            String artistName,
            String artistPhone,
            String artistRating,
            String packageName,
            String styleName,
            String destinationAddress,
            String startedAt
    );

    void sendCustomerBookingCompletedReceiptEmail(
            String toEmail,
            String customerName,
            String bookingCode,
            String bookingType,
            String artistName,
            String packageName,
            String styleName,
            String destinationAddress,
            BigDecimal totalAmount,
            BigDecimal depositAmount,
            BigDecimal finalAmount,
            String paymentMethod,
            String paymentCode,
            String completedAt
    );

    void sendCustomerBookingCancelledOnTheWayEmail(
            String toEmail,
            String customerName,
            String bookingCode,
            String bookingType,
            String artistName,
            String destinationAddress,
            String cancellationReason,
            BigDecimal refundAmount
    );

    void sendCustomerDepositSuccessfulEmail(
            String toEmail,
            String customerName,
            String bookingCode,
            String bookingType,
            String artistName,
            String artistPhone,
            String artistRating,
            String packageName,
            String styleName,
            String destinationAddress,
            BigDecimal totalAmount,
            BigDecimal depositAmount,
            BigDecimal remainingAmount,
            String paymentMethod,
            String paymentCode,
            String paidAt
    );

    void sendCustomerScheduledBookingConfirmedEmail(
            String toEmail,
            String customerName,
            String bookingCode,
            String artistName,
            String artistPhone,
            String artistRating,
            String packageName,
            String styleName,
            String destinationAddress,
            String bookingDate,
            String startTime,
            BigDecimal totalAmount,
            BigDecimal depositAmount,
            BigDecimal remainingAmount
    );
}

