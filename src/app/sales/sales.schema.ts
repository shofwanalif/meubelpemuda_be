import { z } from "zod";

// ============================================================
// SCHEMA VALIDASI: CREATE SALE
// ============================================================

// Detail item saat input penjualan
export const SaleItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID diperlukan"),
  qty: z.number().positive("Jumlah harus lebih dari 0"),
});

export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;

// Schema untuk OWNER: bisa input penjualan di cabang manapun
export const OwnerCreateSaleSchema = z.object({
  branchId: z.string().min(1, "Branch ID diperlukan"),
  items: z
    .array(SaleItemInputSchema)
    .min(1, "Minimal ada 1 item dalam penjualan"),
  notes: z.string().optional().nullable(),
});

export type OwnerCreateSaleInput = z.infer<typeof OwnerCreateSaleSchema>;

// Schema untuk KARYAWAN: input penjualan hanya di cabangnya sendiri
export const KaryawanCreateSaleSchema = z.object({
  items: z
    .array(SaleItemInputSchema)
    .min(1, "Minimal ada 1 item dalam penjualan"),
  notes: z.string().optional().nullable(),
});

export type KaryawanCreateSaleInput = z.infer<typeof KaryawanCreateSaleSchema>;

// ============================================================
// SCHEMA VALIDASI: GET SALES (QUERY)
// ============================================================

export const GetSalesQuerySchema = z.object({
  branchId: z.string().optional(),
  startDate: z.string().optional(), // format: YYYY-MM-DD
  endDate: z.string().optional(), // format: YYYY-MM-DD
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export type GetSalesQuery = z.infer<typeof GetSalesQuerySchema>;
