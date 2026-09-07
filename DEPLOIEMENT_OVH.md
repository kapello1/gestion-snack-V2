# Déploiement sur OVH - Guide complet

Ce guide part du principe que tu as déjà :
- Commandé un VPS OVH (VPS-1 recommandé : 2 vCore / 4 Go RAM / 40 Go NVMe) avec Ubuntu 24.04 LTS
- Acheté un nom de domaine (chez OVH ou ailleurs)
- Reçu (ou en attente) l'email OVH de confirmation

Tout ce qui suit va de la réception des identifiants jusqu'à l'application en ligne, en HTTPS, sur ton propre domaine.

**Fichiers déjà prêts dans le repo** (vérifiés contre le code réel du projet) :

| Fichier | Rôle |
|---|---|
| [docker-compose.ovh.yml](docker-compose.ovh.yml) | Build + lance le backend Spring Boot en conteneur |
| [.env.ovh.example](.env.ovh.example) | Modèle des variables d'environnement du backend |
| [deploy/ovh/gestion-snack.nginx.conf](deploy/ovh/gestion-snack.nginx.conf) | Reverse proxy Nginx (API + WebSocket + frontend statique) |
| [deploy/ovh/deploy.sh](deploy/ovh/deploy.sh) | Script de redéploiement en une commande |

Architecture cible : **un seul domaine**, Nginx sur l'hôte route `/api` et `/ws` vers le backend Docker (en local uniquement, port 8080 jamais exposé publiquement), et sert les fichiers statiques du frontend pour tout le reste. La base de données (Neon.tech), le stockage d'images (Cloudinary), l'email (Brevo), les paiements (Stripe) et l'IA (Groq/ElevenLabs) restent des services externes inchangés.

---

## Étape 1 - Réception des identifiants et première connexion

1. Après le paiement, OVH envoie un premier email de confirmation de commande, puis un second (quelques minutes à ~1h après) une fois le VPS provisionné, contenant :
   - L'**adresse IP** du VPS
   - Un **nom d'utilisateur** (ex: `ubuntu`, `debian`, ou un nom choisi à la commande) et son **mot de passe** - de plus en plus d'images OVH ne donnent plus directement `root` par défaut, pour des raisons de sécurité
2. Connecte-toi en SSH avec cet utilisateur :
   ```bash
   ssh <TON_UTILISATEUR>@<IP_DU_VPS>
   ```
   Tape `yes` si on te demande de confirmer l'empreinte du serveur, puis colle le mot de passe reçu par email (invisible en tapant, c'est normal).
3. Passe en root pour la suite de l'installation (le reste de ce guide suppose un shell root - toutes les commandes systèmes qui suivent en ont besoin) :
   ```bash
   sudo -i
   ```
   Si `sudo` te redemande un mot de passe, c'est celui de ton utilisateur (pas un autre). Si `sudo -i` ne fonctionne pas du tout (utilisateur pas dans le groupe sudo), reconnecte-toi et écris-moi le message d'erreur exact.
4. Une fois en root (l'invite affiche `root@...:~#`), change le mot de passe root par sécurité :
   ```bash
   passwd
   ```

> Pour toutes les prochaines connexions SSH (étapes suivantes, futurs redéploiements), reconnecte-toi avec `ssh <TON_UTILISATEUR>@<IP_DU_VPS>` puis refais `sudo -i` avant de continuer.

---

## Étape 2 - Mise à jour et installation des prérequis

```bash
apt update && apt upgrade -y

# Docker (Engine + plugin Compose)
curl -fsSL https://get.docker.com | sh

# Node.js 22 LTS - IMPORTANT : le frontend utilise Vite 7, qui exige Node >= 20.19
# (le paquet "nodejs" par défaut d'Ubuntu 24.04 est trop ancien et fera échouer le build)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Nginx, Certbot (HTTPS), Git, rsync, pare-feu
apt install -y nginx certbot python3-certbot-nginx git rsync ufw

# Pare-feu : uniquement SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Vérifie les versions :
```bash
docker --version
docker compose version
node -v      # doit afficher v22.x
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
Doit renvoyer l'IP du VPS. Ne passe à l'étape Certbot que quand c'est bon (sinon Certbot échouera).

---

## Étape 4 - Récupération du code et configuration du backend

```bash
git clone <URL_DE_TON_REPO_GITHUB> /opt/gestion-snack
cd /opt/gestion-snack

cp .env.ovh.example .env
nano .env
```

Renseigne chaque variable. Récupère les vraies valeurs depuis le dashboard Render actuel (Environment) pour ne rien deviner :

| Variable | Où la trouver |
|---|---|
| `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Dashboard Render, ou console.neon.tech |
| `ALLOWED_ORIGINS`, `FRONTEND_URL` | À définir sur `https://ton-domaine.com` (le nouveau domaine OVH) |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Dashboard Render, ou console Cloudinary |
| `GROQ_API_KEY` | Dashboard Render, ou console.groq.com |
| `ELEVENLABS_API_KEY` (+ voice/model id) | Dashboard Render, ou elevenlabs.io |
| `STRIPE_SECRET_KEY` | Dashboard Render, ou dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Voir étape 9 - à régénérer pour la nouvelle URL |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | Dashboard Render, ou app.brevo.com |

Sauvegarde (`Ctrl+O`, `Entrée`, `Ctrl+X` dans nano).

---

## Étape 5 - Lancer le backend

```bash
cd /opt/gestion-snack
docker compose -f docker-compose.ovh.yml up -d --build
```

Le premier build prend quelques minutes (compilation Maven). Vérifie que ça tourne :
```bash
docker compose -f docker-compose.ovh.yml ps
curl http://127.0.0.1:8080/api-docs
```
La commande `curl` doit renvoyer du JSON (spec OpenAPI). Si erreur, regarde les logs :
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
Ne mets rien pour Groq/ElevenLabs (gérés côté backend uniquement).

Build et publication :
```bash
npm ci
npm run build
mkdir -p /var/www/gestion-snack/frontend
rsync -a --delete dist/ /var/www/gestion-snack/frontend/
```

---

## Étape 7 - Configuration Nginx

```bash
cp /opt/gestion-snack/deploy/ovh/gestion-snack.nginx.conf /etc/nginx/sites-available/gestion-snack
nano /etc/nginx/sites-available/gestion-snack
```
Remplace les deux occurrences de `votre-domaine.com` par ton vrai domaine, puis :
```bash
ln -s /etc/nginx/sites-available/gestion-snack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # évite un conflit avec la page par défaut de Nginx
nginx -t
systemctl reload nginx
```
`nginx -t` doit afficher `syntax is ok` / `test is successful`. Teste déjà en HTTP :
```bash
curl -I http://ton-domaine.com
```

---

## Étape 8 - Activer HTTPS

```bash
certbot --nginx -d ton-domaine.com -d www.ton-domaine.com
```
Réponds à l'email de contact et accepte les CGU. Certbot édite automatiquement la config Nginx pour ajouter le bloc HTTPS (443) et la redirection HTTP → HTTPS. Le renouvellement automatique est déjà planifié (`systemctl status certbot.timer` pour vérifier).

---

## Étape 9 - Mettre à jour les services externes

- **Stripe** : dashboard Stripe → Developers → Webhooks → modifie (ou recrée) l'endpoint avec l'URL `https://ton-domaine.com/api/stripe/webhook`, copie le nouveau "signing secret" (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET` du `.env`, puis redémarre le backend :
  ```bash
  cd /opt/gestion-snack && docker compose -f docker-compose.ovh.yml up -d --build
  ```
- **Brevo** : si un domaine expéditeur est vérifié, aucune action nécessaire (l'API ne dépend pas du domaine d'hébergement du site)
- **Cloudinary** : aucune action, indépendant du domaine

---

## Étape 10 - Checklist de vérification finale

- [ ] `https://ton-domaine.com` affiche le frontend, cadenas HTTPS valide
- [ ] `https://ton-domaine.com/api-docs` répond (Swagger/OpenAPI)
- [ ] Connexion (login) fonctionne
- [ ] Une action temps réel (nouvelle commande, notification cuisine) apparaît sans rafraîchir la page → confirme que le WebSocket (`wss://ton-domaine.com/ws`) passe bien
- [ ] Upload/affichage d'une image produit fonctionne (Cloudinary)
- [ ] Un paiement carte en mode test passe (Stripe)
- [ ] Un email (réinitialisation de mot de passe) est bien reçu (Brevo)
- [ ] Le chatbot IA répond (Groq)

---

## Étape 11 - Redéployer après une modification

Depuis ton PC, pousse tes changements sur GitHub, puis sur le VPS :
```bash
cd /opt/gestion-snack
./deploy/ovh/deploy.sh
```
Ce script fait `git pull`, reconstruit le conteneur backend, rebuild le frontend et recharge Nginx.

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| 502 Bad Gateway | Le conteneur backend est down/en train de démarrer | `docker compose -f docker-compose.ovh.yml logs -f backend` |
| `npm run build` échoue | Node trop ancien pour Vite 7 | `node -v` doit être ≥ 20.19 ou ≥ 22.12 - réinstalle via NodeSource (étape 2) |
| Erreur CORS dans la console navigateur | `ALLOWED_ORIGINS` ne correspond pas exactement au domaine (schéma + host) | Vérifie `https://ton-domaine.com` sans slash final dans `.env`, redémarre le backend |
| WebSocket ne se connecte jamais (pas de temps réel) | Headers `Upgrade`/`Connection` absents côté proxy | Vérifie que le bloc `location /ws` du fichier Nginx est bien présent et actif |
| Certbot échoue ("Could not verify domain") | DNS pas encore propagé, ou port 80 fermé | `dig +short ton-domaine.com` doit renvoyer l'IP du VPS ; `ufw status` doit montrer 80/443 ouverts |
| Page blanche sur `/` après navigation directe vers une sous-route | `try_files` mal configuré | Vérifie la ligne `try_files $uri /index.html;` dans le fichier Nginx |

---

## Résumé des variables d'environnement

### Backend (`/opt/gestion-snack/.env`)
Voir [.env.ovh.example](.env.ovh.example) - toutes les variables listées y sont nécessaires sauf `ELEVENLABS_*` (optionnel, TTS chatbot) et `STRIPE_*` (optionnel si pas de paiement en ligne).

### Frontend (`/opt/gestion-snack/frontend_gestion_snack/.env`)
| Variable | Requis | Valeur |
|---|---|---|
| `VITE_API_BASE_URL` | Oui | `https://ton-domaine.com/api` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Si paiement carte | `pk_live_...` ou `pk_test_...` |
