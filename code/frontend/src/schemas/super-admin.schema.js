import { z } from 'zod';

export const verifyCertificateSchema = z.object({
  certIndex: z.number().int().nonnegative().optional().default(0),
  imageUrl: z.string().optional(),
  isVerified: z.boolean({ required_error: 'Vui lòng chọn trạng thái phê duyệt' }),
  notes: z.string().optional(),
});

export const surgeRuleSchema = z.object({
  ruleName: z.string().trim().min(1, 'Tên quy tắc không được để trống').max(150, 'Tối đa 150 ký tự'),
  zoneCode: z.string().trim().default('ALL'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Định dạng giờ không hợp lệ (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Định dạng giờ không hợp lệ (HH:mm)'),
  applicableDaysOfWeek: z.string().optional().default(''),
  surgeMultiplier: z.number().min(1.0, 'Hệ số tối thiểu 1.00x').max(1.5, 'Hệ số tối đa 1.50x'),
  minDemandRatio: z.number().optional().default(1.0),
  isActive: z.boolean().default(true),
});
