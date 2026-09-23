# Déploiement continu vers le VPS OVH

À chaque push sur `main`, une fois la CI verte, GitHub Actions se connecte au VPS en SSH et lance
`./deploy/ovh/deploy.sh` (git pull, rebuild du conteneur backend, build du frontend, rechargement de Nginx).
Il vérifie ensuite que le backend répond sur `/api/health`.

```
push sur main  ->  CI (build + lint)  ->  verte ?  ->  Deploy (SSH -> deploy.sh)  ->  contrôle /api/health
```

Le workflow est dans `.github/workflows/deploy.yml`. Il ne part jamais sur une pull request, et un seul
déploiement tourne à la fois (le suivant attend la fin du précédent).

## Mise en place (une seule fois)

### 1. Créer une clé SSH dédiée au déploiement (sur ton PC)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f gestion-snack-deploy -N ""
```

Cela crée `gestion-snack-deploy` (clé privée) et `gestion-snack-deploy.pub` (clé publique).
Ne réutilise pas ta clé personnelle et ne commite jamais la clé privée.

### 2. Autoriser la clé sur le VPS

```bash
ssh <TON_UTILISATEUR>@<IP_DU_VPS>
echo "<contenu de gestion-snack-deploy.pub>" >> ~/.ssh/authorized_keys
```

### 3. Vérifier que l'utilisateur peut lancer `deploy.sh` sans mot de passe

Le script utilise `sudo` pour `mkdir`, `rsync`, `nginx` et `systemctl reload nginx`. Sur l'image Ubuntu
d'OVH, l'utilisateur par défaut a déjà `sudo` sans mot de passe. Pour le vérifier :

```bash
sudo -n true && echo "sudo sans mot de passe : OK"
```

Sinon, restreins-le aux seules commandes utiles (vérifie les chemins avec `which mkdir rsync nginx systemctl`) :

```bash
sudo visudo -f /etc/sudoers.d/gestion-snack-deploy
# <TON_UTILISATEUR> ALL=(root) NOPASSWD: /usr/bin/mkdir, /usr/bin/rsync, /usr/sbin/nginx, /usr/bin/systemctl reload nginx
```

Le dépôt doit aussi être déjà cloné dans `/opt/gestion-snack` avec un `git pull` qui fonctionne sans saisie
(étape 4 de `DEPLOIEMENT_OVH.md`).

### 4. Récupérer l'empreinte du serveur (protection contre l'usurpation)

```bash
ssh-keyscan -p 22 <IP_DU_VPS>
```

Copie toute la sortie : elle sert de secret `OVH_KNOWN_HOSTS`. Le workflow refuse de se connecter à un
serveur dont l'empreinte diffère.

### 5. Créer les secrets sur GitHub

Dépôt GitHub > Settings > Environments > New environment > `production`, puis Add secret :

| Secret | Valeur |
|---|---|
| `OVH_HOST` | IP ou nom du VPS |
| `OVH_USER` | utilisateur SSH utilisé pour déployer |
| `OVH_SSH_KEY` | contenu complet de `gestion-snack-deploy` (clé privée, avec les lignes BEGIN et END) |
| `OVH_KNOWN_HOSTS` | sortie de `ssh-keyscan` (étape 4) |
| `OVH_PORT` | optionnel, seulement si le port SSH n'est pas 22 |

Sur l'environnement `production`, tu peux ajouter une règle "Required reviewers" si tu veux valider chaque
déploiement à la main avant qu'il parte.

### 6. Tester

Onglet Actions > Deploy > Run workflow. Si un secret manque, la première étape échoue avec la liste des
secrets absents.

## Au quotidien

- Push sur `main` : la CI tourne, puis le déploiement part seul si elle est verte.
- CI rouge : aucun déploiement.
- Déploiement raté : l'onglet Actions montre l'étape en échec (SSH, `deploy.sh` ou contrôle de santé).
- Retour arrière : `git revert` du commit fautif puis push, le déploiement repart avec la version corrigée.

Le déploiement manuel décrit à l'étape 11 de `DEPLOIEMENT_OVH.md` reste possible en cas de besoin.
