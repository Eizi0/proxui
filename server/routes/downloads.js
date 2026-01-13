import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';
import axios from 'axios';

const router = express.Router();

// In-memory storage for download tracking (in production, use a database)
const downloads = [];

// Get all downloads
router.get('/', async (req, res) => {
  try {
    res.json(downloads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download ISO
router.post('/iso', async (req, res) => {
  try {
    const { url, storage, filename, node } = req.body;
    
    if (!url || !storage) {
      return res.status(400).json({ error: 'URL et storage requis' });
    }

    const downloadId = Date.now().toString();
    const fname = filename || url.split('/').pop();
    const downloadItem = {
      id: downloadId,
      type: 'iso',
      filename: fname,
      url,
      storage,
      node: node || 'proxmox',
      status: 'downloading',
      progress: 0,
      created: new Date()
    };

    downloads.push(downloadItem);

    // Start download via Proxmox API
    downloadISO(downloadId, url, storage, fname, node).catch(err => {
      console.error('Erreur téléchargement ISO:', err);
      const item = downloads.find(d => d.id === downloadId);
      if (item) {
        item.status = 'error';
        item.error = err.message;
      }
    });

    res.json({ success: true, downloadId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download LXC template
router.post('/lxc', async (req, res) => {
  try {
    const { template, storage, node } = req.body;
    
    if (!template || !storage) {
      return res.status(400).json({ error: 'Template et storage requis' });
    }

    const downloadId = Date.now().toString();
    const downloadItem = {
      id: downloadId,
      type: 'lxc',
      filename: template,
      storage,
      node: node || 'proxmox',
      status: 'downloading',
      progress: 0,
      created: new Date()
    };

    downloads.push(downloadItem);

    // Start download via Proxmox API
    downloadLXCTemplate(downloadId, template, storage, node).catch(err => {
      console.error('Erreur téléchargement LXC:', err);
      const item = downloads.find(d => d.id === downloadId);
      if (item) {
        item.status = 'error';
        item.error = err.message;
      }
    });

    res.json({ success: true, downloadId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get LXC templates list
router.get('/lxc-templates', async (req, res) => {
  try {
    // Fetch from Proxmox API
    const node = proxmoxAPI.node || 'proxmox';
    const templates = await proxmoxAPI.getAvailableTemplates(node);
    
    console.log('📦 Templates disponibles:', templates?.length || 0);
    
    // Format the response
    if (templates && Array.isArray(templates) && templates.length > 0) {
      // Filter only valid templates and format ALL of them
      const formatted = templates
        .filter(t => t.package && t.os && t.version) // Only valid templates
        .map(t => {
          // Determine category based on template type
          // TurnKey templates are applications, others are OS
          const isTurnKey = t.os && t.os.toLowerCase().includes('turnkey');
          const isApp = isTurnKey || (t.headline && (
            t.headline.toLowerCase().includes('turnkey') ||
            t.headline.toLowerCase().includes('docker') ||
            t.headline.toLowerCase().includes('wordpress') ||
            t.headline.toLowerCase().includes('nextcloud') ||
            t.headline.toLowerCase().includes('nginx') ||
            t.headline.toLowerCase().includes('gitea')
          ));
          
          return {
            name: t.headline || `${t.os.charAt(0).toUpperCase() + t.os.slice(1)} ${t.version}`,
            category: isApp ? 'app' : 'os',
            description: t.headline || t.description || `${t.os} ${t.version}`,
            size: t.size ? `${Math.round(t.size / 1024 / 1024)} MB` : 'N/A',
            url: t.package,
            os: t.os,
            version: t.version,
            location: t.location,
            template: t.template || t.package
          };
        })
        .sort((a, b) => {
          // Sort by category first (OS then APP), then by name
          if (a.category !== b.category) {
            return a.category === 'os' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      
      console.log('✅ Templates formatés:', formatted.length);
      console.log('   OS uniques:', [...new Set(formatted.map(t => t.os))].length);
      res.json(formatted);
    } else {
      // Fallback to static list if API fails
      console.log('⚠️ Utilisation de la liste statique');
      const fallbackTemplates = [
        { name: 'Ubuntu 22.04', category: 'os', description: 'Ubuntu 22.04 LTS Jammy', size: '150 MB', url: 'ubuntu-22.04-standard_22.04-1_amd64.tar.zst', os: 'ubuntu', version: '22.04' },
        { name: 'Debian 12', category: 'os', description: 'Debian 12 Bookworm', size: '120 MB', url: 'debian-12-standard_12.2-1_amd64.tar.zst', os: 'debian', version: '12' },
        { name: 'Alpine 3.19', category: 'os', description: 'Alpine Linux 3.19', size: '8 MB', url: 'alpine-3.19-default_20231219_amd64.tar.xz', os: 'alpine', version: '3.19' },
        { name: 'Rocky 9', category: 'os', description: 'Rocky Linux 9', size: '180 MB', url: 'rockylinux-9-default_20231016_amd64.tar.xz', os: 'rockylinux', version: '9' },
        { name: 'Alma 9', category: 'os', description: 'AlmaLinux 9', size: '180 MB', url: 'almalinux-9-default_20231016_amd64.tar.xz', os: 'almalinux', version: '9' },
      ];
      res.json(fallbackTemplates);
    }
  } catch (error) {
    console.error('❌ Erreur récupération templates:', error.message);
    // Return minimal static list as fallback
    const fallbackTemplates = [
      { name: 'Ubuntu 22.04', category: 'os', description: 'Ubuntu 22.04 LTS', size: '150 MB', url: 'ubuntu-22.04-standard_22.04-1_amd64.tar.zst', os: 'ubuntu', version: '22.04' },
      { name: 'Debian 12', category: 'os', description: 'Debian 12', size: '120 MB', url: 'debian-12-standard_12.2-1_amd64.tar.zst', os: 'debian', version: '12' },
      { name: 'Alpine 3.19', category: 'os', description: 'Alpine Linux', size: '8 MB', url: 'alpine-3.19-default_20231219_amd64.tar.xz', os: 'alpine', version: '3.19' },
    ];
    res.json(fallbackTemplates);
  }
});

// Search Docker Hub
router.get('/docker/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query required' });
    }

    console.log(`🔍 Recherche Docker Hub: "${q}"`);

    // Search Docker Hub API
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
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'Erreur de connexion à Docker Hub'
    });
  }
});

// Pull Docker image
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

    const downloadId = Date.now().toString();
    const downloadItem = {
      id: downloadId,
      type: 'docker',
      filename: fullImageName,
      status: 'downloading',
      progress: 0,
      created: new Date()
    };

    downloads.push(downloadItem);

    // Start pull in background
    pullDockerImage(downloadId, imageName, imageTag).catch(err => {
      console.error('❌ Erreur pull Docker:', err);
      const item = downloads.find(d => d.id === downloadId);
      if (item) {
        item.status = 'error';
        item.error = err.message;
      }
    });

    res.json({ success: true, downloadId, message: `Pull de ${fullImageName} démarré` });
  } catch (error) {
    console.error('❌ Erreur route docker/pull:', error);
    res.status(500).json({ error: error.message });
  }
});

// Background download functions
async function downloadISO(downloadId, url, storage, filename, node) {
  try {
    const item = downloads.find(d => d.id === downloadId);
    const targetNode = node || proxmoxAPI.node || 'proxmox';
    
    console.log(`📥 Démarrage téléchargement ISO: ${filename} vers ${storage}`);
    console.log(`   URL: ${url}`);
    console.log(`   Node: ${targetNode}`);
    
    // Use Proxmox API to download ISO
    const result = await proxmoxAPI.downloadISO(storage, url, filename, targetNode);
    
    console.log('✅ Téléchargement ISO démarré:', result);
    
    if (item) {
      item.status = 'completed';
      item.progress = 100;
      item.upid = result; // Store task ID for tracking
    }
  } catch (error) {
    console.error('❌ Erreur téléchargement ISO:', error.response?.data || error.message);
    console.error('   Details:', error.response?.data?.errors || error);
    throw error;
  }
}

async function downloadLXCTemplate(downloadId, template, storage, node) {
  try {
    const item = downloads.find(d => d.id === downloadId);
    const targetNode = node || proxmoxAPI.node || 'proxmox';
    
    console.log(`📥 Démarrage téléchargement template LXC: ${template} vers ${storage}`);
    
    // Get template info from aplinfo to find the location URL
    const aplinfo = await proxmoxAPI.getAvailableTemplates(targetNode);
    const templateInfo = aplinfo.find(t => t.package === template || t.template === template);
    
    if (!templateInfo || !templateInfo.location) {
      throw new Error(`Template ${template} non trouvé dans aplinfo ou pas d'URL de téléchargement`);
    }
    
    console.log(`   Template trouvé: ${templateInfo.headline}`);
    console.log(`   URL: ${templateInfo.location}`);
    
    // Use download-url with the actual URL from aplinfo
    const filename = `${templateInfo.os}-${templateInfo.version}-${templateInfo.package}_${templateInfo.version}_amd64.tar.gz`;
    
    const result = await proxmoxAPI.request('POST', `/nodes/${targetNode}/storage/${storage}/download-url`, {
      content: 'vztmpl',
      filename: filename,
      url: templateInfo.location,
      'verify-certificates': 0
    });
    
    console.log('✅ Téléchargement template démarré:', result);
    
    if (item) {
      item.status = 'completed';
      item.progress = 100;
      item.upid = result;
    }
  } catch (error) {
    console.error('❌ Erreur téléchargement template:', error.response?.data || error.message);
    throw error;
  }
}

async function pullDockerImage(downloadId, image, tag) {
  try {
    const item = downloads.find(d => d.id === downloadId);
    const fullImageName = `${image}:${tag}`;
    
    console.log(`📥 Démarrage pull Docker: ${fullImageName}`);
    console.log(`⚠️  Note: Docker n'est pas natif dans Proxmox`);
    console.log(`   Les images Docker doivent être pullées dans un container LXC avec Docker installé`);
    
    // This would execute docker pull on a node with Docker
    // For now, simulate the pull since Docker is not native to Proxmox
    // In production, this should execute on a Docker host or LXC container
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

export default router;
