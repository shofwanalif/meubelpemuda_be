import { prisma } from "../../config/prisma";
import {
  CreateProductDTO,
  UpdateProductDTO,
  GetProductsQueryDTO,
} from "./product.schema";
import { NotFoundError, ForbiddenError } from "../../helper/errors";

export const productService = {
  async createProduct(
    data: CreateProductDTO,
    branchId: string,
    userId: string,
  ) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundError("Cabang tidak ditemukan");
    }

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundError("Kategori tidak ditemukan");
    }

    if (category.branchId !== branchId) {
      throw new ForbiddenError("Kategori tidak milik cabang ini");
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          branchId,
          stock: data.stock,
          categoryId: data.categoryId,
        },
      });

      await tx.productPrice.create({
        data: {
          productId: product.id,
          costPrice: data.costPrice,
          sellPrice: data.sellPrice,
          updatedById: userId,
        },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          prices: true,
          branch: { select: { id: true, name: true } },
        },
      });
    });
  },

  async updateProduct(
    id: string,
    data: UpdateProductDTO,
    branchId: string | null,
    userId: string,
  ) {
    const product = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) throw new NotFoundError("Produk tidak ditemukan");

    if (branchId && product.branchId !== branchId) {
      throw new ForbiddenError("Produk tidak milik cabang ini");
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId, deletedAt: null },
      });

      if (!category) throw new NotFoundError("Kategori tidak ditemukan");

      // pakai branchId dari product, bukan parameter
      if (category.branchId !== product.branchId) {
        throw new ForbiddenError("Kategori tidak milik cabang ini");
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.categoryId && { categoryId: data.categoryId }),
        },
      });

      if (data.costPrice !== undefined && data.sellPrice !== undefined) {
        await tx.productPrice.create({
          data: {
            productId: id,
            costPrice: data.costPrice,
            sellPrice: data.sellPrice,
            updatedById: userId,
          },
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          prices: {
            orderBy: { effectiveFrom: "desc" },
            take: 1, // hanya kembalikan harga terbaru
          },
          branch: { select: { id: true, name: true } },
        },
      });
    });
  },

  async deleteProduct(id: string, branchId: string | null) {
    const product = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) throw new NotFoundError("Produk tidak ditemukan");

    if (branchId && product.branchId !== branchId) {
      throw new ForbiddenError("Produk tidak milik cabang ini");
    }

    return await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async getProducts(branchId: string | null, query: GetProductsQueryDTO) {
    const page = query.page ?? 1;
    const pageSize = query.limit ?? 10;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(branchId && { branchId }),
      ...(query.branchId && !branchId && { branchId: query.branchId }), // owner filter
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        name: { contains: query.search },
      }),
      ...(query.lowStock !== undefined && {
        stock: { lte: query.lowStock },
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          prices: {
            select: {
              id: true,
              costPrice: true,
              sellPrice: true,
              effectiveFrom: true,
            },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // reshape prices array jadi activePrice
    const products = data.map((product) => {
      const { prices, branchId, categoryId, ...rest } = product;
      return {
        ...rest,
        activePrice: prices[0] ?? null,
        branch: product.branch,
        category: product.category,
      };
    });

    return {
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / pageSize)),
        page_size: pageSize,
        total,
      },
      data: products,
    };
  },

  async getProductById(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: {
        branch: {
          select: { id: true, name: true, address: true },
        },
        category: {
          select: { id: true, name: true, isActive: true },
        },
        prices: {
          orderBy: { effectiveFrom: "desc" },
          include: {
            updatedBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError("Produk tidak ditemukan");
    }

    return product;
  },
};
