import type { auth } from "../lib/auth";
declare global {
  namespace Express {
    interface Request {
      activeBranchId?: string;
      session: typeof auth.$Infer.Session | null;
      employeeBranch?: {
        id: string;
        assignedAt: Date;
        userId: string;
        branchId: string;
        branch: {
          id: string;
          name: string;
          address: string | null;
          isActive: boolean;
          createdAt: Date;
          updatedAt: Date;
        };
      };
    }
  }
}

export {};
