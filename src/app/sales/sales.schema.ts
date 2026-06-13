import { z } from "zod";

export type GetSalesQuery = z.infer<typeof GetSalesQuerySchema>;

export const CreateSaleSchema = z.object({
  branchId: z.string().optional(), // owner kirim, karyawan tidak perlu
  customerName: z.string().min(1, "Nama pelanggan wajib diisi"),
  customerAddress: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive("Qty harus lebih dari 0"),
        discountAmount: z.number().min(0).optional(),
      }),
    )
    .min(1, "Transaksi harus memiliki minimal 1 item"),
});

export type CreateSaleDTO = z.infer<typeof CreateSaleSchema>;

export const GetSalesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    branchId: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    search: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    { message: "startDate tidak boleh lebih besar dari endDate" },
  );

export type GetSalesQueryDTO = z.infer<typeof GetSalesQuerySchema>;

export const GetSalesSummaryQuerySchema = z
  .object({
    branchId: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    { message: "startDate tidak boleh lebih besar dari endDate" },
  );

export const GetSalesSummaryMonthlyQuerySchema = z.object({
  branchId: z.string().optional(),
  last: z.coerce.number().int().min(1).max(24).optional().default(6),
});

export type GetSalesSummaryQueryDTO = z.infer<
  typeof GetSalesSummaryQuerySchema
>;
export type GetSalesSummaryMonthlyQueryDTO = z.infer<
  typeof GetSalesSummaryMonthlyQuerySchema
>;
