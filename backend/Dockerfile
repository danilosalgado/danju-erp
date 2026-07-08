# StorePro Backend Dockerfile
# Multi-stage build: Maven build + JRE runtime

FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
# Download dependencies first (cached layer)
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# Create a non-root user
RUN addgroup -S storepro && adduser -S storepro -G storepro
USER storepro

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
