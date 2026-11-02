ALTER TABLE booking_schema.bookings
    ADD COLUMN instant_base_price NUMERIC(12,2),
    ADD COLUMN instant_demand_count INTEGER,
    ADD COLUMN instant_supply_count INTEGER,
    ADD COLUMN instant_pricing_reason VARCHAR(255);
