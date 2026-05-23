import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { logger } from "better-auth";
import { prisma } from "../config/prisma";

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) return res.status(401).json({ message: "Unauthorized" });

    req.session = session;
    next();
  } catch (error) {
    logger.error("Authentication Error", {
      message: (error as Error).message,
    });

    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const requireRole = (role: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!role.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

export const requireAssignedBranchForKaryawan = async (
  req: any,
  res: any,
  next: any,
) => {
  try {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // hanya wajib untuk role karyawan
    if (user.role !== "karyawan") return next();

    const employeeBranch = await prisma.employeeBranch.findUnique({
      where: { userId: user.id },
      include: { branch: true },
    });

    if (!employeeBranch) {
      return res.status(403).json({
        message: "Akun anda belum di-assign ke cabang",
      });
    }

    // opsional: simpan supaya handler berikutnya tidak query ulang
    req.employeeBranch = employeeBranch;

    next();
  } catch (error) {
    logger.error("Branch assignment check error", {
      message: (error as Error).message,
    });
    res.status(500).json({ message: "Internal Server Error" });
  }
};
