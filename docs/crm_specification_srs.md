# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM — PHÂN HỆ BEAUTY CRM & CHĂM SÓC KHÁCH HÀNG
## HỆ THỐNG NỀN TẢNG ĐẶT LỊCH MAKE-UP (MUA-MAKEUP PLATFORM)
**Tiêu chuẩn áp dụng**: ISO/IEC/IEEE 29148:2018 Systems and software engineering — Requirements engineering  
**Phiên bản tài liệu**: 1.0.0  
**Trạng thái**: Bản thảo thiết kế hệ thống (Approved Draft)  
**Tác giả**: Engineering Team & AI Solution Architect  

---

## 1. TỔNG QUAN HỆ THỐNG VÀ BỐI CẢNH NGHIỆP VỤ (SYSTEM OVERVIEW & SCOPE)

### 1.1. Bối cảnh Nghiệp vụ Ngành Làm Đẹp (Beauty Domain Context)
Nền tảng Đặt lịch Make-up (**Mua-Makeup Platform**) hoạt động theo mô hình thị trường đa bên (Multi-sided Platform) kết nối Khách hàng cá nhân (`ROLE_CUSTOMER`), Thợ trang điểm tự do (`ROLE_FREELANCE_MUA`), Đại lý/Studio làm đẹp (`ROLE_AGENCY_ADMIN` & `ROLE_AGENCY_STAFF`) và Ban Quản Trị Sàn (`ROLE_SUPER_ADMIN`).

> [!IMPORTANT]
> **PHẠM VI ÁP DỤNG ĐỘC QUYỀN (EXCLUSIVE STUDIO SCOPE)**:
> Phân hệ Beauty CRM được thiết kế và triển khai **ĐỘC QUYỀN DÀNH CHO STUDIO / ĐẠI LÝ (`ROLE_AGENCY_ADMIN` và Kỹ thuật viên thuộc Studio `ROLE_AGENCY_STAFF`)**. Phân hệ này **TUYỆT ĐỐI KHÔNG ÁP DỤNG CHO THỢ TỰ DO (`ROLE_FREELANCE_MUA`)**.
> - Thợ tự do không sở hữu danh bạ CRM, không có quyền quản lý tệp khách hàng cá nhân hóa, không có bảng xếp hạng RFM hay công cụ tiếp thị/voucher riêng.
> - Toàn bộ dữ liệu khách hàng CRM, ghi chú cơ địa và sổ tay ca làm đều thuộc quyền sở hữu tập trung của Studio (`agency_id`).

Ngành dịch vụ trang điểm có các đặc thù mang tính quyết định:
1. **Giá trị đơn hàng và kỳ vọng cảm xúc cao**: Các gói make-up cô dâu, tiệc lớn, kỷ yếu, sự kiện có chi phí dao động từ vài trăm nghìn đến nhiều triệu đồng; khách hàng đòi hỏi sự an tâm tuyệt đối và phong cách phù hợp.
2. **Tính cá nhân hóa sâu sắc (Personalized Beauty Persona)**: Mỗi khách hàng sở hữu đặc tính cơ địa sinh học khác nhau (loại da, tone da, tình trạng mụn/khô/dầu) và gu thẩm mỹ đặc thù (Douyin, Hàn Quốc trong veo, Tây Âu sắc sảo). Đặc biệt, thành phần kích ứng mỹ phẩm (dị ứng keo mi, dị ứng mỹ phẩm chứa cồn/hương liệu) là thông tin sinh học bắt buộc phải kiểm soát chặt chẽ.
3. **Giá trị vòng đời khách hàng (Customer Lifetime Value - LTV) theo mùa vụ**: Nhu cầu làm đẹp có tính chu kỳ cao (mùa cưới tháng 10-12, mùa kỷ yếu tháng 4-5, tiệc tất niên, sinh nhật, sự kiện gia đình). Khách hàng tìm được Studio ưng ý có tỷ lệ tái đặt lịch (Retention Rate) trên 70%.

### 1.2. Mục tiêu Phân hệ Beauty CRM (CRM Objectives)
- **Tập trung hóa dữ liệu Khách hàng 360 độ của Studio (Studio Customer 360 View)**: Tự động hợp nhất lịch sử đơn hàng, thói quen chi tiêu, thợ yêu thích và ghi chú dị ứng/da vào một màn hình duy nhất cho Studio.
- **Tăng tỷ lệ tái đặt lịch cho Studio (Studio Retention Rate Optimization)**: Tự động hóa nhắc lịch định kỳ, chúc mừng sinh nhật, gửi voucher giữ chân khách hàng có nguy cơ rời bỏ (Churn Risk).
- **Hỗ trợ Kỹ thuật viên Studio nắm bắt lưu ý (Quick Service Note)**: Hiển thị nhanh các cảnh báo dị ứng hoặc lưu ý đặc biệt (nếu có) của khách trên màn hình ca làm, không làm phiền quy trình thao tác của thợ.
- **Trao quyền quản trị khách hàng toàn diện cho Studio (Agency Client Retention)**: Bảng quản trị tệp khách hàng thân thiết, tự động phân nhóm RFM (Recency - Frequency - Monetary), cơ chế chỉ định thợ ruột (`preferred_staff`) và quản lý danh sách đen.

### 1.3. Chiến Lược Dữ Liệu Tự Động Hóa & Tối Giản (Zero-Friction & Transaction-Driven Data Strategy)
Nhằm giải quyết triệt để rào cản thực tế: **Khách hàng ngại điền thông tin rườm rà** và **Thợ trang điểm không thể ngồi gõ báo cáo chi tiết sau ca làm**, phân hệ CRM áp dụng nguyên tắc thiết kế **Zero-Friction (Không phiền khách - Không ép thợ)**:

```
+-----------------------------------------------------------------------------------------------------+
|                             NGUỒN DỮ LIỆU CRM ĐƯỢC HÌNH THÀNH NHƯ THẾ NÀO?                          |
+-----------------------------------------------------------------------------------------------------+
|  1. TỰ ĐỘNG TỔNG HỢP TỪ GIAO DỊCH (CHIẾM 90% DỮ LIỆU CRM - HOÀN TOÀN TỰ ĐỘNG, KHÔNG AI PHẢI ĐIỀN):   |
|     - Tên, SĐT, Avatar: Lấy trực tiếp từ tài khoản người dùng có sẵn (auth_schema.users).           |
|     - Tổng chi tiêu (LTV), Số lần làm, Ca gần nhất: Hệ thống tự động tính khi đơn hoàn tất.         |
|     - Phân hạng RFM (VIP, Thân thiết, Khách mới, Nguy cơ): Cronjob tự động phân nhóm mỗi đêm.       |
|     - Gu phong cách / Dịch vụ hay làm: Tự thống kê từ các gói/style khách từng đặt tại Studio.      |
|     - Thợ ruột (Preferred Staff): Tự động đếm thợ nào của Studio phục vụ khách nhiều nhất & 5 sao. |
|     - Lịch sử đánh giá: Tự động liên kết từ các lượt rating/review sau mỗi đơn hàng.                |
|                                                                                                     |
|  2. PHÍA KHÁCH HÀNG (SIÊU TỐI GIẢN - KHÔNG BẮT ĐIỀN KHẢO SÁT):                                      |
|     - Tuyệt đối KHÔNG có form khảo sát cơ địa, dáng mắt, dáng mày hay tone da phức tạp.            |
|     - Khách chỉ có DUY NHẤT 1 ô tùy chọn khi đặt lịch: "Lưu ý cho Studio / Dị ứng da" (nếu có).     |
|     - Ngày sinh (Tùy chọn): Khách chỉ cần nhập 1 lần nếu muốn nhận voucher quà sinh nhật.           |
|                                                                                                     |
|  3. PHÍA THỢ STUDIO (KHÔNG ÉP THỢ LÀM BÁO CÁO - 1 CHẠM LÀ XONG):                                    |
|     - Tuyệt đối KHÔNG bắt thợ ghi mã kem nền, mã son, công thức phối màu hay viết báo cáo dài.     |
|     - Sau ca làm, thợ chỉ cần bấm "Hoàn tất ca làm".                                                |
|     - Có 1 ô tùy chọn ngắn: "Ghi chú nhanh cho Studio" (VD: "Khách da dầu, thích kẻ mày nhạt")      |
|       và 1 ảnh hoàn thiện (tùy chọn). Thợ có thể để trống và bấm Hoàn thành ngay lập tức!           |
+-----------------------------------------------------------------------------------------------------+
```

---

## 2. KIẾN TRÚC KỸ THUẬT VÀ TÍCH HỢP HỆ THỐNG (TECHNICAL ARCHITECTURE)

Hệ thống CRM tuân thủ nghiêm ngặt chuẩn kiến trúc của toàn dự án:
- **Backend**: Spring Boot 3.3.4 (Java 17), Modular Monolith, Layered Architecture (`controller -> service -> repository -> entity`), DTO/Manual Mapper (`@Component`).
- **Cơ sở dữ liệu**: PostgreSQL 16 + PostGIS, phân vùng dữ liệu trong `interaction_schema` và `agency_schema` liên kết với `auth_schema` và `booking_schema`.
- **Frontend Portal**: React 18.2 + Vite 5 + TailwindCSS + Zustand 4 + Zod validation.
- **Mobile Client**: Expo 54 + React Native 0.76 + TypeScript + Zustand 5.
- **Realtime & Automation**: Spring WebSocket STOMP (`/ws-makeup`), Spring In-Memory EventBus (`ApplicationEventPublisher`), Redis 7 Cache & Distributed Lock (Redisson), Spring Task Scheduler.

```
+-----------------------------------------------------------------------------------+
|                            MUA-MAKEUP PLATFORM CRM ARCHITECTURE                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ MOBILE CLIENT - REACT NATIVE ]                   [ WEB PORTAL - REACT + VITE ] |
|  - Khách: Beauty 360 Profile                        - Studio: CRM Directory & RFM |
|  - Thợ Studio: Xem lưu ý & Note sau ca              - Admin: Retention Analytics  |
|                         \                                  /                      |
|                          \                                /                       |
|                   HTTP REST (JSON) + WebSocket STOMP (/ws-makeup)                 |
|                                     │                                             |
|                                     ▼                                             |
|  +-----------------------------------------------------------------------------+  |
|  |                     CORE-API (SPRING BOOT MONOLITH)                         |  |
|  |                                                                             |  |
|  |  +-------------------------+  +------------------------------------------+  |  |
|  |  |   CONTROLLER LAYER      |  |           SERVICE LAYER                  |  |  |
|  |  |  - CustomerBeautyProfile|  |  - BeautyProfileService                  |  |  |
|  |  |  - AgencyCrmController  |  |  - AgencyCrmService (RFM Calculation)    |  |  |
|  |  |  - CrmAutomationControl|  |  - CrmAutomationScheduler (Daily 02:00)  |  |  |
|  |  +-------------------------+  +------------------------------------------+  |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                      SPRING IN-MEMORY EVENTBUS                        |  |  |
|  |  |  - BookingCompletedEvent -> Update RFM & Trigger Post-Care            |  |  |
|  |  |  - ReviewSubmittedEvent  -> Log CSAT & Alert Low Satisfaction       |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +--------------------------------------┬--------------------------------------+  |
|                                         │                                         |
|                                         ▼                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                    DATABASE: MAKEUP_PLATFORM_DB (POSTGRESQL 16)             |  |
|  |                                                                             |  |
|  |  [auth_schema]        [booking_schema]         [interaction_schema]         |  |
|  |  - users              - bookings               - customer_beauty_profiles   |  |
|  |                       - booking_items          - customer_care_notes        |  |
|  |                                                - agency_customer_relations  |  |
|  |                                                - crm_automated_logs         |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. MÔ HÌNH DỮ LIỆU CSDL CRM (POSTGRESQL SCHEMA DESIGN)

Toàn bộ thực thể CRM kế thừa `BaseEntity` (chứa `id BIGSERIAL`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`).

### 3.1. Bảng `interaction_schema.customer_beauty_profiles`
Lưu trữ thông tin lưu ý cơ địa & dị ứng tối giản của khách hàng (chỉ cập nhật khi khách chủ động ghi chú khi book hoặc trong trang cá nhân).
```sql
CREATE TABLE IF NOT EXISTS interaction_schema.customer_beauty_profiles (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL UNIQUE REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    skin_type VARCHAR(50), -- DRY (da khô), OILY (da dầu), SENSITIVE (nhạy cảm), COMBINATION (hỗn hợp), NORMAL (thường) - Tùy chọn
    allergy_notes TEXT, -- Ghi chú dị ứng ngắn: "Dị ứng keo dán mi Latex, mỹ phẩm có cồn" - Tùy chọn
    general_note TEXT, -- Lưu ý chung ngắn gọn của khách (nếu có)
    is_shared_with_studio BOOLEAN DEFAULT TRUE, -- Quyền chia sẻ cho Studio phục vụ ca
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_beauty_profile_customer ON interaction_schema.customer_beauty_profiles(customer_id);
```

### 3.2. Bảng `interaction_schema.customer_care_notes`
Ghi chú nhanh nội bộ của Studio sau ca làm (hoàn toàn tùy chọn, không bắt buộc thợ phải điền).
```sql
CREATE TABLE IF NOT EXISTS interaction_schema.customer_care_notes (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES booking_schema.bookings(id) ON DELETE SET NULL,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE, -- Thuộc về Studio
    quick_note TEXT, -- Ghi chú ngắn 1 câu tùy chọn của thợ (Ví dụ: "Khách da dầu, thích tone hồng đất, kỹ chân mày")
    result_photo_url VARCHAR(500), -- Ảnh tác phẩm sau make (tùy chọn, phục vụ portfolio hoặc đối soát)
    is_agency_shared BOOLEAN DEFAULT TRUE, -- Cho phép các thợ khác cùng Studio xem để phục vụ tốt hơn
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_care_notes_customer ON interaction_schema.customer_care_notes(customer_id);
CREATE INDEX idx_care_notes_agency ON interaction_schema.customer_care_notes(agency_id);
```

### 3.3. Bảng `agency_schema.agency_customer_relations`
Quản trị tệp khách hàng riêng của từng Studio, tự động tính toán phân hạng RFM và gán thợ ruột.
```sql
CREATE TABLE IF NOT EXISTS agency_schema.agency_customer_relations (
    id BIGSERIAL PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    customer_rank VARCHAR(30) DEFAULT 'NEW', -- NEW (mới), REGULAR (thân thiết), VIP (khách VIP), AT_RISK (nguy cơ rời bỏ), LOST (mất khách)
    total_completed_bookings INT DEFAULT 0 NOT NULL,
    total_spent_amount NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
    last_booking_date TIMESTAMPTZ,
    first_booking_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    preferred_staff_id BIGINT REFERENCES agency_schema.agency_staff(id) ON DELETE SET NULL, -- Thợ ruột được khách tin cậy nhất
    notes_summary TEXT, -- Tóm tắt lưu ý của Studio cho khách này
    loyalty_points INT DEFAULT 0, -- Điểm tích lũy tại riêng Studio
    is_blacklisted BOOLEAN DEFAULT FALSE, -- Cảnh báo quỵt tiền / no-show nhiều lần
    blacklist_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_agency_customer UNIQUE (agency_id, customer_id)
);

CREATE INDEX idx_agency_customer_rank ON agency_schema.agency_customer_relations(agency_id, customer_rank);
CREATE INDEX idx_agency_customer_spent ON agency_schema.agency_customer_relations(agency_id, total_spent_amount DESC);
```

### 3.4. Bảng `interaction_schema.crm_automated_logs`
Nhật ký các tin nhắn, thông báo, voucher tự động gửi từ hệ thống CRM.
```sql
CREATE TABLE IF NOT EXISTS interaction_schema.crm_automated_logs (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    agency_id BIGINT REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    campaign_type VARCHAR(50) NOT NULL, -- BIRTHDAY_GREETING, RE_ENGAGEMENT_60D, SEASONAL_WEDDING, POST_SERVICE_CARE, DISPUTE_COMPENSATION_CARE
    channel VARCHAR(30) DEFAULT 'IN_APP_PUSH', -- IN_APP_PUSH, WEBSOCKET, SMS, EMAIL
    title VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    discount_code VARCHAR(50), -- Mã voucher ưu đãi đính kèm (nếu có)
    is_opened BOOLEAN DEFAULT FALSE,
    opened_at TIMESTAMPTZ,
    is_converted BOOLEAN DEFAULT FALSE, -- Khách có phát sinh booking mới trong vòng 7 ngày sau thông báo không
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_crm_logs_customer ON interaction_schema.crm_automated_logs(customer_id);
CREATE INDEX idx_crm_logs_campaign ON interaction_schema.crm_automated_logs(campaign_type);
```

---

## 4. ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FR)

### 4.1. Phân hệ 1: Hồ Sơ Làm Đẹp Cá Nhân Khách Hàng (Beauty 360 Profile)

| Mã yêu cầu | Tên chức năng | Đối tượng | Mô tả chi tiết nghiệp vụ | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-CRM-101** | Lưu ý Cơ địa / Dị ứng Tối giản | `ROLE_CUSTOMER` | Khách hàng có thể lưu nhanh loại da cơ bản và ghi chú dị ứng mỹ phẩm (Tùy chọn, không bắt buộc). Khách cũng có thể nhập nhanh vào ô "Lưu ý cho thợ" khi đặt đơn. | - Chỉ gồm 1 hàng chọn nhanh loại da (Dầu, Khô, Nhạy cảm, Thường) và 1 ô text ngắn "Lưu ý dị ứng".<br>- Khách không điền thì hệ thống vẫn cho phép đặt lịch bình thường. |
| **FR-CRM-102** | Tự động hiển thị lưu ý cho Studio | Hệ thống Backend | Khi đơn hàng chuyển sang `ACCEPTED`, Backend tự động trích xuất ghi chú dị ứng (nếu có) và lịch sử gói dịch vụ khách hay đặt tại Studio để gửi cho nhân sự phụ trách ca. | - Nếu khách có ghi chú dị ứng, hiển thị nhãn cảnh báo nổi bật.<br>- Không lộ thông tin cá nhân nhạy cảm của khách. |
| **FR-CRM-103** | Khách xem Nhật ký Ảnh hoàn thiện tại Studio | `ROLE_CUSTOMER` | Khách hàng có thể xem lại ảnh tác phẩm trang điểm hoàn thiện từ các ca trước đã thực hiện tại Studio (nếu thợ có đăng tải). | - Hiển thị ảnh hoàn thiện kèm ngày thực hiện và tên kỹ thuật viên Studio.<br>- Giao diện dạng lưới ảnh nhẹ nhàng. |

### 4.2. Phân hệ 2: Ghi Chú Nhanh Ca Làm Cho Thợ Studio (Studio Staff Quick Notes)

| Mã yêu cầu | Tên chức năng | Đối tượng | Mô tả chi tiết nghiệp vụ | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-CRM-201** | Thẻ Nhắc Cảnh Báo Dị Ứng trên Ca Làm | `ROLE_AGENCY_STAFF` | Tại màn hình tiến trình ca làm của Studio (`job-execution/[id]`), chỉ hiển thị thẻ cảnh báo nảy lên NẾU khách có ghi chú dị ứng (Ví dụ: `⚠️ Khách dị ứng keo mi`). | - Nếu khách không có dị ứng, thẻ thu gọn tự động, không chiếm diện tích màn hình ca làm.<br>- Giúp thợ nắm bắt tức thì thông tin quan trọng nhất mà không phải đọc nhiều. |
| **FR-CRM-202** | Ghi Chú Nhanh Tùy Chọn Sau Ca Làm | `ROLE_AGENCY_STAFF`, `ROLE_AGENCY_ADMIN` | Khi bấm "Hoàn tất ca làm", thợ có thể gõ 1 dòng ghi chú ngắn (Tùy chọn) và đính kèm 1 ảnh tác phẩm (Tùy chọn). | - **Tuyệt đối KHÔNG bắt buộc**: Thợ có thể bấm "Xác nhận hoàn thành" ngay mà không cần điền gì.<br>- Không yêu cầu điền công thức mỹ phẩm, mã nền, mã son phức tạp.<br>- Ghi chú lưu vào `customer_care_notes` của Studio. |
| **FR-CRM-203** | Tra Cứu Lịch Sử Ghi Chú Khách Quen | `ROLE_AGENCY_STAFF`, `ROLE_AGENCY_ADMIN` | Khi nhận ca làm của khách quen từng làm tại Studio, thợ có thể mở tab "Lưu ý trước đây" để xem các ghi chú ngắn từ các ca trước. | - Chỉ hiển thị 1-2 dòng ghi chú ngắn gần nhất (VD: *"Khách thích kẻ mày cong nhẹ"*). |

### 4.3. Phân hệ 3: Quản Trị Khách Hàng Studio (Agency Client Directory & RFM)

| Mã yêu cầu | Tên chức năng | Đối tượng | Mô tả chi tiết nghiệp vụ | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-CRM-301** | Bảng Danh bạ Khách hàng Studio | `ROLE_AGENCY_ADMIN` | Trang Web `/agency/crm/customers`: Hiển thị bảng dữ liệu mật độ cao chứa toàn bộ khách từng đặt lịch tại Studio. | - Hiển thị: Avatar, Tên, SĐT, Phân hạng (VIP, Thân thiết, Mới, Nguy cơ), Tổng số đơn, Tổng doanh thu đóng góp, Ngày làm gần nhất, Thợ ruột.<br>- Hỗ trợ tìm kiếm, lọc theo phân hạng và xuất file Excel/CSV. |
| **FR-CRM-302** | Tự động phân nhóm RFM (Segmentation) | Hệ thống Backend | Định kỳ hàng ngày (Cron 02:00 sáng), hệ thống quét toàn bộ giao dịch hoàn thành và tự động gán nhãn phân hạng cho khách: | **Công thức phân hạng**:<br>- **VIP**: Tổng chi tiêu $\ge$ 5.000.000 đ HOẶC số đơn $\ge$ 5 ca.<br>- **REGULAR (Thân thiết)**: Số đơn từ 2 - 4 ca.<br>- **NEW (Mới)**: Mới hoàn thành 1 ca duy nhất.<br>- **AT_RISK (Nguy cơ)**: Khách VIP/Thân thiết nhưng $> 90$ ngày không phát sinh đơn.<br>- **LOST (Rời bỏ)**: $> 180$ ngày không quay lại. |
| **FR-CRM-303** | Chỉ định & Ưu tiên Thợ Ruột (`Preferred Staff`) | `ROLE_AGENCY_ADMIN` | Agency Admin có thể gán cố định hoặc hệ thống tự động gợi ý nhân viên trang điểm mà khách hàng đánh giá cao nhất (5 sao nhiều nhất). | - Khi có đơn mới từ khách này, hệ thống điều phối tự động xếp thợ ruột lên vị trí đầu tiên trong danh sách Dispatch.<br>- Admin có thể bấm 1 nút để điều phối ngay thợ ruột. |
| **FR-CRM-304** | Đánh dấu Danh sách đen (Blacklist) | `ROLE_AGENCY_ADMIN` | Studio có quyền đánh dấu khách hàng có hành vi xấu (quỵt tiền thanh toán 70%, vắng mặt no-show cố tình) để cảnh báo nội bộ Studio. | - Hiển thị cờ đỏ cảnh báo trên màn hình duyệt đơn nếu khách nằm trong Blacklist của Studio.<br>- Bắt buộc nhập lý do đưa vào danh sách đen. |

### 4.4. Phân hệ 4: Tự Động Hóa Chăm Sóc & Tái Tiếp Thị (CRM Automation)

| Mã yêu cầu | Tên chức năng | Đối tượng | Mô tả chi tiết nghiệp vụ | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-CRM-401** | Tự động Nhắc Lịch Sinh Nhật Khách Hàng | Hệ thống Backend | Hàng ngày vào lúc 08:00 sáng, hệ thống quét ngày sinh của User trong `auth_schema.users`. Nếu trùng sinh nhật hôm nay, tự động phát sinh thông báo chúc mừng và tặng Voucher giảm giá (Ví dụ: Giảm 15% gói trang điểm tiệc). | - Gửi In-app Notification và Push Notification.<br>- Tự động tạo bản ghi vào `crm_automated_logs`. |
| **FR-CRM-402** | Kích hoạt Khách có Nguy cơ Rời bỏ (Win-back) | Hệ thống Backend / Studio | Khi trạng thái khách hàng chuyển sang `AT_RISK` ($> 90$ ngày chưa đặt), hệ thống gửi thông báo: *"Đã lâu không gặp bạn, Studio [Tên] tặng bạn mã ưu đãi [Code] cho buổi làm đẹp sắp tới"*. | - Studio có thể kích hoạt chiến dịch bằng 1 cú click trên Web.<br>- Đo lường tỷ lệ chuyển đổi (`is_converted = true` nếu khách đặt lại trong 7 ngày). |
| **FR-CRM-403** | Chăm sóc sau Ca Trang điểm (Post-Care) | Hệ thống Backend | 24 giờ sau khi đơn hàng chuyển sang `PAID_OUT`, hệ thống gửi tin nhắn nhắc nhở quy trình dưỡng da/tẩy trang đúng cách và mời đánh giá nếu khách chưa đánh giá. | - Tin nhắn tinh tế: *"Cảm ơn bạn đã lựa chọn Mua-Makeup! Hãy nhớ tẩy trang kỹ bằng dầu tẩy trang và đắp mặt nạ cấp ẩm nhé!"*. |

### 4.5. Phân hệ 5: Báo Cáo Phân Tích Giữ Chân Toàn Sàn (Super Admin CRM Analytics)

| Mã yêu cầu | Tên chức năng | Đối tượng | Mô tả chi tiết nghiệp vụ | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-CRM-501** | Báo cáo Tỷ lệ Tái Đặt Lịch (Retention Cohort) | `ROLE_SUPER_ADMIN` | Màn hình `/admin/crm-analytics`: Biểu đồ Cohort Retention phân tích theo tháng: Trong 100 khách đặt lần đầu ở Tháng 1, có bao nhiêu % khách quay lại ở Tháng 2, Tháng 3, Tháng 4... | - Tính toán trực quan ma trận Cohort.<br>- Chỉ rõ tỷ lệ quay lại của từng phân khúc gói (Cô dâu vs Đi tiệc vs Kỷ yếu). |
| **FR-CRM-502** | Chỉ số Hài Lòng Sau Tranh Chấp (Dispute CSAT) | `ROLE_SUPER_ADMIN` | Thống kê số lượng khách hàng từng khiếu nại (bị lỗi hoàn tiền hoặc hòa giải) có tiếp tục sử dụng nền tảng trong vòng 30 ngày tiếp theo hay không. | - Đo lường trực tiếp chất lượng phán quyết của đội ngũ Admin.<br>- Cảnh báo những Studio có tỷ lệ khiếu nại cao dẫn đến mất khách vĩnh viễn. |

---

## 5. THIẾT KẾ RESTful API BACKEND (API CONTRACTS)

Tất cả API tuân thủ tiêu chuẩn: Tiền tố `/api/v1`, Bearer JWT Authentication, trả về chuẩn bọc `ResponseEntity<ApiResponse<T>>`.

### 5.1. Nhóm API Beauty Profile Khách Hàng (Tối giản)
- `GET /api/v1/customer/crm/beauty-profile`: Lấy thông tin lưu ý dị ứng/da của khách.
- `PUT /api/v1/customer/crm/beauty-profile`: Cập nhật nhanh loại da hoặc ghi chú dị ứng mỹ phẩm (Tùy chọn).
- `GET /api/v1/customer/crm/showcase-history`: Lấy danh sách ảnh hoàn thiện từ các ca làm trước tại Studio (nếu có).
- `GET /api/v1/agency/crm/client-summary/{bookingId}`: Kỹ thuật viên Studio xem cảnh báo dị ứng/ghi chú của khách cho ca làm việc cụ thể.

### 5.2. Nhóm API Ghi Chú Ca Làm Studio (Agency Quick Notes)
- `POST /api/v1/agency/crm/care-notes`: Nhân sự Studio lưu 1 dòng ghi chú nhanh tùy chọn và ảnh tác phẩm sau ca làm.
- `GET /api/v1/agency/crm/care-notes/{customerId}`: Xem lịch sử các ghi chú ngắn trước đây của khách hàng tại Studio.

### 5.3. Nhóm API Quản Trị Khách Hàng Studio (`AGENCY_ADMIN`)
- `GET /api/v1/agency/crm/customers`: Lấy danh sách khách hàng của Studio (phân trang, search, lọc theo rank RFM `VIP`, `NEW`, `AT_RISK`).
- `GET /api/v1/agency/crm/customers/{customerId}`: Xem hồ sơ 360 độ của 1 khách (Lịch sử ca làm, tổng chi tiêu, thợ đã phục vụ, ghi chú nội bộ Studio).
- `PUT /api/v1/agency/crm/customers/{customerId}/preferred-staff`: Cập nhật thợ ruột phục vụ khách.
- `POST /api/v1/agency/crm/customers/{customerId}/blacklist`: Đưa vào hoặc gỡ khỏi danh sách đen.
- `POST /api/v1/agency/crm/campaigns/send-voucher`: Studio gửi voucher tri ân tới tệp khách hàng theo phân nhóm (Ví dụ: Gửi voucher 20% cho toàn bộ nhóm `AT_RISK`).

---

## 6. ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

### 6.1. Bảo Mật và Quyền Riêng Tư Dữ Liệu Y Tế/Cơ Địa (Privacy & Security)
- **Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân**:
  - Dữ liệu cơ địa (loại da, tiền sử dị ứng mỹ phẩm) được xếp vào nhóm dữ liệu nhạy cảm.
  - Chỉ Studio và Kỹ thuật viên của Studio được chỉ định vào ca hẹn (`ACCEPTED`, `ON_THE_WAY`, `ARRIVED`, `IN_PROGRESS`) mới có quyền đọc dữ liệu cơ địa của khách hàng. Khi ca làm kết thúc hoặc bị hủy, quyền truy cập trực tiếp bị thu hồi về chế độ đọc lịch sử tóm tắt.
  - Freelance MUA không được cấp quyền truy cập hệ thống CRM này.
  - Khách hàng có quyền bật/tắt cờ `is_shared_with_studio` bất kỳ lúc nào.

### 6.2. Hiệu Năng và Tốc Độ Phản Hồi (Performance & Low Latency)
- **Truy vấn danh bạ khách hàng Studio**: Thời gian phản hồi API tra cứu danh sách khách hàng (`GET /api/v1/agency/crm/customers`) phải dưới **150ms** đối với Studio có trên 10,000 khách hàng, nhờ hệ thống PostgreSQL B-Tree Index trên `(agency_id, customer_rank)` và `(agency_id, total_spent_amount)`.
- **Phân đoạn RFM không gây nghẽn hệ thống**: Tác vụ phân tích xếp hạng RFM chạy dưới nền lúc 02:00 sáng bằng Spring Batch/Scheduled Task, cập nhật bất đồng bộ theo lô (batch size 500 bản ghi), tuyệt đối không chạy tính toán realtime khi khách đang truy cập web.

### 6.3. Khả Năng Tương Thích & Mở Rộng (Extensibility & Modularity)
- Kiến trúc phân hệ CRM nằm độc lập trong package `com.makeup.platform.service.crm` và `com.makeup.platform.controller.*.crm`.
- Giao tiếp giữa module Booking và module CRM thực hiện hoàn toàn qua Spring In-Memory EventBus (`ApplicationEventPublisher`), bảo đảm độ trễ <5ms và tính liên kết lỏng (loose-coupling):
  - Sự kiện `BookingCompletedEvent` phát đi $\rightarrow$ `CrmEventListener` tự động cập nhật doanh thu LTV và số ca cho Studio mà không làm chậm transaction kết thúc ca làm của nhân sự Studio.

---

## 7. ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG (UI/UX SPECIFICATIONS)

### 7.1. Màn hình Khách Hàng & Thợ Studio (React Native Mobile App)
1. **Mục "Lưu Ý Cho Thợ / Cơ Địa" Khi Đặt Lịch hoặc Trang Cá Nhân (Siêu tối giản - Tùy chọn)**:
   - Chỉ gồm 1 ô text ngắn duy nhất: *"Lưu ý dị ứng hoặc ghi chú cho Studio (VD: Dị ứng keo mi, da dầu...)"*.
   - Khách có thể bỏ qua bước này để đặt lịch ngay trong 1 chạm.
   - Thêm 1 trường Ngày sinh (Tùy chọn) trong trang cá nhân: *"Nhập ngày sinh để nhận quà & ưu đãi từ Studio"*.

2. **Màn hình Tiến Trình Ca Làm của Kỹ Thuật Viên Studio (`job-execution/[id]`)**:
   - Thẻ Cảnh Báo: Chỉ xuất hiện banner màu vàng hổ phách NẾU khách có ghi chú dị ứng: `⚠️ Khách có lưu ý: Dị ứng keo dán mi Latex`.
   - Nút "Hoàn tất ca làm":
     - Bấm Hoàn tất ca $\rightarrow$ Hiện modal xác nhận kèm 1 ô ghi chú ngắn tùy chọn: *"Ghi chú nhanh cho Studio (nếu có)"* + 1 nút *"Thêm ảnh kết quả (tùy chọn)"*.
     - Thợ có thể bấm luôn nút **"Xác nhận hoàn thành"** mà không cần gõ chữ nào. Quy trình diễn ra trong 2 giây, không gây phiền hà.

### 7.2. Trang Quản Trị Studio (React + Vite Web Portal)
1. **Menu mới trên Sidebar Studio**: Thêm mục **"Khách Hàng (CRM)"** (`/agency/crm-customers`).
2. **Bố cục Giao diện Quản trị Khách Hàng Studio (Data-Dense CRM Dashboard)**:
   - **4 Thẻ Thống kê Tổng quan (KPI Stat Cards)**:
     - *Tổng khách hàng*: Tổng số lượng khách đã từng phục vụ.
     - *Khách hàng VIP*: Số lượng khách có LTV $\ge$ 5.000.000 đ.
     - *Tỷ lệ quay lại (Retention)*: % khách đặt từ 2 lần trở lên.
     - *Khách cần chăm sóc (At-risk)*: Số lượng khách $> 90$ ngày chưa quay lại.
   - **Thanh Công Cụ Tìm Kiếm & Lọc Nâng Cao**:
     - Ô search tên, số điện thoại.
     - Tabs phân nhóm nhanh: `[Tất cả] [VIP] [Thân thiết] [Khách mới] [Cần chăm sóc]`.
   - **Bảng Dữ Liệu Khách Hàng (DataTable)**:
     - Cột: Khách hàng (Avatar + Tên), Số điện thoại, Phân hạng (Badge VIP mạ vàng, Thân thiết xanh ngọc, Nguy cơ đỏ cam), Tổng số ca, Tổng chi tiêu (VND), Ca gần nhất, Thợ ruột phụ trách, Thao tác (Xem hồ sơ 360, Gửi voucher).
   - **Modal Hồ Sơ Khách Hàng 360 (Customer 360 Drawer/Modal)**:
     - Slide trượt từ phải sang: Lịch sử toàn bộ đơn hàng tại Studio, các kỹ thuật viên Studio từng trang điểm cho khách, điểm đánh giá của khách, và ghi chú nội bộ của nhân viên Studio.

---

## 8. LỘ TRÌNH TRIỂN KHAI THEO GIAI ĐOẠN (IMPLEMENTATION ROADMAP)

```
GIAI ĐOẠN 1: NỀN TẢNG CƠ ĐỊA & SỔ TAY CA LÀM STUDIO (Sprint 1 - 2)
├── Tạo migration DDL Flyway V20261019000000__Init_Beauty_CRM_Module.sql
├── Entity & Repository: CustomerBeautyProfile, CustomerCareNote (Agency-bounded)
├── API & UI Mobile App: Form Hồ sơ làm đẹp cho Khách hàng
└── UI Job Execution: Hiển thị ghi chú cơ địa khách cho Nhân sự Studio khi thực hiện ca

GIAI ĐOẠN 2: CRM STUDIO & PHÂN HẠNG RFM (Sprint 3 - 4)
├── Entity & Repository: AgencyCustomerRelation
├── Spring Event Listener: Tự động cập nhật LTV khi Booking hoàn tất
├── Web Portal: Trang Quản trị Khách hàng Studio (/agency/crm-customers)
└── Tính năng gán Thợ ruột (Preferred Staff) và Danh sách đen (Blacklist)

GIAI ĐOẠN 3: TỰ ĐỘNG HÓA & PHÂN TÍCH TOÀN SÀN (Sprint 5 - 6)
├── Spring Scheduler: Tác vụ quét sinh nhật & Win-back khách rời bỏ lúc 02:00
├── Module gửi thông báo tự động (In-app Notification & WebSocket Push)
└── Web Portal Admin: Báo cáo tỷ lệ quay lại (Retention Cohort) và CSAT
```

---

## 9. ĐÁNH GIÁ HIỆU QUẢ KINH DOANH (ROI & KPI EVALUATION)

| Chỉ số đo lường (KPI) | Mục tiêu trước khi có CRM | Mục tiêu sau 3 tháng triển khai CRM | Ý nghĩa kinh tế |
| :--- | :--- | :--- | :--- |
| **Repeat Booking Rate (Tỷ lệ tái đặt lịch)** | ~18% - 22% | **$\ge$ 45%** | Giảm chi phí chạy quảng cáo tìm khách mới (CAC), tăng doanh thu bền vững. |
| **Customer Retention Rate (Tỷ lệ giữ chân 90 ngày)** | ~25% | **$\ge$ 55%** | Tệp khách hàng thân thiết tăng trưởng theo cấp số cộng. |
| **Average Order Value (AOV - Chi tiêu trung bình)** | 250.000 đ | **380.000 đ** | Khách VIP tự tin nâng cấp các gói cao cấp nhờ nhân sự Studio hiểu đúng cơ địa. |
| **Tỷ lệ khiếu nại do kích ứng mỹ phẩm** | ~3.5% | **$< 0.2%$** | Triệt tiêu hoàn toàn sự cố dị ứng mỹ phẩm nhờ cảnh báo trước ca làm. |
| **Customer Satisfaction Score (CSAT)** | 4.2 / 5.0 | **$\ge$ 4.8 / 5.0** | Trải nghiệm cá nhân hóa đẳng cấp Luxury Beauty. |

---
**Tài liệu này là căn cứ kỹ thuật chính thức để đội ngũ Kỹ sư Backend, Frontend Web, Mobile App và Quản lý Sản phẩm (PO) tiến hành hiện thực hóa phân hệ Beauty CRM.**
