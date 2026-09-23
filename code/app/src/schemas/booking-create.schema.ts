import { z } from 'zod';

export const createBookingSchema = z.object({
  packageId: z.number({ required_error: 'Vui lòng chọn gói dịch vụ cần đặt.' }),
  providerId: z.number({ required_error: 'Vui lòng chọn thợ hoặc studio trang điểm.' }),
  providerType: z.enum(['FREELANCER', 'AGENCY'], {
    required_error: 'Loại nhà cung cấp không hợp lệ.',
  }),
  bookingTime: z
    .string({ required_error: 'Vui lòng chọn thời gian hẹn làm đẹp.' })
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: 'Thời gian hẹn phải ở thời điểm tương lai.',
    }),
  destinationAddress: z
    .string({ required_error: 'Vui lòng nhập địa chỉ trang điểm tận nơi.' })
    .min(5, 'Địa chỉ phải có ít nhất 5 ký tự.')
    .max(500, 'Địa chỉ không được vượt quá 500 ký tự.'),
  destinationLatitude: z
    .number({ required_error: 'Tọa độ vĩ độ không được để trống.' })
    .min(-90, 'Vĩ độ không hợp lệ')
    .max(90, 'Vĩ độ không hợp lệ'),
  destinationLongitude: z
    .number({ required_error: 'Tọa độ kinh độ không được để trống.' })
    .min(-180, 'Kinh độ không hợp lệ')
    .max(180, 'Kinh độ không hợp lệ'),
  addOnItemIds: z.array(z.number()).default([]),
  note: z.string().max(500, 'Ghi chú không được dài quá 500 ký tự.').optional(),
  voucherCode: z.string().optional(),
});

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;
