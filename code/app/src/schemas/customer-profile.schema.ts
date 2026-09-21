import { z } from 'zod';

export const customerProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(\+84|0)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không đúng định dạng Việt Nam')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Email không đúng định dạng')
    .max(100, 'Email tối đa 100 ký tự')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z
    .string()
    .trim()
    .max(255, 'Địa chỉ không được vượt quá 255 ký tự')
    .optional()
    .or(z.literal('')),
});

export type CustomerProfileFormValues = z.infer<typeof customerProfileSchema>;

export const savedAddressSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Tên gợi nhớ không được để trống'), // Nhà riêng, Công ty, Studio...
  addressLine: z.string().min(5, 'Vui lòng nhập địa chỉ chi tiết'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().default(false),
});

export type SavedAddress = z.infer<typeof savedAddressSchema>;
