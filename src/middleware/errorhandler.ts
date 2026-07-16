import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logging";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../helper/errors";

const errorMap = [
  { type: BadRequestError, status: 400 },
  { type: UnauthorizedError, status: 401 },
  { type: ForbiddenError, status: 403 },
  { type: NotFoundError, status: 404 },
  { type: ConflictError, status: 409 },
];

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const match = errorMap.find((e) => error instanceof e.type);
  if (match) {
    const extra =
      error instanceof ValidationError ? { errors: error.errors } : {};
    return res.status(match.status).json({ message: error.message, ...extra });
  }

  logger.error(error);
  return res.status(500).json({ message: "Internal Server Error" });
}
