# ProxUI 🚀

Interface web moderne et intuitive pour gérer Proxmox VE, déployable en conteneur Docker ou LXC.

## 🎯 Fonctionnalités

- ✅ **Gestion Proxmox** - Nodes, VMs, Conteneurs LXC
- ✅ **Gestion Docker** - Conteneurs Docker sur l'hôte
- ✅ **Monitoring temps réel** - CPU, RAM, Disque, Réseau
- ✅ **Interface moderne** - React + TailwindCSS
- ✅ **API REST** - Backend Node.js/Express
- ✅ **Déploiement flexible** - Docker ou LXC

## 🛠️ Stack Technique

**Backend:**
- Node.js + Express
- API Proxmox (axios)
- Dockerode (gestion Docker)
- WebSocket (temps réel)

**Frontend:**
- React 18
- TailwindCSS
- React Router
- Lucide Icons
- Vite

## 📦 Installation

### Option 1: Déploiement Docker (Recommandé)

```bash
# 1. Cloner le projet
git clone <repo-url> proxui
cd proxui

# 2. Configurer l'environnement
cp .env.example .env
nano .env

# 3. Lancer avec Docker Compose
docker-compose up -d

# L'interface sera accessible sur http://localhost:3000
```

### Option 2: Déploiement dans un conteneur LXC Proxmox

```bash
# 1. Créer un conteneur LXC dans Proxmox
pct create 200 local:vztmpl/debian-12-standard_12.0-1_amd64.tar.zst \
  --hostname proxui \
  --memory 2048 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --storage local-lvm \
  --rootfs local-lvm:10 \
  --unprivileged 1 \
  --features nesting=1

# 2. Démarrer et entrer dans le conteneur
pct start 200
pct enter 200

# 3. Installer Node.js 20
apt update && apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Cloner et installer ProxUI
cd /opt
git clone <repo-url> proxui
cd proxui
npm install
npm run build

# 5. Configurer
cp .env.example .env
nano .env

# 6. Créer un service systemd
cat > /etc/systemd/system/proxui.service << EOF
[Unit]
Description=ProxUI - Proxmox Web Interface
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/proxui
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. Activer et démarrer le service
systemctl daemon-reload
systemctl enable proxui
systemctl start proxui
```

## ⚙️ Configuration

Fichier `.env`:

```env
# Configuration Proxmox
PROXMOX_HOST=https://192.168.1.100:8006
PROXMOX_USER=root@pam
PROXMOX_PASSWORD=votre_mot_de_passe
PROXMOX_NODE=pve
PROXMOX_VERIFY_SSL=false

# Configuration Serveur
PORT=3000
NODE_ENV=production

# Configuration Docker (si disponible)
DOCKER_SOCKET=/var/run/docker.sock
DOCKER_HOST=unix:///var/run/docker.sock
```

## 🚀 Développement

```bash
# Installer les dépendances
npm install

# Lancer en mode dev (backend + frontend)
npm run dev

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

## 📁 Structure du Projet

```
proxui/
├── server/                 # Backend Node.js
│   ├── index.js           # Point d'entrée
│   ├── routes/            # Routes API
│   │   ├── proxmox.js     # API Proxmox
│   │   ├── docker.js      # API Docker
│   │   └── stats.js       # Statistiques
│   ├── services/          # Services
│   │   ├── proxmoxAPI.js  # Client API Proxmox
│   │   └── dockerAPI.js   # Client Docker
│   └── middleware/        # Middleware
│       └── auth.js        # Authentification
├── src/                   # Frontend React
│   ├── components/        # Composants
│   │   ├── Sidebar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── VMList.jsx
│   │   ├── LXCList.jsx
│   │   └── DockerList.jsx
│   ├── pages/            # Pages
│   ├── services/         # API client
│   ├── App.jsx
│   └── main.jsx
├── public/               # Assets
├── Dockerfile            # Image Docker
├── docker-compose.yml    # Orchestration
└── package.json
```

## 🔌 API Endpoints

### Proxmox
- `GET /api/proxmox/nodes` - Liste des nodes
- `GET /api/proxmox/vms` - Liste des VMs
- `GET /api/proxmox/vms/:id` - Détails VM
- `POST /api/proxmox/vms/:id/start` - Démarrer VM
- `POST /api/proxmox/vms/:id/stop` - Arrêter VM
- `POST /api/proxmox/vms/:id/restart` - Redémarrer VM
- `GET /api/proxmox/lxc` - Liste des conteneurs LXC
- `POST /api/proxmox/lxc/:id/start` - Démarrer LXC
- `POST /api/proxmox/lxc/:id/stop` - Arrêter LXC

### Docker
- `GET /api/docker/containers` - Liste des conteneurs
- `GET /api/docker/containers/:id` - Détails conteneur
- `POST /api/docker/containers/:id/start` - Démarrer
- `POST /api/docker/containers/:id/stop` - Arrêter
- `POST /api/docker/containers/:id/restart` - Redémarrer
- `DELETE /api/docker/containers/:id` - Supprimer

### Statistiques
- `GET /api/stats/overview` - Vue d'ensemble
- `GET /api/stats/resources` - Ressources système
- `WS /api/stats/live` - Stats temps réel (WebSocket)

## 🔒 Sécurité

- ⚠️ Ne jamais commiter le fichier `.env`
- Utiliser des tokens API Proxmox avec permissions limitées
- Activer HTTPS en production
- Mettre en place un reverse proxy (nginx/Traefik)
- Restreindre l'accès au socket Docker

## 🐳 Docker

**Note importante:** Pour accéder au socket Docker de l'hôte depuis un conteneur Docker :

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

Pour LXC, monter le socket depuis l'hôte Proxmox.

## 📝 TODO

- [ ] Authentification multi-utilisateurs
- [ ] Gestion des snapshots
- [ ] Création de VMs/LXC
- [ ] Templates de déploiement
- [ ] Graphs avancés de monitoring
- [ ] Logs en temps réel
- [ ] Backup/Restore
- [ ] Support multi-cluster Proxmox

## 🤝 Contribution

Les contributions sont bienvenues ! Ouvrez une issue ou une PR.

## 📄 Licence

MIT License

## 🆘 Support

Questions ? Ouvrez une issue sur GitHub.
