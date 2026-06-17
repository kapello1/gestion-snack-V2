# Gestion Snack - Application de Gestion de Restauration Rapide

> Application full-stack de gestion d'un snack : commandes, réservations, employés, fournisseurs, caisse, chatbot intégré et tableaux de bord par rôle.

---

## Table des matières

- [Aperçu du projet](#aperçu-du-projet)
- [Architecture](#architecture)
- [Stack technologique](#stack-technologique)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
  - [Base de données PostgreSQL](#base-de-données-postgresql)
  - [Backend Spring Boot](#backend-spring-boot)
  - [Frontend React](#frontend-react)
- [Déploiement en production](#déploiement-en-production)
  - [1. Base de données - Neon.tech](#1-base-de-données--neontech)
  - [2. Backend - Render](#2-backend--render)
  - [3. Frontend - Vercel](#3-frontend--vercel)
- [Variables d'environnement](#variables-denvironnement)
  - [Backend (Render)](#backend-render)
  - [Frontend (Vercel)](#frontend-vercel)
- [Structure du projet](#structure-du-projet)
- [API REST - Endpoints principaux](#api-rest--endpoints-principaux)
- [Rôles et accès](#rôles-et-accès)
- [Base de données - Schéma](#base-de-données--schéma)
- [Auteur](#auteur)

---

## Aperçu du projet

**Gestion Snack** est une application web complète développée dans le cadre d'un Travail de Fin d'Études (TFE). Elle permet de gérer l'ensemble des opérations d'un snack/restaurant rapide : prise de commandes (sur place ou à emporter), gestion des réservations de tables, suivi des stocks, gestion des employés et fournisseurs, traitement des paiements et consultation du chiffre d'affaires.

Un **chatbot** basé sur l'API Groq est intégré pour assister les clients et le personnel.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                           │
│                                                             │
│  ┌─────────────┐    HTTPS    ┌─────────────────────────┐   │
│  │   Vercel    │ ──────────► │   Render (Spring Boot)  │   │
│  │  (React 19) │             │   Java 17 / Port 8080   │   │
│  └─────────────┘             └────────────┬────────────┘   │
│                                           │ PostgreSQL      │
│                                           ▼                 │
│                              ┌─────────────────────────┐   │
│                              │   Neon.tech (PostgreSQL) │   │
│                              │   Region: eu-central-1   │   │
│                              └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack technologique

| Couche       | Technologie                              | Version  |
|--------------|------------------------------------------|----------|
| Frontend     | React                                    | 19.x     |
| Routing      | React Router DOM                         | 7.x      |
| UI           | Tailwind CSS                             | 3.x      |
| Build tool   | Vite                                     | 7.x      |
| HTTP Client  | Axios                                    | 1.x      |
| PDF          | jsPDF + jsPDF-AutoTable                  | 3.x / 5.x|
| Chatbot      | Groq API                                 | -        |
| Backend      | Spring Boot                              | 3.5.7    |
| Langage      | Java                                     | 17       |
| ORM          | Spring Data JPA / Hibernate              | -        |
| Base données | PostgreSQL (Neon.tech)                   | 16.x     |
| Sécurité     | Spring Security Crypto (BCrypt)          | -        |
| Doc API      | SpringDoc OpenAPI (Swagger UI)           | 2.8.9    |
| Hébergement  | Vercel (frontend) + Render (backend)     | -        |

---

## Fonctionnalités

### Par rôle

| Rôle       | Fonctionnalités principales                                                                 |
|------------|---------------------------------------------------------------------------------------------|
| **Admin**  | Tableau de bord global, gestion employés/rôles, consultation revenus, gestion fournisseurs  |
| **Caissier** | Gestion des paiements, clôture de commandes, suivi transactions                          |
| **Serveur** | Prise de commandes, gestion tables, suivi statuts                                          |
| **Cuisinier** | File de commandes en cuisine, mise à jour des statuts (en préparation → prêt)           |
| **Client** | Consultation menu, réservations en ligne, avis, historique commandes                        |
| **Fournisseur** | Gestion des approvisionnements et produits fournis                                    |

### Fonctionnalités communes
- Authentification par nom d'utilisateur / mot de passe (BCrypt)
- Modification du profil et changement de mot de passe
- Chatbot intégré (Groq AI)
- Alertes de stock faible
- Export PDF des rapports
- Interface responsive (Tailwind CSS)

---

## Prérequis

### Développement local
- **Java 17+** - [Télécharger](https://adoptium.net/)
- **Maven 3.9+** - inclus via `mvnw`
- **Node.js 20+** et **npm** - [Télécharger](https://nodejs.org/)
- **PostgreSQL 14+** - base de données locale

### Déploiement
- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [Render](https://render.com) (plan Free)
- Compte [Neon.tech](https://neon.tech) (plan Free)
- Dépôt GitHub (requis par Render et Vercel)

---

## Installation locale

### Base de données PostgreSQL

1. Créer la base de données :
   ```sql
   CREATE DATABASE gestion_snack;
   ```

2. Exécuter le script SQL à la racine du projet :
   ```bash
   psql -U postgres -d gestion_snack -f snack_db_postgres.sql
   ```
   Ou ouvrir le fichier dans pgAdmin et l'exécuter sur la base `gestion_snack`.

---

### Backend Spring Boot

1. Se placer dans le dossier backend :
   ```bash
   cd Backend_gestion_snack
   ```

2. Lancer l'application (Maven Wrapper inclus) :
   ```bash
   # Windows
   mvnw.cmd spring-boot:run

   # Linux / Mac
   ./mvnw spring-boot:run
   ```

3. L'API est disponible sur `http://localhost:8080`

4. Documentation Swagger : `http://localhost:8080/swagger-ui.html`

> **Variables d'environnement locales** (optionnel, sinon les valeurs par défaut sont utilisées) :
> ```
> DATABASE_URL=jdbc:postgresql://localhost:5432/gestion_snack?stringtype=unspecified
> DATABASE_USERNAME=postgres
> DATABASE_PASSWORD=1234
> ```

---

### Frontend React

1. Se placer dans le dossier frontend :
   ```bash
   cd frontend_gestion_snack
   ```

2. Copier le fichier d'environnement exemple :
   ```bash
   cp .env.example .env
   ```

3. Éditer `.env` et renseigner vos valeurs :
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   VITE_GROQ_API_KEY=votre_cle_groq
   ```

4. Installer les dépendances et lancer :
   ```bash
   npm install
   npm run dev
   ```

5. L'application est disponible sur `http://localhost:5173`

---

## Déploiement en production

### 1. Base de données - Neon.tech

La base de données est hébergée sur **Neon.tech** (PostgreSQL serverless).

#### Initialiser le schéma

1. Se connecter à [console.neon.tech](https://console.neon.tech)
2. Ouvrir l'**SQL Editor** de votre projet
3. Copier-coller et exécuter le contenu du fichier **`snack_db_postgres.sql`** (à la racine du projet)

> Le script est idempotent (`CREATE ... IF NOT EXISTS`, `DROP ... IF EXISTS`) - il peut être exécuté plusieurs fois sans risque.

#### Chaîne de connexion Neon.tech

| Paramètre         | Valeur                                                                 |
|-------------------|------------------------------------------------------------------------|
| **Host**          | `ep-ancient-star-alrwjzz0-pooler.c-3.eu-central-1.aws.neon.tech`     |
| **Database**      | `neondb`                                                               |
| **User**          | `neondb_owner`                                                         |
| **SSL mode**      | `require`                                                              |
| **Région**        | EU Central (Frankfurt)                                                 |

URL JDBC à utiliser dans Render :
```
jdbc:postgresql://ep-ancient-star-alrwjzz0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&stringtype=unspecified
```

---

### 2. Backend - Render

#### Étape 1 - Connecter le dépôt GitHub

1. Aller sur [dashboard.render.com](https://dashboard.render.com)
2. Cliquer **"New" → "Web Service"**
3. Connecter votre dépôt GitHub
4. Sélectionner le dépôt `gestion-snack`

#### Étape 2 - Configurer le service

| Paramètre          | Valeur                                              |
|--------------------|-----------------------------------------------------|
| **Name**           | `gestion-snack-backend`                             |
| **Root Directory** | `Backend_gestion_snack`                             |
| **Runtime**        | `Java`                                              |
| **Build Command**  | `mvn clean package -DskipTests`                     |
| **Start Command**  | `java -jar target/gestion_snack-0.0.1-SNAPSHOT.jar` |
| **Plan**           | `Free`                                              |

#### Étape 3 - Variables d'environnement

Dans l'onglet **"Environment"** du service Render, ajouter :

| Variable           | Valeur                                                                                               |
|--------------------|------------------------------------------------------------------------------------------------------|
| `JAVA_VERSION`     | `17`                                                                                                 |
| `DATABASE_URL`     | `jdbc:postgresql://ep-ancient-star-alrwjzz0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&stringtype=unspecified` |
| `DATABASE_USERNAME`| `neondb_owner`                                                                                       |
| `DATABASE_PASSWORD`| `npg_oTt3xbY6NGaf`                                                                                  |
| `ALLOWED_ORIGINS`  | `https://votre-app.vercel.app` *(à mettre à jour après le déploiement Vercel)*                      |

> **Important** : Le plan Free de Render met le service en veille après 15 minutes d'inactivité. Le premier appel peut prendre ~30–60 secondes (cold start).

#### Étape 4 - Déployer

Cliquer **"Create Web Service"**. Render build et démarre automatiquement.

L'URL du backend sera de la forme : `https://gestion-snack-backend.onrender.com`

---

### 3. Frontend - Vercel

#### Étape 1 - Importer le projet

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Importer le dépôt GitHub `gestion-snack`
3. Configurer :

| Paramètre               | Valeur                    |
|-------------------------|---------------------------|
| **Framework Preset**    | `Vite`                    |
| **Root Directory**      | `frontend_gestion_snack`  |
| **Build Command**       | `npm run build`           |
| **Output Directory**    | `dist`                    |
| **Install Command**     | `npm install`             |

#### Étape 2 - Variables d'environnement

Dans **"Environment Variables"** de Vercel, ajouter :

| Variable             | Valeur                                                     |
|----------------------|------------------------------------------------------------|
| `VITE_API_BASE_URL`  | `https://gestion-snack-backend.onrender.com/api`           |
| `VITE_GROQ_API_KEY`  | Votre clé API Groq                                         |

#### Étape 3 - Déployer

Cliquer **"Deploy"**. L'URL sera de la forme : `https://gestion-snack.vercel.app`

#### Étape 4 - Mettre à jour CORS sur Render

Revenir sur Render et mettre à jour la variable `ALLOWED_ORIGINS` avec l'URL Vercel obtenue :
```
ALLOWED_ORIGINS=https://gestion-snack.vercel.app
```
Render redéploie automatiquement.

---

## Variables d'environnement

### Backend (Render)

| Variable            | Description                                       | Requis en prod |
|---------------------|---------------------------------------------------|----------------|
| `DATABASE_URL`      | URL JDBC complète de la base Neon.tech            | ✅             |
| `DATABASE_USERNAME` | Nom d'utilisateur PostgreSQL                      | ✅             |
| `DATABASE_PASSWORD` | Mot de passe PostgreSQL                           | ✅             |
| `ALLOWED_ORIGINS`   | URL(s) Vercel autorisées pour CORS (virgule-sep.) | ✅             |
| `JAVA_VERSION`      | Version Java (17)                                 | ✅             |
| `PORT`              | Port d'écoute (défaut : 8080)                     | ❌             |

### Frontend (Vercel)

| Variable            | Description                              | Requis en prod |
|---------------------|------------------------------------------|----------------|
| `VITE_API_BASE_URL` | URL de base de l'API backend             | ✅             |
| `VITE_GROQ_API_KEY` | Clé API Groq pour le chatbot             | ✅             |

---

## Structure du projet

```
gestion-snack/
├── Backend_gestion_snack/                   # API Spring Boot
│   ├── src/
│   │   └── main/
│   │       ├── java/com/joel/gestion_snack/
│   │       │   ├── config/                  # WebConfig, DatabaseInitializer
│   │       │   ├── controller/              # REST Controllers (interfaces + implémentations)
│   │       │   ├── model/
│   │       │   │   ├── dto/                 # Data Transfer Objects
│   │       │   │   └── entity/              # Entités JPA
│   │       │   ├── repository/              # Spring Data JPA Repositories
│   │       │   ├── service/                 # Couche métier
│   │       │   └── utils/                  # Utilitaires
│   │       └── resources/
│   │           ├── application.properties   # Configuration (env vars)
│   │           └── chatbot/                 # Données chatbot
│   ├── pom.xml
│   └── mvnw / mvnw.cmd                      # Maven Wrapper
│
├── frontend_gestion_snack/                  # Application React
│   ├── src/
│   │   ├── components/                      # Composants réutilisables
│   │   ├── config/
│   │   │   └── api.js                       # Configuration Axios + endpoints
│   │   ├── context/                         # Contextes React (auth, etc.)
│   │   ├── pages/                           # Pages par rôle
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── cashier/
│   │   │   ├── cook/
│   │   │   ├── customer/
│   │   │   ├── provider/
│   │   │   └── waiter/
│   │   ├── utils/                           # Fonctions utilitaires
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example                         # Template des variables d'environnement
│   ├── vercel.json                          # Configuration Vercel (SPA routing)
│   ├── vite.config.js
│   └── package.json
│
├── snack_db_postgres.sql                    # Script de création de la base de données
├── render.yaml                             # Configuration du service Render
└── README.md
```

---

## API REST - Endpoints principaux

La documentation complète est disponible sur **Swagger UI** : `http://localhost:8080/swagger-ui.html` (local) ou `https://gestion-snack-backend.onrender.com/swagger-ui.html` (production).

| Ressource         | Endpoint de base         | Méthodes          |
|-------------------|--------------------------|-------------------|
| Authentification  | `/api/auth`              | POST              |
| Utilisateurs      | `/api/users`             | GET, POST, PUT    |
| Clients           | `/api/customers`         | GET, POST, PUT    |
| Produits          | `/api/products`          | GET, POST, PUT, DELETE |
| Commandes         | `/api/orders`            | GET, POST, PUT    |
| Tables            | `/api/tables`            | GET, POST, PUT    |
| Réservations      | `/api/reservations`      | GET, POST, PUT    |
| Employés          | `/api/employees`         | GET, POST, PUT    |
| Fournisseurs      | `/api/providers`         | GET, POST, PUT    |
| Avis              | `/api/reviews`           | GET, POST, DELETE |
| Alertes stock     | `/api/stock-alerts`      | GET, PUT          |
| Chiffre d'affaires| `/api/revenue`           | GET               |
| Messages chatbot  | `/api/messages`          | GET, POST         |

---

## Rôles et accès

| Rôle         | Valeur enum   | Description                                        |
|--------------|---------------|----------------------------------------------------|
| Admin        | `ADMIN`       | Accès complet à toutes les fonctionnalités         |
| Caissier     | `CASHIER`     | Paiements, transactions, clôture commandes         |
| Serveur      | `WAITER`      | Commandes, tables, service en salle                |
| Cuisinier    | `COOK`        | File de préparation, statuts cuisine               |
| Client       | `CUSTOMER`    | Menu, réservations, avis, commandes en ligne       |
| Fournisseur  | `PROVIDER`    | Approvisionnements et produits                     |

> **Mot de passe par défaut** pour les comptes créés automatiquement via les triggers : `1234`

---

## Base de données - Schéma

Le schéma est défini dans [`snack_db_postgres.sql`](snack_db_postgres.sql) à la racine du projet.

**Tables principales :**

| Table             | Description                                   |
|-------------------|-----------------------------------------------|
| `users`           | Comptes d'accès (liés aux rôles)              |
| `employees`       | Employés (trigger → création automatique user)|
| `customers`       | Clients (trigger → création automatique user) |
| `providers`       | Fournisseurs                                  |
| `products`        | Catalogue produits avec stock                 |
| `orders`          | Commandes (sur place / à emporter)            |
| `order_items`     | Lignes de commande                            |
| `tables_snack`    | Tables physiques du restaurant                |
| `reservations`    | Réservations de tables                        |
| `transactions`    | Transactions de paiement                      |
| `revenue`         | Chiffre d'affaires journalier                 |
| `stock_alerts`    | Alertes de rupture de stock                   |
| `reviews`         | Avis clients                                  |
| `provider_products`| Liaisons fournisseurs ↔ produits             |
| `audit_log`       | Journal d'audit des opérations                |

**Types énumérés PostgreSQL :**
- `role_type` : `ADMIN`, `CUSTOMER`, `CASHIER`, `WAITER`, `COOK`, `PROVIDER`
- `product_type` : `FOOD`, `DRINK`
- `table_status_type` : `FREE`, `OCCUPIED`, `RESERVED`
- `order_status_type` : `PENDING`, `IN_PROGRESS`, `SERVED`, `CLOSED`, `CANCELLED`
- `order_type_type` : `DINE_IN`, `TAKEAWAY`
- `payment_method_type` : `CASH`, `CARD`

---

## Auteur

**Tiegni Bernard Joël**
Étudiant TFE - Développement Full-Stack
[tiegnigamobernardjoel@gmail.com](mailto:tiegnigamobernardjoel@gmail.com)

---

*Projet réalisé dans le cadre d'un Travail de Fin d'Études (TFE)*
