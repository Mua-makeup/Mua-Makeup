FROM postgis/postgis:16-3.4-alpine

LABEL maintainer="makeup-platform-team"
LABEL description="PostgreSQL 16 with PostGIS extension for Makeup Booking Platform"

# Default environment variables (can be overridden during docker run)
ENV POSTGRES_DB=makeup_platform_db
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=123456

# Auto-execute init scripts when the container initializes
COPY 01-init-databases.sql /docker-entrypoint-initdb.d/01-init-databases.sql

EXPOSE 5432
