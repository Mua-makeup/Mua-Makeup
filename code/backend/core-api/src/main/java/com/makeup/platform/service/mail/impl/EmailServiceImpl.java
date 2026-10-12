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

    @Override
    @Async
    public void sendCertificateVerificationResultEmail(
            String toEmail,
            String muaName,
            String certName,
            boolean isVerified,
            String notes
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send certificate result email: recipient email missing");
            return;
        }

        String subject = isVerified
                ? "[" + BRAND_NAME + "] 🎉 Chúc Mừng! Chứng Chỉ Của Bạn Đã Được Phê Duyệt"
                : "[" + BRAND_NAME + "] ⚠️ Thông Báo Kết Quả Xét Duyệt Chứng Chỉ";
        String htmlContent = buildCertificateVerificationResultEmailHtml(muaName, certName, isVerified, notes);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildCertificateVerificationResultEmailHtml(
            String muaName,
            String certName,
            boolean isVerified,
            String notes
    ) {
        String artistName = (muaName != null && !muaName.isBlank()) ? muaName : "Thợ trang điểm";
        String certificateTitle = (certName != null && !certName.isBlank()) ? certName : "Chứng chỉ chuyên môn";
        String noteText = (notes != null && !notes.isBlank()) ? notes : (isVerified ? "Hồ sơ chứng chỉ đạt chuẩn tiêu chí nền tảng." : "Hồ sơ chưa đạt tiêu chuẩn phê duyệt.");
        String appUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/mua/workstation";

        String headerGradient = isVerified
                ? "linear-gradient(135deg, #064e3b 0%, #059669 100%)"
                : "linear-gradient(135deg, #831843 0%, #991b1b 100%)";
        String badgeText = isVerified ? "ĐÃ PHÊ DUYỆT (VERIFIED)" : "TỪ CHỐI (REJECTED)";
        String badgeStyle = isVerified
                ? "background-color: #dcfce7; color: #166534; border: 1px solid #86efac;"
                : "background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;";
        String headline = isVerified ? "Chứng Chỉ Đã Được Phê Duyệt!" : "Chứng Chỉ Chưa Được Phê Duyệt";
        String instruction = isVerified
                ? "Chúc mừng bạn! Hồ sơ chứng chỉ của bạn đã được Ban Quản Trị xác thực thành công. Bạn đã có thể kích hoạt tính năng nhận đơn trực tuyến và tiếp cận hàng ngàn khách hàng tiềm năng."
                : "Rất tiếc, chứng chỉ của bạn chưa đáp ứng đủ tiêu chuẩn thẩm định của Ban Quản Trị. Vui lòng xem lý do bên dưới và tải lên lại chứng chỉ hợp lệ để được xét duyệt lại.";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>%s</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 35px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background: %s; padding: 32px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 9999px; padding: 5px 16px; margin-bottom: 12px;">
                            <span style="color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;">
                              XÉT DUYỆT HỒ SƠ CHỨNG CHỈ
                            </span>
                          </div>
                          <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.3px;">
                            %s
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Body -->
                      <tr>
                        <td style="padding: 32px 30px;">
                          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                            Xin chào <strong>%s</strong>,
                          </p>
                          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                            %s
                          </p>
                          
                          <!-- Details Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <tr style="background-color: #f8fafc;">
                              <td colspan="2" style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 13px; color: #334155; text-transform: uppercase;">Chi Tiết Kết Quả</strong>
                              </td>
                            </tr>
                            <tr>
                              <td width="35%%" style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Tên chứng chỉ:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Trạng thái:</td>
                              <td style="padding: 11px 18px; font-size: 13px; border-bottom: 1px solid #f1f5f9;">
                                <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; %s">%s</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b;">Ghi chú / Lý do:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #334155; font-style: italic;">"%s"</td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">
                                  Mở Ứng Dụng MUA Platform &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng,<br>
                            <strong>Ban Quản Trị MUA Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 11px; color: #94a3b8;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform. Vui lòng không trả lời thư này.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                headline,
                headerGradient,
                headline,
                artistName,
                instruction,
                certificateTitle,
                badgeStyle,
                badgeText,
                noteText,
                appUrl
        );
    }

    @Override
    @Async
    public void sendAgencyStaffApplicationEmail(
            String toEmail,
            String agencyOwnerName,
            String agencyName,
            String staffName,
            String staffPhone,
            String inviteCode
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send staff application email: agency owner email missing");
            return;
        }

        String subject = "[" + BRAND_NAME + "] 👥 Có Đơn Xin Gia Nhập Studio Mới (" + staffName + ")";
        String htmlContent = buildAgencyStaffApplicationEmailHtml(agencyOwnerName, agencyName, staffName, staffPhone, inviteCode);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildAgencyStaffApplicationEmailHtml(
            String agencyOwnerName,
            String agencyName,
            String staffName,
            String staffPhone,
            String inviteCode
    ) {
        String ownerName = (agencyOwnerName != null && !agencyOwnerName.isBlank()) ? agencyOwnerName : "Chủ Studio";
        String studioName = (agencyName != null && !agencyName.isBlank()) ? agencyName : "Studio";
        String muaName = (staffName != null && !staffName.isBlank()) ? staffName : "Thợ trang điểm";
        String phone = (staffPhone != null && !staffPhone.isBlank()) ? staffPhone : "Chưa cập nhật";
        String code = (inviteCode != null && !inviteCode.isBlank()) ? inviteCode : "N/A";
        String staffManagementUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/agency/staff";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Có Đơn Xin Gia Nhập Studio Mới</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 35px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%%, #4338ca 100%%); padding: 32px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border-radius: 9999px; padding: 5px 16px; margin-bottom: 12px;">
                            <span style="color: #c7d2fe; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;">
                              QUẢN LÝ NHÂN SỰ STUDIO
                            </span>
                          </div>
                          <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0;">
                            Đơn Xin Gia Nhập Studio Mới
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Body -->
                      <tr>
                        <td style="padding: 32px 30px;">
                          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                            Kính gửi <strong>%s</strong> (Chủ Studio %s),
                          </p>
                          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                            Hệ thống vừa tiếp nhận một đơn xin gia nhập Studio từ thợ trang điểm thông qua mã mời của bạn. Vui lòng xem xét thông tin và tiến hành phê duyệt:
                          </p>
                          
                          <!-- Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <tr style="background-color: #f8fafc;">
                              <td colspan="2" style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 13px; color: #334155; text-transform: uppercase;">Thông Tin Thợ Ứng Tuyển</strong>
                              </td>
                            </tr>
                            <tr>
                              <td width="38%%" style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Họ và tên:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Số điện thoại:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Mã mời đã dùng:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #4338ca; font-weight: 700; font-family: monospace; border-bottom: 1px solid #f1f5f9;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b;">Trạng thái:</td>
                              <td style="padding: 11px 18px; font-size: 13px;">
                                <span style="background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">⏳ Đang chờ Studio xét duyệt</span>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #4338ca 0%%, #3730a3 100%%); color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.3);">
                                  Vào Bảng Phê Duyệt Nhân Sự &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng,<br>
                            <strong>Hệ Thống MUA Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 11px; color: #94a3b8;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform. Vui lòng không trả lời thư này.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                ownerName,
                studioName,
                muaName,
                phone,
                code,
                staffManagementUrl
        );
    }

    @Override
    @Async
    public void sendStaffApplicationResultEmail(
            String toEmail,
            String staffName,
            String agencyName,
            boolean isApproved,
            BigDecimal commissionRate,
            String notes
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send staff application result email: recipient email missing");
            return;
        }

        String subject = isApproved
                ? "[" + BRAND_NAME + "] 🎊 Chúc Mừng! Đơn Gia Nhập Studio " + agencyName + " Đã Được Phê Duyệt"
                : "[" + BRAND_NAME + "] ℹ️ Thông Báo Kết Quả Đơn Gia Nhập Studio " + agencyName;
        String htmlContent = buildStaffApplicationResultEmailHtml(staffName, agencyName, isApproved, commissionRate, notes);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildStaffApplicationResultEmailHtml(
            String staffName,
            String agencyName,
            boolean isApproved,
            BigDecimal commissionRate,
            String notes
    ) {
        String muaName = (staffName != null && !staffName.isBlank()) ? staffName : "Thợ trang điểm";
        String studioName = (agencyName != null && !agencyName.isBlank()) ? agencyName : "Studio";
        String commissionText = commissionRate != null ? commissionRate.stripTrailingZeros().toPlainString() + "%" : "Theo thỏa thuận";
        String noteText = (notes != null && !notes.isBlank()) ? notes : (isApproved ? "Đã được Studio chấp thuận tham gia đội ngũ." : "Studio đã từ chối đơn ứng tuyển.");
        String workstationUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/mua/workstation";

        String headerGradient = isApproved
                ? "linear-gradient(135deg, #064e3b 0%, #047857 100%)"
                : "linear-gradient(135deg, #334155 0%, #1e293b 100%)";
        String headline = isApproved
                ? "Chào Mừng Gia Nhập Studio " + studioName + "!"
                : "Kết Quả Đơn Gia Nhập Studio " + studioName;
        String badgeText = isApproved ? "CHÍNH THỨC GIA NHẬP (ACTIVE)" : "ĐÃ TỪ CHỐI (REJECTED)";
        String badgeStyle = isApproved
                ? "background-color: #dcfce7; color: #166534; border: 1px solid #86efac;"
                : "background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;";
        String instruction = isApproved
                ? "Chúc mừng bạn đã chính thức trở thành thành viên của Studio <strong>" + studioName + "</strong>. Vai trò tài khoản của bạn đã được nâng cấp lên Nhân Viên Studio (Agency Staff). Hãy sẵn sàng tiếp nhận các ca làm việc hấp dẫn từ Studio!"
                : "Rất tiếc, Studio <strong>" + studioName + "</strong> hiện tại chưa thể tiếp nhận đơn gia nhập của bạn. Bạn vẫn có thể tiếp tục hoạt động với tư cách Thợ Trang Điểm Tự Do (Freelance MUA).";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>%s</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 35px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      <!-- Header -->
                      <tr>
                        <td style="background: %s; padding: 32px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 9999px; padding: 5px 16px; margin-bottom: 12px;">
                            <span style="color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;">
                              KẾT QUẢ ỨNG TUYỂN STUDIO
                            </span>
                          </div>
                          <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0;">
                            %s
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Body -->
                      <tr>
                        <td style="padding: 32px 30px;">
                          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                            Xin chào <strong>%s</strong>,
                          </p>
                          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                            %s
                          </p>
                          
                          <!-- Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <tr style="background-color: #f8fafc;">
                              <td colspan="2" style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 13px; color: #334155; text-transform: uppercase;">Chi Tiết Kết Quả</strong>
                              </td>
                            </tr>
                            <tr>
                              <td width="38%%" style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Studio:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Trạng thái:</td>
                              <td style="padding: 11px 18px; font-size: 13px; border-bottom: 1px solid #f1f5f9;">
                                <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; %s">%s</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Tỷ lệ hoa hồng:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #047857; font-weight: 700; border-bottom: 1px solid #f1f5f9;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 11px 18px; font-size: 13px; color: #64748b;">Ghi chú từ Studio:</td>
                              <td style="padding: 11px 18px; font-size: 13px; color: #334155; font-style: italic;">"%s"</td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">
                                  Truy Cập Bàn Làm Việc (Workstation) &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng,<br>
                            <strong>Hệ Thống MUA Platform & %s</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 11px; color: #94a3b8;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform. Vui lòng không trả lời thư này.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                headline,
                headerGradient,
                headline,
                muaName,
                instruction,
                studioName,
                badgeStyle,
                badgeText,
                commissionText,
                noteText,
                workstationUrl,
                studioName
        );
    }

    @Override
    @Async
    public void sendCustomerArtistOnTheWayEmail(
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
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send artist on the way email: recipient email missing for booking {}", bookingCode);
            return;
        }

        String subject = "[" + BRAND_NAME + "] 🚗 Chuyên viên trang điểm đang di chuyển đến điểm hẹn - Đơn #" + bookingCode;
        String htmlContent = buildCustomerArtistOnTheWayEmailHtml(
                customerName, bookingCode, bookingType, artistName, artistPhone,
                artistRating, packageName, styleName, destinationAddress, startedAt
        );

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendCustomerBookingCompletedReceiptEmail(
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
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send receipt email: recipient email missing for booking {}", bookingCode);
            return;
        }

        String subject = "[" + BRAND_NAME + "] ✨ Xác Nhận Thanh Toán & Biên Lai Đơn Hàng #" + bookingCode;
        String htmlContent = buildCustomerBookingCompletedReceiptEmailHtml(
                customerName, bookingCode, bookingType, artistName, packageName,
                styleName, destinationAddress, totalAmount, depositAmount,
                finalAmount, paymentMethod, paymentCode, completedAt
        );

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendCustomerBookingCancelledOnTheWayEmail(
            String toEmail,
            String customerName,
            String bookingCode,
            String bookingType,
            String artistName,
            String destinationAddress,
            String cancellationReason,
            BigDecimal refundAmount
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send cancellation email: recipient email missing for booking {}", bookingCode);
            return;
        }

        String subject = "[" + BRAND_NAME + "] ⚠️ Thông Báo Hủy Đơn Hàng #" + bookingCode + " - Sự Cố Di Chuyển";
        String htmlContent = buildCustomerBookingCancelledOnTheWayEmailHtml(
                customerName, bookingCode, bookingType, artistName,
                destinationAddress, cancellationReason, refundAmount
        );

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildCustomerArtistOnTheWayEmailHtml(
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
    ) {
        String clientName = (customerName != null && !customerName.isBlank()) ? customerName : "Quý khách";
        String muaName = (artistName != null && !artistName.isBlank()) ? artistName : "Chuyên viên trang điểm";
        String phone = (artistPhone != null && !artistPhone.isBlank()) ? artistPhone : "Chưa cập nhật";
        String rating = (artistRating != null && !artistRating.isBlank()) ? artistRating : "5.0";
        String pkg = (packageName != null && !packageName.isBlank()) ? packageName : "Dịch vụ Make-up Khẩn cấp";
        String style = (styleName != null && !styleName.isBlank()) ? styleName : "Tiêu chuẩn";
        String address = (destinationAddress != null && !destinationAddress.isBlank()) ? destinationAddress : "Địa chỉ theo yêu cầu";
        String timeStr = (startedAt != null && !startedAt.isBlank()) ? startedAt : "Ngay bây giờ";
        String trackingUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/customer/bookings/" + bookingCode;

        boolean isInstant = "REALTIME_INSTANT".equalsIgnoreCase(bookingType);
        String typeBadgeText = isInstant ? "⚡ ĐƠN KHẨN CẤP (30-60 PHÚT)" : "📅 ĐẶT LỊCH HẸN TRANG ĐIỂM";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Chuyên Viên Đang Di Chuyển</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      
                      <!-- Luxury Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%%, #4c0519 50%%, #881337 100%%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(251, 191, 36, 0.4); margin-bottom: 12px;">
                            <span style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                              MUA MAKEUP PLATFORM • INSTANT SERVICE
                            </span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
                            CHUYÊN VIÊN ĐANG TRÊN ĐƯỜNG ĐẾN
                          </h1>
                          <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px; letter-spacing: 0.3px;">
                            Quý khách vui lòng giữ liên lạc, chuyên viên sẽ gọi cho bạn khi đến nơi
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          
                          <!-- Salutation -->
                          <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                            Kính gửi <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            Chuyên viên trang điểm đã tiếp nhận ca và <strong>bắt đầu di chuyển</strong> đến địa chỉ hẹn của bạn. Xin vui lòng để ý chuông điện thoại để chuyên viên liên hệ ngay khi đến nơi.
                          </p>
                          
                          <!-- Status Box -->
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
                                      <span style="display: inline-block; background-color: #fecdd3; color: #9f1239; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #fda4af;">
                                        🚗 %s
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Artist Info Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  👩‍🎨 CHUYÊN VIÊN TRANG ĐIỂM PHỤ TRÁCH
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 13px; color: #64748b;">Họ và tên:</span><br>
                                      <strong style="font-size: 16px; color: #0f172a;">%s</strong>
                                      <span style="display: inline-block; margin-left: 8px; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                                        ⭐ %s
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 13px; color: #64748b;">Số điện thoại liên hệ:</span><br>
                                      <a href="tel:%s" style="font-size: 16px; color: #e11d48; font-weight: 800; text-decoration: none;">
                                        📞 %s
                                      </a>
                                      <span style="font-size: 12px; color: #64748b; margin-left: 6px;">(Bấm để gọi trực tiếp)</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="font-size: 13px; color: #64748b;">Thời gian thợ xuất phát:</span><br>
                                      <strong style="font-size: 14px; color: #334155;">⏱️ %s</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Booking Details Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  📍 THÔNG TIN ĐIỂM HẸN & DỊCH VỤ
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 8px;">
                                      <span style="font-size: 12px; color: #64748b;">Gói dịch vụ:</span><br>
                                      <strong style="font-size: 14px; color: #0f172a;">%s</strong>
                                      <span style="font-size: 13px; color: #64748b;"> &bull; Phong cách: </span>
                                      <strong style="font-size: 13px; color: #e11d48;">%s</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="font-size: 12px; color: #64748b;">Địa chỉ thực hiện:</span><br>
                                      <strong style="font-size: 14px; color: #0f172a; line-height: 1.4;">%s</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Preparation Tips -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px 18px; margin-bottom: 28px; border: 1px dashed #cbd5e1;">
                            <tr>
                              <td>
                                <strong style="display: block; font-size: 12px; color: #334155; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                                  💡 LƯU Ý DÀNH CHO QUÝ KHÁCH:
                                </strong>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  ✓ Giữ điện thoại bên mình để không bỏ lỡ cuộc gọi khi chuyên viên đến nơi.
                                </p>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  ✓ Chuẩn bị sẵn không gian trang điểm có đủ ánh sáng và nguồn điện.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  ✓ Làm sạch da mặt cơ bản trước để chuyên viên bắt đầu công việc nhanh nhất.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35); letter-spacing: 0.3px;">
                                  Mở Ứng Dụng & Theo Dõi Trực Tiếp &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Trân trọng cảm ơn,<br>
                            <strong>Đội Ngũ Vận Hành MUA Makeup Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform.<br>
                          Hotline hỗ trợ khẩn cấp 24/7: <strong style="color: #64748b;">1900 8888</strong> &bull; Email: <strong style="color: #64748b;">support@muamakeup.vn</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                clientName,
                bookingCode,
                typeBadgeText,
                muaName,
                rating,
                phone,
                phone,
                timeStr,
                pkg,
                style,
                address,
                trackingUrl
        );
    }

    private String buildCustomerBookingCompletedReceiptEmailHtml(
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
    ) {
        String clientName = (customerName != null && !customerName.isBlank()) ? customerName : "Quý khách";
        String muaName = (artistName != null && !artistName.isBlank()) ? artistName : "Chuyên viên trang điểm";
        String pkg = (packageName != null && !packageName.isBlank()) ? packageName : "Dịch vụ Make-up Khẩn cấp";
        String style = (styleName != null && !styleName.isBlank()) ? styleName : "Tiêu chuẩn";
        String address = (destinationAddress != null && !destinationAddress.isBlank()) ? destinationAddress : "Địa chỉ theo yêu cầu";
        String method = (paymentMethod != null && !paymentMethod.isBlank()) ? paymentMethod : "Thanh toán Trực tuyến";
        String pCode = (paymentCode != null && !paymentCode.isBlank()) ? paymentCode : ("REC-" + bookingCode);
        String timeStr = (completedAt != null && !completedAt.isBlank()) ? completedAt : "Vừa hoàn tất";

        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
        String formattedTotal = totalAmount != null ? currencyFormatter.format(totalAmount) : "0 ₫";
        String formattedDeposit = depositAmount != null ? currencyFormatter.format(depositAmount) : "0 ₫";
        String formattedFinal = finalAmount != null ? currencyFormatter.format(finalAmount) : "0 ₫";

        String reviewUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/customer/bookings/" + bookingCode + "/review";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Biên Lai & Xác Nhận Thanh Toán</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      
                      <!-- Emerald & Slate Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #064e3b 0%%, #0f172a 50%%, #881337 100%%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(251, 191, 36, 0.4); margin-bottom: 12px;">
                            <span style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                              MUA MAKEUP PLATFORM • BIÊN LAI ĐIỆN TỬ
                            </span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
                            XÁC NHẬN THANH TOÁN THÀNH CÔNG
                          </h1>
                          <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px; letter-spacing: 0.3px;">
                            Ca làm đẹp đã hoàn tất mỹ mãn - Cảm ơn Quý khách đã tin tưởng MUA Makeup
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          
                          <!-- Salutation -->
                          <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                            Kính gửi <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            MUA Makeup xin gửi lời cảm ơn chân thành đến Quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi! Ca làm đẹp của bạn đã hoàn thành xuất sắc và khoản thanh toán còn lại đã được xác nhận thành công.
                          </p>
                          
                          <!-- Success Badge Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #f0fdf4 0%%, #dcfce7 100%%); border: 1.5px solid #22c55e; border-radius: 14px; padding: 18px 22px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="left" style="vertical-align: middle;">
                                      <span style="display: block; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px;">
                                        MÃ ĐƠN HÀNG
                                      </span>
                                      <span style="display: block; font-size: 20px; font-weight: 900; color: #15803d; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; letter-spacing: 1.2px; margin-top: 2px;">
                                        #%s
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                      <span style="display: inline-block; background-color: #bbf7d0; color: #14532d; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #86efac;">
                                        ✅ ĐÃ QUYẾT TOÁN 100%%
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Order Receipt Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  🧾 CHI TIẾT BIÊN LAI GIAO DỊCH
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 10px; width: 50%%;">
                                      <span style="font-size: 12px; color: #64748b;">Mã giao dịch:</span><br>
                                      <strong style="font-size: 13px; color: #0f172a; font-family: monospace;">%s</strong>
                                    </td>
                                    <td style="padding-bottom: 10px; width: 50%%;">
                                      <span style="font-size: 12px; color: #64748b;">Thời gian hoàn tất:</span><br>
                                      <strong style="font-size: 13px; color: #0f172a;">%s</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 12px; color: #64748b;">Chuyên viên thực hiện:</span><br>
                                      <strong style="font-size: 14px; color: #0f172a;">%s</strong>
                                    </td>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 12px; color: #64748b;">Phương thức thanh toán:</span><br>
                                      <strong style="font-size: 13px; color: #0f172a;">%s</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" style="padding-bottom: 10px;">
                                      <span style="font-size: 12px; color: #64748b;">Dịch vụ đã hoàn tất:</span><br>
                                      <strong style="font-size: 14px; color: #0f172a;">%s</strong>
                                      <span style="font-size: 13px; color: #64748b;"> &bull; Phong cách: </span>
                                      <strong style="font-size: 13px; color: #e11d48;">%s</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2">
                                      <span style="font-size: 12px; color: #64748b;">Địa chỉ thực hiện:</span><br>
                                      <strong style="font-size: 13px; color: #334155; line-height: 1.4;">%s</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Payment Breakdown Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  💰 BẢNG KÊ CHI PHÍ THANH TOÁN
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding: 8px 0; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                                      Tổng chi phí dịch vụ:
                                    </td>
                                    <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                                      Tiền đặt cọc (Đã thanh toán trước):
                                    </td>
                                    <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 700; color: #16a34a; border-bottom: 1px solid #f1f5f9;">
                                      -%s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 12px 0 6px 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                                      Số tiền thanh toán nốt:
                                    </td>
                                    <td align="right" style="padding: 12px 0 6px 0; font-size: 18px; font-weight: 900; color: #e11d48;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" align="right" style="padding-top: 4px;">
                                      <span style="font-size: 11px; color: #15803d; font-weight: 700;">
                                        ✓ Đã thanh toán đầy đủ &bull; Trạng thái: Thành công
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Rating & Review CTA Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fff1f2 0%%, #ffe4e6 100%%); border-radius: 14px; padding: 22px 20px; margin-bottom: 28px; border: 1px solid #fecdd3; text-align: center;">
                            <tr>
                              <td>
                                <span style="display: block; font-size: 24px; margin-bottom: 6px;">⭐ ⭐ ⭐ ⭐ ⭐</span>
                                <strong style="display: block; font-size: 15px; color: #9f1239; margin-bottom: 6px;">
                                  Đánh Giá Trải Nghiệm Dịch Vụ Của Bạn
                                </strong>
                                <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  Sự hài lòng của Quý khách là thước đo thành công của chúng tôi. Hãy dành 1 phút để đánh giá chất lượng phục vụ của chuyên viên nhé!
                                </p>
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">
                                  Đánh Giá Chuyên Viên Ngay &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Kính chúc Quý khách luôn rạng ngời & hạnh phúc,<br>
                            <strong>Đội Ngũ MUA Makeup Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email biên lai tự động được phát hành từ MUA Makeup Platform.<br>
                          Mọi thắc mắc về biên lai xin liên hệ hotline: <strong style="color: #64748b;">1900 8888</strong> &bull; Email: <strong style="color: #64748b;">billing@muamakeup.vn</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                clientName,
                bookingCode,
                pCode,
                timeStr,
                muaName,
                method,
                pkg,
                style,
                address,
                formattedTotal,
                formattedDeposit,
                formattedFinal,
                reviewUrl
        );
    }

    private String buildCustomerBookingCancelledOnTheWayEmailHtml(
            String customerName,
            String bookingCode,
            String bookingType,
            String artistName,
            String destinationAddress,
            String cancellationReason,
            BigDecimal refundAmount
    ) {
        String clientName = (customerName != null && !customerName.isBlank()) ? customerName : "Quý khách";
        String muaName = (artistName != null && !artistName.isBlank()) ? artistName : "Chuyên viên trang điểm";
        String address = (destinationAddress != null && !destinationAddress.isBlank()) ? destinationAddress : "Địa chỉ theo yêu cầu";
        String reason = (cancellationReason != null && !cancellationReason.isBlank()) ? cancellationReason : "Chuyên viên gặp sự cố bất khả kháng trên đường di chuyển";

        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
        String formattedRefund = (refundAmount != null && refundAmount.compareTo(BigDecimal.ZERO) > 0)
                ? currencyFormatter.format(refundAmount)
                : "toàn bộ số tiền đặt cọc";

        String rebookUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/customer/booking-instant";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Thông Báo Hủy Đơn Hàng</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      
                      <!-- Crimson & Dark Slate Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e293b 0%%, #450a0a 50%%, #991b1b 100%%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(254, 202, 202, 0.4); margin-bottom: 12px;">
                            <span style="color: #fecaca; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                              MUA MAKEUP PLATFORM • THÔNG BÁO QUAN TRỌNG
                            </span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
                            THÔNG BÁO HỦY ĐƠN ĐẶT LỊCH
                          </h1>
                          <p style="margin: 8px 0 0 0; color: #fca5a5; font-size: 13px; letter-spacing: 0.3px;">
                            Sự cố bất khả kháng trong quá trình chuyên viên đang di chuyển
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          
                          <!-- Salutation -->
                          <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                            Kính gửi <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            Chúng tôi vô cùng lấy làm tiếc phải thông báo rằng ca trang điểm khẩn cấp của Quý khách không thể tiếp tục thực hiện do chuyên viên gặp sự cố bất khả kháng trong quá trình đang di chuyển đến điểm hẹn.
                          </p>
                          
                          <!-- Cancellation Alert Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #fef2f2 0%%, #fee2e2 100%%); border: 1.5px solid #ef4444; border-radius: 14px; padding: 18px 22px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="left" style="vertical-align: middle;">
                                      <span style="display: block; font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">
                                        MÃ ĐƠN HÀNG
                                      </span>
                                      <span style="display: block; font-size: 20px; font-weight: 900; color: #dc2626; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; letter-spacing: 1.2px; margin-top: 2px;">
                                        #%s
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                      <span style="display: inline-block; background-color: #fecaca; color: #991b1b; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #f87171;">
                                        🚫 ĐÃ HỦY ĐƠN
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Reason Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #fecaca; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #fef2f2; padding: 12px 18px; border-bottom: 1px solid #fecaca;">
                                <strong style="font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.8px;">
                                  📋 CHI TIẾT SỰ CỐ & LÝ DO HỦY
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 20px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f1d1d; font-weight: 600; line-height: 1.5;">
                                  Lý do: &ldquo;%s&rdquo;
                                </p>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">
                                  Chuyên viên phụ trách: <strong style="color: #1e293b;">%s</strong>
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #64748b;">
                                  Địa điểm hẹn: <strong style="color: #1e293b;">%s</strong>
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Refund Assurance Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #eff6ff 0%%, #dbeafe 100%%); border: 1.5px solid #3b82f6; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
                            <tr>
                              <td>
                                <strong style="display: block; font-size: 13px; color: #1e40af; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                                  💰 CHÍNH SÁCH BẢO VỆ & HOÀN TIỀN CỌC TỰ ĐỘNG
                                </strong>
                                <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                                  Vì sự cố phát sinh ngoài ý muốn trong quá trình chuyên viên di chuyển, <strong>100%% tiền đặt cọc (%s)</strong> đã được hệ thống tự động hoàn trả lại số dư ví / tài khoản của Quý khách theo đúng chính sách bảo vệ khách hàng của MUA Platform.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Sincere Apology & Support -->
                          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            Ban quản trị MUA Makeup Platform chân thành gửi lời xin lỗi sâu sắc tới Quý khách vì sự bất tiện này đã ảnh hưởng đến kế hoạch của bạn. Quý khách có thể bấm nút bên dưới để hệ thống quét và kết nối ngay với một chuyên viên khác gần nhất.
                          </p>
                          
                          <!-- CTA Buttons -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35); letter-spacing: 0.3px;">
                                  ⚡ Đặt Lại Chuyên Viên Khẩn Cấp Khác Ngay &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Thành thật xin lỗi và trân trọng,<br>
                            <strong>Ban Quản Trị & Trung Tâm Điều Phối MUA Makeup</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform.<br>
                          Hotline hỗ trợ điều phối khẩn cấp 24/7: <strong style="color: #dc2626;">1900 8888 (Phím 1)</strong> &bull; Email: <strong style="color: #64748b;">support@muamakeup.vn</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                clientName,
                bookingCode,
                reason,
                muaName,
                address,
                formattedRefund,
                rebookUrl
        );
    }

    @Override
    @Async
    public void sendCustomerDepositSuccessfulEmail(
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
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send deposit successful email: recipient email missing for booking {}", bookingCode);
            return;
        }

        String subject = "[" + BRAND_NAME + "] 💎 Đặt Cọc Thành Công & Xác Nhận Đơn Hàng #" + bookingCode;
        String htmlContent = buildCustomerDepositSuccessfulEmailHtml(
                customerName, bookingCode, bookingType, artistName, artistPhone,
                artistRating, packageName, styleName, destinationAddress,
                totalAmount, depositAmount, remainingAmount, paymentMethod,
                paymentCode, paidAt
        );

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildCustomerDepositSuccessfulEmailHtml(
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
    ) {
        String clientName = (customerName != null && !customerName.isBlank()) ? customerName : "Quý khách";
        String muaName = (artistName != null && !artistName.isBlank()) ? artistName : "Chuyên viên trang điểm";
        String phone = (artistPhone != null && !artistPhone.isBlank()) ? artistPhone : "Chưa cập nhật";
        String rating = (artistRating != null && !artistRating.isBlank()) ? artistRating : "5.0";
        String pkg = (packageName != null && !packageName.isBlank()) ? packageName : "Dịch vụ Make-up Khẩn cấp";
        String style = (styleName != null && !styleName.isBlank()) ? styleName : "Tiêu chuẩn";
        String address = (destinationAddress != null && !destinationAddress.isBlank()) ? destinationAddress : "Địa chỉ theo yêu cầu";
        String method = (paymentMethod != null && !paymentMethod.isBlank()) ? paymentMethod : "Thanh toán Trực tuyến";
        String pCode = (paymentCode != null && !paymentCode.isBlank()) ? paymentCode : ("DEP-" + bookingCode);
        String timeStr = (paidAt != null && !paidAt.isBlank()) ? paidAt : "Vừa thanh toán";

        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
        String formattedTotal = totalAmount != null ? currencyFormatter.format(totalAmount) : "0 ₫";
        String formattedDeposit = depositAmount != null ? currencyFormatter.format(depositAmount) : "0 ₫";
        String formattedRemaining = remainingAmount != null ? currencyFormatter.format(remainingAmount) : "0 ₫";

        boolean isInstant = "REALTIME_INSTANT".equalsIgnoreCase(bookingType);
        String typeBadgeText = isInstant ? "⚡ ĐƠN KHẨN CẤP (30-60 PHÚT)" : "📅 ĐẶT LỊCH HẸN TRANG ĐIỂM";
        String trackingUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/customer/bookings/" + bookingCode;

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Đặt Cọc Thành Công & Xác Nhận Đơn Hàng</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      
                      <!-- Indigo & Burgundy Luxury Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%%, #1e1b4b 50%%, #881337 100%%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(251, 191, 36, 0.4); margin-bottom: 12px;">
                            <span style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                              MUA MAKEUP PLATFORM • BẢO CHỨNG ESCROW
                            </span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
                            ĐẶT CỌC THÀNH CÔNG
                          </h1>
                          <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px; letter-spacing: 0.3px;">
                            Cảm ơn Quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          
                          <!-- Salutation -->
                          <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                            Kính gửi <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            MUA Makeup xin chân thành cảm ơn Quý khách đã tin tưởng lựa chọn dịch vụ của chúng tôi! Hệ thống đã ghi nhận khoản thanh toán tiền cọc thành công cho đơn hàng <strong>#%s</strong> và quỹ bảo chứng đã được kích hoạt.
                          </p>
                          
                          <!-- Status Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #f0fdf4 0%%, #dcfce7 100%%); border: 1.5px solid #22c55e; border-radius: 14px; padding: 18px 22px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="left" style="vertical-align: middle;">
                                      <span style="display: block; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px;">
                                        MÃ ĐƠN HÀNG
                                      </span>
                                      <span style="display: block; font-size: 20px; font-weight: 900; color: #15803d; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; letter-spacing: 1.2px; margin-top: 2px;">
                                        #%s
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                      <span style="display: inline-block; background-color: #bbf7d0; color: #14532d; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #86efac;">
                                        💎 ĐÃ ĐẶT CỌC THÀNH CÔNG
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Highlight Box: Artist moving in 15-30 minutes -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fff1f2 0%%, #ffe4e6 100%%); border: 1.5px dashed #f43f5e; border-radius: 14px; padding: 20px 22px; margin-bottom: 24px;">
                            <tr>
                              <td>
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="vertical-align: top; width: 36px;">
                                      <span style="font-size: 28px; line-height: 1;">🚗</span>
                                    </td>
                                    <td style="vertical-align: top; padding-left: 10px;">
                                      <strong style="display: block; font-size: 14px; color: #9f1239; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                        TIẾN ĐỘ THỰC HIỆN & LỜI NHẮC QUAN TRỌNG:
                                      </strong>
                                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #881337; line-height: 1.6; font-weight: 600;">
                                        Chuyên viên trang điểm đang chuẩn bị bộ mỹ phẩm & dụng cụ chuyên dụng và sẽ <u>bắt đầu di chuyển sau 15 đến 30 phút nữa</u>.
                                      </p>
                                      <p style="margin: 0; font-size: 13px; color: #9f1239; line-height: 1.5;">
                                        📞 <strong>Quý khách vui lòng giữ liên lạc và để ý điện thoại</strong>, chuyên viên sẽ gọi cho bạn trước khi xuất phát và ngay khi có mặt tại điểm hẹn!
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Artist Info Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  👩‍🎨 CHUYÊN VIÊN TRANG ĐIỂM TIẾP NHẬN
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 13px; color: #64748b;">Họ và tên:</span><br>
                                      <strong style="font-size: 16px; color: #0f172a;">%s</strong>
                                      <span style="display: inline-block; margin-left: 8px; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                                        ⭐ %s
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 13px; color: #64748b;">Số điện thoại chuyên viên:</span><br>
                                      <a href="tel:%s" style="font-size: 16px; color: #e11d48; font-weight: 800; text-decoration: none;">
                                        📞 %s
                                      </a>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="font-size: 13px; color: #64748b;">Loại đơn dịch vụ:</span><br>
                                      <strong style="font-size: 13px; color: #334155;">%s</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Order Details Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  📍 THÔNG TIN ĐƠN HÀNG & ĐỊA ĐIỂM
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 8px;">
                                      <span style="font-size: 12px; color: #64748b;">Gói dịch vụ:</span><br>
                                      <strong style="font-size: 14px; color: #0f172a;">%s</strong>
                                      <span style="font-size: 13px; color: #64748b;"> &bull; Phong cách: </span>
                                      <strong style="font-size: 13px; color: #e11d48;">%s</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="font-size: 12px; color: #64748b;">Địa chỉ thực hiện:</span><br>
                                      <strong style="font-size: 14px; color: #0f172a; line-height: 1.4;">%s</strong>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Payment Summary Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  💰 THÔNG TIN THANH TOÁN TIỀN CỌC
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                                      Mã giao dịch đặt cọc:
                                    </td>
                                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; font-family: monospace; border-bottom: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                                      Thời gian thanh toán:
                                    </td>
                                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                                      Phương thức thanh toán:
                                    </td>
                                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                                      Tổng chi phí dịch vụ:
                                    </td>
                                    <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; font-size: 15px; font-weight: 800; color: #16a34a; border-bottom: 1px solid #f1f5f9;">
                                      Số tiền đã đặt cọc:
                                    </td>
                                    <td align="right" style="padding: 8px 0; font-size: 17px; font-weight: 900; color: #16a34a; border-bottom: 1px solid #f1f5f9;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0 4px 0; font-size: 14px; color: #64748b;">
                                      Số tiền còn lại (thanh toán khi xong ca):
                                    </td>
                                    <td align="right" style="padding: 8px 0 4px 0; font-size: 15px; font-weight: 800; color: #e11d48;">
                                      %s
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Preparation Tips -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px 18px; margin-bottom: 28px; border: 1px dashed #cbd5e1;">
                            <tr>
                              <td>
                                <strong style="display: block; font-size: 12px; color: #334155; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                                  💡 CHUẨN BỊ TRƯỚC KHI CHUYÊN VIÊN ĐẾN:
                                </strong>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  ✓ Rửa mặt sạch sẽ và để da thông thoáng tự nhiên.
                                </p>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  ✓ Chuẩn bị sẵn một vị trí ngồi có gương và ánh sáng tốt gần ổ cắm điện.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                  ✓ Để chuông điện thoại ở mức to để chuyên viên liên hệ khi đến nơi.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35); letter-spacing: 0.3px;">
                                  Xem Chi Tiết Đơn Hàng & Lộ Trình &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Cảm ơn Quý khách & chúc bạn có một trải nghiệm làm đẹp ưng ý nhất,<br>
                            <strong>Đội Ngũ MUA Makeup Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform.<br>
                          Hotline hỗ trợ khách hàng 24/7: <strong style="color: #64748b;">1900 8888</strong> &bull; Email: <strong style="color: #64748b;">support@muamakeup.vn</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                clientName,
                bookingCode,
                bookingCode,
                muaName,
                rating,
                phone,
                phone,
                typeBadgeText,
                pkg,
                style,
                address,
                pCode,
                timeStr,
                method,
                formattedTotal,
                formattedDeposit,
                formattedRemaining,
                trackingUrl
        );
    }

    @Override
    @Async
    public void sendCustomerScheduledBookingConfirmedEmail(
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
    ) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send scheduled booking confirmed email: recipient email missing for booking {}", bookingCode);
            return;
        }

        String subject = "[" + BRAND_NAME + "] 📅 Xác Nhận Lịch Hẹn Thành Công - Chuyên Viên Đã Tiếp Nhận Đơn #" + bookingCode;
        String htmlContent = buildCustomerScheduledBookingConfirmedEmailHtml(
                customerName, bookingCode, artistName, artistPhone,
                artistRating, packageName, styleName, destinationAddress,
                bookingDate, startTime, totalAmount, depositAmount, remainingAmount
        );

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildCustomerScheduledBookingConfirmedEmailHtml(
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
    ) {
        String clientName = (customerName != null && !customerName.isBlank()) ? customerName : "Quý khách";
        String muaName = (artistName != null && !artistName.isBlank()) ? artistName : "Chuyên viên trang điểm";
        String phone = (artistPhone != null && !artistPhone.isBlank()) ? artistPhone : "Chưa cập nhật";
        String rating = (artistRating != null && !artistRating.isBlank()) ? artistRating : "5.0";
        String pkg = (packageName != null && !packageName.isBlank()) ? packageName : "Dịch vụ Đặt Lịch Hẹn";
        String style = (styleName != null && !styleName.isBlank()) ? styleName : "Tiêu chuẩn";
        String address = (destinationAddress != null && !destinationAddress.isBlank()) ? destinationAddress : "Địa chỉ theo yêu cầu";
        String dateStr = (bookingDate != null && !bookingDate.isBlank()) ? bookingDate : "Theo lịch đã chọn";
        String timeStr = (startTime != null && !startTime.isBlank()) ? startTime : "Theo giờ đã chọn";

        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
        String formattedTotal = totalAmount != null ? currencyFormatter.format(totalAmount) : "0 ₫";
        String formattedDeposit = depositAmount != null ? currencyFormatter.format(depositAmount) : "0 ₫";
        String formattedRemaining = remainingAmount != null ? currencyFormatter.format(remainingAmount) : "0 ₫";

        String trackingUrl = (frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:3000") + "/customer/bookings/" + bookingCode;

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Chuyên Viên Đã Tiếp Nhận Lịch Hẹn Trang Điểm</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                      
                      <!-- Luxury Gold & Purple Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%%, #2e1065 50%%, #831843 100%%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(251, 191, 36, 0.4); margin-bottom: 12px;">
                            <span style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                              MUA MAKEUP PLATFORM • ĐẶT LỊCH HẸN TRƯỚC
                            </span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
                            CHUYÊN VIÊN ĐÃ TIẾP NHẬN ĐƠN HÀNG
                          </h1>
                          <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px; letter-spacing: 0.3px;">
                            Lịch hẹn của bạn đã được xác nhận sau khi hoàn tất tiền cọc thành công!
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Body -->
                      <tr>
                        <td style="padding: 36px 32px;">
                          
                          <!-- Salutation -->
                          <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                            Kính gửi <strong>%s</strong>,
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            MUA Makeup xin thông báo: Chuyên viên trang điểm đã chính thức <strong>tiếp nhận đơn đặt lịch hẹn trước #%s</strong> của bạn. Chuyên viên đã khóa lịch làm việc và cam kết có mặt đúng hẹn để đem đến cho bạn diện mạo lộng lẫy và hoàn hảo nhất.
                          </p>
                          
                          <!-- Order Code Status Box -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #f0fdf4 0%%, #dcfce7 100%%); border: 1.5px solid #22c55e; border-radius: 14px; padding: 18px 22px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td align="left" style="vertical-align: middle;">
                                      <span style="display: block; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px;">
                                        MÃ ĐƠN HÀNG
                                      </span>
                                      <span style="display: block; font-size: 20px; font-weight: 900; color: #15803d; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; letter-spacing: 1.2px; margin-top: 2px;">
                                        #%s
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                      <span style="display: inline-block; background-color: #bbf7d0; color: #14532d; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #86efac;">
                                        ✅ ĐÃ TIẾP NHẬN CA HẸN
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- SCHEDULE TIME HIGHLIGHT BOX (GOLDEN CARD) -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fffbeb 0%%, #fef3c7 100%%); border: 2px solid #f59e0b; border-radius: 16px; padding: 22px 24px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.12);">
                            <tr>
                              <td>
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td colspan="2" style="padding-bottom: 14px; border-bottom: 1px dashed #d97706;">
                                      <span style="font-size: 12px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">
                                        📅 THỜI GIAN HẸN TRANG ĐIỂM XÁC NHẬN
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 14px; width: 50%%;">
                                      <span style="display: block; font-size: 12px; color: #78350f; font-weight: 600;">
                                        NGÀY PHỤC VỤ:
                                      </span>
                                      <strong style="display: block; font-size: 18px; color: #92400e; margin-top: 4px; font-weight: 800;">
                                        %s
                                      </strong>
                                    </td>
                                    <td style="padding-top: 14px; width: 50%%;">
                                      <span style="display: block; font-size: 12px; color: #78350f; font-weight: 600;">
                                        GIỜ BẮT ĐẦU:
                                      </span>
                                      <strong style="display: block; font-size: 18px; color: #b45309; margin-top: 4px; font-weight: 800;">
                                        %s
                                      </strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" style="padding-top: 12px;">
                                      <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5; font-style: italic;">
                                        💡 <strong>Lời nhắc:</strong> Chuyên viên sẽ liên hệ với Quý khách trước 30-45 phút trước giờ hẹn để xác nhận lại lộ trình và chuẩn bị đồ nghề trang điểm phù hợp nhất.
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Artist Info Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  👩‍🎨 CHUYÊN VIÊN TRANG ĐIỂM PHỤ TRÁCH
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 18px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding-bottom: 10px;">
                                      <span style="font-size: 13px; color: #64748b;">Họ và tên chuyên viên:</span><br>
                                      <strong style="font-size: 16px; color: #0f172a;">%s</strong>
                                      <span style="display: inline-block; margin-left: 8px; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                                        ⭐ %s
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="font-size: 13px; color: #64748b;">Số điện thoại chuyên viên:</span><br>
                                      <a href="tel:%s" style="font-size: 16px; color: #e11d48; font-weight: 800; text-decoration: none;">
                                        📞 %s
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Order Details Card -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  📍 CHI TIẾT DỊCH VỤ & ĐỊA ĐIỂM HẸN
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                      <span style="font-size: 13px; color: #64748b;">Gói dịch vụ:</span>
                                      <div style="font-size: 14px; color: #0f172a; font-weight: 700; margin-top: 2px;">
                                        %s
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                      <span style="font-size: 13px; color: #64748b;">Phong cách yêu cầu:</span>
                                      <div style="font-size: 14px; color: #0f172a; font-weight: 600; margin-top: 2px;">
                                        %s
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="font-size: 13px; color: #64748b;">Địa chỉ thực hiện trang điểm:</span>
                                      <div style="font-size: 14px; color: #0f172a; font-weight: 600; margin-top: 2px; line-height: 1.5;">
                                        %s
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Financial Breakdown Table -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 28px; background-color: #ffffff;">
                            <tr>
                              <td style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                                <strong style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
                                  💳 CHI TIẾT TÀI CHÍNH & TIỀN CỌC
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Tổng giá trị dịch vụ:</td>
                                    <td align="right" style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 6px 0; font-size: 13px; color: #15803d; font-weight: 600;">
                                      Tiền cọc đã thanh toán (30%%):
                                    </td>
                                    <td align="right" style="padding: 6px 0; font-size: 15px; color: #15803d; font-weight: 800;">
                                      - %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" style="padding: 8px 0; border-bottom: 1.5px dashed #cbd5e1;"></td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 12px 0 4px 0; font-size: 14px; color: #0f172a; font-weight: 800;">
                                      Số tiền còn lại cần thanh toán:
                                    </td>
                                    <td align="right" style="padding: 12px 0 4px 0; font-size: 18px; color: #e11d48; font-weight: 900;">
                                      %s
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" style="font-size: 11px; color: #94a3b8; font-style: italic; padding-top: 4px;">
                                      * Số tiền còn lại sẽ được thanh toán cho chuyên viên (bằng tiền mặt hoặc ví ứng dụng) sau khi hoàn tất dịch vụ.
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center">
                                <a href="%s" style="background: linear-gradient(135deg, #7c3aed 0%%, #4f46e5 100%%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); letter-spacing: 0.3px;">
                                  Xem Chi Tiết Lịch Hẹn Trên Ứng Dụng &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                            Cảm ơn Quý khách & chúc bạn luôn rạng rỡ và tự tin tỏa sáng,<br>
                            <strong>Đội Ngũ MUA Makeup Platform</strong>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                          Email tự động được gửi từ hệ thống MUA Makeup Platform.<br>
                          Hotline hỗ trợ khách hàng 24/7: <strong style="color: #64748b;">1900 8888</strong> &bull; Email: <strong style="color: #64748b;">support@muamakeup.vn</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                clientName,
                bookingCode,
                bookingCode,
                dateStr,
                timeStr,
                muaName,
                rating,
                phone,
                phone,
                pkg,
                style,
                address,
                formattedTotal,
                formattedDeposit,
                formattedRemaining,
                trackingUrl
        );
    }
}
