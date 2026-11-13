-- Local sample transactions. Run once as a complete script in MySQL Workbench.

-- Existing rows are preserved. Duplicate receipt numbers/keys intentionally stop a second import.

-- If any statement fails, execute ROLLBACK and do not commit partial data.

USE selo;

START TRANSACTION;

SET @seed_time = UTC_TIMESTAMP(3);

SET @owner_id = (SELECT id FROM users WHERE role = 'OWNER' AND is_active = TRUE ORDER BY id LIMIT 1);

SET @supplier_id = (SELECT id FROM suppliers WHERE is_active = TRUE ORDER BY id LIMIT 1);

SELECT id FROM products WHERE sku IN ('DEMO-COF-001', 'DEMO-TEA-001', 'DEMO-WAT-001', 'DEMO-DRK-001', 'DEMO-BIS-001', 'DEMO-RIC-001', 'DEMO-SUG-001', 'DEMO-SOP-001') ORDER BY id FOR UPDATE;


-- WB-DEMO-PUR-001: Coffee and tea wholesale receiving

SET @event_time = TIMESTAMPADD(MICROSECOND, 0, @seed_time);

INSERT INTO purchases (purchase_no, supplier_id, total_amount, notes, received_by, received_at, idempotency_key, created_at)
VALUES ('WB-DEMO-PUR-001', @supplier_id, 170000.00, 'Coffee and tea wholesale receiving', @owner_id, @event_time, 'wb-demo:purchase:1', @event_time);

SET @purchase_id = LAST_INSERT_ID();

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-COF-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 2 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('40000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  2, @factor, @base_quantity, 40000.00, 2 * 40000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-TEA-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 1 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('90000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  1, @factor, @base_quantity, 90000.00, 1 * 90000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);


-- WB-DEMO-PUR-002: Drinking water and soda receiving

SET @event_time = TIMESTAMPADD(MICROSECOND, 1000, @seed_time);

INSERT INTO purchases (purchase_no, supplier_id, total_amount, notes, received_by, received_at, idempotency_key, created_at)
VALUES ('WB-DEMO-PUR-002', @supplier_id, 200000.00, 'Drinking water and soda receiving', @owner_id, @event_time, 'wb-demo:purchase:2', @event_time);

SET @purchase_id = LAST_INSERT_ID();

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-WAT-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 10 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('6000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  10, @factor, @base_quantity, 6000.00, 10 * 6000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-DRK-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 5 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('28000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  5, @factor, @base_quantity, 28000.00, 5 * 28000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);


-- WB-DEMO-PUR-003: Biscuits and rice receiving

SET @event_time = TIMESTAMPADD(MICROSECOND, 2000, @seed_time);

INSERT INTO purchases (purchase_no, supplier_id, total_amount, notes, received_by, received_at, idempotency_key, created_at)
VALUES ('WB-DEMO-PUR-003', @supplier_id, 306000.00, 'Biscuits and rice receiving', @owner_id, @event_time, 'wb-demo:purchase:3', @event_time);

SET @purchase_id = LAST_INSERT_ID();

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-BIS-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 3 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('42000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  3, @factor, @base_quantity, 42000.00, 3 * 42000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-RIC-001' AND u.code = 'bag'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 10 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('18000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  10, @factor, @base_quantity, 18000.00, 10 * 18000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);


-- WB-DEMO-PUR-004: Sugar and laundry soap receiving

SET @event_time = TIMESTAMPADD(MICROSECOND, 3000, @seed_time);

INSERT INTO purchases (purchase_no, supplier_id, total_amount, notes, received_by, received_at, idempotency_key, created_at)
VALUES ('WB-DEMO-PUR-004', @supplier_id, 234000.00, 'Sugar and laundry soap receiving', @owner_id, @event_time, 'wb-demo:purchase:4', @event_time);

SET @purchase_id = LAST_INSERT_ID();

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-SUG-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 2 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('72000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  2, @factor, @base_quantity, 72000.00, 2 * 72000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-SOP-001' AND u.code = 'carton'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 1 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('90000.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  1, @factor, @base_quantity, 90000.00, 1 * 90000.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);


-- WB-DEMO-PUR-005: Coffee and tea pack top-up

SET @event_time = TIMESTAMPADD(MICROSECOND, 4000, @seed_time);

INSERT INTO purchases (purchase_no, supplier_id, total_amount, notes, received_by, received_at, idempotency_key, created_at)
VALUES ('WB-DEMO-PUR-005', @supplier_id, 50400.00, 'Coffee and tea pack top-up', @owner_id, @event_time, 'wb-demo:purchase:5', @event_time);

SET @purchase_id = LAST_INSERT_ID();

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-COF-001' AND u.code = 'pack'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 5 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('4200.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  5, @factor, @base_quantity, 4200.00, 5 * 4200.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);

SET @product_id = NULL, @product_unit_id = NULL, @product_name = NULL,
    @unit_name = NULL, @factor = NULL, @price = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id, @product_unit_id, @product_name, @unit_name, @factor, @price
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-TEA-001' AND u.code = 'pack'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_purchase = TRUE
LIMIT 1;

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id);
SET @base_quantity = 3 * @factor;
SET @quantity_after = @quantity_before + @base_quantity;
SET @base_cost = ROUND(CAST('9800.00' AS DECIMAL(18,2)) / @factor, 6);
INSERT INTO purchase_items (
  purchase_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_cost, line_total
) VALUES (
  @purchase_id, @product_id, @product_unit_id, @product_name, @unit_name,
  3, @factor, @base_quantity, 9800.00, 3 * 9800.00
);
SET @purchase_item_id = LAST_INSERT_ID();
UPDATE products
SET stock_quantity = @quantity_after, latest_purchase_cost = @base_cost, updated_at = @event_time
WHERE id = @product_id;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id, 'PURCHASE', @base_quantity, @quantity_before, @quantity_after,
  'PURCHASE_ITEM', @purchase_item_id, 'Workbench sample receiving',
  @owner_id, CONCAT('purchase:', @purchase_item_id), @event_time
);


-- WB-DEMO-SAL-001: walk-in CASH checkout

SET @event_time = TIMESTAMPADD(MICROSECOND, 5000, @seed_time);

SET @cashier_id = (SELECT id FROM users WHERE username = 'demo.aung' AND is_active = TRUE AND role = 'CASHIER' LIMIT 1);

SET @product_id1 = NULL, @product_unit_id1 = NULL, @product_name1 = NULL,
    @unit_name1 = NULL, @factor1 = NULL, @price1 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id1, @product_unit_id1, @product_name1, @unit_name1, @factor1, @price1
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-COF-001' AND u.code = 'sachet'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @product_id2 = NULL, @product_unit_id2 = NULL, @product_name2 = NULL,
    @unit_name2 = NULL, @factor2 = NULL, @price2 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id2, @product_unit_id2, @product_name2, @unit_name2, @factor2, @price2
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-TEA-001' AND u.code = 'sachet'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @sale_total = 3 * @price1 + 2 * @price2;
INSERT INTO sales (
  sale_no, cashier_id, customer_id, subtotal,
  loyalty_redeemed_points, loyalty_redeemed_value, loyalty_earned_points,
  total_payable, idempotency_key, completed_at, created_at
) VALUES (
  'WB-DEMO-SAL-001', @cashier_id, NULL, @sale_total,
  0, 0, 0, @sale_total, 'wb-demo:sale:1', @event_time, @event_time
);
SET @sale_id = LAST_INSERT_ID();

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id1);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id1);
SET @base_quantity = 3 * @factor1;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id1, @product_unit_id1, @product_name1, @unit_name1,
  3, @factor1, @base_quantity, @price1, 3 * @price1, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id1;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id1, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id2);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id2);
SET @base_quantity = 2 * @factor2;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id2, @product_unit_id2, @product_name2, @unit_name2,
  2, @factor2, @base_quantity, @price2, 2 * @price2, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id2;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id2, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @tendered = CEILING(@sale_total / 1000) * 1000 + 1000;
INSERT INTO sale_payments (
  sale_id, method, amount, tendered_amount, change_amount, reference_no, confirmed_by, confirmed_at
) VALUES (
  @sale_id, 'CASH', @sale_total, @tendered, @tendered - @sale_total,
  NULL, @cashier_id, @event_time
);


-- WB-DEMO-SAL-002: walk-in QR checkout

SET @event_time = TIMESTAMPADD(MICROSECOND, 6000, @seed_time);

SET @cashier_id = (SELECT id FROM users WHERE username = 'demo.hnin' AND is_active = TRUE AND role = 'CASHIER' LIMIT 1);

SET @product_id1 = NULL, @product_unit_id1 = NULL, @product_name1 = NULL,
    @unit_name1 = NULL, @factor1 = NULL, @price1 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id1, @product_unit_id1, @product_name1, @unit_name1, @factor1, @price1
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-WAT-001' AND u.code = 'bottle'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @product_id2 = NULL, @product_unit_id2 = NULL, @product_name2 = NULL,
    @unit_name2 = NULL, @factor2 = NULL, @price2 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id2, @product_unit_id2, @product_name2, @unit_name2, @factor2, @price2
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-DRK-001' AND u.code = 'bottle'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @sale_total = 6 * @price1 + 4 * @price2;
INSERT INTO sales (
  sale_no, cashier_id, customer_id, subtotal,
  loyalty_redeemed_points, loyalty_redeemed_value, loyalty_earned_points,
  total_payable, idempotency_key, completed_at, created_at
) VALUES (
  'WB-DEMO-SAL-002', @cashier_id, NULL, @sale_total,
  0, 0, 0, @sale_total, 'wb-demo:sale:2', @event_time, @event_time
);
SET @sale_id = LAST_INSERT_ID();

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id1);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id1);
SET @base_quantity = 6 * @factor1;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id1, @product_unit_id1, @product_name1, @unit_name1,
  6, @factor1, @base_quantity, @price1, 6 * @price1, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id1;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id1, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id2);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id2);
SET @base_quantity = 4 * @factor2;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id2, @product_unit_id2, @product_name2, @unit_name2,
  4, @factor2, @base_quantity, @price2, 4 * @price2, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id2;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id2, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

INSERT INTO sale_payments (
  sale_id, method, amount, tendered_amount, change_amount, reference_no, confirmed_by, confirmed_at
) VALUES (
  @sale_id, 'QR', @sale_total, NULL, 0,
  'QR-WB-DEMO-SAL-002', @cashier_id, @event_time
);


-- WB-DEMO-SAL-003: walk-in CASH checkout

SET @event_time = TIMESTAMPADD(MICROSECOND, 7000, @seed_time);

SET @cashier_id = (SELECT id FROM users WHERE username = 'demo.koko' AND is_active = TRUE AND role = 'CASHIER' LIMIT 1);

SET @product_id1 = NULL, @product_unit_id1 = NULL, @product_name1 = NULL,
    @unit_name1 = NULL, @factor1 = NULL, @price1 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id1, @product_unit_id1, @product_name1, @unit_name1, @factor1, @price1
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-BIS-001' AND u.code = 'pack'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @product_id2 = NULL, @product_unit_id2 = NULL, @product_name2 = NULL,
    @unit_name2 = NULL, @factor2 = NULL, @price2 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id2, @product_unit_id2, @product_name2, @unit_name2, @factor2, @price2
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-RIC-001' AND u.code = 'bag'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @sale_total = 2 * @price1 + 6 * @price2;
INSERT INTO sales (
  sale_no, cashier_id, customer_id, subtotal,
  loyalty_redeemed_points, loyalty_redeemed_value, loyalty_earned_points,
  total_payable, idempotency_key, completed_at, created_at
) VALUES (
  'WB-DEMO-SAL-003', @cashier_id, NULL, @sale_total,
  0, 0, 0, @sale_total, 'wb-demo:sale:3', @event_time, @event_time
);
SET @sale_id = LAST_INSERT_ID();

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id1);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id1);
SET @base_quantity = 2 * @factor1;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id1, @product_unit_id1, @product_name1, @unit_name1,
  2, @factor1, @base_quantity, @price1, 2 * @price1, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id1;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id1, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id2);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id2);
SET @base_quantity = 6 * @factor2;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id2, @product_unit_id2, @product_name2, @unit_name2,
  6, @factor2, @base_quantity, @price2, 6 * @price2, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id2;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id2, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @tendered = CEILING(@sale_total / 1000) * 1000 + 1000;
INSERT INTO sale_payments (
  sale_id, method, amount, tendered_amount, change_amount, reference_no, confirmed_by, confirmed_at
) VALUES (
  @sale_id, 'CASH', @sale_total, @tendered, @tendered - @sale_total,
  NULL, @cashier_id, @event_time
);


-- WB-DEMO-SAL-004: walk-in QR checkout

SET @event_time = TIMESTAMPADD(MICROSECOND, 8000, @seed_time);

SET @cashier_id = (SELECT id FROM users WHERE username = 'demo.may' AND is_active = TRUE AND role = 'CASHIER' LIMIT 1);

SET @product_id1 = NULL, @product_unit_id1 = NULL, @product_name1 = NULL,
    @unit_name1 = NULL, @factor1 = NULL, @price1 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id1, @product_unit_id1, @product_name1, @unit_name1, @factor1, @price1
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-SUG-001' AND u.code = 'bag'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @product_id2 = NULL, @product_unit_id2 = NULL, @product_name2 = NULL,
    @unit_name2 = NULL, @factor2 = NULL, @price2 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id2, @product_unit_id2, @product_name2, @unit_name2, @factor2, @price2
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-SOP-001' AND u.code = 'bar'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @sale_total = 40 * @price1 + 4 * @price2;
INSERT INTO sales (
  sale_no, cashier_id, customer_id, subtotal,
  loyalty_redeemed_points, loyalty_redeemed_value, loyalty_earned_points,
  total_payable, idempotency_key, completed_at, created_at
) VALUES (
  'WB-DEMO-SAL-004', @cashier_id, NULL, @sale_total,
  0, 0, 0, @sale_total, 'wb-demo:sale:4', @event_time, @event_time
);
SET @sale_id = LAST_INSERT_ID();

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id1);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id1);
SET @base_quantity = 40 * @factor1;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id1, @product_unit_id1, @product_name1, @unit_name1,
  40, @factor1, @base_quantity, @price1, 40 * @price1, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id1;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id1, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id2);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id2);
SET @base_quantity = 4 * @factor2;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id2, @product_unit_id2, @product_name2, @unit_name2,
  4, @factor2, @base_quantity, @price2, 4 * @price2, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id2;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id2, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

INSERT INTO sale_payments (
  sale_id, method, amount, tendered_amount, change_amount, reference_no, confirmed_by, confirmed_at
) VALUES (
  @sale_id, 'QR', @sale_total, NULL, 0,
  'QR-WB-DEMO-SAL-004', @cashier_id, @event_time
);


-- WB-DEMO-SAL-005: walk-in CASH checkout

SET @event_time = TIMESTAMPADD(MICROSECOND, 9000, @seed_time);

SET @cashier_id = (SELECT id FROM users WHERE username = 'demo.aung' AND is_active = TRUE AND role = 'CASHIER' LIMIT 1);

SET @product_id1 = NULL, @product_unit_id1 = NULL, @product_name1 = NULL,
    @unit_name1 = NULL, @factor1 = NULL, @price1 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id1, @product_unit_id1, @product_name1, @unit_name1, @factor1, @price1
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-COF-001' AND u.code = 'pack'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @product_id2 = NULL, @product_unit_id2 = NULL, @product_name2 = NULL,
    @unit_name2 = NULL, @factor2 = NULL, @price2 = NULL;
SELECT p.id, pu.id, p.name, u.name, pu.conversion_factor, pu.selling_price
INTO @product_id2, @product_unit_id2, @product_name2, @unit_name2, @factor2, @price2
FROM products p
JOIN product_units pu ON pu.product_id = p.id
JOIN units u ON u.id = pu.unit_id
WHERE p.sku = 'DEMO-TEA-001' AND u.code = 'pack'
  AND p.is_active = TRUE AND pu.is_active = TRUE AND u.is_active = TRUE
  AND pu.can_sell = TRUE
LIMIT 1;

SET @sale_total = 1 * @price1 + 1 * @price2;
INSERT INTO sales (
  sale_no, cashier_id, customer_id, subtotal,
  loyalty_redeemed_points, loyalty_redeemed_value, loyalty_earned_points,
  total_payable, idempotency_key, completed_at, created_at
) VALUES (
  'WB-DEMO-SAL-005', @cashier_id, NULL, @sale_total,
  0, 0, 0, @sale_total, 'wb-demo:sale:5', @event_time, @event_time
);
SET @sale_id = LAST_INSERT_ID();

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id1);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id1);
SET @base_quantity = 1 * @factor1;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id1, @product_unit_id1, @product_name1, @unit_name1,
  1, @factor1, @base_quantity, @price1, 1 * @price1, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id1;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id1, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @quantity_before = (SELECT stock_quantity FROM products WHERE id = @product_id2);
SET @cost_snapshot = (SELECT latest_purchase_cost FROM products WHERE id = @product_id2);
SET @base_quantity = 1 * @factor2;
SET @quantity_after = @quantity_before - @base_quantity;
INSERT INTO sale_items (
  sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
  quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
) VALUES (
  @sale_id, @product_id2, @product_unit_id2, @product_name2, @unit_name2,
  1, @factor2, @base_quantity, @price2, 1 * @price2, @cost_snapshot
);
SET @sale_item_id = LAST_INSERT_ID();
UPDATE products SET stock_quantity = @quantity_after, updated_at = @event_time
WHERE id = @product_id2;
INSERT INTO inventory_movements (
  product_id, movement_type, quantity_change, quantity_before, quantity_after,
  reference_type, reference_id, reason, performed_by, operation_key, created_at
) VALUES (
  @product_id2, 'SALE', -@base_quantity, @quantity_before, @quantity_after,
  'SALE_ITEM', @sale_item_id, 'Workbench sample checkout',
  @cashier_id, CONCAT('sale:', @sale_item_id), @event_time
);

SET @tendered = CEILING(@sale_total / 1000) * 1000 + 1000;
INSERT INTO sale_payments (
  sale_id, method, amount, tendered_amount, change_amount, reference_no, confirmed_by, confirmed_at
) VALUES (
  @sale_id, 'CASH', @sale_total, @tendered, @tendered - @sale_total,
  NULL, @cashier_id, @event_time
);


COMMIT;

