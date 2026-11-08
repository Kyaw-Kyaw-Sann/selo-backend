USE selo;

ALTER TABLE sale_returns
    ADD CONSTRAINT chk_sale_returns_amounts
        CHECK (
            total_return_value >= 0
            AND refund_amount >= 0
            AND loyalty_restore_value >= 0
        ),
    ADD CONSTRAINT chk_sale_returns_points
        CHECK (
            loyalty_restore_points >= 0
            AND earned_points_reversed >= 0
            AND unrecovered_points >= 0
        ),
    ADD CONSTRAINT chk_sale_returns_refund_method
        CHECK (refund_method IN ('CASH', 'QR', 'NONE')),
    ADD CONSTRAINT chk_sale_returns_refund_total
        CHECK (
            total_return_value = refund_amount + loyalty_restore_value
        ),
    ADD CONSTRAINT chk_sale_returns_none_refund
        CHECK (
            refund_method <> 'NONE'
            OR refund_amount = 0
        ),
    ADD CONSTRAINT chk_sale_returns_approval
        CHECK (
            unrecovered_points = 0
            OR approved_by IS NOT NULL
        );

ALTER TABLE sale_return_items
    ADD CONSTRAINT chk_sale_return_items_quantity
        CHECK (
            quantity > 0
            AND base_quantity > 0
        ),
    ADD CONSTRAINT chk_sale_return_items_price
        CHECK (unit_price_snapshot > 0),
    ADD CONSTRAINT chk_sale_return_items_value
        CHECK (
            return_value = quantity * unit_price_snapshot
        );