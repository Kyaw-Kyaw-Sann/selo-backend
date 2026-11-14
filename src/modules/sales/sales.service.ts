import type { ListSalesQuery } from "./sales.schema.js";
import * as salesRepository from "./sales.repository.js";
import { AppError } from "../../utils/app.error.js";

export async function listSales(query: ListSalesQuery) {
  const offset = (query.page - 1) * query.limit;

  const results = await salesRepository.listSales(query, offset);

  return {
    sales: results.rows.map((sale) => ({
      id: sale.id,
      saleNo: sale.sale_no,
      cashierId: sale.cashier_id,
      cashierName: sale.cashier_name,
      subtotal: sale.subtotal,
      totalPayable: sale.total_payable,
      paymentMethod: sale.payment_method,
      completedAt: sale.completed_at,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: results.total,
      totalPages: Math.ceil(results.total / query.limit),
    },
  };
}

export async function getSaleById(id: string, role: "OWNER" | "CASHIER"){
    const sale = await salesRepository.getSaleById(id)

    if(!sale){
        throw new AppError(
            "Sale not found",
      404,
      "SALE_NOT_FOUND",
        )
    }

    const items = await salesRepository.getSaleItem(id)

   return {
    id: sale.id,
    saleNo: sale.sale_no,
    cashierId: sale.cashier_id,
    cashierName: sale.cashier_name,
    subtotal: sale.subtotal,
    totalPayable: sale.total_payable,
    completedAt: sale.completed_at,
    createdAt: sale.created_at,
    payment:
      sale.payment_id === null
        ? null
        : {
            id: sale.payment_id,
            method: sale.payment_method,
            amount: sale.payment_amount,
            tenderedAmount: sale.tendered_amount,
            changeAmount: sale.change_amount,
            referenceNo: sale.reference_no,
            confirmedBy: sale.confirmed_by,
            confirmedAt: sale.confirmed_at,
          },
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productUnitId: item.product_unit_id,
      productName: item.product_name_snapshot,
      unitName: item.unit_name_snapshot,
      quantity: item.quantity,
      conversionFactor: item.conversion_factor,
      baseQuantity: item.base_quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      ...(role === "OWNER"
        ? { unitCostSnapshot: item.unit_cost_snapshot }
        : {}),
    })),
  };


}
