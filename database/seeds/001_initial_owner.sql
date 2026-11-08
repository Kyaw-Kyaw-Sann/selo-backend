USE selo;

INSERT INTO users (
    name,
    username,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
)
VALUES (
    'Store Owner',
    'owner',
    '$2b$12$4Uomj5tCyLr8TN3bHGoMc.2WwHOTpaUisY36fMIpi3et3jPKeKzRW',
    'OWNER',
    TRUE,
    UTC_TIMESTAMP(3),
    UTC_TIMESTAMP(3)
);