import { z } from 'zod';

export const agencyProfileSchema = z.object({
  agencyName: z.string().min(2, 'Tên Studio phải có ít nhất 2 ký tự'),
  hotline: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại phải từ 10-11 chữ số'),
  addressStreet: z.string().min(3, 'Vui lòng nhập địa chỉ cụ thể'),
  district: z.string().min(2, 'Vui lòng nhập quận/huyện').optional(),
  city: z.string().min(2, 'Vui lòng nhập tỉnh/thành phố').optional(),
  addressDistrict: z.string().min(2, 'Vui lòng nhập quận/huyện').optional(),
  addressCity: z.string().min(2, 'Vui lòng nhập tỉnh/thành phố').optional(),
  logoUrl: z.string().url('Đường dẫn ảnh logo không hợp lệ').optional().or(z.literal('')),
});

export const commissionRateSchema = z.object({
  commissionRate: z
    .number({ invalid_type_error: 'Tỷ lệ hoa hồng phải là số' })
    .min(0, 'Hoa hồng tối thiểu là 0%')
    .max(60, 'Hoa hồng tối đa là 60%'),
});

export const servicePackageSchema = z.object({
  packageName: z.string().min(3, 'Tên gói dịch vụ phải có ít nhất 3 ký tự'),
  description: z.string().optional(),
  price: z.number({ invalid_type_error: 'Giá tiền phải là số' }).min(10000, 'Giá tối thiểu là 10.000 đ'),
  durationMinutes: z.number().int().min(15, 'Thời lượng tối thiểu 15 phút').max(480, 'Thời lượng tối đa 8 tiếng').optional(),
  estimatedDurationMinutes: z.number().int().min(15, 'Thời lượng tối thiểu 15 phút').max(480, 'Thời lượng tối đa 8 tiếng').optional(),
  categoryId: z.number({ invalid_type_error: 'Vui lòng chọn danh mục' }).int().positive('Vui lòng chọn danh mục').optional(),
  masterCategoryId: z.number({ invalid_type_error: 'Vui lòng chọn danh mục' }).int().positive('Vui lòng chọn danh mục').optional(),
  styleIds: z.array(z.number().int()).min(1, 'Vui lòng chọn ít nhất 1 phong cách make-up áp dụng'),
});

export const packageItemSchema = z.object({
  itemName: z.string().min(2, 'Tên bước/dịch vụ phải có ít nhất 2 ký tự'),
  itemType: z.enum(['COMPONENT', 'ADD_ON'], { required_error: 'Vui lòng chọn loại' }),
  extraPrice: z.number().min(0, 'Giá cộng thêm không thể âm').default(0).optional(),
  itemPrice: z.number().min(0, 'Giá cộng thêm không thể âm').default(0).optional(),
  durationMinutes: z.number().int().min(0, 'Thời lượng không thể âm').default(0),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().min(1, 'Thứ tự phải từ 1 trở lên').default(1).optional(),
  stepOrder: z.number().int().min(1, 'Thứ tự phải từ 1 trở lên').default(1).optional(),
});

export const surchargeConfigSchema = z.object({
  surchargeType: z.enum(['DISTANCE', 'OUT_OF_RADIUS', 'NIGHT', 'EARLY_MORNING', 'HOLIDAY', 'CUSTOM']),
  surchargeName: z.string().optional(),
  baseDistanceKm: z.number().min(0).optional(),
  extraPricePerKm: z.number().min(0).optional(),
  maxDistanceKm: z.number().min(1).optional(),
  startHour: z.string().optional(),
  endHour: z.string().optional(),
  amount: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  holidayName: z.string().optional(),
});

export const overtimeRuleSchema = z.object({
  ratePerHour: z.number().min(1000, 'Đơn giá tăng ca tối thiểu 1.000 đ/giờ'),
  maxOvertimeHours: z.number().min(1, 'Giờ tăng ca tối đa tối thiểu 1h').max(12, 'Tối đa 12h/ngày'),
});

export const reviewOvertimeReportSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { required_error: 'Vui lòng chọn hành động' }),
  reviewNote: z.string().optional(),
});

export const staffInvitationSchema = z.object({
  proposedCommissionRate: z.number().min(0).max(60, 'Tỷ lệ hoa hồng tối đa 60%').default(30),
  expireHours: z.number().int().min(1).max(168).default(72),
  note: z.string().optional(),
});

export const shiftSchema = z
  .object({
    staffId: z.number({ invalid_type_error: 'Vui lòng chọn thợ' }).int().positive(),
    dayOfWeek: z.union([
      z.number().int().min(1).max(7),
      z.string().min(1),
    ]),
    shiftName: z.string().min(2, 'Tên ca làm việc tối thiểu 2 ký tự'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Giờ bắt đầu phải có định dạng HH:mm'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Giờ kết thúc phải có định dạng HH:mm'),
  })
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);
      return endH * 60 + endM > startH * 60 + startM;
    },
    {
      message: 'Giờ kết thúc phải sau giờ bắt đầu',
      path: ['endTime'],
    }
  );
