import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori harus diisi"),
  branchId: z.string().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori harus diisi"),
});

export const GetCategoryFilter = z.object({
  branchId: z.string().nullish(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
});

export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof UpdateCategorySchema>;
export type GetCategoryFilterDTO = z.infer<typeof GetCategoryFilter>;
