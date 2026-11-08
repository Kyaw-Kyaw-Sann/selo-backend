USE selo;

ALTER TABLE products
    ADD CONSTRAINT chk_products_stock
        CHECK (stock_quantity >= 0),
    ADD CONSTRAINT chk_products_min_stock
        CHECK (min_stock_level >= 0),
    ADD CONSTRAINT chk_products_purchase_cost
        CHECK (latest_purchase_cost >= 0);

ALTER TABLE product_units
    ADD CONSTRAINT chk_product_units_conversion
        CHECK (conversion_factor > 0),
    ADD CONSTRAINT chk_product_units_price
        CHECK (
            selling_price >= 0
            AND (can_sell = FALSE OR selling_price > 0)
        );

ALTER TABLE customers
    ADD CONSTRAINT chk_customers_points
        CHECK (points_balance >= 0);