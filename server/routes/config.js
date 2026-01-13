import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import https from 'https';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, '../../config.json');

// Vérifier si la configuration initiale existe
router.get('/check', async (req, res) => {
  try {
    await fs.access(CONFIG_FILE);
    const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
    res.json({ configured: !!config.proxmox?.host });
  } catch (error) {
    res.json({ configured: false });
  }
});

// Obtenir la configuration actuelle
router.get('/current', async (req, res) => {
  try {
    const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
    // Ne pas exposer les mots de passe
    if (config.proxmox) config.proxmox.password = '********';
    if (config.backup) config.backup.password = '********';
    res.json(config);
  } catch (error) {
    res.status(404).json({ error: 'Configuration non trouvée' });
  }
});

// Sauvegarder la configuration
router.post('/save', async (req, res) => {
  try {
    const config = req.body;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    // Créer/mettre à jour le fichier .env
    const envContent = `# Proxmox Configuration
PROXMOX_HOST=${config.proxmox.host}
PROXMOX_USER=${config.proxmox.user}
PROXMOX_PASSWORD=${config.proxmox.password}
PROXMOX_NODE=${config.proxmox.node}
PROXMOX_VERIFY_SSL=${config.proxmox.verifySSL}

# Proxmox Backup Server Configuration
${config.backup.host ? `BACKUP_HOST=${config.backup.host}` : '# BACKUP_HOST='}
${config.backup.host ? `BACKUP_USER=${config.backup.user}` : '# BACKUP_USER='}
${config.backup.host ? `BACKUP_PASSWORD=${config.backup.password}` : '# BACKUP_PASSWORD='}
${config.backup.host ? `BACKUP_DATASTORE=${config.backup.datastore}` : '# BACKUP_DATASTORE='}
${config.backup.host ? `BACKUP_VERIFY_SSL=${config.backup.verifySSL}` : '# BACKUP_VERIFY_SSL='}

# Server Configuration
PORT=${process.env.PORT || 3000}
NODE_ENV=${process.env.NODE_ENV || 'development'}
`;

    const envPath = path.join(__dirname, '../../.env');
    await fs.writeFile(envPath, envContent);

    res.json({ success: true, message: 'Configuration sauvegardée' });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tester la connexion Proxmox
router.post('/test-proxmox', async (req, res) => {
  try {
    const { host, user, password, verifySSL } = req.body;

    // Si verifySSL n'est pas défini ou est false, on accepte les certificats auto-signés
    const httpsAgent = new https.Agent({
      rejectUnauthorized: verifySSL === true
    });

    console.log(`Test connexion: ${host} avec user=${user}, verifySSL=${verifySSL}`);

    const response = await axios.post(
      `${host}/api2/json/access/ticket`,
      { username: user, password },
      { httpsAgent, timeout: 10000 }
    );

    if (response.data?.data?.ticket) {
      res.json({ 
        success: true, 
        message: '✅ Connexion réussie à Proxmox VE !' 
      });
    } else {
      res.json({ 
        success: false, 
        message: '❌ Échec de l\'authentification' 
      });
    }
  } catch (error) {
    console.error('Test connexion Proxmox:', error.message);
    let errorMsg = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      errorMsg = 'Connexion refusée. Vérifiez l\'adresse et le port.';
    } else if (error.code === 'ENOTFOUND') {
      errorMsg = 'Hôte introuvable. Vérifiez l\'adresse.';
    } else if (error.message.includes('certificate')) {
      errorMsg = 'Erreur de certificat SSL. Cochez "Ignorer les erreurs SSL".';
    } else if (error.response?.status === 401) {
      errorMsg = 'Identifiants incorrects.';
    }
    
    res.json({ 
      success: false, 
      message: `❌ ${errorMsg}` 
    });
  }
});

// Tester la connexion Proxmox Backup Server
router.post('/test-backup', async (req, res) => {
  try {
    const { host, user, password, verifySSL } = req.body;

    if (!host) {
      return res.json({ 
        success: true, 
        message: '⚠️ Configuration PBS ignorée' 
      });
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: verifySSL === true
    });

    const response = await axios.post(
      `${host}/api2/json/access/ticket`,
      { username: user, password },
      { httpsAgent, timeout: 10000 }
    );

    if (response.data?.data?.ticket) {
      res.json({ 
        success: true, 
        message: '✅ Connexion réussie à Proxmox Backup Server !' 
      });
    } else {
      res.json({ 
        success: false, 
        message: '❌ Échec de l\'authentification PBS' 
      });
    }
  } catch (error) {
    console.error('Test connexion PBS:', error.message);
    let errorMsg = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      errorMsg = 'Connexion refusée au serveur PBS.';
    } else if (error.message.includes('certificate')) {
      errorMsg = 'Erreur de certificat SSL PBS. Cochez "Ignorer les erreurs SSL".';
    }
    
    res.json({ 
      success: false, 
      message: `❌ ${errorMsg}` 
    });
  }
});

export default router;
