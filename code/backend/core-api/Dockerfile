FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy gradle wrapper & configuration
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle settings.gradle gradle.properties ./

# Grant execution rights and pre-download dependencies to cache layers
RUN chmod +x ./gradlew && ./gradlew dependencies --no-daemon || true

# Copy source code and build application jar
COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Minimal Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Add non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy built jar from builder stage
COPY --from=builder --chown=spring:spring /app/build/libs/*.jar app.jar

ENV SERVER_PORT=8080 \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
