import { z } from 'zod';

export const packageItemSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(2, 'Tên bước thực hiện phải có ít nhất 2 ký tự')
    .max(150, 'Tên bước không được vượt quá 150 ký tự'),
  itemType: z.enum(['COMPONENT', 'ADD_ON', 'INCLUDED', 'OPTIONAL_ADDON'], {
    required_error: 'Vui lòng chọn loại bước dịch vụ',
  }),
  itemPrice: z.coerce
    .number()
    .min(0, 'Giá tiền không được nhỏ hơn 0 VNĐ')
    .default(0),
  durationMinutes: z.coerce
    .number()
    .min(0, 'Thời lượng không được nhỏ hơn 0 phút')
    .default(15),
  stepOrder: z.coerce
    .number()
    .min(1, 'Thứ tự thực hiện phải từ 1 trở lên')
    .default(1),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type PackageItemFormValues = z.infer<typeof packageItemSchema>;

export const createPackageSchema = z.object({
  masterCategoryId: z.coerce
    .number({ invalid_type_error: 'Vui lòng chọn danh mục gốc' })
    .min(1, 'Vui lòng chọn danh mục gốc cho gói dịch vụ'),
  packageName: z
    .string()
    .trim()
    .min(3, 'Tên gói dịch vụ phải có ít nhất 3 ký tự')
    .max(150, 'Tên gói dịch vụ không được vượt quá 150 ký tự'),
  price: z.coerce
    .number({ invalid_type_error: 'Vui lòng nhập giá niêm yết hợp lệ' })
    .min(50000, 'Giá niêm yết tối thiểu là 50.000 VNĐ'),
  estimatedDurationMinutes: z.coerce
    .number({ invalid_type_error: 'Vui lòng nhập thời lượng ước tính' })
    .min(30, 'Thời lượng tối thiểu là 30 phút')
    .max(600, 'Thời lượng không được vượt quá 10 tiếng'),
  description: z
    .string()
    .trim()
    .max(1000, 'Mô tả chi tiết không được vượt quá 1000 ký tự')
    .optional()
    .or(z.literal('')),
  styleIds: z
    .array(z.number())
    .min(1, 'Vui lòng chọn ít nhất 1 phong cách makeup phù hợp'),
  coverImageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
});

export type CreatePackageFormValues = z.infer<typeof createPackageSchema>;
