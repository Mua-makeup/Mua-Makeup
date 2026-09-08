CREATE DATABASE user_profile_db;

CREATE DATABASE agency_operations_db;

CREATE DATABASE catalog_media_db;

CREATE DATABASE location_tracking_db;

CREATE DATABASE booking_dispatch_db;

CREATE DATABASE payment_wallet_db;

GRANT ALL PRIVILEGES ON DATABASE user_profile_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE agency_operations_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE catalog_media_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE location_tracking_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE booking_dispatch_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE payment_wallet_db TO postgres;


\connect location_tracking_db;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
