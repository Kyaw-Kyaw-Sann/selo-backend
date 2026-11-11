import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
  UpdateSupplierStatusInput,
} from "./suppliers.schema.js";
import * as suppliersRepository from "./suppliers.repository.js";
import { AppError } from "../../utils/app.error.js";

export async function listSuppliers(query: ListSuppliersQuery) {
  const offset = (query.page - 1) * query.limit;

  const result = await suppliersRepository.listSuppliers(query, offset);

  return {
    suppliers: result.rows.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      contactPerson: supplier.contact_person,
      isActive: Boolean(supplier.is_active),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getSupplierById(id: string) {
  const result = await suppliersRepository.getSupplierById(id);

  if (!result) {
    throw new AppError("Supplier not found", 404, "SUPPLIER_NOT_FOUND");
  }

  return {
    id: result.id,
    name: result.name,
    phone: result.phone,
    contactPerson: result.contact_person,
    address: result.address,
    notes: result.notes,
    isActive: Boolean(result.is_active),
  };
}

export async function createSupplier(input: CreateSupplierInput) {
  const supplier = await suppliersRepository.createSupplier(input);

  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    contactPerson: supplier.contact_person,
    address: supplier.address,
    notes: supplier.notes,
    isActive: Boolean(supplier.is_active),
  };
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  await suppliersRepository.updateSupplier(id, input);

  return getSupplierById(id);
}

export async function updateSupplierStatus(
  id: string,
  input: UpdateSupplierStatusInput,
) {
  await suppliersRepository.updateSupplierStatus(id, input);

  return getSupplierById(id);
}

// CREATE TABLE suppliers (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(200) NOT NULL,
//     phone VARCHAR(40) NULL,
//     contact_person VARCHAR(150) NULL,
//     address TEXT NULL,
//     notes TEXT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,
//     created_at DATETIME(3) NOT NULL,
//     updated_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id)
// ) ENGINE = InnoDB;
