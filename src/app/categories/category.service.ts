import { prisma } from "../../config/prisma";
import {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  GetCategoryFilterDTO,
} from "./category.schema";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../helper/errors";

export const categoryService = {
  async createCategory(data: CreateCategoryDTO, branchId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundError("Cabang tidak ditemukan");
    }

    return await prisma.category.create({
      data: {
        name: data.name,
        branchId: branchId,
      },
    });
  },

  async updateCategory(
    id: string,
    data: UpdateCategoryDTO,
    branchId: string | null,
  ) {
    const category = await prisma.category.findUnique({
      where: { id: id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundError("Kategori tidak ditemukan");
    }

    if (branchId && category.branchId !== branchId) {
      throw new ForbiddenError("Kategori tidak milik cabang ini");
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        name: data.name,
        branchId: category.branchId,
        deletedAt: null,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictError("Kategori sudah ada");
    }

    return await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
      },
    });
  },

  async deleteCategory(id: string, branchId: string | null) {
    const category = await prisma.category.findUnique({
      where: { id: id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundError("Kategori tidak ditemukan");
    }

    if (branchId && category.branchId !== branchId) {
      throw new ForbiddenError("Kategori tidak milik cabang ini");
    }

    return await prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  },

  async getCategories(filter: GetCategoryFilterDTO) {
    const where = {
      deletedAt: null,
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
    };

    const total = await prisma.category.count({ where });

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        branch: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });

    return {
      data: categories,
      meta: {
        current_page: filter.page,
        last_page: Math.ceil(total / filter.limit),
        page_size: filter.limit,
        total,
      },
    };
  },
};
