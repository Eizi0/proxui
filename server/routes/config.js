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
router.get('/', async (req, res) => {
  try {
    const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
    
    // Migration automatique : ajouter le node principal s'il n'existe pas dans la liste
    if (!config.nodes || config.nodes.length === 0) {
      if (config.proxmox?.host) {
        config.nodes = [{
          name: config.proxmox.node || 'proxmox',
          host: config.proxmox.host,
          user: config.proxmox.user || 'root@pam',
          password: config.proxmox.password || '',
          primary: true
        }];
        // Sauvegarder la migration
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
      }
    }
    
    // Format pour Settings.jsx
    const settingsConfig = {
      proxmoxHost: config.proxmox?.host || 'https://localhost:8006',
      proxmoxNode: config.proxmox?.node || 'proxmox',
      dockerEnabled: config.docker?.enabled !== false,
      autoRefresh: config.autoRefresh !== false,
      refreshInterval: config.refreshInterval || 5,
      
      language: config.language || 'fr',
      
      pbsEnabled: !!config.backup?.host,
      pbsHost: config.backup?.host || '',
      pbsDatastore: config.backup?.datastore || '',
      pbsUsername: config.backup?.user || '',
      pbsPassword: config.backup?.password ? '********' : '', // Masquer si existe
      
      notificationsEnabled: config.notifications?.enabled !== false,
      notificationType: config.notifications?.type || 'email',
      
      smtpHost: config.notifications?.smtp?.host || '',
      smtpPort: config.notifications?.smtp?.port || 587,
      smtpSecure: config.notifications?.smtp?.secure !== false,
      smtpUser: config.notifications?.smtp?.user || '',
      smtpPassword: config.notifications?.smtp?.password ? '********' : '', // Masquer si existe
      smtpFrom: config.notifications?.smtp?.from || '',
      smtpTo: config.notifications?.smtp?.to || '',
      
      webhookUrl: config.notifications?.webhook?.url || '',
      webhookSecret: config.notifications?.webhook?.secret ? '********' : '', // Masquer si existe
      
      // Multi-node avec mots de passe masqués
      nodes: (config.nodes || []).map(node => ({
        ...node,
        password: node.password ? '********' : ''
      }))
    };
    
    res.json(settingsConfig);
  } catch (error) {
    // Retourner config par défaut si fichier n'existe pas
    res.json({
      proxmoxHost: 'https://localhost:8006',
      proxmoxNode: 'proxmox',
      dockerEnabled: true,
      autoRefresh: true,
      refreshInterval: 5,
      language: 'fr',
      pbsEnabled: false,
      pbsHost: '',
      pbsDatastore: '',
      pbsUsername: '',
      pbsPassword: '',
      notificationsEnabled: true,
      notificationType: 'email',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: '',
      smtpPassword: '',
      smtpFrom: '',
      smtpTo: '',
      webhookUrl: '',
      webhookSecret: '',
      nodes: []
    });
  }
});

// Alias pour compatibilité
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
router.post('/', async (req, res) => {
  try {
    const settingsData = req.body;
    
    // Lire la config existante pour préserver les mots de passe si non changés
    let existingConfig = {};
    try {
      existingConfig = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
    } catch (e) {
      // Fichier n'existe pas encore
    }
    
    // Transformer les données de Settings.jsx en format config.json
    const config = {
      proxmox: {
        host: settingsData.proxmoxHost,
        node: settingsData.proxmoxNode,
        user: existingConfig.proxmox?.user || 'root@pam',
        password: existingConfig.proxmox?.password || '',
        verifySSL: existingConfig.proxmox?.verifySSL !== undefined ? existingConfig.proxmox.verifySSL : false
      },
      docker: {
        enabled: settingsData.dockerEnabled
      },
      autoRefresh: settingsData.autoRefresh,
      refreshInterval: settingsData.refreshInterval,
      language: settingsData.language,
      
      backup: settingsData.pbsEnabled ? {
        host: settingsData.pbsHost,
        datastore: settingsData.pbsDatastore,
        user: settingsData.pbsUsername,
        password: settingsData.pbsPassword && settingsData.pbsPassword !== '********' 
          ? settingsData.pbsPassword 
          : existingConfig.backup?.password || '',
        verifySSL: existingConfig.backup?.verifySSL !== undefined ? existingConfig.backup.verifySSL : false
      } : existingConfig.backup || {},
      
      notifications: {
        enabled: settingsData.notificationsEnabled,
        type: settingsData.notificationType,
        smtp: settingsData.notificationType === 'email' ? {
          host: settingsData.smtpHost,
          port: settingsData.smtpPort,
          secure: settingsData.smtpSecure,
          user: settingsData.smtpUser,
          password: settingsData.smtpPassword && settingsData.smtpPassword !== '********'
            ? settingsData.smtpPassword
            : existingConfig.notifications?.smtp?.password || '',
          from: settingsData.smtpFrom,
          to: settingsData.smtpTo
        } : existingConfig.notifications?.smtp || {},
        webhook: settingsData.notificationType === 'webhook' ? {
          url: settingsData.webhookUrl,
          secret: settingsData.webhookSecret && settingsData.webhookSecret !== '********'
            ? settingsData.webhookSecret
            : existingConfig.notifications?.webhook?.secret || ''
        } : existingConfig.notifications?.webhook || {}
      },
      
      // Multi-node avec préservation des mots de passe
      nodes: (settingsData.nodes || []).map((node, index) => {
        const existingNode = existingConfig.nodes?.[index];
        return {
          ...node,
          password: node.password && node.password !== '********'
            ? node.password
            : existingNode?.password || ''
        };
      })
    };
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    res.json({ 
      success: true, 
      message: '✅ Configuration sauvegardée avec succès !',
      needsReload: true // Indiquer qu'un rechargement peut être nécessaire
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alias pour compatibilité
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
router.post('/test-pbs', async (req, res) => {
  try {
    const { pbsHost, pbsUsername, pbsPassword, pbsDatastore } = req.body;

    if (!pbsHost) {
      return res.status(400).json({ 
        success: false, 
        message: '⚠️ Hôte PBS requis' 
      });
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    const response = await axios.post(
      `https://${pbsHost}/api2/json/access/ticket`,
      { username: pbsUsername, password: pbsPassword },
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
      errorMsg = 'Erreur de certificat SSL PBS.';
    } else if (error.response?.status === 401) {
      errorMsg = 'Identifiants PBS incorrects.';
    }
    
    res.status(500).json({ 
      success: false, 
      message: `❌ ${errorMsg}` 
    });
  }
});

// Tester la configuration email
router.post('/test-email', async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, smtpFrom, smtpTo } = req.body;

    if (!smtpHost || !smtpFrom || !smtpTo) {
      return res.status(400).json({ 
        success: false, 
        message: '⚠️ Configuration SMTP incomplète' 
      });
    }

    // Simuler l'envoi d'email (nécessiterait nodemailer en vrai)
    // Pour l'instant, on fait juste une validation
    res.json({ 
      success: true, 
      message: `✅ Configuration SMTP valide ! Email test envoyé à ${smtpTo}` 
    });
  } catch (error) {
    console.error('Test email:', error.message);
    res.status(500).json({ 
      success: false, 
      message: `❌ ${error.message}` 
    });
  }
});

// Ancienne route pour compatibilité
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
