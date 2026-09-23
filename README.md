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
Navigateur ──HTTPS / WSS──► Nginx (VPS OVH, HTTPS Let's Encrypt)
                              ├─ /       fichiers statiques du frontend (React 19, Vite)
                              ├─ /api/   ──► Spring Boot 3.5 (conteneur Docker, 127.0.0.1:8080)
                              └─ /ws     ──► WebSocket STOMP (même backend)
                                               │  Spring Security + JWT (HS256)
                                               │  JDBC / SSL
                                               ▼
                                     PostgreSQL 16 (Neon.tech)

Services externes : Groq (IA) · Stripe (paiements) · ElevenLabs (voix) · Cloudinary (images) · Brevo (e-mails)
```

Le port 8080 du backend n'est jamais exposé sur Internet : seul Nginx est joignable. Chaque appel de l'API (hors connexion, inscription,
catalogue public, webhook Stripe et `/api/health`) et chaque connexion WebSocket exigent un jeton JWT valide.

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
| Sécurité      | Spring Security + JWT (HS256), BCrypt, `@PreAuthorize` | — |
| Tests         | JUnit 5 + Mockito                        | —         |
| Doc API       | SpringDoc OpenAPI (Swagger UI)           | 2.8.9     |
| Images        | Cloudinary CDN                           | —         |
| Hébergement   | VPS OVH (Docker + Nginx + HTTPS)         | —         |

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
- Un VPS OVH (Ubuntu 24.04) et un nom de domaine
- Un compte [Neon.tech](https://neon.tech) pour la base PostgreSQL
- Un dépôt GitHub (GitHub Actions pour la CI/CD)
- Des comptes Stripe, Groq, Brevo et Cloudinary (voir les variables d'environnement)

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

Le déploiement complet, pas à pas (VPS OVH, Docker, Nginx, HTTPS), est décrit dans **[DEPLOIEMENT_OVH.md](DEPLOIEMENT_OVH.md)**.
La mise en place du déploiement automatique (GitHub Actions) est décrite dans **[DEPLOIEMENT_CONTINU.md](DEPLOIEMENT_CONTINU.md)**.

### En résumé

1. **Base de données** : créer la base PostgreSQL chez Neon.tech et exécuter `snack_db_postgres.sql` dans son SQL Editor.
2. **Backend** : `docker compose -f docker-compose.ovh.yml up -d --build`, avec les variables dans `.env` (modèle : `.env.ovh.example`).
3. **Frontend** : `npm ci && npm run build`, puis publication du dossier `dist/` par Nginx.
4. **Redéploiement** : `./deploy/ovh/deploy.sh`, ou automatiquement par GitHub Actions après une CI verte sur `main`.

> `JWT_SECRET` doit être défini avant le premier démarrage (`openssl rand -hex 32`) et ne plus changer ensuite : sans lui, une clé temporaire
> est créée à chaque démarrage et tous les utilisateurs sont déconnectés à chaque déploiement.

---

## Variables d'environnement

### Backend

| Variable                 | Requis | Description                                                       |
|--------------------------|--------|-------------------------------------------------------------------|
| `JWT_SECRET`             | ✅     | Clé de signature des jetons JWT (`openssl rand -hex 32`)          |
| `JWT_EXPIRATION_MINUTES` | ❌     | Durée d'une session en minutes (480 = 8 h par défaut)             |
| `DATABASE_URL`           | ✅     | URL JDBC PostgreSQL                                               |
| `DATABASE_USERNAME`      | ✅     | Utilisateur PostgreSQL                                            |
| `DATABASE_PASSWORD`      | ✅     | Mot de passe PostgreSQL                                           |
| `ALLOWED_ORIGINS`        | ✅     | Origine(s) du frontend autorisée(s) : CORS et WebSocket           |
| `FRONTEND_URL`           | ✅     | URL publique, utilisée dans les liens des e-mails                 |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✅ | Stockage des images produits |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | ⚠️ | E-mails (codes de vérification, mot de passe oublié, accueil du personnel) |
| `STRIPE_SECRET_KEY`      | ⚠️     | Paiements en ligne                                                |
| `STRIPE_WEBHOOK_SECRET`  | ⚠️     | Vérification de la signature des webhooks Stripe                  |
| `GROQ_API_KEY`           | ⚠️     | Chatbot IA                                                        |
| `ELEVENLABS_API_KEY`     | ❌     | Voix du chatbot (optionnel)                                       |

### Frontend

| Variable                      | Requis | Description                                          |
|-------------------------------|--------|------------------------------------------------------|
| `VITE_API_BASE_URL`           | ✅     | URL de base de l'API backend (se termine par `/api`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ⚠️     | Clé publique Stripe (paiement par carte)             |

Les clés Groq et ElevenLabs ne sont jamais exposées au navigateur : elles restent côté backend.

---

## Structure du projet

```
gestion-snack/
├── Backend_gestion_snack/              # API Spring Boot (Java 17)
│   └── src/main/java/com/joel/gestion_snack/
│       ├── config/                     # WebSocket, Cloudinary, Swagger, gestion des erreurs
│       ├── security/                   # Spring Security, JWT, règles d'accès (rôle + propriété des données)
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
├── deploy/ovh/                         # Config Nginx, script de déploiement, réparation SQL
├── .github/workflows/                  # CI (ci.yml) et déploiement continu (deploy.yml)
├── docker-compose.ovh.yml              # Backend en conteneur sur le VPS
├── DEPLOIEMENT_OVH.md                  # Guide de déploiement complet
├── DEPLOIEMENT_CONTINU.md              # Déploiement automatique (GitHub Actions)
├── snack_db_postgres.sql               # Script de création de la base
├── render.yaml                         # Ancienne configuration Render (hébergement précédent)
└── README.md
```

---

## API REST — Endpoints

Documentation complète via **Swagger UI** : `http://localhost:8080/swagger-ui.html`

Tous les endpoints, sauf la connexion, l'inscription, le catalogue public (`GET /api/products`), le webhook Stripe et `/api/health`, exigent
l'en-tête `Authorization: Bearer <jeton>` (jeton renvoyé par `POST /api/auth/login`). Sans jeton valide : `401`. Rôle insuffisant : `403`.

| Ressource            | Endpoint de base              | Actions principales                              |
|----------------------|-------------------------------|--------------------------------------------------|
| Authentification     | `/api/auth`                   | POST login (renvoie le jeton JWT), vérification 2FA |
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

> Mot de passe par défaut des comptes créés via trigger PostgreSQL : `1234`, modifiable depuis « Mon profil ». Le personnel reçoit un e-mail d'accueil avec ses identifiants.
>
> Les droits sont contrôlés **côté serveur** (`@PreAuthorize` sur chaque endpoint, plus la propriété des données : un client ne lit que ses propres commandes).

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
