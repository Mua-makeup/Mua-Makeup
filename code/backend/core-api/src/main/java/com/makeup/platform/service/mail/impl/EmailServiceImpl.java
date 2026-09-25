package com.makeup.platform.service.mail.impl;

import com.makeup.platform.common.event.booking.EmergencyReassignmentRequestedEvent;
import com.makeup.platform.common.event.booking.ScheduledBookingCreatedEvent;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.service.mail.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private static final String BRAND_NAME = "MUA Makeup Platform";

    @Override
    @Async
    public void sendAdminLoginOtp(String toEmail, String recipientName, String otpCode, int expiryMinutes) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send OTP: recipient email is missing");
            return;
        }

        String subject = BRAND_NAME + " - Mã Xác Thực 2FA (OTP) cho đăng nhập quản trị viên";
        String htmlContent = buildAdminOtpEmailHtml(recipientName, otpCode, expiryMinutes);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendAgencyNewBookingNotification(String toEmail, String agencyName, ScheduledBookingCreatedEvent event, String destinationAddress) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send booking notification: studio email is missing for booking {}", event.getBookingCode());
            return;
        }

        String subject = "[" + BRAND_NAME + "] Thông Báo Đơn Đặt Lịch Mới";
        String htmlContent = buildAgencyNewBookingEmailHtml(agencyName, event, destinationAddress);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private void sendHtmlEmail(String toEmail, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, BRAND_NAME);
            helper.setReplyTo(fromEmail, BRAND_NAME);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[EmailService] Successfully dispatched HTML email to: {} | Subject: {}", toEmail, subject);
        } catch (MessagingException e) {
            log.error("[EmailService] MessagingException while sending email to {}: {}", toEmail, e.getMessage(), e);
        } catch (Exception e) {
            log.error("[EmailService] Unexpected error sending email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    private String buildAdminOtpEmailHtml(String recipientName, String otpCode, int expiryMinutes) {
        String name = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Quản trị viên";
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã Xác Thực 2FA</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%%, #312e81 100%%); padding: 32px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                            MUA MAKEUP PLATFORM
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px; letter-spacing: 0.5px;">
                            BẢO MẬT & XÁC THỰC HAI LỚP (2FA OTP)
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                            Xin chào <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            Hệ thống vừa ghi nhận một yêu cầu đăng nhập vào tài khoản quản trị của bạn. Để hoàn tất đăng nhập an toàn, vui lòng sử dụng mã xác thực OTP dùng một lần dưới đây:
                          </p>
                          
                          <!-- OTP Box -->
                          <div style="background-color: #fffbeb; border: 2px dashed #f59e0b; border-radius: 12px; padding: 24px 20px; text-align: center; margin-bottom: 28px;">
                            <span style="display: block; font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                              MÃ XÁC THỰC CỦA BẠN
                            </span>
                            <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #b45309; letter-spacing: 8px;">
                              %s
                            </span>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #78350f; font-weight: 500;">
                              Mã có hiệu lực trong vòng <strong>%d phút</strong>.
                            </p>
                          </div>
                          
                          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 16px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
                              <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai, kể cả nhân viên hỗ trợ của hệ thống. Nếu bạn không thực hiện yêu cầu này, vui lòng đổi mật khẩu ngay lập tức.
                            </p>
                          </div>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng,<br>
                            <strong>Đội ngũ Kỹ thuật MUA Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 11px; color: #94a3b8;">
                          Email tự động được gửi từ hệ thống MUA Makeup Booking Platform. Vui lòng không trả lời thư này.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(name, otpCode, expiryMinutes);
    }

    private String buildAgencyNewBookingEmailHtml(String agencyName, ScheduledBookingCreatedEvent event, String destinationAddress) {
        String studioName = (agencyName != null && !agencyName.isBlank()) ? agencyName : "Studio Đối tác";
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));

        String formattedTotal = event.getTotalAmount() != null ? currencyFormatter.format(event.getTotalAmount()) : "0 ₫";
        String formattedDeposit = event.getDepositAmount() != null ? currencyFormatter.format(event.getDepositAmount()) : "0 ₫";
        String formattedDate = event.getBookingDate() != null ? event.getBookingDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A";
        String formattedTime = event.getStartTime() != null ? event.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) : "N/A";
        String customerName = event.getCustomerName() != null ? event.getCustomerName() : "Khách hàng";
        String customerPhone = event.getCustomerPhone() != null ? event.getCustomerPhone() : "Chưa cập nhật";
        String packageName = event.getServicePackageName() != null ? event.getServicePackageName() : "Gói dịch vụ trang điểm";
        String address = (destinationAddress != null && !destinationAddress.isBlank()) ? destinationAddress : "Địa chỉ theo lịch hẹn của khách hàng";
        String dashboardUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/agency/dashboard";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Thông Báo Đơn Đặt Lịch Mới</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      
                      <!-- Luxury Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%%, #4c0519 50%%, #881337 100%%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(251, 191, 36, 0.4); margin-bottom: 10px;">
                            <span style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                              MUA MAKEUP PLATFORM
                            </span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">
                            THÔNG BÁO ĐƠN ĐẶT LỊCH MỚI
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 12px; letter-spacing: 0.3px;">
                            Hệ thống quản lý & kết nối dịch vụ trang điểm chuyên nghiệp
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          
                          <!-- Salutation -->
                          <p style="margin: 0 0 8px 0; font-size: 15px; color: #1e293b; font-weight: 500;">
                            Kính gửi <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            Studio của bạn vừa nhận được một yêu cầu đặt lịch hẹn dịch vụ mới từ khách hàng. Dưới đây là thông tin chi tiết của đơn đặt lịch:
                          </p>
                          
                          <!-- Booking Code & Status Pill (Pure Table Layout - No Flex) -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #fff1f2 0%%, #ffe4e6 100%%); border: 1.5px dashed #f43f5e; border-radius: 14px; padding: 18px 22px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="left" style="vertical-align: middle;">
                                      <span style="display: block; font-size: 11px; font-weight: 800; color: #9f1239; text-transform: uppercase; letter-spacing: 1px;">
                                        MÃ ĐƠN HÀNG
                                      </span>
                                      <span style="display: block; font-size: 20px; font-weight: 900; color: #e11d48; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; letter-spacing: 1.2px; margin-top: 2px;">
                                        #%s
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                      <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 9999px; border: 1px solid #fde68a; white-space: nowrap;">
                                        ⏳ Chờ khách đặt cọc (15p)
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Customer & Service Information Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  📋 CHI TIẾT DỊCH VỤ & KHÁCH HÀNG
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 18px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.5;">
                                  <tr>
                                    <td width="36%%" style="padding: 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">
                                      👤 Khách hàng:
                                    </td>
                                    <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9; vertical-align: top;">
                                      📞 Số điện thoại:
                                    </td>
                                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-family: monospace; border-top: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9; vertical-align: top;">
                                      💄 Gói dịch vụ:
                                    </td>
                                    <td style="padding: 8px 0; color: #9f1239; font-weight: 800; border-top: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9; vertical-align: top;">
                                      🗓️ Thời gian hẹn:
                                    </td>
                                    <td style="padding: 8px 0; color: #0f172a; font-weight: 700; border-top: 1px solid #f1f5f9;">
                                      <span style="color: #2563eb;">%s</span> ngày <strong>%s</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9; vertical-align: top;">
                                      📍 Địa điểm:
                                    </td>
                                    <td style="padding: 8px 0; color: #334155; line-height: 1.4; border-top: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Pricing Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #f8fafc;">
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="left" style="color: #475569; font-size: 13px; font-weight: 600; padding-bottom: 8px;">
                                      Tổng giá trị dịch vụ:
                                    </td>
                                    <td align="right" style="color: #047857; font-size: 16px; font-weight: 800; padding-bottom: 8px;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td align="left" style="color: #b45309; font-size: 13px; font-weight: 700; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                                      Tiền cọc cần thanh toán (30%%):
                                    </td>
                                    <td align="right" style="color: #b45309; font-size: 18px; font-weight: 900; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                                      %s
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Notice Alert Box -->
                          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 28px;">
                            <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.6;">
                              💡 <strong>Quy trình xử lý tiếp theo:</strong> Khách hàng có <strong>15 phút</strong> để hoàn tất đặt cọc. Ngay sau khi cọc được xác thực thành công, hệ thống sẽ chuyển đơn sang trạng thái <strong>Chờ Studio điều phối thợ</strong> và gửi thông báo tức thời tới màn hình điều phối của Studio.
                            </p>
                          </div>
                          
                          <!-- CTA Button (Center) -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.3); letter-spacing: 0.3px;">
                                  Truy Cập Bảng Điều Khiển Studio &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Signature -->
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng cảm ơn sự đồng hành của quý Studio,<br>
                            <strong style="color: #1e293b;">Đội ngũ Vận hành MUA Platform</strong>
                          </p>
                          
                        </td>
                      </tr>
                      
                      <!-- Professional Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ Hệ thống Nền tảng Đặt lịch Makeup (MUA Platform).<br>
                          Mọi thắc mắc xin vui lòng liên hệ Bộ phận Hỗ trợ Đối tác qua Hotline: <strong>1900 8888</strong> hoặc Email: <strong>support@muamakeup.com</strong>.
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                studioName,
                event.getBookingCode(),
                customerName,
                customerPhone,
                packageName,
                formattedTime,
                formattedDate,
                address,
                formattedTotal,
                formattedDeposit,
                dashboardUrl
        );
    }

    @Override
    @Async
    public void sendAgencyEmergencyAlert(String toEmail, String agencyName, EmergencyReassignmentRequestedEvent event) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send emergency alert: studio email is missing for booking {}", event.getBookingCode());
            return;
        }

        String subject = "[" + BRAND_NAME + "] 🚨 Cảnh Báo Khẩn Cấp: Thợ Báo Bận Đột Xuất";
        String htmlContent = buildAgencyEmergencyAlertEmailHtml(agencyName, event);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildAgencyEmergencyAlertEmailHtml(String agencyName, EmergencyReassignmentRequestedEvent event) {
        String studioName = (agencyName != null && !agencyName.isBlank()) ? agencyName : "Studio Đối tác";
        String staffName = event.getStaffName() != null ? event.getStaffName() : "Nhân viên thợ";
        String roleText = event.getRole() != null
                ? (event.getRole() == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ")
                : "Thợ được phân công";
        String bookingCode = event.getBookingCode() != null ? event.getBookingCode() : "N/A";
        String reason = event.getEmergencyReason() != null ? event.getEmergencyReason() : "Bận việc đột xuất bất khả kháng";

        String tierText;
        if ("TIER_3_CRITICAL".equalsIgnoreCase(event.getEmergencyTier())) {
            tierText = "Tier 3 - Cực kỳ khẩn cấp (&lt; 2h)";
        } else if ("TIER_2_URGENT".equalsIgnoreCase(event.getEmergencyTier())) {
            tierText = "Tier 2 - Khẩn cấp (2h - 4h)";
        } else if ("TIER_1_STANDARD".equalsIgnoreCase(event.getEmergencyTier())) {
            tierText = "Tier 1 - Cần xử lý (&gt; 4h)";
        } else {
            tierText = event.getEmergencyTier() != null ? event.getEmergencyTier() : "Khẩn cấp";
        }

        String hoursRemaining = event.getHoursUntilBooking() != null
                ? String.format("%.1f giờ", event.getHoursUntilBooking())
                : "Sát giờ hẹn";

        String scheduledTime = event.getScheduledStartTime() != null
                ? event.getScheduledStartTime().format(DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy"))
                : "N/A";

        String proofHtml;
        if (event.getProofDocumentUrl() != null && !event.getProofDocumentUrl().isBlank()) {
            String imgUrl = event.getProofDocumentUrl();
            proofHtml = "<div style=\"margin-top: 8px;\">" +
                    "<a href=\"" + imgUrl + "\" target=\"_blank\" style=\"text-decoration: none; display: inline-block;\">" +
                    "<img src=\"" + imgUrl + "\" alt=\"Ảnh minh chứng sự cố\" style=\"max-width: 100%; max-height: 280px; border-radius: 10px; border: 1px solid #fca5a5; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15); display: block;\" />" +
                    "</a>" +
                    "<p style=\"margin: 6px 0 0 0; font-size: 11px; color: #b91c1c; font-weight: 600;\">" +
                    "🔍 <a href=\"" + imgUrl + "\" target=\"_blank\" style=\"color: #b91c1c; text-decoration: underline;\">Bấm vào đây để phóng to ảnh minh chứng &rarr;</a>" +
                    "</p>" +
                    "</div>";
        } else {
            proofHtml = "<span style=\"color: #64748b; font-style: italic;\">Không có minh chứng đính kèm</span>";
        }

        String dispatchUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/agency/bookings";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Cảnh Báo Khẩn Cấp - Thợ Báo Bận Đột Xuất</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 35px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                      
                      <!-- Urgent Alert Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%%, #831843 50%%, #991b1b 100%%); padding: 32px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(239, 68, 68, 0.25); border: 1px solid rgba(248, 113, 113, 0.4); border-radius: 9999px; padding: 6px 18px; margin-bottom: 14px;">
                            <span style="color: #fecaca; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;">
                              🚨 CẢNH BÁO ĐIỀU PHỐI KHẨN CẤP
                            </span>
                          </div>
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
                            Thợ Báo Bận Đột Xuất
                          </h1>
                          <p style="color: #cbd5e1; font-size: 13px; margin: 8px 0 0 0;">
                            Cần Studio can thiệp phân công thợ dự phòng hoặc xử lý ngay
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 32px 30px;">
                          
                          <!-- Salutation -->
                          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 18px 0;">
                            Kính gửi Ban Quản Lý <strong style="color: #991b1b;">%s</strong>,
                          </p>
                          
                          <!-- Urgent Alert Box -->
                          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">
                              ⚠️ <strong>THÔNG BÁO KHẨN:</strong> Nhân sự thợ <strong>%s</strong> (%s) vừa báo bận đột xuất cho đơn hàng <strong>#%s</strong>. Hệ thống yêu cầu Studio kiểm tra và điều phối thợ dự phòng gấp để đảm bảo lịch hẹn của khách hàng.
                            </p>
                          </div>
                          
                          <!-- Booking Code & Badge Bar -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                              <td align="left" style="padding: 14px 18px;">
                                <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">Mã Đơn Hàng</span><br>
                                <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">#%s</strong>
                              </td>
                              <td align="right" style="padding: 14px 18px;">
                                <div style="display: inline-block; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 9999px; padding: 5px 14px; text-align: center;">
                                  <span style="font-size: 12px; font-weight: 700; color: #b91c1c;">
                                    %s
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Emergency Details Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-collapse: separate; border-spacing: 0; border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;">
                            <tr style="background-color: #fff1f2;">
                              <td colspan="2" style="padding: 12px 18px; border-bottom: 1px solid #fecdd3;">
                                <strong style="font-size: 13px; color: #9f1239; text-transform: uppercase; letter-spacing: 0.5px;">
                                  Chi Tiết Sự Cố & Lịch Hẹn
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td width="38%%" style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Thợ báo bận:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">
                                %s (%s)
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Giờ hẹn thực hiện:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                                %s
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Thời gian còn lại:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #b91c1c; font-weight: 800; border-bottom: 1px solid #f1f5f9;">
                                còn %s đến giờ hẹn
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Lý do báo bận:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #334155; font-weight: 600; font-style: italic; border-bottom: 1px solid #f1f5f9;">
                                "%s"
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b;">
                                Minh chứng sự cố:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px;">
                                %s
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Action Guide Box -->
                          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 28px;">
                            <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6;">
                              💡 <strong>Hành động cần thực hiện ngay:</strong> Quý Studio vui lòng truy cập Bảng Điều Phối để chỉ định thợ dự phòng thay thế ngay hoặc phê duyệt solo nếu có thợ khác đang cùng phụ trách ca làm.
                            </p>
                          </div>
                          
                          <!-- CTA Button (Center) -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #dc2626 0%%, #991b1b 100%%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); letter-spacing: 0.3px;">
                                  Truy Cập Điều Phối Đổi Thợ Ngay &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Signature -->
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng,<br>
                            <strong style="color: #1e293b;">Đội ngũ Vận hành MUA Platform</strong>
                          </p>
                          
                        </td>
                      </tr>
                      
                      <!-- Professional Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ Hệ thống Nền tảng Đặt lịch Makeup (MUA Platform).<br>
                          Mọi thắc mắc xin vui lòng liên hệ Bộ phận Hỗ trợ Đối tác qua Hotline: <strong>1900 8888</strong> hoặc Email: <strong>support@muamakeup.com</strong>.
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                studioName,
                staffName,
                roleText,
                bookingCode,
                bookingCode,
                tierText,
                staffName,
                roleText,
                scheduledTime,
                hoursRemaining,
                reason,
                proofHtml,
                dispatchUrl
        );
    }

    @Override
    @Async
    public void sendAdminCertificateUploadNotification(
            String toEmail,
            String adminName,
            String muaName,
            String muaPhone,
            String certName,
            String certImageUrl,
            String uploadedAt
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send certificate notification: admin email is missing");
            return;
        }

        String subject = "[" + BRAND_NAME + "] 📜 Yêu Cầu Duyệt Chứng Chỉ Mới Từ Thợ Make-up";
        String htmlContent = buildAdminCertificateUploadEmailHtml(adminName, muaName, muaPhone, certName, certImageUrl, uploadedAt);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildAdminCertificateUploadEmailHtml(
            String adminName,
            String muaName,
            String muaPhone,
            String certName,
            String certImageUrl,
            String uploadedAt
    ) {
        String adminDisplayName = (adminName != null && !adminName.isBlank()) ? adminName : "Quản Trị Viên";
        String artistName = (muaName != null && !muaName.isBlank()) ? muaName : "Thợ trang điểm";
        String artistPhone = (muaPhone != null && !muaPhone.isBlank()) ? muaPhone : "Chưa cập nhật";
        String certificateTitle = (certName != null && !certName.isBlank()) ? certName : "Chứng chỉ chuyên môn";
        String timeText = (uploadedAt != null && !uploadedAt.isBlank()) ? uploadedAt : "Vừa xong";

        String certImageHtml;
        if (certImageUrl != null && !certImageUrl.isBlank()) {
            certImageHtml = """
                <div style="margin-top: 8px;">
                  <a href="%s" target="_blank" style="text-decoration: none; display: inline-block;">
                    <img src="%s" alt="Ảnh chứng chỉ" style="max-width: 100%%; max-height: 320px; border-radius: 10px; border: 1px solid #fde68a; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.2); display: block;" />
                  </a>
                  <p style="margin: 6px 0 0 0; font-size: 11px; color: #b45309; font-weight: 600;">
                    🔍 <a href="%s" target="_blank" style="color: #b45309; text-decoration: underline;">Bấm vào đây để phóng to ảnh chứng chỉ &rarr;</a>
                  </p>
                </div>
                """.formatted(certImageUrl, certImageUrl, certImageUrl);
        } else {
            certImageHtml = "<span style=\"color: #64748b; font-style: italic;\">Không có ảnh chứng chỉ</span>";
        }

        String adminPortalUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/admin/muas/credentials";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Chứng Chỉ Mới Cần Phê Duyệt</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 35px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%%, #78350f 50%%, #b45309 100%%); padding: 32px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.25); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 9999px; padding: 6px 18px; margin-bottom: 14px;">
                            <span style="color: #fef3c7; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;">
                              📜 HỒ SƠ NĂNG LỰC CẦN DUYỆT
                            </span>
                          </div>
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
                            Chứng Chỉ Mới Cần Phê Duyệt
                          </h1>
                          <p style="color: #fde68a; font-size: 13px; margin: 8px 0 0 0;">
                            Thợ make-up vừa tải lên bằng cấp / chứng chỉ chuyên môn
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 32px 30px;">
                          
                          <!-- Salutation -->
                          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 18px 0;">
                            Kính gửi Quản Trị Viên <strong style="color: #b45309;">%s</strong>,
                          </p>
                          
                          <!-- Notification Box -->
                          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                              📋 Hệ thống ghi nhận thợ make-up <strong>%s</strong> vừa tải lên chứng chỉ <strong>"%s"</strong> để xác minh năng lực và gắn huy hiệu chuyên gia trên nền tảng MUA Platform.
                            </p>
                          </div>
                          
                          <!-- Details Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-collapse: separate; border-spacing: 0; border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;">
                            <tr style="background-color: #fffbeb;">
                              <td colspan="2" style="padding: 12px 18px; border-bottom: 1px solid #fef3c7;">
                                <strong style="font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
                                  Thông Tin Chứng Chỉ
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td width="35%%" style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Thợ trang điểm:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">
                                %s
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Số điện thoại:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 600; font-family: monospace; border-bottom: 1px solid #f1f5f9;">
                                %s
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Tên chứng chỉ:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #b45309; font-weight: 800; border-bottom: 1px solid #f1f5f9;">
                                %s
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Thời gian nộp:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                                %s
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                                Trạng thái:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px; border-bottom: 1px solid #f1f5f9;">
                                <span style="background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
                                  ⏳ Chờ Quản Trị Viên phê duyệt
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b;">
                                Ảnh chứng chỉ:
                              </td>
                              <td style="padding: 11px 18px; font-size: 13px;">
                                %s
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button (Center) -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #d97706 0%%, #b45309 100%%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35); letter-spacing: 0.3px;">
                                  Truy Cập Phê Duyệt Chứng Chỉ Ngay &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Signature -->
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng,<br>
                            <strong style="color: #1e293b;">Đội ngũ Vận hành MUA Platform</strong>
                          </p>
                          
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ Hệ thống Nền tảng Đặt lịch Makeup (MUA Platform).<br>
                          Mọi thắc mắc xin vui lòng liên hệ Bộ phận Hỗ trợ Đối tác qua Hotline: <strong>1900 8888</strong> hoặc Email: <strong>support@muamakeup.com</strong>.
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                adminDisplayName,
                artistName,
                certificateTitle,
                artistName,
                artistPhone,
                certificateTitle,
                timeText,
                certImageHtml,
                adminPortalUrl
        );
    }
}
