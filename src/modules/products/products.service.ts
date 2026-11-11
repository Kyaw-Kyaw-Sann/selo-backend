import * as productsRepository from "./products.repository.js";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./products.schema.js";
import { AppError } from "../../utils/app.error.js";
import pool from "../../config/db.js";

export async function listProducts(query: ListProductsQuery) {
  const offset = (query.page - 1) * query.limit;
  const result = await productsRepository.listProducts(query, offset);

  return {
    products: result.rows.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      categoryId: product.category_id,
      baseUnitId: product.base_unit_id,
      imagePath: product.image_path,
      stockQuantity: product.stock_quantity,
      minStockLevel: product.min_stock_level,
      isActive: Boolean(product.is_active),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getProductById(id: string, role: "OWNER" | "CASHIER") {
  const product = await productsRepository.getProductById(id);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  const units = await productsRepository.getProductUnits(id);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.category_id,
    categoryName: product.category_name,
    baseUnitId: product.base_unit_id,
    baseUnitName: product.base_unit_name,
    baseUnitCode: product.base_unit_code,
    imagePath: product.image_path,
    stockQuantity: product.stock_quantity,
    minStockLevel: product.min_stock_level,
    isActive: Boolean(product.is_active),
    ...(role === "OWNER"
      ? { latestPurchaseCost: product.latest_purchase_cost }
      : {}),
    units: units.map((unit) => ({
      id: unit.id,
      unitId: unit.unit_id,
      unitName: unit.unit_name,
      unitCode: unit.unit_code,
      conversionFactor: unit.conversion_factor,
      barcode: unit.barcode,
      sellingPrice: unit.selling_price,
      canPurchase: Boolean(unit.can_purchase),
      canSell: Boolean(unit.can_sell),
      isActive: Boolean(unit.is_active),
    })),
  };
}

export async function createProduct(input: CreateProductInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (input.categoryId !== null) {
      const category = await productsRepository.getCategoryForCreate(connection, input.categoryId);
      if (!category) {
        throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
      }
      if (!category.is_active) {
        throw new AppError("Category is inactive", 409, "CATEGORY_INACTIVE");
      }
    }

    const units = await productsRepository.getUnitsForCreate(
      connection,
      input.units.map((unit) => unit.unitId),
    );

    for (const requestedUnit of input.units) {
      const unit = units.find((row) => row.id === requestedUnit.unitId);
      if (!unit) {
        throw new AppError("Unit not found", 404, "UNIT_NOT_FOUND");
      }
      if (!unit.is_active) {
        throw new AppError("Unit is inactive", 409, "UNIT_INACTIVE");
      }
    }

    const id = await productsRepository.createProduct(connection, input);

    for (const unit of input.units) {
      await productsRepository.createProductUnit(connection, id, unit);
    }

    await connection.commit();
    return { id };
  } catch (error) {
    await connection.rollback();

    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("uq_products_sku")) {
        throw new AppError("SKU already exists", 409, "PRODUCT_SKU_EXISTS");
      }
      if (error.message.includes("uq_product_units_barcode")) {
        throw new AppError("Barcode already exists", 409, "BARCODE_EXISTS");
      }
      throw new AppError("Product data conflicts with an existing record", 409, "PRODUCT_CONFLICT");
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const product = await productsRepository.getProductForUpdate(connection, id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }
    if (input.baseUnitId !== undefined && input.baseUnitId !== product.base_unit_id) {
      throw new AppError("Base unit cannot be changed", 409, "BASE_UNIT_IMMUTABLE");
    }

    const updated = {
      sku: input.sku ?? product.sku,
      name: input.name ?? product.name,
      categoryId: input.categoryId === undefined ? product.category_id : input.categoryId,
      imagePath: input.imagePath === undefined ? product.image_path : input.imagePath,
      minStockLevel: input.minStockLevel ?? product.min_stock_level,
    };

    if (updated.categoryId !== null && updated.categoryId !== product.category_id) {
      const category = await productsRepository.getCategoryForCreate(connection, updated.categoryId);
      if (!category) {
        throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
      }
      if (!category.is_active) {
        throw new AppError("Category is inactive", 409, "CATEGORY_INACTIVE");
      }
    }

    const existingUnits = await productsRepository.getProductUnitsForUpdate(connection, id);
    const requestedUnits = input.units ?? [];
    const newUnitCount = requestedUnits.filter(
      (unit) => !existingUnits.some((existing) => existing.unit_id === unit.unitId),
    ).length;

    if (existingUnits.length + newUnitCount > 3) {
      throw new AppError("A product can have at most three units", 409, "PRODUCT_UNIT_LIMIT");
    }

    const sharedUnits = requestedUnits.length
      ? await productsRepository.getUnitsForCreate(connection, requestedUnits.map((unit) => unit.unitId))
      : [];

    for (const requested of requestedUnits) {
      const existing = existingUnits.find((unit) => unit.unit_id === requested.unitId);
      const shared = sharedUnits.find((unit) => unit.id === requested.unitId);
      if (!shared) {
        throw new AppError("Unit not found", 404, "UNIT_NOT_FOUND");
      }
      if (!existing && (requested.conversionFactor === undefined || requested.sellingPrice === undefined)) {
        throw new AppError("New units require conversionFactor and sellingPrice", 400, "VALIDATION_ERROR");
      }

      const unit = {
        unitId: requested.unitId,
        conversionFactor: requested.conversionFactor ?? existing!.conversion_factor,
        sellingPrice: requested.sellingPrice ?? existing!.selling_price,
        barcode: requested.barcode === undefined ? existing?.barcode ?? null : requested.barcode,
        canPurchase: requested.canPurchase ?? (existing ? Boolean(existing.can_purchase) : true),
        canSell: requested.canSell ?? (existing ? Boolean(existing.can_sell) : true),
        isActive: requested.isActive ?? (existing ? Boolean(existing.is_active) : true),
      };

      if (!shared.is_active && (!existing || unit.isActive)) {
        throw new AppError("Unit is inactive", 409, "UNIT_INACTIVE");
      }
      if (unit.unitId === product.base_unit_id && unit.conversionFactor !== 1) {
        throw new AppError("Base unit must keep conversion factor 1", 409, "BASE_UNIT_CONVERSION");
      }
      if (unit.canSell && Number(unit.sellingPrice) <= 0) {
        throw new AppError("Sellable units must have a positive selling price", 400, "VALIDATION_ERROR");
      }
      if (existing && unit.conversionFactor !== existing.conversion_factor) {
        const used = await productsRepository.hasProductUnitHistory(connection, existing.id);
        if (used) {
          throw new AppError("Used unit conversion cannot be changed", 409, "UNIT_CONVERSION_IN_USE");
        }
      }

      if (existing) {
        await productsRepository.updateProductUnit(connection, existing.id, unit);
      } else {
        await productsRepository.createProductUnit(connection, id, unit);
      }
    }

    await productsRepository.updateProduct(connection, id, updated);
    await connection.commit();
    return { id };
  } catch (error) {
    await connection.rollback();
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("uq_products_sku")) {
        throw new AppError("SKU already exists", 409, "PRODUCT_SKU_EXISTS");
      }
      if (error.message.includes("uq_product_units_barcode")) {
        throw new AppError("Barcode already exists", 409, "BARCODE_EXISTS");
      }
      throw new AppError("Product data conflicts with an existing record", 409, "PRODUCT_CONFLICT");
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateProductStatus(id: string, isActive: boolean) {
  await productsRepository.updateProductStatus(id, isActive);
  const product = await productsRepository.getProductById(id);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  return { id: product.id, isActive: Boolean(product.is_active) };
}
