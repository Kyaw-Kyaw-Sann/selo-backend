import type { RequestHandler } from "express";
import { AppError } from "../utils/app.error.js";

export const requireOwner: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
      "UNAUTHENTICATED",
    );
  }

  if (req.user.role !== "OWNER") {
    throw new AppError(
      "Owner access required",
      403,
      "FORBIDDEN",
    );
  }

  next();
};