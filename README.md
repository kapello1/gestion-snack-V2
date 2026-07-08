# Gestion Snack — Application de Gestion de Restauration Rapide

> Application full-stack de gestion d'un snack : commandes, réservations, employés, fournisseurs, caisse, chatbot IA, prise de commandes par le serveur, alertes de stock cuisinier et tableau de bord par rôle.

---

## Table des matières

- [Aperçu du projet](#aperçu-du-projet)
- [Architecture](#architecture)
- [Stack technologique](#stack-technologique)
- [Fonctionnalités par rôle](#fonctionnalités-par-rôle)
- [Flux de commande et statuts](#flux-de-commande-et-statuts)
- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
- [Déploiement en production](#déploiement-en-production)
- [Variables d'environnement](#variables-denvironnement)
- [Structure du projet](#structure-du-projet)
- [API REST — Endpoints](#api-rest--endpoints)
- [Rôles et accès](#rôles-et-accès)
- [Base de données — Schéma](#base-de-données--schéma)
- [Auteur](#auteur)

---

## Aperçu du projet

**Gestion Snack** est une application web complète développée dans le cadre d'un Travail de Fin d'Études (TFE). Elle couvre l'ensemble des opérations d'un snack/restaurant rapide :

- Prise de commandes sur place (client via interface ou serveur en proxy)
- Gestion de la file de cuisine avec statuts précis
- Suivi des stocks et alertes manuelles par le cuisinier
- Traitement des paiements (espèces, carte, Stripe en ligne)
- Remboursements avec correction automatique du chiffre d'affaires
- Gestion des réservations, fournisseurs, employés
- Chatbot IA intégré (Groq — GPT OSS 120B)
- Communication temps réel via WebSocket

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION                               │
│                                                                     │
│  ┌──────────────┐   HTTPS/WSS   ┌──────────────────────────────┐  │
│  │    Vercel    │ ─────────────► │     Render (Spring Boot)     │  │
│  │  (React 19)  │               │   Java 17 · Port 8080        │  │
│  │  Vite build  │               │   WebSocket /ws              │  │
│  └──────────────┘               └──────────────┬───────────────┘  │
│                                                │ JDBC/SSL          │
│                                                ▼                   │
│                               ┌──────────────────────────────┐    │
│                               │  Neon.tech (PostgreSQL 16)   │    │
│                               │  Région : EU Central (FRA)   │    │
│                               │  Serverless · Connexion pool │    │
│                               └──────────────────────────────┘    │
│                                                                     │
│                  ┌───────────────────────────────┐                 │
│                  │  Services externes             │                 │
│                  │  · Groq API (GPT OSS 120B)    │                 │
│                  │  · Stripe (paiements en ligne) │                 │
│                  │  · ElevenLabs (TTS chatbot)   │                 │
│                  │  · Cloudinary (images)        │                 │
│                  └───────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Couche backend — Spring Boot

```
Backend_gestion_snack/
└── com.joel.gestion_snack/
    ├── config/          WebConfig (CORS), WebSocketConfig, CloudinaryConfig, SwaggerConfig
    ├── controller/      REST controllers (interfaces + implémentations)
    │   ├── implementations/  CustomerControllerImpl, OrderControllerImpl,
    │   │                     StockAlertControllerImpl, ...
    │   ├── StripeController  Paiements Stripe + webhooks
    │   └── TransactionController  Historique + remboursements
    ├── model/
    │   ├── dto/         Data Transfer Objects (entrées/sorties API)
    │   └── entity/      Entités JPA (Customer, Order, Transaction, StockAlert, ...)
    ├── repository/      Spring Data JPA repositories
    ├── service/
    │   ├── interfaces/  IOrderService, ICustomerService, IStockAlertService, ...
    │   └── implementations/  OrderServiceImpl, CustomerServiceImpl, ...
    └── utils/           MapperUtil, WebSocketEventPublisher
```

### Couche frontend — React 19

```
frontend_gestion_snack/src/
├── components/        Layout, Navbar, NotificationBell, ProductCard, ...
├── config/api.js      Axios baseURL + tous les endpoints API_ENDPOINTS
├── context/           AuthContext, LanguageContext, NotificationContext
├── lib/wsManager.js   Gestionnaire WebSocket global (reconnexion auto)
├── pages/
│   ├── admin/         Dashboard, Orders, Users, Products, Employees,
│   │                  Providers, Tables, StockAlerts, Transactions, Logs, ...
│   ├── cook/          Orders (cuisine en direct), StockAlerts (alertes manuelles)
│   ├── cashier/       Payments
│   ├── waiter/        Orders (service), Tables, NewOrder (commande client)
│   ├── customer/      Menu, Checkout, Reservations, Profile, ...
│   └── provider/      Orders, Supplies
└── utils/constants.js  Rôles, statuts, labels FR, couleurs sémantiques
```

---

## Stack technologique

| Couche        | Technologie                              | Version   |
|---------------|------------------------------------------|-----------|
| Frontend      | React                                    | 19.x      |
| Routing       | React Router DOM                         | 7.x       |
| UI            | Tailwind CSS                             | 3.x       |
| Build tool    | Vite                                     | 7.x       |
| HTTP Client   | Axios                                    | 1.x       |
| State / Cache | TanStack React Query                     | 5.x       |
| Temps réel    | WebSocket (STOMP via SockJS)             | —         |
| PDF           | jsPDF + jsPDF-AutoTable                  | 3.x / 5.x |
| Paiements     | Stripe.js + API Stripe                   | —         |
| Chatbot IA    | Groq API — modèle GPT OSS 120B           | —         |
| Backend       | Spring Boot                              | 3.5.7     |
| Langage       | Java                                     | 17        |
| ORM           | Spring Data JPA / Hibernate              | —         |
| WebSocket     | Spring WebSocket (STOMP)                 | —         |
| Base données  | PostgreSQL (Neon.tech)                   | 16.x      |
| Sécurité      | Spring Security Crypto (BCrypt)          | —         |
| Chiffrement   | JWT (authentification stateless)         | —         |
| Doc API       | SpringDoc OpenAPI (Swagger UI)           | 2.8.9     |
| Images        | Cloudinary CDN                           | —         |
| Hébergement   | Vercel (frontend) + Render (backend)     | —         |

---

## Fonctionnalités par rôle

### Administrateur
- Tableau de bord global (CA, statistiques en temps réel)
- Gestion complète : employés, rôles, produits, tables, fournisseurs
- Historique de toutes les **transactions** avec bouton de remboursement
- Remboursement automatique : Stripe (API) ou espèces (annulation + correction CA)
- Consultation des alertes de stock non résolues
- Journaux d'audit complets
- Paramètres restaurant

### Cuisinier
- File de commandes en direct (mise à jour WebSocket)
- Workflow de statuts en 3 étapes :
  - **ACTIVE** → "Commencer la préparation" → **IN_PREPARATION**
  - **IN_PREPARATION** → "Marquer comme prête" → **CLOSED** (prête à servir)
- **Alertes de stock** : consultation + déclenchement manuel d'une alerte avec quantité souhaitée et message pour l'administrateur

### Serveur (Waiter)
- Consultation des commandes à servir
- Gestion des tables (statut, attribution)
- **Nouvelle commande au nom d'un client** :
  - Recherche dynamique du client par nom/prénom
  - Création rapide si le client n'a pas de compte (email généré automatiquement)
  - Interface menu complète (plats, boissons, extras)
  - Soumission de la commande au nom du client

### Caissier
- Encaissement des commandes (espèces / carte)
- Clôture et suivi des commandes

### Client
- Menu en ligne (filtres, extras, sauces, viandes, desserts)
- Paiement en ligne sécurisé (Stripe)
- Réservation de tables avec créneaux disponibles
- Avis et notes sur les produits
- Chatbot IA pour aide et réservation

### Fournisseur
- Consultation des commandes de réapprovisionnement
- Gestion des produits fournis

---

## Flux de commande et statuts

```
Client / Serveur
      │
      ▼
  ┌────────┐
  │ ACTIVE │  ← Commande reçue, en attente de la cuisine
  └────────┘
      │  Cuisinier clique "Commencer"
      ▼
┌──────────────┐
│IN_PREPARATION│  ← Cuisinier en train de préparer
└──────────────┘
      │  Cuisinier clique "Marquer prête"
      ▼
  ┌────────┐
  │ CLOSED │  ← Prête à servir, en attente du serveur
  └────────┘
      │  Serveur marque comme servie
      ▼
  ┌────────┐
  │ SERVED │  ← Servie au client
  └────────┘

À tout moment (si ACTIVE uniquement) :
      │  Admin déclenche remboursement
      ▼
┌───────────┐
│ CANCELLED │  ← Annulée / remboursée (CA corrigé automatiquement)
└───────────┘
```

> **Remboursement** : uniquement possible lorsque `orderStatus = ACTIVE` (avant que le cuisinier ne commence). Le CA (`revenue`) est décrémenté automatiquement que ce soit un paiement Stripe ou espèces.

---

## Prérequis

### Développement local
- **Java 17+** — [Télécharger](https://adoptium.net/)
- **Maven 3.9+** — inclus via `mvnw`
- **Node.js 20+** et **npm** — [Télécharger](https://nodejs.org/)
- **PostgreSQL 14+** — base de données locale

### Déploiement
- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [Render](https://render.com) (plan Free)
- Compte [Neon.tech](https://neon.tech) (plan Free)
- Dépôt GitHub (requis par Render et Vercel)

---

## Installation locale

### Base de données PostgreSQL

```sql
CREATE DATABASE gestion_snack;
```

Exécuter le script SQL à la racine du projet :
```bash
psql -U postgres -d gestion_snack -f snack_db_postgres.sql
```

---

### Backend Spring Boot

```bash
cd Backend_gestion_snack

# Windows
mvnw.cmd spring-boot:run

# Linux / Mac
./mvnw spring-boot:run
```

- API disponible sur `http://localhost:8080`
- Documentation Swagger : `http://localhost:8080/swagger-ui.html`

Variables d'environnement locales (optionnel) :
```
DATABASE_URL=jdbc:postgresql://localhost:5432/gestion_snack?stringtype=unspecified
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=1234
```

---

### Frontend React

```bash
cd frontend_gestion_snack
cp .env.example .env
# Éditer .env avec vos valeurs
npm install
npm run dev
```

Application disponible sur `http://localhost:5173`

---

## Déploiement en production

### 1. Base de données — Neon.tech

1. Se connecter à [console.neon.tech](https://console.neon.tech)
2. Ouvrir l'**SQL Editor**
3. Exécuter le contenu de `snack_db_postgres.sql`

| Paramètre  | Valeur                                                              |
|------------|---------------------------------------------------------------------|
| Host       | `ep-ancient-star-alrwjzz0-pooler.c-3.eu-central-1.aws.neon.tech`  |
| Database   | `neondb`                                                            |
| User       | `neondb_owner`                                                      |
| SSL mode   | `require`                                                           |
| Région     | EU Central (Frankfurt)                                              |

---

### 2. Backend — Render

| Paramètre          | Valeur                                              |
|--------------------|-----------------------------------------------------|
| Root Directory     | `Backend_gestion_snack`                             |
| Runtime            | `Java`                                              |
| Build Command      | `mvn clean package -DskipTests`                     |
| Start Command      | `java -jar target/gestion_snack-0.0.1-SNAPSHOT.jar` |

Variables d'environnement Render :

| Variable              | Description                                          |
|-----------------------|------------------------------------------------------|
| `JAVA_VERSION`        | `17`                                                 |
| `DATABASE_URL`        | URL JDBC Neon.tech complète                          |
| `DATABASE_USERNAME`   | `neondb_owner`                                       |
| `DATABASE_PASSWORD`   | Mot de passe Neon.tech                               |
| `ALLOWED_ORIGINS`     | URL Vercel (CORS)                                    |
| `GROQ_API_KEY`        | Clé API Groq                                         |
| `STRIPE_SECRET_KEY`   | Clé secrète Stripe                                   |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe                              |
| `ELEVENLABS_API_KEY`  | Clé ElevenLabs (optionnel — TTS chatbot)             |
| `CLOUDINARY_URL`      | URL Cloudinary (optionnel — images produits)         |

---

### 3. Frontend — Vercel

| Paramètre            | Valeur                   |
|----------------------|--------------------------|
| Framework Preset     | `Vite`                   |
| Root Directory       | `frontend_gestion_snack` |
| Build Command        | `npm run build`          |
| Output Directory     | `dist`                   |

Variables d'environnement Vercel :

| Variable             | Description                    |
|----------------------|--------------------------------|
| `VITE_API_BASE_URL`  | URL backend Render + `/api`    |
| `VITE_GROQ_API_KEY`  | Clé API Groq (chatbot client)  |

---

## Variables d'environnement

### Backend

| Variable              | Requis | Description                          |
|-----------------------|--------|--------------------------------------|
| `DATABASE_URL`        | ✅     | URL JDBC PostgreSQL (Neon.tech)      |
| `DATABASE_USERNAME`   | ✅     | Utilisateur PostgreSQL               |
| `DATABASE_PASSWORD`   | ✅     | Mot de passe PostgreSQL              |
| `ALLOWED_ORIGINS`     | ✅     | URL(s) frontend autorisées (CORS)    |
| `JAVA_VERSION`        | ✅     | `17`                                 |
| `GROQ_API_KEY`        | ✅     | Chatbot IA (Groq API)                |
| `STRIPE_SECRET_KEY`   | ⚠️     | Paiements en ligne                   |
| `STRIPE_WEBHOOK_SECRET` | ⚠️   | Vérification webhooks Stripe         |
| `ELEVENLABS_API_KEY`  | ❌     | Synthèse vocale chatbot              |
| `CLOUDINARY_URL`      | ❌     | Stockage images produits             |

### Frontend

| Variable             | Requis | Description                  |
|----------------------|--------|------------------------------|
| `VITE_API_BASE_URL`  | ✅     | URL de base de l'API backend |
| `VITE_GROQ_API_KEY`  | ✅     | Clé Groq (chatbot)           |

---

## Structure du projet

```
gestion-snack/
├── Backend_gestion_snack/              # API Spring Boot (Java 17)
│   └── src/main/java/com/joel/gestion_snack/
│       ├── config/                     # CORS, WebSocket, Cloudinary, Swagger
│       ├── controller/
│       │   ├── implementations/        # REST Controllers par ressource
│       │   ├── StripeController.java   # Paiements & webhooks Stripe
│       │   └── TransactionController.java  # Historique & remboursements
│       ├── model/
│       │   ├── dto/                    # DTOs (entrées/sorties)
│       │   └── entity/                 # Entités JPA (OrderStatus: ACTIVE, IN_PREPARATION, CLOSED, SERVED, CANCELLED)
│       ├── repository/                 # Spring Data JPA
│       ├── service/
│       │   ├── interfaces/             # Contrats de service
│       │   ├── implementations/        # Logique métier
│       │   ├── AiAssistantService.java # Chatbot Groq (GPT OSS 120B)
│       │   ├── AiProxyService.java     # Proxy Groq + ElevenLabs TTS
│       │   ├── EmailService.java       # Envoi emails
│       │   └── StripeService.java      # Intégration Stripe
│       └── utils/                      # MapperUtil, WebSocketEventPublisher
│
├── frontend_gestion_snack/             # React 19 + Vite + Tailwind CSS
│   └── src/
│       ├── components/layout/          # Layout, Navbar (liens par rôle)
│       ├── config/api.js               # Tous les endpoints API_ENDPOINTS
│       ├── context/                    # Auth, Language, Notifications
│       ├── lib/wsManager.js            # WebSocket STOMP (reconnexion auto)
│       ├── pages/
│       │   ├── admin/                  # Dashboard, Orders, Users, Products,
│       │   │                           # Employees, Providers, Tables,
│       │   │                           # StockAlerts, Transactions, Logs
│       │   ├── cook/                   # Orders (cuisine), StockAlerts (alertes manuelles)
│       │   ├── cashier/                # Payments
│       │   ├── waiter/                 # Orders, Tables, NewOrder (proxy client)
│       │   ├── customer/               # Menu, Checkout, Reservations, Profile
│       │   └── provider/               # Orders, Supplies
│       └── utils/constants.js          # Statuts, labels FR, couleurs
│
├── fichiers/
│   ├── generate_cahier_analyse.py      # Générateur du cahier d'analyse (docx)
│   └── Cahier_danalyse_Gestion_Snack_V3_Final.docx
│
├── snack_db_postgres.sql               # Script de création de la base
├── render.yaml                         # Configuration Render
└── README.md
```

---

## API REST — Endpoints

Documentation complète via **Swagger UI** : `http://localhost:8080/swagger-ui.html`

| Ressource            | Endpoint de base              | Actions principales                              |
|----------------------|-------------------------------|--------------------------------------------------|
| Authentification     | `/api/auth`                   | POST login, vérification 2FA                    |
| Utilisateurs         | `/api/users`                  | GET, POST, PUT, activate/deactivate              |
| Clients              | `/api/customers`              | GET, POST, PUT, `search?name=`, `quick-register` |
| Produits             | `/api/products`               | GET, POST, PUT, DELETE, by-type                  |
| Commandes            | `/api/orders`                 | GET, POST, `start`, `close`, `serve`, `pay`, `cancel` |
| Tables               | `/api/tables`                 | GET, POST, PUT, release, assign-order            |
| Réservations         | `/api/reservations`           | GET, POST, PUT, cancel, availability             |
| Employés             | `/api/employees`              | GET, POST, PUT, activate/deactivate              |
| Fournisseurs         | `/api/providers`              | GET, POST, PUT, supplies                         |
| Alertes stock        | `/api/stock-alerts`           | GET, `POST` (alerte manuelle), resolve, by-product |
| Transactions         | `/api/transactions`           | GET all, `POST /{id}/refund`                     |
| Chiffre d'affaires   | `/api/revenue`                | GET total, GET today                             |
| Avis                 | `/api/reviews`                | GET, POST, PUT, DELETE                           |
| Paiements Stripe     | `/api/stripe`                 | create-payment-intent, confirm-order, refund, webhook |
| Messages chatbot     | `/api/messages`               | GET, POST, notifications                         |
| Logs d'audit         | `/api/audit-logs`             | GET by table/action/user                         |

---

## Rôles et accès

| Rôle        | Valeur enum | Pages / Accès                                                         |
|-------------|-------------|-----------------------------------------------------------------------|
| Admin       | `ADMIN`     | Tableau de bord, toutes les ressources, transactions, alertes stock   |
| Caissier    | `CASHIER`   | Paiements, clôture commandes                                          |
| Serveur     | `WAITER`    | Commandes à servir, tables, **nouvelle commande au nom d'un client**  |
| Cuisinier   | `COOK`      | File de cuisine (ACTIVE/IN_PREPARATION/CLOSED), **alertes de stock**  |
| Client      | `CUSTOMER`  | Menu, checkout Stripe, réservations, avis, chatbot                    |
| Fournisseur | `PROVIDER`  | Commandes d'approvisionnement, produits fournis                       |

> Mot de passe par défaut des comptes créés via trigger PostgreSQL : `1234`

---

## Base de données — Schéma

Schéma défini dans [`snack_db_postgres.sql`](snack_db_postgres.sql).

### Tables principales

| Table              | Description                                         |
|--------------------|-----------------------------------------------------|
| `users`            | Comptes d'accès (liés aux rôles via `owner_id`)     |
| `employees`        | Employés (trigger → création automatique user)      |
| `customers`        | Clients (trigger optionnel ou création via API)     |
| `providers`        | Fournisseurs                                        |
| `products`         | Catalogue produits avec stock (`quantity_available`)|
| `orders`           | Commandes (sur place / à emporter)                  |
| `order_items`      | Lignes de commande                                  |
| `tables_snack`     | Tables physiques du restaurant                      |
| `reservations`     | Réservations de tables                              |
| `transactions`     | Paiements (PENDING / COMPLETED / REFUNDED / FAILED) |
| `revenue`          | Chiffre d'affaires journalier (auto-corrigé)        |
| `stock_alerts`     | Alertes stock (auto SYSTEM + manuelles COOK)        |
| `reviews`          | Avis clients sur les produits                       |
| `provider_products`| Liaisons fournisseurs ↔ produits                   |
| `audit_log`        | Journal d'audit des opérations sensibles            |
| `sauces`           | Extras sauces                                       |
| `desserts`         | Extras desserts                                     |
| `viandes`          | Extras viandes                                      |

### Enum `OrderStatus` (Java — stocké en VARCHAR)

| Valeur           | Signification                             |
|------------------|-------------------------------------------|
| `ACTIVE`         | Commande reçue, en attente cuisine        |
| `IN_PREPARATION` | Cuisinier en cours de préparation         |
| `CLOSED`         | Prête à servir                            |
| `SERVED`         | Servie au client                          |
| `CANCELLED`      | Annulée ou remboursée                     |

---

## Auteur

**Tiegni Bernard Joël**  
Étudiant TFE — Développement Full-Stack  
[tiegnigamobernardjoel@gmail.com](mailto:tiegnigamobernardjoel@gmail.com)

---

*Projet réalisé dans le cadre d'un Travail de Fin d'Études (TFE)*
