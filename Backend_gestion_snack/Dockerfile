# =============================================================
#  Dockerfile — Backend Gestion Snack (Spring Boot 3.5 / Java 17)
#  Build multi-stage : Maven build → JRE runtime allégé
# =============================================================

# ─────────────────────────────────────────────────────────────
# Stage 1 : Compilation avec Maven
# ─────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copier pom.xml en premier pour profiter du cache Docker
# (les dépendances ne sont retéléchargées que si pom.xml change)
COPY pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

# Copier les sources et compiler
COPY src ./src
RUN mvn clean package -DskipTests -B --no-transfer-progress

# ─────────────────────────────────────────────────────────────
# Stage 2 : Image de production (JRE uniquement — image légère)
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Dossier pour les images uploadées des produits
RUN mkdir -p uploads

# Copier uniquement le jar compilé depuis le stage build
COPY --from=build /app/target/gestion_snack-0.0.1-SNAPSHOT.jar app.jar

# Port par défaut (Render injecte automatiquement la variable PORT)
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
