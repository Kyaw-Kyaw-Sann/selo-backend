import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/app.error.js";

export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        new AppError(
          result.error.issues[0]?.message ?? "Invalid request body",
          400,
          "VALIDATION_ERROR",
        ),
      );
      return;
    }

    req.body = result.data;
    next();
  };
}