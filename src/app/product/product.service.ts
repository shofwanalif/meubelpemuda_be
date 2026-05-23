import { tr } from "zod/locales";
import { prisma } from "../../config/prisma";

export type PriceInput = {
  branchId?: string | null | undefined;
  costPrice: number;
  sellPrice: number;
};

type CreateProductInput = {
  name: string;
  description?: string | null | undefined;
  unit?: string | undefined;
  prices: PriceInput[];
};

export type ProductInfoUpdate = {
  name?: string;
  description?: string | null;
  unit?: string;
};

export type UpdateProductInput = {
  productInfo?: ProductInfoUpdate;
  prices?: PriceInput[];
};

export const productService = {
  async createProduct(data: CreateProductInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Buat produk dulu
      const product = await tx.product.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          unit: data.unit ?? "pcs",
        },
      });

      // 2. Buat semua harga sekaligus (global dan/atau per cabang)
      await tx.productPrice.createMany({
        data: data.prices.map((p) => ({
          productId: product.id,
          branchId: p.branchId ?? null, // null = harga global
          costPrice: p.costPrice,
          sellPrice: p.sellPrice,
          updatedById: userId,
        })),
      });

      // 3. Return produk lengkap beserta harganya
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          prices: {
            include: {
              branch: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
    });
  },

  async updateProduct(
    productId: string,
    input: UpdateProductInput,
    userId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Pastikan produk ada
      const existing = await tx.product.findUnique({
        where: { id: productId, deletedAt: null },
      });
      if (!existing) throw new Error("Produk tidak ditemukan");

      // 2. Update info produk — hanya field yang tidak undefined
      if (input.productInfo !== undefined) {
        const info = input.productInfo;
        const updateData: {
          name?: string;
          description?: string | null;
          unit?: string;
        } = {};
        if (info.name !== undefined) updateData.name = info.name;
        if (info.description !== undefined)
          updateData.description = info.description;
        if (info.unit !== undefined) updateData.unit = info.unit;

        if (Object.keys(updateData).length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: updateData,
          });
        }
      }

      // 3. Buat record harga BARU — bukan update existing (price history)
      // if (input.prices !== undefined && input.prices.length > 0) {
      //   await tx.productPrice.createMany({
      //     data: input.prices.map((p) => ({
      //       productId,
      //       branchId: p.branchId ?? null,
      //       costPrice: p.costPrice,
      //       sellPrice: p.sellPrice,
      //       updatedById: userId,
      //     })),
      //   });
      // }
      if (input.prices !== undefined && input.prices.length > 0) {
        for (const p of input.prices) {
          const latestPrice = await tx.productPrice.findFirst({
            where: {
              productId,
              branchId: p.branchId ?? null,
            },
            orderBy: { effectiveFrom: "desc" },
          });

          // Skip kalau harga tidak berubah
          if (
            latestPrice &&
            latestPrice.costPrice.toNumber() === p.costPrice &&
            latestPrice.sellPrice.toNumber() === p.sellPrice
          ) {
            continue;
          }

          await tx.productPrice.create({
            data: {
              productId,
              branchId: p.branchId ?? null,
              costPrice: p.costPrice,
              sellPrice: p.sellPrice,
              updatedById: userId,
            },
          });
        }
      }

      // 4. Kembalikan produk lengkap, harga terbaru di atas
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          prices: {
            orderBy: { effectiveFrom: "desc" },
            include: {
              branch: { select: { id: true, name: true } },
            },
          },
        },
      });
    });
  },

  async deleteProduct(productId: string) {
    const existing = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
    });

    if (!existing) throw new Error("Produk tidak ditemukan");

    // Soft delete — ProductPrice TIDAK ikut terhapus karena ini bukan physical delete
    // onDelete: Cascade hanya berlaku jika product.delete() dipanggil (physical delete)
    return prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async deactivateProduct(productId: string) {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) throw new Error("Produk tidak ditemukan");

    return prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  },

  async activateProduct(productId: string) {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) throw new Error("Produk tidak ditemukan");

    return prisma.product.update({
      where: { id: productId },
      data: { isActive: true },
    });
  },

  async getProducts(
    params:
      | { role: "owner"; page: number; pageSize: number; search?: string }
      | {
          role: "karyawan";
          page: number;
          pageSize: number;
          branchId: string;
          search?: string;
        },
  ) {
    const { page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    if (params.role === "owner") {
      const where: {
        deletedAt: null;
        name?: { contains: string };
      } = { deletedAt: null };
      if (params.search) {
        where.name = { contains: params.search };
      }

      const [total, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            prices: {
              orderBy: { effectiveFrom: "desc" },
              include: {
                branch: { select: { id: true, name: true } },
              },
            },
          },
        }),
      ]);

      // Deduplicate: ambil harga terbaru per branchId saja (bukan full history)
      const data = products.map((product) => {
        const seen = new Set<string | null>();
        const currentPrices = product.prices.filter((p) => {
          if (seen.has(p.branchId)) return false;
          seen.add(p.branchId);
          return true;
        });
        return { ...product, prices: currentPrices };
      });

      return {
        meta: {
          current_page: page,
          last_page: Math.max(1, Math.ceil(total / pageSize)),
          page_size: pageSize,
          total,
        },
        data,
      };
    }

    // role === "karyawan"
    const { branchId } = params;
    const where: {
      deletedAt: null;
      isActive: true;
      name?: { contains: string };
    } = { deletedAt: null, isActive: true };
    if (params.search) {
      where.name = { contains: params.search };
    }

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          prices: {
            where: {
              // ambil harga cabang sendiri + harga global sebagai fallback
              OR: [{ branchId }, { branchId: null }],
            },
            orderBy: { effectiveFrom: "desc" },
          },
        },
      }),
    ]);

    const data = products.map((product) => {
      const { prices, ...rest } = product;

      // Harga cabang spesifik lebih prioritas dari harga global
      const branchPrice = prices.find((p) => p.branchId === branchId);
      const globalPrice = prices.find((p) => p.branchId === null);
      const effective = branchPrice ?? globalPrice ?? null;

      return {
        ...rest,
        price: effective
          ? {
              costPrice: effective.costPrice,
              sellPrice: effective.sellPrice,
              // info apakah harga ini spesifik cabang atau fallback global
              source: branchPrice ? ("branch" as const) : ("global" as const),
            }
          : null,
      };
    });

    return {
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / pageSize)),
        page_size: pageSize,
        total,
      },
      data,
    };
  },

  // simpan buat fitur history harga
  // async getProductById(productId: string) {
  //   return prisma.product.findUnique({
  //     where: { id: productId },
  //     include: {
  //       prices: {
  //         orderBy: {
  //           effectiveFrom: "desc",
  //         },
  //         include: {
  //           branch: { select: { id: true, name: true } },
  //         },
  //       },
  //     },
  //   });
  // },
};
