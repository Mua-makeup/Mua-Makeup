**Bản tối ưu backend đã được người dùng duyệt và áp dụng vào `code/backend/core-api`.**

Bản đề xuất gồm 29 file, trong đó có 11 file mới. Nó được xây dựng trên code hiện tại, bao gồm phần refactor của lượt trước. File patch chỉ chứa thay đổi của đợt tối ưu này, không chứa lại phần refactor đã ghi vào workspace.

- [Xem toàn bộ diff](backend-optimization.patch): dòng `-` là code cũ, dòng `+` là code đề xuất.
- [Danh sách file và mã kiểm tra bản gốc](backend-optimization-manifest.json).

| Nhóm | Trước | Đề xuất |
|---|---|---|
| Danh sách booking admin/agency | Tải toàn bộ booking, lọc và dựng DTO trước khi cắt trang | Lọc và phân trang trong database; chỉ dựng DTO của trang cần trả |
| Bộ lọc | Quy tắc admin và agency nằm trong các stream riêng | Đưa vào `BookingSpecifications`, giữ các nhóm trạng thái riêng; escape `%`, `_`, `!` trong tìm kiếm để giữ ý nghĩa tìm chuỗi |
| Thống kê admin | Tải mọi entity rồi duyệt nhiều lượt | Database gom nhóm theo trạng thái và cờ emergency, trả số lượng và tổng tiền |
| Thống kê agency | Dựng đầy đủ DTO, package và staff cho từng đơn hoàn tất | Chỉ lấy MUA ID và tổng tiền; tải tỷ lệ hoa hồng theo lô; giữ cách làm tròn từng đơn |
| Hoa hồng trong danh sách agency | Một truy vấn staff cho mỗi booking | Tải tỷ lệ theo danh sách MUA của trang, truyền vào mapper |
| Tìm thợ tức thì | Truy vấn profile và kiểm tra Redis lần lượt | Tải profile theo lô tối đa 250 ID, MGET trạng thái khóa; duyệt lại theo thứ tự khoảng cách của Redis GEO |
| Giữ lượt mời thợ | `hasKey` rồi `set`, hai request có thể cùng đi qua | `SET NX` kèm TTL; chỉ booking sở hữu được nhả khóa qua Lua compare-and-delete |
| Nhận/hủy/chuyển thợ | Các đường xử lý không dùng chung khóa database | Khóa hàng booking ở các đường xử lý tức thì; khóa hàng MUA khi nhận đơn; kiểm tra lại target của timer sau khi lấy khóa |
| Scheduler | Tải mọi booking REQUESTED, xử lý trong một transaction | Chỉ lấy ID của booking tức thì theo batch 100; keyset pagination với mốc ID trên; transaction riêng cho từng booking |
| WebSocket booking | Có đường gửi trước commit | `BookingMessagePublisher` gửi snapshot sau commit; listener nhận đơn/chuyển trạng thái dùng AFTER_COMMIT |
| Telemetry khi cache miss | Profile/package được truy vấn riêng từng thợ; giá bị tính lại khi ghi cache | Tải profile và giá thấp nhất theo lô, dùng lại giá khi cập nhật cache |
| Tracking thiếu GPS | Tạo tọa độ, tốc độ, hướng và độ chính xác giả | Trả vị trí đã ghi nhận kèm thời điểm hoặc trạng thái thiếu dữ liệu; không ghi tọa độ giả vào Redis |
| Tổ chức dispatch | Service chính khoảng 1.003 dòng | Service chính còn khoảng 445 dòng; tách `AgencyEmergencyService` và `AgencyDispatchSupport`, giữ interface controller đang gọi |
| Quy ước Redis | Chuỗi key nằm lặp ở nhiều lớp | Gom trong `InstantBookingKeys`, giữ nguyên định dạng key hiện có |
| Database | Thiếu index khớp với các truy vấn mới | Thêm migration cho index `(booking_type, status, id)`, `(agency_id, created_at DESC, id DESC)` và `(created_at DESC, id DESC)` |
| Lazy loading | Có thể phát sinh truy vấn riêng khi đọc các collection | Fetch quan hệ to-one cho trang booking; cấu hình Hibernate batch fetch 50 cho dev/prod |
| Kết nối Redis | Kết nối cấu hình keyspace notification chưa đóng tường minh | Dùng try-with-resources |

**Các thay đổi hành vi cần biết khi duyệt**

1. Tracking thêm `locationStatus`: `LIVE`, `LAST_KNOWN`, `UNAVAILABLE`, `COMPLETED`. Khi không có phép đo, tọa độ/tốc độ/ETA có thể là `null`. Vị trí cuối cùng giữ timestamp gốc; không suy ra vị trí từ địa chỉ đích hoặc trạng thái ARRIVED. Client cần hiển thị tình trạng thiếu dữ liệu phù hợp.
2. Hai booking cùng tranh một thợ sẽ không ghi đè lượt mời của nhau. Nếu tất cả ứng viên vừa bị booking khác giữ, tạo đơn trả lỗi không có thợ khả dụng theo mã lỗi hiện có.
3. Thông báo chỉ được gửi sau khi database commit. Lỗi gửi thông báo được log đầy đủ; không biến một transaction đã commit thành phản hồi lỗi do WebSocket. Cơ chế này chưa có hàng đợi bền vững hoặc retry/outbox khi tiến trình dừng đột ngột.
4. Kết quả booking tiếp tục sắp theo `createdAt DESC`; thêm `id DESC` để ổn định thứ tự khi trùng thời gian. Bộ lọc admin không hợp lệ vẫn trả rỗng; bộ lọc agency không hợp lệ vẫn không áp dụng điều kiện trạng thái. Chuẩn hóa chữ hoa/thường bằng `Locale.ROOT`.
5. Giữ các giá trị thời gian 45/20/25 giây, giá mặc định, tỷ lệ cọc và thu nhập đã có. Giữ tên topic và trường payload booking hiện có.
6. Migration index là file đề xuất mới. Chưa chạy migration trên database. Khi được áp dụng và ứng dụng chạy Flyway, việc tạo index trên bảng lớn cần được tính vào thời gian triển khai.

**Đã kiểm tra**

- Biên dịch bản riêng bằng Gradle `compileJava --offline --console=plain`: **BUILD SUCCESSFUL**.
- Biên dịch lại backend trong workspace sau khi áp dụng: **BUILD SUCCESSFUL** (13 giây); không chạy test.
- `git apply --check --whitespace=error`: patch áp dụng được trên workspace hiện tại, không có lỗi whitespace.
- Đối chiếu SHA-256 của toàn bộ file gốc trong `src/main`: không file backend nào bị thay đổi trong lúc chuẩn bị bản đề xuất.
- Không tạo, sửa hoặc chạy test theo yêu cầu. Không chạy ứng dụng, không kết nối PostgreSQL/Redis để xác minh truy vấn và tranh chấp runtime, không chạy migration.

Chưa có benchmark nên không đưa ra con số phần trăm tăng tốc. Biên dịch xác nhận cú pháp và kiểu Java; không thay thế việc xác minh truy vấn JPA, migration và hành vi tích hợp. Các endpoint vốn trả toàn bộ danh sách khi không phân trang vẫn giữ hợp đồng đó. Thống kê agency vẫn lấy một dòng dữ liệu gọn cho mỗi booking hoàn tất để giữ cách làm tròn hoa hồng hiện hành. Redis và database chưa trở thành một transaction phân tán; khóa ứng viên có TTL và được nhả khi rollback nhưng không cung cấp bảo đảm atomic cho mọi dữ liệu Redis.

Đây là đợt tối ưu các luồng có vấn đề cụ thể đã xác định, không phải cam kết mọi phần backend đã đạt hiệu năng tối đa. Chính sách nghiệp vụ, nội dung audit/i18n và các API ngoài phạm vi trên không bị viết lại hàng loạt.

**Cách duyệt và áp dụng**

Người dùng đã đồng ý áp dụng bản này. Patch đã được kiểm tra lại với workspace trước khi áp dụng; kiểm tra patch ngược bằng `git apply --reverse --check` cũng thành công sau khi áp dụng, xác nhận các thay đổi khớp bản đã duyệt. `git diff --check` không báo lỗi. Không stage, commit hoặc push. Chưa chạy migration database; file migration sẽ được Flyway xử lý khi ứng dụng khởi động theo cấu hình hiện tại.
