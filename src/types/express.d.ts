declare global {
  namespace Express {
    interface Request {
      session: {
        user: {
          id: string;
          name: string;
          email: string;
          emailVerified: boolean;
          image: string | null;
          createdAt: Date;
          updatedAt: Date;
          role: string;
          banned: boolean | null;
          banReason: string | null;
          banExpires: Date | null;
        };
        session: {
          id: string;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null;
          userAgent?: string | null;
          impersonatedBy?: string | null;
        };
      } | null;
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
