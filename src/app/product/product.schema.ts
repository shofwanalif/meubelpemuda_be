import { z } from "zod";

const PriceEntrySchema = z.object({
  branchId: z.string().nullable().optional(), // null atau undefined = harga global
  costPrice: z.number().positive("Harga modal harus lebih dari 0"),
  sellPrice: z.number().positive("Harga jual harus lebih dari 0"),
});

// Owner: bisa set banyak harga sekaligus (global dan/atau per cabang)
export const OwnerCreateProductSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi"),
  description: z.string().optional(),
  unit: z.string().default("pcs"),
  prices: z.array(PriceEntrySchema).min(1, "Minimal harus ada 1 harga"),
});

// Karyawan: hanya bisa set harga untuk cabangnya sendiri (branchId dari middleware)
export const KaryawanCreateProductSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi"),
  description: z.string().optional(),
  unit: z.string().default("pcs"),
  costPrice: z.number().positive("Harga modal harus lebih dari 0"),
  sellPrice: z.number().positive("Harga jual harus lebih dari 0"),
});

// ── UPDATE ──────────────────────────────────────────────

const ProductInfoPartial = z.object({
  name: z.string().min(1, "Nama produk harus diisi").optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
});

export const OwnerUpdateProductSchema = ProductInfoPartial.extend({
  prices: z.array(PriceEntrySchema).min(1).optional(),
}).refine(
  (data) => {
    const hasInfo =
      data.name !== undefined ||
      data.description !== undefined ||
      data.unit !== undefined;
    const hasPrices = data.prices !== undefined && data.prices.length > 0;
    return hasInfo || hasPrices;
  },
  { message: "Minimal update satu field: info produk atau harga" },
);

export const KaryawanUpdateProductSchema = ProductInfoPartial.extend({
  costPrice: z.number().positive("Harga modal harus lebih dari 0").optional(),
  sellPrice: z.number().positive("Harga jual harus lebih dari 0").optional(),
})
  .refine(
    (data) => {
      const hasPartialPrice =
        data.costPrice !== undefined || data.sellPrice !== undefined;
      const hasBothPrice =
        data.costPrice !== undefined && data.sellPrice !== undefined;
      return !hasPartialPrice || hasBothPrice;
    },
    { message: "costPrice dan sellPrice harus diisi bersama" },
  )
  .refine(
    (data) => {
      const hasInfo =
        data.name !== undefined ||
        data.description !== undefined ||
        data.unit !== undefined;
      const hasPrices =
        data.costPrice !== undefined && data.sellPrice !== undefined;
      return hasInfo || hasPrices;
    },
    { message: "Minimal update satu field: info produk atau harga" },
  );

// ── GET (pagination query params) ─────────────────────

export const GetProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type GetProductsQueryDTO = z.infer<typeof GetProductsQuerySchema>;

export type OwnerCreateProductDTO = z.infer<typeof OwnerCreateProductSchema>;
export type KaryawanCreateProductDTO = z.infer<
  typeof KaryawanCreateProductSchema
>;
export type OwnerUpdateProductDTO = z.infer<typeof OwnerUpdateProductSchema>;
export type KaryawanUpdateProductDTO = z.infer<
  typeof KaryawanUpdateProductSchema
>;
