FROM redis:7-alpine

LABEL maintainer="makeup-platform-team"
LABEL description="Redis 7 Alpine with custom configuration for Makeup Booking Platform"

# Copy custom Redis configuration
COPY redis.conf /usr/local/etc/redis/redis.conf

EXPOSE 6379

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
