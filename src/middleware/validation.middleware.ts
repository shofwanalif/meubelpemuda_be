import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: result.error.flatten().fieldErrors,
      });
    }

    // Ganti req.body dengan data hasil parse & transform Zod
    req.body = result.data;
    next();
  };
