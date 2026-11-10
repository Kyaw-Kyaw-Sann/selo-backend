import type { CreateCategoryInput, ListCategoryQuery, UpdateCategoryInput } from "./categories.schema.js";
import * as categoriesRepository from "./categories.repository.js";
import { AppError } from "../../utils/app.error.js";
import pool from "../../config/db.js";

export async function listCategories(query: ListCategoryQuery) {
  const offset = (query.page - 1) * query.limit;

  const result = await categoriesRepository.listCategories(
    query.limit,
    offset,
  );

  return {
    categories: result.roots.map((root) => ({
      id: root.id,
      name: root.name,
      parentId: root.parent_id,
      isActive: Boolean(root.is_active),
      children: result.children
        .filter((child) => child.parent_id === root.id)
        .map((child) => ({
          id: child.id,
          name: child.name,
          parentId: child.parent_id,
          isActive: Boolean(child.is_active),
        })),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function createCategory(input: CreateCategoryInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const categories =
      await categoriesRepository.getCategoriesForUpdate(connection);

    if (input.parentId !== null) {
      const parent = categories.find(
        (category) => category.id === input.parentId,
      );

      if (!parent) {
        throw new AppError(
          "Parent category not found",
          404,
          "PARENT_CATEGORY_NOT_FOUND",
        );
      }

      if (parent.parent_id !== null) {
        throw new AppError(
          "Category hierarchy cannot exceed two levels",
          409,
          "CATEGORY_DEPTH_EXCEEDED",
        );
      }
    }

    const category = await categoriesRepository.createCategory(
      connection,
      input.name,
      input.parentId,
    );

    await connection.commit();

    return {
      id: category.id,
      name: category.name,
      parentId: category.parent_id,
      isActive: Boolean(category.is_active),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const categories =
      await categoriesRepository.getCategoriesForUpdate(connection);

    const category = categories.find((row) => row.id === id);

    if (!category) {
      throw new AppError(
        "Category not found",
        404,
        "CATEGORY_NOT_FOUND",
      );
    }

    const updated = {
      name: input.name ?? category.name,
      parentId:
        input.parentId === undefined
          ? category.parent_id
          : input.parentId,
    };

    if (updated.parentId !== null) {
      if (updated.parentId === id) {
        throw new AppError(
          "Category cannot be its own parent",
          409,
          "CATEGORY_SELF_PARENT",
        );
      }

      const parent = categories.find(
        (row) => row.id === updated.parentId,
      );

      if (!parent) {
        throw new AppError(
          "Parent category not found",
          404,
          "PARENT_CATEGORY_NOT_FOUND",
        );
      }

      const hasChildren = categories.some(
        (row) => row.parent_id === id,
      );

      if (parent.parent_id !== null || hasChildren) {
        throw new AppError(
          "Category hierarchy cannot exceed two levels",
          409,
          "CATEGORY_DEPTH_EXCEEDED",
        );
      }
    }

    await categoriesRepository.updateCategory(
      connection,
      id,
      updated,
    );

    await connection.commit();

    return {
      id: category.id,
      name: updated.name,
      parentId: updated.parentId,
      isActive: Boolean(category.is_active),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCategoryStatus(
  id: string,
  isActive: boolean,
) {
  await categoriesRepository.updateCategoryStatus(id, isActive);

  const category = await categoriesRepository.getCategoryById(id);

  if (!category) {
    throw new AppError(
      "Category not found",
      404,
      "CATEGORY_NOT_FOUND",
    );
  }

  return {
    id: category.id,
    name: category.name,
    parentId: category.parent_id,
    isActive: Boolean(category.is_active),
  };
}