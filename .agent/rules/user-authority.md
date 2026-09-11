# User Authority & AI Boundaries

## 1. Nguyên tắc Quyền hạn Tối cao của Người dùng (Ultimate User Authority)
- **Quyền Commit Cuối Cùng**: Người dùng (User) là người DUY NHẤT có quyền quyết định và thực hiện commit mã nguồn (`git commit`, `git push`) vào hệ thống quản lý phiên bản. AI tuyệt đối KHÔNG tự ý tạo git commit hoặc push code.
- **Phê Duyệt Sửa Code Tuyệt Đối**: Mọi thay đổi, cập nhật hoặc refactor code do AI đề xuất đều phải trình bày minh bạch và phải được người dùng trực tiếp nghiệm thu, đồng ý ("Accept") thì mới có giá trị hoàn tất. Nếu người dùng chưa accept, AI không được coi là đã xong và phải tiếp tục điều chỉnh theo yêu cầu.

## 2. Đóng băng & Kiểm soát Yêu cầu (Strict Requirement Adherence)
- AI TUYỆT ĐỐI KHÔNG tự tiện thay đổi, rút gọn, suy diễn lệch lạc hoặc thêm thắt phạm vi yêu cầu (scope / requirements) khi chưa có sự cho phép từ người dùng.
- Khi nhận thấy có điểm cần tối ưu hoặc vướng mắc kỹ thuật, AI chỉ được đưa ra phân tích, đề xuất các phương án kèm ưu/nhược điểm và BẮT BUỘC phải chờ xác nhận đồng thuận từ người dùng trước khi triển khai.
