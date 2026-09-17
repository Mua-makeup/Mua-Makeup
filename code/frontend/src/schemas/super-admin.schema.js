import { z } from 'zod';

export const verifyCertificateSchema = z
  .object({
    certIndex: z.number().int().nonnegative().optional().default(0),
    imageUrl: z.string().optional(),
    isVerified: z.boolean({ required_error: 'Vui lòng chọn trạng thái phê duyệt' }),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isVerified === false) {
        return Boolean(data.notes && data.notes.trim().length >= 5);
      }
      return true;
    },
    {
      message: 'Vui lòng nhập lý do từ chối hồ sơ (tối thiểu 5 ký tự)',
      path: ['notes'],
    }
  );
