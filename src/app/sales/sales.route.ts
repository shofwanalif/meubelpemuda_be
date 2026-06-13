import { Router } from "express";
import { salesController } from "./sales.controller";
import {
  authenticate,
  requireRole,
  requireAssignedBranchForKaryawan,
} from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { CreateSaleSchema } from "./sales.schema";

const salesRouter = Router();

salesRouter.post(
  "/create",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  validate(CreateSaleSchema),
  salesController.createSale,
);

salesRouter.patch(
  "/cancel/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.cancelSale,
);

salesRouter.get(
  "/",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSales,
);

salesRouter.get(
  "/summary",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSalesSummary,
);

salesRouter.get(
  "/summary/monthly",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSalesSummaryMonthly,
);

salesRouter.get(
  "/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSaleDetail,
);

export { salesRouter };
