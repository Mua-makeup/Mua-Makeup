# BÁO CÁO CHI TIẾT & HƯỚNG DẪN TÍNH NĂNG: ISSUE-12.4 & ISSUE-12.5
## PHÂN HỆ: QUẢN LÝ PHONG CÁCH MAKE-UP & XẾP CA TUẦN CỦA THỢ STUDIO (AGENCY MANAGEMENT)
**Nhánh Git:** `feature/agency_styles_and_shifts`  
**Dự án:** `Mua-Makeup` / `core-api` (Spring Boot 3.3.x, PostgreSQL 16 `agency_schema`, Redis)

---

## 📌 1. TỔNG QUAN NHỮNG GÌ ĐÃ THỰC HIỆN

Trong đợt triển khai này, hệ thống đã hoàn tất toàn bộ hai nghiệp vụ cốt lõi tiếp theo của phân hệ Agency:
1. **`ISSUE-12.4` - Quản lý Năng lực Thợ theo Phong cách Make-up (`agency_staff_styles`)**:
   - Cho phép Chủ Studio (`ROLE_AGENCY_ADMIN`) gán danh sách các phong cách make-up chuẩn sàn (ví dụ: Tone Hàn Douyin, Tone Thái, Tone Tây, Cô dâu...) mà thợ trong Studio đủ tay nghề đảm nhiệm.
   - Khi xem thông tin chi tiết của thợ (`GET /api/v1/agencies/staff/{staffId}`), hệ thống tự động tải kèm danh sách các phong cách make-up đã gán (`assignedStyles`).
2. **`ISSUE-12.5` - Bảng Ma trận Xếp ca làm việc cố định theo tuần (`agency_staff_shifts`)**:
   - Cho phép Studio Admin và Lễ tân/Quản lý (`ROLE_AGENCY_ADMIN`, `ROLE_AGENCY_STAFF`) lập lịch trực cố định 7 ngày trong tuần (Thứ 2 $\rightarrow$ Chủ Nhật).
   - Tự động bắt lỗi xung đột giờ: Nếu một thợ bị xếp trùng hoặc giao thoa khung giờ với ca làm khác trong cùng một ngày, hệ thống lập tức chặn và trả về mã lỗi `ERR_SHIFT_OVERLAPPING` (`HTTP 409 CONFLICT`).
   - Cung cấp API Ma trận Lịch Ca Tuần (`GET /api/v1/agencies/shifts/matrix`) gom nhóm trực quan theo 7 ngày trong tuần, phục vụ hiển thị Dashboard bảng ca trực.
   - Cung cấp API xem ca trực riêng của thợ (`GET /api/v1/agencies/shifts/staff/{staffId}`) và hủy ca làm (`DELETE /api/v1/agencies/shifts/{shiftId}`).

---

## 🗄️ 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (FLYWAY MIGRATION V8)

File đã tạo: `src/main/resources/db/migration/V8__Agency_Staff_Styles_And_Shifts.sql`

```sql
-- 1. BẢNG GÁN PHONG CÁCH MAKE-UP CHO THỢ STUDIO (agency_staff_styles)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_styles (
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    style_id INT NOT NULL REFERENCES catalog_schema.makeup_styles(id) ON DELETE CASCADE,
    is_qualified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (staff_id, style_id)
);

-- 2. BẢNG XẾP CA LÀM VIỆC CỐ ĐỊNH THEO TUẦN (agency_staff_shifts)
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_shifts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: Chủ Nhật, 2: Thứ 2, ..., 7: Thứ 7
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_shift_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_shifts_agency_day ON agency_schema.agency_staff_shifts(agency_id, day_of_week, is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON agency_schema.agency_staff_shifts(staff_id, day_of_week);

CREATE TRIGGER trg_update_agency_staff_shifts_updated_at
    BEFORE UPDATE ON agency_schema.agency_staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 📂 3. CÁC TẬP TIN MÃ NGUỒN ĐÃ TẠO VÀ CẬP NHẬT

### 3.1. Entity & Repository
| Tên File | Vai trò |
| :--- | :--- |
| `AgencyStaffStyleId.java` | Khóa chính phức hợp (`staffId` + `styleId`) cho bảng `agency_staff_styles`. |
| `AgencyStaffStyleEntity.java` | Mapping JPA entity liên kết `@ManyToOne` với `AgencyStaffEntity` và `MakeupStyleEntity`. |
| `AgencyStaffStyleRepository.java` | Truy vấn phong cách theo thợ (`findByStaffIdWithStyle`), xóa mapping cũ khi gán mới (`deleteByStaffId`). |
| `AgencyStaffShiftEntity.java` | Mapping JPA entity bảng ca trực tuần (`agency_staff_shifts`). |
| `AgencyStaffShiftRepository.java` | Chứa câu truy vấn kiểm tra trùng giờ ca trực (`findOverlappingShifts`), tải danh sách ca kèm thông tin thợ (`findAllActiveByAgencyIdWithStaff`). |
| `AgencyStaffRepository.java` | Bổ sung hàm tìm kiếm `findActiveStaffByUserId` phục vụ phân quyền xem ma trận cho thợ/nhân viên. |

### 3.2. DTO (Data Transfer Objects)
| Tên File | Vai trò |
| :--- | :--- |
| `AssignStaffStylesReq.java` | Request body danh sách `styleIds` cần gán cho thợ. |
| `AssignedStyleRes.java` | DTO thông tin phong cách (`id`, `styleCode`, `styleName`, `isQualified`). |
| `StaffStylesRes.java` | DTO kết quả sau khi gán phong cách (`staffId`, danh sách `assignedStyles`). |
| `AgencyStaffDetailRes.java` | Bổ sung trường `List<AssignedStyleRes> assignedStyles` để trả về phong cách khi xem chi tiết thợ. |
| `ConfigureShiftReq.java` | Request body tạo ca làm việc (`staffId`, `dayOfWeek`, `shiftName`, `startTime`, `endTime`, `isRecurring`). |
| `ShiftDetailRes.java` | DTO chi tiết 1 ca làm kèm tên thứ tiếng Việt (`dayName`). |
| `DayShiftGroupRes.java` | DTO gom nhóm ca trực theo từng ngày trong tuần. |
| `WeeklyShiftMatrixRes.java` | DTO bảng ma trận ca tuần hoàn chỉnh 7 ngày của Studio. |

### 3.3. Service Layer (Xử lý nghiệp vụ & Bắt lỗi)
| Tên File | Logic nghiệp vụ chi tiết |
| :--- | :--- |
| `AgencyStaffStyleService.java` & `AgencyStaffStyleServiceImpl.java` | - Kiểm tra Studio thuộc sở hữu của User hiện tại.<br>- Xác thực từng `styleId` tồn tại trong catalog sàn (`catalog_schema.makeup_styles`).<br>- Xóa mapping phong cách cũ và lưu mới theo danh sách truyền vào. |
| `AgencyStaffServiceImpl.java` | - Inject `AgencyStaffStyleRepository` vào `getStaffDetail` để tự động trả về danh sách phong cách của thợ. |
| `AgencyShiftService.java` & `AgencyShiftServiceImpl.java` | - **Kiểm tra thời gian**: `startTime < endTime`, nếu sai ném `ERR_INVALID_SHIFT_TIME`.<br>- **Kiểm tra thợ**: Phải thuộc Studio và đang `ACTIVE`.<br>- **Kiểm tra xung đột giờ (Overlap Formula)**: `(s.startTime < :endTime AND s.endTime > :startTime)`, nếu có ca trùng ném `ERR_SHIFT_OVERLAPPING` (`HTTP 409`).<br>- **Tạo ma trận tuần**: Tự động gom nhóm toàn bộ ca trực vào 7 ngày theo thứ tự Thứ Hai $\rightarrow$ Chủ Nhật. |

### 3.4. Controller Layer (REST Endpoints)
| Tên File | Các API cung cấp |
| :--- | :--- |
| `AgencyStaffStyleController.java` | - `PUT /api/v1/agencies/staff/{staffId}/styles` (Gán phong cách)<br>- `GET /api/v1/agencies/staff/{staffId}/styles` (Xem phong cách của thợ) |
| `AgencyShiftController.java` | - `POST /api/v1/agencies/shifts` (Xếp ca làm việc)<br>- `GET /api/v1/agencies/shifts/matrix` (Xem ma trận ca tuần)<br>- `GET /api/v1/agencies/shifts/staff/{staffId}` (Xem ca trực của thợ)<br>- `DELETE /api/v1/agencies/shifts/{shiftId}` (Xóa/hủy ca làm việc) |

---

## 🧪 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (UNIT TESTS)

Đã tạo và chạy thành công 100% các bộ kiểm thử tự động với Gradle (JDK 21):
- `AgencyStaffStyleServiceImplTest.java`:
  - ✅ Gán phong cách thành công.
  - ✅ Báo lỗi `ERR_STYLE_NOT_FOUND` khi truyền styleId không tồn tại.
  - ✅ Lấy danh sách phong cách của thợ thành công.
- `AgencyShiftServiceImplTest.java`:
  - ✅ Tạo ca trực thành công.
  - ✅ Báo lỗi `ERR_INVALID_SHIFT_TIME` khi giờ kết thúc trước giờ bắt đầu.
  - ✅ Báo lỗi `ERR_SHIFT_OVERLAPPING` (`409 CONFLICT`) khi ca trực bị trùng giờ.
  - ✅ Lấy ma trận ca tuần thành công (chuẩn 7 ngày).
  - ✅ Xóa (hủy kích hoạt) ca làm việc thành công.
- `AgencyStaffServiceImplTest.java` & `AgencyProfileServiceImplTest.java`:
  - ✅ Toàn bộ 19 bài test trước đó tiếp tục PASS hoàn toàn.

**Kết quả build:** `BUILD SUCCESSFUL in 22s`.

---

## 📡 5. HƯỚNG DẪN TEST TRÊN POSTMAN

Dưới đây là các bước và body mẫu để bạn thực hiện test trên Postman:

### Bước 1: Gán phong cách make-up cho thợ (ISSUE-12.4)
* **Method:** `PUT`
* **URL:** `http://localhost:8080/api/v1/agencies/staff/{staffId}/styles`
* **Headers:**
  * `Authorization`: `Bearer <TOKEN_CHU_STUDIO>`
  * `Content-Type`: `application/json`
* **Body (raw JSON):**
  ```json
  {
    "styleIds": [1, 2, 4]
  }
  ```
* **Response mong đợi (200 OK):**
  ```json
  {
    "success": true,
    "code": "200",
    "message": "agency.staff_styles_assign_success",
    "data": {
      "staffId": 1,
      "assignedStyles": [
        {
          "id": 1,
          "styleCode": "STYLE_DOUYIN",
          "styleName": "Tone Hàn Douyin",
          "isQualified": true
        },
        {
          "id": 2,
          "styleCode": "STYLE_THAI",
          "styleName": "Tone Thái Sang Trọng",
          "isQualified": true
        }
      ]
    }
  }
  ```

---

### Bước 2: Xem chi tiết thợ để kiểm tra phong cách đã gán
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/agencies/staff/{staffId}`
* **Headers:** `Authorization: Bearer <TOKEN_CHU_STUDIO>`
* **Response:** Trong trường `assignedStyles` sẽ trả về đầy đủ các phong cách vừa gán.

---

### Bước 3: Xếp ca làm việc cố định cho thợ (ISSUE-12.5)
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/agencies/shifts`
* **Headers:**
  * `Authorization`: `Bearer <TOKEN_CHU_STUDIO>`
  * `Content-Type`: `application/json`
* **Body (raw JSON):**
  ```json
  {
    "staffId": 1,
    "dayOfWeek": 2,
    "shiftName": "Ca Sáng Make-up Tiệc",
    "startTime": "07:00:00",
    "endTime": "12:00:00",
    "isRecurring": true
  }
  ```
  *(Ghi chú: `dayOfWeek`: 1 = Chủ Nhật, 2 = Thứ Hai, ..., 7 = Thứ Bảy)*
* **Response mong đợi (201 CREATED):**
  ```json
  {
    "success": true,
    "code": "201",
    "message": "agency.shift_created_success",
    "data": {
      "id": 1,
      "shiftId": 1,
      "staffId": 1,
      "staffName": "Trần Thanh Tâm",
      "dayOfWeek": 2,
      "dayName": "Thứ Hai",
      "shiftName": "Ca Sáng Make-up Tiệc",
      "startTime": "07:00:00",
      "endTime": "12:00:00",
      "isRecurring": true,
      "isActive": true
    }
  }
  ```

---

### Bước 4: Kiểm tra cơ chế chống trùng giờ ca làm (Overlap Validation)
* **Thực hiện:** Tiếp tục gửi request `POST /api/v1/agencies/shifts` với cùng thợ `staffId: 1`, cùng `dayOfWeek: 2`, nhưng khung giờ đè lên ca cũ:
  ```json
  {
    "staffId": 1,
    "dayOfWeek": 2,
    "shiftName": "Ca Trùng Giờ",
    "startTime": "10:00:00",
    "endTime": "14:00:00",
    "isRecurring": true
  }
  ```
* **Response mong đợi (409 CONFLICT):**
  ```json
  {
    "success": false,
    "code": "ERR_SHIFT_OVERLAPPING",
    "message": "Ca làm việc bị trùng giờ với ca khác của thợ trong ngày",
    "data": null
  }
  ```

---

### Bước 5: Xem Bảng Ma trận Ca làm việc Tuần (Weekly Shift Matrix)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/agencies/shifts/matrix`
* **Headers:** `Authorization: Bearer <TOKEN_CHU_STUDIO>` (hoặc Token của Thợ)
* **Response mong đợi (200 OK):**
  Trả về bảng 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật với danh sách các ca trực được xếp gọn gàng theo từng ngày.

---

### Bước 6: Xóa / Hủy kích hoạt ca trực
* **Method:** `DELETE`
* **URL:** `http://localhost:8080/api/v1/agencies/shifts/{shiftId}`
* **Headers:** `Authorization: Bearer <TOKEN_CHU_STUDIO>`
* **Response mong đợi (200 OK):**
  Ca trực chuyển sang `isActive = false`, không còn hiển thị trên ma trận lịch làm việc.
