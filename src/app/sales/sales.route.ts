import { Router } from "express";
import { salesController } from "./sales.controller";
import {
  authenticate,
  requireRole,
  requireAssignedBranchForKaryawan,
} from "../../middleware/auth.middleware";

const salesRouter = Router();

/**
 * POST /sales/create
 * Create a new sale (penjualan)
 *
 * Owner: dapat input penjualan di cabang manapun
 * Karyawan: hanya dapat input di cabang mereka sendiri
 *
 * Rules:
 * - Harga modal dan jual di-snapshot saat transaksi
 * - Gross profit dikalkulasi otomatis
 * - Semua operasi atomik (all or nothing)
 */
salesRouter.post(
  "/create",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan, // tolak karyawan yg belum di-assign cabang
  salesController.createSale,
);

/**
 * GET /sales
 * Get sales list dengan pagination
 *
 * Query params:
 * - branchId (optional): filter by branch (owner only)
 * - startDate (optional): filter by date range (YYYY-MM-DD)
 * - endDate (optional): filter by date range (YYYY-MM-DD)
 * - page (optional): halaman, default 1
 * - limit (optional): jumlah per halaman, default 10
 *
 * Karyawan: hanya bisa lihat penjualan dari cabang mereka
 * Owner: bisa lihat semua atau filter by branchId
 */
salesRouter.get(
  "/",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSales,
);

/**
 * GET /sales/summary
 * Get sales summary/statistics
 *
 * Query params:
 * - branchId (optional): filter by branch (owner only)
 * - startDate (optional): filter by date range (YYYY-MM-DD)
 * - endDate (optional): filter by date range (YYYY-MM-DD)
 *
 * Returns:
 * - totalSales: jumlah transaksi penjualan
 * - totalItems: total qty item yang terjual
 * - totalRevenue: total harga jual
 * - totalCost: total harga modal
 * - totalGrossProfit: total keuntungan kotor
 */
salesRouter.get(
  "/summary",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSalesSummary,
);

/**
 * GET /sales/:id
 * Get sale detail by ID
 *
 * Karyawan: hanya bisa lihat detail dari cabang mereka
 * Owner: bisa lihat detail dari cabang manapun
 */
salesRouter.get(
  "/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  salesController.getSaleById,
);

export { salesRouter };
