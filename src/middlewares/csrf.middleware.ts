import type { RequestHandler } from "express";
import { AppError } from "../utils/app.error.js";

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  if (req.get("X-Selo-Request") !== "1") {
    throw new AppError(
      "Required request header is missing",
      403,
      "CSRF_CHECK_FAILED",
    );
  }

  next();
};