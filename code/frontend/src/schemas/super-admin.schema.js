import { z } from 'zod';

export const verifyCertificateSchema = z.object({
  certIndex: z.number().int().nonnegative().optional().default(0),
  imageUrl: z.string().optional(),
  isVerified: z.boolean({ required_error: 'Vui lòng chọn trạng thái phê duyệt' }),
  notes: z.string().optional(),
});
