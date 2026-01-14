import axios from 'axios';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../../config.json');

class ProxmoxAPI {
  constructor() {
    this.loadConfig();
  }

  async loadConfig() {
    try {
      // Essayer de charger depuis config.json
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      
      if (config.proxmox) {
        this.host = config.proxmox.host;
        this.user = config.proxmox.user;
        this.password = config.proxmox.password;
        this.node = config.proxmox.node || 'pve';
        this.httpsAgent = new https.Agent({
          rejectUnauthorized: config.proxmox.verifySSL === true
        });
        console.log('✅ Configuration chargée depuis config.json');
      } else {
        this.loadFromEnv();
      }
    } catch (error) {
      // Si le fichier n'existe pas, charger depuis .env
      this.loadFromEnv();
    }
    
    this.ticket = null;
    this.csrfToken = null;
  }

  loadFromEnv() {
    this.host = process.env.PROXMOX_HOST;
    this.user = process.env.PROXMOX_USER;
    this.password = process.env.PROXMOX_PASSWORD;
    this.node = process.env.PROXMOX_NODE || 'pve';
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.PROXMOX_VERIFY_SSL !== 'false'
    });
    console.log('✅ Configuration chargée depuis .env');
  }

  async ensureConfigLoaded() {
    if (!this.host || !this.user) {
      await this.loadConfig();
    }
  }

  async authenticate() {
    await this.ensureConfigLoaded();
    
    try {
      console.log('🔐 Tentative de connexion à Proxmox:', this.host);
      console.log('👤 User:', this.user);
      
      const response = await axios.post(
        `${this.host}/api2/json/access/ticket`,
        {
          username: this.user,
          password: this.password,
        },
        { httpsAgent: this.httpsAgent }
      );

      this.ticket = response.data.data.ticket;
      this.csrfToken = response.data.data.CSRFPreventionToken;
      
      console.log('✅ Connexion Proxmox réussie !');
      return true;
    } catch (error) {
      console.error('❌ Proxmox authentication failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  async request(method, endpoint, data = null) {
    if (!this.ticket) {
      await this.authenticate();
    }

    try {
      const config = {
        method,
        url: `${this.host}/api2/json${endpoint}`,
        headers: {
          Cookie: `PVEAuthCookie=${this.ticket}`,
        },
        httpsAgent: this.httpsAgent,
      };

      if (method !== 'GET' && this.csrfToken) {
        config.headers['CSRFPreventionToken'] = this.csrfToken;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data.data;
    } catch (error) {
      // Ré-authentifier si le ticket a expiré
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.request(method, endpoint, data);
      }
      throw error;
    }
  }

  // Nodes
  async getNodes() {
    return this.request('GET', '/nodes');
  }

  async getNodeStatus(node = this.node) {
    return this.request('GET', `/nodes/${node}/status`);
  }

  // VMs
  async getVMs(node = this.node) {
    return this.request('GET', `/nodes/${node}/qemu`);
  }

  async getVMStatus(vmid, node = this.node) {
    return this.request('GET', `/nodes/${node}/qemu/${vmid}/status/current`);
  }

  async startVM(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/start`);
  }

  async stopVM(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/stop`);
  }

  async shutdownVM(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/shutdown`);
  }

  async rebootVM(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/qemu/${vmid}/status/reboot`);
  }

  async getVMConfig(vmid, node = this.node) {
    return this.request('GET', `/nodes/${node}/qemu/${vmid}/config`);
  }

  async updateVMConfig(vmid, config, node = this.node) {
    return this.request('PUT', `/nodes/${node}/qemu/${vmid}/config`, config);
  }

  async resizeVMDisk(vmid, disk, size, node = this.node) {
    return this.request('PUT', `/nodes/${node}/qemu/${vmid}/resize`, {
      disk,
      size
    });
  }

  // LXC Containers
  async getLXCs(node = this.node) {
    return this.request('GET', `/nodes/${node}/lxc`);
  }

  async getLXCStatus(vmid, node = this.node) {
    return this.request('GET', `/nodes/${node}/lxc/${vmid}/status/current`);
  }

  async startLXC(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/lxc/${vmid}/status/start`);
  }

  async stopLXC(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/lxc/${vmid}/status/stop`);
  }

  async shutdownLXC(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/lxc/${vmid}/status/shutdown`);
  }

  async rebootLXC(vmid, node = this.node) {
    return this.request('POST', `/nodes/${node}/lxc/${vmid}/status/reboot`);
  }

  async getLXCConfig(vmid, node = this.node) {
    return this.request('GET', `/nodes/${node}/lxc/${vmid}/config`);
  }

  async updateLXCConfig(vmid, config, node = this.node) {
    return this.request('PUT', `/nodes/${node}/lxc/${vmid}/config`, config);
  }

  async resizeLXCDisk(vmid, disk, size, node = this.node) {
    return this.request('PUT', `/nodes/${node}/lxc/${vmid}/resize`, {
      disk,
      size
    });
  }

  async createLXC(node, config) {
    return this.request('POST', `/nodes/${node}/lxc`, config);
  }

  // Resources
  async getResources(type = null) {
    const endpoint = type ? `/cluster/resources?type=${type}` : '/cluster/resources';
    return this.request('GET', endpoint);
  }

  // Storages
  async getStorages(node = this.node) {
    return this.request('GET', `/nodes/${node}/storage`);
  }

  async getStorageStatus(storage, node = this.node) {
    return this.request('GET', `/nodes/${node}/storage/${storage}/status`);
  }

  async getStorageContent(storage, node = this.node, content = null) {
    const endpoint = content 
      ? `/nodes/${node}/storage/${storage}/content?content=${content}`
      : `/nodes/${node}/storage/${storage}/content`;
    return this.request('GET', endpoint);
  }

  // Download ISO to storage
  async downloadISO(storage, url, filename, node = this.node) {
    return this.request('POST', `/nodes/${node}/storage/${storage}/download-url`, {
      content: 'iso',
      filename: filename,
      url: url,
      checksum: undefined,
      'checksum-algorithm': undefined,
      'verify-certificates': 0
    });
  }

  // Download LXC template
  async downloadTemplate(storage, template, node = this.node) {
    // For LXC templates, we need to use pveam (Proxmox VE Appliance Manager)
    // The template parameter should just be the template name from aplinfo
    return this.request('POST', `/nodes/${node}/aplinfo`, {
      storage: storage,
      template: template
    });
  }

  // Update template (download)
  async updateTemplate(storage, template, node = this.node) {
    return this.request('POST', `/nodes/${node}/ceph/osd/${template}/in`);
  }

  // Get available templates from Proxmox
  async getAvailableTemplates(node = this.node) {
    return this.request('GET', `/nodes/${node}/aplinfo`);
  }

  // Networks
  async getNetworks(node = this.node) {
    return this.request('GET', `/nodes/${node}/network`);
  }

  async getNodeNetwork(node) {
    return this.request('GET', `/nodes/${node}/network`);
  }

  async getNetworkConfig(iface, node = this.node) {
    return this.request('GET', `/nodes/${node}/network/${iface}`);
  }

  // Node storage
  async getNodeStorage(node) {
    return this.request('GET', `/nodes/${node}/storage`);
  }

  // Create VM
  async createVM(node, config) {
    return this.request('POST', `/nodes/${node}/qemu`, config);
  }

  // Node Details
  async getNodeInfo(node = this.node) {
    return this.request('GET', `/nodes/${node}/status`);
  }

  async getNodeRRDData(node = this.node, timeframe = 'hour') {
    return this.request('GET', `/nodes/${node}/rrddata?timeframe=${timeframe}`);
  }

  async getNodeTasks(node = this.node, limit = 50) {
    return this.request('GET', `/nodes/${node}/tasks?limit=${limit}`);
  }

  async getNodeServices(node = this.node) {
    return this.request('GET', `/nodes/${node}/services`);
  }

  async getNodeTime(node = this.node) {
    return this.request('GET', `/nodes/${node}/time`);
  }

  async getNodeVersion(node = this.node) {
    return this.request('GET', `/nodes/${node}/version`);
  }
}

export default new ProxmoxAPI();
