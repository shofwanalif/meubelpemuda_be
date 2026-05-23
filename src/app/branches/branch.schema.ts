import { z } from "zod";

export const CreateBranchDto = z.object({
  name: z.string().min(1, "Nama cabang harus diisi"),
  address: z.string().min(1, "Alamat cabang harus diisi"),
  isActive: z.boolean().default(true),
});

export const UpdateBranchDto = CreateBranchDto.partial();

export type CreateBranchDtoType = z.infer<typeof CreateBranchDto>;
export type UpdateBranchDtoType = z.infer<typeof UpdateBranchDto>;
