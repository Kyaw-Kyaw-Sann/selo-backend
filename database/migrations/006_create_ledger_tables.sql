USE selo;

CREATE TABLE inventory_movements (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_type VARCHAR(30) NULL,
    reference_id BIGINT NULL,
    reason VARCHAR(255) NULL,
    performed_by BIGINT NOT NULL,
    operation_key VARCHAR(150) NOT NULL,
    created_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_movements_operation_key (operation_key),
    KEY idx_inventory_movements_product_created_at (
        product_id,
        created_at
    ),
    KEY idx_inventory_movements_reference (reference_type, reference_id),

    CONSTRAINT fk_inventory_movements_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_inventory_movements_performed_by
        FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE = InnoDB;

CREATE TABLE loyalty_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    points_change INT NOT NULL,
    balance_after INT NOT NULL,
    sale_id BIGINT NULL,
    sale_return_id BIGINT NULL,
    reference_transaction_id BIGINT NULL,
    performed_by BIGINT NOT NULL,
    operation_key VARCHAR(150) NOT NULL,
    created_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_loyalty_transactions_operation_key (operation_key),
    KEY idx_loyalty_transactions_customer_created_at (
        customer_id,
        created_at
    ),

    CONSTRAINT fk_loyalty_transactions_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id),

    CONSTRAINT fk_loyalty_transactions_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id),

    CONSTRAINT fk_loyalty_transactions_sale_return
        FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id),

    CONSTRAINT fk_loyalty_transactions_reference
        FOREIGN KEY (reference_transaction_id)
        REFERENCES loyalty_transactions(id),

    CONSTRAINT fk_loyalty_transactions_performed_by
        FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE = InnoDB;