# Gestion Snack - Frontend

Ce dossier contient le code source de l'interface utilisateur de l'application de Gestion de Snack. Elle est développée avec React et vite.

## Technologies Utilisées

-   **React** : Bibliothèque UI.
-   **Vite** : Build tool rapide.
-   **TailwindCSS** : Framework CSS utilitaire pour le style.
-   **React Router Dom** : Gestion du routage.
-   **Axios** : Requêtes HTTP vers le backend.
-   **Lucide React** : Icônes.
-   **React Toastify** : Notifications toast.
-   **Chart.js** : Graphiques pour le tableau de bord.
-   **JSPDF** : Génération de tickets PDF.

## Installation et Exécution

1.  **Prérequis** : Assurez-vous d'avoir Node.js (v18+) installé.
2.  **Installation des dépendances** :
    ```bash
    npm install
    ```
3.  **Lancement en mode développement** :
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:5173`.

## Scripts

-   `npm run dev` : Lance le serveur de développement.
-   `npm run build` : Compile l'application pour la production.
-   `npm run lint` : Vérifie la qualité du code.
-   `npm run preview` : Prévisualise le build de production.

## Architecture des Dossiers

-   `src/components` : Composants réutilisables (Layout, Header, Cards...).
-   `src/context` : Contextes React (AuthContext, CartContext...).
-   `src/pages` : Pages de l'application, organisées par rôle :
    -   `admin/` : Pages d'administration (Dashboard, Users, Products...).
    -   `customer/` : Interface client (Menu, Panier, Commandes...).
    -   `waiter/` : Interface serveur (Tables, Commandes...).
    -   `cook/` : Interface cuisine (File d'attente commandes).
-   `src/services` : Logique d'appel API (parfois intégré dans `utils/api`).
-   `src/utils` : Utilitaires (API config, formatage, constantes...).
-   `src/assets` : Images et styles globaux.

## Configuration

L'URL de l'API Backend est configurée dans `src/config/api.js` ou via les variables d'environnement (`.env`).
Par défaut, elle pointe vers `http://localhost:8080/api`.

## Fonctionnalités Clés

-   **Authentification et Rôles** : Redirection automatique vers le tableau de bord approprié selon le rôle (ADMIN, CLIENT, PROVIDER, WAITER, COOK, DELIVERY).
-   **Panier** : Gestion du panier côté client avec persistance locale.
-   **Temps Réel** : Mise à jour des états (via rafraîchissement ou polling).
-   **Responsive** : Interface adaptée aux mobiles et desktops.
