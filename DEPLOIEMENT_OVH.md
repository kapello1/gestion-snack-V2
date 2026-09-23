# Déploiement sur OVH - Guide complet

Ce guide part du principe que tu as déjà :

- Commandé un VPS OVH (VPS-1 recommandé : 2 vCore / 4 Go RAM / 40 Go NVMe) avec Ubuntu 24.04 LTS
- Acheté un nom de domaine (chez OVH ou ailleurs)
- Reçu (ou en attente) l'e-mail OVH de confirmation

Tout ce qui suit va de la réception des identifiants jusqu'à l'application en ligne, en HTTPS, sur ton propre domaine, avec un déploiement qui se lance tout seul à chaque push sur `main`.

**Fichiers déjà prêts dans le repo** (vérifiés contre le code réel du projet) :

| Fichier | Rôle |
|---|---|
| [docker-compose.ovh.yml](docker-compose.ovh.yml) | Build + lance le backend Spring Boot en conteneur |
| [.env.ovh.example](.env.ovh.example) | Modèle des variables d'environnement du backend |
| [deploy/ovh/gestion-snack.nginx.conf](deploy/ovh/gestion-snack.nginx.conf) | Reverse proxy Nginx (API + WebSocket + frontend statique) |
| [deploy/ovh/deploy.sh](deploy/ovh/deploy.sh) | Script de redéploiement en une commande |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | Déploiement automatique via GitHub Actions (étape 12) |
| [DEPLOIEMENT_CONTINU.md](DEPLOIEMENT_CONTINU.md) | Mise en place détaillée du déploiement automatique |

## Architecture cible

**Un seul domaine.** Nginx, installé sur l'hôte, route `/api` et `/ws` vers le backend Docker (joignable en local uniquement : le port 8080 n'est jamais exposé sur Internet) et sert les fichiers statiques du frontend pour tout le reste.

```
Navigateur --HTTPS--> Nginx (VPS)
                        |-- /            fichiers statiques du frontend (/var/www/gestion-snack/frontend)
                        |-- /api/        backend Spring Boot (Docker, 127.0.0.1:8080)
                        `-- /ws          WebSocket STOMP vers le même backend
```

La base de données (Neon.tech), le stockage d'images (Cloudinary), l'e-mail (Brevo), les paiements (Stripe) et l'IA (Groq / ElevenLabs) restent des services externes.

**Sécurité de l'API.** Le backend utilise Spring Security avec des jetons JWT : chaque appel `/api` (sauf connexion, inscription, catalogue, webhook Stripe et `/api/health`) et chaque connexion WebSocket exigent un jeton valide, et le rôle est revérifié côté serveur. Nginx transmet l'en-tête `Authorization` tel quel : il n'y a rien de spécial à configurer. En revanche, **le backend a besoin d'une variable `JWT_SECRET`** (étape 4).

---

## Étape 1 - Réception des identifiants et première connexion

1. Après le paiement, OVH envoie un premier e-mail de confirmation de commande, puis un second (quelques minutes à environ 1 h après) une fois le VPS prêt, contenant :
   - L'**adresse IP** du VPS
   - Un **nom d'utilisateur** (ex : `ubuntu`, `debian`, ou un nom choisi à la commande) et son **mot de passe**. De plus en plus d'images OVH ne donnent plus directement `root`, pour des raisons de sécurité.
2. Connecte-toi en SSH avec cet utilisateur :
   ```bash
   ssh <TON_UTILISATEUR>@<IP_DU_VPS>
   ```
   Tape `yes` si on te demande de confirmer l'empreinte du serveur, puis colle le mot de passe reçu par e-mail (invisible en tapant, c'est normal).
3. Vérifie que tu as bien les droits `sudo` (ils servent pour tout le reste du guide) :
   ```bash
   sudo -v
   ```
   Si `sudo` demande un mot de passe, c'est celui de ton utilisateur. S'il refuse (utilisateur absent du groupe `sudo`), ouvre la console (KVM) de ton espace client OVH, connecte-toi avec le compte root et lance `usermod -aG sudo <TON_UTILISATEUR>`.
4. Le mot de passe reçu par e-mail a circulé en clair : remplace-le par un mot de passe personnel.
   ```bash
   passwd
   ```

Toutes les commandes qui suivent se lancent avec ton utilisateur normal, en préfixant par `sudo` quand c'est indiqué. C'est ce même utilisateur que GitHub Actions utilisera pour déployer.

---

## Étape 2 - Mise à jour et installation des prérequis

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ca-certificates

# Docker (Engine + plugin Compose)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# Node.js 22 LTS - IMPORTANT : le frontend utilise Vite 7, qui exige Node >= 20.19
# (le paquet "nodejs" par défaut d'Ubuntu 24.04 est trop ancien et fera échouer le build)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx, Certbot (HTTPS), Git, rsync, pare-feu, outils DNS
sudo apt install -y nginx certbot python3-certbot-nginx git rsync ufw dnsutils

# Pare-feu : uniquement SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable        # réponds "y" : SSH est déjà autorisé, ta session ne sera pas coupée
```

**Déconnecte-toi puis reconnecte-toi en SSH** (`exit`, puis `ssh <TON_UTILISATEUR>@<IP_DU_VPS>`) : l'appartenance au groupe `docker` n'est prise en compte qu'à la connexion suivante. Sans cela, `docker` répondra « permission denied ».

Vérifie ensuite les versions et l'accès à Docker :

```bash
docker --version
docker compose version
docker ps              # doit afficher une liste (vide), sans erreur de permission
node -v                # doit afficher v22.x
nginx -v
```

---

## Étape 3 - Configuration DNS du domaine

Dans le panel OVH (ou chez ton registrar si le domaine est ailleurs), zone DNS du domaine :

| Type | Nom | Cible |
|---|---|---|
| A | `@` | `<IP_DU_VPS>` |
| A | `www` | `<IP_DU_VPS>` |

La propagation prend de quelques minutes à quelques heures. Vérifie avant de continuer :

```bash
dig +short ton-domaine.com
```

Doit renvoyer l'IP du VPS. Ne passe à l'étape Certbot (étape 8) que quand c'est bon, sinon Certbot échouera.

---

## Étape 4 - Récupération du code et configuration du backend

### 4.1 Cloner le dépôt

Le dépôt doit appartenir à ton utilisateur : c'est lui qui fera les `git pull` des redéploiements, à la main comme automatiquement.

```bash
sudo install -d -o "$USER" -g "$USER" /opt/gestion-snack
git clone https://github.com/kapello1/gestion-snack-V2.git /opt/gestion-snack
cd /opt/gestion-snack
```

**Si le dépôt est privé**, `git pull` doit pouvoir s'exécuter sans saisir de mot de passe. Utilise une clé de déploiement en lecture seule :

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "vps-ovh-pull" -f ~/.ssh/github_pull -N ""
cat ~/.ssh/github_pull.pub          # à coller sur GitHub : dépôt > Settings > Deploy keys > Add (sans cocher "write access")
printf 'Host github.com\n  IdentityFile ~/.ssh/github_pull\n  IdentitiesOnly yes\n' >> ~/.ssh/config
git clone git@github.com:kapello1/gestion-snack-V2.git /opt/gestion-snack     # à la place du clone HTTPS ci-dessus
```

### 4.2 Renseigner les variables d'environnement

```bash
cp .env.ovh.example .env
nano .env
```

Le fichier `.env` n'est jamais versionné (règle `.env` du `.gitignore`).

**Génère d'abord le secret JWT** et colle le résultat dans `JWT_SECRET` :

```bash
openssl rand -hex 32
```

> **`JWT_SECRET` : à générer une seule fois, puis à ne plus modifier.** C'est la clé qui signe les sessions. Si elle est absente, le backend en invente une nouvelle à chaque démarrage (il l'écrit dans ses logs) : tous les utilisateurs seraient alors déconnectés à chaque redéploiement. Si tu la changes, tout le monde est déconnecté une fois. Ne la partage jamais et ne la commite jamais.

Renseigne ensuite chaque autre variable. Reprends les vraies valeurs depuis l'ancien hébergement (dashboard Render, section Environment) ou depuis la console de chaque service, pour ne rien deviner :

| Variable | Requis | Où la trouver |
|---|---|---|
| `JWT_SECRET` | Oui | Générée avec `openssl rand -hex 32` (voir ci-dessus) |
| `JWT_EXPIRATION_MINUTES` | Non | Durée d'une session en minutes (`480` = 8 h par défaut) |
| `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Oui | Console console.neon.tech, ou ancien dashboard Render |
| `ALLOWED_ORIGINS` | Oui | `https://ton-domaine.com`, sans slash final. Sert aux règles CORS **et** aux origines WebSocket autorisées |
| `FRONTEND_URL` | Oui | `https://ton-domaine.com`. Sert aux liens envoyés par e-mail (vérification, réinitialisation, e-mail d'accueil des employés) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Oui | Console Cloudinary. Sans elles, le backend refuse de démarrer |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | Recommandé | app.brevo.com. Sans clé, aucun e-mail n'est envoyé (codes de vérification, mot de passe oublié, e-mail d'accueil des employés) |
| `STRIPE_SECRET_KEY` | Si paiement en ligne | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Si paiement en ligne | Voir étape 9 : à régénérer pour la nouvelle URL |
| `GROQ_API_KEY` | Si chatbot IA | console.groq.com |
| `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`) | Non | elevenlabs.io (voix du chatbot, optionnel) |

Sauvegarde (`Ctrl+O`, `Entrée`, `Ctrl+X` dans nano).

> **Base de données :** la base Neon existante est réutilisée telle quelle, aucune action n'est nécessaire. Si tu pars d'une base vide, exécute d'abord le script `snack_db_postgres.sql` du dépôt.

---

## Étape 5 - Lancer le backend

```bash
cd /opt/gestion-snack
docker compose -f docker-compose.ovh.yml up -d --build
```

Le premier build prend quelques minutes (compilation Maven). Vérifie que ça tourne :

```bash
docker compose -f docker-compose.ovh.yml ps
curl http://127.0.0.1:8080/api/health
```

La commande `curl` doit répondre `OK`. Vérifie aussi que le secret JWT est bien pris en compte : la commande suivante ne doit **rien** afficher.

```bash
docker compose -f docker-compose.ovh.yml logs backend | grep "JWT_SECRET NON"
```

En cas d'erreur, regarde les logs :

```bash
docker compose -f docker-compose.ovh.yml logs -f backend
```

---

## Étape 6 - Build du frontend

```bash
cd /opt/gestion-snack/frontend_gestion_snack
cp .env.example .env
nano .env
```

Renseigne :

```
VITE_API_BASE_URL=https://ton-domaine.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...   (ou pk_test_... pour tester d'abord)
```

L'adresse du WebSocket est déduite de `VITE_API_BASE_URL` (`https://ton-domaine.com/api` devient `wss://ton-domaine.com/ws`). Ne mets rien pour Groq ni ElevenLabs : ils sont gérés côté backend uniquement.

Build et publication :

```bash
npm ci
npm run build
sudo mkdir -p /var/www/gestion-snack/frontend
sudo rsync -a --delete dist/ /var/www/gestion-snack/frontend/
```

---

## Étape 7 - Configuration Nginx

```bash
sudo cp /opt/gestion-snack/deploy/ovh/gestion-snack.nginx.conf /etc/nginx/sites-available/gestion-snack
sudo sed -i 's/votre-domaine.com/ton-domaine.com/g' /etc/nginx/sites-available/gestion-snack
```

(Remplace `ton-domaine.com` par ton vrai domaine dans la commande `sed`. Vérifie le résultat avec `grep server_name /etc/nginx/sites-available/gestion-snack`.)

Puis active le site :

```bash
sudo ln -s /etc/nginx/sites-available/gestion-snack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # évite un conflit avec la page par défaut de Nginx
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` doit afficher `syntax is ok` puis `test is successful`. Teste déjà en HTTP :

```bash
curl -I http://ton-domaine.com
curl http://ton-domaine.com/api/health
```

---

## Étape 8 - Activer HTTPS

```bash
sudo certbot --nginx -d ton-domaine.com -d www.ton-domaine.com
```

Réponds à l'e-mail de contact et accepte les CGU. Certbot édite automatiquement la config Nginx pour ajouter le bloc HTTPS (443) et la redirection HTTP vers HTTPS. Le renouvellement automatique est déjà planifié. Vérifie-le :

```bash
systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## Étape 9 - Mettre à jour les services externes

- **Stripe** : dashboard Stripe > Developers > Webhooks > modifie (ou recrée) l'endpoint avec l'URL `https://ton-domaine.com/api/stripe/webhook`. Abonne-le aux deux événements que le backend traite : `payment_intent.payment_failed` et `charge.refunded`. Copie le nouveau « signing secret » (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET` du `.env`, puis relance le backend pour qu'il relise le fichier :
  ```bash
  cd /opt/gestion-snack && docker compose -f docker-compose.ovh.yml up -d --force-recreate
  ```
- **Brevo** : l'adresse `BREVO_FROM_EMAIL` doit être un expéditeur validé dans Brevo. L'API ne dépend pas du domaine d'hébergement du site.
- **Cloudinary** : aucune action, indépendant du domaine.

---

## Étape 10 - Checklist de vérification finale

- [ ] `https://ton-domaine.com` affiche le frontend, cadenas HTTPS valide
- [ ] `curl https://ton-domaine.com/api/health` répond `OK`
- [ ] `curl -i https://ton-domaine.com/api/users` (sans jeton) répond **401** : l'API refuse bien les appels non authentifiés
- [ ] La connexion (login) fonctionne pour chaque rôle, et chacun arrive sur son espace
- [ ] Un rôle ne peut pas ouvrir l'espace d'un autre (ex : un client qui tape `/admin/users` est renvoyé vers son espace)
- [ ] Une action temps réel (nouvelle commande, notification cuisine) apparaît sans rafraîchir la page : cela confirme que le WebSocket (`wss://ton-domaine.com/ws`) accepte le jeton et que Nginx laisse passer la connexion
- [ ] Les logs ne contiennent pas `JWT_SECRET NON DÉFINI`, et une session reste ouverte après un redéploiement
- [ ] Upload / affichage d'une image produit (Cloudinary)
- [ ] Un paiement carte en mode test passe (Stripe), la transaction porte bien le montant de la commande (pas 0,00) et le chiffre d'affaires augmente d'autant
- [ ] Le remboursement de cette commande (Admin > Transactions) réussit : la transaction passe à « Remboursé », la commande est annulée et le chiffre d'affaires redescend
- [ ] La réinitialisation de mot de passe envoie bien un e-mail (Brevo)
- [ ] Créer un employé envoie un e-mail d'accueil avec son identifiant et le mot de passe par défaut (`1234`)
- [ ] Le chatbot IA répond (Groq)
- [ ] Le mot de passe par défaut (`1234`) du compte administrateur a été remplacé depuis « Mon profil » avant d'ouvrir le site au public

---

## Étape 11 - Redéployer à la main

Depuis ton PC, pousse tes changements sur GitHub, puis sur le VPS :

```bash
cd /opt/gestion-snack
./deploy/ovh/deploy.sh
```

Ce script fait `git pull`, reconstruit le conteneur backend, rebuild le frontend, le publie et recharge Nginx. Avec le déploiement automatique de l'étape 12, ce geste n'est plus nécessaire au quotidien, mais il reste utile en dépannage.

**Retour arrière :** annule le commit fautif avec `git revert <commit>`, pousse-le, puis laisse le déploiement repartir avec la version corrigée.

### Sauvegarder la base avant une opération risquée

À faire avant toute modification directe des données (script SQL de réparation, changement de base). Les commandes suivantes lisent les paramètres dans le `.env` (sans jamais l'exécuter) et écrivent un fichier daté :

```bash
sudo apt install -y postgresql-client
cd /opt/gestion-snack
DBHOST=$(grep '^DATABASE_URL=' .env | awk -F'[/?]' '{print $3}' | sed 's/-pooler//')
DBNAME=$(grep '^DATABASE_URL=' .env | awk -F'[/?]' '{print $4}')
DBUSER=$(grep '^DATABASE_USERNAME=' .env | cut -d= -f2-)
export PGPASSWORD=$(grep '^DATABASE_PASSWORD=' .env | cut -d= -f2-) PGSSLMODE=require
pg_dump -h "$DBHOST" -U "$DBUSER" -d "$DBNAME" --no-owner -f ~/sauvegarde-snack-$(date +%F-%H%M).sql
ls -lh ~ | grep sauvegarde
```

(Le suffixe `-pooler` de l'hôte Neon est retiré : `pg_dump` doit passer par la connexion directe.) Si `pg_dump` répond « server version mismatch », la base Neon est plus récente que le client installé : crée à la place une branche de sauvegarde depuis la console Neon (Branches > Create branch), qui copie la base instantanément.

---

## Étape 12 - Déploiement automatique (GitHub Actions)

À chaque push sur `main`, une fois la CI verte, GitHub se connecte en SSH au VPS, lance `./deploy/ovh/deploy.sh` puis vérifie que `/api/health` répond. Il ne part jamais sur une pull request, et un seul déploiement tourne à la fois.

Ce que le VPS doit permettre :

- Le dépôt est dans `/opt/gestion-snack`, propriété de ton utilisateur, avec un `git pull` sans mot de passe (mis en place à l'étape 4.1)
- Ton utilisateur est dans le groupe `docker` (mis en place à l'étape 2)
- Ton utilisateur peut lancer `sudo` sans mot de passe : c'est généralement déjà le cas sur les images Ubuntu d'OVH. Vérifie avec `sudo -n true` (aucun message = c'est bon). Sinon, [DEPLOIEMENT_CONTINU.md](DEPLOIEMENT_CONTINU.md) explique comment l'autoriser uniquement pour les commandes du script.

Il reste à créer une clé SSH dédiée et 4 secrets GitHub (`OVH_HOST`, `OVH_USER`, `OVH_SSH_KEY`, `OVH_KNOWN_HOSTS`). Toute la procédure, pas à pas, est dans [DEPLOIEMENT_CONTINU.md](DEPLOIEMENT_CONTINU.md). Termine par un premier essai à la main : onglet Actions > Deploy > Run workflow.

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| 502 Bad Gateway | Le conteneur backend est arrêté ou démarre encore | `docker compose -f docker-compose.ovh.yml logs -f backend` |
| Le conteneur redémarre en boucle, log `Could not resolve placeholder 'CLOUDINARY_...'` | Une variable obligatoire manque dans `.env` | Complète `.env` (étape 4.2), puis `docker compose -f docker-compose.ovh.yml up -d --force-recreate` |
| Erreur 500 sur toutes les pages qui lisent des données, alors que `/api/health` répond `OK` ; logs : `Your account or project has exceeded the quota` | Le quota de l'offre Neon est dépassé : Neon refuse toute connexion | Console Neon > Billing / Usage : attendre la remise à zéro, passer à une offre supérieure, ou héberger PostgreSQL sur le VPS |
| Remboursement Stripe refusé : `This value must be greater than or equal to 1` (`parameter_invalid_integer`) | Paiement enregistré à 0,00 € par une ancienne version du backend | Déployer la version corrigée, puis exécuter une fois `deploy/ovh/reparation_montants_stripe.sql` (après sauvegarde, voir étape 11) |
| Tous les utilisateurs sont déconnectés à chaque déploiement | `JWT_SECRET` absent : une clé temporaire est générée à chaque démarrage | Génère-le (`openssl rand -hex 32`), mets-le dans `.env` et relance le backend |
| Erreur 401 partout après une modification du `.env` | `JWT_SECRET` a changé : les anciens jetons ne sont plus valides | Normal une seule fois : les utilisateurs se reconnectent |
| Retour automatique sur la page de connexion | Session expirée (8 h par défaut) ou jeton invalide | Se reconnecter. Durée réglable avec `JWT_EXPIRATION_MINUTES` |
| Le site fonctionne mais le temps réel ne marche pas | Bloc `location /ws` absent de Nginx, ou origine WebSocket refusée | Vérifie les blocs `/ws` et `/ws-sockjs` dans le fichier Nginx, et que `ALLOWED_ORIGINS` vaut exactement `https://ton-domaine.com` |
| Erreur CORS dans la console du navigateur | `ALLOWED_ORIGINS` ne correspond pas exactement au domaine (schéma + host) | Vérifie `https://ton-domaine.com` sans slash final dans `.env`, relance le backend |
| `npm run build` échoue | Node trop ancien pour Vite 7 | `node -v` doit être >= 20.19 ou >= 22.12 : réinstalle via NodeSource (étape 2) |
| Certbot échoue (« Could not verify domain ») | DNS pas encore propagé, ou port 80 fermé | `dig +short ton-domaine.com` doit renvoyer l'IP du VPS ; `sudo ufw status` doit montrer 80 et 443 ouverts |
| Page blanche sur `/` après navigation directe vers une sous-route | `try_files` mal configuré | Vérifie la ligne `try_files $uri /index.html;` dans le fichier Nginx |
| `permission denied ... /var/run/docker.sock` | Ton utilisateur n'est pas (encore) dans le groupe `docker` | `sudo usermod -aG docker "$USER"`, puis déconnexion / reconnexion SSH |
| Le déploiement automatique échoue sur `git pull` ou sur `sudo` | Dépôt privé sans clé de déploiement, ou `sudo` demande un mot de passe | Étape 4.1 (clé de déploiement) et étape 12 (`sudo -n true` doit réussir) |

---

## Résumé des variables d'environnement

### Backend (`/opt/gestion-snack/.env`)

Voir [.env.ovh.example](.env.ovh.example) et le tableau de l'étape 4.2. Obligatoires : `JWT_SECRET`, `DATABASE_*`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `CLOUDINARY_*`. Optionnelles : `ELEVENLABS_*`, `STRIPE_*` (si pas de paiement en ligne), `GROQ_API_KEY` (si pas de chatbot), `JWT_EXPIRATION_MINUTES`. `BREVO_*` est fortement conseillée : sans elle, aucun e-mail ne part.

### Frontend (`/opt/gestion-snack/frontend_gestion_snack/.env`)

| Variable | Requis | Valeur |
|---|---|---|
| `VITE_API_BASE_URL` | Oui | `https://ton-domaine.com/api` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Si paiement carte | `pk_live_...` ou `pk_test_...` |

Ces valeurs sont lues au moment du build (`npm run build`) : après un changement, il faut reconstruire le frontend (`./deploy/ovh/deploy.sh`).
