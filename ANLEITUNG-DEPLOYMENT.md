# Schritt-für-Schritt: Handwerker Software deployen

Diese Anleitung führt dich durch das komplette Deployment auf **handwerk-demo.brandfaden.com**.

---

## Voraussetzungen

- GitHub-Account
- Hetzner-Account (Cloud)
- Zugang zur Domain brandfaden.com bei Strato
- Terminal / Kommandozeile

---

# Phase 1: GitHub vorbereiten

## Schritt 1.1: Neues Repository auf GitHub erstellen

1. Gehe zu **https://github.com/new**
2. **Repository name:** `handwerker-software` (oder ein anderer Name)
3. **Visibility:** Private oder Public – deine Wahl
4. **Nicht** „Add a README“ oder andere Dateien anhaken (Projekt existiert bereits)
5. Klicke auf **Create repository**

## Schritt 1.2: Lokales Projekt zu GitHub pushen

Öffne ein Terminal im Projektordner und führe aus:

```bash
# Prüfen, ob bereits ein Git-Repository existiert
git status

# Falls noch kein Git-Repository:
git init

# Alle Dateien hinzufügen
git add .
git commit -m "Initial commit mit Deployment-Konfiguration"

# GitHub als Remote hinzufügen (ersetze DEIN-USERNAME durch deinen GitHub-Namen)
git remote add origin https://github.com/DEIN-USERNAME/handwerker-software.git

# Branch auf main setzen
git branch -M main

# Hochladen
git push -u origin main
```

**Hinweis:** Bei privatem Repo wirst du nach Benutzername und Passwort/Token gefragt.

---

# Phase 2: Hetzner-Server anlegen

## Schritt 2.1: Hetzner Cloud Console öffnen

1. Gehe zu **https://console.hetzner.cloud/**
2. Melde dich an oder erstelle einen Account

## Schritt 2.2: Neuen Server erstellen

1. Klicke auf **„Add Server“** oder **„Server hinzufügen“**
2. **Location:** Wähle z.B. Falkenstein oder Nuremberg
3. **Image:** **Ubuntu 24.04**
4. **Type:** CX22 (ca. 5 €/Monat) reicht für den Start
5. **SSH Key:** Deinen öffentlichen SSH-Key hinzufügen  
   - Falls du keinen hast: `cat ~/.ssh/id_rsa.pub` oder `cat ~/.ssh/id_ed25519.pub`  
   - Oder: Passwort-Authentifizierung aktivieren
6. **Name:** z.B. `handwerker-demo`
7. Klicke auf **„Create & Buy now“**

## Schritt 2.3: Server-IP notieren

Nach dem Erstellen siehst du die **IP-Adresse** des Servers (z.B. `123.45.67.89`).  
**Diese IP brauchst du später für DNS und GitHub.**

---

# Phase 3: Server einrichten (per SSH)

## Schritt 3.1: Per SSH verbinden

```bash
ssh root@DEINE-SERVER-IP
```

Beispiel: `ssh root@123.45.67.89`  
Bei Passwort-Login: Passwort eingeben.

## Schritt 3.2: System aktualisieren

```bash
apt update && apt upgrade -y
```

## Schritt 3.3: Docker installieren

```bash
curl -fsSL https://get.docker.com | sh
```

## Schritt 3.4: Docker Compose installieren

```bash
apt install -y docker-compose-plugin
```

## Schritt 3.5: Nginx und Certbot installieren

```bash
apt install -y nginx certbot python3-certbot-nginx
```

## Schritt 3.6: Projektverzeichnis anlegen

```bash
mkdir -p /opt/handwerker-software
cd /opt/handwerker-software
```

## Schritt 3.7: Repository klonen

**Öffentliches Repo:**
```bash
git clone https://github.com/DEIN-USERNAME/handwerker-software.git .
```

**Privates Repo:**  
Zuerst Deploy-Key anlegen:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub
```

Den ausgegebenen Schlüssel kopieren. Dann in GitHub:
- Repository → **Settings** → **Deploy keys** → **Add deploy key**
- Titel: `Hetzner Server`
- Key einfügen → **Add key**

Danach klonen:

```bash
git clone git@github.com:DEIN-USERNAME/handwerker-software.git .
```

---

# Phase 4: Umgebungsvariablen (.env)

## Schritt 4.1: .env-Datei erstellen

```bash
cd /opt/handwerker-software
cp .env.example .env
nano .env
```

## Schritt 4.2: AUTH_SECRET erzeugen

In einem **neuen Terminal** (lokal oder auf dem Server):

```bash
openssl rand -base64 32
```

Beispielausgabe: `K7x9mP2nQ4rT6vY8zA1bC3dE5fG7hJ9kL0mN2oP4qR6sT8u=`

## Schritt 4.3: .env ausfüllen

In `nano` ersetze die Platzhalter. Deine `.env` sollte so aussehen:

```
DATABASE_URL="file:/app/data/data.db"
AUTH_SECRET="DEIN-GENERIERTER-WERT-VON-SCHRITT-4.2"
NEXTAUTH_URL="https://handwerk-demo.brandfaden.com"
```

Speichern: `Strg+O`, Enter, dann `Strg+X` zum Beenden.

---

# Phase 5: Ersten Build und Start

## Schritt 5.1: Docker-Image bauen

```bash
cd /opt/handwerker-software
docker compose build
```

Das kann einige Minuten dauern.

## Schritt 5.2: Container starten

```bash
docker compose up -d
```

## Schritt 5.3: Prüfen, ob die App läuft

```bash
docker compose ps
```

Beide Container sollten „Up“ zeigen.

```bash
curl http://localhost:3000/login
```

Sollte HTML zurückgeben (kein Fehler).

---

# Phase 6: DNS bei Strato einrichten

## Schritt 6.1: Strato-Login

1. Gehe zu **https://www.strato.de/**
2. Melde dich an

## Schritt 6.2: Domain-Verwaltung öffnen

1. Zu **„Meine Produkte“** oder **„Domains“**
2. **brandfaden.com** auswählen
3. **„DNS-Einträge“** oder **„Nameserver / DNS“** öffnen

## Schritt 6.3: Neuen A-Record anlegen

1. **„Neuer Eintrag“** oder **„Hinzufügen“**
2. Eintragen:

   | Feld      | Wert                          |
   |-----------|-------------------------------|
   | **Typ**   | A                             |
   | **Name**  | handwerk-demo                 |
   | **Wert**  | DEINE-HETZNER-SERVER-IP       |
   | **TTL**   | 3600 (oder Standard)          |

3. Speichern

**Wichtig:** Der Name ist nur `handwerk-demo`, nicht `handwerk-demo.brandfaden.com`.

## Schritt 6.4: Warten auf DNS-Propagierung

5–60 Minuten warten. Prüfen mit:

```bash
nslookup handwerk-demo.brandfaden.com
```

oder

```bash
dig handwerk-demo.brandfaden.com +short
```

Wenn deine Hetzner-IP erscheint, ist DNS aktiv.

---

# Phase 7: Nginx und SSL (HTTPS)

## Schritt 7.1: Nginx-Konfiguration kopieren

```bash
cp /opt/handwerker-software/deploy/nginx-handwerk-demo.conf /etc/nginx/sites-available/handwerk-demo
```

## Schritt 7.2: Certbot-Verzeichnis anlegen

```bash
mkdir -p /var/www/certbot
```

## Schritt 7.3: Nginx-Site aktivieren

```bash
ln -sf /etc/nginx/sites-available/handwerk-demo /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Schritt 7.4: SSL-Zertifikat mit Let's Encrypt

```bash
certbot --nginx -d handwerk-demo.brandfaden.com
```

- E-Mail-Adresse eingeben
- AGB akzeptieren (Y)
- Optional: Newsletter (Y/N)
- Certbot richtet HTTPS automatisch ein

## Schritt 7.5: Test

Im Browser öffnen: **https://handwerk-demo.brandfaden.com**

Du solltest die Login-Seite sehen.  
Login: **admin@handwerker.de** / **admin123**

---

# Phase 8: Automatisches Deploy (GitHub Actions)

## Schritt 8.1: SSH-Key für GitHub Actions erstellen

**Auf dem Hetzner-Server:**

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
```

## Schritt 8.2: Öffentlichen Key autorisieren

```bash
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
```

## Schritt 8.3: Privaten Key anzeigen und kopieren

```bash
cat ~/.ssh/github_deploy
```

**Gesamten** Inhalt kopieren (von `-----BEGIN OPENSSH PRIVATE KEY-----` bis `-----END OPENSSH PRIVATE KEY-----`).

## Schritt 8.4: GitHub Secrets anlegen

1. Gehe zu deinem Repository auf GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** für jeden Eintrag:

   | Name          | Wert                                      |
   |---------------|-------------------------------------------|
   | DEPLOY_HOST   | IP deines Hetzner-Servers (z.B. 123.45.67.89) |
   | DEPLOY_USER   | root                                      |
   | DEPLOY_SSH_KEY| Inhalt von `~/.ssh/github_deploy` (privater Schlüssel) |
   | DEPLOY_PATH   | /opt/handwerker-software                  |
   | DEPLOY_PORT   | 22                                        |

## Schritt 8.5: Deploy testen

1. Lokal eine kleine Änderung machen (z.B. in einer Datei)
2. Committen und pushen:

   ```bash
   git add .
   git commit -m "Test Deploy"
   git push origin main
   ```

3. Auf GitHub: **Actions** → Workflow **Deploy** sollte starten
4. Nach erfolgreichem Lauf ist die neue Version live

---

# Zusammenfassung: Reihenfolge

1. GitHub-Repository erstellen und Code pushen  
2. Hetzner-Server anlegen  
3. Server per SSH einrichten (Docker, Nginx, Certbot)  
4. Repo klonen, `.env` anlegen, `docker compose up -d`  
5. DNS bei Strato: A-Record für handwerk-demo  
6. Nginx + Certbot für HTTPS  
7. GitHub Secrets für automatisches Deploy  

---

# Häufige Befehle

```bash
# Logs der App anzeigen
docker compose logs -f app

# App neu starten
docker compose restart app

# Manuelles Update (ohne GitHub Actions)
cd /opt/handwerker-software
git pull
docker compose build --no-cache
docker compose up -d --force-recreate
```

---

# Probleme?

**502 Bad Gateway**  
→ App prüfen: `docker compose ps` und `docker compose logs app`

**Login funktioniert nicht**  
→ `NEXTAUTH_URL` in `.env` muss exakt `https://handwerk-demo.brandfaden.com` sein

**SSL-Fehler bei Certbot**  
→ DNS muss bereits auf die Server-IP zeigen (Phase 6 abwarten)

**GitHub Deploy schlägt fehl**  
→ Secrets prüfen, besonders DEPLOY_SSH_KEY (kompletter Inhalt, keine Zeilenumbrüche)
