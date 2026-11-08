USE selo;

ALTER TABLE inventory_movements
    ADD CONSTRAINT chk_inventory_movements_type
        CHECK (
            movement_type IN (
                'OPENING', 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT'
            )
        ),
    ADD CONSTRAINT chk_inventory_movements_balances
        CHECK (
            quantity_before >= 0
            AND quantity_after >= 0
        ),
    ADD CONSTRAINT chk_inventory_movements_calculation
        CHECK (
            quantity_after = quantity_before + quantity_change
        );

ALTER TABLE loyalty_transactions
    ADD CONSTRAINT chk_loyalty_transactions_balance
        CHECK (balance_after >= 0),
    ADD CONSTRAINT chk_loyalty_transactions_change
        CHECK (
            (
                type IN ('EARN', 'RESTORE')
                AND points_change > 0
            )
            OR (
                type IN ('REDEEM', 'REVERSE')
                AND points_change < 0
            )
        );