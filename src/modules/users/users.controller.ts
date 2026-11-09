import type { RequestHandler } from "express";
import { listUsersQuerySchema, userIdParamsSchema, type CreateUserInput, type UpdateUserInput, type UpdateUserStatusInput } from "./users.schema.js";
import { AppError } from "../../utils/app.error.js";
import * as userService from './users.service.js'

export const getUserById: RequestHandler = async (req, res) => {
    const result = userIdParamsSchema.safeParse(req.params)

    if(!result.success){
        throw new AppError("Invalid user ID", 400, "VALIDATION_ERROR")
    }

    const user = await userService.getUserById(result.data.id);

    res.status(200).json({
        success: true,
        data: user,
    })
}

export const listUsers: RequestHandler = async (req, res) => {
  const result = listUsersQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = await userService.listUsers(result.data);

  res.status(200).json({
    success: true,
    data: data.users,
    pagination: data.pagination,
  });
};

export const createUser: RequestHandler = async (req, res) => {
  const input: CreateUserInput = req.body;
  const user = await userService.createUser(input);

  res.status(201).json({
    success: true,
    message: "Staff account created successfully",
    data: user,
  });
};

export const updateUser: RequestHandler = async (req, res) => {
  const result = userIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid user ID", 400, "VALIDATION_ERROR");
  }

  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
      "UNAUTHENTICATED",
    );
  }

  const input: UpdateUserInput = req.body;

  const user = await userService.updateUser(
    result.data.id,
    input,
    req.user.id,
  );

  res.status(200).json({
    success: true,
    message: "Staff account updated successfully",
    data: user,
  });
};

export const updateUserStatus: RequestHandler = async (req, res) => {
  const result = userIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid user ID", 400, "VALIDATION_ERROR");
  }

  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
      "UNAUTHENTICATED",
    );
  }

  const input: UpdateUserStatusInput = req.body;

  const user = await userService.updateUserStatus(
    result.data.id,
    input.isActive,
    req.user.id,
  );

  res.status(200).json({
    success: true,
    message: "Staff status updated successfully",
    data: user,
  });
};