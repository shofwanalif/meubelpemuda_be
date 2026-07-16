import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../helper/errors";

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      const firstMessage =
        Object.values(fieldErrors).flat()[0] ?? "Data tidak valid";
      return next(new ValidationError(firstMessage, fieldErrors));
    }

    req.body = result.data;
    next();
  };
