package com.makeup.platform.service.chatbot.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.support.AiChatRequest;
import com.makeup.platform.dto.response.support.AiChatResponse;
import com.makeup.platform.dto.response.support.AiChatSessionHistoryResponse;
import com.makeup.platform.entity.auth.CustomerSavedAddressEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.interaction.AiChatMessageEntity;
import com.makeup.platform.entity.interaction.AiChatSessionEntity;
import com.makeup.platform.entity.interaction.AiKnowledgeDocumentEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.interaction.AiSupportMapper;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.CustomerSavedAddressRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.repository.interaction.AiChatMessageRepository;
import com.makeup.platform.repository.interaction.AiChatSessionRepository;
import com.makeup.platform.repository.interaction.ReviewRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.chatbot.AiSupportService;
import com.makeup.platform.service.chatbot.GeminiClientService;
import com.makeup.platform.service.chatbot.KnowledgeRetrievalService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSupportServiceImpl implements AiSupportService {

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final WalletRepository walletRepository;
    private final CustomerSavedAddressRepository customerSavedAddressRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final GeminiClientService geminiClientService;
    private final KnowledgeRetrievalService knowledgeRetrievalService;
    private final AiSupportMapper supportMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final ReviewRepository reviewRepository;
    private final AgencyStaffRepository agencyStaffRepository;

    private static final String CHAT_RECENT_KEY_PREFIX = "ai:chat:session:";
    private static final String CHAT_RECENT_KEY_SUFFIX = ":recent";
    private static final long CHAT_CACHE_TTL_HOURS = 24L;
    private static final int MAX_RECENT_MESSAGES = 10;

    private static final String SYSTEM_GUARDRAIL_PROMPT = """
            BẠN LÀ TRỢ LÝ CSKH CHUYÊN BIỆT CỦA NỀN TẢNG ĐẶT LỊCH MAKE-UP "MUA-MAKEUP".

            QUY TẮC BẮT BUỘC VÀ KHÔNG ĐƯỢC PHÉP VI PHẠM (STRICT GUARDRAIL):
            1. PHẠM VI TRẢ LỜI DUY NHẤT:
               - Bạn giải đáp các thắc mắc về nền tảng Mua-Makeup: Hướng dẫn sử dụng app, cách tìm kiếm thợ trang điểm (MUA), cách xem Portfolio.
                 + Quy trình Đặt lịch hẹn trước (Scheduled Booking) và Đặt lịch khẩn cấp 30 giây (Instant Emergency Booking).
                 + Quy trình Thanh toán 2 đợt: Đặt cọc 30% khi xác nhận lịch (tiền cọc giữ trong Quỹ Ký Quỹ Escrow an toàn, đơn Studio thì Studio ký quỹ cọc) và Thanh toán nốt 70% còn lại sau khi thợ hoàn tất make-up. Giải ngân tự động qua Sổ cái kép vào Ví Studio và hoa hồng cho Thợ.
                 + Hệ thống Đánh giá & Nhận xét (Reviews & Ratings): Khách hàng chấm sao (1-5 sao), viết nhận xét chi tiết và tải ảnh chụp thực tế sau khi ca hoàn thành; modal xem ảnh phóng to full màn hình; thợ và Studio có thể phản hồi đánh giá; phân cấp thợ chính chịu chất lượng và thợ phụ được bảo vệ điểm.
                 + Bảng xếp hạng (Leaderboard / BXH) & Gamification Huy hiệu: Xếp hạng thợ toàn sàn theo RankScore (Ca hoàn thành 45%, Điểm sao chuẩn Bayes 25%, Online sẵn sàng 30%), hệ thống Huy hiệu thợ (GOLD_TOP_PRO, SILVER, STANDARD), Bảng xếp hạng nhân sự nội bộ Studio (Staff Leaderboard theo doanh thu, ca hoàn thành, đánh giá 5 sao).
                 + Cơ chế Gia nhập Studio & Chuyển đổi vai trò linh hoạt: Thợ quét mã QR tuyển dụng hoặc nhập mã mời của Studio để nộp đơn (/join); Studio duyệt thì hệ thống tự động nâng cấp vai trò sang Thợ Studio (ROLE_AGENCY_STAFF) tức thời qua WebSocket realtime mà không cần đăng nhập lại; Bàn làm việc thợ studio, xem lịch ca trực (/staff/schedule), xin nghỉ phép, báo cáo tăng ca.
                 + Bảng giá Động (Dynamic Pricing) & Đồng bộ Hóa đơn Xem trước: Miễn phí di chuyển dưới 5km theo Goong Maps, phụ phí giờ cao điểm / sáng sớm rước dâu, ưu đãi Giờ Vàng giảm 10% buổi trưa (13:00 - 15:00), hóa đơn xem trước và giá tạo đơn khớp 100%.
                 + Theo dõi vị trí thợ di chuyển thời gian thực (Live GPS Tracking qua WebSocket STOMP).
                 + Chứng chỉ hành nghề: Thợ bắt buộc phải tải lên chứng chỉ nghề nghiệp và được Ban Quản Trị phê duyệt mới có thể bật trực tuyến nhận đơn.
                 + Chính sách Tiền cọc Escrow, nạp tiền vào ví, thanh toán qua MoMo, VNPay.
                 + Quy định Hủy lịch hẹn và Điều kiện hoàn tiền cọc (hoàn 100% trước 24h, trừ cọc trong 24h, phạt thợ khi thợ hủy).
                 + Quy trình Khiếu nại (Dispute), giải quyết tranh chấp chất lượng dịch vụ.
                 + Các Tone make-up (Cô dâu Á Đông, Hàn Quốc Glow, Tone Tây Glamour, Thái Lan, Kỷ yếu, Tiệc...).
                 + Quy định và quyền lợi dành cho Thợ tự do (Freelance MUA) và Studio/Đại lý (Agency).

               - ĐẶC BIỆT KHI KHÁCH HÀNG HỎI VỀ ĐƠN HÀNG HOẶC TÀI KHOẢN CỦA HỌ:
                 (Ví dụ: "Đơn hàng gần đây nhất của tôi là gì?", "Tôi có lịch hẹn nào sắp tới không?", "Mã đơn của tôi là gì?", "Số dư ví của tôi còn bao nhiêu?", "Thợ nào đang nhận đơn của tôi?"):
                 -> ĐÂY LÀ CÂU HỎI HỢP LỆ VÀ QUAN TRỌNG VỀ DỊCH VỤ CỦA MUA-MAKEUP.
                 -> BẠN HÃY SỬ DỤNG TRỰC TIẾP dữ liệu trong phần [THÔNG TIN TÀI KHOẢN VÀ LỊCH HẸN CỦA KHÁCH HÀNG ĐANG HỎI] ở dưới để trả lời cụ thể, chi tiết, thân thiện và chính xác cho khách hàng!
                 -> TUYỆT ĐỐI KHÔNG TỪ CHỐI câu hỏi tra cứu đơn hàng hoặc ví tiền khi đã có dữ liệu trong ngữ cảnh!
                 -> Nếu trong dữ liệu báo "Khách hàng hiện tại chưa có đơn đặt lịch nào", hãy nhẹ nhàng thông báo: "Dạ hiện tại anh/chị chưa có đơn đặt lịch nào trên hệ thống ạ. Anh/chị có muốn em hướng dẫn cách chọn thợ và đặt lịch không ạ?".
                 -> Nếu khách chưa đăng nhập, nhắc khách đăng nhập vào app để tra cứu.

            2. TUYỆT ĐỐI TỪ CHỐI CÂU HỎI NGOÀI PHẠM VI (QUAN TRỌNG):
               - Nếu người dùng hỏi bất kỳ câu hỏi nào KHÔNG thuộc phạm vi ứng dụng Mua-Makeup (ví dụ: thời tiết, nhiệt độ hôm nay, địa lý, toán học, tin tức xã hội, chính trị, viết code, nấu ăn, đố vui, dịch thuật câu từ tự do...):
               - BẠN BẮT BUỘC PHẢI TỪ CHỐI LỊCH SỰ theo đúng nội dung sau và KHÔNG ĐƯỢC GIẢI THÍCH THÊM VỀ CÂU HỎI ĐÓ:
                 "Dạ em là trợ lý ảo chuyên hỗ trợ thông tin và dịch vụ của Mua-Makeup. Em chỉ có thể hỗ trợ các thông tin liên quan đến ứng dụng, hướng dẫn đặt lịch và dịch vụ trang điểm trên Mua-Makeup thôi ạ. Anh/chị có thắc mắc gì về dịch vụ make-up cần em hỗ trợ không ạ?"

            3. PHONG CÁCH GIAO TIẾP VÀ ĐỊNH DẠNG TRẢ LỜI (BẮT BUỘC XUỐNG DÒNG THOÁNG ĐÃNG):
               - Luôn xưng "em", gọi khách là "anh/chị".
               - Giọng điệu niềm nở, nhã nhặn, chuẩn mực ngành dịch vụ làm đẹp cao cấp.
               - QUY TẮC NGẮT DÒNG & BỐ CỤC (TRÁNH VIẾT LIỀN TÙ TÌ DÀI THƯỜN THƯỢT):
                 + TUYỆT ĐỐI KHÔNG viết thành một khối văn bản dài dính liền nhau.
                 + Chia nhỏ câu trả lời thành từng đoạn ngắn (mỗi đoạn chỉ 2 - 3 câu), ngăn cách giữa các đoạn bằng một dòng trắng trống (xuống dòng 2 lần).
                 + Khi hướng dẫn các bước hoặc liệt kê chính sách, BẮT BUỘC dùng gạch đầu dòng (-) hoặc đánh số thứ tự (1., 2., 3.) và xuống dòng cho từng ý riêng biệt để người dùng dễ đọc trên giao diện điện thoại.

            [THÔNG TIN TÀI KHOẢN VÀ LỊCH HẸN CỦA KHÁCH HÀNG ĐANG HỎI]:
            {USER_CONTEXT}

            [NGỮ CẢNH TÀI LIỆU QUY CHUẨN ĐƯỢC TRÍCH XUẤT TỪ HỆ THỐNG]:
            {CONTEXT_DOCS}
            """;

    @Override
    public AiChatResponse chat(Long userId, AiChatRequest request) {
        String userQuery = request.getMessage().trim();

        // 1. Quản lý phiên hội thoại
        AiChatSessionEntity session = resolveOrCreateSession(request.getSessionCode(), userId);

        // 2. Lấy lịch sử hội thoại gần nhất (ưu tiên đọc Redis < 0.5ms, fallback DB Top 10)
        List<Map<String, String>> conversationHistory = getRecentHistoryFromRedisOrDb(session);

        // 3. Lưu tin nhắn của User vào DB
        AiChatMessageEntity userMessageEntity = AiChatMessageEntity.builder()
                .session(session)
                .role("USER")
                .content(userQuery)
                .build();
        messageRepository.save(userMessageEntity);

        // 4. Đồng bộ tin nhắn User vào Redis sliding window (TTL 24h, max 10 tin)
        appendMessageToRedis(session.getSessionCode(), "user", userQuery);

        // 5. RAG: Trích xuất các tài liệu liên quan nhất (top 5 cho câu hỏi chuyên sâu)
        List<AiKnowledgeDocumentEntity> relevantDocs = knowledgeRetrievalService.retrieveRelevantDocuments(userQuery, 5);
        String contextText = knowledgeRetrievalService.buildContextPrompt(relevantDocs);

        // 6. Lấy ngữ cảnh cá nhân hóa của User (Đơn hàng gần đây, ví tiền)
        String userContextText = buildUserContext(userId);

        String fullSystemInstruction = SYSTEM_GUARDRAIL_PROMPT
                .replace("{USER_CONTEXT}", userContextText)
                .replace("{CONTEXT_DOCS}", contextText);

        String aiReply = geminiClientService.generateContent(fullSystemInstruction, conversationHistory, userQuery);

        AiChatMessageEntity assistantMessageEntity = AiChatMessageEntity.builder()
                .session(session)
                .role("ASSISTANT")
                .content(aiReply)
                .build();
        messageRepository.save(assistantMessageEntity);

        // 10. Đồng bộ câu trả lời AI vào Redis sliding window (TTL 24h, max 10 tin)
        appendMessageToRedis(session.getSessionCode(), "model", aiReply);

        // 11. Cập nhật thời gian hoạt động cho session
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        List<String> topicTitles = relevantDocs.stream()
                .map(AiKnowledgeDocumentEntity::getTitle)
                .collect(Collectors.toList());

        return AiChatResponse.builder()
                .sessionCode(session.getSessionCode())
                .reply(aiReply)
                .role("ASSISTANT")
                .timestamp(LocalDateTime.now())
                .relevantTopics(topicTitles)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AiChatSessionHistoryResponse getSessionHistory(String sessionCode) {
        if (sessionCode == null || sessionCode.trim().isEmpty()) {
            throw new CustomBusinessException(ErrorCodes.ERR_VALIDATION, "support.session_code_required");
        }

        AiChatSessionEntity session = sessionRepository.findBySessionCode(sessionCode)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_SUPPORT_SESSION_NOT_FOUND, "support.session_not_found"));

        List<AiChatMessageEntity> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
        return supportMapper.toSessionHistoryResponse(session, messages);
    }

    @Override
    public void closeSession(String sessionCode, Long userId) {
        // 1. Đóng phiên theo sessionCode cụ thể (khi khách bấm tạo cuộc trò chuyện mới)
        if (sessionCode != null && !sessionCode.trim().isEmpty()) {
            String cacheKey = buildSessionCacheKey(sessionCode);
            try {
                Boolean deleted = stringRedisTemplate.delete(cacheKey);
                log.info("Closed chat session cache {}: deleted={}", sessionCode, deleted);
            } catch (Exception ex) {
                log.warn("Failed to delete chat history from Redis for session {}: {}", sessionCode, ex.getMessage());
            }
        }

        // 2. Đóng toàn bộ phiên của người dùng (khi logout hoặc dọn dẹp tài khoản)
        if (userId != null) {
            try {
                List<AiChatSessionEntity> sessions = sessionRepository.findByUserId(userId);
                if (sessions != null && !sessions.isEmpty()) {
                    for (AiChatSessionEntity s : sessions) {
                        String userSessionCacheKey = buildSessionCacheKey(s.getSessionCode());
                        stringRedisTemplate.delete(userSessionCacheKey);
                    }
                    log.info("Closed {} chat session caches for userId: {}", sessions.size(), userId);
                }
            } catch (Exception ex) {
                log.warn("Failed to close chat sessions for userId {}: {}", userId, ex.getMessage());
            }
        }
    }

    private String buildSessionCacheKey(String sessionCode) {
        return CHAT_RECENT_KEY_PREFIX + sessionCode.trim() + CHAT_RECENT_KEY_SUFFIX;
    }

    private List<Map<String, String>> getRecentHistoryFromRedisOrDb(AiChatSessionEntity session) {
        String cacheKey = buildSessionCacheKey(session.getSessionCode());
        try {
            List<String> rawList = stringRedisTemplate.opsForList().range(cacheKey, 0, -1);
            if (rawList != null && !rawList.isEmpty()) {
                List<Map<String, String>> history = new ArrayList<>(rawList.size());
                for (String itemJson : rawList) {
                    Map<String, String> item = objectMapper.readValue(itemJson, new TypeReference<Map<String, String>>() {});
                    history.add(item);
                }
                return history;
            }
        } catch (Exception ex) {
            log.warn("Failed to read chat history from Redis for session {}: {}", session.getSessionCode(), ex.getMessage());
        }

        // Cache miss: Truy vấn tối đa 10 tin nhắn gần nhất từ DB (dùng composite index session_id, created_at)
        List<AiChatMessageEntity> recentDesc = messageRepository.findTop10BySessionIdOrderByCreatedAtDesc(session.getId());
        if (recentDesc == null || recentDesc.isEmpty()) {
            return new ArrayList<>();
        }

        // Đảo ngược lại theo thứ tự thời gian tăng dần để nạp vào prompt Gemini
        List<AiChatMessageEntity> chronological = new ArrayList<>(recentDesc);
        Collections.reverse(chronological);

        List<Map<String, String>> history = new ArrayList<>(chronological.size());
        for (AiChatMessageEntity msg : chronological) {
            Map<String, String> item = new HashMap<>();
            item.put("role", "USER".equalsIgnoreCase(msg.getRole()) ? "user" : "model");
            item.put("content", msg.getContent());
            history.add(item);
        }

        // Nạp nóng vào Redis cho các lượt chat tiếp theo
        warmRedisRecentHistory(session.getSessionCode(), history);
        return history;
    }

    private void warmRedisRecentHistory(String sessionCode, List<Map<String, String>> history) {
        if (history == null || history.isEmpty()) {
            return;
        }
        String cacheKey = buildSessionCacheKey(sessionCode);
        try {
            stringRedisTemplate.delete(cacheKey);
            List<String> jsonItems = new ArrayList<>(history.size());
            for (Map<String, String> item : history) {
                jsonItems.add(objectMapper.writeValueAsString(item));
            }
            stringRedisTemplate.opsForList().rightPushAll(cacheKey, jsonItems);
            stringRedisTemplate.expire(cacheKey, CHAT_CACHE_TTL_HOURS, TimeUnit.HOURS);
        } catch (Exception ex) {
            log.warn("Failed to warm chat history to Redis for session {}: {}", sessionCode, ex.getMessage());
        }
    }

    private void appendMessageToRedis(String sessionCode, String role, String content) {
        String cacheKey = buildSessionCacheKey(sessionCode);
        try {
            Map<String, String> item = Map.of("role", role, "content", content);
            String json = objectMapper.writeValueAsString(item);
            stringRedisTemplate.opsForList().rightPush(cacheKey, json);
            stringRedisTemplate.opsForList().trim(cacheKey, -MAX_RECENT_MESSAGES, -1);
            stringRedisTemplate.expire(cacheKey, CHAT_CACHE_TTL_HOURS, TimeUnit.HOURS);
        } catch (Exception ex) {
            log.warn("Failed to append chat message to Redis for session {}: {}", sessionCode, ex.getMessage());
        }
    }

    private AiChatSessionEntity resolveOrCreateSession(String sessionCode, Long userId) {
        if (sessionCode != null && !sessionCode.trim().isEmpty()) {
            var existingSession = sessionRepository.findBySessionCode(sessionCode.trim());
            if (existingSession.isPresent()) {
                AiChatSessionEntity session = existingSession.get();
                if (session.getUser() == null && userId != null) {
                    userRepository.findById(userId).ifPresent(session::setUser);
                    return sessionRepository.save(session);
                }
                return session;
            }
        }

        UserEntity user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        String newCode = "CHAT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        AiChatSessionEntity newSession = AiChatSessionEntity.builder()
                .sessionCode(newCode)
                .user(user)
                .build();

        return sessionRepository.save(newSession);
    }

    private String buildUserContext(Long userId) {
        if (userId == null) {
            return "Khách hàng hiện tại chưa đăng nhập (Khách vãng lai). Nếu khách hỏi về đơn hàng, lịch hẹn, địa chỉ đã lưu hoặc số dư ví cá nhân, hãy lịch sự nhắc khách đăng nhập vào tài khoản trên app để tra cứu chính xác.";
        }

        StringBuilder sb = new StringBuilder();
        UserEntity user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return "Không tìm thấy thông tin tài khoản người dùng.";
        }

        String roleName = user.getRole() != null ? user.getRole().getName() : "ROLE_CUSTOMER";
        sb.append("- Tên người dùng: ").append(user.getFullName() != null ? user.getFullName() : "Khách hàng").append("\n");
        sb.append("- Số điện thoại: ").append(user.getPhoneNumber() != null ? user.getPhoneNumber() : "Chưa cập nhật").append("\n");
        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            sb.append("- Email: ").append(user.getEmail()).append("\n");
        }
        sb.append("- Vai trò trên app: ").append(roleName).append("\n");

        // 1. Tra cứu số dư ví
        walletRepository.findByUserId(userId).ifPresentOrElse(wallet -> {
            sb.append("- Số dư ví khả dụng: ")
              .append(wallet.getAvailableBalance() != null ? wallet.getAvailableBalance().toPlainString() : "0")
              .append(" VNĐ\n");
            if (wallet.getFrozenBalance() != null && wallet.getFrozenBalance().compareTo(BigDecimal.ZERO) > 0) {
                sb.append("- Tiền đang giữ cọc Escrow trong ví: ")
                  .append(wallet.getFrozenBalance().toPlainString())
                  .append(" VNĐ\n");
            }
        }, () -> {
            sb.append("- Số dư ví: Chưa kích hoạt ví hoặc 0 VNĐ\n");
        });

        // 2. Tra cứu Sổ địa chỉ thân quen của khách hàng
        try {
            List<CustomerSavedAddressEntity> savedAddresses = customerSavedAddressRepository
                    .findByUserIdAndIsDeletedFalseOrderByIsDefaultDescCreatedAtDesc(userId);
            if (savedAddresses != null && !savedAddresses.isEmpty()) {
                sb.append("- Sổ địa chỉ đã lưu của khách hàng:\n");
                int addrLimit = Math.min(3, savedAddresses.size());
                for (int a = 0; a < addrLimit; a++) {
                    CustomerSavedAddressEntity addr = savedAddresses.get(a);
                    sb.append("  + [").append(addr.getLabel()).append(Boolean.TRUE.equals(addr.getIsDefault()) ? " - Mặc định" : "")
                      .append("]: ").append(addr.getAddressLine() != null ? addr.getAddressLine() : "")
                      .append("\n");
                }
            }
        } catch (Exception ex) {
            log.debug("Unable to load saved addresses for user {}: {}", userId, ex.getMessage());
        }

        // 3. Tra cứu Đơn đặt lịch của Khách hàng
        List<BookingEntity> customerBookings = bookingRepository.findByCustomerIdOrderByCreatedAtDesc(userId);
        if (customerBookings != null && !customerBookings.isEmpty()) {
            sb.append("- Danh sách các đơn đặt lịch của khách hàng (Tối đa 5 đơn mới nhất):\n");
            int limit = Math.min(5, customerBookings.size());
            for (int i = 0; i < limit; i++) {
                BookingEntity b = customerBookings.get(i);
                String packageName = (b.getServicePackage() != null && b.getServicePackage().getPackageName() != null)
                        ? b.getServicePackage().getPackageName()
                        : ((b.getStyle() != null && b.getStyle().getStyleName() != null) ? b.getStyle().getStyleName() : "Dịch vụ trang điểm");

                String muaName = (b.getMua() != null && b.getMua().getUser() != null)
                        ? b.getMua().getUser().getFullName()
                        : ((b.getAgency() != null && b.getAgency().getAgencyName() != null) ? b.getAgency().getAgencyName() : "Hệ thống đang điều phối");

                boolean hasReviewed = reviewRepository.existsByBookingId(b.getId());
                sb.append("  + Đơn ").append(i + 1).append(": Mã đơn [").append(b.getBookingCode() != null ? b.getBookingCode() : "N/A").append("]")
                  .append(" | Trạng thái: [").append(b.getStatus() != null ? b.getStatus().name() : "N/A").append("]")
                  .append(" | Gói: [").append(packageName).append("]")
                  .append(" | Hẹn lúc: [")
                  .append(b.getStartTime() != null ? b.getStartTime().toString() : "")
                  .append(" ngày ")
                  .append(b.getBookingDate() != null ? b.getBookingDate().toString() : "")
                  .append("]")
                  .append(" | Người thực hiện: [").append(muaName).append("]")
                  .append(" | Tổng tiền: [").append(b.getTotalAmount() != null ? b.getTotalAmount().toPlainString() : "0").append(" VNĐ]")
                  .append(" | Tiền cọc: [").append(b.getDepositAmount() != null ? b.getDepositAmount().toPlainString() : "0").append(" VNĐ]")
                  .append(" | Đánh giá: [").append(hasReviewed ? "Đã đánh giá" : "Chưa đánh giá").append("]")
                  .append(" | Địa chỉ: [").append(b.getDestinationAddress() != null ? b.getDestinationAddress() : "Tại nhà khách").append("]\n");
            }
        } else {
            sb.append("- Đơn đặt lịch: Khách hàng hiện tại CHƯA CÓ đơn đặt lịch nào trên hệ thống.\n");
        }

        // 4. Nếu người dùng là Thợ MUA, bổ sung thông tin hồ sơ và ca làm việc của thợ
        try {
            muaProfileRepository.findByUserId(userId).ifPresent(mua -> {
                sb.append("- THÔNG TIN HỒ SƠ THỢ TRANG ĐIỂM (MUA):\n");
                sb.append("  + Mã thợ: ").append(mua.getMuaCode() != null ? mua.getMuaCode() : "N/A").append("\n");
                sb.append("  + Kinh nghiệm: ").append(mua.getExperienceYears() != null ? mua.getExperienceYears() : 1).append(" năm\n");
                sb.append("  + Đánh giá trung bình: ").append(mua.getRatingAvg() != null ? mua.getRatingAvg().toPlainString() + "★" : "Chưa có đánh giá").append("\n");
                sb.append("  + Tổng lượt đánh giá: ").append(mua.getTotalReviews() != null ? mua.getTotalReviews() : 0).append(" lượt\n");
                sb.append("  + Tổng ca hoàn thành: ").append(mua.getTotalCompletedJobs() != null ? mua.getTotalCompletedJobs() : 0).append(" ca\n");
                sb.append("  + Huy hiệu Gamification: ").append(mua.getBadgeTier() != null ? mua.getBadgeTier().name() : "STANDARD").append("\n");
                sb.append("  + Điểm xếp hạng BXH (RankScore): ").append(mua.getRankScore() != null ? mua.getRankScore().toPlainString() : "0").append("\n");
                sb.append("  + Bán kính nhận khách tối đa: ").append(mua.getMaxServiceRadiusKm() != null ? mua.getMaxServiceRadiusKm().toPlainString() : "15").append(" km\n");
                sb.append("  + Trạng thái trực tuyến: ").append(Boolean.TRUE.equals(mua.getIsOnline()) ? "Đang Online (Sẵn sàng nhận ca)" : "Offline").append("\n");
                sb.append("  + Trạng thái làm việc: ").append(Boolean.TRUE.equals(mua.getIsBusy()) ? "Đang bận làm ca" : "Đang rảnh").append("\n");

                List<BookingEntity> muaJobs = bookingRepository.findByMuaIdOrderByCreatedAtDesc(mua.getId());
                if (muaJobs != null && !muaJobs.isEmpty()) {
                    sb.append("  + Các ca hẹn thợ đã nhận (Tối đa 3 ca gần nhất):\n");
                    int jobLimit = Math.min(3, muaJobs.size());
                    for (int j = 0; j < jobLimit; j++) {
                        BookingEntity job = muaJobs.get(j);
                        String custName = job.getCustomer() != null ? job.getCustomer().getFullName() : "Khách hàng";
                        sb.append("    * Ca ").append(j + 1).append(": Mã [").append(job.getBookingCode()).append("]")
                          .append(" | Trạng thái: [").append(job.getStatus() != null ? job.getStatus().name() : "N/A").append("]")
                          .append(" | Khách hàng: [").append(custName).append("]")
                          .append(" | Giờ hẹn: [").append(job.getStartTime()).append(" ngày ").append(job.getBookingDate()).append("]")
                          .append(" | Địa chỉ đến làm: [").append(job.getDestinationAddress() != null ? job.getDestinationAddress() : "").append("]\n");
                    }
                }
            });
        } catch (Exception ex) {
            log.debug("Unable to load MUA profile for user {}: {}", userId, ex.getMessage());
        }

        // 5. Nếu người dùng là Nhân sự Studio (Agency Staff)
        try {
            agencyStaffRepository.findActiveStaffByUserId(userId).ifPresent(staff -> {
                sb.append("- THÔNG TIN NHÂN SỰ STUDIO (AGENCY STAFF):\n");
                sb.append("  + Thuộc Studio: ").append(staff.getAgency() != null ? staff.getAgency().getAgencyName() : "N/A").append("\n");
                sb.append("  + Tỷ lệ hoa hồng thỏa thuận: ").append(staff.getAgreedCommissionRate() != null ? staff.getAgreedCommissionRate().toPlainString() + "%" : "Theo quy định").append("\n");
                sb.append("  + Trạng thái nhân sự: ").append(staff.getStatus() != null ? staff.getStatus() : "ACTIVE").append("\n");
                sb.append("  + Quản lý lịch ca trực tại: Lịch Làm Việc (/staff/schedule)\n");
            });
        } catch (Exception ex) {
            log.debug("Unable to load Agency Staff info for user {}: {}", userId, ex.getMessage());
        }

        return sb.toString();
    }

}
