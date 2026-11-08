USE selo;

CREATE TABLE customers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_no VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(40) NULL,
    points_balance INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_member_no (member_no),
    UNIQUE KEY uq_customers_phone (phone)
) ENGINE = InnoDB;

CREATE TABLE sales (
    id BIGINT NOT NULL AUTO_INCREMENT,
    sale_no VARCHAR(50) NOT NULL,
    cashier_id BIGINT NOT NULL,
    customer_id BIGINT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    loyalty_redeemed_points INT NOT NULL DEFAULT 0,
    loyalty_redeemed_value DECIMAL(18,2) NOT NULL DEFAULT 0,
    loyalty_earned_points INT NOT NULL DEFAULT 0,
    total_payable DECIMAL(18,2) NOT NULL,
    idempotency_key VARCHAR(150) NOT NULL,
    completed_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_sale_no (sale_no),
    UNIQUE KEY uq_sales_idempotency_key (idempotency_key),
    KEY idx_sales_completed_at (completed_at),
    KEY idx_sales_cashier_completed_at (cashier_id, completed_at),
    KEY idx_sales_customer_completed_at (customer_id, completed_at),

    CONSTRAINT fk_sales_cashier
        FOREIGN KEY (cashier_id) REFERENCES users(id),

    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE = InnoDB;

CREATE TABLE sale_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    sale_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_unit_id BIGINT NOT NULL,
    product_name_snapshot VARCHAR(200) NOT NULL,
    unit_name_snapshot VARCHAR(80) NOT NULL,
    quantity INT NOT NULL,
    conversion_factor INT NOT NULL,
    base_quantity INT NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    line_total DECIMAL(18,2) NOT NULL,
    unit_cost_snapshot DECIMAL(18,6) NOT NULL,

    PRIMARY KEY (id),
    KEY idx_sale_items_product (product_id),

    CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id),

    CONSTRAINT fk_sale_items_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_sale_items_product_unit
        FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
) ENGINE = InnoDB;

CREATE TABLE sale_payments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    sale_id BIGINT NOT NULL,
    method VARCHAR(10) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    tendered_amount DECIMAL(18,2) NULL,
    change_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    reference_no VARCHAR(100) NULL,
    confirmed_by BIGINT NOT NULL,
    confirmed_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_sale_payments_sale (sale_id),

    CONSTRAINT fk_sale_payments_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id),

    CONSTRAINT fk_sale_payments_confirmed_by
        FOREIGN KEY (confirmed_by) REFERENCES users(id)
) ENGINE = InnoDB;