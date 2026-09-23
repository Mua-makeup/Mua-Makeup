import { z } from 'zod';

export const createInstantBookingSchema = z.object({
  packageId: z.number().optional(),
  destinationAddress: z
    .string({ required_error: 'Vui lòng nhập địa chỉ đón thợ.' })
    .min(5, 'Địa chỉ quá ngắn.')
    .max(500, 'Địa chỉ không được vượt quá 500 ký tự.'),
  destinationLatitude: z.number().min(-90).max(90),
  destinationLongitude: z.number().min(-180).max(180),
  note: z.string().max(500).optional(),
});

export type CreateInstantBookingPayload = z.infer<typeof createInstantBookingSchema>;
