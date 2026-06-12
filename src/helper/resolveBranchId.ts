import { Request } from "express";

export function resolveBranchId(req: Request): string | null {
  if (req.activeBranchId) return req.activeBranchId; // karyawan
  return (
    (req.body?.branchId as string) ?? (req.query.branchId as string) ?? null
  );
}
