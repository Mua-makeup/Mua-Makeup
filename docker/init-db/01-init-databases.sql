-- =============================================================================
-- MAKEUP BOOKING PLATFORM - DOCKER POSTGRESQL MULTI-DATABASE INIT SCRIPT
-- =============================================================================

-- 1. Create Databases for 6 Microservices
CREATE DATABASE user_profile_db;
CREATE DATABASE agency_operations_db;
CREATE DATABASE catalog_media_db;
CREATE DATABASE location_tracking_db;
CREATE DATABASE booking_dispatch_db;
CREATE DATABASE payment_wallet_db;

-- 2. Grant Privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE user_profile_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE agency_operations_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE catalog_media_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE location_tracking_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE booking_dispatch_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE payment_wallet_db TO postgres;

-- 3. Connect to each Database & enable necessary Extensions
\connect location_tracking_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

\connect user_profile_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect agency_operations_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect catalog_media_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect booking_dispatch_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect payment_wallet_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
