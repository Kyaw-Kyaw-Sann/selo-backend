USE selo;

ALTER TABLE purchases
    ADD CONSTRAINT chk_purchases_total
        CHECK (total_amount >= 0);

ALTER TABLE purchase_items
    ADD CONSTRAINT chk_purchase_items_quantity
        CHECK (quantity > 0),
    ADD CONSTRAINT chk_purchase_items_conversion
        CHECK (conversion_factor > 0),
    ADD CONSTRAINT chk_purchase_items_base_quantity
        CHECK (
            base_quantity > 0
            AND base_quantity = quantity * conversion_factor
        ),
    ADD CONSTRAINT chk_purchase_items_cost
        CHECK (unit_cost > 0),
    ADD CONSTRAINT chk_purchase_items_line_total
        CHECK (line_total = quantity * unit_cost);