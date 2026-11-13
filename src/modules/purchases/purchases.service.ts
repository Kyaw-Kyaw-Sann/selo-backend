import type { CreatePurchaseInput, ListPurchaseQuery } from "./purchases.schema.js";
import * as purchaseRepository from "./purchases.repository.js";
import { AppError } from "../../utils/app.error.js";

export async function listPurchases(query: ListPurchaseQuery) {
  const offset = (query.page - 1) * query.limit;

  const result = await purchaseRepository.listPurchases(query, offset);

  return {
    purchases: result.rows.map((purchase) => ({
      id: purchase.id,
      purchaseNo: purchase.purchase_no,
      supplierId: purchase.supplier_id,
      supplierName: purchase.supplier_name,
      totalAmount: purchase.total_amount,
      receivedBy: purchase.received_by,
      receivedByName: purchase.received_by_name,
      receivedAt: purchase.received_at,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(query.limit / result.total),
    },
  };
}

export async function getPurchaseById(id: string) {
  const purchase = await purchaseRepository.getPurchaseById(id);

  if (!purchase) {
    throw new AppError("Purchase not found", 404, "PURCHASE_NOT_FOUND");
  }

  const items = await purchaseRepository.getPurchaseItem(id);

  return {
    id: purchase.id,
    purchaseNo: purchase.purchase_no,
    supplierId: purchase.supplier_id,
    supplierName: purchase.supplier_name,
    totalAmount: purchase.total_amount,
    notes: purchase.notes,
    receivedBy: purchase.received_by,
    receivedByName: purchase.received_by_name,
    receivedAt: purchase.received_at,
    createdAt: purchase.created_at,
    items: items?.map((item)=>(
        {
            id: item.id,
            productId: item.product_id,
            productUnitId: item.product_unit_id,
            productNameSanpshot: item.product_name_snapshot,
            unitNameSnapshot: item.unit_name_snapshot,
            quantity: item.quantity,
            conversionFactor: item.conversion_factor,
            baseQuantity: item.base_quantity,
            unitCost: item.unit_cost,
            lineTotal: item.line_total
        }
    ))
  };
}

const MAX_DECIMAL_VALUE = 999999999999999999n;
const MAX_STOCK = 2147483647n;

function toCents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");

  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function formatDecimal(value: bigint, places: number): string {
  const scale = 10n ** BigInt(places);

  return `${value / scale}.${(value % scale)
    .toString()
    .padStart(places, "0")}`;
}

export async function createPurchase(input: CreatePurchaseInput, receivedBy: string){
  
}


