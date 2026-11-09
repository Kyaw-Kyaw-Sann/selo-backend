import type { RequestHandler } from "express";
import type { LoginInput } from "./auth.schema.js";
import * as authService from "./auth.service.js"
import { AUTH_COOKIE_NAME, AUTH_TOKEN_TTL_SECONDS, authCookieOptions } from "./auth.config.js";

export const login: RequestHandler = async (req, res) => {
    const input: LoginInput = req.body
    const result = await authService.login(input)

    res.cookie(AUTH_COOKIE_NAME, result.token, {
        ...authCookieOptions,
        maxAge: AUTH_TOKEN_TTL_SECONDS * 1000
    })

    res.status(200).json({
        success: true,
        message: "Login successful",
        data: result.user
    })
}

export const me: RequestHandler = async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user
    })
}

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};