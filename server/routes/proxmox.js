import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';

const router = express.Router();

// Get all nodes
router.get('/nodes', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes');
    const nodes = await proxmoxAPI.getNodes();
    console.log('✅ Nodes récupérés:', nodes.length);
    res.json(nodes);
  } catch (error) {
    console.error('❌ Erreur GET /nodes:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get node status
router.get('/nodes/:node/status', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes/:node/status');
    const status = await proxmoxAPI.getNodeStatus(req.params.node);
    res.json(status);
  } catch (error) {
    console.error('❌ Erreur GET /nodes/:node/status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get node storage
router.get('/nodes/:node/storage', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes/:node/storage');
    const storages = await proxmoxAPI.getNodeStorage(req.params.node);
    console.log('✅ Storages récupérés pour node:', req.params.node, ':', storages.length);
    res.json(storages);
  } catch (error) {
    console.error('❌ Erreur GET /nodes/:node/storage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get storage content for a specific node
router.get('/nodes/:node/storage/:storage/content', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes/:node/storage/:storage/content');
    const { content } = req.query;
    const data = await proxmoxAPI.getStorageContent(req.params.storage, req.params.node, content);
    console.log('✅ Contenu récupéré pour storage:', req.params.storage, ':', data.length);
    res.json(data);
  } catch (error) {
    console.error('❌ Erreur GET /nodes/:node/storage/:storage/content:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get node network interfaces
router.get('/nodes/:node/network', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes/:node/network');
    const networks = await proxmoxAPI.getNodeNetwork(req.params.node);
    console.log('✅ Interfaces réseau récupérées pour node:', req.params.node, ':', networks.length);
    res.json(networks);
  } catch (error) {
    console.error('❌ Erreur GET /nodes/:node/network:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create VM on specific node
router.post('/nodes/:node/qemu', async (req, res) => {
  try {
    console.log('📡 API Call: POST /api/proxmox/nodes/:node/qemu');
    console.log('📋 VM Config:', JSON.stringify(req.body, null, 2));
    const result = await proxmoxAPI.createVM(req.params.node, req.body);
    console.log('✅ VM créée avec succès');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur POST /nodes/:node/qemu:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all VMs
router.get('/vms', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/vms');
    const vms = await proxmoxAPI.getVMs();
    console.log('✅ VMs récupérées:', vms.length);
    res.json(vms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cluster resources, with optional node and type filters.
// NOTE : il existait auparavant deux définitions de cette route (ici et
// plus bas), chacune ne gérant qu'un seul des deux filtres. Express ne
// retient que la première route enregistrée pour un chemin donné, donc la
// seconde (qui gérait `type`) était du code mort — le filtre `type` était
// silencieusement ignoré partout où on l'utilisait (ex. HostDetails.jsx
// avec `?type=vm&node=...`). Fusionné en une seule route ici.
router.get('/resources', async (req, res) => {
  try {
    const { node, type } = req.query;
    console.log(`📡 API Call: GET /api/proxmox/resources${node ? `?node=${node}` : ''}${type ? `${node ? '&' : '?'}type=${type}` : ''}`);
    // getResources(type) applique déjà le filtre Proxmox `?type=` côté API
    // (qemu|lxc|node|storage...) ; notre alias `vm` correspond à `qemu`.
    const resources = await proxmoxAPI.getResources(type === 'vm' ? 'qemu' : type);

    const filtered = node ? resources.filter((r) => r.node === node) : resources;
    console.log(`✅ Resources récupérées: ${filtered.length}${node ? ` pour node ${node}` : ''}`);
    res.json(filtered);
  } catch (error) {
    console.error('❌ Erreur GET /resources:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get VM network interfaces (IP addresses)
router.get('/vms/:vmid/interfaces', async (req, res) => {
  try {
    console.log(`📡 API Call: GET /api/proxmox/vms/${req.params.vmid}/interfaces`);
    const interfaces = await proxmoxAPI.getVMInterfaces(req.params.vmid);
    res.json(interfaces || []);
  } catch (error) {
    console.error('❌ Error getting VM interfaces:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get VM status
router.get('/vms/:vmid', async (req, res) => {
  try {
    const status = await proxmoxAPI.getVMStatus(req.params.vmid);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start VM
router.post('/vms/:vmid/start', async (req, res) => {
  try {
    const result = await proxmoxAPI.startVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop VM
router.post('/vms/:vmid/stop', async (req, res) => {
  try {
    const result = await proxmoxAPI.stopVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shutdown VM
router.post('/vms/:vmid/shutdown', async (req, res) => {
  try {
    const result = await proxmoxAPI.shutdownVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reboot VM
router.post('/vms/:vmid/reboot', async (req, res) => {
  try {
    const result = await proxmoxAPI.rebootVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get VM config
router.get('/vms/:vmid/config', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/vms/:vmid/config');
    const config = await proxmoxAPI.getVMConfig(req.params.vmid);
    res.json(config);
  } catch (error) {
    console.error('❌ Erreur GET /vms/:vmid/config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update VM config
router.put('/vms/:vmid/config', async (req, res) => {
  try {
    console.log('📡 API Call: PUT /api/proxmox/vms/:vmid/config');
    console.log('📋 Update Config:', JSON.stringify(req.body, null, 2));
    const result = await proxmoxAPI.updateVMConfig(req.params.vmid, req.body);
    console.log('✅ VM config updated successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur PUT /vms/:vmid/config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Resize VM disk
router.put('/vms/:vmid/resize', async (req, res) => {
  try {
    console.log('📡 API Call: PUT /api/proxmox/vms/:vmid/resize');
    const { disk, size } = req.body;
    const result = await proxmoxAPI.resizeVMDisk(req.params.vmid, disk, size);
    console.log('✅ VM disk resized successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur PUT /vms/:vmid/resize:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all LXC containers
router.get('/lxc', async (req, res) => {
  try {
    const lxcs = await proxmoxAPI.getLXCs();
    res.json(lxcs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get LXC status
router.get('/lxc/:vmid', async (req, res) => {
  try {
    const status = await proxmoxAPI.getLXCStatus(req.params.vmid);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start LXC
router.post('/lxc/:vmid/start', async (req, res) => {
  try {
    const result = await proxmoxAPI.startLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop LXC
router.post('/lxc/:vmid/stop', async (req, res) => {
  try {
    const result = await proxmoxAPI.stopLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shutdown LXC
router.post('/lxc/:vmid/shutdown', async (req, res) => {
  try {
    const result = await proxmoxAPI.shutdownLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reboot LXC
router.post('/lxc/:vmid/reboot', async (req, res) => {
  try {
    const result = await proxmoxAPI.rebootLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get LXC network interfaces (IP addresses)
router.get('/lxc/:vmid/interfaces', async (req, res) => {
  try {
    console.log(`📡 API Call: GET /api/proxmox/lxc/${req.params.vmid}/interfaces`);
    const interfaces = await proxmoxAPI.getLXCInterfaces(req.params.vmid);
    res.json(interfaces || []);
  } catch (error) {
    console.error('❌ Error getting LXC interfaces:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get LXC configuration
router.get('/lxc/:vmid/config', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/lxc/:vmid/config');
    const config = await proxmoxAPI.getLXCConfig(req.params.vmid);
    res.json(config);
  } catch (error) {
    console.error('❌ Erreur GET /lxc/:vmid/config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update LXC config
router.put('/lxc/:vmid/config', async (req, res) => {
  try {
    console.log('📡 API Call: PUT /api/proxmox/lxc/:vmid/config');
    console.log('📋 Update Config:', JSON.stringify(req.body, null, 2));
    const result = await proxmoxAPI.updateLXCConfig(req.params.vmid, req.body);
    console.log('✅ LXC config updated successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur PUT /lxc/:vmid/config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Resize LXC disk
router.put('/lxc/:vmid/resize', async (req, res) => {
  try {
    console.log('📡 API Call: PUT /api/proxmox/lxc/:vmid/resize');
    const { disk, size } = req.body;
    const result = await proxmoxAPI.resizeLXCDisk(req.params.vmid, disk, size);
    console.log('✅ LXC disk resized successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur PUT /lxc/:vmid/resize:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create LXC container on specific node
router.post('/nodes/:node/lxc', async (req, res) => {
  try {
    console.log('📡 API Call: POST /api/proxmox/nodes/:node/lxc');
    console.log('📋 LXC Config:', JSON.stringify(req.body, null, 2));
    const result = await proxmoxAPI.createLXC(req.params.node, req.body);
    console.log('✅ LXC créé avec succès');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur POST /nodes/:node/lxc:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get storages
router.get('/storages', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/storages');
    const storages = await proxmoxAPI.getStorages();
    console.log('✅ Storages récupérés:', storages.length);
    res.json(storages);
  } catch (error) {
    console.error('❌ Erreur GET /storages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get storage status
router.get('/storages/:storage/status', async (req, res) => {
  try {
    const status = await proxmoxAPI.getStorageStatus(req.params.storage);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get storage content
router.get('/storages/:storage/content', async (req, res) => {
  try {
    const { content } = req.query;
    const data = await proxmoxAPI.getStorageContent(req.params.storage, undefined, content);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get networks
router.get('/networks', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/networks');
    const networks = await proxmoxAPI.getNetworks();
    console.log('✅ Networks récupérés:', networks.length);
    res.json(networks);
  } catch (error) {
    console.error('❌ Erreur GET /networks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get network config
router.get('/networks/:iface', async (req, res) => {
  try {
    const config = await proxmoxAPI.getNetworkConfig(req.params.iface);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node detailed info
router.get('/nodes/:node/info', async (req, res) => {
  try {
    const info = await proxmoxAPI.getNodeInfo(req.params.node);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node RRD data (graphs)
router.get('/nodes/:node/rrddata', async (req, res) => {
  try {
    const { timeframe } = req.query;
    const data = await proxmoxAPI.getNodeRRDData(req.params.node, timeframe);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node tasks
router.get('/nodes/:node/tasks', async (req, res) => {
  try {
    const { limit } = req.query;
    const tasks = await proxmoxAPI.getNodeTasks(req.params.node, limit);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node services
router.get('/nodes/:node/services', async (req, res) => {
  try {
    const services = await proxmoxAPI.getNodeServices(req.params.node);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Control node service (start, stop, restart, reload)
router.post('/nodes/:node/services/:service/:action', async (req, res) => {
  try {
    console.log(`📡 API Call: POST /api/proxmox/nodes/${req.params.node}/services/${req.params.service}/${req.params.action}`);
    const result = await proxmoxAPI.controlNodeService(req.params.node, req.params.service, req.params.action);
    console.log(`✅ Service ${req.params.service} ${req.params.action} sur node ${req.params.node}`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Erreur contrôle service:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get node version
router.get('/nodes/:node/version', async (req, res) => {
  try {
    const version = await proxmoxAPI.getNodeVersion(req.params.node);
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Browse storage content
router.get('/storages/:storage/content', async (req, res) => {
  try {
    const { node } = req.query;
    const content = await proxmoxAPI.getStorageContent(req.params.storage, node);
    res.json(content);
  } catch (error) {
    console.error('❌ Erreur GET /storages/:storage/content:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
