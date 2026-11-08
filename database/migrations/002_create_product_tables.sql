USE selo;

CREATE TABLE products (
    id BIGINT NOT NULL AUTO_INCREMENT,
    sku VARCHAR(80) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id BIGINT NULL,
    base_unit_id BIGINT NOT NULL,
    image_path VARCHAR(500) NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    latest_purchase_cost DECIMAL(18,6) NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_name (name),
    KEY idx_products_category (category_id),

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id),

    CONSTRAINT fk_products_base_unit
        FOREIGN KEY (base_unit_id) REFERENCES units(id)
) ENGINE = InnoDB;

CREATE TABLE product_units (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    unit_id BIGINT NOT NULL,
    conversion_factor INT NOT NULL,
    barcode VARCHAR(100) NULL,
    selling_price DECIMAL(18,2) NOT NULL,
    can_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    can_sell BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_product_units_barcode (barcode),
    UNIQUE KEY uq_product_units_product_unit (product_id, unit_id),

    CONSTRAINT fk_product_units_product
        FOREIGN KEY (product_id) REFERENCES products(id),

    CONSTRAINT fk_product_units_unit
        FOREIGN KEY (unit_id) REFERENCES units(id)
) ENGINE = InnoDB;