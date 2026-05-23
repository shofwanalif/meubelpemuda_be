import { Request, Response } from "express";
import { logger } from "../../config/logging";
import { salesService } from "./sales.service";
import {
  OwnerCreateSaleSchema,
  KaryawanCreateSaleSchema,
  GetSalesQuerySchema,
} from "./sales.schema";
import { meta } from "zod/v4/core";

export const salesController = {
  // ============================================================
  // CREATE SALE (POST)
  // ============================================================

  async createSale(req: Request, res: Response) {
    try {
      const user = (req as any).session.user;
      const role = user.role;

      if (role === "owner") {
        // OWNER: validate dengan schema yang memerlukan branchId
        const result = OwnerCreateSaleSchema.safeParse(req.body);
        if (!result.success) {
          logger.error(result.error.flatten().fieldErrors);
          return res.status(400).json({
            error: "Validation Error",
            details: result.error.flatten().fieldErrors,
          });
        }

        const { branchId, items, notes } = result.data;

        try {
          const sale = await salesService.createSale(
            { branchId, items, notes },
            user.id,
            role,
          );

          return res.status(201).json({
            message: "Penjualan berhasil dibuat",
            data: sale,
          });
        } catch (error) {
          logger.error("Create Sale Error (Owner)", {
            message: (error as Error).message,
            userId: user.id,
          });
          return res.status(400).json({
            error: "Failed to create sale",
            message: (error as Error).message,
          });
        }
      }

      if (role === "karyawan") {
        // KARYAWAN: validate dengan schema tanpa branchId (akan diambil dari middleware)
        const result = KaryawanCreateSaleSchema.safeParse(req.body);
        if (!result.success) {
          logger.error(result.error.flatten().fieldErrors);
          return res.status(400).json({
            error: "Validation Error",
            details: result.error.flatten().fieldErrors,
          });
        }

        const { items, notes } = result.data;

        // branchId sudah di-inject oleh middleware requireAssignedBranchForKaryawan
        const employeeBranch = (req as any).employeeBranch;
        const branchId = employeeBranch.branchId;

        try {
          const sale = await salesService.createSale(
            { branchId, items, notes },
            user.id,
            role,
          );

          return res.status(201).json({
            message: "Penjualan berhasil dibuat",
            data: sale,
          });
        } catch (error) {
          logger.error("Create Sale Error (Karyawan)", {
            message: (error as Error).message,
            userId: user.id,
          });
          return res.status(400).json({
            error: "Failed to create sale",
            message: (error as Error).message,
          });
        }
      }

      return res.status(403).json({ error: "Invalid role" });
    } catch (error) {
      logger.error("Create Sale Exception", {
        message: (error as Error).message,
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // ============================================================
  // GET SALES (LIST) - GET
  // ============================================================

  async getSales(req: Request, res: Response) {
    try {
      const user = (req as any).session.user;
      const role = user.role;

      // Validate query params
      const queryResult = GetSalesQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        logger.error(queryResult.error.flatten().fieldErrors);
        return res.status(400).json({
          error: "Validation Error",
          details: queryResult.error.flatten().fieldErrors,
        });
      }

      const { branchId, startDate, endDate, page, limit } = queryResult.data;

      // Parse dates if provided
      const filter = {
        branchId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page,
        limit,
      };

      try {
        const result = await salesService.getSales(filter, role, user.id);

        return res.status(200).json({
          message: "Data penjualan berhasil diambil",
          meta: result.meta,
          data: result.data,
        });
      } catch (error) {
        logger.error("Get Sales Error", {
          message: (error as Error).message,
          userId: user.id,
        });
        return res.status(400).json({
          error: "Failed to fetch sales",
          message: (error as Error).message,
        });
      }
    } catch (error) {
      logger.error("Get Sales Exception", {
        message: (error as Error).message,
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // ============================================================
  // GET SALE DETAIL - GET /:id
  // ============================================================

  async getSaleById(req: Request<{ id: string }>, res: Response) {
    try {
      const user = (req as any).session.user;
      const role = user.role;
      const id = req.params.id;

      if (!id) {
        return res.status(400).json({ error: "Sale ID is required" });
      }

      try {
        const sale = await salesService.getSaleById(id, role, user.id);

        return res.status(200).json({
          message: "Data penjualan berhasil diambil",
          data: sale,
        });
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes("tidak ditemukan")) {
          return res.status(404).json({
            error: "Not Found",
            message: errorMsg,
          });
        }
        if (errorMsg.includes("tidak memiliki akses")) {
          return res.status(403).json({
            error: "Forbidden",
            message: errorMsg,
          });
        }

        logger.error("Get Sale By ID Error", {
          message: errorMsg,
          userId: user.id,
          saleId: id,
        });
        return res.status(400).json({
          error: "Failed to fetch sale",
          message: errorMsg,
        });
      }
    } catch (error) {
      logger.error("Get Sale By ID Exception", {
        message: (error as Error).message,
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // ============================================================
  // GET SALES SUMMARY - GET /summary
  // ============================================================

  async getSalesSummary(req: Request, res: Response) {
    try {
      const user = (req as any).session.user;
      const role = user.role;

      // Validate query params
      const queryResult = GetSalesQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        logger.error(queryResult.error.flatten().fieldErrors);
        return res.status(400).json({
          error: "Validation Error",
          details: queryResult.error.flatten().fieldErrors,
        });
      }

      const { branchId, startDate, endDate } = queryResult.data;

      // Parse dates if provided
      const filter = {
        branchId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: 1,
        limit: 1,
      };

      try {
        const summary = await salesService.getSalesSummary(
          filter,
          role,
          user.id,
        );

        return res.status(200).json({
          message: "Ringkasan penjualan berhasil diambil",
          data: summary,
        });
      } catch (error) {
        logger.error("Get Sales Summary Error", {
          message: (error as Error).message,
          userId: user.id,
        });
        return res.status(400).json({
          error: "Failed to fetch sales summary",
          message: (error as Error).message,
        });
      }
    } catch (error) {
      logger.error("Get Sales Summary Exception", {
        message: (error as Error).message,
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
