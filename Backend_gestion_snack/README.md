# Gestion Snack - Backend

Ce dossier contient le code source de l'API Backend de l'application de Gestion de Snack. Elle est construite avec Java et le framework Spring Boot.

## Technologies Utilisées

-   **Java 17**
-   **Spring Boot 3** (Web, Data JPA, Security, Validation, Mail)
-   **PostgreSQL** : Base de données relationnelle.
-   **JWT (JSON Web Tokens)** : Pour l'authentification sécurisée.
-   **Lombok** : Pour réduire le code boilerplate.
-   **Swagger / OpenAPI** : Documentation de l'API.

## Configuration

La configuration principale se trouve dans `src/main/resources/application.properties`.

### Paramètres de Base de Données
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/gestion_snack_db
spring.datasource.username=votre_username
spring.datasource.password=votre_password
```

### Configuration JWT
```properties
jwt.secret=votre_clé_secrète_très_longue_pour_la_sécurité
jwt.expiration=86400000 # 24 heures
```

### Configuration Email (Optionnel)
Pour l'envoi d'emails (réinitialisation mot de passe, notifications) :
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=votre_email@gmail.com
spring.mail.password=votre_mot_de_passe_app
```

## Installation et Exécution

1.  **Prérequis** : Assurez-vous d'avoir Java 17+ et Maven installés.
2.  **Base de données** : Créez une base de données PostgreSQL vide.
3.  **Installation des dépendances** :
    ```bash
    mvn clean install
    ```
4.  **Lancement** :
    ```bash
    mvn spring-boot:run
    ```

L'API sera accessible sur `http://localhost:8080`.

## Architecture

Le projet suit une architecture en couches classique :
-   **Controller** (`com.joel.gestion_snack.controller`) : Points d'entrée de l'API REST.
-   **Service** (`com.joel.gestion_snack.service`) : Logique métier.
-   **Repository** (`com.joel.gestion_snack.repository`) : Accès aux données (JPA).
-   **Model/Entity** (`com.joel.gestion_snack.model`) : Entités JPA et DTOs.
-   **Security** (`com.joel.gestion_snack.security`) : Configuration de la sécurité et filtres JWT.

## Documentation de l'API

Une fois l'application lancée, vous pouvez accéder à la documentation Swagger UI à l'adresse suivante :
`http://localhost:8080/swagger-ui/index.html`

## Endpoints Principaux

-   `/api/auth` : Authentification (Login, Register).
-   `/api/orders` : Gestion des commandes.
-   `/api/products` : Gestion des produits.
-   `/api/users` : Gestion des utilisateurs.
-   `/api/reservations` : Gestion des réservations.
-   `/api/tables` : Gestion des tables.
-   `/api/providers` : Gestion des fournisseurs et approvisionnements.
-   `/api/dashboard` : Statistiques pour le tableau de bord.
