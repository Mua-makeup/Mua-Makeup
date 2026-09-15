-- Tạo sequence độc lập cho telemetry_logs để Hibernate SchemaValidator nhận diện và tương thích hoàn toàn với composite IDs
ALTER TABLE telemetry_schema.telemetry_logs ALTER COLUMN id DROP IDENTITY IF EXISTS;
CREATE SEQUENCE IF NOT EXISTS telemetry_schema.telemetry_logs_seq;
ALTER TABLE telemetry_schema.telemetry_logs ALTER COLUMN id SET DEFAULT nextval('telemetry_schema.telemetry_logs_seq');
SELECT setval('telemetry_schema.telemetry_logs_seq', COALESCE((SELECT MAX(id) FROM telemetry_schema.telemetry_logs), 0) + 1, false);
