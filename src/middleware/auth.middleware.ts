import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { logger } from "better-auth";

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
