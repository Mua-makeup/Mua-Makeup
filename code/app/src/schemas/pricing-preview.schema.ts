import { z } from 'zod';

export const previewInvoiceSchema = z.object({
  packageId: z.number(),
  providerId: z.number(),
  providerType: z.enum(['FREELANCER', 'AGENCY']),
  bookingTime: z.string(),
  customerLatitude: z.number().min(-90).max(90),
  customerLongitude: z.number().min(-180).max(180),
  addOnItemIds: z.array(z.number()).optional(),
  voucherCode: z.string().optional(),
});

export type PreviewInvoicePayload = z.infer<typeof previewInvoiceSchema>;
