USE selo;

CREATE TABLE suppliers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(40) NULL,
    contact_person VARCHAR(150) NULL,
    address TEXT NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id)
) ENGINE = InnoDB;

CREATE TABLE purchases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    purchase_no VARCHAR(50) NOT NULL,
    supplier_id BIGINT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    notes TEXT NULL,
    received_by BIGINT NOT NULL,
    received_at DATETIME(3) NOT NULL,
    idempotency_key VARCHAR(150) NOT NULL,
    created_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_purchases_purchase_no (purchase_no),
    UNIQUE KEY uq_purchases_idempotency_key (idempotency_key),
    KEY idx_purchases_received_at (received_at),
    KEY idx_purchases_supplier_received_at (supplier_id, received_at),

    CONSTRAINT fk_purchases_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),

    CONSTRAINT fk_purchases_received_by
        FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE = InnoDB;

CREATE TABLE purchase_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    purchase_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_unit_id BIGINT NOT NULL,
    product_name_snapshot VARCHAR(200) NOT NULL,
    unit_name_snapshot VARCHAR(80) NOT NULL,
    quantity INT NOT NULL,
    conversion_factor INT NOT NULL,
    base_quantity INT NOT NULL,
    unit_cost DECIMAL(18,2) NOT NULL,
    line_total DECIMAL(18,2) NOT NULL,

    PRIMARY KEY (id),
    KEY idx_purchase_items_product (product_id),

    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),

    CONSTRAINT fk_purchase_items_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_purchase_items_product_unit
        FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
) ENGINE = InnoDB;