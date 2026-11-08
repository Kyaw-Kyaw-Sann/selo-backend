USE selo;

CREATE TABLE sale_returns (
    id BIGINT NOT NULL AUTO_INCREMENT,
    return_no VARCHAR(50) NOT NULL,
    sale_id BIGINT NOT NULL,
    processed_by BIGINT NOT NULL,
    approved_by BIGINT NULL,
    reason VARCHAR(255) NOT NULL,
    total_return_value DECIMAL(18,2) NOT NULL,
    refund_method VARCHAR(10) NOT NULL,
    refund_amount DECIMAL(18,2) NOT NULL,
    loyalty_restore_points INT NOT NULL DEFAULT 0,
    loyalty_restore_value DECIMAL(18,2) NOT NULL DEFAULT 0,
    earned_points_reversed INT NOT NULL DEFAULT 0,
    unrecovered_points INT NOT NULL DEFAULT 0,
    refund_reference_no VARCHAR(100) NULL,
    idempotency_key VARCHAR(150) NOT NULL,
    completed_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_sale_returns_return_no (return_no),
    UNIQUE KEY uq_sale_returns_idempotency_key (idempotency_key),
    KEY idx_sale_returns_sale_completed_at (sale_id, completed_at),

    CONSTRAINT fk_sale_returns_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id),

    CONSTRAINT fk_sale_returns_processed_by
        FOREIGN KEY (processed_by) REFERENCES users(id),

    CONSTRAINT fk_sale_returns_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE = InnoDB;

CREATE TABLE sale_return_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    sale_return_id BIGINT NOT NULL,
    sale_item_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    base_quantity INT NOT NULL,
    unit_price_snapshot DECIMAL(18,2) NOT NULL,
    return_value DECIMAL(18,2) NOT NULL,
    restock BOOLEAN NOT NULL DEFAULT TRUE,
    reason VARCHAR(255) NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_sale_return_items_return_item (
        sale_return_id,
        sale_item_id
    ),
    KEY idx_sale_return_items_sale_item (sale_item_id),

    CONSTRAINT fk_sale_return_items_return
        FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id),

    CONSTRAINT fk_sale_return_items_sale_item
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
) ENGINE = InnoDB;