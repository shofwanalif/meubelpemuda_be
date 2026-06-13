import { Request, Response, NextFunction } from "express";
import { salesService } from "./sales.service";
import {
  GetSalesQuerySchema,
  GetSalesSummaryQuerySchema,
  GetSalesSummaryMonthlyQuerySchema,
} from "./sales.schema";
import { resolveBranchId } from "../../helper/resolveBranchId";

export const salesController = {
  async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = resolveBranchId(req);
      if (!branchId) {
        return res.status(400).json({ message: "branchId harus diisi" });
      }

      const userId = req.session!.user.id;
      const result = await salesService.createSale(req.body, branchId, userId);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async cancelSale(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      await salesService.cancelSale(req.params.id, branchId);
      return res.status(200).json({ message: "Transaksi berhasil dibatalkan" });
    } catch (error) {
      next(error);
    }
  },

  async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = resolveBranchId(req);

      const parsed = GetSalesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await salesService.getSales(branchId, parsed.data);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSalesSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = resolveBranchId(req);
      const parsed = GetSalesSummaryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await salesService.getSalesSummary(branchId, parsed.data);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSalesSummaryMonthly(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      const parsed = GetSalesSummaryMonthlyQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await salesService.getSalesSummaryMonthly(
        branchId,
        parsed.data,
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSaleDetail(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      const result = await salesService.getSaleDetail(req.params.id, branchId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
