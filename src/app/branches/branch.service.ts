import { CreateBranchDtoType } from "./branch.schema";
import { prisma } from "../../config/prisma";

export const branchService = {
  async createBranch(data: CreateBranchDtoType) {
    const { name, address, isActive } = data;

    return await prisma.branch.create({
      data: {
        name,
        address,
        isActive,
      },
    });
  },

  async getAllBranches() {
    const data = await prisma.branch.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return data;
  },

  async updateBranch(id: string, data: Partial<CreateBranchDtoType>) {
    const updateBranch = await prisma.branch.update({
      where: {
        id,
      },
      data: data,
    });

    return updateBranch;
  },

  async deleteBranch(id: string) {
    const deleteBranch = await prisma.branch.delete({
      where: {
        id,
      },
    });

    return deleteBranch;
  },

  async searchBranch(keyword: string) {
    const data = await prisma.branch.findMany({
      where: {
        name: {
          contains: keyword.trim(),
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
      },
    });
    return data;
  },
};
