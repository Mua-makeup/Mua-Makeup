import { z } from 'zod';

export const createShowcaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Tiêu đề tác phẩm phải có ít nhất 2 ký tự')
    .max(150, 'Tiêu đề tác phẩm không được vượt quá 150 ký tự'),
  packageId: z.coerce
    .number({ invalid_type_error: 'Vui lòng chọn gói dịch vụ liên kết' })
    .min(1, 'Vui lòng chọn gói dịch vụ liên kết'),
  styleId: z.coerce.number().optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Mô tả kỹ thuật không được vượt quá 1000 ký tự')
    .optional()
    .or(z.literal('')),
  coverImageUri: z
    .string({ required_error: 'Vui lòng chụp hoặc chọn ảnh tác phẩm chính' })
    .min(1, 'Vui lòng chụp hoặc chọn ảnh tác phẩm chính'),
  isFeatured: z.boolean().default(false),
});

export type CreateShowcaseFormValues = z.infer<typeof createShowcaseSchema>;
