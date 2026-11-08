USE selo;

ALTER TABLE sales
    ADD CONSTRAINT chk_sales_amounts
        CHECK (
            subtotal >= 0
            AND loyalty_redeemed_value >= 0
            AND total_payable >= 0
        ),
    ADD CONSTRAINT chk_sales_points
        CHECK (
            loyalty_redeemed_points >= 0
            AND loyalty_earned_points >= 0
        ),
    ADD CONSTRAINT chk_sales_payable
        CHECK (
            total_payable = subtotal - loyalty_redeemed_value
        );

ALTER TABLE sale_items
    ADD CONSTRAINT chk_sale_items_quantity
        CHECK (quantity > 0),
    ADD CONSTRAINT chk_sale_items_conversion
        CHECK (conversion_factor > 0),
    ADD CONSTRAINT chk_sale_items_base_quantity
        CHECK (
            base_quantity > 0
            AND base_quantity = quantity * conversion_factor
        ),
    ADD CONSTRAINT chk_sale_items_price
        CHECK (unit_price > 0),
    ADD CONSTRAINT chk_sale_items_cost
        CHECK (unit_cost_snapshot >= 0),
    ADD CONSTRAINT chk_sale_items_line_total
        CHECK (line_total = quantity * unit_price);

ALTER TABLE sale_payments
    ADD CONSTRAINT chk_sale_payments_method
        CHECK (method IN ('CASH', 'QR')),
    ADD CONSTRAINT chk_sale_payments_amounts
        CHECK (
            amount >= 0
            AND change_amount >= 0
            AND (
                tendered_amount IS NULL
                OR tendered_amount >= 0
            )
        ),
    ADD CONSTRAINT chk_sale_payments_cash
        CHECK (
            method <> 'CASH'
            OR (
                tendered_amount IS NOT NULL
                AND tendered_amount >= amount
                AND change_amount = tendered_amount - amount
            )
        ),
    ADD CONSTRAINT chk_sale_payments_qr_change
        CHECK (
            method <> 'QR'
            OR change_amount = 0
        );