import { prisma } from "../../config/prisma";
import { Decimal } from "../../../generated/prisma/internal/prismaNamespace";
import {
  CreateSaleDTO,
  GetSalesQueryDTO,
  GetSalesSummaryQueryDTO,
  GetSalesSummaryMonthlyQueryDTO,
} from "./sales.schema";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../helper/errors";

export const salesService = {
  async createSale(data: CreateSaleDTO, branchId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Validasi branch
      const branch = await tx.branch.findUnique({
        where: { id: branchId, deletedAt: null },
      });
      if (!branch) throw new NotFoundError("Cabang tidak ditemukan");

      // 2. Batch fetch semua produk sekaligus — hindari N+1
      const productIds = data.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          branchId,
          deletedAt: null,
        },
        include: {
          prices: {
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      });

      // 3. Pastikan semua produk ditemukan
      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundError(
          `Produk tidak ditemukan: ${missingIds.join(", ")}`,
        );
      }

      // 4. Map produk by id untuk akses cepat
      const productMap = new Map(products.map((p) => [p.id, p]));

      // 5. Validasi stok dan diskon
      for (const item of data.items) {
        const product = productMap.get(item.productId)!;

        if (product.stock < item.qty) {
          throw new BadRequestError(
            `Stok produk "${product.name}" tidak cukup. Stok tersedia: ${product.stock}`,
          );
        }

        if (product.prices.length === 0) {
          throw new BadRequestError(
            `Produk "${product.name}" belum memiliki harga`,
          );
        }

        // validasi diskon tidak melebihi total harga item
        if (item.discountAmount) {
          const activePrice = product.prices[0];
          const totalBeforeDiscount = activePrice!.sellPrice.times(item.qty);
          if (
            new Decimal(item.discountAmount).greaterThan(totalBeforeDiscount)
          ) {
            throw new BadRequestError(
              `Diskon produk "${product.name}" melebihi total harga item`,
            );
          }
        }
      }

      const sale = await tx.sale.create({
        data: {
          branchId,
          createdById: userId,
          notes: data.notes ?? null,
          saleDate: new Date(),
          customerName: data.customerName,
          customerAddress: data.customerAddress,
          customerPhone: data.customerPhone,
        },
      });

      // 7. Mapping saleItems
      const saleItemsData = data.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const activePrice = product.prices[0];

        const sellPrice = activePrice!.sellPrice;
        const costPrice = activePrice!.costPrice;
        const qty = new Decimal(item.qty);
        const discountAmount = new Decimal(item.discountAmount ?? 0);

        const totalSell = sellPrice.times(qty).minus(discountAmount);
        const grossProfit = totalSell.minus(costPrice.times(qty));

        return {
          saleId: sale.id,
          productId: item.productId,
          qty: item.qty,
          sellPriceSnapshot: sellPrice,
          costPriceSnapshot: costPrice,
          discountAmount,
          totalSell,
          grossProfit,
        };
      });

      await tx.saleItem.createMany({ data: saleItemsData });

      // 8. Decrement stok semua produk
      await Promise.all(
        data.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.qty } },
          }),
        ),
      );

      // 9. Return complete sale
      const completeSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      });

      const totalSell = saleItemsData.reduce(
        (sum, item) => sum.plus(item.totalSell),
        new Decimal(0),
      );

      return {
        id: completeSale!.id,
        saleDate: completeSale!.saleDate,
        notes: completeSale!.notes,
        createdAt: completeSale!.createdAt,
        customer: {
          name: completeSale!.customerName,
          address: completeSale!.customerAddress,
          phone: completeSale!.customerPhone,
        },
        branch: completeSale!.branch,
        createdBy: completeSale!.createdBy,
        totalSell,
        items: completeSale!.items.map(
          ({ saleId, productId, ...item }) => item,
        ),
      };
    });
  },

  async cancelSale(id: string, branchId: string | null) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) throw new NotFoundError("Transaksi tidak ditemukan");

      if (branchId && sale.branchId !== branchId) {
        throw new ForbiddenError("Transaksi tidak milik cabang ini");
      }

      if (sale.status === "CANCELLED") {
        throw new BadRequestError("Transaksi sudah dibatalkan");
      }

      const hoursDiff =
        (new Date().getTime() - new Date(sale.saleDate).getTime()) /
        (1000 * 60 * 60);

      if (hoursDiff > 24) {
        throw new BadRequestError(
          "Transaksi hanya bisa dibatalkan maksimal 24 jam setelah transaksi",
        );
      }

      // kembalikan stok semua item
      await Promise.all(
        sale.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.qty } },
          }),
        ),
      );

      return tx.sale.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    });
  },

  async getSales(branchId: string | null, query: GetSalesQueryDTO) {
    const page = query.page ?? 1;
    const pageSize = query.limit ?? 10;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(branchId && { branchId }),
      ...(query.branchId && !branchId && { branchId: query.branchId }),
      ...(query.search && {
        customerName: { contains: query.search },
      }),
      ...(query.startDate || query.endDate
        ? {
            saleDate: {
              ...(query.startDate && { gte: query.startDate }),
              ...(query.endDate && {
                lte: new Date(
                  new Date(query.endDate).setHours(23, 59, 59, 999),
                ),
              }),
            },
          }
        : {}),
      deletedAt: null,
    };

    const [data, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { saleDate: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          items: { select: { totalSell: true } }, // hanya untuk kalkulasi
        },
      }),
      prisma.sale.count({ where }),
    ]);

    const sales = data.map((sale) => {
      const totalSell = sale.items.reduce(
        (sum, item) => sum.plus(item.totalSell),
        new Decimal(0),
      );

      return {
        id: sale.id,
        saleDate: sale.saleDate,
        status: sale.status,
        notes: sale.notes,
        createdAt: sale.createdAt,
        customer: {
          name: sale.customerName,
          // address: sale.customerAddress,
          // phone: sale.customerPhone,
        },
        branch: sale.branch,
        createdBy: sale.createdBy,
        totalSell,
      };
    });

    return {
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / pageSize)),
        page_size: pageSize,
        total,
      },
      data: sales,
    };
  },

  async getSaleDetail(id: string, branchId: string | null) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!sale) throw new NotFoundError("Transaksi tidak ditemukan");

    if (branchId && sale.branchId !== branchId) {
      throw new ForbiddenError("Transaksi tidak milik cabang ini");
    }

    const totalSell = sale.items.reduce(
      (sum, item) => sum.plus(item.totalSell),
      new Decimal(0),
    );

    const totalGrossProfit = sale.items.reduce(
      (sum, item) => sum.plus(item.grossProfit),
      new Decimal(0),
    );

    return {
      id: sale.id,
      saleDate: sale.saleDate,
      status: sale.status,
      notes: sale.notes,
      createdAt: sale.createdAt,
      customer: {
        name: sale.customerName,
        address: sale.customerAddress,
        phone: sale.customerPhone,
      },
      branch: sale.branch,
      createdBy: sale.createdBy,
      totalSell,
      totalGrossProfit,
      items: sale.items.map(({ saleId, productId, ...item }) => item),
    };
  },

  async getSalesSummary(
    branchId: string | null,
    query: GetSalesSummaryQueryDTO,
  ) {
    const now = new Date();

    const startDate =
      query.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = query.endDate
      ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
      : now;

    const where = {
      saleDate: { gte: startDate, lte: endDate },
      ...(branchId && { branchId }),
      ...(!branchId && query.branchId && { branchId: query.branchId }),
      deletedAt: null,
    };

    const [totalTransaksi, totalTransaksiCancelled, itemsAggregate] =
      await prisma.$transaction([
        prisma.sale.count({
          where: { ...where, status: "COMPLETED" },
        }),
        prisma.sale.count({
          where: { ...where, status: "CANCELLED" },
        }),
        prisma.saleItem.aggregate({
          where: {
            sale: { ...where, status: "COMPLETED" },
          },
          _sum: {
            totalSell: true,
            grossProfit: true,
          },
        }),
      ]);

    return {
      period: {
        startDate,
        endDate,
      },
      totalTransaksi,
      totalTransaksiCancelled,
      totalRevenue: itemsAggregate._sum.totalSell ?? new Decimal(0),
      totalGrossProfit: itemsAggregate._sum.grossProfit ?? new Decimal(0),
    };
  },

  async getSalesSummaryMonthly(
    branchId: string | null,
    query: GetSalesSummaryMonthlyQueryDTO,
  ) {
    const now = new Date();
    const months = [];

    // generate N bulan terakhir
    for (let i = query.last - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth =
        i === 0
          ? now // bulan berjalan sampai hari ini
          : new Date(
              date.getFullYear(),
              date.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );

      months.push({ startOfMonth, endOfMonth });
    }

    const where = {
      ...(branchId && { branchId }),
      ...(!branchId && query.branchId && { branchId: query.branchId }),
      status: "COMPLETED" as const,
      deletedAt: null,
    };

    // query semua bulan sekaligus dalam satu transaction
    const results = await prisma.$transaction(
      months.map(({ startOfMonth, endOfMonth }) =>
        prisma.saleItem.aggregate({
          where: {
            sale: {
              ...where,
              saleDate: { gte: startOfMonth, lte: endOfMonth },
            },
          },
          _sum: {
            totalSell: true,
            grossProfit: true,
          },
        }),
      ),
    );

    return months.map(({ startOfMonth }, index) => ({
      period: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}`,
      totalRevenue: results[index]?._sum.totalSell ?? new Decimal(0),
      totalGrossProfit: results[index]?._sum.grossProfit ?? new Decimal(0),
    }));
  },

  // cuma butuh id untuk soft delete, karena data transaksi tidak boleh hilang.
  // alasan lain karena delete hanya bisa dilakukan oleh owner, jadi tidak perlu validasi branchId.
  async deleteSale(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id, deletedAt: null, status: "CANCELLED" },
    });

    if (!sale)
      throw new NotFoundError("Transaksi ini tidak berstatus dibatalkan");

    await prisma.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // VERSI LAIN MENGGUNAKAN TRANSACTION UNTUK MENGEMBALIKAN STOK PRODUK
    // return prisma.$transaction(async (tx) => {
    //   const sale = await tx.sale.findUnique({
    //     where: { id, deletedAt: null, status: "CANCELLED" },
    //     include: { items: true },
    //   });

    //   if (!sale)
    //     throw new NotFoundError("Transaksi ini tidak berstatus dibatalkan");

    //   await Promise.all(
    //     sale.items.map((item) =>
    //       tx.product.update({
    //         where: { id: item.productId },
    //         data: { stock: { increment: item.qty } },
    //       }),
    //     ),
    //   );

    //   return tx.sale.update({
    //     where: { id },
    //     data: { deletedAt: new Date() },
    //   });
    // });
  },
};
