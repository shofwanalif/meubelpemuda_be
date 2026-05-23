import { prisma } from "../../config/prisma";
import { Decimal } from "../../../generated/prisma/internal/prismaNamespace";
import {
  KaryawanCreateSaleInput,
  OwnerCreateSaleInput,
  SaleItemInput,
} from "./sales.schema";
import { meta } from "zod/v4/core";

// ============================================================
// TYPES
// ============================================================

type CreateSaleInput = {
  branchId: string;
  items: SaleItemInput[];
  notes?: string | null;
};

type GetSalesFilter = {
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
};

// ============================================================
// HELPER: Get current product price at branch or global
// ============================================================

async function getCurrentProductPrice(
  productId: string,
  branchId: string,
  tx: any, // Prisma transaction client
) {
  // Try to get branch-specific price first
  const branchPrice = await tx.productPrice.findFirst({
    where: {
      productId,
      branchId,
      effectiveFrom: { lte: new Date() },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (branchPrice) {
    return {
      costPrice: branchPrice.costPrice,
      sellPrice: branchPrice.sellPrice,
    };
  }

  // Fall back to global price (branchId = null)
  const globalPrice = await tx.productPrice.findFirst({
    where: {
      productId,
      branchId: null,
      effectiveFrom: { lte: new Date() },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (globalPrice) {
    return {
      costPrice: globalPrice.costPrice,
      sellPrice: globalPrice.sellPrice,
    };
  }

  throw new Error(`Harga untuk produk ${productId} tidak ditemukan`);
}

// HELPER: Validate user authorization for branch

async function validateUserBranchAccess(
  userId: string,
  branchId: string,
  userRole: string,
  tx: any, // Prisma transaction client
) {
  // Owner bisa input penjualan di cabang manapun
  if (userRole === "owner") {
    return;
  }

  // Karyawan hanya bisa input di cabang mereka sendiri
  if (userRole === "karyawan") {
    const employeeBranch = await tx.employeeBranch.findUnique({
      where: { userId },
    });

    if (!employeeBranch) {
      throw new Error("Karyawan belum di-assign ke cabang");
    }

    if (employeeBranch.branchId !== branchId) {
      throw new Error(
        "Karyawan tidak memiliki akses untuk input penjualan di cabang ini",
      );
    }
  }
}

export const salesService = {
  async createSale(input: CreateSaleInput, userId: string, userRole: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Validate user has access to this branch
      await validateUserBranchAccess(userId, input.branchId, userRole, tx);

      // 2. Validate branch exists
      const branch = await tx.branch.findUnique({
        where: { id: input.branchId },
      });

      if (!branch) {
        throw new Error("Cabang tidak ditemukan");
      }

      // 3. Validate all products exist and get current prices
      const productPrices: Record<
        string,
        { costPrice: Decimal; sellPrice: Decimal }
      > = {};

      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, deletedAt: null },
        });

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        const price = await getCurrentProductPrice(
          item.productId,
          input.branchId,
          tx,
        );

        productPrices[item.productId] = price;
      }

      // 4. Create Sale header (transaksi utama)
      const sale = await tx.sale.create({
        data: {
          branchId: input.branchId,
          createdById: userId,
          notes: input.notes ?? null,
          saleDate: new Date(),
        },
      });

      // 5. Create Sale Items dengan harga snapshot dan gross profit
      const saleItems = input.items.map((item) => {
        const price = productPrices[item.productId];
        const costPrice = price!.costPrice;
        const sellPrice = price!.sellPrice;
        const qty = item.qty;

        // Calculate gross profit: (sellPrice - costPrice) * qty
        const grossProfit = sellPrice.minus(costPrice).times(qty);

        const totalSell = sellPrice.times(item.qty);

        return {
          saleId: sale.id,
          productId: item.productId,
          qty,
          sellPriceSnapshot: sellPrice,
          costPriceSnapshot: costPrice,
          grossProfit,
          totalSell,
        };
      });

      await tx.saleItem.createMany({
        data: saleItems,
      });

      const totalSell = saleItems.reduce(
        (sum, item) => sum + Number(item.totalSell),
        0,
      );

      // 6. Return complete sale with items
      const completeSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          branch: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
      });

      return {
        id: completeSale!.id,
        saleDate: completeSale!.saleDate,
        notes: completeSale!.notes,
        createdAt: completeSale!.createdAt,
        branch: completeSale!.branch,
        createdBy: completeSale!.createdBy,
        items: completeSale!.items.map(
          ({ productId, saleId, ...item }) => item,
        ),
        totalSell,
      };
    });
  },

  // Get Sales List with filtering and pagination
  // async getSales(filter: GetSalesFilter, userRole: string, userId: string) {
  //   const where: any = {};

  //   // If karyawan, only show sales from their branch
  //   if (userRole === "karyawan") {
  //     const employeeBranch = await prisma.employeeBranch.findUnique({
  //       where: { userId },
  //     });

  //     if (!employeeBranch) {
  //       throw new Error("Karyawan belum di-assign ke cabang");
  //     }

  //     where.branchId = employeeBranch.branchId;
  //   } else if (filter.branchId) {
  //     // Owner bisa filter by branchId
  //     where.branchId = filter.branchId;
  //   }

  //   // Filter by date range
  //   if (filter.startDate) {
  //     where.saleDate = { gte: filter.startDate };
  //   }

  //   if (filter.endDate) {
  //     if (where.saleDate) {
  //       where.saleDate.lte = filter.endDate;
  //     } else {
  //       where.saleDate = { lte: filter.endDate };
  //     }
  //   }

  //   // Get total count for pagination
  //   const total = await prisma.sale.count({ where });

  //   // Get paginated results
  //   const sales = await prisma.sale.findMany({
  //     where,
  //     include: {
  //       branch: {
  //         select: { id: true, name: true },
  //       },
  //       createdBy: {
  //         select: { id: true, name: true, email: true },
  //       },
  //       items: {
  //         include: {
  //           product: {
  //             select: { id: true, name: true, unit: true },
  //           },
  //         },
  //       },
  //     },
  //     orderBy: { saleDate: "desc" },
  //     skip: (filter.page - 1) * filter.limit,
  //     take: filter.limit,
  //   });

  //   return {
  //     data: sales.map((sale) => ({
  //       id: sale.id,
  //       saleDate: sale.saleDate,
  //       notes: sale.notes,
  //       createdAt: sale.createdAt,
  //       branch: sale.branch,
  //       createdBy: sale.createdBy,
  //       items: sale.items.map(({ productId, saleId, ...item }) => item),
  //     })),
  //     meta: {
  //       current_page: filter.page,
  //       last_page: Math.ceil(total / filter.limit),
  //       page_size: filter.limit,
  //       total,
  //     },
  //   };
  // },

  async getSales(filter: GetSalesFilter, userRole: string, userId: string) {
    const where: any = {};

    if (userRole === "karyawan") {
      const employeeBranch = await prisma.employeeBranch.findUnique({
        where: { userId },
      });
      if (!employeeBranch) {
        throw new Error("Karyawan belum di-assign ke cabang");
      }
      where.branchId = employeeBranch.branchId;
    } else if (filter.branchId) {
      where.branchId = filter.branchId;
    }

    if (filter.startDate) {
      where.saleDate = { gte: filter.startDate };
    }
    if (filter.endDate) {
      if (where.saleDate) {
        where.saleDate.lte = filter.endDate;
      } else {
        where.saleDate = { lte: filter.endDate };
      }
    }

    const total = await prisma.sale.count({ where });

    const sales = await prisma.sale.findMany({
      where,
      include: {
        branch: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            totalSell: true,
            grossProfit: true,
          },
        },
      },
      orderBy: { saleDate: "desc" },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });

    return {
      data: sales.map((sale) => {
        // Hitung aggregate dari items
        const totalSell = sale.items.reduce(
          (sum, item) => sum + Number(item.totalSell),
          0,
        );
        const grossProfit = sale.items.reduce(
          (sum, item) => sum + Number(item.grossProfit),
          0,
        );

        return {
          id: sale.id,
          saleDate: sale.saleDate,
          notes: sale.notes,
          createdAt: sale.createdAt,
          branch: sale.branch,
          createdBy: sale.createdBy,
          totalSell,
          grossProfit,
          itemCount: sale.items.length,
        };
      }),
      meta: {
        current_page: filter.page,
        last_page: Math.ceil(total / filter.limit),
        page_size: filter.limit,
        total,
      },
    };
  },

  // Get Sale Detail by ID
  async getSaleById(saleId: string, userRole: string, userId: string) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        branch: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new Error("Data penjualan tidak ditemukan");
    }

    // Validate access: karyawan only see sales from their branch
    if (userRole === "karyawan") {
      const employeeBranch = await prisma.employeeBranch.findUnique({
        where: { userId },
      });

      if (!employeeBranch || employeeBranch.branchId !== sale.branchId) {
        throw new Error("Anda tidak memiliki akses ke data penjualan ini");
      }
    }

    return {
      id: sale.id,
      saleDate: sale.saleDate,
      notes: sale.notes,
      createdAt: sale.createdAt,
      branch: sale.branch,
      createdBy: sale.createdBy,
      items: sale.items.map(({ productId, saleId, ...item }) => ({
        ...item,
        qty: Number(item.qty),
        sellPriceSnapshot: Number(item.sellPriceSnapshot),
        costPriceSnapshot: Number(item.costPriceSnapshot),
        totalSell: item.totalSell ? Number(item.totalSell) : null,
        grossProfit: Number(item.grossProfit),
      })),
    };
  },

  // Get Sales Summary (total items, total gross profit, etc)
  async getSalesSummary(
    filter: GetSalesFilter,
    userRole: string,
    userId: string,
  ) {
    const where: any = {};

    // If karyawan, only show sales from their branch
    if (userRole === "karyawan") {
      const employeeBranch = await prisma.employeeBranch.findUnique({
        where: { userId },
      });

      if (!employeeBranch) {
        throw new Error("Karyawan belum di-assign ke cabang");
      }

      where.branchId = employeeBranch.branchId;
    } else if (filter.branchId) {
      // Owner bisa filter by branchId
      where.branchId = filter.branchId;
    }

    // Filter by date range
    if (filter.startDate) {
      where.saleDate = { gte: filter.startDate };
    }

    if (filter.endDate) {
      if (where.saleDate) {
        where.saleDate.lte = filter.endDate;
      } else {
        where.saleDate = { lte: filter.endDate };
      }
    }

    const summary = await prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: {
        qty: true,
        sellPriceSnapshot: true,
        costPriceSnapshot: true,
        grossProfit: true,
      },
    });

    const totalSales = await prisma.sale.count({ where });

    return {
      totalSales,
      totalItems: summary._sum.qty ?? 0,
      totalRevenue: summary._sum.sellPriceSnapshot ?? 0,
      totalCost: summary._sum.costPriceSnapshot ?? 0,
      totalGrossProfit: summary._sum.grossProfit ?? 0,
    };
  },
};
