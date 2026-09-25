import { z } from 'zod';

export const loginSchema = z.object({
  loginIdentifier: z
    .string()
    .min(1, 'Vui lòng nhập số điện thoại hoặc email đăng nhập'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải chứa ít nhất 6 ký tự'),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const agencyRegisterSchema = z
  .object({
    fullName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự').max(100),
    phoneNumber: z
      .string()
      .regex(/^(0|\+84)(\d{9})$/, 'Số điện thoại không đúng định dạng (VD: 0912345678)'),
    email: z.string().email('Email không đúng định dạng'),
    password: z
      .string()
      .min(8, 'Mật khẩu tối thiểu 8 ký tự')
      .regex(
        /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$/,
        'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    accountType: z.enum(['AGENCY_ADMIN', 'FREELANCER_MUA', 'CUSTOMER']),
    agencyName: z.string().optional(),
    hotline: z.string().optional(),
    addressStreet: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    commissionRateInternal: z.number().min(0).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.accountType === 'AGENCY_ADMIN') {
        return !!data.agencyName && data.agencyName.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Vui lòng nhập tên Studio / Đại lý',
      path: ['agencyName'],
    },
  )
  .refine(
    (data) => {
      if (data.accountType === 'AGENCY_ADMIN') {
        return !!data.hotline && data.hotline.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Vui lòng nhập hotline Studio',
      path: ['hotline'],
    },
  )
  .refine(
    (data) => {
      if (data.accountType === 'AGENCY_ADMIN') {
        return !!data.addressStreet && data.addressStreet.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Vui lòng nhập địa chỉ số nhà & tên đường',
      path: ['addressStreet'],
    },
  )
  .refine(
    (data) => {
      if (data.accountType === 'AGENCY_ADMIN') {
        return !!data.district && data.district.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Vui lòng nhập Quận / Huyện',
      path: ['district'],
    },
  )
  .refine(
    (data) => {
      if (data.accountType === 'AGENCY_ADMIN') {
        return !!data.city && data.city.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Vui lòng nhập Tỉnh / Thành Phố',
      path: ['city'],
    },
  );

export const userProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Họ và tên tối thiểu 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự'),
  email: z.string().email('Email không đúng định dạng').max(100, 'Email tối đa 100 ký tự'),
  gender: z.string().optional(),
});
