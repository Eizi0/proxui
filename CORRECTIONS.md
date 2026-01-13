# Corrections ProxUI - Page Téléchargements

## Date: 12 janvier 2026

### Problèmes corrigés

#### 1. ✅ ISOs populaires - Liens obsolètes
**Problème**: Les liens vers les ISOs Ubuntu, Debian, Rocky et AlmaLinux pointaient vers d'anciennes versions.

**Solution**: Mise à jour vers les dernières versions stables:
- Ubuntu 24.04.1 LTS + Ubuntu 22.04.5 LTS
- Debian 12.8
- Rocky Linux 9.5
- AlmaLinux 9.5
- Alpine Linux 3.21

**Fichier modifié**: `src/pages/Downloads.jsx`

---

#### 2. ✅ Recherche des templates LXC ne fonctionnait pas
**Problème**: La fonction `filterTemplates()` ne filtrait pas correctement car:
- Pas de copie du tableau original (mutation directe)
- Pas de vérification de l'existence des propriétés avant filtrage
- Pas de trim() sur le terme de recherche

**Solution**: 
```javascript
const filterTemplates = () => {
  let filtered = [...templates]; // Copie du tableau
  
  if (category !== 'all') {
    filtered = filtered.filter(t => 
      t.category && t.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (searchTerm && searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(t => 
      (t.name && t.name.toLowerCase().includes(search)) ||
      (t.description && t.description.toLowerCase().includes(search)) ||
      (t.os && t.os.toLowerCase().includes(search))
    );
  }
  
  setFilteredTemplates(filtered);
};
```

**Fichier modifié**: `src/pages/Downloads.jsx`

**Test réussi**: 20 templates affichés, filtrage opérationnel

---

#### 3. ✅ Recherche Docker Hub ne fonctionnait pas
**Problème**: 
- Pas de validation du terme de recherche
- Pas de gestion des différents formats de réponse
- Pas de logs pour le débogage
- Timeout non défini

**Solution Frontend**:
```javascript
const searchDockerHub = async () => {
  if (!searchTerm || !searchTerm.trim()) {
    alert('Veuillez entrer un terme de recherche');
    return;
  }
  
  setLoading(true);
  try {
    const response = await fetch(`/api/downloads/docker/search?q=${encodeURIComponent(searchTerm.trim())}`);
    
    if (!response.ok) {
      throw new Error('Erreur de recherche');
    }
    
    const data = await response.json();
    
    // Docker Hub API returns { results: [...] }
    if (data && data.results && Array.isArray(data.results)) {
      setImages(data.results);
    } else if (Array.isArray(data)) {
      setImages(data);
    } else {
      setImages([]);
      alert('Aucun résultat trouvé');
    }
  } catch (error) {
    alert('Erreur lors de la recherche: ' + error.message);
    setImages([]);
  } finally {
    setLoading(false);
  }
};
```

**Solution Backend**:
```javascript
router.get('/docker/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query required' });
    }

    console.log(`🔍 Recherche Docker Hub: "${q}"`);

    const response = await axios.get(`https://hub.docker.com/v2/search/repositories/`, {
      params: { 
        query: q.trim(), 
        page_size: 25 
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Docker Hub: ${response.data?.results?.length || 0} résultats`);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erreur recherche Docker Hub:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'Erreur de connexion à Docker Hub'
    });
  }
});
```

**Fichiers modifiés**: 
- `src/pages/Downloads.jsx`
- `server/routes/downloads.js`

**Test réussi**: Recherche "nginx" retourne 25 résultats avec métadonnées complètes

---

#### 4. ✅ Pull des images Docker ne fonctionnait pas
**Problème**:
- Pas de validation des entrées
- Pas de trim() sur les noms d'images
- Pas de logs détaillés
- Pas de message clair sur la nature simulée du pull

**Solution**:
```javascript
// Route POST /docker/pull
router.post('/docker/pull', async (req, res) => {
  try {
    const { image, tag = 'latest' } = req.body;
    
    if (!image || !image.trim()) {
      return res.status(400).json({ error: 'Image name required' });
    }

    const imageName = image.trim();
    const imageTag = tag.trim();
    const fullImageName = `${imageName}:${imageTag}`;

    console.log(`🐳 Pull Docker: ${fullImageName}`);

    // ... code de téléchargement ...

    res.json({ 
      success: true, 
      downloadId, 
      message: `Pull de ${fullImageName} démarré` 
    });
  } catch (error) {
    console.error('❌ Erreur route docker/pull:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fonction pullDockerImage améliorée
async function pullDockerImage(downloadId, image, tag) {
  try {
    const item = downloads.find(d => d.id === downloadId);
    const fullImageName = `${image}:${tag}`;
    
    console.log(`📥 Démarrage pull Docker: ${fullImageName}`);
    console.log(`⚠️  Note: Docker n'est pas natif dans Proxmox`);
    console.log(`   Les images Docker doivent être pullées dans un container LXC avec Docker installé`);
    
    // Simulation du pull avec progression
    for (let i = 0; i <= 100; i += 20) {
      if (item) {
        item.progress = i;
        console.log(`   Progress: ${i}%`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (item) {
      item.status = 'completed';
      item.progress = 100;
    }
    
    console.log(`✅ Pull Docker simulé complété: ${fullImageName}`);
    console.log(`   Pour utiliser Docker, créez un container LXC avec Docker installé`);
  } catch (error) {
    console.error(`❌ Erreur pull Docker:`, error);
    throw error;
  }
}
```

**Fichier modifié**: `server/routes/downloads.js`

**Test réussi**: Pull "nginx:alpine" complété avec progression dans les logs

---

### Notes importantes

#### Docker dans Proxmox
Docker n'est **PAS natif** dans Proxmox VE. Les images Docker doivent être gérées depuis:
1. Un container LXC avec Docker installé (recommandé)
2. Une VM avec Docker installé
3. Un hôte externe avec Docker

Le pull Docker dans ProxUI est actuellement **simulé** pour démonstration. Pour une implémentation réelle, il faudrait:
- Détecter les containers LXC avec Docker installé
- Exécuter `docker pull` via SSH/API dans ces containers
- Récupérer la progression réelle depuis Docker

#### Téléchargements fonctionnels
✅ **ISOs**: Téléchargement direct via Proxmox API (`download-url`)
✅ **Templates LXC**: Téléchargement via aplinfo + `download-url`
⚠️ **Docker**: Simulation uniquement (voir note ci-dessus)

---

### Tests de validation

```bash
# Test recherche Docker Hub
curl 'http://localhost:3000/api/downloads/docker/search?q=nginx'
# ✅ Retourne 25 résultats

# Test pull Docker
curl -X POST http://localhost:3000/api/downloads/docker/pull \
  -H 'Content-Type: application/json' \
  -d '{"image":"nginx","tag":"alpine"}'
# ✅ Retourne {"success":true,"downloadId":"...","message":"Pull de nginx:alpine démarré"}

# Test liste templates LXC
curl http://localhost:3000/api/downloads/lxc-templates
# ✅ Retourne 20 templates formatés

# Logs
tail -f /opt/proxui/proxui.log
# ✅ Logs détaillés avec emojis pour chaque opération
```

---

### Déploiement

```bash
# Copie des fichiers modifiés
scp src/pages/Downloads.jsx root@172.16.22.116:/opt/proxui/src/pages/
scp server/routes/downloads.js root@172.16.22.116:/opt/proxui/server/routes/

# Rebuild + Redémarrage
ssh root@172.16.22.116 "cd /opt/proxui && npm run build && ./start-proxui.sh"
```

**Status**: ✅ Déployé avec succès - PID 133627
**Accès**: http://172.16.22.116:3000

---

### Prochaines améliorations possibles

1. **Docker réel**: Intégration avec des containers LXC Docker
2. **Progress tracking**: Polling des UPIDs pour progression réelle des téléchargements
3. **Tags Docker**: Récupération dynamique des tags depuis Docker Hub API
4. **Validation ISOs**: Vérification checksum MD5/SHA256
5. **Upload files**: Permettre l'upload direct de fichiers ISO/Templates
6. **Queue management**: File d'attente avec priorités et annulation
7. **Notifications**: Alertes en temps réel via WebSocket
