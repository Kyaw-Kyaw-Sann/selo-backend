import { AppError } from '../../utils/app.error.js'
import * as userRepository from './users.repository.js'
import bcrypt from 'bcrypt'
import pool from '../../config/db.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schema.js'

export async function getUserById(id: string){
    const user = await userRepository.getUserById(id)

    if(!user){
        throw new AppError("User not found", 404, "USER_NOT_FOUND")
    }

    return{
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: Boolean(user.is_active)
    }
}

export async function listUsers(query: ListUsersQuery) {
  const offset = (query.page - 1) * query.limit;

  const result = await userRepository.listUsers(
    query.search,
    query.limit,
    offset,
  );

  return {
    users: result.rows.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isActive: Boolean(user.is_active),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    await userRepository.createUser({
      name: input.name,
      username: input.username,
      passwordHash,
      role: input.role,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      throw new AppError(
        "Username already exists",
        409,
        "USERNAME_EXISTS",
      );
    }

    throw error;
  }

  const user = await userRepository.getUserByUsername(input.username);

  if (!user) {
    throw new AppError(
      "Failed to retrieve created user",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    isActive: Boolean(user.is_active),
  };
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actorId: string,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const users = await userRepository.getUsersForUpdate(connection);

    const actor = users.find((user) => user.id === actorId);

    if (!actor || !actor.is_active || actor.role !== "OWNER") {
      throw new AppError("Permission denied", 403, "FORBIDDEN");
    }

    const user = users.find((user) => user.id === id);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const updated = {
      name: input.name ?? user.name,
      username: input.username ?? user.username,
      role: input.role ?? user.role,
    };

    const activeOwnerCount = users.filter(
      (staff) => staff.role === "OWNER" && staff.is_active,
    ).length;

    if (
      user.role === "OWNER" &&
      user.is_active &&
      updated.role !== "OWNER" &&
      activeOwnerCount <= 1
    ) {
      throw new AppError(
        "At least one active owner must remain",
        409,
        "LAST_ACTIVE_OWNER",
      );
    }

    await userRepository.updateUser(connection, id, updated);

    await connection.commit();

    return {
      id: user.id,
      ...updated,
      isActive: Boolean(user.is_active),
    };
  } catch (error) {
    await connection.rollback();

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      throw new AppError(
        "Username already exists",
        409,
        "USERNAME_EXISTS",
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateUserStatus(
  id: string,
  isActive: boolean,
  actorId: string,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const users = await userRepository.getUsersForUpdate(connection);

    const actor = users.find((user) => user.id === actorId);

    if (!actor || !actor.is_active || actor.role !== "OWNER") {
      throw new AppError("Permission denied", 403, "FORBIDDEN");
    }

    const user = users.find((user) => user.id === id);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const activeOwnerCount = users.filter(
      (staff) => staff.role === "OWNER" && staff.is_active,
    ).length;

    if (
      user.role === "OWNER" &&
      user.is_active &&
      !isActive &&
      activeOwnerCount <= 1
    ) {
      throw new AppError(
        "At least one active owner must remain",
        409,
        "LAST_ACTIVE_OWNER",
      );
    }

    await userRepository.updateUserStatus(connection, id, isActive);

    await connection.commit();

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isActive,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
