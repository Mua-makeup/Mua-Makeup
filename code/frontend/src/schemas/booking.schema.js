import { z } from 'zod';

/**
 * Zod Schema cho form Đặt Lịch Hẹn Trước (Scheduled Booking)
 * Khớp 100% với Bean Validation CreateScheduledBookingReq trên Backend
 */
export const scheduledBookingSchema = z
  .object({
    packageId: z
      .number({ required_error: 'Vui lòng chọn gói dịch vụ' })
      .positive('Gói dịch vụ không hợp lệ'),
    bookingPartner: z.enum(['FREELANCER_DIRECT', 'AGENCY_DISPATCH'], {
      required_error: 'Vui lòng chọn hình thức đặt lịch (Thợ tự do hoặc Studio)',
    }),
    muaId: z.number().positive().nullable().optional(),
    agencyId: z.number().positive().nullable().optional(),
    bookingDate: z
      .string()
      .min(1, 'Vui lòng chọn ngày hẹn')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD'),
    startTime: z
      .string()
      .min(1, 'Vui lòng chọn giờ bắt đầu')
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Định dạng giờ phải là HH:mm'),
    destinationAddress: z
      .string()
      .min(5, 'Địa chỉ làm đẹp phải có ít nhất 5 ký tự')
      .max(255, 'Địa chỉ không được vượt quá 255 ký tự'),
    destinationLatitude: z
      .number({ required_error: 'Vui lòng chọn vị trí trên bản đồ' })
      .min(-90)
      .max(90),
    destinationLongitude: z
      .number({ required_error: 'Vui lòng chọn vị trí trên bản đồ' })
      .min(-180)
      .max(180),
    note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  })
  // 1. Kiểm tra đối tác tương ứng
  .refine(
    (data) => {
      if (data.bookingPartner === 'FREELANCER_DIRECT') {
        return !!data.muaId;
      }
      return !!data.agencyId;
    },
    {
      message: 'Vui lòng chọn Thợ trang điểm hoặc Studio tương ứng',
      path: ['bookingPartner'],
    },
  )
  // 2. Ràng buộc khung giờ phục vụ 03:00 - 22:00
  .refine(
    (data) => {
      if (!data.startTime) return true;
      const hour = parseInt(data.startTime.split(':')[0], 10);
      return hour >= 3 && hour <= 22;
    },
    {
      message: 'Giờ bắt đầu ca hẹn phải nằm trong khung giờ phục vụ từ 03:00 đến 22:00',
      path: ['startTime'],
    },
  )
  // 3. Ràng buộc ngày không quá 90 ngày và cách hiện tại tối thiểu 2 giờ
  .refine(
    (data) => {
      if (!data.bookingDate || !data.startTime) return true;
      const bookingDateTime = new Date(`${data.bookingDate}T${data.startTime.substring(0, 5)}:00`);
      const now = new Date();

      // Không đặt lùi về quá khứ
      if (bookingDateTime < now) return false;

      // Không đặt quá 90 ngày
      const maxDate = new Date();
      maxDate.setDate(now.getDate() + 90);
      if (bookingDateTime > maxDate) return false;

      // Cách thời điểm hiện tại tối thiểu 2 giờ (120 phút)
      const diffMinutes = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
      return diffMinutes >= 120;
    },
    {
      message: 'Thời gian hẹn phải cách hiện tại tối thiểu 2 giờ và không quá 90 ngày trong tương lai',
      path: ['startTime'],
    },
  );

/**
 * Zod Schema cho thao tác Khóa Khung Giờ Bận Cá Nhân của Thợ trang điểm
 * Khớp 100% với BlockCalendarSlotReq trên Backend
 */
export const blockCalendarSlotSchema = z
  .object({
    bookingDate: z
      .string()
      .min(1, 'Vui lòng chọn ngày')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD'),
    startTime: z
      .string()
      .min(1, 'Vui lòng chọn giờ bắt đầu')
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Định dạng giờ phải là HH:mm'),
    endTime: z
      .string()
      .min(1, 'Vui lòng chọn giờ kết thúc')
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Định dạng giờ phải là HH:mm'),
    reason: z.string().max(255, 'Lý do tối đa 255 ký tự').optional(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      return data.endTime > data.startTime;
    },
    {
      message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      path: ['endTime'],
    },
  );
