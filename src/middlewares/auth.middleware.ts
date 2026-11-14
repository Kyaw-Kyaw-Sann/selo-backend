import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { AUTH_COOKIE_NAME } from "../modules/auth/auth.config.js";
import { getUserById } from "../modules/auth/auth.repository.js";
import { AppError } from "../utils/app.error.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof token !== "string" || !token) {
    throw new AppError("Authentication required", 401, "UNAUTHENTICATED");
  }

  let payload: JwtPayload | string;

  try {
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    throw new AppError("Invalid or expired session", 401, "UNAUTHENTICATED");
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    !/^[1-9]\d*$/.test(payload.sub)
  ) {
    throw new AppError("Invalid or expired session", 401, "UNAUTHENTICATED");
  }

  const user = await getUserById(payload.sub);

  if (
    !user ||
    !user.is_active ||
    (user.role !== "OWNER" && user.role !== "CASHIER")
  ) {
    throw new AppError("Invalid or expired session", 401, "UNAUTHENTICATED");
  }

  req.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  };

  next();
};