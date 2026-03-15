# Deployment: Handwerker Software auf Hetzner

Anleitung zum Hosten der Software auf einem Hetzner-Server mit der Subdomain **handwerk-demo.brandfaden.com** (Domain bei Strato).

---

## Übersicht

1. **GitHub** – Code-Repository
2. **Hetzner** – Server mit Docker
3. **Strato** – DNS für brandfaden.com
4. **Nginx + Let's Encrypt** – SSL und Reverse Proxy

---

## 1. GitHub-Repository einrichten

1. Repository auf GitHub erstellen (z.B. `handwerker-software`)
2. Lokales Projekt pushen:
   ```bash
   git remote add origin https://github.com/DEIN-USER/handwerker-software.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Hetzner-Server vorbereiten

### 2.1 Server erstellen

- Hetzner Cloud Console: https://console.hetzner.cloud/
- Neuen Server anlegen (Ubuntu 24.04 empfohlen)
- SSH-Key hinterlegen

### 2.2 Server einrichten

```bash
# Als root einloggen
ssh root@DEINE-SERVER-IP

# System aktualisieren
apt update && apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Docker Compose installieren
apt install -y docker-compose-plugin

# Nginx installieren
apt install -y nginx certbot python3-certbot-nginx

# Verzeichnis für die App
mkdir -p /opt/handwerker-software
cd /opt/handwerker-software
```

### 2.3 Repository klonen

```bash
# Öffentliches Repo:
git clone https://github.com/DEIN-USER/handwerker-software.git .

# Privates Repo: Deploy-Key anlegen
# 1. Auf dem Server: ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
# 2. cat ~/.ssh/deploy_key.pub → als Deploy-Key in GitHub hinterlegen
# 3. git clone git@github.com:DEIN-USER/handwerker-software.git .
```

### 2.4 Umgebungsvariablen (.env)

```bash
cd /opt/handwerker-software
cp .env.example .env
nano .env
```

Inhalt von `.env`:

```
DATABASE_URL="file:/app/data/data.db"
AUTH_SECRET="HIER-EINEN-SICHEREN-WERT-EINGEBEN"
NEXTAUTH_URL="https://handwerk-demo.brandfaden.com"
```

**AUTH_SECRET** erzeugen:

```bash
openssl rand -base64 32
```

### 2.5 Ersten Build und Start

```bash
cd /opt/handwerker-software
docker compose build
docker compose up -d
```

Der Admin-User (admin@handwerker.de / admin123) wird beim ersten Start automatisch angelegt.

---

## 3. DNS bei Strato konfigurieren

1. Strato Login: https://www.strato.de/
2. Domain **brandfaden.com** → DNS-Verwaltung / Nameserver
3. Neuen Eintrag anlegen:

   | Typ  | Name              | Wert                    | TTL  |
   |------|-------------------|-------------------------|------|
   | A    | handwerk-demo     | IP-DEINES-HETZNER-SERVERS | 3600 |

   Oder als CNAME (falls gewünscht):

   | Typ   | Name          | Wert                    |
   |-------|---------------|-------------------------|
   | CNAME | handwerk-demo | DEIN-SERVER.brandfaden.com |

4. Änderung speichern – DNS-Propagierung kann 5–60 Minuten dauern

---

## 4. Nginx und SSL (Let's Encrypt)

### 4.1 Nginx-Konfiguration

```bash
# Konfiguration kopieren
cp /opt/handwerker-software/deploy/nginx-handwerk-demo.conf /etc/nginx/sites-available/handwerk-demo

# Verzeichnis für Certbot
mkdir -p /var/www/certbot

# Aktivieren
ln -s /etc/nginx/sites-available/handwerk-demo /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 4.2 SSL-Zertifikat

```bash
certbot --nginx -d handwerk-demo.brandfaden.com
```

Certbot passt die Nginx-Konfiguration automatisch an und richtet HTTPS ein.

### 4.3 Automatische Erneuerung

```bash
certbot renew --dry-run
# Cron-Job wird von Certbot eingerichtet
```

---

## 5. GitHub Actions (automatisches Deploy)

### 5.1 SSH-Key für Deploy

Auf dem Server:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy
# Private Key kopieren – wird als GitHub Secret benötigt
```

### 5.2 GitHub Secrets setzen

Im Repository: **Settings → Secrets and variables → Actions**

| Secret         | Wert                          |
|----------------|-------------------------------|
| DEPLOY_HOST    | IP-Adresse des Hetzner-Servers |
| DEPLOY_USER    | root (oder anderer SSH-User)   |
| DEPLOY_SSH_KEY | Inhalt von `~/.ssh/github_deploy` (privater Schlüssel) |
| DEPLOY_PATH    | /opt/handwerker-software       |
| DEPLOY_PORT    | 22 (falls Standard)           |

### 5.3 Deploy auslösen

- **Automatisch:** Jeder Push auf `main` startet das Deploy
- **Manuell:** Actions → Deploy → Run workflow

---

## 6. Checkliste

- [ ] GitHub-Repository mit Code
- [ ] Hetzner-Server mit Docker & Docker Compose
- [ ] App unter `/opt/handwerker-software` geklont
- [ ] `.env` mit AUTH_SECRET und NEXTAUTH_URL
- [ ] Erster `docker compose up -d` erfolgreich
- [ ] Admin-User angelegt
- [ ] DNS-Eintrag bei Strato für handwerk-demo.brandfaden.com
- [ ] Nginx konfiguriert und SSL mit Certbot
- [ ] GitHub Secrets für Deploy gesetzt

---

## 7. Nützliche Befehle

```bash
# Logs anzeigen
docker compose logs -f app

# Container neu starten
docker compose restart app

# Manuelles Update
cd /opt/handwerker-software
git pull
docker compose build --no-cache
docker compose up -d --force-recreate
```

---

## 8. Troubleshooting

**App startet nicht**
- `docker compose logs app` prüfen
- `.env` und AUTH_SECRET prüfen

**502 Bad Gateway**
- App läuft: `docker compose ps`
- Nginx: `proxy_pass` auf Port 3000

**Login funktioniert nicht**
- NEXTAUTH_URL muss exakt `https://handwerk-demo.brandfaden.com` sein
- AUTH_SECRET muss gesetzt sein
