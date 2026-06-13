import { z } from "zod";

export const CreateProductSchema = z.object({
  branchId: z.string().optional(),
  name: z.string().min(1, "Nama produk wajib diisi"),
  description: z.string().optional(),
  stock: z.number().int().positive("Stock harus lebih dari 0"),
  categoryId: z.string().min(1, "Kategori harus diisi"),
  costPrice: z.number().positive("Harga modal harus lebih dari 0"),
  sellPrice: z.number().positive("Harga jual harus lebih dari 0"),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z
  .object({
    branchId: z.string().optional(),
    name: z.string().min(1, "Nama produk wajib diisi").optional(),
    description: z.string().optional(),
    stock: z.number().int().positive("Stock harus lebih dari 0").optional(),
    categoryId: z.string().optional(),
    costPrice: z.number().positive("Harga modal harus lebih dari 0").optional(),
    sellPrice: z.number().positive("Harga jual harus lebih dari 0").optional(),
  })
  .refine(
    (data) => {
      // costPrice dan sellPrice harus dikirim bersamaan
      const hasOne =
        data.costPrice !== undefined || data.sellPrice !== undefined;
      const hasBoth =
        data.costPrice !== undefined && data.sellPrice !== undefined;
      return !hasOne || hasBoth;
    },
    { message: "costPrice dan sellPrice harus diisi bersamaan" },
  );

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

export const GetProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  branchId: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  lowStock: z.coerce.number().int().optional(),
});

export type GetProductsQueryDTO = z.infer<typeof GetProductsQuerySchema>;
