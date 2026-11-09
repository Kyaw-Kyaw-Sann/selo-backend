import type { CookieOptions } from "express";
import { env } from "../../config/env.js";

export const AUTH_COOKIE_NAME = "selo_token";

// Initial setting: 1 hour
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60;

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};